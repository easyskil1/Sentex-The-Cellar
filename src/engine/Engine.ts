/**
 * Az engine a canvas-t, a 2D kontextust, az átméretezést és a fő
 * requestAnimationFrame-ciklust kezeli. A játéklogikát nem ismeri:
 * minden képkockában meghív egy update(dt) és egy render(ctx) callbacket.
 */
export interface EngineCallbacks {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Logikai (CSS-pixel) méret — a játék ezekkel a koordinátákkal dolgozik. */
  width = 0;
  height = 0;

  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  /** Kézi render-felbontás szorzó (Beállítások · Grafika): 1 = teljes, <1 = gyorsabb. */
  private scale = 1;

  // ---- Automatikus minőség (adaptív render-skála) - RACSNIS, nem ugráló ----
  // Cél: 60 FPS alatt finomít (kisebb felbontás), de a visszalépés NE oszcilláljon.
  // (Canvas2D-nél a GPU-fill költséget a CPU-időmérés nem látja → a „van-e fedezet"
  // becslés megbízhatatlan, attól ugrált.) Ezért RACSNI: lefelé gyorsan beáll;
  // FELFELÉ csak hosszú, stabil 60 után próbál EGY lépést, és ha az megbukik
  // (FPS visszaesik), LEZÁRJA a plafont az alatt a szint alatt → többé nem
  // próbálkozik, véglegesen megállapodik a legjobb stabil felbontáson.
  private autoOn = false;
  /** Az automata által vezérelt skála [MIN..ceil]; csak autoOn módban él. */
  private autoScale = 1;
  /** Felső korlát: ha egy magasabb skála megbukott, ide csökken (nem próbáljuk újra). */
  private autoCeil = 1;
  private goodMs = 0;   // mióta tartósan jó az FPS (felfelé-próbához gyűlik)
  private badMs = 0;    // mióta tartósan rossz az FPS (lefelé-lépéshez gyűlik)
  private probing = false; // épp egy felfelé-próbát figyelünk-e
  private probeMs = 0;  // a felfelé-próba óta eltelt idő (egy FPS-ablak után döntünk)

  private static readonly MIN_SCALE = 0.6;
  private static readonly STEP = 0.1;
  private static readonly FPS_DOWN = 54;   // ez alatt: rossz (finomíts)
  private static readonly FPS_UP = 58;     // e fölött: jó (lehet visszalépni)
  private static readonly BAD_HOLD = 500;  // ennyi ms tartós rosszra lépünk le
  private static readonly GOOD_HOLD = 4500; // ennyi ms tartós jóra próbálunk fel (ritka)
  private static readonly PROBE_WATCH = 900; // a próba után ennyit várunk a döntésig (>1 FPS-ablak)

  /** A ténylegesen érvényes render-skála (auto módban az automata értéke). */
  private get effScale(): number { return this.autoOn ? this.autoScale : this.scale; }
  /** Tényleges rajz-pixelarány: eszköz-DPR × render-skála. */
  private get effDpr(): number { return this.dpr * this.effScale; }
  /** Aktuális rajz-pixelarány (cache-canvasok éles méretezése + a render-skála). */
  get pixelRatio(): number { return this.effDpr; }
  /** Aktív-e az automatikus minőség. */
  get autoQuality(): boolean { return this.autoOn; }
  /** Az aktuálisan érvényes render-skála (kijelzéshez/teszthez). */
  get renderScale(): number { return this.effScale; }

  /** Kézi render-skála beállítása (1 / 0.75 / 0.5) - kikapcsolja az automatát. */
  setRenderScale(s: number): void {
    this.autoOn = false;
    this.scale = s;
    this.resize();
  }

  /** Automatikus minőség be/ki. Bekapcsoláskor teljes felbontásról indul. */
  setAutoQuality(on: boolean): void {
    this.autoOn = on;
    if (on) { this.autoScale = 1; this.autoCeil = 1; this.goodMs = 0; this.badMs = 0; this.probing = false; this.probeMs = 0; }
    this.resize();
  }

  // Valós FPS a NYERS képkocka-időből (a dt-vágástól függetlenül), 0.5 s-os
  // ablakban átlagolva - stabil, tényleges érték a kijelzőnek.
  private fpsAccumMs = 0;
  private fpsFrames = 0;
  private fpsValue = 0;
  /** Az utolsó kb. fél másodperc mért, valós képkocka/másodperc értéke. */
  get fps(): number { return this.fpsValue; }

