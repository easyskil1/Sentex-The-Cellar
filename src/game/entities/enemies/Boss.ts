import { drawEnemy } from './renderers';
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
  col2 = '#1a0606';
  readonly score: number;
  flash = 0;

  private readonly attacks: BossAttack[];
  protected wob = 0;
  protected bob = 0;
  protected state: BossState = 'idle';
  protected stateT = 2;
  protected pattern = 0;
  protected shootCd = 1;
  protected cvx = 0;
  protected cvy = 0;
  protected entering = true;

  constructor(public x: number, public y: number, floor: number, color = '#ff5a5a', config: BossConfig = {}) {
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
    drawEnemy(ctx, {
      kind: 'boss',
      x: this.x,
      y: this.y,
      r: this.r,
      col: this.col,
      col2: this.col2,
      flash: this.flash > 0,
      bob: this.bob,
      wob: this.wob,
      face: this.state === 'dash' ? Math.atan2(this.cvy, this.cvx) : 0,
      moving: this.state === 'dash' || !this.entering,
      charge: this.state === 'dash' ? 'dash' : 'idle',
      active: this.shootCd < 0.4,
      arms: this.hasArms(),
    });

    // HP-csík
    if (this.hp < this.maxHp) {
      const w = this.r * 2.2;
      const x = this.x - w / 2;
      const y = this.y - this.r - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#ff5b6a';
      ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), 5);
    }
  }

  protected hasArms(): boolean { return false; }
}
