import type { Engine } from '../engine/Engine';
import type { AudioManager } from '../engine/Audio';
import type { Input } from '../engine/Input';
import type { IEnemy } from './entities/enemies/Enemy';
import type { Rect, EnemyBullet, Dir, HazardKind, Obstacle } from './types';
import { OBSTACLES } from './types';
import { drawRock, drawTree, drawCrate, drawLuckRock, drawTerrainObstacle } from './level/obstacleRender';
import { drawFloorTiles, drawPuddles, drawSplats, drawDecorations, drawLuckFloor } from './level/floorRender';

import { Player } from './entities/Player';
import { Tear } from './entities/Tear';
import { Enemy } from './entities/enemies/Enemy';
import { drawEnemy } from './entities/enemies/EnemyRenderer';
import { drawBullet } from './entities/BulletRenderer';
import { BOSS_REGISTRY, isBossTarget, type BossTarget } from './entities/enemies/bossRegistry';
import { CHAMPION_TRAITS, ENEMY_STATS, type EnemyKind, type ChampionTrait } from './entities/enemies/enemyTypes';
import { Pickup, type PickupType } from './entities/Pickup';
import { Shop, offerView, type ShopStall } from './entities/Shop';
import { Pedestal } from './entities/Pedestal';
import { rollItem, type Item } from './content/items';
import { rollGamble, GAMBLE_COST, rerollPrice } from './content/shopPricing';
import { Dungeon } from './level/Dungeon';
import { Room } from './level/Room';
import { ParticleSystem } from './Particles';
import { CollisionSystem } from './systems/CollisionSystem';
import { FXManager } from './systems/FXManager';
import { HazardSystem } from './systems/HazardSystem';
import { EntityManager } from './systems/EntityManager';
import { LightingSystem } from './systems/LightingSystem';
import { computeVisibility, type Seg } from './systems/visibility';
import { buildOccluder, type OccluderShape } from './systems/occluder';
import { loadShadowMode, saveShadowMode, saveShake, type ShadowMode } from './settings';
import { ROOM, GRID, PLAYER_BASE, HP, LAB_TIMER } from './config';
import { TAU, rand, clamp, dist2, pick } from '../engine/math';
import { parseTemplate, type BossKind } from './level/roomTemplates';
import {
  drawGate as drawGatePortal,
  drawDungeonGate as drawDungeonPortal,
} from './level/gateRender';
import { drawHubPortal, drawHubGlyph, drawHubTitle } from './level/hubRender';
import { drawLabWalls, drawLabExit, drawLabFrame, drawLabOverlay } from './level/labyrinthRender';
import { drawGlow, withGlow } from './level/lightRender';
import { resolveLevel, CHAPTERS, chapterFloorRange } from './level/levels';
import { enemyScale, scaleIncomingDamage, enemyDamageMul, NO_SCALE, type EnemyScale } from './balance/difficulty';
import { TUNING } from './balance/tuning';
import { SKILL_BY_ID } from './content/skills';
import { Bomb, type BombType } from './entities/Bomb';
import { dropConfig, roomDropChance, netSum } from './content/dropConfig';
import type { Theme } from './level/theme';
import type { Labyrinth } from './level/labyrinth';
import { RunStats, recordFloorClear, recordLabClear } from './stats';

/** Egy felugró ajánlat-ablak tartalma (bolti vásárlás megerősítése / értesítés). */
export interface OfferView {
  badge: string;
  title: string;
  desc: string;
  sub: string;
  color: string;
  acceptLabel: string;
  /** Igaz: csak értesítés (egy „RENDBEN" gomb, nincs „Mégsem"). */
  hideDecline?: boolean;
}

export interface WorldCallbacks {
  onGameOver(): void;
  /** A játékos vásárolni készül a boltban: a Game felugró ablakban kéri a döntést. */
  onOffer(offer: OfferView): void;
}

/** A játékost ért sebzés hang-kategóriája (forrás szerint). */
export type HurtSound = 'hurt' | 'acid' | 'burn' | 'zap';

/** A hub-terem (mód-választó) négy portálja. */
export type HubChoice = 'story' | 'dungeon' | 'labyrinth' | 'boss';
/** Egy hub-portál: a célmód, a rács-pozíciója, és hogy zárt-e (még nincs megírva). */
interface HubPortal { id: HubChoice; col: number; row: number; locked: boolean; }

/** Admin · Beállítások — különálló csalás-kapcsolók (a régi „God Mode" helyett). */
export interface Cheats {
  /** Örök élet: a játékos nem kap sebzést. */
  invincible: boolean;
  /** Max arany: az érme folyamatosan a maximumon tartva. */
  maxGold: boolean;
  /** Kivégzés: a Szóköz lenyomására az összes ellenfél elpusztul a szobában. */
  execute: boolean;
}

const CHEAT_MAX_GOLD = 999;
const CHEATS_KEY = 'sentex_cheats';

/** A mentett csalás-kapcsolók visszaolvasása (megőrződnek újratöltés után). */
function readCheats(): Cheats {
  const base: Cheats = { invincible: false, maxGold: false, execute: false };
  try {
    const raw = localStorage.getItem(CHEATS_KEY);
    if (raw) { const d = JSON.parse(raw) as Partial<Cheats>; return { ...base, ...d }; }
    // visszafelé kompatibilitás: a régi „God Mode" a halhatatlanság + kivégzés volt
    if (localStorage.getItem('sentex_godmode') === '1') return { invincible: true, maxGold: false, execute: true };
  } catch { /* localStorage nem elérhető */ }
  return base;
}

/**
 * A teljes játéktér (egy futás): pálya, játékos, entitások, ütközés és
 * kirajzolás. Az entitások a `World` publikus felületén keresztül érik el
 * a megosztott szolgáltatásokat (hang, részecskék, sebzés, szobaváltás).
 */
export class World {
  readonly player = new Player();
  readonly particles = new ParticleSystem();
  /** Ütközés/geometria-rendszer — a World facade-metódusai (és a HazardSystem) ide delegálnak. */
  readonly collision = new CollisionSystem(this);
  /** A bolti stand, amelynek vásárlás-ajánlata épp döntésre vár (felugró ablak). */
  private pendingStall: ShopStall | null = null;
  /** Az ingyenes tárgy-pedesztál, amelynek skill-ajánlata épp döntésre vár. */
  private pendingPedestal: Pedestal | null = null;
  /** A sorsoláson nyert skill-tárgy, amelynek felvétele épp döntésre vár. */
  private pendingGambleItem: Item | null = null;
  /** Igaz, ha épp egy puszta értesítő ablak van nyitva (pl. „Nem nyertél"). */
  private pendingNotice = false;
  /** Röpke entitások (könnyek / ellenfél-lövedékek / bombák) birtokosa; a World gettereken át delegál. */
  private readonly entities = new EntityManager();
  /** A játékos könnyei — az EntityManager listája (a hívási helyek változatlanok). */
  get tears(): Tear[] { return this.entities.tears; }
  /** Ellenfél-lövedékek — az EntityManager listája. */
  get ebullets(): EnemyBullet[] { return this.entities.ebullets; }
  /** Talaj-veszélyek rendszere (méreg/tűz/köd/akna) — a World addHazard-ja ide delegál. */
  private readonly hazards = new HazardSystem(this);
  /** Effekt-réteg (lebegő szövegek + képernyőrázás) — a World facade-metódusai ide delegálnak. */
  private readonly fx = new FXManager();
  /** 2D fény-térkép (ambient sötétség + dinamikus lámpák, multiply kompozit). */
  private readonly lighting = new LightingSystem();
  /** Vetett árnyék minősége (grafikai beállítás): off | hard | soft. */
  shadowMode: ShadowMode = loadShadowMode();
  /** A szoba-doboz négy éle (a sugarak a falnál állnak meg) — szobánként gyorsítótárazva. */
  private readonly roomBox: Seg[] = [];
  /** A tömör tárgyak árnyékvető sziluettjei (közép+sugár+élek) — szobánként gyorsítótárazva. */
  private readonly occShapes: OccluderShape[] = [];
  /** Per-frame összeállított aktív takaró-lista (szoba-doboz + a fáklya közelében
   *  lévő tárgyak élei) — újrahasznált tömb, csak referenciákat másol (nincs GC). */
  private readonly activeOccluders: Seg[] = [];
  private occluderKey = '';
  /** A fáklya látható-poligonja (újrahasznált lapos tömb, nincs frame-allokáció). */
  private readonly torchPoly: number[] = [];
  /**
   * A torchPoly utolsó újraszámolásának állapota: a fénypont (player) pozíciója és
   * az akkori occluder-kulcs. A szögseprés (computeVisibility) a fény-rendszer
   * legdrágább lépése, ezért csak akkor futtatjuk újra, ha a player érdemben
   * elmozdult, vagy a szoba/akadályok változtak; egyébként az előző poligon marad.
   */
  private sweepX = NaN;
  private sweepY = NaN;
  private sweepKey = '';

  dungeon!: Dungeon;
  floor = 1;
  score = 0;
  /** Élő futás-időzítők + számlálók (HUD-óra + a futás végi statisztika forrása). */
  readonly runStats = new RunStats();
  /** Az aktív labirintus fejezet-id-ja (a labirintus-rekord kulcsa). */
  private labChapterId = '';
  /** Igaz, ha admin teszt-aréna fut (ENEMY „Kipróbálás") → játékbeli sebzés-readout. */
  private sandbox = false;
  get isSandbox(): boolean { return this.sandbox; }

  /**
   * Teszt-aréna readout adatai: aktuális szint, a mélység-alapú sebzés-szorzó, és
   * a reprezentatív (első nem-boss) ellenfél TÉNYLEGES (skálázott) érintés-sebzése.
   */
  sandboxInfo(): { floor: number; mul: number; actual: number } {
    const floor = Math.max(1, Math.floor(this.floor));
    const mul = enemyDamageMul(floor);
    let actual = 0;
    for (const e of this.currentRoom.enemies) {
      if (e instanceof Enemy && e.dmg > 0) { actual = scaleIncomingDamage(e.dmg * HP.half, floor); break; }
    }
    return { floor, mul, actual };
  }
  /** Sentex narrációja futásonként egyszer szól — az első legyőzött bossnál. */
  private firstBossVoicePlayed = false;

  /** Admin · Beállítások csalás-kapcsolók (megőrződnek újratöltés után is). */
  private _cheats: Cheats = readCheats();
  get cheats(): Readonly<Cheats> { return this._cheats; }
  /** Egy csalás-kapcsoló állítása az admin · Beállítások lapról (perzisztens). */
  setCheat<K extends keyof Cheats>(key: K, value: Cheats[K]): void {
    this._cheats[key] = value;
    try { localStorage.setItem(CHEATS_KEY, JSON.stringify(this._cheats)); } catch { /* nem elérhető */ }
  }

  private transition = 0;
  private enemySlowT = 0;
  /** Kísérők (familiar) közös fázis-órája — a keringő orbok szögéhez. */
  private familiarT = 0;
  /** Holdkő-kés per-ellenfél utántöltése: a következő üthető időpont (familiarT). */
  private orbitHitAt = new WeakMap<object, number>();
  /** Szobába lépés után ennyi ideig az ellenfelek mozdulatlanok (türelmi idő). */
  private enemyFreezeT = 0;
  /** Ajtó-animáció: 0 = zárt rács, 1 = teljesen felhúzva (a szoba kipucolva). */
  private doorT = 1;
  private get bombs(): Bomb[] { return this.entities.bombs; }
  private trapdoor: { x: number; y: number; bob: number } | null = null;
  /** A Game köti be: a játékos labirintus-kapura lépett → a Game a world.startLabyrinth-et hívja. */
  onEnterLabyrinth: (() => void) | null = null;
  /** A kapu „élesítése": csak akkor süt el, ha a játékos LELÉPETT róla, majd visszalép. */
  private gateArmed = true;

  /**
   * Aktív labirintus különleges pálya. Ha be van állítva, a World kamera-követéses
   * útvesztő-módban fut: a `_room` a maze-VILÁG téglalapja, a kamera (labCamX/Y)
   * görget a pálya-dobozon belül, de a HARC a teljes normál motort használja
   * (lövés, bomba, skill, ellenfél, ütközés). Null = normál szoba-mód.
   */
  private labyrinth: Labyrinth | null = null;
  /** A labirintus külön konténer-szobája (a `dungeon` ÉRINTETLEN marad alatta). */
  private labRoom: Room | null = null;
  private labCamX = 0;
  private labCamY = 0;
  /** A pálya-doboz a képernyőn (a normál szobáéval AZONOS méret) — a kamera ezen belül görget. */
  private readonly labBox: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private labWon = false;
  private labWinTimer = 0;
  /** Visszaszámláló: a teljes időkeret (mp) és a hátralévő idő (mp). 0-ra érve a futás véget ér. */
  private labTimeLimit = 0;
  private labTimeLeft = 0;
  /** A Game köti be: a labirintus lezárult (kijárat elérve / ESC) → vissza a kontextushoz. */
  onLabyrinthExit: (() => void) | null = null;

  /**
   * Aktív hub-terem (mód-választó). Ha be van állítva, a World harc nélküli
   * hub-módban fut: középen a játékos, a négy fal felé egy-egy portál
   * (TÖRTÉNET / DUNGEON / LABIRINTUS / BOSS). Null = nincs hub.
   */
  private hub: HubPortal[] | null = null;
  /** A hub külön konténer-szobája (a `dungeon` ÉRINTETLEN marad alatta). */
  private hubRoom: Room | null = null;
  /** A hub-portál „élesítése": csak lelépés után süt el újra (ne ismételjen). */
  private hubArmed = true;
  /** A Game köti be: a játékos egy NYITOTT hub-portálra lépett → a Game indítja a módot. */
  onHubChoice: ((id: HubChoice) => void) | null = null;

  private readonly _room: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private _theme: Theme = resolveLevel(1).chapter.theme;