  private last = 0;
  private running = false;
  private cb: EngineCallbacks | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas-kontextus nem érhető el');
    this.ctx = ctx;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize(): void {
    // A DPR-t minden átméretezésnél újraolvassuk: monitorok közti mozgatáskor
    // (eltérő pixelarány) így marad éles a kép.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const e = this.effDpr;
    this.canvas.width = Math.round(this.width * e);
    this.canvas.height = Math.round(this.height * e);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(e, 0, 0, e, 0, 0);
  }

  start(cb: EngineCallbacks): void {
    this.cb = cb;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  /** A loop-időzítő reset-je (pl. szünet után, hogy ne ugorjon nagyot a dt). */
  resetClock(): void {
    this.last = performance.now();
  }

  private loop = (now: number): void => {
    if (!this.running || !this.cb) return;
    const rawMs = now - this.last;
    let dt = rawMs / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // nagy hézagok levágása (pl. fókuszvesztés után)

    // Valós FPS a NYERS időből (nem a vágott dt-ből): 0.5 s-os ablak átlaga.
    this.fpsAccumMs += rawMs;
    this.fpsFrames++;
    if (this.fpsAccumMs >= 500) {
      this.fpsValue = (this.fpsFrames * 1000) / this.fpsAccumMs;
      this.fpsAccumMs = 0;
      this.fpsFrames = 0;
    }

    // Egy hibás képkocka ne állítsa le végleg a játékot: naplózzuk a hibát,
    // de a ciklust mindig újraütemezzük.
    try {
      this.cb.update(dt);
      // setTransform újrabeállítja a (skálázott) DPR-t és törli a maradék transzformokat
      this.ctx.setTransform(this.effDpr, 0, 0, this.effDpr, 0, 0);
      this.cb.render(this.ctx);
      if (this.autoOn) this.adaptQuality(rawMs);
    } catch (err) {
      console.error('[Engine] hiba a képkockában:', err);
    }

    requestAnimationFrame(this.loop);
  };

  /**
   * Racsnis adaptív render-skála (FPS-vezérelt, idő-akkumulált, nem ugráló).
   * LE: ha az FPS tartósan (BAD_HOLD) a küszöb alatt van, egy lépéssel finomít.
   * FEL: csak HOSSZÚ, tartós (GOOD_HOLD) magas FPS után próbál EGY lépést a plafonig;
   * ha a próba megbukik (rögtön visszaesik az FPS → lefelé-lépés), a plafont az
   * adott szint alá zárja, így többé nem próbálkozik felfelé → megállapodik.
   */
  private adaptQuality(frameMs: number): void {
    if (document.hidden) return;          // háttérben ne tapogasson (rAF fojtás)
    const fps = this.fpsValue;
    if (fps <= 0) return;                 // még nincs mért FPS-ablak

    // 1) Felfelé-próba kiértékelése: a lépés után EGY teljes FPS-ablakot várunk,
    //    majd EGYSZER döntünk - ha nem lett szilárd (≥FPS_UP), visszalépünk ÉS a
    //    plafont ez alá zárjuk (többé nem próbálunk ide fel → nincs oszcilláció).
    if (this.probing) {
      this.probeMs += frameMs;
      if (this.probeMs >= Engine.PROBE_WATCH) {
        this.probing = false;
        if (fps < Engine.FPS_UP) {
          this.autoCeil = Math.max(Engine.MIN_SCALE, +(this.autoScale - Engine.STEP).toFixed(2));
          this.autoScale = this.autoCeil;
          this.resize();
        }
        this.goodMs = 0;
        this.badMs = 0;
      }
      return;                             // próba alatt mást nem teszünk
    }

    // 2) Stabil szabályozás
    if (fps < Engine.FPS_DOWN) {
      this.goodMs = 0;
      this.badMs += frameMs;
      if (this.badMs >= Engine.BAD_HOLD && this.autoScale > Engine.MIN_SCALE) {
        this.badMs = 0;
        this.autoScale = Math.max(Engine.MIN_SCALE, +(this.autoScale - Engine.STEP).toFixed(2));
        this.resize();
      }
    } else if (fps >= Engine.FPS_UP) {
      this.badMs = 0;
      this.goodMs += frameMs;
      if (this.goodMs >= Engine.GOOD_HOLD && this.autoScale < this.autoCeil) {
        this.goodMs = 0;
        this.probing = true;              // felfelé-próba; a köv. ablakban döntünk
        this.probeMs = 0;
        this.autoScale = Math.min(this.autoCeil, +(this.autoScale + Engine.STEP).toFixed(2));
        this.resize();
      }
    } else {
      // holt sáv (FPS_DOWN..FPS_UP): lassan ürítjük a számlálókat (stabilizál)
      this.badMs = Math.max(0, this.badMs - frameMs);
      this.goodMs = Math.max(0, this.goodMs - frameMs);
    }
  }
}
