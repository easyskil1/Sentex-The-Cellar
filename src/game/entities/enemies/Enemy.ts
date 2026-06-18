import type { World } from '../../World';
import { TAU, clamp, rand } from '../../../engine/math';
import { HP } from '../../config';
import { ENEMY_STATS, CHAMPION_COLORS, type EnemyKind, type ChampionTrait } from './enemyTypes';
import { drawEnemy } from './EnemyRenderer';
import { NO_SCALE, type EnemyScale } from '../../balance/difficulty';
import { dispatch } from './behaviors/registry';

/** Közös felület minden ellenséghez (alap és boss is ezt valósítja meg). */
export interface IEnemy {
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  flash: number;
  col: string;
  col2: string;
  readonly boss: boolean;
  readonly score: number;
  update(dt: number, world: World): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

type ChargeState = 'idle' | 'wind' | 'dash';
type LaserState = 'idle' | 'aim' | 'fire';

/**
 * Alap ellenség: a `kind` szerint különböző viselkedéssel.
 *  fly/walker        — egyszerű üldözés (a légy köveken átrepül)
 *  shooter           — távolságot tart és lő
 *  charger           — feltöltődik, majd ráront
 *  rotling           — mérgező tócsát hagy maga után
 *  spitter           — közel megy és gyors savsorozatot lő
 *  chiller           — a közelében lelassítja a játékost
 *  lancer            — megcéloz, majd energiasugarat lő
 *  pyro              — közelről lángot okád, égő foltokat hagy
 *  bombardier        — ketyegő aknákat rak (a robbanás nem hat rá)
 *  mistweaver        — eloszló ködfelhőket hagy
 */
export class Enemy implements IEnemy {
  readonly boss = false;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  col: string;
  col2: string;
  score: number; // alapból fix, de a champion-trait megemeli (lásd applyChampion)
  private readonly shoots: boolean;
  private readonly charges: boolean;
  private readonly floats: boolean;
  private readonly noContact: boolean;
  readonly biter: boolean; // raj-egyed (csótány / pók-fióka): igaz a harapós (sebző) példányra
  readonly champion: ChampionTrait | null; // Wave 3: felturbózott variáns (vagy null)
  readonly lifesteal: boolean; // Wave 6 (vámpír/pióca): gyógyul, amikor sebzi a játékost
  tickAttached = false; // kullancs: igaz lett, amikor felmászott a játékosra (a World leveszi)

  flash = 0;
  // Elemi státuszok (perkekből — lásd Tear): égés/méreg DoT, fagy-lassítás.
  private burnT = 0;
  private burnTick = 0;
  private poisonT = 0;
  private poisonTick = 0;
  private freezeT = 0;
  private hasteT = 0; // Feldühítő: ideiglenes gyorsítás
  // Viselkedés-állapot — PUBLIC, mert a kiszervezett behaviors/ modulok (a kind
  // szerinti viselkedés-függvények) az Enemy-példányon át érik el (e.<mező>).
  buried = false; // Gilista: föld alatt (nem célozható, nem sebez érintésre)
  hideT = 0; // Villanó: rövid eltűnés (nem célozható)
  blockT = 0; // Blokkoló: épp blokkol (a lövéseket elnyeli)
  baseSpeed: number;
  wob = rand(0, TAU);
  bob = rand(0, TAU);
  face = 0;
  moving = false;
  shootCd = rand(1, 2.5);
  actCd = rand(0.6, 1.8); // általános „cselekvés" ütem (tócsa/akna/köd lerakás stb.)
  bombToss = false; // aknász: váltakozva dob (true) / lerak (false)
  chargeState: ChargeState = 'idle';
  chargeT = rand(1, 2);
  cvx = 0;
  cvy = 0;
  roachT = rand(0.2, 0.6); // csótány: meddig tart a jelenlegi cikázás-irány
  roachDir = rand(0, TAU);
  scatterT = 0; // pók-fióka: kezdeti össze-vissza szaladgálás hátralévő ideje

  // Lézervető állapota (PUBLIC — a behaviors/ modulok érik el)
  laserState: LaserState = 'idle';
  laserT = rand(1.5, 3);
  laserAng = 0;
  laserLen = 0;

  // Wave 6 állapotok (mitológiai szörnyek) — PUBLIC a behaviors/ miatt
  reviveLeft = 0; // Csontváz: hányszor támadhat még fel
  petrified = false; // Vízköpő: kő-fázis (sebezhetetlen, mozdulatlan)

  // Pillanatnyi vizuális jelzők a renderelőnek — PUBLIC a behaviors/ miatt
  breathing = false;
  active = false;

