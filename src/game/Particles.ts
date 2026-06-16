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
      ctx.globalAlpha = a;
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.size * a, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
