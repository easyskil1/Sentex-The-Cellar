import type { World } from '../World';
import { Enemy, type IEnemy } from './enemies/Enemy';
import { TAU, clamp, dist2, shade } from '../../engine/math';
import { tearRadiusMul } from '../settings';

/** A játékos könnyének viselkedés-módosítói (perkekből). Lásd ABILITY_IDEAS.md. */
export interface TearBehavior {
  /** Átütő: átmegy az ellenfélen, a mögötte állót is sebzi (minden célt egyszer). */
  pierce?: boolean;
  /** Falról visszapattan (néhányszor), ahelyett hogy elhalna. */
  bounce?: boolean;
  /** A legközelebbi ellenfél felé kanyarodik. */
  homing?: boolean;
  /** Szellem: átrepül a köveken (a falaknál még elhal/pattan). */
  spectral?: boolean;
  /** Találatkor/elhaláskor 2 kisebb szilánkra hasad. */
  split?: boolean;
  /** A találat ellöki az ellenfelet a haladás irányába. */
  knockback?: boolean;
  /** Égő DoT-ot rak a célra. */
  burn?: boolean;
  /** Mérgező DoT-ot rak a célra. */
  poison?: boolean;
  /** Lefagyasztja (lassítja) a célt. */
  freeze?: boolean;
  /** A találat a közeli ellenfelekre is átível (lánc-villám). */
  shock?: boolean;
}

/** A játékos könnycsepp-lövedéke. */
export class Tear {
  r = 6.5;
  dead = false;

