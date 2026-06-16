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

  /** Aktuális eszköz-pixelarány (cache-canvasok éles méretezéséhez). */
  get pixelRatio(): number { return this.dpr; }
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
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // nagy hézagok levágása (pl. fókuszvesztés után)

    // Egy hibás képkocka ne állítsa le végleg a játékot: naplózzuk a hibát,
    // de a ciklust mindig újraütemezzük.
    try {
      this.cb.update(dt);
      // setTransform újrabeállítja a DPR-skálát és törli a maradék transzformokat
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.cb.render(this.ctx);
    } catch (err) {
      console.error('[Engine] hiba a képkockában:', err);
    }

    requestAnimationFrame(this.loop);
  };
}
