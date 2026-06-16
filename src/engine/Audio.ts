/**
 * Web Audio alapú, kódból generált hangeffektek.
 * Nincs külső hangfájl — minden szintézissel készül.
 * Később ide köthető be sample-alapú hang / zene is.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

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

  private ensure(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
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
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Némítás explicit beállítása (pl. mentett beállítás visszatöltésekor). */
  setMuted(v: boolean): void {
    this.muted = v;
    if (this.voiceGain) this.voiceGain.gain.value = v ? 0 : this.VOICE_VOL;
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
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  private noise(dur: number, vol = 0.4): void {
    if (this.muted || !this.ctx || !this.master) return;
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
    g.connect(this.master);
    src.start(t);
  }

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
