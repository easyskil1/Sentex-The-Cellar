import type { World } from '../../World';
import type { IEnemy } from './Enemy';
import type { HazardKind } from '../../types';
import { TAU, clamp, rand } from '../../../engine/math';
import { HP } from '../../config';

/** A Múmia-féle bossok teljes szín-palettája. */
export interface MummyPalette {
  wrapLight: string;   // kötés-réteg világos (a tekert sávok teteje)
  wrapMid: string;     // kötés-réteg közép
  wrapDark: string;    // kötés-rések / körvonal
  voidCol: string;     // sötét üreg: szemrés, szakadt kötés mögötti mélység
  eye: string;         // a résekből izzó szem
  eyeGlow: string;     // a szem ragyogása
  bullet: string;      // átok-lövedék kiegészítő szín
}

/** Egy Múmia-variáns hangolható paraméterei. */
export interface MummyConfig {
  hp?: number;
  dmg?: number;        // fél-szívben (×HP.half a kijelzett pont)
  speed?: number;
  score?: number;
  pal?: MummyPalette;
  ground?: HazardKind; // a földcsapda típusa (alap: 'mine' homok-akna)
}

export const DEFAULT_MUMMY_PALETTE: MummyPalette = {
  wrapLight: '#e2d4b2',
  wrapMid: '#b09a72',
  wrapDark: '#6b5a3c',
  voidCol: '#1b140d',
  eye: '#ffd884',
  eyeGlow: '#e0992c',
  bullet: '#ffe9a8',
};

/**
 * Boss — „Múmia": kötésekbe tekert, ősi rém. Három minta váltakozik:
 *  0 — átok-szórás (legyezőszerű mágikus lövedékek)
 *  1 — homok-csapda (ketyegő aknák a játékos köré)
 *  2 — roham (a játékosra veti magát, falról pattanva)
 * A teljes kinézet a `pal`-ból jön; a variáns (Múmia haragja) más palettát és
 * földcsapdát ad, és felülírja a lángoló `drawAccents` díszt.
 */
export class BossMummy implements IEnemy {
  readonly boss = true;
  r = 48;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  col = '#b09a72';
  col2 = '#6b5a3c';
  readonly score: number;
  flash = 0;

  protected readonly pal: MummyPalette;
  protected readonly ground: HazardKind;
  protected wob = 0;   // kötés-hullámzás / lengő szalagok
  protected bob = 0;   // lebegés
  private state: 'idle' | 'dash' = 'idle';
  private stateT = 2.2;
  private pattern = 2;
  private shootCd = 1.2;
  private cvx = 0;
  private cvy = 0;
  private entering = true;

