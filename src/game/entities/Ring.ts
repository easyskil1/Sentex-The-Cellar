import type { World } from '../World';
import { Enemy, type IEnemy } from './enemies/Enemy';
import { TAU } from '../../engine/math';
import { RING } from '../config';

/** A Pecsétgyűrű (#2) öröklődő elemi flagjei (a játékos perkjeiből). */
export interface RingBehavior {
  burn?: boolean;
  poison?: boolean;
  freeze?: boolean;
}

/**
 * Pecsétgyűrű-lövedék (#2): egy utazó arany pecsét-KORONG. A teljes belseje
 * sebző zóna (terület + áthatolás egyben): minden ellenfelet, akit ÁTHALADVA
 * elér, EGYSZER sebez (mint a pierce - `hits` Set), `this.dmg` sebzéssel. Így
 * EGY célon a DPS = a sima lövéssel azonos (fireRate-tel lőve); a multi-target
 * AoE az inherens előny (a sugár filozófiája). Áthalad a köveken (mágikus pecsét),
 * a szoba faláig / a hatótáv lejártáig él. A `spin` tisztán vizuális forgás.
 */
export class Ring {
  dead = false;
  /** A korong sugara - a teljes belseje sebző zóna. */
  readonly rad = RING.radius;
  private spin = 0;
  private readonly burn: boolean;
  private readonly poison: boolean;
  private readonly freeze: boolean;
  /** Már sebzett ellenfelek (egy korong egy célt csak egyszer üt). */
  private readonly hits = new Set<IEnemy>();
  /** Broad-phase candidate-puffer (újrahasznosítva → nincs frame-allokáció). */
  private readonly nearBuf: IEnemy[] = [];

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public dmg: number,
    public life: number,
    behavior: RingBehavior = {},
    /** A pecsét fő (arany) színe. */
    public color: string = RING.core,
  ) {
    this.burn = !!behavior.burn;
    this.poison = !!behavior.poison;
    this.freeze = !!behavior.freeze;
  }

  update(dt: number, world: World): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += RING.spin * dt;
    this.life -= dt;
    if (this.life <= 0) { this.die(world); return; }

    // a korong PEREME a szoba falán túlér → elhal (a köveken áthalad)
    const rc = world.room;
    if (this.x < rc.x - this.rad || this.x > rc.x + rc.w + this.rad ||
        this.y < rc.y - this.rad || this.y > rc.y + rc.h + this.rad) {
      this.die(world);
      return;
    }

    // sebzés: a korong-belseje (rad + e.r) minden ÚJ ellenfélre, egyszer
    const enemies = world.collision.enemiesNear(this.x, this.y, this.rad, this.nearBuf);
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e || this.hits.has(e)) continue;
      const rr = this.rad + e.r;
      if ((this.x - e.x) ** 2 + (this.y - e.y) ** 2 >= rr * rr) continue;
      if (e instanceof Enemy) {
        if (!e.targetable) continue;
        if (e.blocking) { // a blokk a korongot is elnyeli ezen a célon (de tovább halad)
          world.particles.spawn(e.x, e.y, '#cfe0ff', 5, 120, 0.3);
          this.hits.add(e);
          continue;
        }
      }
      this.hits.add(e);
      e.hp -= this.dmg;
      if (!e.boss) e.flash = 0.08;
      world.addDamage(e.x, e.y - e.r, this.dmg, { color: RING.glow });
      if (e instanceof Enemy) {
        if (this.burn) e.applyBurn(2.5);
        if (this.poison) e.applyPoison(4);
        if (this.freeze) e.applyFreeze(1.5);
      }
      world.particles.spawn(e.x, e.y, this.color, 5, 140, 0.3);
      world.audio.hitEnemy();
      if (e.hp <= 0) world.killEnemy(e);
    }
  }

  private die(world: World): void {
    if (this.dead) return;
    world.particles.spawn(this.x, this.y, this.color, 8, 110, 0.35);
    this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    // belső, halvány sebző-zóna (a teljes korong jelzése)
    ctx.fillStyle = 'rgba(255,224,138,0.07)';
    ctx.beginPath();
    ctx.arc(0, 0, this.rad, 0, TAU);
    ctx.fill();
    // a pecsét-perem (vastag arany gyűrű ragyogással)
    ctx.lineWidth = RING.bandW;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.rad - RING.bandW * 0.5, 0, TAU);
    ctx.stroke();
    // bevésett rúnák: négy rövid sugárirányú rovátka a peremen
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(60,40,12,0.8)';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const r0 = this.rad - RING.bandW, r1 = this.rad;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
}