  private bounces: number;
  private readonly pierce: boolean;
  private readonly spectral: boolean;
  private readonly homing: boolean;
  private readonly split: boolean;
  private readonly knockback: boolean;
  private readonly burn: boolean;
  private readonly poison: boolean;
  private readonly freeze: boolean;
  private readonly shock: boolean;
  /** Átütő könny: ezeket az ellenfeleket már sebezte (ne többször ugyanazt). */
  private readonly hits = new Set<IEnemy>();
  /** Broad-phase candidate-pufferek (újrahasznosítva → nincs frame-allokáció). */
  private readonly nearBuf: IEnemy[] = [];
  private readonly chainBuf: IEnemy[] = [];

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public dmg: number,
    public life: number,
    behavior: TearBehavior = {},
    /** A könnycsepp színe (telített mag/ragyogás); a világosabb test ebből számít. */
    public color: string = '#7fc4ff',
    /** Függőleges összenyomás (1 = kör; <1 = lapított korong, pl. Lendkerék). */
    public squashY: number = 1,
  ) {
    this.pierce = !!behavior.pierce;
    this.spectral = !!behavior.spectral;
    this.homing = !!behavior.homing;
    this.split = !!behavior.split;
    this.knockback = !!behavior.knockback;
    this.burn = !!behavior.burn;
    this.poison = !!behavior.poison;
    this.freeze = !!behavior.freeze;
    this.shock = !!behavior.shock;
    this.bounces = behavior.bounce ? 2 : 0;
  }

  update(dt: number, world: World): void {
    // célkövetés: a sebességvektort a legközelebbi ellenfél felé forgatja
    if (this.homing) this.steer(dt, world);

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.die(world); return; }

    const rc = world.room;
    // falak: pattanás vagy elhalás
    const hitX = this.x < rc.x + 4 || this.x > rc.x + rc.w - 4;
    const hitY = this.y < rc.y + 4 || this.y > rc.y + rc.h - 4;
    if (hitX || hitY) {
      if (this.bounces > 0) {
        if (hitX) this.vx *= -1;
        if (hitY) this.vy *= -1;
        this.x = clamp(this.x, rc.x + 5, rc.x + rc.w - 5);
        this.y = clamp(this.y, rc.y + 5, rc.y + rc.h - 5);
        this.bounces--;
      } else { this.impactSpark(world); this.die(world); return; }
    }

    // kövek: a szellem-könny átrepül felettük; a többi elhal (vagy pattan)
    if (!this.spectral && world.shotHitObstacle(this.x, this.y, this.dmg)) {
      if (this.bounces > 0) { this.vx *= -1; this.vy *= -1; this.bounces--; }
      else { this.impactSpark(world); this.die(world); return; }
    }

    // ellenség-találat — broad-phase a CollisionSystem térrácsán (csak a közeli
    // ellenfelek, nem a teljes szoba), a candidate-puffert újrahasználjuk
    const enemies = world.collision.enemiesNear(this.x, this.y, this.r, this.nearBuf);
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e) continue; // a lánc-villám/halál közben rövidülhet a tömb
      const rr = this.r + e.r;
      if ((this.x - e.x) ** 2 + (this.y - e.y) ** 2 >= rr * rr) continue;
      if (this.pierce && this.hits.has(e)) continue; // átütő: minden célt csak egyszer
      // föld alatt / épp eltűnt → a lövedék ÁTHALAD; épp blokkol → ELNYELI
      if (e instanceof Enemy) {
        if (!e.targetable) continue;
        if (e.blocking) {
          world.particles.spawn(this.x, this.y, '#cfe0ff', 5, 120, 0.3);
          if (this.pierce) continue;
          this.die(world);
          return;
        }
      }
      this.hits.add(e);
      e.hp -= this.dmg;
      if (!e.boss) e.flash = 0.08; // boss: nincs fehér villanás (nagy test → zavaró strobe)
      world.addDamage(e.x, e.y - e.r, this.dmg);
      if (this.knockback) this.shove(e, world);
      // elemi státuszok — csak az alap-ellenfelekre (a bossok ellenállnak)
      if (e instanceof Enemy) {
        if (this.burn) e.applyBurn(2.5);
        if (this.poison) e.applyPoison(4);
        if (this.freeze) e.applyFreeze(1.5);
      }
      if (this.shock) this.chain(e, world);
      world.particles.spawn(this.x, this.y, e.col, 5, 140, 0.3);
      if (this.poison) this.poisonSplat(world); // zöld nyálkás paca a becsapódásnál
      world.audio.hitEnemy();
      if (e.hp <= 0) world.killEnemy(e);
      if (this.pierce) continue; // átütő tovább repül
      this.die(world);
      return;
    }
  }

  /**
   * Lánc-villám: a találat a közeli ellenfelekre is átível (fél sebzés, max 3 cél).
   * SZINERGIA „hősokk" (freeze+shock): a fagyott célon a villám teljes sebzéssel és
   * dupla ívvel (max 6 cél) csap át - a `freeze` flag a célt ekkor már lefagyasztotta.
   */
  private chain(from: IEnemy, world: World): void {
    const hot = this.freeze; // freeze+shock együtt → a `from` lefagyott (lásd a találat-ágat)
    const R = hot ? 150 : 120, R2 = R * R;
    const mul = hot ? 1 : 0.5, maxArcs = hot ? 6 : 3, col = hot ? '#9fe8ff' : '#fff36a';
    let arcs = 0;
    const near = world.collision.enemiesNear(from.x, from.y, R, this.chainBuf);
    for (let i = 0; i < near.length; i++) {
      const e = near[i]!;
      if (e === from) continue;
      if (dist2(from.x, from.y, e.x, e.y) >= R2) continue;
      e.hp -= this.dmg * mul;
      if (!e.boss) e.flash = 0.08;
      world.addDamage(e.x, e.y - e.r, this.dmg * mul, { color: col });
      world.particles.spawn(e.x, e.y, col, hot ? 7 : 4, 120, 0.25);
      if (e.hp <= 0) world.killEnemy(e);
      if (++arcs >= maxArcs) break;
    }
  }

  /** A sebességet a legközelebbi ellenfél felé forgatja (homing). */
  private steer(dt: number, world: World): void {
    const best = world.collision.nearestEnemy(this.x, this.y);
    if (!best) return;
    const desired = Math.atan2(best.y - this.y, best.x - this.x);
    const cur = Math.atan2(this.vy, this.vx);
    let diff = desired - cur;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    const maxTurn = 5 * dt; // rad/s — éles, de nem azonnali fordulás
    const na = cur + clamp(diff, -maxTurn, maxTurn);
    const sp = Math.hypot(this.vx, this.vy);
    this.vx = Math.cos(na) * sp;
    this.vy = Math.sin(na) * sp;
  }

  /** Ellenfél ellökése a könny haladási irányába (knockback). */
  private shove(e: IEnemy, world: World): void {
    const m = Math.hypot(this.vx, this.vy) || 1;
    const rc = world.room;
    e.x = clamp(e.x + (this.vx / m) * 16, rc.x + e.r, rc.x + rc.w - e.r);
    e.y = clamp(e.y + (this.vy / m) * 16, rc.y + e.r, rc.y + rc.h - e.r);
  }

  /**
   * #67 becsapódás-szikra: rövid szikra-burst, amikor a lövedék FALba/KŐbe csapódik
   * (eddig csak az ellenfél-találat adott részecskét). A „Játékérzet" kapcsoló alatt,
   * mint a csőtorkolat-villanás; a könny színében, hogy a build vizuálját kövesse.
   */
  private impactSpark(world: World): void {
    if (!world.gameFeel) return;
    world.particles.spawn(this.x, this.y, this.color, 5, 130, 0.22);
    world.particles.spawn(this.x, this.y, '#fff2c8', 3, 80, 0.16); // fényes mag-szikra
  }

  /** Zöld, nyálkás méreg-paca a becsapódás helyén (Méreg-csepp). */
  private poisonSplat(world: World): void {
    world.particles.spawn(this.x, this.y, '#7ad046', 18, 130, 0.55); // szétfröccsenő nyálka
    world.particles.spawn(this.x, this.y, '#9ce64a', 8, 70, 0.7);    // világos cseppek
    world.particles.spawn(this.x, this.y, '#4f8f24', 9, 45, 0.85);   // sűrű, sötétebb mag (megülő paca)
  }

  /** Elhalás: szilánkokra hasadás (split), becsapódás-részecske, halott jelölés. */
  private die(world: World): void {
    if (this.dead) return;
    if (this.poison) this.poisonSplat(world);
    else world.particles.spawn(this.x, this.y, '#9fd8ff', 4, 80, 0.25);
    if (this.split && this.dmg > 0) {
      const base = Math.atan2(this.vy, this.vx) + Math.PI; // hátrafelé szór szét
      const sp = (Math.hypot(this.vx, this.vy) || 200) * 0.8;
      // SZINERGIA „célkereső szilánkok" (split+homing): a szilánkok öröklik a homingot
      const shardBehavior = this.homing ? { homing: true } : {};
      for (const off of [-0.5, 0.5]) {
        const a = base + off;
        // a szilánkok nem hasadnak tovább (sima lövedék), de öröklik a színt/alakot
        world.tears.push(new Tear(this.x, this.y, Math.cos(a) * sp, Math.sin(a) * sp, this.dmg * 0.6, 0.4, shardBehavior, this.color, this.squashY));
      }
    }
    this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // #68 „vastag lövedék" CSAK vizuális (láthatóság): a kirajzolt sugár nő, az
    // ÜTKÖZÉSI sugár (this.r) marad → nem csalás, csak jobban látod a lövedéked.
    const dr = this.r * tearRadiusMul();
    const ry = dr * this.squashY; // a haladásra MERŐLEGES fél-tengely (lapításnál kisebb)
    // a lapított korongot a haladási irányba forgatjuk: a hosszanti tengely a
    // sebességvektorral áll (körnél, squashY=1, a forgatásnak nincs hatása)
    const ang = this.squashY !== 1 ? Math.atan2(this.vy, this.vx) : 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(ang);
    ctx.fillStyle = shade(this.color, 0.45); // világosabb test a telített magból
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, dr, ry, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-dr * 0.25, -ry * 0.4, dr * 0.4, ry * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
