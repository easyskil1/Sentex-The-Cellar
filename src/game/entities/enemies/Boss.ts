import type { World } from '../../World';
import type { IEnemy } from './Enemy';
import { TAU, clamp } from '../../../engine/math';
import { TUNING } from '../../balance/tuning';
import { HP } from '../../config';

type BossState = 'idle' | 'dash';

/** Egy boss támadás-mintája (a sorrendben körben váltakoznak). */
export type BossAttack = 'circle' | 'spread' | 'dash';

/** Egy boss-variáns hangolható paraméterei (stat + támadás-minták). */
export interface BossConfig {
  /** Fix életerő; ha nincs megadva, a TUNING.bossClassicHp. */
  hp?: number;
  /** Érintés-sebzés fél-szívben (×HP.half a kijelzett pont); alap 1 = 500 pont. */
  dmg?: number;
  /** A körben váltakozó támadás-minták; alap: körkörös lövés + roham. */
  attacks?: BossAttack[];
}

/**
 * A szint főellensége. A támadás-mintái (`attacks`) körben váltakoznak; az alap
 * Fenevad körkörös lövést és rohamot használ. A statok és a minták a konstruktor
 * `config`-jából jönnek, így a variánsok (pl. A mérges Fenevad) önállóan
 * hangolhatók — egymást nem érintik.
 */
export class Boss implements IEnemy {
  readonly boss = true;
  r = 46;
  hp: number;
  maxHp: number;
  speed = 80;
  dmg: number; // érintés-sebzés fél-szívben (×HP.half a kijelzett pont)
  col: string;
  col2 = '#2a1438';
  readonly score: number;
  flash = 0;

  private readonly attacks: BossAttack[];
  private wob = 0;
  private bob = 0;
  private state: BossState = 'idle';
  private stateT = 2;
  private pattern = 0;
  private shootCd = 1;
  private cvx = 0;
  private cvy = 0;
  private entering = true;