  /**
   * Statikus padló-réteg gyorsítótár (padló + pocsolyák). Ezek a szobán belül
   * képkockánként AZONOS pixeleket adnak (hash-alapú, nincs idő-tag), ezért
   * elég egyszer egy off-screen canvasra rajzolni, és frame-enként egyetlen
   * `drawImage`-dzsel kitenni. A kulcs változására (szoba/méret/téma) újrasül.
   */
  private floorCache: HTMLCanvasElement | null = null;
  private floorCacheKey = '';
  /** Maradandó vérfoltok rétege (a floorCache mintájára) — csak változáskor sül újra. */
  private splatCache: HTMLCanvasElement | null = null;
  private splatCacheKey = '';
  /** Újrahasznosított ellenfél-iterációs puffer (a frame-enkénti spread helyett). */
  private readonly enemyScratch: IEnemy[] = [];
  /**
   * Víz-elrendezés gyorsítótár: a víz-cellák halmaza/téglalapjai/burkoló doboza
   * a szobán belül állandó, csak a hullám-animáció él. Így a frame-enkénti
   * `new Set` + `map` elmarad (csak a víz-szobákban volt, de ott minden képen).
   */
  private waterCache: {
    key: string; set: Set<string>; rects: Array<{ o: Obstacle; r: Rect }>;
    minX: number; minY: number; maxX: number; maxY: number;
  } | null = null;

  constructor(
    private readonly engine: Engine,
    readonly audio: AudioManager,
    readonly input: Input,
    private readonly callbacks: WorldCallbacks,
  ) {}

  // ---- Publikus felület az entitásoknak ----
  get room(): Rect { return this._room; }
  get cx(): number { return this._room.x + this._room.w / 2; }
  get cy(): number { return this._room.y + this._room.h / 2; }
  /** A jelenlegi szoba — hub/labirintus alatt a külön konténer, egyébként a dungeon aktuális szobája. */
  get currentRoom(): Room { return this.hubRoom ?? this.labRoom ?? this.dungeon.current; }
  get enemies(): IEnemy[] { return this.currentRoom.enemies; }

  /** Az aktuális szinthez tartozó fejezet azonosítója (a zenei téma-választáshoz). */
  get chapterId(): string { return resolveLevel(this.floor).chapter.id; }
  /** Igaz, ha épp a labirintus különleges pálya fut (kamera-követéses mód). */
  get isLabyrinth(): boolean { return this.labyrinth !== null; }
  /** Igaz, ha épp a hub-terem (mód-választó) fut — harc/szobaváltás nélkül. */
  get isHub(): boolean { return this.hub !== null; }
  /** Az aktív labirintus objektum (vagy null) — a CollisionSystem ezt olvassa a fal-ütközéshez. */
  get lab(): Labyrinth | null { return this.labyrinth; }
  /** A labirintus visszaszámláló: hátralévő idő (mp), nem-negatív. A HUD olvassa. */
  get labTimeRemaining(): number { return Math.max(0, this.labTimeLeft); }
  /** A labirintus teljes időkerete (mp) — a HUD a vész-sávhoz viszonyítja. */
  get labTimeBudget(): number { return this.labTimeLimit; }

  addShake(v: number): void { this.fx.addShake(v); }
  addFloater(x: number, y: number, text: string, color = '#f3e2bf'): void {
    this.fx.addFloater(x, y, text, color);
  }

  /**
   * Lebegő SEBZÉSSZÁM — harci visszajelzés a találatokról. Felpattan, kissé
   * elsodródik (hogy a sorozat-találatok ne fedjék egymást) és elhalványul.
   * A szám a HUD konvencióját követi (valós sebzés-pont). A `toPlayer` a
   * bejövő sebzés (piros, − előjel); egyébként kifelé adott sebzés.
   */
  addDamage(x: number, y: number, amount: number, opts: { color?: string; toPlayer?: boolean } = {}): void {
    this.fx.addDamage(x, y, amount, opts);
  }

  /** Talaj-veszély lerakása (lásd HazardSystem) — ellenfelek/bossok hívják. */
  addHazard(kind: HazardKind, x: number, y: number, r: number, life: number, arm = 0): void {
    this.hazards.add(kind, x, y, r, life, arm);
  }

  /** Boss-példány a sablon által megadott registry-célból (mind a 10 boss). */
  private makeBoss(x: number, y: number, kind: BossKind): IEnemy {
    const floor = Math.max(1, Math.floor(this.floor));
    const color = this._theme.bossColor;
    return BOSS_REGISTRY[kind].make(x, y, floor, color);
  }
  hasNeighbor(dir: Dir): boolean { return this.hub ? false : this.dungeon.hasNeighbor(dir); }
  isCurrentRoomCleared(): boolean { return this.currentRoom.cleared; }
  get theme(): Theme { return this._theme; }
  floorName(): string {
    const lvl = resolveLevel(this.floor);
    return `${lvl.chapter.name} ${lvl.index}`;
  }

  // ---- Életciklus ----
  /** Új futás. `startFloor`: a kezdő globális szint (admin „Kipróbálás" egy fejezettől). */
  newGame(startFloor = 1): void {
    this.labyrinth = null; // friss futás mindig normál szoba-módban indul
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.computeRoom();
    this.floor = Math.max(1, Math.floor(startFloor));
    this.score = 0;
    this.sandbox = false;
    this.runStats.resetRun();
    this.firstBossVoicePlayed = false;   // új futás → az első boss narrációja megint szólhat
    this._theme = resolveLevel(this.floor).chapter.theme;
    this.dungeon = new Dungeon(this.floor);
    this.player.reset(this.cx, this.cy);
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    // kezdő skill induljon feltöltve, hogy azonnal kipróbálható legyen
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;
    this.spawnRoomContents(this.currentRoom);
    this.doorT = this.currentRoom.cleared ? 1 : 0;
  }

  /**
   * Hub-terem (mód-választó) indítása: harc nélküli kezdő-terem, középen a
   * játékossal és a négy fal felé egy-egy portállal. A NYITOTT portálra lépve a
   * Game indítja a megfelelő módot (TÖRTÉNET / LABIRINTUS), a ZÁRT portál
   * (DUNGEON / BOSS — még nincs megírva) csak „hamarosan" jelzést ad. A
   * `dungeon` (menü-háttér) ÉRINTETLEN marad alatta, mint a labirintusnál.
   */
  startHub(): void {
    this.labyrinth = null;
    this.labRoom = null;
    this.sandbox = false;
    this.hubArmed = true;
    this._theme = resolveLevel(1).chapter.theme;
    // külön konténer-szoba (cleared → nem fut a harc/ajtó-logika)
    this.hubRoom = new Room(0, 0, 'normal');
    this.hubRoom.cleared = true;
    this.hubRoom.spawned = true;
    // a négy portál a négy fal felé; a labelek a portál ALATT jelennek meg
    this.hub = [
      { id: 'story',     col: 6,    row: 0.7, locked: false },
      { id: 'labyrinth', col: 1.2,  row: 3,   locked: false },
      { id: 'dungeon',   col: 10.8, row: 3,   locked: true },
      { id: 'boss',      col: 6,    row: 5.3, locked: true },
    ];
    this.computeRoom();
    this.player.reset(this.cx, this.cy);
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    this.particles.clear();
    this.floorCache = null;
  }

  /** A hub elhagyása (menübe lépéskor): a konténer-szoba eldobása, normál szoba vissza. */
  exitHub(): void {
    if (!this.hub) return;
    this.hub = null;
    this.hubRoom = null;
    this.floorCache = null;
    this.computeRoom();
  }

  /**
   * Labirintus különleges pálya indítása a TELJES motorral (kamera-követés +
   * harc). A `_room`-ot a maze-VILÁG méretére állítjuk, a jelenlegi szobát üres
   * konténerként használjuk (ide kerülnek az ellenfelek/lövedékek), a játékost a
   * start-cellába tesszük, és a maze spawn-helyeire ellenfeleket szórunk. A floor
   * (nehézség) a hívó kontextusából jön (world-kapu: jelenlegi szint).
   */
  startLabyrinth(lab: Labyrinth, theme: Theme, enemyKinds: EnemyKind[], chapterId = 'labyrinth'): void {
    this.hub = null;        // hubból indítva a konténer-szoba átadja a helyét a labRoom-nak
    this.hubRoom = null;
    this.labyrinth = lab;
    this.labChapterId = chapterId;
    this._theme = theme;
    // a nehézség a MEGLÉVŐ szintből jön (world-kapu: aktuális szint; admin-teszt: 1)
    this.labWon = false;
    this.labWinTimer = 0;
    // Visszaszámláló: a legrövidebb út (pathLen tile) egyenes-séta-ideje, reális
    // tempó-szorzóval (kanyarok/harc) + ráhagyás. Így minden generált labirintus a
    // saját méretéhez kap időkeretet (lásd LAB_TIMER).
    const minWalk = (lab.pathLen * ROOM.TILE) / PLAYER_BASE.speed;
    this.labTimeLimit = Math.max(LAB_TIMER.MIN, minWalk * LAB_TIMER.PACE) + LAB_TIMER.BONUS;
    this.labTimeLeft = this.labTimeLimit;
    this.runStats.startLab();
    // külön konténer-szoba: a `dungeon` (világ-haladás) ÉRINTETLEN marad alatta
    this.labRoom = new Room(0, 0, 'normal');
    this.labRoom.cleared = true;   // ne fusson a szoba-pucolás/ajtó logika
    this.labRoom.spawned = true;
    this.computeRoom();

    // a World-szintű effekt-tömbök frissek (a dungeon szobáé érintetlen)
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    this.particles.clear();
    this.floorCache = null; // a maze-világ mérete eltér a szobáétól → újrasütés

    const TILE = ROOM.TILE;
    this.player.x = (lab.start.col + 0.5) * TILE;
    this.player.y = (lab.start.row + 0.5) * TILE;
    this.player.vx = 0;
    this.player.vy = 0;
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;

    this.spawnLabEnemies(lab, enemyKinds);
  }

  /** Labirintus-ellenfelek a maze spawn-helyeire, a fejezet palettájából sorsolva. */
  private spawnLabEnemies(lab: Labyrinth, kinds: EnemyKind[]): void {
    if (kinds.length === 0) return;
    // A labirintusban NINCS repülő ellenfél: a `floats` típusok átszállnának a
    // maze falain (egy útvesztőben értelmetlen), ezért kiszűrjük őket. Ha a
    // fejezet palettája CSAK repülőkből áll, maradunk az eredetinél, hogy legyen
    // kivel harcolni.
    const grounded = kinds.filter((k) => !ENEMY_STATS[k].floats);
    const pool = grounded.length > 0 ? grounded : kinds;
    const TILE = ROOM.TILE;
    const scale = enemyScale(this.floor, this.player);
    for (const s of lab.spawns) {
      const kind = pick(pool);
      const x = (s.col + 0.5) * TILE;
      const y = (s.row + 0.5) * TILE;
      this.currentRoom.enemies.push(new Enemy(kind, x, y, scale));
    }
  }

  /** A labirintus lezárása (kijárat elérve / ESC): a Game visszaadja a vezérlést. */
  exitLabyrinth(): void {
    if (!this.labyrinth) return;
    this.clearLabyrinthState();
    this.entities.clear();
    this.particles.clear();
    this.onLabyrinthExit?.();
  }

  /**
   * A labirintus-állapot eltakarítása (callback NÉLKÜL): a `currentRoom` újra a
   * dungeon sértetlen szobáját adja, a `_room` visszaáll a normál méretre. A
   * kilépés (exitLabyrinth) és a labirintusbeli halál (killPlayer) is ezt hívja.
   */
  private clearLabyrinthState(): void {
    this.labyrinth = null;
    this.labRoom = null;
    this.floorCache = null;
    this.runStats.endLab();
    this.computeRoom();
  }

  /** Igaz, ha a (col,row) maze-cella tömör fal (a pályán kívül is fal). */
  /**
   * Admin · teszt-aréna: egyetlen ellenfelet (vagy bosst) dob be egy véletlen
   * fejezet kinézetű, akadályokkal teli szobába, hogy élőben megnézhető legyen.
   * A szoba úgy viselkedik, mint egy harci szoba: a cél legyőzésekor kipucolódik.
   */
  startSandbox(target: EnemyKind | BossTarget, champion: ChampionTrait | null = null): void {
    this.labyrinth = null;
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.computeRoom();
    this.floor = 1 + Math.floor(rand(0, 24)); // véletlen szint → véletlen téma/akadályok
    this.score = 0;
    this.sandbox = true;
    this.runStats.resetRun();
    this._theme = resolveLevel(this.floor).chapter.theme;
    this.dungeon = new Dungeon(this.floor);
    this.player.reset(this.cx, this.cy);
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;

    const chapter = resolveLevel(this.floor).chapter;
    const room = this.currentRoom;
    room.decorations = [];
    this.spawnDecorations(room);
    // véletlen akadály-elrendezés egy normál sablonból (de ellenfelek nélkül)
    const arenaParsed = parseTemplate(pick(chapter.normalTemplates));
    room.obstacles = arenaParsed.obstacles;
    room.anim = arenaParsed.anim;
    room.enemies.length = 0;
    room.pickups = [];
    room.pedestal = null;
    room.splats = [];
    room.cleared = false;
    room.spawned = true;

    if (isBossTarget(target)) {
      const floor = Math.max(1, Math.floor(this.floor));
      const boss = BOSS_REGISTRY[target].make(this.cx, this.cy - 60, floor, chapter.theme.bossColor);
      room.enemies.push(boss);
      this.audio.boss();
      this.addShake(10);
    } else if (target === 'roach') {
      this.spawnRoachSwarm(this.cx, this.cy - 40, room, NO_SCALE);
    } else {
      room.enemies.push(new Enemy(target, this.cx, this.cy - 150, NO_SCALE, false, champion));
    }
    this.addFloater(this.cx, this.cy - 110, champion ? `TESZT ARÉNA · ${champion}` : 'TESZT ARÉNA', '#f0c878');
  }

