/**
 * Web Audio alapú, kódból generált hangeffektek.
 * Nincs külső hangfájl — minden szintézissel készül.
 * Később ide köthető be sample-alapú hang / zene is.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  // Külön hangeffekt-busz (a szintetizált tone/noise ezen át megy a masterre),
  // hogy a Beállítások SFX-csúszkája a zenét/alapszintet ne befolyásolja.
  private sfxBus: GainNode | null = null;
  private sfxVol = 1;

  // Sample-alapú hangklipek (narráció). Külön „voice"-sáv saját hangerővel, hogy
  // a beszéd a szintetizált effektek fölött is jól érthető legyen. Egyszerre egy szól.
  private voiceGain: GainNode | null = null;
  private readonly VOICE_VOL = 0.9;
  private readonly voiceUrls = new Map<string, string>();
  private readonly voiceBuffers = new Map<string, AudioBuffer>();
  private activeVoice: AudioBufferSourceNode | null = null;
  private activeVoiceName: string | null = null;
  private pendingVoice: string | null = null;   // autoplay-tiltás alatt várakozó klip
  private onVoiceEnded: ((name: string) => void) | null = null;
  // Minden play/stop növeli a tokent; a (lustán dekódoló) startVoice csak akkor
  // szólal meg, ha a tokenje még érvényes — így a gyors play→stop nem „ragad be".
  private voiceToken = 0;

  // --- Dinamikus zene: szintetizált sötét ambient (drone/pad) + harci pulzus ---
  private musicGain: GainNode | null = null;        // közös, némítható zene-busz
  private musicStarted = false;
  private pulseLevel: GainNode | null = null;       // a harci réteg intenzitás-vezérelt hangereje
  private pulseLfo: OscillatorNode | null = null;   // a harci lüktetés sebessége (boss alatt gyorsabb)
  private padFilter: BiquadFilterNode | null = null; // a pad szűrője (harcban kissé nyílik)

  // --- Sample-alapú háttérzene (a procedurális réteg fölött ELSŐDLEGES) ---
  // Két „deck" egyszerre loopol: calm (exploráció/menü) + combat (harc); a
  // setMusicScene crossfade-eli őket az intenzitással. A téma (menü/fejezet) a
  // calm+combat track-PÁRT választja (setMusicTheme). Ha nincs regisztrált track
  // → a procedurális szintézis-réteg a fallback (startMusic). A zene-hangerő
  // (musicVol) a közös musicGain-buszon él, a master és a némítás fölött.
  private musicVol = 0.55;
  private sampleMusic = false;
  private readonly musicUrls = new Map<string, string>();
  private readonly musicBuffers = new Map<string, AudioBuffer>();
  private calmDeck: { src: AudioBufferSourceNode; gain: GainNode; name: string } | null = null;
  private combatDeck: { src: AudioBufferSourceNode; gain: GainNode; name: string } | null = null;
  private curCalm: string | null = null;
  private curCombat: string | null = null;

  private ensure(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.value = this.muted ? 0 : this.VOICE_VOL;
    this.voiceGain.connect(this.ctx.destination);
  }

  /** Felhasználói interakció után hívandó (autoplay-szabály miatt). */
  resume(): void {
    this.ensure();
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume().then(() => this.flushPendingVoice());
    } else {
      this.flushPendingVoice();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.voiceGain) this.voiceGain.gain.value = this.muted ? 0 : this.VOICE_VOL;
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : this.musicVol;
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Némítás explicit beállítása (pl. mentett beállítás visszatöltésekor). */
  setMuted(v: boolean): void {
    this.muted = v;
    if (this.voiceGain) this.voiceGain.gain.value = v ? 0 : this.VOICE_VOL;
    if (this.musicGain) this.musicGain.gain.value = v ? 0 : this.musicVol;
  }

  /** Sample-alapú hangklip regisztrálása névvel; a betöltés első lejátszáskor, lustán történik. */
  registerVoice(name: string, url: string): void {
    this.voiceUrls.set(name, url);
  }

  /**
   * Regisztrált hangklip (narráció) lejátszása. Egyszerre csak egy „voice" szól —
   * az előzőt levágja. Ha a context még felfüggesztett (nem volt user-gesztus),
   * a klip a következő `resume()`-ra indul. A némítás a voice-sávra is hat.
   */
  playVoice(name: string): void {
    this.ensure();
    if (!this.ctx) return;
    const token = ++this.voiceToken;
    this.pendingVoice = null;
    if (this.ctx.state !== 'running') {
      this.pendingVoice = name;     // gesztusra (resume) majd elindul
      return;
    }
    void this.startVoice(name, token);
  }

  /** Igaz, ha épp szól egy narráció. */
  get voicePlaying(): boolean { return this.activeVoice !== null; }
  /** A jelenleg szóló narráció neve, vagy `null`. */
  get playingVoiceName(): string | null { return this.activeVoiceName; }
  /** Callback a narráció TERMÉSZETES végére (explicit `stopVoice`-nál nem hív). */
  setVoiceEndedHandler(fn: ((name: string) => void) | null): void { this.onVoiceEnded = fn; }

  /** A szóló (vagy függőben lévő) narráció azonnali leállítása — a vég-callback NEM fut le. */
  stopVoice(): void {
    this.voiceToken++;            // érvénytelenít minden függőben lévő betöltést
    this.pendingVoice = null;
    this.stopActiveSource();
  }

  private flushPendingVoice(): void {
    const name = this.pendingVoice;
    if (!name) return;
    this.pendingVoice = null;
    void this.startVoice(name, this.voiceToken);
  }

  private async startVoice(name: string, token: number): Promise<void> {
    const buf = await this.loadVoice(name);
    if (token !== this.voiceToken) return;   // közben stop / új lejátszás történt
    if (!buf || !this.ctx || !this.voiceGain) return;
    this.stopActiveSource();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceGain);
    src.onended = () => {
      if (this.activeVoice !== src) return;   // már levágták/lecserélték
      this.activeVoice = null;
      this.activeVoiceName = null;
      this.onVoiceEnded?.(name);
    };
    src.start();
    this.activeVoice = src;
    this.activeVoiceName = name;
  }

  /** Csak a jelenleg szóló forrást állítja le, csendben (vég-callback nélkül). */
  private stopActiveSource(): void {
    if (!this.activeVoice) return;
    const src = this.activeVoice;
    this.activeVoice = null;
    this.activeVoiceName = null;
    src.onended = null;
    try { src.stop(); } catch { /* már leállt */ }
  }

  private async loadVoice(name: string): Promise<AudioBuffer | null> {
    const cached = this.voiceBuffers.get(name);
    if (cached) return cached;
    const url = this.voiceUrls.get(name);
    if (!url || !this.ctx) return null;
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr);
      this.voiceBuffers.set(name, buf);
      return buf;
    } catch {
      return null;   // hiányzó/hibás fájl → csendben kihagyjuk
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.25, slideTo: number | null = null): void {
    if (this.muted || !this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur);
  }

  private noise(dur: number, vol = 0.4): void {
    if (this.muted || !this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
  }

  /** Hangeffekt-hangerő (0..1) — a Beállítások SFX-csúszkája; a zenét nem érinti. */
  setSfxVolume(v: number): void {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVol;
  }
  get sfxVolume(): number { return this.sfxVol; }

  /**
   * Dinamikus zene-graf (egyszer): rétegzett, sötét AMBIENT. Egy lehangolt
   * MOLL-PAD (detune-párok = kórus) konvolúciós ZENGETŐN keresztül (a „tér" adja a
   * hangulatot, ettől nem „olcsó szinti"), lassan mozgó szűrővel és „lélegző"
   * hangerővel; alatta tiszta SZUB-basszus. A HARC egy lágyan lüktető (sine-swell,
   * NEM kapuzott) basszust erősít fel, és kissé nyitja a pad szűrőjét. Tisztán
   * szintézis; az oszcillátorok végig szólnak, a képet a hangerő-/szűrő-vezérlés
   * adja (lásd {@link setMusicScene}).
   */
  private startMusic(): void {
    if (this.musicStarted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    this.ensureMusicBus();
    const bus = this.musicGain!;

    // --- Konvolúciós zengető (procedurális impulzus): ettől lesz „tér", nem száraz szinti ---
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(2.8, 3.2);
    const wet = ctx.createGain(); wet.gain.value = 0.9;
    reverb.connect(wet); wet.connect(bus);
    const send = (n: AudioNode) => { n.connect(bus); n.connect(reverb); }; // dry + wet

    // --- PAD: A-moll (A–C–E) detune-párokkal (kórus-szélesség), lágy lowpass-on ---
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 380;
    padFilter.Q.value = 0.6;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.085;
    padFilter.connect(padGain); send(padGain);
    this.padFilter = padFilter;
    for (const f of [110, 130.81, 164.81, 220]) {  // A2, C3, E3, A3 → moll (sötét)
      for (const det of [-7, 7]) {                  // detune-pár a szélességért
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = f >= 220 ? 0.16 : 0.26;
        o.connect(og); og.connect(padFilter);
        o.start(t);
      }
    }
    const sub = ctx.createOscillator();             // tiszta szub-basszus (súly)
    sub.type = 'sine'; sub.frequency.value = 55;
    const subGain = ctx.createGain(); subGain.gain.value = 0.2;
    sub.connect(subGain); send(subGain);
    sub.start(t);

    // lassú szűrő-mozgás (élő timbre) + „lélegző" hangerő
    const filtLfo = ctx.createOscillator(); filtLfo.frequency.value = 0.05;
    const filtAmt = ctx.createGain(); filtAmt.gain.value = 140;
    filtLfo.connect(filtAmt); filtAmt.connect(padFilter.frequency); filtLfo.start(t);
    const breath = ctx.createOscillator(); breath.frequency.value = 0.07;
    const breathAmt = ctx.createGain(); breathAmt.gain.value = 0.025;
    breath.connect(breathAmt); breathAmt.connect(padGain.gain); breath.start(t);

    // --- HARCI RÉTEG: lágyan lüktető basszus (sine-swell 0..1, NEM kapuzott) ---
    const throbOsc = ctx.createOscillator();
    throbOsc.type = 'triangle'; throbOsc.frequency.value = 73.42; // D2 — feszültség
    const throbShape = ctx.createGain(); throbShape.gain.value = 0; // 0..1 swell
    const throbLevel = ctx.createGain(); throbLevel.gain.value = 0; // intenzitás
    throbOsc.connect(throbShape); throbShape.connect(throbLevel); send(throbLevel);
    throbOsc.start(t);
    const throbLfo = ctx.createOscillator();
    throbLfo.type = 'sine'; throbLfo.frequency.value = 1.5;
    const throbAmt = ctx.createGain(); throbAmt.gain.value = 0.5;
    const throbOffset = ctx.createConstantSource(); throbOffset.offset.value = 0.5; // 0.5±0.5 → 0..1
    throbLfo.connect(throbAmt); throbAmt.connect(throbShape.gain);
    throbOffset.connect(throbShape.gain);
    throbLfo.start(t); throbOffset.start(t);

    this.pulseLevel = throbLevel;
    this.pulseLfo = throbLfo;
    this.musicStarted = true;
  }

  /** Procedurális impulzus-válasz a zengetőhöz: exponenciálisan lecsengő sztereó zaj. */
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /** A közös, némítható zene-busz (sample-deckek + procedurális réteg ide köt). */
  private ensureMusicBus(): void {
    this.ensure();
    if (this.musicGain || !this.ctx || !this.master) return;
    const bus = this.ctx.createGain();
    bus.gain.value = this.muted ? 0 : this.musicVol;
    bus.connect(this.master);
    this.musicGain = bus;
  }

  /** Háttérzene-track regisztrálása (lustán töltődik). Bármely regisztráció
   *  bekapcsolja a SAMPLE-zene módot (a procedurális szintézis a fallback marad). */
  registerMusic(name: string, url: string): void {
    this.musicUrls.set(name, url);
    this.sampleMusic = true;
  }

  private async loadMusic(name: string): Promise<AudioBuffer | null> {
    const cached = this.musicBuffers.get(name);
    if (cached) return cached;
    const url = this.musicUrls.get(name);
    if (!url || !this.ctx) return null;
    try {
      const buf = await this.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      this.musicBuffers.set(name, buf);
      return buf;
    } catch {
      return null;   // hiányzó/hibás fájl → csendben fallback
    }
  }

  /**
   * Az aktuális zenei TÉMA: calm (exploráció/menü) + opcionális combat (harc)
   * track-pár. Csak a változott decket cseréli; a régit kifade-eli, az új calm
   * magától a nyugodt szintre fade-el, a combat-ot a {@link setMusicScene} húzza
   * fel harcban. Menüben/hubban `combatName = null`. A betöltés/indítás lusta;
   * felfüggesztett context mellett (gesztus előtt) ütemez, és `resume()`-ra szól.
   */
  setMusicTheme(calmName: string | null, combatName: string | null = null): void {
    if (!this.sampleMusic) return;
    this.ensureMusicBus();
    if (calmName !== this.curCalm) { this.curCalm = calmName; void this.swapDeck('calm', calmName); }
    if (combatName !== this.curCombat) { this.curCombat = combatName; void this.swapDeck('combat', combatName); }
  }

  private async swapDeck(role: 'calm' | 'combat', name: string | null): Promise<void> {
    const old = role === 'calm' ? this.calmDeck : this.combatDeck;
    if (old && this.ctx) {
      old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); // régi kifade
      const src = old.src;
      setTimeout(() => { try { src.stop(); } catch { /* már leállt */ } }, 1300);
    }
    if (role === 'calm') this.calmDeck = null; else this.combatDeck = null;
    if (!name) return;
    const buf = await this.loadMusic(name);
    // közben válthatott a téma — ha már nem ez a cél, dobjuk az eredményt
    if (!buf || !this.ctx || !this.musicGain) return;
    if ((role === 'calm' ? this.curCalm : this.curCombat) !== name) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.musicGain);
    src.start();
    if (role === 'calm') {
      gain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.9); // calm: magától a nyugodt szintre
      this.calmDeck = { src, gain, name };
    } else {
      this.combatDeck = { src, gain, name }; // combat: a setMusicScene húzza fel
    }
  }

  /**
   * A zene „jelenetének" vezérlése a játékállapotból (a World hívja képkockánként):
   * `intensity` 0 = nyugodt, 1 = harc; `boss` esetén feszültebb. SAMPLE-módban a
   * calm↔combat decket crossfade-eli (a calm sosem némul teljesen → rétegzett);
   * különben a procedurális szintézis-réteget modulálja (fallback). Simán rámpáz.
   */
  setMusicScene(intensity: number, boss = false): void {
    const lvl = Math.max(0, Math.min(1, intensity));
    if (this.sampleMusic) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (this.calmDeck) this.calmDeck.gain.gain.setTargetAtTime(1 - lvl * 0.8, t, 0.7);
      if (this.combatDeck) this.combatDeck.gain.gain.setTargetAtTime(lvl * (boss ? 1.0 : 0.85), t, 0.5);
      return;
    }
    // Fallback: procedurális szintézis-réteg (ha nincs regisztrált sample-track).
    if (!this.musicStarted) this.startMusic();
    if (!this.ctx || !this.pulseLevel || !this.pulseLfo || !this.padFilter) return;
    const t = this.ctx.currentTime;
    this.pulseLevel.gain.setTargetAtTime(lvl * (boss ? 0.12 : 0.08), t, 0.6);
    this.pulseLfo.frequency.setTargetAtTime(boss ? 2.0 : 1.5, t, 0.8);
    this.padFilter.frequency.setTargetAtTime(360 + lvl * (boss ? 360 : 220), t, 0.9);
  }

  /** Zene-hangerő (0..1) — a Beállítások csúszkája hívja; a master/SFX fölött külön. */
  setMusicVolume(v: number): void {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : this.musicVol;
  }
  get musicVolume(): number { return this.musicVol; }

  shoot(): void { this.tone(640, 0.08, 'sine', 0.12, 360); }
  hitEnemy(): void { this.tone(220, 0.07, 'square', 0.12, 140); }
  enemyShoot(): void { this.tone(180, 0.12, 'sawtooth', 0.1, 90); }
  /** Maró savköpés becsapódása: sziszegő zaj + lefelé csúszó fanyar tónus. */
  acid(): void {
    this.noise(0.3, 0.3);
    this.tone(420, 0.26, 'sawtooth', 0.14, 70);
    setTimeout(() => this.tone(220, 0.18, 'square', 0.1, 60), 60);
  }
  splat(): void { this.noise(0.2, 0.35); this.tone(140, 0.18, 'sawtooth', 0.18, 50); }
  hurt(): void { this.tone(160, 0.18, 'square', 0.25, 70); this.noise(0.12, 0.25); }
  /** Sebződés tűztől: perzselő reccsenés. */
  burn(): void { this.noise(0.26, 0.4); this.tone(120, 0.24, 'sawtooth', 0.16, 50); }
  /** Sebződés energiától / lézertől: sercegő zap. */
  zap(): void { this.tone(1100, 0.1, 'square', 0.16, 240); this.tone(1600, 0.06, 'sawtooth', 0.1, 600); }
  pickup(): void { this.tone(523, 0.09, 'sine', 0.25, 784); setTimeout(() => this.tone(784, 0.1, 'sine', 0.22, 1046), 80); }
  item(): void {
    this.tone(523, 0.12, 'sine', 0.3, 659);
    setTimeout(() => this.tone(659, 0.12, 'sine', 0.28, 880), 110);
    setTimeout(() => this.tone(880, 0.16, 'sine', 0.26, 1318), 230);
  }
  door(): void { this.tone(300, 0.14, 'square', 0.16, 200); }
  skill(): void {
    this.tone(330, 0.1, 'sine', 0.3, 660);
    setTimeout(() => this.tone(660, 0.12, 'sine', 0.28, 990), 90);
    setTimeout(() => this.tone(990, 0.18, 'triangle', 0.24, 1320), 190);
  }
  charged(): void { this.tone(880, 0.08, 'sine', 0.2, 1320); }
  bombDrop(): void { this.tone(180, 0.08, 'square', 0.18, 90); }
  boom(): void { this.noise(0.4, 0.6); this.tone(90, 0.35, 'sawtooth', 0.4, 30); }
  boss(): void { this.tone(60, 0.7, 'sawtooth', 0.4, 40); this.noise(0.5, 0.4); }
  stairs(): void {
    this.tone(392, 0.12, 'sine', 0.25, 523);
    setTimeout(() => this.tone(523, 0.12, 'sine', 0.24, 659), 120);
    setTimeout(() => this.tone(659, 0.2, 'sine', 0.22, 880), 240);
  }
  /** Vásárlás: fémes „ka-csing". */
  buy(): void {
    this.tone(880, 0.07, 'square', 0.18, 1320);
    setTimeout(() => this.tone(1318, 0.1, 'sine', 0.2, 1760), 70);
  }
  /** Sorsoló-pörgés: gyorsuló emelkedő trilla. */
  gamble(): void {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.tone(480 + i * 110, 0.05, 'square', 0.12, 560 + i * 110), i * 65);
    }
  }
  /** Jackpot / nagy nyeremény: győzelmi futam. */
  jackpot(): void {
    [523, 659, 880, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.13, 'sine', 0.26, f * 1.2), i * 90));
  }
  /** Elutasítás (nincs elég érme): tompa kettős kop. */
  denied(): void {
    this.tone(180, 0.1, 'square', 0.2, 120);
    setTimeout(() => this.tone(140, 0.12, 'square', 0.18, 90), 90);
  }
}