  constructor(public x: number, public y: number, floor: number, _color = '#b09a72', config: MummyConfig = {}) {
    this.hp = config.hp ?? 32000;
    this.maxHp = this.hp;
    this.dmg = config.dmg ?? 1.5;
    this.speed = config.speed ?? 70;
    this.pal = config.pal ?? DEFAULT_MUMMY_PALETTE;
    this.ground = config.ground ?? 'mine';
    this.score = config.score ?? 1800 + floor * 500;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    this.wob += dt * 2.4;
    this.bob += dt * 2.0;

    const rc = world.room;
    const p = world.player;

    if (this.entering) {
      this.y += this.speed * dt;
      if (this.y >= rc.y + 130) this.entering = false;
    }

    this.stateT -= dt;
    const a = Math.atan2(p.y - this.y, p.x - this.x);

    if (this.state === 'idle') {
      this.x += Math.cos(a) * this.speed * 0.45 * dt;
      this.y += Math.sin(a) * this.speed * 0.28 * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.pattern = (this.pattern + 1) % 3;
        if (this.pattern === 0) this.curseFan(world, a);
        else if (this.pattern === 1) this.sandTrap(world, p);
        else this.startDash(a);
      }
      this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);
    } else {
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.x < rc.x + this.r || this.x > rc.x + rc.w - this.r) { this.cvx *= -1; world.addShake(6); }
      if (this.y < rc.y + this.r || this.y > rc.y + rc.h - this.r) { this.cvy *= -1; world.addShake(6); }
      this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2.2; }
    }

    const rr = this.r + p.r;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      world.damagePlayer(this.dmg * HP.half, 'hurt', true);
      p.knockback(this.x, this.y, 240);
    }
  }

  /** 0 — átok-szórás: legyezőszerű mágikus lövedékek a játékos felé. */
  private curseFan(world: World, a: number): void {
    for (let k = -3; k <= 3; k++) {
      const an = a + k * 0.16;
      world.ebullets.push({ x: this.x, y: this.y - this.r * 0.4, vx: Math.cos(an) * 230, vy: Math.sin(an) * 230, r: 7, life: 4.5, style: 'arcane' });
    }
    this.shootCd = 1.5;
    world.audio.enemyShoot();
  }

  /** 1 — homok-csapda: ketyegő aknák (vagy lángfoltok) a játékos köré. */
  private sandTrap(world: World, p: { x: number; y: number }): void {
    world.addHazard(this.ground, p.x, p.y, 30, this.ground === 'fire' ? rand(0.9, 1.5) : rand(1.4, 1.9));
    for (let k = 0; k < 4; k++) {
      const an = (k / 4) * TAU + this.wob;
      const rr = 64 + Math.random() * 36;
      world.addHazard(this.ground, p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr, 28, this.ground === 'fire' ? rand(0.9, 1.5) : rand(1.6, 2.1));
    }
    this.shootCd = 1.6;
    world.addShake(4);
    world.audio.enemyShoot();
  }

  private startDash(a: number): void {
    this.state = 'dash';
    this.stateT = 0.85;
    this.cvx = Math.cos(a) * 300;
    this.cvy = Math.sin(a) * 300;
    this.shootCd = 1.7;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.pal;
    const flash = this.flash > 0;
    const float = Math.sin(this.bob) * 3;
    const r = this.r;
    const lite = flash ? '#ffffff' : pal.wrapLight;
    const mid = flash ? '#ffffff' : pal.wrapMid;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 1.02, r * 1.0, r * 0.36, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y + float);

    // ---- lengő, kilógó kötés-végek (a test mögé) ----
    ctx.lineCap = 'round';
    for (const [bx, by, len, ph] of [[-r * 0.5, r * 0.35, 1.25, 0], [r * 0.52, r * 0.2, 1.1, 1.4], [-r * 0.15, r * 0.85, 0.7, 2.6]] as const) {
      const sway = Math.sin(this.wob * 1.5 + ph) * 12;
      ctx.strokeStyle = mid;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by + r * len * 0.55, bx + sway, by + r * len);
      ctx.stroke();
      ctx.strokeStyle = pal.wrapDark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway * 0.5, by + r * len * 0.55, bx + sway, by + r * len);
      ctx.stroke();
    }

    // ---- bepólyált, vállas törzs ----
    const bodyPath = (): void => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.02);            // bal váll
      ctx.quadraticCurveTo(-r * 0.72, r * 0.45, -r * 0.5, r * 0.96);
      // rongyos alj (cakkos kötés-perem)
      for (let i = 0; i <= 6; i++) {
        const tx = -r * 0.5 + (i / 6) * r * 1.0;
        const dip = (i % 2 === 0 ? r * 1.12 : r * 0.96) + Math.sin(this.wob + i) * 1.5;
        ctx.lineTo(tx, dip);
      }
      ctx.quadraticCurveTo(r * 0.72, r * 0.45, r * 0.6, -r * 0.02);  // jobb oldal fel
      ctx.quadraticCurveTo(r * 0.4, -r * 0.2, r * 0.2, -r * 0.24);   // jobb váll a nyakhoz
      ctx.quadraticCurveTo(0, -r * 0.28, -r * 0.2, -r * 0.24);       // nyak
      ctx.quadraticCurveTo(-r * 0.4, -r * 0.2, -r * 0.6, -r * 0.02); // bal váll
      ctx.closePath();
    };
    const tg = ctx.createLinearGradient(-r * 0.4, 0, r * 0.5, r * 0.6);
    tg.addColorStop(0, mid);
    tg.addColorStop(0.5, lite);
    tg.addColorStop(1, mid);
    bodyPath();
    ctx.fillStyle = tg;
    ctx.fill();

    // tekert kötés-sávok a törzsre vágva (rétegelt, enyhén egyenetlen)
    ctx.save();
    bodyPath();
    ctx.clip();
    for (let i = 0; i < 13; i++) {
      const yy = -r * 0.18 + i * (r * 0.108);
      const tilt = Math.sin(i * 1.3) * r * 0.05;
      const wv = Math.sin(this.wob * 1.4 + i * 0.5) * 1.3;
      // a sáv világos teteje
      ctx.strokeStyle = i % 2 === 0 ? lite : mid;
      ctx.lineWidth = r * 0.085;
      ctx.beginPath();
      ctx.moveTo(-r, yy + tilt + wv);
      ctx.quadraticCurveTo(0, yy - tilt + wv + 2, r, yy + tilt + wv);
      ctx.stroke();
      // a rés sötét alsó éle
      ctx.strokeStyle = pal.wrapDark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r, yy + tilt + wv + r * 0.05);
      ctx.quadraticCurveTo(0, yy - tilt + wv + 2 + r * 0.05, r, yy + tilt + wv + r * 0.05);
      ctx.stroke();
    }
    // szakadt foltok (a kötés alól kilátszó sötét belső)
    ctx.fillStyle = pal.voidCol;
    for (const [vx, vy, vr] of [[-r * 0.28, r * 0.36, r * 0.12], [r * 0.3, r * 0.62, r * 0.09]] as const) {
      ctx.beginPath();
      ctx.ellipse(vx, vy, vr, vr * 0.7, 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    bodyPath();
    ctx.strokeStyle = pal.wrapDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ---- lelógó, bepólyált karok (a törzs mellett) ----
    for (const s of [-1, 1]) {
      const swing = Math.sin(this.bob + (s > 0 ? 1 : 0)) * r * 0.05;
      ctx.strokeStyle = mid;
      ctx.lineWidth = r * 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * r * 0.5, -r * 0.02);
      ctx.quadraticCurveTo(s * r * 0.72, r * 0.35, s * r * 0.6 + swing, r * 0.8);
      ctx.stroke();
      // kar-kötések rései
      ctx.strokeStyle = pal.wrapDark;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const t = 0.15 + i * 0.22;
        const ax = s * r * 0.5 + (s * r * 0.6 + swing - s * r * 0.5) * t;
        const ay = -r * 0.02 + (r * 0.8 + r * 0.02) * t;
        ctx.beginPath();
        ctx.moveTo(ax - r * 0.11, ay - 3);
        ctx.lineTo(ax + r * 0.11, ay + 3);
        ctx.stroke();
      }
    }

    this.drawAccents(ctx, flash); // variáns-dísz (lángok stb.)

    // ---- fej: kötésekbe tekert koponya ----
    const hy = -r * 0.6;
    const headPath = (): void => {
      ctx.beginPath();
      ctx.ellipse(0, hy, r * 0.38, r * 0.44, 0, 0, TAU);
      ctx.closePath();
    };
    headPath();
    ctx.fillStyle = lite;
    ctx.fill();
    // fej-kötések: ferde tekercsek
    ctx.save();
    headPath();
    ctx.clip();
    for (let i = -4; i <= 5; i++) {
      const yy = hy + i * (r * 0.12);
      ctx.strokeStyle = i % 2 === 0 ? mid : lite;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, yy - r * 0.06);
      ctx.lineTo(r * 0.5, yy + r * 0.06); // ferde tekercs
      ctx.stroke();
      ctx.strokeStyle = pal.wrapDark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, yy - r * 0.06 + r * 0.05);
      ctx.lineTo(r * 0.5, yy + r * 0.06 + r * 0.05);
      ctx.stroke();
    }
    // szemrés: ferde sötét sáv, ahonnan a szemek izzanak
    ctx.fillStyle = pal.voidCol;
    ctx.save();
    ctx.translate(0, hy + r * 0.04);
    ctx.rotate(0.08);
    ctx.fillRect(-r * 0.32, -r * 0.07, r * 0.64, r * 0.14);
    ctx.restore();
    ctx.restore();

    // izzó szemek a résből (pulzálva)
    const ep = 0.7 + Math.sin(this.bob * 2) * 0.3;
    for (const s of [-1, 1]) {
      ctx.fillStyle = flash ? '#fff' : pal.eye;
      ctx.shadowColor = pal.eyeGlow;
      ctx.shadowBlur = 13 * ep;
      ctx.beginPath();
      ctx.ellipse(s * r * 0.15, hy + r * 0.07, r * 0.07, r * 0.045, 0.08, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // fej körvonal + egy laza, lelógó kötés-vég az áll mellett
    headPath();
    ctx.strokeStyle = pal.wrapDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    const dangle = Math.sin(this.wob * 1.6) * r * 0.12;
    ctx.strokeStyle = mid;
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, hy + r * 0.34);
    ctx.quadraticCurveTo(-r * 0.34 + dangle, hy + r * 0.62, -r * 0.22 + dangle, hy + r * 0.82);
    ctx.stroke();

    ctx.restore();
  }

  /** Variáns-dísz a test lokális koordinátáiban (alapból semmi). */
  protected drawAccents(_ctx: CanvasRenderingContext2D, _flash: boolean): void {}
}