  constructor(public readonly kind: EnemyKind, public x: number, public y: number, scale: EnemyScale = NO_SCALE, isBiter = false, champion: ChampionTrait | null = null) {
    const s = ENEMY_STATS[kind];
    // raj-egyedeknél (csótány / pók-fióka) a „harapós" példány sebez és más színű
    const biter = (kind === 'roach' || kind === 'spiderling') && isBiter;
    this.biter = biter;
    this.r = s.r;
    // a csótány-harapós lassabb és szívósabb; a pók-fióka harapós marad nagyon gyors
    const hpMul = biter ? (kind === 'roach' ? 2 : 1.5) : 1;
    this.hp = s.hp * scale.hp * hpMul;
    this.maxHp = this.hp;
    this.speed = (biter && kind === 'roach' ? 95 : s.speed) * rand(0.85, 1.15);
    this.baseSpeed = this.speed; // a fagy-státusz ehhez képest lassít
    // NYERS bázis-sebzés (fél-szívben). A mélység-szorzót KÖZPONTILAG a
    // World.damagePlayer adja hozzá (enemyDamageMul), így minden sebzés-forrás
    // — a lövedékek és talaj-veszélyek is — egységesen skálázódik.
    this.dmg = s.dmg;
    this.col = biter ? '#e2402a' : s.col;
    this.col2 = biter ? '#3a0c0c' : s.col2;
    this.score = biter ? (kind === 'roach' ? 60 : 24) : s.score;
    this.shoots = !!s.shoots;
    this.charges = !!s.charges;
    this.floats = !!s.floats;
    this.noContact = biter ? false : !!s.noContact;
    // Wave 6: a vámpír és a pióca érintésből életet szív
    this.lifesteal = kind === 'vampire' || kind === 'leech';
    // a frissen kikelt pók-fióka előbb egy ideig össze-vissza szaladgál
    if (kind === 'spiderling') this.scatterT = rand(1.4, 2.4);
    if (kind === 'worm') this.buried = true; // a gilista a föld alatt indul
    if (kind === 'skeleton') this.reviveLeft = 1; // a csontváz egyszer feltámad
    if (kind === 'gargoyle') this.petrified = true; // a vízköpő kőként indul
    this.champion = champion;
    if (champion) this.applyChampion(champion);
  }

  /** Champion-trait alkalmazása az alap-statokra (Wave 3): szívósabb + átszínezett. */
  private applyChampion(t: ChampionTrait): void {
    this.hp *= 1.6; // közös: minden champion szívósabb
    if (t === 'tough') { this.hp *= 1.6; this.baseSpeed *= 0.85; }
    else if (t === 'swift') { this.baseSpeed *= 1.7; }
    else if (t === 'giant') { this.r *= 1.5; this.hp *= 1.4; this.dmg += 1; }
    this.speed = this.baseSpeed;
    this.maxHp = this.hp;
    const tint = CHAMPION_COLORS[t];
    this.col = tint.col;
    this.col2 = tint.col2;
    this.score = Math.round(this.score * 2.5); // nagyobb jutalom
  }

  /** Égés-státusz (perk): rövid, erősebb DoT. */
  applyBurn(dur: number): void { this.burnT = Math.max(this.burnT, dur); if (this.burnTick <= 0) this.burnTick = 0.4; }
  /** Méreg-státusz (perk): hosszabb, lassabb DoT. */
  applyPoison(dur: number): void { this.poisonT = Math.max(this.poisonT, dur); if (this.poisonTick <= 0) this.poisonTick = 0.5; }
  /** Fagy-státusz (perk): lassítja a mozgást az időtartam alatt. */
  applyFreeze(dur: number): void { this.freezeT = Math.max(this.freezeT, dur); }
  /** Gyorsítás (a Feldühítő hívja a közeli ellenfelekre). */
  applyHaste(dur: number): void { this.hasteT = Math.max(this.hasteT, dur); }
  /** Célozható-e a lövedékekkel? Föld alatt / eltűnt / kővé dermedt → nem. */
  get targetable(): boolean { return !this.buried && this.hideT <= 0 && !this.petrified; }
  /** Épp blokkol-e (a lövéseket elnyeli)? */
  get blocking(): boolean { return this.blockT > 0; }

  /**
   * Csontváz: a killEnemy ezt hívja, mielőtt törölné. Ha még van feltámadása,
   * fél HP-val visszatér (és a halál elmarad). Igaz, ha feltámadt.
   */
  tryRevive(world: World): boolean {
    if (this.reviveLeft <= 0) return false;
    this.reviveLeft--;
    this.hp = this.maxHp * 0.5;
    this.flash = 0.25;
    this.active = true;
    world.particles.spawn(this.x, this.y, '#e8e0d0', 18, 180, 0.6);
    world.addFloater(this.x, this.y - this.r, 'Revives!', '#e8e0d0');
    return true;
  }

