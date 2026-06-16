import type { World } from '../../World';
import type { IEnemy } from './Enemy';
import { TAU, clamp } from '../../../engine/math';
import { HP } from '../../config';

/** A Sátán-féle bossok teljes szín-palettája. */
export interface SatanPalette {
  bodyTop: string;
  bodyMid: string;
  bodyLow: string;
  stroke: string;
  horn: string;
  hornTip: string;
  wing: string;
  wingEdge: string;
  eye: string;
  eyeGlow: string;
  aura: string;       // pokol-aura (rgba)
  flameA: string;     // belső láng
  flameB: string;     // külső láng (rgba 0)
  metal: string;      // szigony / körmök
}

export interface SatanConfig {
  hp?: number;
  dmg?: number;
  speed?: number;
  score?: number;
  pal?: SatanPalette;
}

export const DEFAULT_SATAN_PALETTE: SatanPalette = {
  bodyTop: '#d83a2a',
  bodyMid: '#9c1f18',
  bodyLow: '#3a0a08',
  stroke: '#1a0504',
  horn: '#2a1410',
  hornTip: '#0c0604',
  wing: '#a82a1e',
  wingEdge: '#4a0e0a',
  eye: '#ffe24a',
  eyeGlow: '#ff7a10',
  aura: 'rgba(255,60,20,0.16)',
  flameA: 'rgba(255,150,30,0.9)',
  flameB: 'rgba(255,30,0,0)',
  metal: '#e8c252',
};

/**
 * Boss — „Sátán": szárnyas pokol-úr háromágú szigonnyal és lángkoszorúval.
 *  0 — tűzvész (körkörös tűzgolyó-zápor)
 *  1 — lángoszlopok (égő foltok gyűrűje a játékos köré)
 *  2 — szigony-roham (a játékosra ront)
 * A kinézet a `pal`-ból jön; a variáns (Sátán keze) más palettát ad és óriási
 * karmokat rajzol az `drawAccents` hookban.
 */
export class BossSatan implements IEnemy {
  readonly boss = true;
  r = 52;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  col = '#9c1f18';
  col2 = '#3a0a08';
  readonly score: number;
  flash = 0;

  protected readonly pal: SatanPalette;
  protected wing = 0;   // szárny-csapkodás fázisa
  protected bob = 0;    // lebegés
  protected flame = 0;  // láng-lobogás fázisa
  private state: 'idle' | 'dash' = 'idle';
  private stateT = 2.4;
  private pattern = 2;
  private shootCd = 1.4;
  private cvx = 0;
  private cvy = 0;
  private entering = true;

