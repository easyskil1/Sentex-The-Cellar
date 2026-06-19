import type { World } from '../../World';
import type { IEnemy } from './Enemy';
import { TAU, clamp } from '../../../engine/math';
import { HP } from '../../config';
import { softGlow } from './renderers/helpers';

/** A Sárkány-féle bossok teljes szín-palettája. */
export interface DragonPalette {
  scaleTop: string;
  scaleMid: string;
  scaleLow: string;
  belly: string;
  stroke: string;
  wing: string;
  wingEdge: string;
  spine: string;     // háttüskék / tarajok
  eye: string;
  eyeGlow: string;
  horn: string;
  aura: string;
}

export interface DragonConfig {
  hp?: number;
  dmg?: number;
  speed?: number;
  score?: number;
  pal?: DragonPalette;
}

export const DEFAULT_DRAGON_PALETTE: DragonPalette = {
  scaleTop: '#3fa84e',
  scaleMid: '#1f7a36',
  scaleLow: '#0c3a1c',
  belly: '#e8d27a',
  stroke: '#06210f',
  wing: '#2a6e38',
  wingEdge: '#0c3a1c',
  spine: '#e8c45a',
  eye: '#ffd23a',
  eyeGlow: '#ff8a1e',
  horn: '#d8c8a0',
  aura: 'rgba(80,220,120,0.12)',
};

/**
 * Boss — „Sárkány": pikkelyes szörny csapkodó szárnnyal, lengő tüskés farokkal
 * és tűzlehelettel.
 *  0 — tűzlehelet (a fej irányába söprő tűz-kúp)
 *  1 — tűzgolyók (néhány nehéz tűzgömb a játékos felé)
 *  2 — szárny-roham (a játékosra csap)
 * A fej(ek) rajza a `drawHeads` hookból jön — a kétfejű variáns két fejet rajzol.
 */
export class BossDragon implements IEnemy {
  readonly boss = true;
  r = 50;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  col = '#1f7a36';
  col2 = '#0c3a1c';
  readonly score: number;
  flash = 0;

  protected readonly pal: DragonPalette;
  protected wing = 0;
  protected bob = 0;
  protected tail = 0;
  protected faceAng = -Math.PI / 2; // a fej(ek) nézés-iránya (a játékos felé lerp-el)
  protected breathing = false;      // tűzlehelet vizuál aktív
  private state: 'idle' | 'dash' | 'breath' = 'idle';
  private stateT = 2.6;
  private breathCd = 0;
  private pattern = 2;
  private shootCd = 1.6;
  private cvx = 0;
  private cvy = 0;
  private entering = true;

