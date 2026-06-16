import type { Vec2 } from './math';

/**
 * Központi bemenetkezelő: billentyűzet, egér és érintőképernyő.
 * A játéklogika innen kérdezi le az aktuális állapotot (poll-alapú).
 */
export class Input {
  readonly keys: Record<string, boolean> = {};
  readonly mouse = { x: 0, y: 0, down: false };

  /** Görgetés-akkumulátor (egér kerék); a UI poll-onként lekérdezi és nullázza. */
  private wheelAccum = 0;

  /** Bal alsó virtuális joystick (mozgás). */
  private readonly moveStick = { dx: 0, dy: 0, active: false };
  /** Jobb alsó virtuális joystick (lövés). */
  private readonly shootStick = { dx: 0, dy: 0, active: false };

  /** Szünet-billentyű lenyomás eseménye (egyszer fogyasztható). */
  private pauseRequested = false;
  private skillRequested = false;
  private tntRequested = false;
  private bombRequested = false;

  constructor() {
    addEventListener('keydown', (e) => {
      // Szövegmezőbe gépeléskor (admin DOM-lapok) ne nyeljük el a billentyűket.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      const wasDown = this.keys[k];
      this.keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'p' || k === 'escape') this.pauseRequested = true;
      // Felfutó él (nem ismétlődik nyomva tartásra):
      if (k === 'e' && !wasDown) this.skillRequested = true;   // aktív skill
      if (k === 't' && !wasDown) this.tntRequested = true;     // TNT
      if (k === 'b' && !wasDown) this.bombRequested = true;    // bomba
    });
    addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    addEventListener('wheel', (e) => {
      this.wheelAccum += e.deltaY;
    }, { passive: true });
    this.setupTouch();
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys[c]);
  }

  /** Az utolsó lekérdezés óta felgyűlt görgetés (px), és nullázza. */
  consumeWheel(): number {
    const w = this.wheelAccum;
    this.wheelAccum = 0;
    return w;
  }

  /** Igaz egyszer, amíg a szünet-kérést le nem kérdezik. */
  consumePause(): boolean {
    if (this.pauseRequested) {
      this.pauseRequested = false;
      return true;
    }
    return false;
  }

  /** Igaz egyszer, amikor az aktív skill gomb (E) lenyomódott. */
  consumeSkill(): boolean {
    if (this.skillRequested) {
      this.skillRequested = false;
      return true;
    }
    return false;
  }

  /** Igaz egyszer, amikor a TNT gomb (T) lenyomódott. */
  consumeTnt(): boolean {
    if (this.tntRequested) {
      this.tntRequested = false;
      return true;
    }
    return false;
  }

  /** Igaz egyszer, amikor a bomba gomb (B) lenyomódott. */
  consumeBomb(): boolean {
    if (this.bombRequested) {
      this.bombRequested = false;
      return true;
    }
    return false;
  }

  /** Mozgásirány a WASD + bal stick alapján (egységvektor vagy nullvektor). */
  moveVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown('a')) x -= 1;
    if (this.isDown('d')) x += 1;
    if (this.isDown('w')) y -= 1;
    if (this.isDown('s')) y += 1;
    if (this.moveStick.active) {
      x += this.moveStick.dx;
      y += this.moveStick.dy;
    }
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }

  /** Lövésirány a nyilak + jobb stick alapján (nem normalizált). */
  shootVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown('arrowleft')) x -= 1;
    if (this.isDown('arrowright')) x += 1;
    if (this.isDown('arrowup')) y -= 1;
    if (this.isDown('arrowdown')) y += 1;
    if (this.shootStick.active && (Math.abs(this.shootStick.dx) > 0.3 || Math.abs(this.shootStick.dy) > 0.3)) {
      x = this.shootStick.dx;
      y = this.shootStick.dy;
    }
    return { x, y };
  }

  private setupTouch(): void {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('touch-on');

    const bind = (id: string, store: { dx: number; dy: number; active: boolean }) => {
      const pad = document.getElementById(id);
      if (!pad) return;
      const knob = pad.querySelector<HTMLElement>('.knob');
      let sid: number | null = null;
      let cx = 0;
      let cy = 0;
      pad.addEventListener('touchstart', (e) => {
        const r = pad.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        sid = e.changedTouches[0]!.identifier;
        store.active = true;
        e.preventDefault();
      }, { passive: false });
      pad.addEventListener('touchmove', (e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier !== sid) continue;
          let dx = t.clientX - cx;
          let dy = t.clientY - cy;
          const m = Math.hypot(dx, dy);
          const max = 48;
          if (m > max) {
            dx = (dx / m) * max;
            dy = (dy / m) * max;
          }
          if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
          store.dx = dx / max;
          store.dy = dy / max;
        }
        e.preventDefault();
      }, { passive: false });
      const end = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier !== sid) continue;
          sid = null;
          store.active = false;
          store.dx = 0;
          store.dy = 0;
          if (knob) knob.style.transform = 'translate(0, 0)';
        }
      };
      pad.addEventListener('touchend', end);
      pad.addEventListener('touchcancel', end);
    };

    bind('stick', this.moveStick);
    bind('shootpad', this.shootStick);
  }
}
