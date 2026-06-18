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
  /** Render-felbontás szorzó (Beállítások · Grafika): 1 = teljes, <1 = gyorsabb, lágyabb kép. */
  private scale = 1;

  /** Tényleges rajz-pixelarány: eszköz-DPR × render-skála. */
  private get effDpr(): number { return this.dpr * this.scale; }
  /** Aktuális rajz-pixelarány (cache-canvasok éles méretezése + a render-skála). */
  get pixelRatio(): number { return this.effDpr; }

  /** Render-skála beállítása (pl. 1 / 0.75 / 0.5) - azonnal újraméretezi a vásznat. */
  setRenderScale(s: number): void {
    this.scale = s;
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
    } catch (err) {
      console.error('[Engine] hiba a képkockában:', err);
    }

    requestAnimationFrame(this.loop);
  };
}
