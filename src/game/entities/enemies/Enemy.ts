import type { World } from '../../World';
import { TAU, clamp, rand, dist2 } from '../../../engine/math';
import { HP } from '../../config';
import { ENEMY_STATS, CHAMPION_COLORS, type EnemyKind, type ChampionTrait } from './enemyTypes';
import { drawEnemy } from './EnemyRenderer';
import { NO_SCALE, type EnemyScale } from '../../balance/difficulty';

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
  private buried = false; // Gilista: föld alatt (nem célozható, nem sebez érintésre)
  private hideT = 0; // Villanó: rövid eltűnés (nem célozható)
  private blockT = 0; // Blokkoló: épp blokkol (a lövéseket elnyeli)
  private baseSpeed: number;
  private wob = rand(0, TAU);
  private bob = rand(0, TAU);
  private face = 0;
  private moving = false;
  private shootCd = rand(1, 2.5);
  private actCd = rand(0.6, 1.8); // általános „cselekvés" ütem (tócsa/akna/köd lerakás stb.)
  private bombToss = false; // aknász: váltakozva dob (true) / lerak (false)
  private chargeState: ChargeState = 'idle';
  private chargeT = rand(1, 2);
  private cvx = 0;
  private cvy = 0;
  private roachT = rand(0.2, 0.6); // csótány: meddig tart a jelenlegi cikázás-irány
  private roachDir = rand(0, TAU);
  private scatterT = 0; // pók-fióka: kezdeti össze-vissza szaladgálás hátralévő ideje

  // Lézervető állapota
  private laserState: LaserState = 'idle';
  private laserT = rand(1.5, 3);
  private laserAng = 0;
  private laserLen = 0;

  // Wave 6 állapotok (mitológiai szörnyek)
  private reviveLeft = 0; // Csontváz: hányszor támadhat még fel
  private petrified = false; // Vízköpő: kő-fázis (sebezhetetlen, mozdulatlan)

  // Pillanatnyi vizuális jelzők a renderelőnek
  private breathing = false;
  private active = false;

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

    switch (this.kind) {
      case 'charger': this.updateCharger(dt, a); break;
      case 'shooter': this.updateShooter(dt, world, a, d); break;
      case 'rotling': this.updateRotling(dt, world, a, d); break;
      case 'spitter': this.updateSpitter(dt, world, a, d); break;
      case 'chiller': this.updateChiller(dt, world, a, d); break;
      case 'lancer': this.updateLancer(dt, world, a, d); break;
      case 'pyro': this.updatePyro(dt, world, a, d); break;
      case 'bombardier': this.updateBombardier(dt, world, a, d); break;
      case 'mistweaver': this.updateMistweaver(dt, world, a); break;
      case 'roach': this.updateRoach(dt, a); break;
      case 'spiderling': this.updateSpiderling(dt, a); break;
      case 'tick': this.updateTick(world); break;
      case 'sniper': this.updateSniper(dt, world, a, d); break;
      case 'mortar': this.updateMortar(dt, world, a, d); break;
      case 'summoner': this.updateSummoner(dt, world, a, d); break;
      case 'striker': this.updateStriker(dt, a); break;
      case 'worm': this.updateWorm(dt, world, a); break;
      case 'shotgunner': this.updateShotgunner(dt, world, a, d); break;
      case 'gunner': this.updateGunner(dt, world, a, d); break;
      case 'blinker': this.updateBlinker(dt, world, a); break;
      case 'confuser': this.updateConfuser(dt, world, a, d); break;
      case 'blocker': this.updateBlocker(dt, world, a); break;
      case 'leaper': this.updateLeaper(dt, a, d); break;
      case 'flanker': this.updateFlanker(dt, a, d); break;
      case 'healer': this.updateHealer(dt, world, a, d); break;
      case 'enrager': this.updateEnrager(dt, world, a); break;
      case 'kamikaze': this.updateKamikaze(dt, world, a, d); break;
      case 'slammer': this.updateSlammer(dt, world, a, d); break;
      case 'turret': this.updateTurret(dt, world); break;
      case 'gasbag': this.updateGasbag(dt, world, a, d); break; // gáz-lövés (lassít) + halálkor méregfelhő
      case 'puller': this.updatePuller(dt, world, a, d); break;
      case 'bombthrower': this.updateBombthrower(dt, world, a, d); break;
      // --- Wave 6: mitológiai szörnyek ---
      case 'minotaur': this.updateMinotaur(dt, world, a, d); break;
      case 'mummy': this.updateMummy(dt, world, a, d); break;
      case 'scarab': this.updateScarab(dt, world, a); break;
      case 'vampire': this.updateVampire(dt, world, a, d); break;
      case 'bat': this.updateBat(dt, world, a); break;
      case 'leech': this.updateLeech(dt, world, a, d); break;
      case 'serpent': this.updateSerpent(dt, world, a, d); break;
      case 'medusa': this.updateMedusa(dt, world, a, d); break;
      case 'skeleton': this.updateSkeleton(dt, world, a, d); break;
      case 'wraith': this.updateWraith(dt, world, a, d); break;
      case 'gargoyle': this.updateGargoyle(dt, world, a, d); break;
      case 'harpy': this.updateHarpy(dt, world, a, d); break;
      case 'cyclops': this.updateCyclops(dt, world, a, d); break;
      case 'golem': this.updateGolem(dt, world, a, d); break;
      case 'scorpion': this.updateScorpion(dt, world, a, d); break;
      case 'wisp': this.updateWisp(dt, world, a); break;
      case 'banshee': this.updateBanshee(dt, world, a, d); break;
      case 'imp': this.updateImp(dt, world, a); break;
      case 'hydra': this.updateHydra(dt, world, a, d); break;
      case 'werewolf': this.updateWerewolf(dt, world, a, d); break;
      default: this.updateChaser(dt, a); break; // fly, walker, spider

    }

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

  /** fly / walker: egyenes üldözés (a légy enyhén kacskaringózik). */
  private updateChaser(dt: number, a: number): void {
    const wobble = this.kind === 'fly' ? Math.sin(this.wob) * 0.5 : 0;
    this.x += Math.cos(a + wobble) * this.speed * dt;
    this.y += Math.sin(a + wobble) * this.speed * dt;
  }

  /**
   * Gázzsák: lassan kúszik, és időnként GÁZ-LÖVEDÉKET lő. Ha a gáz eltalál, a
   * SZOBA végéig -50% sebesség (lásd World: b.slow → player.applySlow). Halálkor
   * a World tartós méregfelhőt is hagy (killEnemy).
   */
  private updateGasbag(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.actCd -= dt;
    if (d < 380 && this.actCd <= 0) {
      this.actCd = rand(2.2, 3.4);
      this.active = true;
      const sp = 300; // x2 sebesség
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, life: 2.6, style: 'gas', slow: true });
      world.audio.enemyShoot();
    }
  }

  private updateShooter(dt: number, world: World, a: number, d: number): void {
    const want = d < 220 ? -1 : d > 300 ? 1 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = rand(1.4, 2.4);
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, life: 4, style: 'energy' });
      world.audio.enemyShoot();
    }
  }

  private updateCharger(dt: number, a: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'idle') {
      if (this.chargeT <= 0) { this.chargeState = 'wind'; this.chargeT = 0.5; }
      this.x += Math.cos(a) * this.speed * 0.4 * dt;
      this.y += Math.sin(a) * this.speed * 0.4 * dt;
    } else if (this.chargeState === 'wind') {
      if (this.chargeT <= 0) {
        this.chargeState = 'dash';
        this.chargeT = 0.45;
        this.cvx = Math.cos(a) * 360;
        this.cvy = Math.sin(a) * 360;
      }
    } else {
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.chargeT <= 0) { this.chargeState = 'idle'; this.chargeT = rand(1.2, 2.2); }
    }
  }

  /**
   * Mételyező: lassan kúszik a játékos felé, összefüggő mérgező tócsanyomot
   * hagy, és ha közel van a játékos, mérget köp rá (becsapódáskor tócsát képez).
   */
  private updateRotling(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;

    // folytonos nyom: sűrűn, egymást átfedve csöpög; hosszú életű tócsák
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = 0.22;
      world.addHazard('poison', this.x, this.y + this.r * 0.4, this.r * 1.7, rand(9, 13));
      if (Math.random() < 0.35) world.particles.spawn(this.x, this.y + this.r * 0.4, '#8fbf4a', 3, 70, 0.5);
      this.active = true;
    }

    // közelről mérget köp a játékos felé — a köpés becsapódáskor tócsát hagy
    if (d < 200) {
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.shootCd = rand(1.1, 1.7);
        this.active = true;
        const sp = 200;
        world.ebullets.push({
          x: this.x, y: this.y - this.r * 0.2,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: 7, life: Math.min(1.0, d / sp + 0.12), poison: true,
        });
        world.particles.spawn(this.x, this.y - this.r * 0.2, '#bfff6a', 6, 150, 0.4);
        world.audio.enemyShoot();
      }
    } else if (this.shootCd < 0.4) {
      this.shootCd = 0.4; // ne köpjön azonnal, amint újra közel ér
    }
  }

  /** Köpködő: gyorsan üldöz, és közelről gyors savsorozatot lő. */
  private updateSpitter(dt: number, world: World, a: number, d: number): void {
    if (d > 230) {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
    } else {
      // megáll és sorozatlövést ad le
      this.shootCd -= dt;
      this.active = true;
      if (this.shootCd <= 0) {
        this.shootCd = 0.28;
        const sp = a + rand(-0.08, 0.08);
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(sp) * 300, vy: Math.sin(sp) * 300, r: 6, life: 3, slime: true });
        world.audio.enemyShoot();
      }
    }
  }

  /** Dermesztő: egészen közel megy (nem sebez), és lefagyasztja a játékos mozgását. */
  private updateChiller(dt: number, world: World, a: number, d: number): void {
    const want = d < 34 ? 0 : 1; // odamegy egészen közel, majd ott lebeg
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    if (d < 160) { // a fagyasztó hatósugár változatlan
      this.active = true;
      world.player.applySlow(0.42, 0.2);
      if (Math.random() < 0.3) {
        world.particles.spawn(world.player.x + rand(-14, 14), world.player.y + rand(-14, 14), '#cdeefa', 1, 40, 0.6);
      }
    }
  }

  /** Lézervető: megcéloz (telegrafál), majd átsöprő energiasugarat lő. */
  private updateLancer(dt: number, world: World, a: number, d: number): void {
    const rc = world.room;
    this.laserT -= dt;
    if (this.laserState === 'idle') {
      // távolságtartás, lassú közelítés
      const want = d < 240 ? -0.6 : d > 360 ? 0.8 : 0;
      this.x += Math.cos(a) * this.speed * want * dt;
      this.y += Math.sin(a) * this.speed * want * dt;
      if (this.laserT <= 0) { this.laserState = 'aim'; this.laserT = 0.85; this.laserAng = a; }
    } else if (this.laserState === 'aim') {
      // célzás közben még finoman követ; a telegrafáló vonalhoz kell a hossz
      this.laserAng += clamp(a - this.laserAng, -1.2 * dt, 1.2 * dt);
      this.laserLen = world.rayObstacleDistance(this.x, this.y, this.laserAng, this.rayToWall(this.laserAng, rc));
      if (this.laserT <= 0) { this.laserState = 'fire'; this.laserT = 0.45; world.audio.enemyShoot(); world.addShake(4); }
    } else {
      // a sugár az első kőig (vagy a falig) ér; sebzi a vonalban álló játékost
      this.laserLen = world.rayObstacleDistance(this.x, this.y, this.laserAng, this.rayToWall(this.laserAng, rc));
      this.damageAlongLaser(world);
      if (this.laserT <= 0) { this.laserState = 'idle'; this.laserT = rand(2, 3.4); }
    }
  }

  /** A sugár hossza a szoba faláig az adott szögben. */
  private rayToWall(ang: number, rc: { x: number; y: number; w: number; h: number }): number {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let len = Math.hypot(rc.w, rc.h);
    if (dx > 1e-4) len = Math.min(len, (rc.x + rc.w - this.x) / dx);
    if (dx < -1e-4) len = Math.min(len, (rc.x - this.x) / dx);
    if (dy > 1e-4) len = Math.min(len, (rc.y + rc.h - this.y) / dy);
    if (dy < -1e-4) len = Math.min(len, (rc.y - this.y) / dy);
    return Math.max(0, len);
  }

  private damageAlongLaser(world: World): void {
    const p = world.player;
    if (!p.alive) return;
    const dx = Math.cos(this.laserAng), dy = Math.sin(this.laserAng);
    const rx = p.x - this.x, ry = p.y - this.y;
    const proj = rx * dx + ry * dy; // vetület a sugár mentén
    if (proj < 0 || proj > this.laserLen) return;
    const perp = Math.abs(rx * -dy + ry * dx); // merőleges távolság a sugártól
    if (perp < p.r + 7) {
      world.damagePlayer(this.dmg * HP.half, 'zap');
      world.particles.spawn(p.x, p.y, '#ff7be0', 4, 120, 0.3);
    }
  }

  /** Tűzokádó: közel rohan, és lángcsóvát okád — okádás közben is nyomul, hogy a láng elérjen. */
  private updatePyro(dt: number, world: World, a: number, d: number): void {
    if (d > 150) {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
    } else {
      this.breathing = true;
      // nyomul, hogy a láng ráérjen, de ~20px hézagot tart (nem mászik a karakterre)
      const standoff = world.player.r + this.r + 20;
      if (d > standoff) {
        this.x += Math.cos(a) * this.speed * 0.45 * dt;
        this.y += Math.sin(a) * this.speed * 0.45 * dt;
      }
      this.actCd -= dt;
      if (this.actCd <= 0) {
        this.actCd = 0.06;
        const spread = a + rand(-0.38, 0.38);
        // a csóva a játékos távjáig (és kicsit túl) terül, így biztosan eléri
        const reach = rand(28, Math.min(d + 34, 160));
        const fx = this.x + Math.cos(spread) * reach;
        const fy = this.y + Math.sin(spread) * reach;
        world.addHazard('fire', fx, fy, 22, rand(0.7, 1.3));
        world.particles.spawn(fx, fy, Math.random() < 0.5 ? '#ffb13a' : '#ff5a1e', 2, 110, 0.4);
      }
    }
  }

  /**
   * Aknász: távolságot tart, és felváltva ketyegő aknát rak a lába elé, illetve
   * a játékos felé dob egyet (a robbanás egyik bombájától sem sérül).
   */
  private updateBombardier(dt: number, world: World, a: number, d: number): void {
    const want = d < 220 ? -1 : d > 320 ? 0.6 : 0.2;
    // oldalazó kitérés, hogy ne álljon egy helyben
    this.x += (Math.cos(a) * want + Math.cos(a + Math.PI / 2) * Math.sin(this.wob) * 0.5) * this.speed * dt;
    this.y += (Math.sin(a) * want + Math.sin(a + Math.PI / 2) * Math.sin(this.wob) * 0.5) * this.speed * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(1.8, 2.6);
      this.active = true;
      if (this.bombToss) {
        // a játékos felé dobja — nagyjából oda ér földet (kis szórással), ott robban
        const reach = Math.min(d, 280);
        const tx = this.x + Math.cos(a) * reach + rand(-28, 28);
        const ty = this.y + Math.sin(a) * reach + rand(-28, 28);
        world.addHazard('mine', tx, ty, 72, 1.7);
        for (let k = 1; k <= 6; k++) { // röpke dobás-csík a célig
          const f = k / 6;
          world.particles.spawn(this.x + (tx - this.x) * f, this.y + (ty - this.y) * f, '#c8b48a', 1, 60, 0.25);
        }
      } else {
        // maga elé rakja le
        world.addHazard('mine', this.x, this.y + this.r * 0.3, 72, 1.7);
      }
      world.audio.bombDrop();
      this.bombToss = !this.bombToss;
    }
  }

  /** Ködszövő: kísértetként sodródik, és 2–10 mp-ig élő ködfelhőket hagy. */
  private updateMistweaver(dt: number, world: World, a: number): void {
    // lassú, hullámzó sodródás a játékos felé
    const drift = a + Math.sin(this.wob * 0.7) * 0.9;
    this.x += Math.cos(drift) * this.speed * dt;
    this.y += Math.sin(drift) * this.speed * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(1.0, 1.5);
      this.active = true;
      world.addHazard('fog', this.x, this.y, this.r * 11, rand(4, 20));
    }
  }

  /**
   * Csótány: a harapós példány átlagos tempóban a játékos felé tart és sebez;
   * a többi (ártalmatlan) gyorsan, idegesen cikázik és kissé szétszéled.
   */
  private updateRoach(dt: number, a: number): void {
    if (this.biter) {
      this.active = true; // a renderelő ettől tesz rá vészjósló pírt
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      this.face = a;
    } else {
      this.roachT -= dt;
      if (this.roachT <= 0) { this.roachT = rand(0.3, 0.8); this.roachDir = rand(0, TAU); }
      const flee = a + Math.PI; // enyhén a játékostól elfelé szóródik
      const wig = this.roachDir + Math.sin(this.wob * 5) * 0.6;
      const mx = Math.cos(wig) * 0.75 + Math.cos(flee) * 0.25;
      const my = Math.sin(wig) * 0.75 + Math.sin(flee) * 0.25;
      this.x += mx * this.speed * dt;
      this.y += my * this.speed * dt;
      this.face = Math.atan2(my, mx);
    }
  }

  /** Kullancs: egy helyben ül; ha a játékos elég közel ér, felmászik rá (a World leveszi). */
  private updateTick(world: World): void {
    if (this.tickAttached) return;
    const p = world.player;
    const rr = this.r + p.r + 10;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      this.tickAttached = true;
    }
  }

  /**
   * Pók-fióka: kikelés után előbb egy ideig össze-vissza szaladgál (nem a játékos
   * felé), majd nagyon gyorsan a játékosra ront. Kettő közülük sebez.
   */
  private updateSpiderling(dt: number, a: number): void {
    if (this.scatterT > 0) {
      // kezdeti pánik: véletlen irányokba rohangál, gyakran irányt vált
      this.scatterT -= dt;
      this.roachT -= dt;
      if (this.roachT <= 0) { this.roachT = rand(0.18, 0.45); this.roachDir = rand(0, TAU); }
      const dir = this.roachDir + Math.sin(this.wob * 9) * 0.5;
      this.x += Math.cos(dir) * this.speed * dt;
      this.y += Math.sin(dir) * this.speed * dt;
      this.face = dir;
    } else {
      // utána a játékosra rontanak
      if (this.biter) this.active = true; // a renderelő ettől tesz rá vészjósló pírt
      const wig = Math.sin(this.wob * 8) * 0.4;
      this.x += Math.cos(a + wig) * this.speed * dt;
      this.y += Math.sin(a + wig) * this.speed * dt;
      this.face = a + wig;
    }
  }

  /** Mesterlövész: távolságot tart, telegrafál (active), majd gyors, erős lövedéket lő. */
  private updateSniper(dt: number, world: World, a: number, d: number): void {
    const want = d < 300 ? -0.6 : d > 440 ? 0.5 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd < 0.55) this.active = true; // telegraf a lövés előtt
    if (this.shootCd <= 0) {
      this.shootCd = rand(2.2, 3.4);
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 800, vy: Math.sin(a) * 800, r: 9, life: 2.5, style: 'heavy' });
      world.audio.enemyShoot();
    }
  }

  /** Mozsár: hátul áll, és a játékos helyére becsapódó tűz-AoE-t „lő". */
  private updateMortar(dt: number, world: World, a: number, d: number): void {
    const want = d < 260 ? -0.5 : d > 460 ? 0.4 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(2.2, 3.2);
      this.active = true;
      const p = world.player;
      const tx = p.x + rand(-22, 22), ty = p.y + rand(-22, 22);
      world.particles.spawn(tx, ty, '#ff9a3a', 8, 70, 0.6); // becsapódás-jelző
      // telegraf (0.55 mp): a becsapódó tűz előbb csak látszik, így kikerülhető
      const arm = 0.55;
      world.addHazard('fire', tx, ty, 30, arm + rand(1.0, 1.7), arm);
      world.audio.bombDrop();
    }
  }

  /** Megidéző: középtávon lebeg, és időnként egy legyet idéz (rajszám-korláttal). */
  private updateSummoner(dt: number, world: World, a: number, d: number): void {
    const want = d < 240 ? -0.4 : 0.3;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(3.6, 5.2);
      if (world.enemies.length < 36) {
        this.active = true;
        world.spawnAdd('fly', this.x + rand(-20, 20), this.y + rand(-20, 20));
        world.particles.spawn(this.x, this.y, '#9fc0ff', 10, 120, 0.5);
      }
    }
  }

  /** Csapó: pihen, majd gyorsan ráront és sebez, és ismétli (dash–stun ritmus). */
  private updateStriker(dt: number, a: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'dash') {
      this.active = true;
      this.x += Math.cos(a) * this.speed * 2.4 * dt;
      this.y += Math.sin(a) * this.speed * 2.4 * dt;
      if (this.chargeT <= 0) { this.chargeState = 'idle'; this.chargeT = rand(0.8, 1.6); }
    } else if (this.chargeT <= 0) {
      this.chargeState = 'dash';
      this.chargeT = 0.6;
    }
  }

  /** Gilista: a föld alatt mozog (sebezhetetlen), majd a játékos mellett bukkan fel. */
  private updateWorm(dt: number, world: World, a: number): void {
    this.actCd -= dt;
    if (this.buried) {
      if (this.actCd <= 0) {
        const rc = world.room, p = world.player;
        this.x = clamp(p.x + rand(-60, 60), rc.x + this.r, rc.x + rc.w - this.r);
        this.y = clamp(p.y + rand(-60, 60), rc.y + this.r, rc.y + rc.h - this.r);
        this.buried = false;
        this.actCd = rand(1.2, 2.0);
        this.active = true;
        world.particles.spawn(this.x, this.y, '#8a5a3a', 12, 140, 0.5);
      }
    } else {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      if (this.actCd <= 0) {
        this.buried = true;
        this.actCd = rand(1.5, 2.6);
        world.particles.spawn(this.x, this.y, '#8a5a3a', 10, 120, 0.5);
      }
    }
  }

  /** Sörétes: közeledik, majd legyezőnyi lövést ad le. */
  private updateShotgunner(dt: number, world: World, a: number, d: number): void {
    const want = d < 240 ? -0.4 : d > 380 ? 0.5 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = rand(1.6, 2.4);
      this.active = true;
      for (let k = -2; k <= 2; k++) {
        const an = a + k * 0.16;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 280, vy: Math.sin(an) * 280, r: 6, life: 2.5, style: 'pellet' });
      }
      world.audio.enemyShoot();
    }
  }

  /** Gyorslövő: gyors sorozatban pötyög a játékosra. */
  private updateGunner(dt: number, world: World, a: number, d: number): void {
    const want = d < 220 ? -0.5 : d > 360 ? 0.5 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = 0.22;
      this.active = true;
      const an = a + rand(-0.08, 0.08);
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 320, vy: Math.sin(an) * 320, r: 5, life: 2.2, style: 'energy' });
      world.audio.enemyShoot();
    }
  }

  /** Villanó: eltűnik, a játékos közelében újra megjelenik, majd lő. */
  private updateBlinker(dt: number, world: World, a: number): void {
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(1.6, 2.6);
      this.hideT = 0.4;
      world.particles.spawn(this.x, this.y, '#b08aff', 12, 160, 0.5);
      const rc = world.room, p = world.player;
      const ang = rand(0, TAU), rad = rand(120, 220);
      this.x = clamp(p.x + Math.cos(ang) * rad, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(p.y + Math.sin(ang) * rad, rc.y + this.r, rc.y + rc.h - this.r);
    }
    if (this.hideT <= 0) {
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.shootCd = rand(0.8, 1.4);
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 6, life: 2.5, style: 'arcane' });
        world.audio.enemyShoot();
      }
    }
  }

  /** Zavaró: lassan közelít, és a közelében MINDEN irányítást megfordít. */
  private updateConfuser(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * 0.6 * dt;
    this.y += Math.sin(a) * this.speed * 0.6 * dt;
    if (d < 170) {
      this.active = true;
      world.player.applyConfuse(1.5);
      if (Math.random() < 0.3) world.particles.spawn(world.player.x + rand(-16, 16), world.player.y + rand(-16, 16), '#d86aff', 1, 40, 0.6);
    }
  }

  /** Blokkoló: közeledik, és időnként 2 mp-ig blokkol (a lövéseket elnyeli, közben áll). */
  private updateBlocker(dt: number, world: World, a: number): void {
    if (this.blockT > 0) {
      this.blockT -= dt;
      this.active = true;
    } else {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      this.actCd -= dt;
      if (this.actCd <= 0) {
        this.actCd = rand(3, 4.5);
        this.blockT = 2;
        world.particles.spawn(this.x, this.y, '#cfe0ff', 8, 100, 0.4);
      }
    }
  }

  /** Ugró: telegrafál, majd ívben a játékos (akkori) helyére ugrik. */
  private updateLeaper(dt: number, a: number, d: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'idle') {
      if (this.chargeT <= 0) { this.chargeState = 'wind'; this.chargeT = 0.45; }
    } else if (this.chargeState === 'wind') {
      this.active = true;
      if (this.chargeT <= 0) {
        this.chargeState = 'dash';
        this.chargeT = 0.4;
        const reach = Math.min(d, 320);
        this.cvx = (Math.cos(a) * reach) / 0.4;
        this.cvy = (Math.sin(a) * reach) / 0.4;
      }
    } else {
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.chargeT <= 0) { this.chargeState = 'idle'; this.chargeT = rand(1, 2); }
    }
  }

  /** Bekerítő: távol oldalról ível be, közel egyenesen ráront. */
  private updateFlanker(dt: number, a: number, d: number): void {
    const dir = a + (d > 160 ? 1.0 : 0);
    this.x += Math.cos(dir) * this.speed * dt;
    this.y += Math.sin(dir) * this.speed * dt;
  }

  /** Gyógyító: távolságot tart, és periodikusan gyógyítja a sérült közeli ellenfeleket. */
  private updateHealer(dt: number, world: World, a: number, d: number): void {
    const want = d < 240 ? 1 : -0.4; // távol marad a játékostól
    this.x -= Math.cos(a) * this.speed * want * dt;
    this.y -= Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = 1.2;
      let healed = false;
      for (const e of world.enemies) {
        if (e === this || !(e instanceof Enemy)) continue;
        if (e.hp < e.maxHp && dist2(this.x, this.y, e.x, e.y) < 150 * 150) { e.hp = Math.min(e.maxHp, e.hp + 400); healed = true; }
      }
      if (healed) { this.active = true; world.particles.spawn(this.x, this.y, '#5cff8f', 8, 120, 0.5); }
    }
  }

  /** Feldühítő: a közeli ellenfeleket felgyorsítja. */
  private updateEnrager(dt: number, world: World, a: number): void {
    this.x += Math.cos(a) * this.speed * 0.4 * dt;
    this.y += Math.sin(a) * this.speed * 0.4 * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = 1.5;
      this.active = true;
      for (const e of world.enemies) {
        if (e === this || !(e instanceof Enemy)) continue;
        if (dist2(this.x, this.y, e.x, e.y) < 160 * 160) e.applyHaste(2);
      }
      world.particles.spawn(this.x, this.y, '#ff5a5a', 8, 120, 0.5);
    }
  }

  /** Kamikaze: ráront, és közel érve felrobban (a robbanás sebzi a játékost). */
  private updateKamikaze(dt: number, world: World, a: number, d: number): void {
    this.active = true;
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    if (d < this.r + world.player.r + 6) {
      world.damagePlayer(this.dmg * HP.half);
      world.addShake(8);
      world.particles.spawn(this.x, this.y, '#ff8a3a', 22, 280, 0.6);
      world.killEnemy(this);
    }
  }

  /** Földcsapó: közelít, és időnként a földre csap → körkörös golyó-gyűrű. */
  private updateSlammer(dt: number, world: World, a: number, d: number): void {
    const want = d < 200 ? -0.3 : 0.5;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(2.4, 3.4);
      this.active = true;
      const n = 12;
      for (let k = 0; k < n; k++) {
        const an = (k / n) * TAU;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, r: 6, life: 2.5, style: 'stone' });
      }
      world.addShake(5);
      world.audio.enemyShoot();
    }
  }

  /** Torony: nem mozog, lassan forgó golyó-spirált lő. */
  private updateTurret(dt: number, world: World): void {
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = 0.16;
      this.active = true;
      const an = this.wob * 2;
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 180, vy: Math.sin(an) * 180, r: 6, life: 3, style: 'arcane' });
      world.audio.enemyShoot();
    }
  }

  /** Húzó: lebeg, és a hatósugarában maga felé húzza a játékost. */
  private updatePuller(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * 0.3 * dt;
    this.y += Math.sin(a) * this.speed * 0.3 * dt;
    if (d < 360 && d > 1) {
      this.active = true;
      const p = world.player;
      const nx = (this.x - p.x) / d, ny = (this.y - p.y) / d;
      const strength = 1 - d / 360; // közelség: 0 a peremen → 1 közel
      // (1) erős, közelséggel növekvő sebesség-szívás (escapable: a bemenet legyőzheti)
      const pull = 500 + 600 * strength; // 500..1100
      p.vx += nx * pull * dt;
      p.vy += ny * pull * dt;
      // (2) enyhe közvetlen behúzás → érződik a plafontól függetlenül is, de NEM fojtja
      // meg a szabadulást (ezt vettük lejjebb: a túl erős behúzás miatt nem lehetett elszakadni)
      const drag = (15 + 55 * strength) * dt; // 15..70 px/s
      p.x += nx * drag;
      p.y += ny * drag;
    }
  }

  /** Bombázó: hullámzón átrepül, és időnként a játékos felé ketyegő aknát dob. */
  private updateBombthrower(dt: number, world: World, a: number, d: number): void {
    this.x += (Math.cos(a) * 0.3 + Math.cos(a + Math.PI / 2) * Math.sin(this.wob) * 0.6) * this.speed * dt;
    this.y += (Math.sin(a) * 0.3 + Math.sin(a + Math.PI / 2) * Math.sin(this.wob) * 0.6) * this.speed * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(1.8, 2.8);
      this.active = true;
      const reach = Math.min(d, 260);
      const tx = this.x + Math.cos(a) * reach, ty = this.y + Math.sin(a) * reach;
      world.addHazard('mine', tx, ty, 70, 1.6);
      world.audio.bombDrop();
    }
  }

  /* ----------------------------------------------------------------- *
   *  Wave 6 — mitológiai szörnyek viselkedése
   * ----------------------------------------------------------------- */

  /** Minotaurusz: telegrafál, majd hosszan ráront, és a roham végén földet renget (taszít). */
  private updateMinotaur(dt: number, world: World, a: number, d: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'idle') {
      this.x += Math.cos(a) * this.speed * 0.45 * dt;
      this.y += Math.sin(a) * this.speed * 0.45 * dt;
      if (this.chargeT <= 0 && d < 460) {
        this.chargeState = 'wind'; this.chargeT = 0.7;
        this.cvx = Math.cos(a); this.cvy = Math.sin(a); // a roham iránya rögzül (kitérhetsz)
      }
    } else if (this.chargeState === 'wind') {
      this.active = true; // dühös dobogás
      if (this.chargeT <= 0) { this.chargeState = 'dash'; this.chargeT = 0.7; world.audio.enemyShoot(); }
    } else {
      this.x += this.cvx * 520 * dt;
      this.y += this.cvy * 520 * dt;
      if (this.chargeT <= 0) {
        this.chargeState = 'idle'; this.chargeT = rand(1.4, 2.4);
        world.addShake(9); // becsapódás → földrengés
        if (d < 150) world.player.knockback(this.x, this.y, 380);
        world.particles.spawn(this.x, this.y + this.r * 0.6, '#caa078', 16, 220, 0.5);
      }
    }
  }

  /** Múmia: lassan vánszorog, lassú átok-pólyát lök; halálkor szétesik (lásd World.killEnemy). */
  private updateMummy(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    if (d < 160) { // közeli átok: enyhén lassítja a játékost
      world.player.applySlow(0.7, 0.2);
    }
    this.shootCd -= dt;
    if (d < 320 && this.shootCd <= 0) {
      this.shootCd = rand(2.2, 3.2);
      this.active = true;
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 175, vy: Math.sin(a) * 175, r: 8, life: 3, slime: true });
      world.audio.enemyShoot();
    }
  }

  /** Skarabeusz: gömbbé gömbölyödve, gyorsan, enyhén ívelve a játékosra gurul. */
  private updateScarab(dt: number, world: World, a: number): void {
    // RANDOM szárny-nyitás: NYITVA (blockT>0) felnyílik a szárnyfedő és ELNYELI a
    // lövedékeket (lásd Tear: e.blocking), ZÁRVA sebezhető. Az actCd vezérli, meddig
    // tart az adott fázis → véletlenszerűen blokkol. (blockT itt nyitott-jelzőként él.)
    this.actCd -= dt;
    if (this.actCd <= 0) {
      const opening = this.blockT <= 0; // zárt → nyit; nyitott → zár
      this.blockT = opening ? rand(0.7, 1.7) : 0;
      this.actCd = opening ? this.blockT : rand(1.4, 2.8);
      if (opening) world.particles.spawn(this.x, this.y, '#cfe7ff', 7, 110, 0.4);
    }
    const open = this.blockT > 0;
    this.active = open; // a rajzoló ebből rajzolja a felnyitott szárnyfedőt
    // gurul a játékos felé — nyitott szárnnyal lassabban (nehézkesebb)
    const sp = open ? this.speed * 0.4 : this.speed;
    const wig = Math.sin(this.wob * 6) * 0.3;
    this.x += Math.cos(a + wig) * sp * dt;
    this.y += Math.sin(a + wig) * sp * dt;
    this.face = a + wig;
  }

  /** Vámpír: lassan közelít, majd gyors denevér-csapásokkal ront rá (életszívás a kontaktban). */
  private updateVampire(dt: number, world: World, a: number, d: number): void {
    // VÉR-AURA: a vámpír körüli kör (vele MOZOG). Amíg a játékos a körön belül van,
    // 0.2 másodpercenként -50 sebzés (mélységgel skálázódik, mint minden ellenfél-sebzés).
    // A sugár (r × 13) szinkronban a vampire.ts rajzolójával.
    this.actCd -= dt;
    if (d < this.r * 13 && this.actCd <= 0) {
      this.actCd = 0.2;
      world.damagePlayer(50, 'acid', false, true); // DoT: i-frame nélkül → tényleg 0.2s-ént sebez
      world.particles.spawn(world.player.x, world.player.y, '#d23a5a', 6, 120, 0.3);
    }

    this.chargeT -= dt;
    if (this.chargeState === 'dash') {
      this.active = true;
      this.x += Math.cos(a) * this.speed * 2.1 * dt;
      this.y += Math.sin(a) * this.speed * 2.1 * dt;
      if (this.chargeT <= 0) { this.chargeState = 'idle'; this.chargeT = rand(1.6, 2.6); }
    } else {
      this.x += Math.cos(a) * this.speed * 0.7 * dt;
      this.y += Math.sin(a) * this.speed * 0.7 * dt;
      if (this.chargeT <= 0 && d < 300) {
        this.chargeState = 'dash'; this.chargeT = 0.5;
        world.particles.spawn(this.x, this.y, '#7a2a3a', 8, 130, 0.4);
      }
    }
  }

  /** Óriásdenevér: kaotikusan cikázik a játékos felé, időnként körkörös hangrobbanást lő. */
  private updateBat(dt: number, world: World, a: number): void {
    const wig = Math.sin(this.wob * 4) * 1.1 + Math.sin(this.wob * 7.3) * 0.5;
    this.x += Math.cos(a + wig) * this.speed * dt;
    this.y += Math.sin(a + wig) * this.speed * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(2.4, 3.6);
      this.active = true;
      const n = 8;
      for (let k = 0; k < n; k++) {
        const an = (k / n) * TAU + this.wob;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 150, vy: Math.sin(an) * 150, r: 5, life: 2, style: 'sonic' });
      }
      world.audio.enemyShoot();
    }
  }

  /** Pióca: lassan kúszik; közelről rátapad — lassít, és a kontaktból életet szív. */
  private updateLeech(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    if (d < this.r + world.player.r + 18) {
      this.active = true;
      world.player.applySlow(0.72, 0.15); // tapadás: enyhe lassítás
    }
  }

  /** Kígyó: gyorsan, cikkcakkban csúszik; közelről mérgező harapást lő. */
  private updateSerpent(dt: number, world: World, a: number, d: number): void {
    const wig = Math.sin(this.wob * 5) * 0.7;
    this.x += Math.cos(a + wig) * this.speed * dt;
    this.y += Math.sin(a + wig) * this.speed * dt;
    this.face = a + wig;
    this.shootCd -= dt;
    if (d < 190 && this.shootCd <= 0) {
      this.shootCd = rand(1.2, 2.0);
      this.active = true;
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, r: 6, life: 1.2, poison: true });
      world.audio.enemyShoot();
    }
  }

  /** Medúza: a tekintetével MEGKÖVÍTI (erős, rövid dermesztés) a közeli játékost, és kő-lövedéket lő. */
  private updateMedusa(dt: number, world: World, a: number, d: number): void {
    const want = d < 200 ? -0.3 : d > 360 ? 0.5 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    if (d < 250) { // megkövítő tekintet
      this.active = true;
      world.player.applySlow(0.2, 0.3);
      if (Math.random() < 0.22) {
        world.particles.spawn(world.player.x + rand(-14, 14), world.player.y + rand(-14, 14), '#bfe8cf', 1, 30, 0.6);
      }
    }
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = rand(1.6, 2.4);
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 215, vy: Math.sin(a) * 215, r: 7, life: 3, style: 'stone' });
      world.audio.enemyShoot();
    }
  }

  /** Csontváz: távolságot tartva csontnyilat lő; halálkor egyszer feltámad (lásd tryRevive). */
  private updateSkeleton(dt: number, world: World, a: number, d: number): void {
    const want = d < 200 ? -0.5 : d > 340 ? 0.6 : 0.1;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = rand(1.4, 2.2);
      this.active = true;
      world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 6, life: 2.5, style: 'bone' });
      world.audio.enemyShoot();
    }
  }

  /** Lidérc: átúszik a köveken, és a hideg aurájával lassítja + sebzi a közeli játékost. */
  private updateWraith(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    if (d < 130) {
      this.active = true;
      world.player.applySlow(0.55, 0.2);
      this.actCd -= dt;
      if (this.actCd <= 0) {
        this.actCd = 0.6;
        world.damagePlayer(HP.half, 'zap');
        world.particles.spawn(world.player.x, world.player.y, '#aac6e0', 4, 90, 0.4);
      }
    }
  }

  /** Vízköpő: kőként vár (sebezhetetlen), életre kel és ráront, majd visszadermed. */
  private updateGargoyle(dt: number, world: World, a: number, d: number): void {
    this.chargeT -= dt;
    if (this.petrified) {
      if (this.chargeT <= 0 || d < 175) { // a játékos közeledtére / idő múltán életre kel
        this.petrified = false;
        this.chargeT = rand(3, 4.5);
        this.active = true;
        world.particles.spawn(this.x, this.y, '#9a9a8a', 14, 150, 0.5);
        world.audio.enemyShoot();
      }
    } else {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      if (this.chargeT <= 0) {
        this.petrified = true;
        this.chargeT = rand(2.5, 4);
        world.particles.spawn(this.x, this.y, '#9a9a8a', 10, 120, 0.4);
      }
    }
  }

  /** Hárpia: a játékos körül köröz, majd lecsap és egy erős szél-lökéssel eltaszítja. */
  private updateHarpy(dt: number, world: World, a: number, d: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'dash') {
      this.active = true;
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (d < this.r + world.player.r + 22) { // becsapódás → eltaszítás, majd visszavonul
        world.player.knockback(this.x, this.y, 430);
        world.addShake(4);
        this.chargeState = 'idle'; this.chargeT = rand(1.6, 2.6);
      } else if (this.chargeT <= 0) {
        this.chargeState = 'idle'; this.chargeT = rand(1.6, 2.6);
      }
    } else {
      const orbit = a + (Math.PI / 2) * Math.sin(this.wob * 0.8);
      this.x += Math.cos(orbit) * this.speed * 0.5 * dt;
      this.y += Math.sin(orbit) * this.speed * 0.5 * dt;
      if (this.chargeT <= 0) {
        this.chargeState = 'dash'; this.chargeT = 0.55;
        this.cvx = Math.cos(a) * 470; this.cvy = Math.sin(a) * 470;
      }
    }
  }

  /** Küklopsz: lassú óriás; nagy sziklát vet a játékos helyére (telegrafált becsapódó zóna). */
  private updateCyclops(dt: number, world: World, a: number, d: number): void {
    const want = d < 240 ? -0.3 : d > 440 ? 0.4 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(2.6, 3.8);
      this.active = true;
      const p = world.player;
      const tx = p.x + rand(-30, 30), ty = p.y + rand(-30, 30);
      world.particles.spawn(tx, ty, '#b07a5a', 10, 80, 0.7); // becsapódás-előjelző
      // 0.7 mp telegraf (záródó figyelmeztető gyűrű) → ki lehet lépni, MIELŐTT sebez;
      // a sebző zóna ezután 0.8–1.3 mp-ig áll fenn. A szikla-AoE sugara 84 (nagy óriás-csapás).
      const arm = 0.7;
      world.addHazard('fire', tx, ty, 84, arm + rand(0.8, 1.3), arm);
      world.addShake(6);
      world.audio.bombDrop();
    }
  }

  /** Gólem: nagyon lassú, szívós; a földre csap → terjedő lökéshullám-gyűrű (golyók). */
  private updateGolem(dt: number, world: World, a: number, d: number): void {
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.actCd -= dt;
    if (d < 280 && this.actCd <= 0) {
      this.actCd = rand(3, 4.2);
      this.active = true;
      const n = 14;
      for (let k = 0; k < n; k++) {
        const an = (k / n) * TAU;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 170, vy: Math.sin(an) * 170, r: 7, life: 2.6, style: 'stone' });
      }
      world.addShake(8);
      world.audio.enemyShoot();
    }
  }

  /** Skorpió: gyorsan közelít, és ívben mérget lő a fullánkjából. */
  private updateScorpion(dt: number, world: World, a: number, d: number): void {
    const want = d < 150 ? -0.3 : 0.7;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (d < 300 && this.shootCd <= 0) {
      this.shootCd = rand(1.8, 2.6);
      this.active = true;
      for (let k = -1; k <= 1; k++) {
        const an = a + k * 0.2;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 240, vy: Math.sin(an) * 240, r: 6, life: 1.6, poison: true });
      }
      world.audio.enemyShoot();
    }
  }

  /** Lidércfény: gyorsan cikázik, és sűrűn égő nyomot hagy maga után. */
  private updateWisp(dt: number, world: World, a: number): void {
    const wig = Math.sin(this.wob * 8) * 0.8;
    this.x += Math.cos(a + wig) * this.speed * dt;
    this.y += Math.sin(a + wig) * this.speed * dt;
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = 0.18;
      this.active = true;
      world.addHazard('fire', this.x, this.y, 16, rand(0.5, 1.0));
      if (Math.random() < 0.4) world.particles.spawn(this.x, this.y, '#ffb84a', 2, 60, 0.4);
    }
  }

  /** Banshee: távot tart, és időnként SIKOLLYAL eltaszítja ÉS megzavarja a játékost. */
  private updateBanshee(dt: number, world: World, a: number, d: number): void {
    const want = d < 220 ? -0.4 : d > 360 ? 0.4 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.actCd -= dt;
    if (d < 340 && this.actCd <= 0) {
      this.actCd = rand(2.8, 4);
      this.active = true;
      world.player.applyConfuse(1.6);
      world.player.knockback(this.x, this.y, 300);
      world.addShake(4);
      world.particles.spawn(this.x, this.y, '#cfe0ec', 14, 200, 0.5);
      world.audio.enemyShoot();
    }
  }

  /** Ördögfióka: a játékos közelébe teleportál, és tűzgolyót dob; fürge, kaján. */
  private updateImp(dt: number, world: World, a: number): void {
    this.actCd -= dt;
    if (this.actCd <= 0) {
      this.actCd = rand(3.5, 4.5); // ritkábban teleportál → marad idő meglőni, amíg látható
      this.hideT = 0.35;
      world.particles.spawn(this.x, this.y, '#ff6a3a', 12, 150, 0.5);
      const rc = world.room, p = world.player;
      const ang = rand(0, TAU), rad = rand(140, 240);
      this.x = clamp(p.x + Math.cos(ang) * rad, rc.x + this.r, rc.x + rc.w - this.r);
      this.y = clamp(p.y + Math.sin(ang) * rad, rc.y + this.r, rc.y + rc.h - this.r);
    }
    if (this.hideT <= 0) {
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.shootCd = rand(1.0, 1.6);
        this.active = true;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 7, life: 2.5, style: 'fire' });
        world.audio.enemyShoot();
      }
    }
  }

  /** Hidra: legyezőben lő — minél kevesebb a HP-ja, annál több fejjel (több lövedék). */
  private updateHydra(dt: number, world: World, a: number, d: number): void {
    const want = d < 240 ? -0.3 : d > 400 ? 0.4 : 0;
    this.x += Math.cos(a) * this.speed * want * dt;
    this.y += Math.sin(a) * this.speed * want * dt;
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = rand(1.8, 2.6);
      this.active = true;
      const heads = 3 + Math.round((1 - this.hp / this.maxHp) * 2); // 3 → 5 fej sérülten
      const spread = 0.55;
      for (let k = 0; k < heads; k++) {
        const an = a - spread + (heads > 1 ? (spread * 2 * k) / (heads - 1) : 0);
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 230, vy: Math.sin(an) * 230, r: 6, life: 2.6, poison: true });
      }
      world.audio.enemyShoot();
    }
  }

  /** Vérfarkas: üvöltésre önmagát felgyorsítja, majd a játékosra ugrik. */
  private updateWerewolf(dt: number, world: World, a: number, d: number): void {
    this.chargeT -= dt;
    if (this.chargeState === 'dash') {
      this.active = true;
      this.x += this.cvx * dt;
      this.y += this.cvy * dt;
      if (this.chargeT <= 0) { this.chargeState = 'idle'; this.chargeT = rand(1.2, 2); }
    } else if (this.chargeState === 'wind') {
      this.active = true; // üvöltő feszülés
      if (this.chargeT <= 0) {
        this.chargeState = 'dash'; this.chargeT = 0.4;
        const reach = Math.min(d, 300);
        this.cvx = (Math.cos(a) * reach) / 0.4;
        this.cvy = (Math.sin(a) * reach) / 0.4;
        this.applyHaste(2); // az üvöltés felgyorsítja
        world.particles.spawn(this.x, this.y, '#8a7a6a', 10, 140, 0.5);
      }
    } else {
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
      if (this.chargeT <= 0 && d < 360) { this.chargeState = 'wind'; this.chargeT = 0.5; }
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