  /** Státuszok léptetése; igaz, ha a DoT megölte az ellenfelet (a hívó ekkor kilép). */
  private tickStatus(dt: number, world: World): boolean {
    if (this.burnT > 0) {
      this.burnT -= dt; this.burnTick -= dt;
      if (this.burnTick <= 0) { this.burnTick = 0.4; this.hp -= 100; world.particles.spawn(this.x, this.y, '#ff7a1e', 3, 90, 0.3); }
    }
    if (this.poisonT > 0) {
      this.poisonT -= dt; this.poisonTick -= dt;
      if (this.poisonTick <= 0) { this.poisonTick = 0.5; this.hp -= 100; world.particles.spawn(this.x, this.y, '#8fbf4a', 3, 80, 0.3); }
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.hp <= 0) { world.killEnemy(this); return true; }
    return false;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    // elemi státuszok (DoT + fagy); a DoT megölheti az ellenfelet → kilépés
    if ((this.burnT > 0 || this.poisonT > 0 || this.freezeT > 0) && this.tickStatus(dt, world)) return;
    this.speed = (this.freezeT > 0 ? this.baseSpeed * 0.4 : this.baseSpeed) * (this.hasteT > 0 ? 1.5 : 1);
    if (this.hasteT > 0) this.hasteT -= dt;
    if (this.hideT > 0) this.hideT -= dt;
    if (this.champion === 'regen' && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 300 * dt);
    this.wob += dt * 3;
    this.bob += dt * 5;
    this.breathing = false;
    this.active = false;

    const p = world.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = a;
    const px = this.x, py = this.y;
    const d = Math.hypot(p.x - this.x, p.y - this.y);

    // Diszpécser: a kind-specifikus viselkedés a behaviors/ regiszterből (vagy a
    // chaser default). A közös utó-fizika (alább) minden fajtára lefut.
    dispatch(this, dt, world, a, d);

    // szoba falain belül tartás
    const rc = world.room;
    this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
    this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);

    this.moving = (this.x - px) ** 2 + (this.y - py) ** 2 > 0.01;

    // a lebegő típusok átúsznak a kövek felett, a többi ütközik velük
    if (!this.floats) world.resolveCircle(this);

    // játékos ütközés (a lézervető lőtt sugara külön sebez; a Dermesztő nem sebez)
    if (!this.noContact && this.targetable) {
      const rr = this.r + p.r;
      if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
        const couldHit = p.invuln <= 0; // tényleg sebződött-e (nem volt sérthetetlen)
        world.damagePlayer(this.dmg * HP.half);
        p.knockback(this.x, this.y, 200);
        // Wave 6: a vámpír / pióca a sikeres ütésből életet szív vissza
        if (this.lifesteal && couldHit && this.dmg > 0) {
          this.hp = Math.min(this.maxHp, this.hp + 400);
          world.particles.spawn(this.x, this.y - this.r * 0.5, '#ff4a6a', 6, 90, 0.5);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawEnemy(ctx, {
      kind: this.kind,
      x: this.x,
      y: this.y,
      r: this.r,
      col: this.col,
      col2: this.col2,
      flash: this.flash > 0,
      bob: this.bob,
      wob: this.wob,
      face: this.face,
      moving: this.moving,
      aiming: this.shoots && this.shootCd < 0.5,
      windup: this.charges && this.chargeState === 'wind',
      dashing: this.charges && this.chargeState === 'dash',
      breathing: this.breathing,
      active: this.active,
      laserState: this.laserState,
      laserAng: this.laserAng,
      laserLen: this.laserLen,
      buried: this.buried,
      hidden: this.hideT > 0,
      // Ugró: a dash alatti ív-magasság (0..1) — a renderelő ennyivel emeli a testet.
      lift: this.kind === 'leaper' && this.chargeState === 'dash'
        ? Math.sin((1 - Math.max(0, this.chargeT) / 0.4) * Math.PI)
        : 0,
      // Wave 6: nyers roham-fázis, kő-állapot, és HP-arány (a hidra fejszámához)
      charge: this.chargeState,
      petrified: this.petrified,
      hpFrac: this.maxHp > 0 ? this.hp / this.maxHp : 1,
    });

    // HP-csík
    if (this.hp < this.maxHp) {
      const w = this.r * 2;
      const x = this.x - this.r;
      const y = this.y - this.r - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#8fe08f';
      ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), 3);
    }
  }
}
