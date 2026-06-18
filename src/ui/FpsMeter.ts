import type { Engine } from '../engine/Engine';
import { loadFpsShown } from '../game/settings';

/**
 * Valós FPS-kijelző a jobb alsó sarokban. Szándékosan ÖNÁLLÓ és könnyű: az
 * Engine méri a tényleges képkocka-rátát (lásd Engine.fps), ez a modul csak
 * megjeleníti egy fix pozíciójú DOM-elemben. NEM terheli a render-ciklust és
 * NEM nyúl a World-höz: külön, ritka (4 Hz) időzítő frissít, a megjelenítést a
 * Beállítások · FPS kapcsoló vezérli (localStorage-on át, lazán csatolva).
 */
export class FpsMeter {
  private el: HTMLElement | null = null;

  constructor(private readonly engine: Engine) {
    window.setInterval(() => this.tick(), 250);
  }

  private tick(): void {
    if (!loadFpsShown()) {
      if (this.el) this.el.style.display = 'none';
      return;
    }
    const e = this.ensureEl();
    e.style.display = 'block';
    e.textContent = `${Math.round(this.engine.fps)} FPS`;
  }

  private ensureEl(): HTMLElement {
    if (!this.el) {
      const e = document.createElement('div');
      e.id = 'fps';
      e.style.cssText =
        'position:fixed;right:10px;bottom:8px;z-index:60;pointer-events:none;' +
        'font:600 13px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.5px;' +
        'color:#9fe6a0;background:rgba(0,0,0,.42);padding:4px 8px;border-radius:6px;';
      document.body.appendChild(e);
      this.el = e;
    }
    return this.el;
  }
}