  /**
   * Admin · egy KONKRÉT szoba-sablon kipróbálása: a fejezet kezdő-szintjén egy
   * szobát épít pontosan ebből a sablonból (akadályok + ellenfelek + boss), és
   * oda dobja a játékost. Így egy elrendezés azonnal játékban tesztelhető.
   */
  startRoomTry(chapterId: string, cat: 'normal' | 'boss', index: number): void {
    this.labyrinth = null;
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.computeRoom();
    // A kiválasztott pályát közvetlenül az id-ja alapján oldjuk fel — így a
    // kampányon kívüli (dungeon/különleges) pályák is tesztelhetők a saját
    // témájukkal és sablonjaikkal.
    const chapter = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0]!;
    const range = chapterFloorRange(chapter.id);
    this.floor = range ? range.start : 1;
    this.score = 0;
    this.sandbox = false;
    this.runStats.resetRun();
    this._theme = chapter.theme;
    this.dungeon = new Dungeon(this.floor);
    this.player.reset(this.cx, this.cy);
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;

    const list = cat === 'boss' ? chapter.bossTemplates : chapter.normalTemplates;
    const tpl = list[index] ?? list[0]!;
    const room = this.currentRoom;
    room.decorations = [];
    this.spawnDecorations(room);
    const parsed = parseTemplate(tpl);
    room.obstacles = parsed.obstacles;
    room.anim = parsed.anim;
    room.gate = parsed.gate;
    room.enemies.length = 0;
    room.pickups = [];
    room.pedestal = null;
    room.splats = [];
    room.cleared = false;
    room.spawned = true;

