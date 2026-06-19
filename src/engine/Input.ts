import type { Vec2 } from './math';

/**
 * Átállítható játék-akciók (a Beállítások · Irányítás lap köti billentyűkhöz).
 * A négy mozgás + négy lövésirány + a szünet/skill/bomba/TNT. Az egér-célzás és
 * a virtuális joystickok NEM köthetők át (mindig aktívak).
 */
export type InputAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'shoot-up' | 'shoot-down' | 'shoot-left' | 'shoot-right'
  | 'pause' | 'skill' | 'bomb' | 'tnt';

/** Gyári billentyű-kiosztás (a mentett felülírások erre épülnek rá). */
export const DEFAULT_BINDS: Record<InputAction, string> = {
  up: 'w', down: 's', left: 'a', right: 'd',
  'shoot-up': 'arrowup', 'shoot-down': 'arrowdown', 'shoot-left': 'arrowleft', 'shoot-right': 'arrowright',
  pause: 'p', skill: 'e', bomb: 'b', tnt: 't',
};

/**
 * Központi bemenetkezelő: billentyűzet, egér és érintőképernyő.
 * A játéklogika innen kérdezi le az aktuális állapotot (poll-alapú).
 */
export class Input {
  readonly keys: Record<string, boolean> = {};
  readonly mouse = { x: 0, y: 0, down: false };

  /** Aktuális billentyű-kiosztás (akció → kisbetűs `e.key`). A Game tölti be mentésből. */
  private binds: Record<InputAction, string> = { ...DEFAULT_BINDS };

  /** Görgetés-akkumulátor (egér kerék); a UI poll-onként lekérdezi és nullázza. */
  private wheelAccum = 0;

  /** Bal alsó virtuális joystick (mozgás). */
  private readonly moveStick = { dx: 0, dy: 0, active: false };
  /** Jobb alsó virtuális joystick (lövés). */
  private readonly shootStick = { dx: 0, dy: 0, active: false };

  /** Gamepad bal/jobb stick (poll-alapú, a Gamepad API maga is poll). */
  private readonly padMove = { dx: 0, dy: 0, active: false };
  private readonly padAim = { dx: 0, dy: 0, active: false };
  /** Az előző képkocka gamepad-gombállapota (felfutó él-detektáláshoz). */
  private readonly prevPadButtons: boolean[] = [];

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
      // Görgetés/oldalmozgás megelőzése: nyilak/space + bármely lekötött billentyű.
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) || this.isBound(k)) e.preventDefault();
      // Szünet: a lekötött pause-billentyű VAGY mindig az Escape (kimeneti kapu).
      if (k === this.binds.pause || k === 'escape') this.pauseRequested = true;
      // Felfutó él (nem ismétlődik nyomva tartásra):
      if (!wasDown) {
        if (k === this.binds.skill) this.skillRequested = true;   // aktív skill
        if (k === this.binds.tnt) this.tntRequested = true;       // TNT
        if (k === this.binds.bomb) this.bombRequested = true;     // bomba
      }
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

  /** A megadott akcióhoz rendelt billentyű (kisbetűs `e.key`). */
  bind(action: InputAction): string {
    return this.binds[action];
  }

  /** Az aktuális kiosztás másolata (a Beállítások lap kirajzolásához). */
  bindings(): Record<InputAction, string> {
    return { ...this.binds };
  }

  /** Igaz, ha a billentyű bármely akcióhoz le van kötve (preventDefault-hoz). */
  isBound(key: string): boolean {
    return (Object.values(this.binds) as string[]).includes(key);
  }

  /** Teljes kiosztás betöltése (mentésből); a hiányzó akciók a gyári értéket kapják. */
  setBinds(map: Partial<Record<InputAction, string>>): void {
    this.binds = { ...DEFAULT_BINDS, ...map };
  }

  /**
   * Egy akció átkötése. Ütközéskor (egy billentyű egyszerre csak egy akcióé)
   * a régi tulajdonos megkapja az átkötött akció korábbi billentyűjét (csere),
   * így nem marad lekötetlen akció.
   */
  setBind(action: InputAction, key: string): void {
    const k = key.toLowerCase();
    const prev = this.binds[action];
    for (const a of Object.keys(this.binds) as InputAction[]) {
      if (a !== action && this.binds[a] === k) this.binds[a] = prev;
    }
    this.binds[action] = k;
  }

  /** Mozgásirány a lekötött mozgás-billentyűk + bal stick alapján (egységvektor vagy nullvektor). */
  moveVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown(this.binds.left)) x -= 1;
    if (this.isDown(this.binds.right)) x += 1;
    if (this.isDown(this.binds.up)) y -= 1;
    if (this.isDown(this.binds.down)) y += 1;
    if (this.moveStick.active) {
      x += this.moveStick.dx;
      y += this.moveStick.dy;
    }
    if (this.padMove.active) {
      x += this.padMove.dx;
      y += this.padMove.dy;
    }
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }

  /** Lövésirány a lekötött lövés-billentyűk + jobb stick alapján (nem normalizált). */
  shootVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown(this.binds['shoot-left'])) x -= 1;
    if (this.isDown(this.binds['shoot-right'])) x += 1;
    if (this.isDown(this.binds['shoot-up'])) y -= 1;
    if (this.isDown(this.binds['shoot-down'])) y += 1;
    if (this.shootStick.active && (Math.abs(this.shootStick.dx) > 0.3 || Math.abs(this.shootStick.dy) > 0.3)) {
      x = this.shootStick.dx;
      y = this.shootStick.dy;
    }
    if (this.padAim.active && (Math.abs(this.padAim.dx) > 0.3 || Math.abs(this.padAim.dy) > 0.3)) {
      x = this.padAim.dx;
      y = this.padAim.dy;
    }
    return { x, y };
  }

  /**
   * Gamepad-poll: a Gamepad API maga is poll-alapú → nincs új eseménykezelő. A
   * Game frame-enként egyszer hívja, az input-getterek olvasása ELŐTT. Bal stick
   * = mozgás, jobb stick = célzás+lövés (twin-stick); gombok = a meglévő akciók
   * (standard mapping). Csak az első csatlakozott padet kezeli.
   */
  pollGamepad(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) { if (p && p.connected) { pad = p; break; } }
    if (!pad) { this.padMove.active = false; this.padAim.active = false; return; }

    const DEAD = 0.25;
    const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0;
    if (Math.hypot(lx, ly) > DEAD) { this.padMove.dx = lx; this.padMove.dy = ly; this.padMove.active = true; }
    else this.padMove.active = false;
    const rx = pad.axes[2] ?? 0, ry = pad.axes[3] ?? 0;
    if (Math.hypot(rx, ry) > DEAD) { this.padAim.dx = rx; this.padAim.dy = ry; this.padAim.active = true; }
    else this.padAim.active = false;

    // Egyszeri akciók felfutó éllel. Mapping: Start=szünet, A=skill, B=bomba, Y=TNT.
    const edge = (i: number): boolean => {
      const now = pad!.buttons[i]?.pressed ?? false;
      const was = this.prevPadButtons[i] ?? false;
      this.prevPadButtons[i] = now;
      return now && !was;
    };
    if (edge(9)) this.pauseRequested = true;
    if (edge(0)) this.skillRequested = true;
    if (edge(1)) this.bombRequested = true;
    if (edge(3)) this.tntRequested = true;
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
