import { TAU, rand, clamp } from '../engine/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

/**
 * Részecske-pool robbanásokhoz és effektekhez. VALÓDI pool: az objektumokat
 * újrahasznosítja (nincs képkockánkénti `{}`-allokáció), és lejáratkor
 * swap-remove-ot használ `splice` helyett (O(1), nem mozgat tömböt). Így a
 * sűrű harc sem termel GC-szemetet → nincs akadozás a részecskéktől.
 */
export class ParticleSystem {
  private pool: Particle[] = [];
  /** Aktív részecskék száma; a pool[0..count) az élők, a többi újrahasználható. */
  private count = 0;
  /** Szín → előre rajzolt lágy bélyegző (offscreen canvas). Lustán töltődik. */
  private readonly stamps = new Map<string, HTMLCanvasElement>();

  spawn(x: number, y: number, color: string, count: number, speed = 180, life = 0.5): void {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.3, speed);
      const p = this.obtain();
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = life;
      p.max = life;
      p.color = color;
      p.size = rand(2, 4);
    }
  }

  /** Szabad slotot ad (újrahasznál, vagy egyszer létrehoz a csúcsterhelésig). */
  private obtain(): Particle {
    let p = this.pool[this.count];
    if (!p) {
      p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, color: '#fff', size: 0 };
      this.pool[this.count] = p;
    }
    this.count++;
    return p;
  }

  clear(): void {
    this.count = 0; // az objektumokat megtartjuk újrahasználásra
  }

  update(dt: number): void {
    let n = this.count;
    for (let i = 0; i < n; ) {
      const it = this.pool[i]!;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.vx *= 0.93;
      it.vy *= 0.93;
      it.life -= dt;
      if (it.life <= 0) {
        // swap-remove: a halott slotot az utolsó élővel cseréljük (objektum marad)
        n--;
        const last = this.pool[n]!;
        this.pool[n] = it;
        this.pool[i] = last;
      } else {
        i++;
      }
    }
    this.count = n;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.count; i++) {
      const it = this.pool[i]!;
      const a = clamp(it.life / it.max, 0, 1);
      // Lágy, szín szerint gyorsítótárazott „bélyegző" + drawImage a forró úton:
      // gyorsabb, mint a per-részecske arc+fill, és szebb (puha izzó perem).
      const stamp = this.stampFor(it.color);
      const r = it.size * a * STAMP_SCALE;
      ctx.globalAlpha = a;
      ctx.drawImage(stamp, it.x - r, it.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Szín szerinti bélyegző (egyszer legenerálva, utána újrahasznált). */
  private stampFor(color: string): HTMLCanvasElement {
    let s = this.stamps.get(color);
    if (!s) { s = makeStamp(color); this.stamps.set(color, s); }
    return s;
  }
}

/** Méret-skála: a bélyegző tömör magja ~az eredeti korong, körötte puha izzás. */
const STAMP_SCALE = 1.8;

/**
 * Lágy, kör alakú részecske-bélyegző: tömör szín-kitöltés + radiális alfa-maszk
 * (`destination-in`), így BÁRMILYEN színformátumra (hex/rgb/név) működik. A mag
 * majdnem tömör, a perem átlátszóba olvad — ez adja a puha, izzó kinézetet.
 */
function makeStamp(color: string): HTMLCanvasElement {
  const S = 32;
  const r = S / 2;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = color;
  c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.92)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  return cv;
}