    if (cat === 'boss' || parsed.boss) {
      const at = parsed.boss ?? { col: 6, row: 2, kind: 'boss' as const };
      const c = this.cellCenter(at.col, at.row);
      room.enemies.push(this.makeBoss(c.x, c.y, at.kind));
      this.audio.boss();
      this.addShake(10);
    } else {
      const scale = enemyScale(this.floor, this.player);
      for (const sp of parsed.spawns) {
        const c = this.cellCenter(sp.col, sp.row);
        const kind = sp.slot === 'any' ? pick(chapter.enemyKinds) : sp.slot;
        if (kind === 'roach') this.spawnRoachSwarm(c.x, c.y, room, scale);
        else room.enemies.push(new Enemy(kind, c.x, c.y, scale, false, this.rollChampion()));
      }
    }
    this.addFloater(this.cx, this.cy - 110, `TESZT · ${chapter.name} ${cat === 'boss' ? 'boss' : 'szoba'} #${index + 1}`, '#f0c878');
  }

  private nextFloor(): void {
    this.computeRoom();
    this.floor++;
    this.runStats.resetFloor();
    this._theme = resolveLevel(this.floor).chapter.theme;
    this.audio.stairs();
    this.dungeon = new Dungeon(this.floor);
    this.entities.clear();
    this.hazards.clear();
    this.trapdoor = null;
    this.player.slowT = 0; // a gázzsák lassítása nem visz át a következő szintre
    this.player.placeAtCenter(this.cx, this.cy);
    this.spawnRoomContents(this.currentRoom);
    this.doorT = this.currentRoom.cleared ? 1 : 0;
    this.addFloater(this.cx, this.cy, this.floorName(), '#f0c878');
  }

  // ---- Szobatartalom ----
  private spawnRoomContents(room: Room): void {
    room.decorations = [];

    if (room.type === 'item') {
      // SZERENCSE-SZOBA: tiszta, díszes terem oltárral — nincs koszoló dekoráció.
      room.cleared = true;
      room.anim = null;
      // a négy sarokban egyedi szerencse-kő, mindegyik alatt garantált érme
      room.obstacles = [
        { col: 0, row: 0, kind: 'luckrock' },
        { col: GRID.W - 1, row: 0, kind: 'luckrock' },
        { col: 0, row: GRID.H - 1, kind: 'luckrock' },
        { col: GRID.W - 1, row: GRID.H - 1, kind: 'luckrock' },
      ];
      // INGYENES tárgy felül, középen (a klasszikus pedesztál), felirattal.
      // Túlnyomórészt stat-perk (esély-súlyozva), ritkán skill-tárgy.
      const freeItem = rollItem();
      room.pedestal = new Pedestal(this.cx, this.cy - 188, freeItem);
      room.pedestal.label = `FREE · ${freeItem.name}`;
      room.shop = new Shop(this.cx, this.cy);
      return;
    }

    this.spawnDecorations(room);
    if (room.type === 'start') {
      room.cleared = true;
      // A hub-terem adja a mód-választó portálokat; a story kezdőszobában nincs kapu.
      return;
    }

    // Az aktuális szinthez tartozó fejezet adja a sablonokat és ellenfeleket.
    const lvl = resolveLevel(this.floor);
    const chapter = lvl.chapter;
    // A boss-szoba KIVÉTEL: nem véletlen a poolból, hanem MINDEN szintnek SAJÁT
    // boss-szobája van — a fejezeten belüli szint-index választ (0-alapú). Ha
    // kevesebb boss-sablon van, mint szint, körbefordul; a normál szobák maradnak
    // véletlenek. Így pl. 3 szintű fejezet 3 boss-sablonja → szintenként 1-1 boss.
    const tpl = room.type === 'boss'
      ? (chapter.bossTemplates[(Math.max(1, lvl.index) - 1) % chapter.bossTemplates.length] ?? pick(chapter.bossTemplates))
      : pick(chapter.normalTemplates);
    const parsed = parseTemplate(tpl);
    room.obstacles = parsed.obstacles;
    room.anim = parsed.anim;
    room.gate = parsed.gate;

    if (room.type === 'boss') {
      const at = parsed.boss ?? { col: 6, row: 2, kind: 'boss' as const };
      const c = this.cellCenter(at.col, at.row);
      room.enemies.push(this.makeBoss(c.x, c.y, at.kind));
      this.audio.boss();
      this.addShake(12);
      return;
    }

    // normál szoba: a sablon pozícióira a fejezet ellenfél-palettájából rakunk.
    // A mélység ÉS a játékos-erő együtt adja az ellenfél-szorzókat (lásd balance/).
    const scale = enemyScale(this.floor, this.player);
    for (const sp of parsed.spawns) {
      const c = this.cellCenter(sp.col, sp.row);
      const kind = sp.slot === 'any' ? pick(chapter.enemyKinds) : sp.slot;
      if (kind === 'roach') this.spawnRoachSwarm(c.x, c.y, room, scale);
      else room.enemies.push(new Enemy(kind, c.x, c.y, scale, false, this.rollChampion()));
    }
  }

  /** Csótány-raj: 20 db egy pont köré, közülük pontosan egy a harapós (sebző). */
  private spawnRoachSwarm(cx: number, cy: number, room: Room, scale: EnemyScale): void {
    const n = 20;
    const biter = Math.floor(rand(0, n));
    for (let i = 0; i < n; i++) {
      const ang = rand(0, TAU);
      const rad = rand(6, 66);
      room.enemies.push(new Enemy('roach', cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, scale, i === biter));
    }
  }

  /** Champion-variáns sorsolása egy spawn-hoz (Wave 3); null = sima ellenfél. */
  private rollChampion(): ChampionTrait | null {
    return Math.random() < TUNING.championChance ? pick(CHAMPION_TRAITS) : null;
  }

  /** Futás közbeni ellenfél-hozzáadás (pl. megidéző) — a mélységhez skálázva. */
  spawnAdd(kind: EnemyKind, x: number, y: number): void {
    this.currentRoom.enemies.push(new Enemy(kind, x, y, enemyScale(this.floor, this.player)));
  }

  private spawnDecorations(room: Room): void {
    const rc = this._room;
    const count = rand(20, 35);
    for (let i = 0; i < count; i++) {
      room.decorations.push({
        x: rc.x + rand(30, rc.w - 30),
        y: rc.y + rand(30, rc.h - 30),
        type: Math.floor(rand(0, 4)),
        size: rand(6, 16),
        rot: rand(0, TAU),
      });
    }
  }

  enterRoom(dir: Dir): void {
    const next = this.dungeon.move(dir);
    this.entities.clear();
    this.hazards.clear();

    const rc = this._room;
    const r = this.player.r;
    if (dir === 'W') { this.player.x = rc.x + rc.w - r - 34; this.player.y = this.cy; }
    else if (dir === 'E') { this.player.x = rc.x + r + 34; this.player.y = this.cy; }
    else if (dir === 'N') { this.player.x = this.cx; this.player.y = rc.y + rc.h - r - 34; }
    else { this.player.x = this.cx; this.player.y = rc.y + r + 34; }
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invuln = 0.5;
    this.player.slowT = 0; // a gázzsák „szoba végéig" lassítása új szobában megszűnik
    this.runStats.resetRoom();

    if (!next.spawned) {
      this.spawnRoomContents(next);
      next.spawned = true;
    }
    // az új szoba rácsa azonnal a megfelelő állásban (kipucolt → nyitva, harci → zárva)
    this.doorT = next.cleared ? 1 : 0;
    this.transition = 0.2;
    // 0.7 másodperc türelmi idő: az ellenfelek csak ezután indulnak el
    this.enemyFreezeT = next.cleared ? 0 : 0.7;
    this.audio.door();
  }

  // ---- Sebzés / halál ----
  // `dot` = zónás folyamatos sebzés (pl. vámpír-aura): MEGKERÜLI a sérthetetlenségi
  // ablakot (nem fojtja le az 1 mp-es i-frame), nem ad shake-et és nem spammeli a
  // hangot — viszont a „valós sebzés" floater minden tickkel megjelenik.
  damagePlayer(amount: number, sound: HurtSound = 'hurt', raw = false, dot = false): void {
    const p = this.player;
    if (!p.alive || this._cheats.invincible) return;
    if (!dot && p.invuln > 0) return; // a DoT figyelmen kívül hagyja az i-frame-et
    // a MÉLYSÉG globálisan növeli a bejövő sebzést (roguelike-minta) — egyetlen helyen,
    // így MINDEN forrás (lövedék/érintés/talaj-veszély) egységesen skálázódik. A
    // bossok és a játékos saját robbanása `raw`-val kikerülik (fix sebzés).
    const dealt = raw ? amount : scaleIncomingDamage(amount, this.floor);
    p.hp -= dealt;
    if (!dot) {
      p.invuln = PLAYER_BASE.invulnTime;
      this.addShake(8);
      // a sebzés forrása szerint más-más hang (méreg / tűz / energia / általános)
      if (sound === 'acid') this.audio.acid();
      else if (sound === 'burn') this.audio.burn();
      else if (sound === 'zap') this.audio.zap();
      else this.audio.hurt();
    }
    this.particles.spawn(p.x, p.y, '#ff5b6a', dot ? 4 : 10, 180, dot ? 0.25 : 0.4);
    this.addDamage(p.x, p.y - p.r - 4, dealt, { toPlayer: true });
    if (p.hp <= 0) this.killPlayer();
  }

  /** A játékos halála — közös pont minden sebzés-forrásnak (effekt + game over). */
  private killPlayer(): void {
    const p = this.player;
    p.hp = 0;
    p.alive = false;
    this.particles.spawn(p.x, p.y, '#ff5b6a', 30, 300, 0.9);
    // labirintusban elesve a futás véget ér: a labirintus-állapotot eltakarítjuk
    // (callback nélkül), hogy a game-over a normál nézettel jöjjön.
    if (this.labyrinth) this.clearLabyrinthState();
    this.callbacks.onGameOver();
  }

  killEnemy(enemy: IEnemy): void {
    // Wave 6: a csontváz egyszer feltámad a halál helyett (fél HP-val).
    if (enemy instanceof Enemy && enemy.tryRevive(this)) return;

    const arr = this.currentRoom.enemies; // labirintus alatt a labRoom — különben az ellenfél sosem halna meg
    const idx = arr.indexOf(enemy);
    if (idx < 0) return;
    arr.splice(idx, 1);

    this.runStats.kills++;
    if (enemy.boss) this.runStats.bossKills++;

    this.audio.splat();
    this.particles.spawn(enemy.x, enemy.y, enemy.col, enemy.boss ? 40 : 12, enemy.boss ? 320 : 180, enemy.boss ? 0.9 : 0.45);
    this.particles.spawn(enemy.x, enemy.y, '#fff', enemy.boss ? 16 : 4, 200, 0.4);
    this.addShake(enemy.boss ? 14 : 4);
    this.score += enemy.score;
    this.addFloater(enemy.x, enemy.y, `+${enemy.score}`, '#f3e2bf');

    // Maradandó folt a padlón
    this.currentRoom.splats.push({
      x: enemy.x,
      y: enemy.y,
      size: enemy.r * rand(1.2, 1.8),
      rot: rand(0, TAU),
      color: enemy.col,
    });

    // A nagy pók megöléskor 10 pók-fiókára robban szét.
    if (enemy instanceof Enemy && enemy.kind === 'spider') {
      this.spawnSpiderlings(enemy.x, enemy.y);
    }

    // Champion halál-effektek (Wave 3).
    if (enemy instanceof Enemy && enemy.champion === 'explosive') {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        this.ebullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 6, life: 3, style: 'fire' });
      }
      this.audio.boom();
      this.addShake(7);
    } else if (enemy instanceof Enemy && enemy.champion === 'vengeful') {
      this.addHazard('poison', enemy.x, enemy.y, 46, 7);
    }

    // Gázzsák: megöléskor tartós méregfelhővé robban (Wave 5b).
    if (enemy instanceof Enemy && enemy.kind === 'gasbag') {
      this.addHazard('poison', enemy.x, enemy.y, 50, 7);
    }

    // Múmia: megöléskor 3 skarabeuszra esik szét (Wave 6).
    if (enemy instanceof Enemy && enemy.kind === 'mummy') {
      const scale = enemyScale(this.floor, this.player);
      for (let k = 0; k < 3; k++) {
        const ang = rand(0, TAU), rad = rand(8, 28);
        this.currentRoom.enemies.push(new Enemy('scarab', enemy.x + Math.cos(ang) * rad, enemy.y + Math.sin(ang) * rad, scale));
      }
      this.particles.spawn(enemy.x, enemy.y, '#cabf9a', 14, 200, 0.5);
    }

    // A drop nem ölésenként jön, hanem szobánként egyszer (lásd a szoba-kipucolás ágat).
  }

  /** A nagy pók szétrobbanása: 10 pók-fióka, közülük pontosan kettő harapós (sebző). */
  private spawnSpiderlings(cx: number, cy: number): void {
    const n = 10;
    const biters = new Set<number>();
    while (biters.size < 2) biters.add(Math.floor(rand(0, n)));
    const scale = enemyScale(this.floor, this.player);
    for (let i = 0; i < n; i++) {
      const ang = rand(0, TAU);
      const rad = rand(8, 40);
      this.currentRoom.enemies.push(new Enemy('spiderling', cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, scale, biters.has(i)));
    }
    this.particles.spawn(cx, cy, '#7a6a78', 18, 240, 0.5);
    this.audio.splat();
  }

  dropPickup(x: number, y: number): void {
    // A típus a nettó-súlyok arányában (a gate már eldöntötte, hogy esik valami).
    const n = dropConfig.nets;
    const total = netSum();
    let r = Math.random() * (total > 0 ? total : 1);
    let type: PickupType = 'coin';
    if ((r -= n.coin) < 0) type = 'coin';
    else if ((r -= n.bomb) < 0) type = 'bomb';
    else if ((r -= n.heart) < 0) type = 'heart';
    else type = 'tnt';
    this.currentRoom.pickups.push(new Pickup(x, y, type));
  }

  /** Több érme szétszórása egy pont körül (szerencse-kő zsákmánya). */
  dropCoins(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const d = Math.random() * 24;
      this.currentRoom.pickups.push(new Pickup(x + Math.cos(a) * d, y + Math.sin(a) * d, 'coin'));
    }
  }

  /** A felugró ablak „Megveszem / Felveszem / Rendben" gombja. */
  acceptOffer(): void {
    // puszta értesítő ablak (pl. „Nem nyertél") — csak bezár
    if (this.pendingNotice) { this.pendingNotice = false; return; }

    // sorsoláson nyert skill-tárgy felvétele (lecseréli a jelenlegit)
    const gi = this.pendingGambleItem;
    this.pendingGambleItem = null;
    if (gi) { this.giveItem(gi); return; }

    // ingyenes tárgy-pedesztál (skill-tárgy) felvétele
    const pd = this.pendingPedestal;
    this.pendingPedestal = null;
    if (pd && !pd.taken) { this.collectPedestal(pd); return; }

    const s = this.pendingStall;
    this.pendingStall = null;
    if (!s || s.sold) return;
    if (this.player.coins < s.price) {
      this.audio.denied();
      this.addFloater(this.player.x, this.player.y - 30, 'Not enough coins!', '#ff6a6a');
      s.declined = true;
      return;
    }
    this.player.coins -= s.price;
    s.sold = true;
    this.buyStall(s);
  }

  /** A felugró ablak „Mégsem" gombja (vagy ESC): az ajánlat elutasítása. */
  declineOffer(): void {
    if (this.pendingNotice) { this.pendingNotice = false; return; }
    const gi = this.pendingGambleItem;
    this.pendingGambleItem = null;
    if (gi) {
      this.addFloater(this.player.x, this.player.y - 30, `Skipped: ${gi.name}`, '#9a93a8');
      return;
    }
    const pd = this.pendingPedestal;
    this.pendingPedestal = null;
    if (pd) { pd.declined = true; return; }
    const s = this.pendingStall;
    this.pendingStall = null;
    if (s) s.declined = true;
  }

  /** Egy megnyert/elfogadott tárgy felvétele a játékosra (hang + effekt). */
  private giveItem(item: Item): void {
    item.apply(this.player);
    this.player.collected.push(item);
    this.player.refreshLook();
    this.audio.item();
    this.addFloater(this.player.x, this.player.y - 30, `${item.name} — ${item.desc}`, item.col);
    this.particles.spawn(this.player.x, this.player.y, item.col, 22, 260, 0.8);
  }

  /** Ingyenes pedesztál-tárgy felvétele: alkalmazás + hang/effekt. */
  private collectPedestal(pd: Pedestal): void {
    pd.taken = true;
    pd.item.apply(this.player);
    this.player.collected.push(pd.item);
    this.player.refreshLook();
    this.audio.item();
    this.addFloater(this.player.x, this.player.y - 30, `${pd.item.name} — ${pd.item.desc}`, pd.item.col);
    this.particles.spawn(pd.x, pd.y, pd.item.col, 20, 200, 0.7);
  }

  /** A megvásárolt stand-portéka alkalmazása a játékosra (hang + effekt). */
  private buyStall(s: ShopStall): void {
    const view = offerView(s.offer);
    this.audio.buy();
    this.particles.spawn(s.x, s.y - 20, view.color, 18, 200, 0.6);
    this.particles.spawn(s.x, s.y - 20, '#ffd36a', 8, 160, 0.5);
    if (s.offer.kind === 'item') {
      const item = s.offer.item;
      item.apply(this.player);
      this.player.collected.push(item);
      this.player.refreshLook();
      this.addFloater(this.player.x, this.player.y - 30, `${item.name} — ${item.desc}`, item.col);
    } else {
      const c = s.offer.cons;
      if (c === 'bomb') this.player.bombs++;
      else if (c === 'tnt') this.player.tnt++;
      else this.player.hp = clamp(this.player.hp + HP.heart, 0, this.player.maxHp);
      this.addFloater(this.player.x, this.player.y - 30, `+${view.name}`, view.color);
    }
  }

  // ---- Szerencse-oltár: sorsolás + reroll ----
  /** E-gomb a szerencse-szobában: ha oltár/rúna közelében áll, azt működteti.
   *  Visszaad `true`-t, ha kezelte (ekkor nem sül el az aktív skill). */
  private tryAltarAction(): boolean {
    const shop = this.currentRoom.shop;
    if (!shop) return false;
    const p = this.player;
    if (dist2(shop.rx, shop.ry, p.x, p.y) < (p.r + 30) ** 2) { this.doReroll(shop); return true; }
    if (dist2(shop.ax, shop.ay, p.x, p.y) < (p.r + 74) ** 2) { this.doGamble(shop); return true; }
    return false;
  }

  private doGamble(shop: Shop): void {
    if (this.player.coins < GAMBLE_COST) {
      this.audio.denied();
      this.addFloater(shop.ax, shop.ay - 60, 'Not enough coins!', '#ff6a6a');
      return;
    }
    this.player.coins -= GAMBLE_COST;
    shop.startSpin();
    this.audio.gamble();
    const out = rollGamble(this.player.luck);
    // a jutalom a pörgés végén csapódik le (a látvány kedvéért)
    setTimeout(() => this.applyGamble(shop, out), 720);
  }

  private applyGamble(shop: Shop, out: ReturnType<typeof rollGamble>): void {
    const p = this.player;
    const x = shop.ax;
    const y = shop.ay - 44;
    if (out.kind === 'nothing') {
      this.particles.spawn(x, y, '#6a6478', 8, 140, 0.5);
      this.pendingNotice = true;
      this.callbacks.onOffer({
        badge: '🎰 GAMBLE',
        title: 'No win',
        desc: "Luck wasn't on your side this time.",
        sub: 'Try again, or reroll the offer!',
        color: '#9a93a8',
        acceptLabel: 'OK',
        hideDecline: true,
      });
      return;
    }
    shop.winFlash();
    this.particles.spawn(x, y, '#ffd86a', 22, 240, 0.7);
    if (out.kind === 'coins') {
      p.coins += out.amount;
      this.audio.jackpot();
      this.addFloater(x, y, `+${out.amount}¢`, '#ffd36a');
    } else if (out.kind === 'bomb') {
      p.bombs++;
      this.audio.buy();
      this.addFloater(x, y, '+Bomb', '#cfcfd6');
    } else if (out.kind === 'tnt') {
      p.tnt++;
      this.audio.buy();
      this.addFloater(x, y, '+TNT', '#ff7b5a');
    } else if (out.kind === 'heart') {
      p.hp = clamp(p.hp + HP.heart, 0, p.maxHp);
      this.audio.buy();
      this.addFloater(x, y, '+Heart', '#ff5b6a');
    } else {
      // JACKPOT: véletlen tárgy (a közös, súlyozott rollItem — a perkWeight itt is él)
      const item = rollItem();
      this.audio.jackpot();
      this.addFloater(x, y, `JACKPOT! ${item.name}`, '#ffe9a8');
      this.particles.spawn(x, y, item.col, 26, 300, 0.9);
      this.addShake(6);
      if (item.skill) {
        // skill-tárgy: NEM cseréljük le azonnal — a játékos dönt a felugró ablakban
        this.offerGambleSkill(item);
      } else {
        item.apply(p);
        p.collected.push(item);
        p.refreshLook();
      }
    }
  }

  /** A sorsoláson nyert SKILL-tárgy felajánlása (a jelenlegit lecserélné). */
  private offerGambleSkill(item: Item): void {
    this.pendingGambleItem = item;
    const skill = item.skill ? SKILL_BY_ID[item.skill] : undefined;
    const curId = this.player.activeSkillId;
    const cur = curId && curId !== item.skill ? SKILL_BY_ID[curId] : undefined;
    this.callbacks.onOffer({
      badge: '✨ SKILL WON',
      title: skill ? skill.name : item.name,
      desc: skill ? skill.desc : item.desc,
      sub: (skill ? `Active skill · charges over ${skill.chargeMax} rooms` : item.desc)
        + (cur ? `  ·  replaces: ${cur.name}` : ''),
      color: item.col,
      acceptLabel: 'TAKE',
    });
  }

  private doReroll(shop: Shop): void {
    const price = rerollPrice(shop.rerollUses);
    if (this.player.coins < price) {
      this.audio.denied();
      this.addFloater(shop.rx, shop.ry - 30, `Reroll: ${price}¢ — not enough`, '#ff6a6a');
      return;
    }
    this.player.coins -= price;
    shop.reroll();
    this.pendingStall = null;
    this.audio.gamble();
    this.particles.spawn(shop.rx, shop.ry - 6, '#7fe0c4', 16, 200, 0.6);
    this.addFloater(shop.rx, shop.ry - 30, `New offer! (−${price}¢)`, '#bdeedd');
  }

  /** Bolt-frissítés: animáció + stand-közelség → vásárlás megerősítő ablak. */
  /** Ingyenes pedesztál: közelségre azonnal felveszi (skill-tárgynál ablakot mutat). */
  private updatePedestal(pd: Pedestal, dt: number): void {
    pd.update(dt);
    if (this.pendingStall || this.pendingPedestal) return;
    const near = dist2(pd.x, pd.y, this.player.x, this.player.y) < (this.player.r + 18) ** 2;
    if (!near) { pd.declined = false; return; }
    if (pd.declined) return;
    if (pd.item.skill) {
      // skill-tárgy: nem vesszük fel azonnal, a Game felugró ablakot mutat
      this.pendingPedestal = pd;
      const skill = SKILL_BY_ID[pd.item.skill];
      this.callbacks.onOffer({
        badge: '✨ FREE SKILL',
        title: skill ? skill.name : pd.item.name,
        desc: skill ? skill.desc : pd.item.desc,
        sub: skill ? `Active skill · press E · charges over ${skill.chargeMax} rooms` : pd.item.desc,
        color: pd.item.col,
        acceptLabel: 'TAKE',
      });
    } else {
      this.collectPedestal(pd);
    }
  }

  private updateShop(shop: Shop, dt: number): void {
    shop.update(dt);
    if (this.pendingStall || this.pendingPedestal) return; // épp nyitva egy ajánlat
    const p = this.player;
    for (const s of shop.stalls) {
      if (s.sold) continue;
      const near = dist2(s.x, s.y, p.x, p.y) < (p.r + 18) ** 2;
      if (!near) { s.declined = false; continue; }
      if (s.declined) continue;
      this.pendingStall = s;
      const view = offerView(s.offer);
      this.callbacks.onOffer({
        badge: s.offer.kind === 'item' ? '🛒 PURCHASE' : '🛒 CONSUMABLE',
        title: view.name,
        desc: view.desc,
        sub: `Price: ${s.price}¢  ·  you have: ${p.coins}¢`,
        color: view.color,
        acceptLabel: `BUY (${s.price}¢)`,
      });
      return;
    }
  }

  // ---- Aktív skillek ----
  private useSkill(): void {
    const id = this.player.activeSkillId;
    if (!id) return;
    const skill = SKILL_BY_ID[id];
    if (!skill || this.player.skillCharge < skill.chargeMax) return;
    skill.activate(this);
    this.player.skillCharge = 0;
    this.audio.skill();
    this.addFloater(this.player.x, this.player.y - 34, `${skill.name}!`, skill.col);
  }

  private chargeSkill(): void {
    const id = this.player.activeSkillId;
    if (!id) return;
    const skill = SKILL_BY_ID[id];
    if (!skill) return;
    const before = this.player.skillCharge;
    this.player.skillCharge = Math.min(this.player.skillCharge + 1, skill.chargeMax);
    if (before < skill.chargeMax && this.player.skillCharge >= skill.chargeMax) this.audio.charged();
  }

  /**
   * Lökéshullám: a `radius` sugáron belüli ellenfeleket ELLÖKI (a lényeg), és
   * csak kevés sebzést ad. A lökés a középponttól kifelé hat, közelebb erősebben
   * (lineáris esés a sugár széléig). A bosst is ellöki, de a kis sebzés miatt
   * nem öli meg egyből.
   */
  pushEnemiesFrom(x: number, y: number, radius: number, force: number, dmg: number): void {
    const rc = this._room;
    const r2 = radius * radius;
    for (const e of [...this.currentRoom.enemies]) {
      const dx = e.x - x;
      const dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue; // csak a sugáron belül
      const d = Math.sqrt(d2) || 1;
      const fall = 1 - Math.min(1, d / radius);          // szélen 0, középen 1
      const push = force * (0.4 + 0.6 * fall);           // közelebb = erősebb lökés
      e.x = clamp(e.x + (dx / d) * push, rc.x + e.r, rc.x + rc.w - e.r);
      e.y = clamp(e.y + (dy / d) * push, rc.y + e.r, rc.y + rc.h - e.r);
      e.hp -= dmg;
      e.flash = 0.1;
      this.addDamage(e.x, e.y - e.r, dmg, { color: '#aef3ff' });
      if (e.hp <= 0) this.killEnemy(e);
    }
    this.particles.spawn(x, y, '#aef3ff', 20, 260, 0.5);
  }

  /** Időlassítás: az ellenfelek és lövedékeik lassabbak `seconds` ideig. */
  slowEnemies(seconds: number): void {
    this.enemySlowT = Math.max(this.enemySlowT, seconds);
  }

  // ---- Kísérők (familiar-rendszer, Wave 4) ----
  /** A blokkoló-légy pozíciója (a játékostól jobbra-fel — „ott van a légy"). */
  private shieldFlyPos(): { x: number; y: number } {
    return { x: this.player.x + 34, y: this.player.y - 34 };
  }

  /** Kísérők frissítése: a keringő orbok folyamatosan sebzik az érintett ellenfelet. */
  private updateFamiliars(dt: number): void {
    const p = this.player;
    this.familiarT += dt;
    if (p.orbitals <= 0) return;
    const ORBIT_R = 88; // keringési sugár (a karaktertől távolabb)
    for (let i = 0; i < p.orbitals; i++) {
      const a = this.familiarT * 3 + (i / p.orbitals) * TAU;
      const ox = p.x + Math.cos(a) * ORBIT_R;
      const oy = p.y + Math.sin(a) * ORBIT_R;
      for (const e of [...this.currentRoom.enemies]) {
        const rr = e.r + 13;
        if (dist2(ox, oy, e.x, e.y) < rr * rr) {
          // fix 1000 sebzés ütközésenként; per-ellenfél utántöltés, hogy egy
          // áthaladás egy találatot adjon (ne minden képkockán üssön)
          if (this.familiarT >= (this.orbitHitAt.get(e) ?? 0)) {
            e.hp -= 1000;
            e.flash = 0.1;
            this.addDamage(e.x, e.y - e.r, 1000, { color: '#cfe8ff' });
            this.orbitHitAt.set(e, this.familiarT + 0.45);
            if (e.hp <= 0) this.killEnemy(e);
          }
        }
      }
    }
  }

  /** Kísérők kirajzolása (keringő orbok + blokkoló légy). */
  private drawFamiliars(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (!p.alive) return;
    const ORBIT_R = 88; // keringési sugár (a karaktertől távolabb)
    for (let i = 0; i < p.orbitals; i++) {
      const a = this.familiarT * 3 + (i / p.orbitals) * TAU;
      const ox = p.x + Math.cos(a) * ORBIT_R;
      const oy = p.y + Math.sin(a) * ORBIT_R;
      // bumeráng/hold alakú pörgő kés (hold-acél, kék ragyogás)
      const sz = 13;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(this.familiarT * 7 + (i / p.orbitals) * TAU); // pörgés
      ctx.shadowColor = 'rgba(150,220,255,0.9)';
      ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(-sz, 0, sz, 0);
      g.addColorStop(0, '#dbe7f2');
      g.addColorStop(0.5, '#9fb3c8');
      g.addColorStop(1, '#6f8198');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#41506a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -sz);                          // felső hegy
      ctx.quadraticCurveTo(sz * 1.15, 0, 0, sz);   // külső él → alsó hegy
      ctx.quadraticCurveTo(sz * 0.32, 0, 0, -sz);  // belső holdsarló-vájat vissza
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      // éles belső perem csillanása
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 0.86);
      ctx.quadraticCurveTo(sz * 0.34, 0, 0, sz * 0.86);
      ctx.stroke();
      ctx.restore();
    }
    if (p.shieldFly) {
      const f = this.shieldFlyPos();
      const flap = Math.sin(this.familiarT * 34); // gyors szárnycsapás
      ctx.save();
      ctx.translate(f.x, f.y);
      // áttetsző, rebbenő szárnyak (a test mögött)
      ctx.fillStyle = 'rgba(205,228,255,0.45)';
      ctx.strokeStyle = 'rgba(120,160,210,0.6)';
      ctx.lineWidth = 1;
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.rotate(sgn * (0.55 + flap * 0.35));
        ctx.beginPath();
        ctx.ellipse(sgn * 8, -6, 9, 4.2, sgn * 0.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // vékony lábak
      ctx.strokeStyle = '#1d3050';
      ctx.lineWidth = 1;
      for (const sgn of [-1, 1]) {
        for (const ly of [2, 6]) {
          ctx.beginPath();
          ctx.moveTo(sgn * 2, ly);
          ctx.lineTo(sgn * 7, ly + 4);
          ctx.stroke();
        }
      }
      // tor + potroh (sötét acélkék, két szegmens) — halk kék ragyogással
      ctx.shadowColor = 'rgba(120,180,255,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#33507e';
      ctx.strokeStyle = '#1d3050';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 4, 4.6, 6.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); // potroh
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(0, -2.5, 5, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); // tor
      // fej + nagy vörös összetett szemek
      ctx.fillStyle = '#28405f';
      ctx.beginPath(); ctx.arc(0, -8, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff5a4a';
      ctx.beginPath(); ctx.arc(-2.2, -9, 1.9, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.2, -9, 1.9, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(-2.8, -9.6, 0.7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(1.6, -9.6, 0.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // ---- Lerakható bombák ----
  private placeBomb(type: BombType): void {
    const p = this.player;
    if (type === 'tnt') {
      if (p.tnt <= 0) return;
      p.tnt--;
    } else {
      if (p.bombs <= 0) return;
      p.bombs--;
    }
    this.bombs.push(new Bomb(p.x, p.y, type));
    this.audio.bombDrop();
  }

  private explode(b: Bomb): void {
    this.audio.boom();
    this.addShake(b.type === 'tnt' ? 18 : 11);
    this.particles.spawn(b.x, b.y, '#ff8a3a', 30, 360, 0.6);
    this.particles.spawn(b.x, b.y, '#ffd36a', 16, 280, 0.5);
    this.particles.spawn(b.x, b.y, '#777777', 18, 200, 0.7);

    const r2 = b.r * b.r;
    // ellenfelek a sugáron belül
    for (const e of [...this.currentRoom.enemies]) {
      if (dist2(e.x, e.y, b.x, b.y) <= r2) {
        e.hp -= b.dmg;
        e.flash = 0.12;
        this.addDamage(e.x, e.y - e.r, b.dmg, { color: '#ffb15a' });
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
    // tárgyak szétrobbantása a robbanás körüli cellákban (a víz megmarad).
    // TNT: 3×3 blokk; bomba: csak a + alak (a robbanás cellája + 4 szomszéd).
    this.collision.destroyObstaclesAround(b.x, b.y, b.type === 'tnt' ? 1.5 : 1.1);
    // a játékost is sebzi, ha a sugáron belül van (SAJÁT bomba → fix, nem skálázódik)
    if (this.player.alive && dist2(this.player.x, this.player.y, b.x, b.y) <= r2) {
      this.damagePlayer(HP.heart, 'hurt', true);
    }
  }


  // ---- Kullancsok (felmászott élősködők) ----
  /** A felmászott kullancsokat leveszi a szobából és a játékosra teszi (megmarad szobák között). */
  private collectAttachedTicks(): void {
    const arr = this.currentRoom.enemies;
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i]!;
      if (e instanceof Enemy && e.kind === 'tick' && e.tickAttached) {
        arr.splice(i, 1);
        this.player.attachedTicks.push(0);
        this.particles.spawn(this.player.x, this.player.y, '#7a3a3a', 10, 140, 0.4);
        this.addFloater(this.player.x, this.player.y - 26, 'a tick latched on!', '#c86a6a');
        this.audio.hitEnemy();
      }
    }
  }

  /**
   * Léptetők: minden felmászott kullancs 120 mp-enként harap egy fél szívet.
   * A második harapás (240 mp) után a kullancs megsemmisül (összesen 1 szív).
   */
  private updateAttachedTicks(dt: number): void {
    const ticks = this.player.attachedTicks;
    for (let i = ticks.length - 1; i >= 0; i--) {
      const before = ticks[i]!;
      const after = before + dt;
      ticks[i] = after;
      const bites = Math.floor(after / 120);
      if (bites > Math.floor(before / 120)) {
        this.tickBite();
        if (bites >= 2) {
          // a második harapás után jóllakott, leesik és megsemmisül
          ticks.splice(i, 1);
          this.particles.spawn(this.player.x, this.player.y, '#7a3a3a', 8, 130, 0.4);
        }
      }
    }
  }

  /** Kullancs-harapás: 1 sebzés (a sebezhetetlenséget megkerüli — lassú vérszívás). */
  private tickBite(): void {
    const p = this.player;
    if (!p.alive || this._cheats.invincible) return;
    p.hp -= HP.half;
    this.addShake(5);
    this.audio.hurt();
    this.particles.spawn(p.x, p.y, '#aa3a3a', 12, 150, 0.45);
    this.addFloater(p.x, p.y - 22, 'tick −1', '#d05a5a');
    if (p.hp <= 0) this.killPlayer();
  }

  /** A felmászott kullancsok kirajzolása a játékos testén (idővel teleszívják magukat). */
  private drawAttachedTicks(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (!p.alive) return;
    const ticks = p.attachedTicks;
    const time = performance.now() / 1000;
    for (let i = 0; i < ticks.length; i++) {
      const a = (i / Math.max(1, ticks.length)) * TAU + 0.7;
      const px = p.x + Math.cos(a) * p.r * 0.72;
      const py = p.y + Math.sin(a) * p.r * 0.72;
      const fill = (ticks[i]! % 120) / 120; // 0..1 a következő harapásig
      drawEnemy(ctx, {
        kind: 'tick',
        x: px,
        y: py,
        r: 6 + fill * 4, // teleszívja magát a harapás előtt
        col: fill < 0.5 ? '#6b5a4a' : '#9a3a3a', // sötétedik/vörösödik
        col2: '#241410',
        flash: false,
        bob: time * 4 + i,
        wob: time * 8 + i,
        face: a + Math.PI, // a feje a játékos teste felé fordul
        moving: false,
      });
    }
  }

  // ---- Frissítés ----
  update(dt: number): void {
    if (this.hub) { this.updateHub(dt); return; } // hub: harc nélküli mód-választó
    this.computeRoom();
    this.collision.indexEnemies(); // ellenfél-térrács erre a frame-re (lövedék-broad-phase)
    this.runStats.tick(dt);
    if (this.transition > 0) this.transition -= dt;
    if (this.enemyFreezeT > 0) this.enemyFreezeT -= dt;

    // Csalások: kivégzés (Szóköz → minden ellenfél) + max arany (folyamatos feltöltés)
    if (this._cheats.execute && this.input.isDown(' ')) {
      const enemies = [...this.currentRoom.enemies];
      for (const e of enemies) this.killEnemy(e);
    }
    if (this._cheats.maxGold) this.player.coins = CHEAT_MAX_GOLD;

    this.player.update(dt, this);
    this.updateFamiliars(dt); // keringő orbok sebzése (Wave 4)

    // aktív skill (E) + robbanószer lerakás (T = TNT, B = bomba)
    // E-gomb: a szerencse-szobában az oltárt/rúnát működteti, egyébként az aktív skillt.
    if (this.input.consumeSkill()) { if (!this.tryAltarAction()) this.useSkill(); }
    if (this.input.consumeTnt()) this.placeBomb('tnt');
    if (this.input.consumeBomb()) this.placeBomb('bomb');

    // bombák fuse + robbanás
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i]!;
      b.update(dt);
      if (b.fuse <= 0) {
        this.explode(b);
        this.bombs.splice(i, 1);
      }
    }

    // ellenfél-lassítás (Időlassítás skill)
    if (this.enemySlowT > 0) this.enemySlowT = Math.max(0, this.enemySlowT - dt);
    const slowF = this.enemySlowT > 0 ? 0.4 : 1;

    // könnycseppek
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const t = this.tears[i]!;
      t.update(dt, this);
      if (t.dead) this.tears.splice(i, 1);
    }

    // ellenség-lövedékek
    const rc = this._room;
    for (let i = this.ebullets.length - 1; i >= 0; i--) {
      const b = this.ebullets[i]!;
      b.x += b.vx * dt * slowF;
      b.y += b.vy * dt * slowF;
      b.life -= dt;
      if (b.life <= 0 || b.x < rc.x || b.x > rc.x + rc.w || b.y < rc.y || b.y > rc.y + rc.h || this.isBlocked(b.x, b.y)) {
        if (b.poison) this.addHazard('poison', b.x, b.y, 30, rand(5, 8)); // a köpés becsapódik → tócsa
        this.ebullets.splice(i, 1);
        continue;
      }
      // blokkoló-légy: irányított pajzs a légy FELŐLI oldalon. Elnyeli (a) a légyet
      // közvetlenül érő, vagy (b) a légy irányából a játékos közelébe érkező,
      // befelé tartó lövedéket — így tényleg „onnan" véd, nem csak egy pontban.
      if (this.player.shieldFly) {
        const f = this.shieldFlyPos();
        const px = this.player.x, py = this.player.y;
        let blocked = dist2(b.x, b.y, f.x, f.y) < (b.r + 20) ** 2; // (a) közvetlen érintés
        if (!blocked && dist2(b.x, b.y, px, py) < 78 * 78) {        // (b) a játékos közelében…
          const toFly = Math.atan2(f.y - py, f.x - px);
          const toBul = Math.atan2(b.y - py, b.x - px);
          let da = Math.abs(toBul - toFly);
          if (da > Math.PI) da = TAU - da;
          const approaching = b.vx * (px - b.x) + b.vy * (py - b.y) > 0; // a játékos felé tart
          if (da < 0.7 && approaching) blocked = true;               // …a légy szektorából, befelé
        }
        if (blocked) {
          this.particles.spawn(b.x, b.y, '#7fc4ff', 8, 140, 0.35);
          this.audio.hitEnemy();
          this.ebullets.splice(i, 1);
          continue;
        }
      }
      const rr = b.r + this.player.r * 0.7;
      if (this.player.alive && dist2(b.x, b.y, this.player.x, this.player.y) < rr * rr) {
        this.damagePlayer(HP.half, b.poison || b.slow ? 'acid' : 'hurt');
        this.particles.spawn(b.x, b.y, b.poison || b.slow ? '#bfff6a' : '#ff8a6a', 6, 120, 0.3);
        if (b.poison) this.addHazard('poison', b.x, b.y, 30, rand(5, 8));
        // gáz-lövedék: a SZOBA végéig -50% sebesség (a 9999 mp-et a szobaváltás törli)
        if (b.slow) {
          this.player.applySlow(0.5, 9999);
          this.addFloater(this.player.x, this.player.y - 22, 'SLOW −50%', '#9fdf4a');
        }
        this.ebullets.splice(i, 1);
      }
    }

    // ellenfelek (a tömb nem módosul itt — csak könnycsepp/halál módosítja)
    // a szobába lépés utáni türelmi idő alatt mozdulatlanok maradnak
    if (this.enemyFreezeT <= 0) {
      // Másolaton iterálunk: egy ellenfél a DoT-tól meghalhat (öneltávolítás
      // közben). A frame-enkénti tömb-spread helyett újrahasznosított puffer →
      // nincs képkockánkénti allokáció.
      const enemies = this.currentRoom.enemies;
      const scratch = this.enemyScratch;
      scratch.length = 0;
      for (let i = 0; i < enemies.length; i++) scratch.push(enemies[i]!);
      for (let i = 0; i < scratch.length; i++) scratch[i]!.update(dt * slowF, this);
      scratch.length = 0;
    }

    // felmászott kullancsok: leszedjük a szobából a játékosra, és léptetjük az óráikat
    this.collectAttachedTicks();
    this.updateAttachedTicks(dt);

    // talaj-veszélyek (méreg / tűz / köd / akna)
    this.hazards.update(dt);

    // pickupok
    const room = this.currentRoom;
    for (let i = room.pickups.length - 1; i >= 0; i--) {
      const pk = room.pickups[i]!;
      pk.update(dt);
      if (this.player.alive && dist2(pk.x, pk.y, this.player.x, this.player.y) < (this.player.r + 12) ** 2) {
        if (pk.type === 'heart') {
          if (this.player.hp < this.player.maxHp) {
            this.player.hp = clamp(this.player.hp + HP.heart, 0, this.player.maxHp);
            this.audio.pickup();
            this.addFloater(pk.x, pk.y - 16, '+♥', '#ff5b6a');
            room.pickups.splice(i, 1);
          }
        } else if (pk.type === 'tnt') {
          this.player.tnt++;
          this.audio.pickup();
          this.addFloater(pk.x, pk.y - 16, '+TNT', '#ff7b5a');
          room.pickups.splice(i, 1);
        } else if (pk.type === 'bomb') {
          this.player.bombs++;
          this.audio.pickup();
          this.addFloater(pk.x, pk.y - 16, '+bomb', '#cfcfd6');
          room.pickups.splice(i, 1);
        } else {
          this.player.coins++;
          this.score += 25;
          this.audio.pickup();
          this.addFloater(pk.x, pk.y - 16, '+1¢', '#ffd36a');
          room.pickups.splice(i, 1);
        }
      }
    }

    // ingyenes tárgy-pedesztál (a szerencse-szobában)
    if (room.pedestal && !room.pedestal.taken) this.updatePedestal(room.pedestal, dt);

    // szerencse-bolt: standok (vásárlás megerősítő ablakkal) + oltár animáció
    if (room.shop) this.updateShop(room.shop, dt);

    // szoba kipucolva?
    if (!room.cleared && room.enemies.length === 0) {
      room.cleared = true;
      this.runStats.roomsCleared++;
      this.audio.door();
      this.chargeSkill();
      if (room.type === 'boss') {
        this.trapdoor = { x: this.cx, y: this.cy, bob: 0 };
        this.addFloater(this.cx, this.cy - 60, 'BOSS DEFEATED!', '#ff7b4d');
        this.score += 500;
        // Az első legyőzött boss a futásban → Sentex narrációja.
        if (!this.firstBossVoicePlayed) {
          this.firstBossVoicePlayed = true;
          this.audio.playVoice('sentex');
        }
      } else if (Math.random() < roomDropChance() + this.player.luck * TUNING.luckRoomDrop) {
        // szobánként legfeljebb egy pickup, az esély a dropConfig nettóiból (szerencse növeli)
        this.dropPickup(this.cx, this.cy);
      }
    }

    // ajtó-rács animáció: kipucolt szobánál felhúzódik, egyébként zárva marad
    this.doorT += ((room.cleared ? 1 : 0) - this.doorT) * Math.min(1, dt * 9);

    // csapóajtó a következő szintre
    if (this.trapdoor) {
      this.trapdoor.bob += dt * 3;
      if (dist2(this.trapdoor.x, this.trapdoor.y, this.player.x, this.player.y) < (this.player.r + 16) ** 2) {
        // szint-teljesítés bónusz: mélységgel skálázva (mélyebb = több)
        this.score += 100 * this.floor;
        // szint-tisztítási idő-rekord (a SZÁM stabil → versenyezhető), majd számláló
        recordFloorClear(this.floor, this.runStats.floor);
        this.runStats.floorsCleared++;
        this.nextFloor();
      }
    }

    // labirintus-kapu: rálépve a labirintusba kerülsz (egyszer, amíg le nem lépsz)
    if (room.gate && this.onEnterLabyrinth) {
      const g = this.cellCenter(room.gate.col, room.gate.row);
      const near = dist2(g.x, g.y, this.player.x, this.player.y) < (this.player.r + 18) ** 2;
      if (near) {
        if (this.gateArmed) { this.gateArmed = false; this.onEnterLabyrinth(); }
      } else {
        this.gateArmed = true;
      }
    }

    // részecskék + lebegő szövegek + képernyőrázás lecsengése
    this.particles.update(dt);
    this.fx.update(dt);

    // dinamikus zene: élő ellenfél = harc (a labirintusban is, ahol a `cleared` mást jelent)
    const inCombat = this.currentRoom.enemies.length > 0;
    this.audio.setMusicScene(inCombat ? 1 : 0, inCombat && this.currentRoom.type === 'boss');

    // labirintus: a kijárat elérése → rövid „teljesítve" felvillanás, majd kilépés
    if (this.labyrinth) {
      const TILE = ROOM.TILE;
      const ex = (this.labyrinth.exit.col + 0.5) * TILE;
      const ey = (this.labyrinth.exit.row + 0.5) * TILE;
      if (this.labWon) {
        this.labWinTimer += dt;
        if (this.labWinTimer > 1.3) this.exitLabyrinth();
      } else if (dist2(this.player.x, this.player.y, ex, ey) < (TILE * 0.55) ** 2) {
        this.labWon = true;
        this.score += 100 * this.floor; // teljesítés-bónusz (mint a csapóajtónál)
        // labirintus-idő rekord (fejezetenként stabil → versenyezhető), majd számláló
        recordLabClear(this.labChapterId, this.runStats.lab);
        this.runStats.labsCleared++;
        this.audio.door();
      } else if (this.player.alive && (this.labTimeLeft -= dt) <= 0) {
        // lejárt a visszaszámláló: a futás véget ér (mintha elesett volna)
        this.labTimeLeft = 0;
        this.killPlayer();
      }
    }
  }

  /** Csak a háttér- és effektrétegek frissítése (szünet/menü alatt). */
  updateAmbient(dt: number): void {
    this.computeRoom();
    this.particles.update(dt);
    this.fx.tickShake(dt);
  }

  /**
   * Hub-terem frissítése: játékos-mozgás (fal-ütközéssel, ajtó/szobaváltás
   * NÉLKÜL — lásd hasNeighbor) + a portál-közelség kezelése. NYITOTT portálra
   * lépve a Game indítja a módot; ZÁRT portál „hamarosan" jelzést ad. A
   * `hubArmed` biztosítja, hogy lelépésig egyszer süljön el.
   */
  private updateHub(dt: number): void {
    this.computeRoom();
    this.player.update(dt, this);
    this.particles.update(dt);
    // lebegő szövegek lecsengése (a „hamarosan" jelzés) + képernyőrázás
    this.fx.update(dt);
    this.audio.setMusicScene(0); // hub: nyugodt drone (nincs harc)

    let near = false;
    for (const p of this.hub!) {
      const c = this.cellCenter(p.col, p.row);
      if (dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2) {
        near = true;
        if (this.hubArmed) {
          this.hubArmed = false;
          if (p.locked) {
            this.addFloater(c.x, c.y - 38, 'COMING SOON', '#cdbb9a');
            this.audio.denied();
          } else {
            this.audio.stairs();
            this.onHubChoice?.(p.id);
          }
        }
        break;
      }
    }
    if (!near) this.hubArmed = true; // lelépett minden portálról → újra élesedik
  }

  private computeRoom(): void {
    // a pálya-doboz mérete (a normál szobáé) — a labirintus is EBBEN görget
    const w = Math.min(this.engine.width - 2 * ROOM.WALL - 40, ROOM.MAX_W);
    const h = Math.min(this.engine.height - 2 * ROOM.WALL - 110, ROOM.MAX_H);
    const bx = (this.engine.width - w) / 2;
    const by = (this.engine.height - h) / 2;

    if (this.labyrinth) {
      // labirintus: a `_room` a maze-VILÁG (0,0-tól), a kamera a dobozon belül görget
      const TILE = ROOM.TILE;
      const mazeW = this.labyrinth.W * TILE;
      const mazeH = this.labyrinth.H * TILE;
      this._room.x = 0;
      this._room.y = 0;
      this._room.w = mazeW;
      this._room.h = mazeH;
      this.labBox.x = bx;
      this.labBox.y = by;
      this.labBox.w = w;
      this.labBox.h = h;
      // kamera a játékosra, a maze-re vágva (kisebb tengelyen a dobozban középre)
      this.labCamX = mazeW <= w ? (mazeW - w) / 2 : clamp(this.player.x - w / 2, 0, mazeW - w);
      this.labCamY = mazeH <= h ? (mazeH - h) / 2 : clamp(this.player.y - h / 2, 0, mazeH - h);
      return;
    }

    this._room.w = w;
    this._room.h = h;
    this._room.x = bx;
    this._room.y = by; // függőlegesen középen (a méret változatlan)
  }

  // ---- Rács / akadályok ----
  cellCenter(col: number, row: number): { x: number; y: number } {
    const rc = this._room;
    return {
      x: rc.x + (col + 0.5) * (rc.w / GRID.W),
      y: rc.y + (row + 0.5) * (rc.h / GRID.H),
    };
  }

  cellRect(col: number, row: number): Rect {
    const rc = this._room;
    const cw = rc.w / GRID.W;
    const ch = rc.h / GRID.H;
    return { x: rc.x + col * cw, y: rc.y + row * ch, w: cw, h: ch };
  }

  // ---- Ütközés/geometria → CollisionSystem (facade; az entitások ezeket hívják) ----
  /** Sugár–akadály távolság (lásd CollisionSystem). */
  rayObstacleDistance(x: number, y: number, ang: number, maxLen: number): number {
    return this.collision.rayObstacleDistance(x, y, ang, maxLen);
  }

  /** Igaz, ha a pont tömör tárgyon van (könny/lövedék-vágáshoz, látáshoz). */
  isBlocked(x: number, y: number): boolean {
    return this.collision.isBlocked(x, y);
  }

  /** Könnycsepp becsapódott (lásd CollisionSystem) — törhető láda sebzése/szétlövése is. */
  shotHitObstacle(x: number, y: number, dmg: number): boolean {
    return this.collision.shotHitObstacle(x, y, dmg);
  }

  /** Kör alakú entitás kitolása a tömör tárgyakból / labirintus-falból (lásd CollisionSystem). */
  resolveCircle(o: { x: number; y: number; r: number }): void {
    this.collision.resolveCircle(o);
  }

  // ---- Kirajzolás ----
  render(ctx: CanvasRenderingContext2D): void {
    if (this.hub) { this.renderHub(ctx); return; }
    if (this.labyrinth) { this.renderLabyrinth(ctx); return; }
    ctx.save();
    if (this.fx.shake > 0) ctx.translate(rand(-this.fx.shake, this.fx.shake) * 0.5, rand(-this.fx.shake, this.fx.shake) * 0.5);

    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    this.drawRoom(ctx);
    this.drawObstacles(ctx);
    this.hazards.draw(ctx);
    this.particles.draw(ctx);

    const room = this.currentRoom;
    for (const pk of room.pickups) pk.draw(ctx);
    if (room.shop) room.shop.draw(ctx);
    if (room.pedestal && !room.pedestal.taken) room.pedestal.draw(ctx);
    if (room.gate) this.drawGate(ctx, room.gate);
    if (room.dungeonGate) this.drawDungeonGate(ctx, room.dungeonGate);
    if (this.trapdoor) this.drawTrapdoor(ctx);
    this.drawProjectileGlow(ctx);
    for (const bomb of this.bombs) bomb.draw(ctx);

    const bulletT = performance.now() / 1000;
    for (const b of this.ebullets) drawBullet(ctx, b, bulletT);
    ctx.shadowBlur = 0;

    for (const e of room.enemies) e.draw(ctx);
    for (const t of this.tears) t.draw(ctx);
    if (this.player.alive) this.player.draw(ctx);
    this.drawFamiliars(ctx); // keringő orbok + blokkoló légy (Wave 4)
    this.drawAttachedTicks(ctx); // a játékoson ülő kullancsok

    // szoba-méretű légköri animáció (eső/köd/szél…) az entitások fölött
    if (room.anim) room.anim(ctx, this._room, performance.now() / 1000);

    // ködfelhők az entitások fölött (ténylegesen eltakarják, ami alattuk van)
    this.hazards.drawFog(ctx);

    // 2D fény-térkép: ambient sötétség + dinamikus lámpák (multiply) — a látótáv
    // (sight) most a játékos-fáklya sugarát skálázza, így ez a régi drawFog-ot is kiváltja
    this.applyLighting(ctx);

    // lebegő szövegek
    this.fx.draw(ctx);

    // teszt-aréna: minden (nem-boss) ellenfél fölött a TÉNYLEGES sebzése
    if (this.sandbox) this.drawSandboxLabels(ctx);

    ctx.restore();

    if (this.transition > 0) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(this.transition * 3, 0, 0.6)})`;
      ctx.fillRect(0, 0, this.engine.width, this.engine.height);
    }
  }

  /**
   * Teszt-aréna: a nem-boss ellenfelek bal felső sarkába a mélységgel skálázott
   * TÉNYLEGES érintés-sebzés (pontban) — így az admin-kártya bázisához képest
   * azonnal látszik, mennyit üt valójában az aktuális szinten. A bossok fix
   * sebzésűek (nem skálázódnak), ezért rájuk nem írunk.
   */
  private drawSandboxLabels(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#ff9a7a';
    for (const e of this.currentRoom.enemies) {
      if (!(e instanceof Enemy) || e.dmg <= 0) continue;
      const actual = scaleIncomingDamage(e.dmg * HP.half, this.floor);
      ctx.fillText(`${actual}`, e.x - e.r, e.y - e.r - 2);
    }
    ctx.restore();
  }

  /** Lebegő szövegek (sebzésszámok + értesítők) — világ-koordinátában rajzolva. */
  // ---- Hub (mód-választó) kirajzolása ----
  /**
   * Hub-render: egyetlen, normál méretű terem (ajtók nélkül), középen a rúna-
   * glyph + játékos, a négy fal felé egy-egy portál. A zárt portálokra lakat-
   * fátyol kerül. A teljes-képernyős látótáv-sötétséget (drawFog) SZÁNDÉKOSAN
   * kihagyjuk, hogy mind a négy portál látszódjon.
   */
  private renderHub(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.fx.shake > 0) ctx.translate(rand(-this.fx.shake, this.fx.shake) * 0.5, rand(-this.fx.shake, this.fx.shake) * 0.5);

    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    const rc = this._room;
    const W = ROOM.WALL;
    const th = this._theme;

    // padló (gyorsítótárból) + szél-árnyalat
    this.drawCachedFloor(ctx);
    const g = ctx.createRadialGradient(this.cx, this.cy, rc.h * 0.2, this.cx, this.cy, rc.w * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${th.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);

    // falak (AJTÓK nélkül — a hub zárt terem)
    ctx.fillStyle = th.wall;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y + rc.h, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y, W, rc.h);
    ctx.fillRect(rc.x + rc.w, rc.y, W, rc.h);
    ctx.strokeStyle = th.wallEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(rc.x - 2, rc.y - 2, rc.w + 4, rc.h + 4);
    ctx.fillStyle = th.wallTop;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, 5);

    // középső rúna-glyph (a játékos „leszúrási pontja")
    drawHubGlyph(ctx, this.cx, this.cy, th.accent);
    this.particles.draw(ctx);

    // portálok
    const t = performance.now() / 1000;
    for (const p of this.hub!) {
      const c = this.cellCenter(p.col, p.row);
      drawHubPortal(ctx, c.x, c.y, th.accent, p.id, p.locked, t);
    }

    if (this.player.alive) this.player.draw(ctx);

    drawHubTitle(ctx, this.engine.width / 2, Math.max(16, this._room.y - ROOM.WALL - 34));
    this.fx.draw(ctx);

    ctx.restore();
  }

  /**
   * Labirintus-render: a pálya-dobozra (labBox) vágva, a kamerával eltolva rajzol.
   * A világ (padló + falak + ELLENFELEK/LÖVEDÉKEK/JÁTÉKOS — a teljes motor) a maze
   * koordináta-rendszerében él; a translate teszi a képernyőre. A sötétség, a keret
   * és az overlay utána, képernyő-térben.
   */
  private renderLabyrinth(ctx: CanvasRenderingContext2D): void {
    const lab = this.labyrinth!;
    const th = this._theme;
    const TILE = ROOM.TILE;
    const box = this.labBox;
    const camX = this.labCamX;
    const camY = this.labCamY;
    const mazeW = lab.W * TILE;
    const mazeH = lab.H * TILE;

    ctx.fillStyle = '#0e0b14';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    ctx.save();
    if (this.fx.shake > 0) ctx.translate(rand(-this.fx.shake, this.fx.shake) * 0.5, rand(-this.fx.shake, this.fx.shake) * 0.5);
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    const ox = Math.round(box.x - camX);
    const oy = Math.round(box.y - camY);
    ctx.translate(ox, oy);

    drawFloorTiles(ctx, { x: 0, y: 0, w: mazeW, h: mazeH }, th);

    const c0 = Math.max(0, Math.floor(camX / TILE));
    const c1 = Math.min(lab.W - 1, Math.floor((camX + box.w) / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(lab.H - 1, Math.floor((camY + box.h) / TILE));
    drawLabWalls(ctx, th, c0, c1, r0, r1, (col, row) => this.collision.labWallCell(col, row));
    drawLabExit(ctx, lab.exit.col, lab.exit.row, th.accent);

    // entitások — a teljes motor, világ-koordinátában (ezért működik a harc)
    this.hazards.draw(ctx);
    this.particles.draw(ctx);
    const room = this.currentRoom;
    for (const pk of room.pickups) pk.draw(ctx);
    this.drawProjectileGlow(ctx);
    for (const bomb of this.bombs) bomb.draw(ctx);
    const bulletT = performance.now() / 1000;
    for (const b of this.ebullets) drawBullet(ctx, b, bulletT);
    ctx.shadowBlur = 0;
    for (const e of room.enemies) e.draw(ctx);
    for (const t of this.tears) t.draw(ctx);
    if (this.player.alive) this.player.draw(ctx);
    this.drawFamiliars(ctx);
    this.drawAttachedTicks(ctx);
    this.hazards.drawFog(ctx);
    this.fx.draw(ctx);

    ctx.restore();

    // 2D fény-térkép (lámpa mód) a labirintusban is: ugyanaz a sötétség + a
    // játékos-fáklya (a `sight` skálázza a sugarát), mint a normál pályán. A
    // kamera-eltolást (ox,oy) átadjuk, és a pálya-dobozra vágjuk. Egyszerű kör-
    // fény (nincs maze-fal árnyékvetés), de a sötétség és a látótáv azonos.
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    this.applyLighting(ctx, ox, oy, true);
    ctx.restore();

    drawLabFrame(ctx, box, th);
    drawLabOverlay(ctx, box, this.labWon);
  }

  /** Finom additív fénykör a lövedékekre/könnyekre/bombákra (a látótáv-sötétség változatlan). */
  private drawProjectileGlow(ctx: CanvasRenderingContext2D): void {
    if (this.tears.length === 0 && this.ebullets.length === 0 && this.bombs.length === 0) return;
    const pulse = 0.82 + 0.18 * Math.sin(performance.now() / 110);
    withGlow(ctx, () => {
      for (const t of this.tears) drawGlow(ctx, t.x, t.y, t.r * 3.4, t.color, 0.5 * pulse);
      for (const b of this.ebullets) {
        const col = b.poison || b.slime ? '#bfff6a' : b.slow ? '#9fdf4a' : '#ff8a5a';
        drawGlow(ctx, b.x, b.y, (b.r + 4) * 2.6, col, 0.42 * pulse);
      }
      for (const bomb of this.bombs) drawGlow(ctx, bomb.x, bomb.y, 30, '#ff7b3a', 0.32 * pulse);
    });
  }

  /**
   * 2D fény-térkép összeállítása és kitétele: a játékos-fáklya (a `sight` skálázza
   * a sugarát), a lövedékek, a bombák és a tűz/láva-veszélyek mint dinamikus
   * lámpák. A megvilágítatlan rész az ambient felé sötétedik (multiply) — ez adja
   * a mélységet. A `LightingSystem` egy offscreen buffert + gyorsítótárazott
   * fény-bélyegzőket használ, így a forró úton nincs gradiens-allokáció.
   */
  private applyLighting(ctx: CanvasRenderingContext2D, offX = 0, offY = 0, simple = false): void {
    const lt = this.lighting;
    lt.begin();
    const p = this.player;
    const mode = this.shadowMode;
    lt.quality = mode === 'soft' ? 0.5 : 1; // lágy = fél-felbontású, simított perem
    // a háttér-sötétség (árnyék) is kövesse a látótávot, ne csak a lámpa sugara:
    // több sight → világosabb árnyék is (egységes, perk-tudatos megvilágítás), így
    // egy látótáv-perk nem csak egy nagyobb fénybuborékot ad koromsötétben.
    lt.ambient = clamp(0.5 + (p.sight - 1) * 0.42, 0.3, 0.82);
    if (p.alive) {
      const torchR = 280 * clamp(p.sight, 0.4, 1.4);
      // `simple`: kör-fény árnyékvetés nélkül (a labirintus ezt használja, mert a
      // takaró-rendszer a normál szobához készült, nem a maze-falakhoz).
      if (mode === 'off' || simple) {
        // nincs árnyékvetés: a fáklya sima kör-fény. Kihagyjuk a láthatóság-
        // számítást (a legdrágább, képkockánkénti lépést) → gyenge gépen olcsó.
        lt.add(p.x + offX, p.y + offY, torchR, '#ffdca6', 1);
      } else {
        // a fényt a látható-poligonra vágjuk → a tárgyak mögött árnyék
        this.rebuildOccluders();
        // A szögseprés a legdrágább lépés, ezért gyorsítótárazzuk: csak akkor
        // számoljuk újra, ha a player a küszöbnél többet mozdult, vagy a
        // szoba/akadályok változtak. Álló/célzó playernél (harc közben gyakori)
        // így ingyenes. A pár pixeles eltérést a fáklya lágy pereme elnyeli.
        const SWEEP_EPS2 = 9; // (3 px)² — ennél kisebb elmozdulásra az előző poligon marad
        const moved2 = (p.x - this.sweepX) ** 2 + (p.y - this.sweepY) ** 2;
        if (this.occluderKey !== this.sweepKey || moved2 > SWEEP_EPS2 || this.torchPoly.length < 6) {
          // csak a fáklya hatósugarán belüli tárgyak kerülnek a sweepbe (a többi
          // árnyéka úgyis sötétbe esne) — a láthatóság-számítás (négyzetes a
          // szakaszszámmal) így nem hízik el sok akadálynál.
          const active = this.activeOccluders;
          active.length = 0;
          for (const s of this.roomBox) active.push(s);
          for (const sh of this.occShapes) {
            const dx = p.x - sh.cx, dy = p.y - sh.cy, reach = torchR + sh.rad;
            if (dx * dx + dy * dy <= reach * reach) {
              for (const s of sh.segs) active.push(s);
            }
          }
          computeVisibility(p.x, p.y, active, this.torchPoly);
          this.sweepX = p.x; this.sweepY = p.y; this.sweepKey = this.occluderKey;
        }
        lt.setShadowLight(p.x, p.y, torchR, '#ffdca6', 1, this.torchPoly);
      }
    }
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 120);
    for (const t of this.tears) lt.add(t.x + offX, t.y + offY, t.r * 7, t.color, 0.8);
    for (const b of this.ebullets) {
      const col = b.poison || b.slime ? '#bfff6a' : b.slow ? '#9fdf4a' : '#ff9a5a';
      lt.add(b.x + offX, b.y + offY, (b.r + 6) * 4, col, 0.7);
    }
    for (const bomb of this.bombs) lt.add(bomb.x + offX, bomb.y + offY, 85 * pulse, '#ff8a3a', 0.95);
    this.hazards.forEachFire((x, y, r) => lt.add(x + offX, y + offY, r * 2.4 * pulse, '#ff7a2a', 0.85));
    lt.render(ctx, this.engine.width, this.engine.height, this.engine.pixelRatio);
  }

  /** Árnyék-mód állítása a beállításokból (azonnal él + perzisztál). */
  setShadowMode(mode: ShadowMode): void {
    this.shadowMode = mode;
    saveShadowMode(mode);
  }

  /** Képernyőrázás-szorzó (a Beállítások · Grafika csúszkája) — azonnal él + perzisztál. */
  setShakeScale(v: number): void {
    this.fx.setShakeScale(v);
    saveShake(v);
  }
  get shakeScale(): number { return this.fx.shakeScale; }

  /**
   * Az árnyékvetés takaróinak felépítése: a szoba-doboz négy éle + a tömör
   * akadályok sziluettjei (a belérajzolt idomhoz közelítő nyolcszög-talp, lásd
   * occluder.ts). Csak akkor sül újra, ha a szoba vagy a tömör akadályok száma
   * változott (pl. láda szétlövésekor) — különben a gyorsítótárazott alakzatok
   * maradnak; a fáklya-poligon frame-enként ezekből (a közeliekből) számol.
   */
  private rebuildOccluders(): void {
    const room = this.currentRoom;
    const rc = this._room;
    const key = `${room.gx},${room.gy}|${room.obstacles.length}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}`;
    if (key === this.occluderKey) return;
    this.occluderKey = key;
    this.roomBox.length = 0;
    this.pushRectEdges(this.roomBox, rc.x, rc.y, rc.w, rc.h); // a sugarak a falnál állnak meg
    this.occShapes.length = 0;
    for (const o of room.obstacles) {
      if (!OBSTACLES[o.kind].solid) continue;
      this.occShapes.push(buildOccluder(this.cellRect(o.col, o.row), o.kind));
    }
  }

  /** Egy téglalap négy élének hozzáfűzése a takaró-szakaszokhoz. */
  private pushRectEdges(segs: Seg[], x: number, y: number, w: number, h: number): void {
    const x2 = x + w, y2 = y + h;
    segs.push(
      { ax: x, ay: y, bx: x2, by: y },
      { ax: x2, ay: y, bx: x2, by: y2 },
      { ax: x2, ay: y2, bx: x, by: y2 },
      { ax: x, ay: y2, bx: x, by: y },
    );
  }

  /**
   * A statikus padló-réteget (padló + pocsolyák) gyorsítótárból teszi ki: ha a
   * szoba/méret/téma kulcs változott, egyszer újrasüti egy off-screen canvasra,
   * majd frame-enként csak egyetlen `drawImage`. Ez kiváltja a ~280 csempe
   * képkockánkénti újrarajzolását (a render forró útjának fő tétele).
   */
  private drawCachedFloor(ctx: CanvasRenderingContext2D): void {
    const rc = this._room;
    const room = this.currentRoom;
    const dpr = this.engine.pixelRatio;
    const key = `${room.gx},${room.gy}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${this._theme.floor}|${dpr}`;

    if (key !== this.floorCacheKey || !this.floorCache) {
      this.bakeFloor(dpr);
      this.floorCacheKey = key;
    }
    if (this.floorCache) ctx.drawImage(this.floorCache, rc.x, rc.y, rc.w, rc.h);
  }

  /** A padló + pocsolyák egyszeri kirajzolása az off-screen gyorsítótárra. */
  private bakeFloor(dpr: number): void {
    const rc = this._room;
    const cw = Math.max(1, Math.round(rc.w * dpr));
    const ch = Math.max(1, Math.round(rc.h * dpr));
    let cv = this.floorCache;
    if (!cv) { cv = document.createElement('canvas'); this.floorCache = cv; }
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const cctx = cv.getContext('2d');
    if (!cctx) return;
    // A világ-koordinátákat (rc.x,rc.y a bal-felső sarok) a canvas (0,0)-jára
    // toljuk, eszköz-pixel élességgel: a drawFloorTiles/drawPuddles abszolút
    // koordinátákkal dolgozik, így változatlanul újrahasználható.
    cctx.setTransform(dpr, 0, 0, dpr, -rc.x * dpr, -rc.y * dpr);
    cctx.clearRect(rc.x, rc.y, rc.w, rc.h);
    drawFloorTiles(cctx, rc, this._theme);
    drawPuddles(cctx, rc, this.currentRoom, (x, y) => this.isBlocked(x, y));
  }

  /**
   * Maradandó vérfoltok — a `floorCache`-hez hasonló GYORSÍTÓTÁRBÓL. A `drawSplats`
   * determinisztikus (a folt pozíciójából hash-elt), így elég egyszer egy
   * off-screen rétegre bélyegezni, és frame-enként csak egy `drawImage`. A réteg a
   * szoba/méret/folt-szám változására sül újra (új ölésnél +1 folt → újrasül).
   */
  private drawCachedSplats(ctx: CanvasRenderingContext2D): void {
    const room = this.currentRoom;
    if (room.splats.length === 0) return; // nincs folt → nincs réteg
    const rc = this._room;
    const dpr = this.engine.pixelRatio;
    const key = `${room.gx},${room.gy}|${room.splats.length}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${dpr}`;
    if (key !== this.splatCacheKey || !this.splatCache) {
      this.bakeSplats(dpr);
      this.splatCacheKey = key;
    }
    if (this.splatCache) ctx.drawImage(this.splatCache, rc.x, rc.y, rc.w, rc.h);
  }

  /** A vérfoltok egyszeri kirajzolása az off-screen splat-gyorsítótárra. */
  private bakeSplats(dpr: number): void {
    const rc = this._room;
    const cw = Math.max(1, Math.round(rc.w * dpr));
    const ch = Math.max(1, Math.round(rc.h * dpr));
    let cv = this.splatCache;
    if (!cv) { cv = document.createElement('canvas'); this.splatCache = cv; }
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const cctx = cv.getContext('2d');
    if (!cctx) return;
    cctx.setTransform(dpr, 0, 0, dpr, -rc.x * dpr, -rc.y * dpr);
    cctx.clearRect(rc.x, rc.y, rc.w, rc.h);
    drawSplats(cctx, this.currentRoom);
  }

  private drawRoom(ctx: CanvasRenderingContext2D): void {
    const rc = this._room;
    const W = ROOM.WALL;
    const th = this._theme;

    if (this.currentRoom.type === 'item') {
      // SZERENCSE-SZOBA: tiszta, díszes padló — nincs kosz/repedés/dekoráció.
      drawLuckFloor(ctx, rc, this.cx, this.cy, performance.now() / 1000);
    } else {
      // ---- procedurális kőpadló ----
      // A padló + pocsolyák statikusak a szobán belül → gyorsítótárból, egyetlen
      // drawImage-dzsel (lásd drawCachedFloor). A foltok/dekoráció ezután élőben,
      // mert azok harc közben változnak / témánként animálnak.
      this.drawCachedFloor(ctx);
      this.drawCachedSplats(ctx);
      drawDecorations(ctx, this.currentRoom, th, (x, y) => this.isBlocked(x, y));

      // szél-árnyalat
      const g = ctx.createRadialGradient(this.cx, this.cy, rc.h * 0.2, this.cx, this.cy, rc.w * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${th.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    }

    // falak
    ctx.fillStyle = th.wall;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y + rc.h, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y, W, rc.h);
    ctx.fillRect(rc.x + rc.w, rc.y, W, rc.h);
    ctx.strokeStyle = th.wallEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(rc.x - 2, rc.y - 2, rc.w + 4, rc.h + 4);
    ctx.fillStyle = th.wallTop;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, 5);

    // ajtók (a rács felhúzottsága a doorT animációs értékből)
    const cx = this.cx;
    const cy = this.cy;
    const doors: Array<[Dir, number, number, number]> = [
      ['N', cx, rc.y, 0],
      ['S', cx, rc.y + rc.h, Math.PI],
      ['W', rc.x, cy, -Math.PI / 2],
      ['E', rc.x + rc.w, cy, Math.PI / 2],
    ];
    for (const [dir, dx, dy, rot] of doors) {
      if (this.dungeon.hasNeighbor(dir)) this.drawDoor(ctx, dx, dy, rot, this.doorT);
    }
  }

  private drawObstacles(ctx: CanvasRenderingContext2D): void {
    const obs = this.currentRoom.obstacles;
    // 1) víz a padlóra, EGY összefüggő folyótestként (az entitások alá kerül)
    const water = obs.filter((o) => o.kind === 'water');
    if (water.length) this.drawWater(ctx, water);
    // 2) tárgyak (alapfajták külön, a TEREPTÁR a közös rajzolón át)
    const t = performance.now() / 1000;
    for (const o of obs) {
      if (o.kind === 'water') continue; // már megrajzoltuk
      else if (o.kind === 'rock') this.drawRockCell(ctx, o);
      else if (o.kind === 'tree') this.drawTreeCell(ctx, o);
      else if (o.kind === 'crate') this.drawCrateCell(ctx, o);
      else if (o.kind === 'luckrock') drawLuckRock(ctx, this.cellRect(o.col, o.row), o.col, o.row, t);
      else drawTerrainObstacle(ctx, o.kind, this.cellRect(o.col, o.row), this._theme, o.col, o.row, t);
    }
  }

  private drawRockCell(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    drawRock(ctx, this.cellRect(o.col, o.row), this._theme, o.col, o.row);
  }

  private drawTreeCell(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    drawTree(ctx, this.cellRect(o.col, o.row), o.col, o.row);
  }

  private drawCrateCell(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    drawCrate(ctx, this.cellRect(o.col, o.row), o.hp);
  }

  /**
   * A víz-cellákat EGY összefüggő folyótestként rajzolja: a cellák uniójára
   * vágva tölti ki a felületet (varratmentes), animált fénytörés-fodrokkal és
   * csillámokkal, majd a szabad széleken partvonalat húz.
   */
  /** A víz-cellák állandó elrendezése (halmaz + téglalapok + burkoló doboz),
   *  szobánként/méretenként gyorsítótárazva — a hullámzás él, ez nem. */
  private waterLayout(cells: Obstacle[]): NonNullable<World['waterCache']> {
    const rc = this._room;
    const room = this.currentRoom;
    const key = `${room.gx},${room.gy}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${cells.length}`;
    if (this.waterCache && this.waterCache.key === key) return this.waterCache;

    const set = new Set(cells.map((o) => `${o.col},${o.row}`));
    const rects = cells.map((o) => ({ o, r: this.cellRect(o.col, o.row) }));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { r } of rects) {
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
    }
    this.waterCache = { key, set, rects, minX, minY, maxX, maxY };
    return this.waterCache;
  }

  private drawWater(ctx: CanvasRenderingContext2D, cells: Obstacle[]): void {
    const t = performance.now() / 1000;
    const layout = this.waterLayout(cells);
    const { set, rects, minX, minY, maxX, maxY } = layout;
    const has = (c: number, r: number): boolean => set.has(`${c},${r}`);
    const W = maxX - minX, H = maxY - minY;

    ctx.save();
    // vágás a víz-cellák uniójára → a folyó egységes felület lesz
    ctx.beginPath();
    for (const { r } of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    // mély-víz alapszín, finom függőleges mélységi árnyalással
    const bg = ctx.createLinearGradient(0, minY, 0, maxY);
    bg.addColorStop(0, '#34708f');
    bg.addColorStop(0.5, '#266079');
    bg.addColorStop(1, '#1b4a60');
    ctx.fillStyle = bg;
    ctx.fillRect(minX, minY, W, H);

    // mozgó fénytörés-fodrok (abszolút koordinátákból → cellák között folytonos)
    const wave = (y: number, amp: number, color: string, lw: number, ph: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = minX; x <= maxX; x += 9) {
        const yy = y + Math.sin(x * 0.045 + t * 1.1 + ph) * amp + Math.sin(x * 0.12 - t * 0.6 + ph) * amp * 0.4;
        if (x === minX) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    };
    for (let i = 0, y = minY + 12; y < maxY; y += 19, i++) {
      wave(y, 2.6, 'rgba(15,48,66,0.35)', 3, i * 0.8);          // árnyék-hullámvölgy
      wave(y - 3, 2.6, 'rgba(173,223,255,0.16)', 1.6, i * 0.8); // világos taraj
    }

    // csillámló napfény-foltok, lassan sodródva
    ctx.fillStyle = 'rgba(214,242,255,0.10)';
    for (let i = 0; i < 10; i++) {
      const gx = minX + (((i * 89.7) + t * 26) % (W + 40)) - 20;
      const gy = minY + ((i * 47.3) % H);
      ctx.beginPath();
      ctx.ellipse(gx, gy, 11, 2.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // ---- partvonal a szabad (víz nélküli szomszédú) éleken ----
    for (const { o, r } of rects) {
      const edge = (x1: number, y1: number, x2: number, y2: number, inset: number, nx: number, ny: number) => {
        // sötét partszél
        ctx.strokeStyle = 'rgba(10,28,40,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // vékony hab-vonal beljebb
        ctx.strokeStyle = 'rgba(200,236,255,0.28)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x1 + nx * inset, y1 + ny * inset);
        ctx.lineTo(x2 + nx * inset, y2 + ny * inset);
        ctx.stroke();
      };
      if (!has(o.col, o.row - 1)) edge(r.x, r.y, r.x + r.w, r.y, 3, 0, 1);
      if (!has(o.col, o.row + 1)) edge(r.x, r.y + r.h, r.x + r.w, r.y + r.h, 3, 0, -1);
      if (!has(o.col - 1, o.row)) edge(r.x, r.y, r.x, r.y + r.h, 3, 1, 0);
      if (!has(o.col + 1, o.row)) edge(r.x + r.w, r.y, r.x + r.w, r.y + r.h, 3, -1, 0);
    }
  }

  /**
   * Ajtó kirajzolása. A `t` (0..1) a rács-kapu felhúzottsága: 0-nál a rács
   * teljesen zárja a nyílást, 1-nél felcsúszott a szemöldökkőbe (nyitva).
   * Köztes értékeknél a rács kifelé (a fal felé) csúszik fel, így animálódik.
   */
  private drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, t: number): void {
    const W = ROOM.WALL;
    const D = ROOM.DOOR;
    const th = this._theme;
    const e = t * t * (3 - 2 * t); // smoothstep easing
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // keret
    ctx.fillStyle = th.doorFrame;
    ctx.fillRect(-D, -W, D * 2, W * 2);
    // nyitott padló-átjáró (háttér; a rács felcsúszva ezt fedi fel)
    ctx.fillStyle = th.doorFloor;
    ctx.fillRect(-D + 6, -W, D * 2 - 12, W * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-D + 6, -4, D * 2 - 12, 8);

    if (e < 0.999) {
      // rács-kapu, a nyílásba vágva, kifelé (-y) felcsúszva e-vel arányosan
      ctx.save();
      ctx.beginPath();
      ctx.rect(-D + 6, -W, D * 2 - 12, W * 2);
      ctx.clip();
      ctx.translate(0, -W * 2 * e);
      ctx.fillStyle = th.doorBar;
      ctx.fillRect(-D + 6, -W + 4, D * 2 - 12, W * 2 - 8);
      ctx.strokeStyle = th.doorBarStroke;
      ctx.lineWidth = 4;
      for (let i = -D + 16; i < D; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, -W + 4);
        ctx.lineTo(i, W - 4);
        ctx.stroke();
      }
      // alsó zárógerenda, hogy a felcsúszás látványos legyen
      ctx.fillStyle = th.doorBarStroke;
      ctx.fillRect(-D + 6, W - 8, D * 2 - 12, 5);
      ctx.restore();
    }
    ctx.restore();
  }

  /** Labirintus-kapu (portál) kirajzolása a rács-pozíciójára. */
  private drawGate(ctx: CanvasRenderingContext2D, gate: { col: number; row: number }): void {
    const c = this.cellCenter(gate.col, gate.row);
    drawGatePortal(ctx, c.x, c.y, 30, this._theme.accent, performance.now() / 1000);
  }

  /** Dungeon-kapu (vasrács-portál) kirajzolása a rács-pozíciójára. */
  private drawDungeonGate(ctx: CanvasRenderingContext2D, gate: { col: number; row: number }): void {
    const c = this.cellCenter(gate.col, gate.row);
    drawDungeonPortal(ctx, c.x, c.y, 30, this._theme.accent, performance.now() / 1000);
  }

  private drawTrapdoor(ctx: CanvasRenderingContext2D): void {
    const td = this.trapdoor!;
    ctx.save();
    ctx.translate(td.x, td.y);
    ctx.fillStyle = '#0a0610';
    ctx.strokeStyle = '#3a2c20';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(160,120,255,${0.3 + 0.2 * Math.sin(td.bob)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#cdaaff';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼', 0, 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}