  constructor(public x: number, public y: number, floor: number, _color = '#9c1f18', config: SatanConfig = {}) {
    this.hp = config.hp ?? 42000;
    this.maxHp = this.hp;
    this.dmg = config.dmg ?? 2;
    this.speed = config.speed ?? 75;
    this.pal = config.pal ?? DEFAULT_SATAN_PALETTE;
    this.score = config.score ?? 2200 + floor * 600;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    this.wing += dt * 4.5;
    this.bob += dt * 2.2;
    this.flame += dt * 6;

    const rc = world.room;
    const p = world.player;

    if (this.entering) {
      this.y += this.speed * dt;
      if (this.y >= rc.y + 140) this.entering = false;
    }

    this.stateT -= dt;
    const a = Math.atan2(p.y - this.y, p.x - this.x);

    if (this.state === 'idle') {
      this.x += Math.cos(a) * this.speed * 0.5 * dt;
      this.y += Math.sin(a) * this.speed * 0.32 * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.pattern = (this.pattern + 1) % 3;
        if (this.pattern === 0) this.fireStorm(world);
        else if (this.pattern === 1) this.flamePillars(world, p);
        else this.startDash(world, a);
      }
      this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);
    } else {
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.x < rc.x + this.r || this.x > rc.x + rc.w - this.r) { this.cvx *= -1; world.addShake(7); }
      if (this.y < rc.y + this.r || this.y > rc.y + rc.h - this.r) { this.cvy *= -1; world.addShake(7); }
      this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2.4; }
    }

    const rr = this.r * 0.8 + p.r;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      world.damagePlayer(this.dmg * HP.half, 'burn', true);
      p.knockback(this.x, this.y, 260);
    }
  }

  /** 0 — körkörös tűzgolyó-zápor. */
  private fireStorm(world: World): void {
    const n = 16;
    for (let k = 0; k < n; k++) {
      const an = (k / n) * TAU + this.flame * 0.1;
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, r: 8, life: 5, style: 'fire' });
    }
    this.shootCd = 1.5;
    world.audio.enemyShoot();
    world.addShake(4);
  }

  /** 1 — égő foltok gyűrűje a játékos köré. */
  private flamePillars(world: World, p: { x: number; y: number }): void {
    for (let k = 0; k < 8; k++) {
      const an = (k / 8) * TAU + this.flame * 0.2;
      const rr = 70;
      world.addHazard('fire', p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr, 26, 1.4);
    }
    world.addHazard('fire', p.x, p.y, 26, 1.2);
    this.shootCd = 1.6;
    world.audio.burn();
    world.addShake(6);
  }

  private startDash(world: World, a: number): void {
    this.state = 'dash';
    this.stateT = 0.8;
    this.cvx = Math.cos(a) * 330;
    this.cvy = Math.sin(a) * 330;
    this.shootCd = 1.7;
    world.audio.boss();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.pal;
    const flash = this.flash > 0;
    const float = Math.sin(this.bob) * 5;
    const r = this.r;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.95, r * 1.15, r * 0.4, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y + float);

    // pokol-aura
    const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, r * 2.1);
    aura.addColorStop(0, pal.aura);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.1, 0, TAU); ctx.fill();

    // ---- szárnyak (a test mögé), csapkodva ----
    const spread = 0.86 + 0.22 * Math.sin(this.wing);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s * spread, 1);
      const wg = ctx.createLinearGradient(0, 0, r * 1.7, 0);
      wg.addColorStop(0, flash ? '#fff' : pal.wing);
      wg.addColorStop(1, pal.wingEdge);
      ctx.fillStyle = wg;
      ctx.strokeStyle = pal.wingEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.25, -r * 0.35);
      ctx.quadraticCurveTo(r * 1.3, -r * 0.95, r * 1.7, -r * 0.45);
      // ujjak közti hártya (scallop-ok)
      ctx.quadraticCurveTo(r * 1.25, -r * 0.3, r * 1.5, -r * 0.05);
      ctx.quadraticCurveTo(r * 1.05, r * 0.05, r * 1.28, r * 0.4);
      ctx.quadraticCurveTo(r * 0.85, r * 0.32, r * 0.95, r * 0.7);
      ctx.quadraticCurveTo(r * 0.55, r * 0.5, r * 0.3, r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // szárny-ujjak (csontok)
      ctx.strokeStyle = pal.wingEdge;
      ctx.lineWidth = 2.5;
      for (const [ex, ey] of [[r * 1.7, -r * 0.45], [r * 1.5, -r * 0.05], [r * 1.28, r * 0.4]] as const) {
        ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.25); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- törzs ----
    const bg = ctx.createLinearGradient(0, -r * 0.6, 0, r * 1.0);
    bg.addColorStop(0, flash ? '#fff' : pal.bodyTop);
    bg.addColorStop(0.5, flash ? '#fff' : pal.bodyMid);
    bg.addColorStop(1, pal.bodyLow);
    ctx.fillStyle = bg;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.2, -r * 0.55, r * 0.9);
    ctx.quadraticCurveTo(0, r * 1.1, r * 0.55, r * 0.9);
    ctx.quadraticCurveTo(r * 0.85, r * 0.2, r * 0.5, -r * 0.2);
    ctx.quadraticCurveTo(0, -r * 0.5, -r * 0.5, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // mellkas-izom kontúr
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.15); ctx.lineTo(0, r * 0.5);
    ctx.moveTo(-r * 0.28, r * 0.1); ctx.quadraticCurveTo(0, r * 0.25, r * 0.28, r * 0.1);
    ctx.stroke();

    // ---- karok + szigony ----
    ctx.strokeStyle = flash ? '#fff' : pal.bodyMid;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    // bal kar
    ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.05); ctx.lineTo(-r * 0.8, r * 0.35); ctx.stroke();
    // jobb kar (szigonyt fog)
    const grip = Math.sin(this.bob) * r * 0.04;
    ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.05); ctx.lineTo(r * 0.78, r * 0.25 + grip); ctx.stroke();
    // szigony nyele
    ctx.strokeStyle = pal.metal;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.9 + grip); ctx.lineTo(r * 0.68, r * 0.95 + grip); ctx.stroke();
    // szigony három ága
    ctx.fillStyle = pal.metal;
    const tx = r * 0.95, ty = -r * 0.9 + grip;
    for (const off of [-r * 0.18, 0, r * 0.18]) {
      ctx.beginPath();
      ctx.moveTo(tx + off, ty + r * 0.1);
      ctx.lineTo(tx + off, ty - r * 0.25);
      ctx.lineTo(tx + off + (off === 0 ? 0 : (off > 0 ? 4 : -4)), ty - r * 0.32);
      ctx.lineTo(tx + off + (off === 0 ? 5 : 0), ty - r * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    this.drawAccents(ctx, flash); // variáns: óriási karmok stb.

    // ---- fej ----
    const hy = -r * 0.45;
    ctx.fillStyle = flash ? '#fff' : pal.bodyTop;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, hy, r * 0.4, r * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // nagy ívelt szarvak
    for (const s of [-1, 1]) {
      const hg = ctx.createLinearGradient(0, hy, 0, hy - r);
      hg.addColorStop(0, pal.horn);
      hg.addColorStop(1, pal.hornTip);
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.22, hy - r * 0.2);
      ctx.quadraticCurveTo(s * r * 0.75, hy - r * 0.55, s * r * 0.92, hy - r * 1.05);
      ctx.quadraticCurveTo(s * r * 0.6, hy - r * 0.5, s * r * 0.34, hy - r * 0.15);
      ctx.closePath();
      ctx.fill();
    }

    // dühös szemöldök + izzó szemek
    const ep = 0.7 + 0.3 * Math.sin(this.flame * 0.5);
    for (const s of [-1, 1]) {
      ctx.fillStyle = flash ? '#fff' : pal.eye;
      ctx.shadowColor = pal.eyeGlow;
      ctx.shadowBlur = 16 * ep;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.08, hy - r * 0.02);
      ctx.lineTo(s * r * 0.32, hy + r * 0.04);
      ctx.lineTo(s * r * 0.16, hy + r * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.05, hy - r * 0.12);
      ctx.lineTo(s * r * 0.34, hy - r * 0.04);
      ctx.stroke();
    }
    // vigyor agyarakkal
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, hy + r * 0.24);
    ctx.quadraticCurveTo(0, hy + r * 0.32, r * 0.2, hy + r * 0.24);
    ctx.stroke();
    ctx.fillStyle = '#f5ead0';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.12, hy + r * 0.24);
      ctx.lineTo(s * r * 0.08, hy + r * 0.34);
      ctx.lineTo(s * r * 0.16, hy + r * 0.26);
      ctx.closePath();
      ctx.fill();
    }

    // ---- lángkoszorú (mindenek elé, additív) ----
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fc = 13;
    for (let i = 0; i < fc; i++) {
      const a = (i / fc) * TAU;
      const rad = r * 0.95;
      const fx = Math.cos(a) * rad;
      const fy = Math.sin(a) * rad * 0.95 + r * 0.1;
      const h = r * (0.22 + 0.16 * (0.5 + 0.5 * Math.sin(this.flame + i * 1.1)));
      const g = ctx.createLinearGradient(fx, fy, fx, fy - h);
      g.addColorStop(0, flash ? 'rgba(255,255,255,0.8)' : pal.flameA);
      g.addColorStop(1, pal.flameB);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx - r * 0.09, fy);
      ctx.quadraticCurveTo(fx, fy - h * 0.7, fx, fy - h);
      ctx.quadraticCurveTo(fx + r * 0.04, fy - h * 0.6, fx + r * 0.09, fy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  /** Variáns-dísz a test lokális koordinátáiban (alapból semmi). */
  protected drawAccents(_ctx: CanvasRenderingContext2D, _flash: boolean): void {}
}