  constructor(public x: number, public y: number, floor: number, color = '#9c4bd8', config: BossConfig = {}) {
    this.col = color;
    // Boss NEM skálázódik a mélységgel — fix életerő (lásd balance/tuning.ts).
    this.hp = config.hp ?? TUNING.bossClassicHp;
    this.maxHp = this.hp;
    this.dmg = config.dmg ?? 1;
    this.attacks = config.attacks ?? ['circle', 'dash'];
    // a pontszám viszont a mélységgel nő (jutalom, nem nehézség).
    this.score = 1000 + floor * 400;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    this.wob += dt * 3;
    this.bob += dt * 5;

    const rc = world.room;
    const p = world.player;

    // belépő mozgás lefelé
    if (this.entering) {
      this.y += this.speed * dt;
      if (this.y >= rc.y + 120) this.entering = false;
    }

    this.stateT -= dt;
    const a = Math.atan2(p.y - this.y, p.x - this.x);

    if (this.state === 'idle') {
      this.x += Math.cos(a) * this.speed * 0.5 * dt;
      this.y += Math.sin(a) * this.speed * 0.3 * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.pattern = (this.pattern + 1) % this.attacks.length;
        const atk = this.attacks[this.pattern]!;
        if (atk === 'circle') {
          // körkörös golyózápor
          const n = TUNING.bossClassicProjectiles;
          for (let k = 0; k < n; k++) {
            const an = (k / n) * TAU + this.wob;
            world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 180, vy: Math.sin(an) * 180, r: 7, life: 5 });
          }
          this.shootCd = 1.4;
          world.audio.enemyShoot();
        } else if (atk === 'spread') {
          // célzott szórás: kúp a játékos felé
          for (let k = -2; k <= 2; k++) {
            const an = a + k * 0.18;
            world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, r: 6, life: 4 });
          }
          this.shootCd = 1.2;
          world.audio.enemyShoot();
        } else {
          // roham (dash) a játékos felé, falakról pattanva
          this.state = 'dash';
          this.stateT = 0.9;
          this.cvx = Math.cos(a) * 300;
          this.cvy = Math.sin(a) * 300;
          this.shootCd = 1.6;
        }
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
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2; }
    }

    // játékos ütközés
    const rr = this.r + p.r;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      world.damagePlayer(this.dmg * HP.half, 'hurt', true); // boss: fix sebzés (nem skálázódik)
      p.knockback(this.x, this.y, 240);
    }
  }

    draw(ctx: CanvasRenderingContext2D): void {
      // Árnyék
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.r * 0.9, this.r * 1.2, this.r * 0.45, 0, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.translate(this.x, this.y);

      const flash = this.flash > 0;
      const pulse = 1 + Math.sin(this.bob) * 0.04;

      // Külső aura
      const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, this.r * 1.8);
      aura.addColorStop(0, 'rgba(255,60,60,0.15)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 1.8, 0, TAU);
      ctx.fill();

      // Kezek — a test MÖGÉ rajzolva. Az alap Fenevadnak nincs keze (üres hook),
      // de a variánsok (pl. A mérges Fenevad) felülírhatják.
      this.drawArms(ctx, flash);

      // Fő test
      const grad = ctx.createRadialGradient(-10, -12, 8, 0, 0, this.r);
      grad.addColorStop(0, flash ? '#ffffff' : '#ff5a5a');
      grad.addColorStop(0.45, flash ? '#ffdede' : '#9b1c31');
      grad.addColorStop(1, '#1a0612');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 5;

      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 28;

      ctx.beginPath();
      ctx.ellipse(0, 0, this.r, this.r * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Tüskék körben
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + this.wob * 0.2;

        const x1 = Math.cos(a) * this.r * 0.9;
        const y1 = Math.sin(a) * this.r * 0.9;

        const x2 = Math.cos(a) * this.r * 1.35;
        const y2 = Math.sin(a) * this.r * 1.35;

        ctx.strokeStyle = '#2b0000';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Szarvak
      ctx.fillStyle = '#120000';

      ctx.beginPath();
      ctx.moveTo(-18, -this.r + 8);
      ctx.lineTo(-38, -this.r - 24);
      ctx.lineTo(-6, -this.r + 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(18, -this.r + 8);
      ctx.lineTo(38, -this.r - 24);
      ctx.lineTo(6, -this.r + 2);
      ctx.closePath();
      ctx.fill();

      // Arc (szem + száj) — felülírható hook, hogy a variánsok más arcot kaphassanak.
      this.drawFace(ctx, flash);

      ctx.restore();
    }

    /**
     * Az arc (szem + száj) rajza a test lokális koordinátáiban (a középpont 0,0).
     * Az alap Fenevad: fekete szem-alap + izzó piros szem, fekete ívelt száj fehér
     * fogakkal. A variánsok felülírják (lásd `Boss3` — A mérges Fenevad).
     */
    protected drawFace(ctx: CanvasRenderingContext2D, flash: boolean): void {
      // Szemek
      ctx.fillStyle = '#000';

      ctx.beginPath();
      ctx.arc(-16, -8, 10, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(16, -8, 10, 0, TAU);
      ctx.fill();

      // Izzó szemek
      ctx.fillStyle = flash ? '#fff' : '#ff2d2d';

      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.arc(-16, -8, 5, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(16, -8, 5, 0, TAU);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Száj
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(0, 12, 18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Fogak
      ctx.fillStyle = '#fff';

      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, 22);
        ctx.lineTo(i * 6 - 3, 14);
        ctx.lineTo(i * 6 + 3, 14);
        ctx.closePath();
        ctx.fill();
      }
    }

    /**
     * A kezek/karok rajza a test lokális koordinátáiban (a test MÖGÉ). Az alap
     * Fenevadnak nincs keze (üres), a variánsok felülírják.
     */
    protected drawArms(_ctx: CanvasRenderingContext2D, _flash: boolean): void {}
}