  constructor(public x: number, public y: number, floor: number, _color = '#1f7a36', config: DragonConfig = {}) {
    this.hp = config.hp ?? 50000;
    this.maxHp = this.hp;
    this.dmg = config.dmg ?? 2;
    this.speed = config.speed ?? 70;
    this.pal = config.pal ?? DEFAULT_DRAGON_PALETTE;
    this.score = config.score ?? 2600 + floor * 700;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    this.wing += dt * 3.8;
    this.bob += dt * 2.0;
    this.tail += dt * 2.6;

    const rc = world.room;
    const p = world.player;

    if (this.entering) {
      this.y += this.speed * dt;
      if (this.y >= rc.y + 150) this.entering = false;
    }

    // a fej(ek) lassan a játékos felé fordulnak
    const target = Math.atan2(p.y - this.y, p.x - this.x);
    let d = target - this.faceAng;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    this.faceAng += d * Math.min(1, dt * 3);

    this.stateT -= dt;

    if (this.state === 'idle') {
      this.x += Math.cos(target) * this.speed * 0.42 * dt;
      this.y += Math.sin(target) * this.speed * 0.26 * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.pattern = (this.pattern + 1) % 3;
        if (this.pattern === 0) this.startBreath();
        else if (this.pattern === 1) this.fireballs(world, target);
        else this.startDash(world, target);
      }
      this.clampIn(rc);
    } else if (this.state === 'breath') {
      this.breathing = true;
      this.breathCd -= dt;
      if (this.breathCd <= 0) {
        this.breathCd = 0.1;
        for (let k = -2; k <= 2; k++) {
          const an = this.faceAng + k * 0.14;
          const sp = 250;
          world.ebullets.push({ x: this.x + Math.cos(this.faceAng) * this.r * 0.9, y: this.y - this.r * 0.5 + Math.sin(this.faceAng) * this.r * 0.5, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, r: 7, life: 3.2, style: 'fire' });
        }
        world.audio.enemyShoot();
      }
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2.6; this.breathing = false; this.shootCd = 1.2; }
      this.clampIn(rc);
    } else {
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.x < rc.x + this.r || this.x > rc.x + rc.w - this.r) { this.cvx *= -1; world.addShake(8); }
      if (this.y < rc.y + this.r || this.y > rc.y + rc.h - this.r) { this.cvy *= -1; world.addShake(8); }
      this.clampIn(rc);
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2.6; this.shootCd = 1.2; }
    }

    const rr = this.r * 0.78 + p.r;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      world.damagePlayer(this.dmg * HP.half, 'hurt', true);
      p.knockback(this.x, this.y, 270);
    }
  }

  private clampIn(rc: { x: number; y: number; w: number; h: number }): void {
    this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
    this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);
  }

  private startBreath(): void {
    this.state = 'breath';
    this.stateT = 1.5;
    this.breathCd = 0.2;
  }

  private fireballs(world: World, a: number): void {
    for (let k = -1; k <= 1; k++) {
      const an = a + k * 0.22;
      world.ebullets.push({ x: this.x, y: this.y - this.r * 0.3, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, r: 12, life: 4.5, style: 'fire' });
    }
    this.shootCd = 1.5;
    world.audio.enemyShoot();
    world.addShake(5);
  }

  private startDash(world: World, a: number): void {
    this.state = 'dash';
    this.stateT = 0.8;
    this.cvx = Math.cos(a) * 320;
    this.cvy = Math.sin(a) * 320;
    this.shootCd = 1.6;
    world.audio.boss();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.pal;
    const flash = this.flash > 0;
    const float = Math.sin(this.bob) * 4;
    const r = this.r;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.95, r * 1.2, r * 0.42, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y + float);

    // aura
    const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, r * 2);
    aura.addColorStop(0, pal.aura);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill();

    // ---- lengő tüskés farok (a test mögé) ----
    {
      const seg = 6;
      let px = 0, py = r * 0.3;
      ctx.strokeStyle = flash ? '#fff' : pal.scaleMid;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      const pts: Array<[number, number]> = [[px, py]];
      for (let i = 1; i <= seg; i++) {
        const t = i / seg;
        const swing = Math.sin(this.tail - t * 2) * r * 0.5 * t;
        px = -r * 0.1 + swing;
        py = r * 0.3 + t * r * 1.4;
        ctx.lineWidth = 12 * (1 - t * 0.8);
        ctx.lineTo(px, py);
        pts.push([px, py]);
      }
      ctx.stroke();
      // farok-tüskék
      ctx.fillStyle = pal.spine;
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = pts[i]!;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 6, y1 + 2);
        ctx.lineTo(x1 + 2, y1 - 8);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- szárnyak (a test mögé), csapkodva ----
    const spread = 0.7 + 0.3 * Math.sin(this.wing);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s * spread, 1);
      const wg = ctx.createLinearGradient(0, 0, r * 1.6, 0);
      wg.addColorStop(0, flash ? '#fff' : pal.wing);
      wg.addColorStop(1, pal.wingEdge);
      ctx.fillStyle = wg;
      ctx.strokeStyle = pal.wingEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.4);
      ctx.quadraticCurveTo(r * 1.2, -r * 0.85, r * 1.6, -r * 0.35);
      ctx.quadraticCurveTo(r * 1.15, -r * 0.2, r * 1.36, r * 0.1);
      ctx.quadraticCurveTo(r * 0.95, r * 0.02, r * 1.06, r * 0.45);
      ctx.quadraticCurveTo(r * 0.6, r * 0.28, r * 0.25, r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = pal.wingEdge;
      ctx.lineWidth = 2.5;
      for (const [ex, ey] of [[r * 1.6, -r * 0.35], [r * 1.36, r * 0.1], [r * 1.06, r * 0.45]] as const) {
        ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.3); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- törzs (pikkelyes) ----
    const bg = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.9);
    bg.addColorStop(0, flash ? '#fff' : pal.scaleTop);
    bg.addColorStop(0.6, flash ? '#fff' : pal.scaleMid);
    bg.addColorStop(1, pal.scaleLow);
    ctx.fillStyle = bg;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.66, r * 0.78, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // hasi pikkely-sávok
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.34, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const yy = r * (0.0 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, yy);
      ctx.quadraticCurveTo(0, yy + r * 0.06, r * 0.3, yy);
      ctx.stroke();
    }
    // pikkely-pöttyök a háton
    ctx.fillStyle = pal.scaleLow;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI - Math.PI * 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.45, -r * 0.1 + Math.sin(a) * r * 0.3, 2.4, 0, TAU);
      ctx.fill();
    }

    // ---- mellső lábak karmokkal ----
    for (const s of [-1, 1]) {
      ctx.strokeStyle = flash ? '#fff' : pal.scaleMid;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, r * 0.55);
      ctx.lineTo(s * r * 0.55, r * 0.92);
      ctx.stroke();
      ctx.strokeStyle = pal.horn;
      ctx.lineWidth = 2;
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.55, r * 0.92);
        ctx.lineTo(s * r * 0.55 + k * 5, r * 1.04);
        ctx.stroke();
      }
    }

    // ---- háttaraj ----
    ctx.fillStyle = pal.spine;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const sx = i * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(sx - 5, -r * 0.55);
      ctx.lineTo(sx, -r * 0.78);
      ctx.lineTo(sx + 5, -r * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    // ---- fej(ek) ----
    this.drawHeads(ctx, flash);

    ctx.restore();
  }

  /** Az alap Sárkány egyetlen feje (felül-középen). A variáns felülírja. */
  protected drawHeads(ctx: CanvasRenderingContext2D, flash: boolean): void {
    this.drawOneHead(ctx, 0, this.r * 0.12, -this.r * 0.95, this.faceAng, flash);
  }

  /**
   * Egy nyak + fej rajza. `nbx` a nyak töve a törzsön (x-offszet), `(hx,hy)` a
   * fej pozíciója, `face` a pofa nézés-iránya (radián, 0 = jobbra).
   */
  protected drawOneHead(ctx: CanvasRenderingContext2D, nbx: number, hx: number, hy: number, face: number, flash: boolean): void {
    const pal = this.pal;
    const r = this.r;

    // nyak (a törzstől a fejig, ívelt vastagodó szalag)
    ctx.strokeStyle = flash ? '#fff' : pal.scaleMid;
    ctx.lineWidth = r * 0.34;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(nbx, -r * 0.15);
    ctx.quadraticCurveTo(nbx + (hx - nbx) * 0.4, -r * 0.7, hx, hy + r * 0.12);
    ctx.stroke();
    // nyak-taraj
    ctx.fillStyle = pal.spine;
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const sx = nbx + (hx - nbx) * t;
      const sy = -r * 0.15 + (hy - (-r * 0.15)) * t - r * 0.12;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + 3);
      ctx.lineTo(sx, sy - 7);
      ctx.lineTo(sx + 4, sy + 3);
      ctx.closePath();
      ctx.fill();
    }

    // A fej PROFILBÓL van rajzolva (szarv felül, áll alul), ezért nem forgatjuk
    // teljes körbe (különben fejjel lefelé fordulna). Helyette: vízszintes
    // tükrözés a játékos oldala szerint + korlátozott billentés (−90°…+90°).
    // A pofa world-iránya így pontosan a `face` marad, de a fej teteje mindig felül.
    const cs = Math.cos(face), sn = Math.sin(face);
    const sx = cs >= 0 ? 1 : -1;
    const tilt = Math.atan2(sn, Math.abs(cs));

    // tűzlehelet-parázs a pofa elől
    if (this.breathing) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(sx, 1);
      ctx.rotate(tilt);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        const fx = r * (0.5 + t * 1.0);
        const fr = r * (0.1 + t * 0.22) * (0.7 + 0.3 * Math.sin(this.wing * 3 + i));
        const g = ctx.createRadialGradient(fx, 0, 0, fx, 0, fr);
        g.addColorStop(0, 'rgba(255,240,180,0.9)');
        g.addColorStop(0.5, 'rgba(255,120,20,0.5)');
        g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(fx, Math.sin(t * 6 + this.wing) * r * 0.08, fr, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // fej — bal/jobb tükrözés + korlátozott billentés (sosem fejjel lefelé)
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(sx, 1);
    ctx.rotate(tilt);
    const hg = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
    hg.addColorStop(0, flash ? '#fff' : pal.scaleTop);
    hg.addColorStop(1, pal.scaleLow);
    ctx.fillStyle = hg;
    ctx.strokeStyle = pal.stroke;
    ctx.lineWidth = 2.5;
    // koponya + megnyúlt pofa (+x előre)
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, -r * 0.22);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.32, r * 0.62, -r * 0.12);
    ctx.lineTo(r * 0.62, r * 0.04);
    ctx.quadraticCurveTo(r * 0.3, r * 0.22, -r * 0.28, r * 0.22);
    ctx.quadraticCurveTo(-r * 0.42, 0, -r * 0.28, -r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // alsó állkapocs (kissé nyitva, ha lehel)
    const jaw = this.breathing ? r * 0.16 : r * 0.04;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, r * 0.16);
    ctx.quadraticCurveTo(r * 0.3, r * 0.2 + jaw, r * 0.58, r * 0.08 + jaw);
    ctx.lineTo(r * 0.5, r * 0.16 + jaw);
    ctx.quadraticCurveTo(r * 0.2, r * 0.3 + jaw, -r * 0.1, r * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // fogak
    ctx.fillStyle = '#f5ead0';
    for (let i = 0; i < 3; i++) {
      const fx = r * (0.2 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(fx, r * 0.04);
      ctx.lineTo(fx - 3, r * 0.16);
      ctx.lineTo(fx + 3, r * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    // orrlyuk
    ctx.fillStyle = pal.stroke;
    ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.06, 2.2, 0, TAU); ctx.fill();
    // hátrafelé ívelő szarvak
    ctx.fillStyle = pal.horn;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.16 + s * r * 0.04);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.3, -r * 0.7, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.45, -r * 0.18, -r * 0.16, -r * 0.06);
      ctx.closePath();
      ctx.fill();
    }
    // szem
    softGlow(ctx, r * 0.05, -r * 0.08, r * 0.18, pal.eyeGlow);
    ctx.fillStyle = flash ? '#fff' : pal.eye;
    ctx.beginPath();
    ctx.ellipse(r * 0.05, -r * 0.08, r * 0.09, r * 0.07, 0, 0, TAU);
    ctx.fill();
    // pupilla (függőleges rés)
    ctx.fillStyle = pal.stroke;
    ctx.beginPath();
    ctx.ellipse(r * 0.06, -r * 0.08, r * 0.02, r * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
