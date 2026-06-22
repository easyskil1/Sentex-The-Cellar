import { t as tr } from '../i18n';
import type { Engine } from '../engine/Engine';
import type { AudioManager } from '../engine/Audio';
import type { Input } from '../engine/Input';
import type { IEnemy } from './entities/enemies/Enemy';
import type { Rect, EnemyBullet, Dir, HazardKind, Obstacle } from './types';
import { OBSTACLES } from './types';
import { drawLuckRock, drawTerrainObstacle } from './level/obstacleRender';
import { drawFloorTiles, drawDecorations, drawLuckSpinner } from './level/floorRender';

import { Player } from './entities/Player';
import { Tear } from './entities/Tear';
import type { Ring } from './entities/Ring';
import { Enemy } from './entities/enemies/Enemy';
import { drawEnemy } from './entities/enemies/EnemyRenderer';
import { drawBullet } from './entities/BulletRenderer';
import { BOSS_REGISTRY, BOSS_ORDER, isBossTarget, type BossTarget } from './entities/enemies/bossRegistry';
import { CHAMPION_TRAITS, ENEMY_STATS, type EnemyKind, type ChampionTrait } from './entities/enemies/enemyTypes';
import { Pickup, type PickupType } from './entities/Pickup';
import { Shop, offerView, type ShopStall } from './entities/Shop';
import { BloodAltar, type BloodStand } from './entities/BloodAltar';
import { CurseAltar, type CurseStand } from './entities/CurseAltar';
import { Pedestal } from './entities/Pedestal';
import { rollItem, itemName, itemDesc, type Item } from './content/items';
import { ITEM_SETS, setCount, tierAtExactly } from './content/itemSets';
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
import { loadShadowMode, saveShadowMode, saveShake, loadHitStop, type ShadowMode } from './settings';
import { ROOM, GRID, PLAYER_BASE, HP, LAB_TIMER, BEAM, FLAME, CHARGE, FIOLA, CARD, SECRET, BOSS_RUSH, DUNGEON_RUN, LAB_GAUNTLET } from './config';
import { FIOLA_EFFECT_BY_ID, FIOLA_COLORS, markFiolaSeen } from './content/Fiola';
import { CARD_BY_ID, rollCardEffect, markCardSeen, type CardEffect } from './content/Card';
import { TAU, rand, randi, clamp, dist2, pick, random, withRng } from '../engine/math';
import { mulberry32, spick, mix, hashStr, randomSeedStr } from './rng';
import { parseTemplate, type BossKind } from './level/roomTemplates';
import {
  drawGate as drawGatePortal,
  drawDungeonGate as drawDungeonPortal,
} from './level/gateRender';
import {
  drawHubPortal, drawHubGlyph, drawHubTitle,
  drawHubStation, drawHubNpc, drawHubBrazier, drawHubCharStatue, drawHubChalObelisk,
} from './level/hubRender';
import {
  layoutStageSelect, drawStageSelect, type SelectMode, type SelectLayout,
} from './level/stageSelectRender';
import {
  layoutCharacterSelect, drawCharacterSelect,
  type CharLayout, type CharCardView, type CharStat,
} from './level/characterSelectRender';
import { drawLabWalls, drawLabExit, drawLabFrame, drawLabOverlay } from './level/labyrinthRender';
import { drawWalls, drawDoors, drawTrapdoor, drawWaterBody, vignetteGradient } from './level/roomRender';
import { FloorCache } from './level/floorCache';
import { PropCache, isAnimatedProp } from './level/propCache';
import { drawProjectileGlow, drawDamageLabels } from './level/worldOverlays';
import { MAP_ANIM_BY_CH } from './level/mapAnim';
import { resolveLevel, CHAPTERS, chapterFloorRange, chapterName, chapterBossName, chapterBossQuote } from './level/levels';
import { enemyScale, scaleIncomingDamage, enemyDamageMul, NO_SCALE, type EnemyScale } from './balance/difficulty';
import { unlockEnemy, unlockBoss, unlockPerk, unlockSkill, unlockSetTier } from './bestiary';
import { TUNING } from './balance/tuning';
import { SKILL_BY_ID, skillName, skillDesc } from './content/skills';
import { Bomb, type BombType } from './entities/Bomb';
import { dropConfig, roomDropChance, netSum } from './content/dropConfig';
import {
  CHARACTERS, CHARACTER_BY_ID, loadCharacterId, saveCharacterId, isCharacterUnlocked, type CharacterDef,
} from './content/characters';
import {
  CHALLENGES, loadClearedChallenges, type ChallengeDef,
} from './content/challenges';
import type { Theme } from './level/theme';
import { generateLabyrinth, type Labyrinth } from './level/labyrinth';
import {
  RunStats, recordFloorClear, recordLabClear, recordStageClear, loadStageTimes, stageKey, formatTime,
} from './stats';

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
  /** Győzelem (jelenleg: a boss-roham mód utolsó bossát is legyőzte). */
  onWin(): void;
}

/** A játékost ért sebzés hang-kategóriája (forrás szerint). */
export type HurtSound = 'hurt' | 'acid' | 'burn' | 'zap';

/**
 * A padló-foltok (vérfoltok) felső korlátja szobánként. Hosszú harcban (sok
 * ellenfél, summoner, pók-fiókák) különben korlátlanul nőne a tömb + a bake-méret.
 * ~96 folt vizuálisan telíti a padlót, a vágás (legrégebbi eldobása) nem feltűnő.
 */
const MAX_SPLATS = 96;

/**
 * A `mulberry32`/`spick` (determinisztikus PRNG + seedelt választás) közös helyen
 * él: `game/rng.ts`. A HUB-módok (dungeon / labirintus-gauntlet) pályánként ehhez
 * seedelnek, hogy a pálya-elrendezés ÉS az ellenfelek (típus + pozíció + champion)
 * FIXEK legyenek; a kampány a seed-rendszerrel (#49) ugyanígy reprodukálható.
 * (A futásidejű harc-RNG marad véletlen.)
 */
/** Labirintus-gauntlet seed-bázis: az ellenfél-típus-választás determinisztikus eltolása. */
const LAB_SEED_BASE = 0x1a_00_00;

/** A hub-terem (mód-választó) négy portálja. */
export type HubChoice = 'story' | 'dungeon' | 'labyrinth' | 'boss';
/** Egy hub-portál: a célmód, a rács-pozíciója, és hogy zárt-e (még nincs megírva). */
interface HubPortal { id: HubChoice; col: number; row: number; locked: boolean; }
/** A HUB meta-állomásai (Ú3): rálépve a Game a megfelelő nézetet/modalt nyitja
 *  (kódex, rang, vagy a seed-kapu - #49). */
export type HubStationId = 'bestiary' | 'rank' | 'seed';
/** Egy meta-állomás a HUB-ban (kódex-pulpitus / rang-obeliszk) a rács-pozíciójával. */
interface HubStation { id: HubStationId; col: number; row: number; }

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
  /** A vér-oltár-állvány, amelynek vér-ajánlata épp döntésre vár (felugró ablak). */
  private pendingBlood: BloodStand | null = null;
  /** Az átok-reliquárium ajánlata, amely épp döntésre vár (felugró ablak). */
  private pendingCurse: CurseStand | null = null;
  /** A sorsoláson nyert skill-tárgy, amelynek felvétele épp döntésre vár. */
  private pendingGambleItem: Item | null = null;
  /** Igaz, ha épp egy puszta értesítő ablak van nyitva (pl. „Nem nyertél"). */
  private pendingNotice = false;
  /** Igaz, ha a labirintus-jutalom kártyája van nyitva → a RENDBEN/ESC kilép a labirintusból. */
  private pendingLabExit = false;
  /** Röpke entitások (könnyek / ellenfél-lövedékek / bombák) birtokosa; a World gettereken át delegál. */
  private readonly entities = new EntityManager();
  /** A játékos könnyei — az EntityManager listája (a hívási helyek változatlanok). */
  get tears(): Tear[] { return this.entities.tears; }
  /** Pecsétgyűrűk (#2) — az EntityManager listája. */
  get rings(): Ring[] { return this.entities.rings; }
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
  /**
   * Seed-rendszer (#49): a FUTÁS seedje. `runSeedStr` a megosztható kód (base36),
   * `runSeed` az ebből derivált szám. A kampány-generálás (layout, ellenfél, drop,
   * tárgy) ebből reprodukálható; a harc-RNG marad élő. `pendingSeed` = a HUB
   * seed-kapun beírt kód a KÖVETKEZŐ story-futáshoz (null = friss random seed).
   */
  runSeedStr = '';
  private runSeed = 1;
  private pendingSeed: string | null = null;
  /** Igaz, amíg a HUB seed-kapu modalja nyitva van (a hub-update befagyasztva). */
  private seedGate = false;
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

  // Szobaváltás-csúsztatás: a régi szobáról az `enterRoom` pillanatában készült
  // canvas-pillanatkép a mozgásirányba kicsúszik, az új beúszik mellé. A snapshot
  // a canvas éles (DPR-es) felbontásán él, hogy ne legyen életlen.
  private slideP = 1;                 // 0→1 előrehaladás (1 = kész, nincs csúszás)
  private slideDir: Dir | null = null;
  private slideSnap: HTMLCanvasElement | null = null;
  private static readonly SLIDE_DUR = 0.32;
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
  /** Boss-intro (gótikus névtábla): a megjelenítendő név + hátralévő idő (mp). */
  private bossIntro: { name: string; quote: string; t: number } | null = null;
  /** Hit-stop („sleep"): hátralévő fagyasztás (mp); >0 alatt a játékmenet áll. */
  private hitStop = 0;
  /** Hit-stop kapcsoló (Beállítások · Grafika); kikapcsolva sosem fagy. */
  private hitStopEnabled = loadHitStop();
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
  /** A HUB meta-állomásai (Ú3): kódex-pulpitus + rang-obeliszk a sarkokban. */
  private hubStations: HubStation[] = [];
  /** A Krónikás NPC pozíciója a HUB-ban (hangulat + felfedés-szöveg). */
  private hubNpc: { col: number; row: number } | null = null;
  /** A Krónikás soron következő hangulat-sora (a felfedés-szövegek közt forog). */
  private hubNpcLine = 0;
  /** A Game köti be: a játékos egy meta-állomásra lépett → a Game nyitja a nézetet. */
  onHubStation: ((id: HubStationId) => void) | null = null;
  /** A Vándor-szobor pozíciója a HUB-ban (#53): rálépve a karakterválasztó nyílik. */
  private hubCharStation: { col: number; row: number } | null = null;
  /** Aktív vándor-választó (#53). A hub közben NEM nullázódik (isHub igaz marad). */
  private charSelect: {
    cursor: number; prevMouseDown: boolean; prevKeys: Record<string, boolean>;
  } | null = null;
  /** A Kihívás-obeliszk pozíciója a HUB-ban (#51): rálépve a kihívás-választó nyílik. */
  private hubChalStation: { col: number; row: number } | null = null;
  /** Aktív kihívás-választó (#51), a vándor-választó ikertestvére. */
  private chalSelect: {
    cursor: number; prevMouseDown: boolean; prevKeys: Record<string, boolean>;
  } | null = null;
  /** Az aktuális futás kihívás-módja (#51), vagy null normál futásnál. */
  private challenge: ChallengeDef | null = null;

  /**
   * Aktív boss-roham (HUB boss-portál, #52). Ha be van állítva, a World a 10
   * bosst egymás után pörgeti egy külön konténer-szobában (`bossRushRoom`), friss
   * karakterrel. `idx` = a SOROS boss indexe a BOSS_ORDER-ben (= a legyőzöttek
   * száma). Null = nincs boss-roham.
   */
  private bossRush: { idx: number } | null = null;
  /** A boss-roham külön konténer-szobája (a `dungeon` ÉRINTETLEN marad alatta). */
  private bossRushRoom: Room | null = null;
  /** Pendzsel: a bossok közti jutalom-ajánlat → a RENDBEN a következő bosst hozza. */
  private pendingBossNext = false;

  /**
   * Aktív Dungeon-mód (HUB dungeon-portál, #52): 15 arénaszoba egymás után, friss
   * karakterrel, egyre több/erősebb ellenféllel. `room` = a SOROS szoba (1-alapú).
   * Külön konténer-szoba (`dungeonRoom`), a `dungeon` (graph) érintetlen alatta.
   */
  private dungeonRun: { room: number } | null = null;
  private dungeonRoom: Room | null = null;
  /** Pendzsel: a dungeon mérföldkő-jutalma → a RENDBEN a következő szobát hozza. */
  private pendingDungeonNext = false;

  /**
   * Aktív Labirintus-gauntlet (HUB labirintus-portál, #52): 15 maze-pálya egymás
   * után, pályánként (pálya-1) ellenféllel, egyre nagyobb/erősebb. `stage` 1-alapú.
   * A maze-keret a meglévő labyrinth-rendszerre épül; csak a stage-vezérlés új.
   */
  private labGauntlet: { stage: number } | null = null;
  /** Pendzsel: a pályák közti jutalom → a RENDBEN a következő pályát hozza. */
  private pendingLabNext = false;

  /**
   * Aktív szakasz-választó (a HUB kihívás-módok belépő oldala, #52). Ha be van
   * állítva, a portálba lépés NEM indítja a módot azonnal: előbb a kígyózó ösvény
   * jelenik meg, ahol bármelyik szakasz közvetlenül indítható. A `hub` közben
   * NEM nullázódik (így a `isHub` igaz marad: nincs HUD, menü-zene), csak a
   * választó-overlay fut helyette. `cursor` a billentyűs kiemelés indexe; a
   * `prevMouseDown`/`prevKeys` a felfutó-él-detektáláshoz kell.
   */
  private stageSelect: {
    mode: SelectMode; count: number; cursor: number;
    prevMouseDown: boolean; prevKeys: Record<string, boolean>;
    times: Record<string, number>;
  } | null = null;

  /**
   * A jelenlegi HUB-szakasz (boss/szoba/maze-pálya) ÉLŐ ideje (mp). Minden
   * szakasz-build nullázza, az aktív különleges-futás képkockái léptetik, a
   * szakasz teljesítésekor a `recordStageClear` rögzíti (leggyorsabb rekord).
   */
  private stageClock = 0;

  private readonly _room: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private _theme: Theme = resolveLevel(1).chapter.theme;

  /**
   * Statikus padló-réteg gyorsítótár (padló + pocsolyák). Ezek a szobán belül
   * képkockánként AZONOS pixeleket adnak (hash-alapú, nincs idő-tag), ezért
   * elég egyszer egy off-screen canvasra rajzolni, és frame-enként egyetlen
   * `drawImage`-dzsel kitenni. A kulcs változására (szoba/méret/téma) újrasül.
   */
  /** Statikus szoba-rétegek (padló + pocsolyák, vérfoltok) off-screen gyorsítótára. */
  private floors = new FloorCache();
  /** Statikus pálya-tárgyak (kő/fa/láda/dísz) off-screen gyorsítótára. */
  private props = new PropCache();
  /** Újrahasznosított ellenfél-iterációs puffer (a frame-enkénti spread helyett). */
  private readonly enemyScratch: IEnemy[] = [];
  /**
   * Kénkő-sugár (#1) aktuális geometriája rajzhoz/HUD-hoz. `on` csak abban a
   * frame-ben igaz, amikor a játékos épp tüzeli; ekkor a (x0,y0)→(x1,y1) szakasz
   * a sugár, `t` a pulzáló animáció-fázis. A `World.updateBeam` tölti.
   */
  private beam = { on: false, x0: 0, y0: 0, x1: 0, y1: 0, t: 0 };
  /**
   * Lángkúp (#4) aktuális geometriája rajzhoz. `on` csak a tüzelő frame-ben igaz;
   * (x,y) a torkolat, `ang` a kúp tengelye, `t` az animáció-fázis. A `updateCone` tölti.
   */
  private cone = { on: false, x: 0, y: 0, ang: 0, t: 0 };
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
  /** A jelenlegi szoba — hub/labirintus/boss-roham alatt a külön konténer, egyébként a dungeon aktuális szobája. */
  get currentRoom(): Room { return this.hubRoom ?? this.labRoom ?? this.bossRushRoom ?? this.dungeonRoom ?? this.dungeon.current; }
  get enemies(): IEnemy[] { return this.currentRoom.enemies; }

  /** Az aktuális szinthez tartozó fejezet azonosítója (a zenei téma-választáshoz). */
  get chapterId(): string { return resolveLevel(this.floor).chapter.id; }
  /** Igaz, ha épp a labirintus különleges pálya fut (kamera-követéses mód). */
  get isLabyrinth(): boolean { return this.labyrinth !== null; }
  /** Igaz, ha épp a hub-terem (mód-választó) fut — harc/szobaváltás nélkül. */
  get isHub(): boolean { return this.hub !== null; }
  /** Igaz, ha a HUB-mód szakasz-választó oldala aktív (a portál belépő-oldala). */
  get isStageSelect(): boolean { return this.stageSelect !== null; }
  /** Igaz, ha a vándor-választó (#53) aktív (a HUB Vándor-szobra nyitotta). */
  get isCharacterSelect(): boolean { return this.charSelect !== null; }
  /** Igaz, ha a HUB seed-kapu modalja nyitva van (#49) → a hub be van fagyasztva. */
  get isSeedGate(): boolean { return this.seedGate; }
  /** A KÖVETKEZŐ story-futás beírt seed-kódja (üres = friss random). A modal ezt tölti elő. */
  get pendingSeedStr(): string { return this.pendingSeed ?? ''; }
  /** A HUB seed-kapu beállítja a következő story-futás seedjét (null/üres = random). */
  setPendingSeed(s: string | null): void {
    const v = (s ?? '').trim();
    this.pendingSeed = v ? v : null;
  }
  /** Seed-kapu modal nyitása: a hub befagy (a player nem mozog, az állomás nem újra-trigger). */
  openSeedGate(): void { this.seedGate = true; this.hubArmed = false; }
  /** Seed-kapu modal zárása: a hub újra él, az állomások újra élesedhetnek. */
  closeSeedGate(): void { this.seedGate = false; this.hubArmed = true; }
  /** Igaz, ha épp a boss-roham mód fut (a HUD/minimap ehhez igazodik). */
  get isBossRush(): boolean { return this.bossRush !== null; }
  /** A boss-roham állása: hány bosst győzött le eddig (= a soros boss indexe). */
  get bossRushStage(): number { return this.bossRush?.idx ?? 0; }
  /** Igaz, ha épp a Dungeon-mód fut. */
  get isDungeonRun(): boolean { return this.dungeonRun !== null; }
  /** Igaz, ha épp a Labirintus-gauntlet fut (a 15-pályás HUB-mód). */
  get isLabGauntlet(): boolean { return this.labGauntlet !== null; }
  /**
   * Egy „különleges futás" (boss-roham / dungeon / labirintus-gauntlet) aktív-e.
   * Ezek a game-overben a sorszám-alapú „szintet" használják, és NEM mozgatják a
   * kampány „legmélyebb szint" rekordot (countBestFloor=false).
   */
  get isSpecialRun(): boolean { return this.bossRush !== null || this.dungeonRun !== null || this.labGauntlet !== null; }
  /** A különleges futás állása (legyőzött boss / kipucolt szoba / teljesített pálya), vagy 0. */
  get specialStage(): number {
    if (this.bossRush) return this.bossRush.idx;
    if (this.dungeonRun) return this.dungeonRun.room - 1; // kipucolt szobák száma
    if (this.labGauntlet) return this.labGauntlet.stage - 1; // teljesített pályák száma
    return 0;
  }
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
  /** „Játékérzet"-effektek (csőtorkolat-villanás, visszarúgás, kamera-kick) BE-e. */
  get gameFeel(): boolean { return this.fx.gameFeel; }
  /** Game-feel kapcsoló élő frissítése (a Beállítások hívja). */
  setGameFeel(v: boolean): void { this.fx.setGameFeel(v); }
  /** Kamera-kick (a Player.shoot hívja); a facade-on át, mert az `fx` privát. */
  addKick(dirX: number, dirY: number, amount: number): void { this.fx.addKick(dirX, dirY, amount); }
  /** Kamera-LERP célzás-cél (a Player.shoot hívja); a nézet lágyan a lövésirányba csúszik. */
  setCamLook(dirX: number, dirY: number): void { this.fx.setCamLook(dirX, dirY); }
  /** Hit-stop be/ki (Beállítások); kikapcsoláskor a futó fagyasztás is feloldódik. */
  setHitStop(v: boolean): void { this.hitStopEnabled = v; if (!v) this.hitStop = 0; }
  /** A futó boss-intro állapota a HUD-nak (`null`, ha nincs), vagy `{name, t}`. */
  get bossIntroView(): { name: string; quote: string; t: number } | null { return this.bossIntro; }
  /**
   * Hit-stop kiváltása: rövid, pár frame-es fagyasztás egy ütős pillanatban (ölés,
   * sérülés). Halmozás helyett a leghosszabbat tartja, és felülről korlátozott,
   * hogy sűrű ölésnél se akadjon be. Csak ha a kapcsoló BE van.
   */
  triggerHitStop(sec: number): void {
    if (!this.hitStopEnabled) return;
    this.hitStop = Math.min(0.09, Math.max(this.hitStop, sec));
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
  addHazard(kind: HazardKind, x: number, y: number, r: number, life: number, arm = 0, owner: 'player' | 'enemy' = 'enemy'): void {
    this.hazards.add(kind, x, y, r, life, arm, owner);
  }

  /** Boss-példány a sablon által megadott registry-célból (mind a 10 boss). */
  private makeBoss(x: number, y: number, kind: BossKind): IEnemy {
    const floor = Math.max(1, Math.floor(this.floor));
    const color = this._theme.bossColor;
    const b = BOSS_REGISTRY[kind].make(x, y, floor, color);
    b.bossId = kind; // bestiárium: melyik boss (az első megöléskor feloldjuk)
    return b;
  }
  hasNeighbor(dir: Dir): boolean { return (this.hub || this.bossRush || this.dungeonRun) ? false : this.dungeon.hasNeighbor(dir); }
  isCurrentRoomCleared(): boolean { return this.currentRoom.cleared; }
  get theme(): Theme { return this._theme; }
  floorName(): string {
    // különleges futások: a „szint" helyett a sorszám (HUD jobb-felül + game-over)
    if (this.bossRush) {
      return tr('hud.bossRush', { n: Math.min(this.bossRush.idx + 1, BOSS_ORDER.length), total: BOSS_ORDER.length });
    }
    if (this.dungeonRun) {
      return tr('hud.dungeonRun', { n: Math.min(this.dungeonRun.room, DUNGEON_RUN.rooms), total: DUNGEON_RUN.rooms });
    }
    if (this.labGauntlet) {
      return tr('hud.labGauntlet', { n: Math.min(this.labGauntlet.stage, LAB_GAUNTLET.stages), total: LAB_GAUNTLET.stages });
    }
    const lvl = resolveLevel(this.floor);
    const base = `${chapterName(lvl.chapter)} ${lvl.index}`;
    // kihívás-mód (#51): a szint mellett a kihívás neve is látszik (HUD + game-over)
    return this.challenge ? `${base} · ${this.challengeName}` : base;
  }

  // ---- Életciklus ----
  /** Új futás. `startFloor`: a kezdő globális szint (admin „Kipróbálás" egy fejezettől).
   *  `challenge`: aktív kihívás-mód (#51) vagy null (normál futás). */
  newGame(startFloor = 1, challenge: ChallengeDef | null = null): void {
    this.challenge = challenge;
    this.labyrinth = null; // friss futás mindig normál szoba-módban indul
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
    this.computeRoom();
    this.floor = Math.max(1, Math.floor(startFloor));
    this.score = 0;
    this.sandbox = false;
    this.runStats.resetRun();
    this.firstBossVoicePlayed = false;   // új futás → az első boss narrációja megint szólhat
    this._theme = resolveLevel(this.floor).chapter.theme;
    // Seed-rendszer (#49): a HUB seed-kapun beírt kód, vagy friss random. A teljes
    // kampány-generálás (layout + ellenfél + tárgy + drop) ebből reprodukálható.
    this.runSeedStr = this.pendingSeed && this.pendingSeed.trim() ? this.pendingSeed.trim() : randomSeedStr();
    this.pendingSeed = null; // egy futásra szól, utána vissza random
    this.runSeed = hashStr(this.runSeedStr);
    this.dungeon = new Dungeon(this.floor, mix(this.runSeed, this.floor));
    // a kampány a HUB-on választott vándorral indul (#53); ismeretlen/zárt → az alap
    const chosen = CHARACTER_BY_ID[loadCharacterId()];
    const vandor = chosen && isCharacterUnlocked(chosen) ? chosen : CHARACTERS[0];
    // a vándor fiola-szín→hatás térképe is seedelt (ua. seed = ua. fiola-azonosítók)
    withRng(mulberry32(mix(this.runSeed, 0xf10a)), () => this.player.reset(this.cx, this.cy, vandor));
    this.applyChallenge(challenge); // kihívás-mód restrikciói a vándor fölött (#51)
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    if (this.player.activeSkillId) unlockSkill(this.player.activeSkillId); // induló skill a Kódexbe
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
  startHub(unlocks: { boss?: boolean; dungeon?: boolean } = {}): void {
    this.labyrinth = null;
    this.labRoom = null;
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
    this.sandbox = false;
    this.hubArmed = true;
    this._theme = resolveLevel(1).chapter.theme;
    // külön konténer-szoba (cleared → nem fut a harc/ajtó-logika)
    this.hubRoom = new Room(0, 0, 'normal');
    this.hubRoom.cleared = true;
    this.hubRoom.spawned = true;
    // a négy portál a négy fal felé; a labelek a portál ALATT jelennek meg. A
    // boss/dungeon zártsága a haladástól függ (#52): a Game adja át a feloldást.
    this.hub = [
      { id: 'story',     col: 6,    row: 0.7, locked: false },
      { id: 'labyrinth', col: 1.2,  row: 3,   locked: false },
      { id: 'dungeon',   col: 10.8, row: 3,   locked: !unlocks.dungeon },
      { id: 'boss',      col: 6,    row: 5.3, locked: !unlocks.boss },
    ];
    // meta-állomások a felső sarkokban (Ú3): kódex (bal) + rang (jobb) + seed-kapu
    // (#49) az alsó-jobb sarokban (a Krónikás párjaként a bal alsóval szemben).
    this.hubStations = [
      { id: 'bestiary', col: 2.2,  row: 1.3 },
      { id: 'rank',     col: 10.8, row: 1.3 },
      { id: 'seed',     col: 10.5, row: 5 },
    ];
    this.hubNpc = { col: 2.2, row: 5 }; // a Krónikás a bal alsó sarokban
    this.hubCharStation = { col: 4, row: 1.4 }; // Vándor-szobor a story-portál mellett (#53)
    this.hubChalStation = { col: 8, row: 1.4 }; // Kihívás-obeliszk a másik oldalon (#51)
    this.computeRoom();
    this.player.reset(this.cx, this.cy);
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    this.particles.clear();
    this.floors.invalidate();
    this.props.invalidate();
  }

  /** A hub elhagyása (menübe lépéskor): a konténer-szoba eldobása, normál szoba vissza. */
  exitHub(): void {
    // a hub ÉS minden HUB-mód (boss-roham / dungeon / labirintus-gauntlet) itt
    // takarodik ki (a Game menübe lépéskor hívja); ha egyik sincs, nincs teendő.
    if (!this.hub && !this.bossRush && !this.dungeonRun && !this.labGauntlet) return;
    this.stageSelect = null;
    this.charSelect = null;
    this.chalSelect = null;
    this.seedGate = false;
    this.hub = null;
    this.hubStations = [];
    this.hubNpc = null;
    this.hubCharStation = null;
    this.hubChalStation = null;
    this.hubRoom = null;
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
    this.labyrinth = null;
    this.labRoom = null;
    this.pendingBossNext = false;
    this.pendingDungeonNext = false;
    this.pendingLabNext = false;
    this.floors.invalidate();
    this.props.invalidate();
    this.computeRoom();
  }

  // ---- Szakasz-választó (HUB kihívás-módok belépő oldala, #52) ----------------

  /** Hány szakaszból áll egy mód (a választó csomópont-száma). */
  private stageSelectCount(mode: SelectMode): number {
    return mode === 'boss' ? BOSS_ORDER.length
      : mode === 'dungeon' ? DUNGEON_RUN.rooms
      : LAB_GAUNTLET.stages;
  }

  /**
   * A HUB egy kihívás-portálja a szakasz-választót nyitja (NEM indítja a módot
   * azonnal): a `hub` aktív marad (isHub igaz → nincs HUD, menü-zene), de a
   * választó-overlay fut helyette, ahonnan bármelyik szakasz indítható.
   */
  openStageSelect(mode: SelectMode): void {
    this.computeRoom();
    this.stageSelect = {
      mode, count: this.stageSelectCount(mode), cursor: 0,
      prevMouseDown: this.input.mouse.down, prevKeys: {},
      times: loadStageTimes(), // a szakasz-rekordok (csomópont alá írt legjobb idők)
    };
  }

  /** A választó bezárása (Vissza / ESC): a hub-portálok élesedése a lelépéskor. */
  closeStageSelect(): void {
    this.stageSelect = null;
    this.hubArmed = false; // a játékos a portálon áll → csak lelépés után süthet el újra
  }

  /** A választó kiosztása (csomópontok + Vissza-gomb) az aktuális szoba-dobozra. */
  private stageSelectLayout(): SelectLayout {
    const ss = this.stageSelect!;
    const bossFlags = this.stageSelectBossFlags(ss.mode, ss.count);
    return layoutStageSelect(this._room, ss.count, bossFlags);
  }

  /** Index-szerinti boss/mérföldkő-jelölés (gyémánt-csomópont) módonként. */
  private stageSelectBossFlags(mode: SelectMode, count: number): boolean[] {
    const flags: boolean[] = [];
    for (let i = 0; i < count; i++) {
      flags.push(
        mode === 'boss' ? true
        : mode === 'dungeon' ? DUNGEON_RUN.bossRooms.includes(i + 1)
        : i + 1 === LAB_GAUNTLET.stages, // a labirintus utolsó pályája a „finálé"
      );
    }
    return flags;
  }

  /** A kiemelt szakasz leíró felirata (boss-név / szoba / pálya). */
  private stageSelectCaption(mode: SelectMode, i: number): string {
    if (i < 0) return '';
    const n = i + 1;
    if (mode === 'boss') return BOSS_REGISTRY[BOSS_ORDER[i]!].name;
    if (mode === 'dungeon') {
      return DUNGEON_RUN.bossRooms.includes(n)
        ? tr('select.dungeonBoss', { n }) : tr('select.dungeonRoom', { n });
    }
    return tr('select.labStage', { n });
  }

  /** A kiválasztott szakasz indítása (innen a mód a végéig folytatódik). */
  private launchStage(mode: SelectMode, i: number): void {
    this.audio.stairs();
    if (mode === 'boss') this.startBossRush(i);
    else if (mode === 'dungeon') this.startDungeonRun(i + 1);
    else this.startLabGauntlet(i + 1);
  }

  private updateStageSelect(dt: number): void {
    const ss = this.stageSelect!;
    this.computeRoom();
    this.particles.update(dt);
    this.fx.update(dt);
    this.audio.setMusicScene(0); // választó: nyugodt drone (nincs harc)

    const layout = this.stageSelectLayout();
    const mx = this.input.mouse.x, my = this.input.mouse.y;

    // egér-kiemelés: a kurzor alatti csomópont (ha van) felülírja a billentyűset
    let hover = -1;
    for (const node of layout.nodes) {
      if (dist2(mx, my, node.x, node.y) <= (node.r + 6) ** 2) { hover = node.i; break; }
    }
    if (hover >= 0) ss.cursor = hover;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;

    // billentyűs navigáció (felfutó él a saját prevKeys-szel; a nyilak szabadok itt)
    const k = this.input.keys;
    const edge = (code: string): boolean => {
      const now = !!k[code];
      const was = !!ss.prevKeys[code];
      ss.prevKeys[code] = now;
      return now && !was;
    };
    const cols = layout.perRow;
    const last = ss.count - 1;
    if (edge('arrowright') || edge('d')) ss.cursor = Math.min(last, ss.cursor + 1);
    if (edge('arrowleft') || edge('a')) ss.cursor = Math.max(0, ss.cursor - 1);
    if (edge('arrowdown') || edge('s')) ss.cursor = Math.min(last, ss.cursor + cols);
    if (edge('arrowup') || edge('w')) ss.cursor = Math.max(0, ss.cursor - cols);
    const enter = edge('enter') || edge(' ');

    // egér-kattintás (felfutó él): a kurzor-csomópont vagy a Vissza-gomb
    const down = this.input.mouse.down;
    const click = down && !ss.prevMouseDown;
    ss.prevMouseDown = down;

    if ((click && overBack)) { this.closeStageSelect(); return; }
    if ((click && hover >= 0) || enter) { this.launchStage(ss.mode, ss.cursor); return; }
  }

  private renderStageSelect(ctx: CanvasRenderingContext2D): void {
    const ss = this.stageSelect!;
    const th = this._theme;
    ctx.save();
    ctx.translate(this.fx.camOffX(), this.fx.camOffY());

    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    const rc = this._room;
    const W = ROOM.WALL;
    this.drawCachedFloor(ctx);
    ctx.fillStyle = vignetteGradient(ctx, this.cx, this.cy, rc, th.vignette);
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    // zárt terem-keret (mint a hub)
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

    this.particles.draw(ctx);

    const layout = this.stageSelectLayout();
    const mx = this.input.mouse.x, my = this.input.mouse.y;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;
    // a csomópontok alá írt legjobb idők (rekord hiányában null → „- - -")
    const times = layout.nodes.map((n) => {
      const rec = ss.times[stageKey(ss.mode, n.i)];
      return rec !== undefined ? formatTime(rec, true) : null;
    });
    drawStageSelect(ctx, rc, layout, {
      mode: ss.mode,
      title: tr(`select.title.${ss.mode}`),
      sub: tr('select.sub'),
      backLabel: tr('select.back'),
      hint: tr('select.hint'),
      caption: this.stageSelectCaption(ss.mode, ss.cursor),
      times,
      hover: ss.cursor,
      backHover: overBack,
      accent: th.accent,
      t: performance.now() / 1000,
    });
    this.fx.draw(ctx);
    ctx.restore();
  }

  // ---- Vándor-választó (#53, HUB Vándor-szobor) -------------------------------

  /** A Vándor-szobron állva a karakterválasztó nyílik (a hub aktív marad). */
  openCharacterSelect(): void {
    this.computeRoom();
    const cur = Math.max(0, CHARACTERS.findIndex((c) => c.id === loadCharacterId()));
    this.charSelect = { cursor: cur, prevMouseDown: this.input.mouse.down, prevKeys: {} };
  }

  /** A választó bezárása (Vissza / ESC): a hub-elemek lelépés után élesednek újra. */
  closeCharacterSelect(): void {
    this.charSelect = null;
    this.hubArmed = false;
  }

  private charSelectLayout(): CharLayout {
    return layoutCharacterSelect(this._room, CHARACTERS.length);
  }

  /** Egy vándor stat-nyilai az alaphoz (Zarándok) képest. */
  private charStats(c: CharacterDef): CharStat[] {
    const dir = (mul: number | undefined, invert = false): -1 | 0 | 1 => {
      if (!mul || mul === 1) return 0;
      const up = invert ? mul < 1 : mul > 1;
      return up ? 1 : -1;
    };
    const hpDir: -1 | 0 | 1 = c.maxHpHearts && c.maxHpHearts !== 3 ? (c.maxHpHearts > 3 ? 1 : -1) : 0;
    return [
      { label: tr('char.stat.dmg'), dir: dir(c.dmgMul) },
      { label: tr('char.stat.spd'), dir: dir(c.speedMul) },
      { label: tr('char.stat.rate'), dir: dir(c.fireRateMul, true) }, // <1 = gyorsabb = jobb
      { label: tr('char.stat.hp'), dir: hpDir },
    ];
  }

  /** A kártya-nézetek (i18n-feloldott szövegek + nyilak) a render számára. */
  private charCardViews(): CharCardView[] {
    return CHARACTERS.map((c) => {
      // zárt vándor (#53 reward): a titok rejtve, csak a feloldás-feltétel látszik
      if (!isCharacterUnlocked(c)) {
        return {
          name: '???', skill: '', desc: tr('char.locked'),
          accent: '#968c78', stats: [], locked: true, // hex! (a sigil-rajz hex-et parse-ol)
        };
      }
      const skill = SKILL_BY_ID[c.skillId ?? 'nova'];
      return {
        name: tr(`char.${c.id}.name`),
        skill: tr('char.skillLabel', { skill: skill ? skillName(skill) : '' }),
        desc: tr(`char.${c.id}.desc`),
        accent: c.accent,
        tearColor: c.tearColor,
        stats: this.charStats(c),
      };
    });
  }

  /** A kiválasztott vándor rögzítése + vissza a hubra. */
  private confirmCharacter(i: number): void {
    const c = CHARACTERS[i];
    if (!c) return;
    if (!isCharacterUnlocked(c)) { // zárt vándor: tiltva, a feltétel a kártyán
      const center = this.cellCenter(6, 3);
      this.addFloater(center.x, center.y - 60, tr('char.locked'), '#cdbb9a');
      this.audio.denied();
      return;
    }
    saveCharacterId(c.id);
    this.audio.stairs();
    const center = this.cellCenter(6, 3);
    this.addFloater(center.x, center.y - 60, tr('char.chosen', { name: tr(`char.${c.id}.name`) }), c.accent);
    this.closeCharacterSelect();
  }

  private updateCharacterSelect(dt: number): void {
    const cs = this.charSelect!;
    this.computeRoom();
    this.particles.update(dt);
    this.fx.update(dt);
    this.audio.setMusicScene(0);

    const layout = this.charSelectLayout();
    const mx = this.input.mouse.x, my = this.input.mouse.y;

    let hover = -1;
    for (const card of layout.cards) {
      if (mx >= card.x && mx <= card.x + card.w && my >= card.y - 12 && my <= card.y + card.h) {
        hover = card.i; break;
      }
    }
    if (hover >= 0) cs.cursor = hover;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;

    const k = this.input.keys;
    const edge = (code: string): boolean => {
      const now = !!k[code]; const was = !!cs.prevKeys[code];
      cs.prevKeys[code] = now; return now && !was;
    };
    const last = CHARACTERS.length - 1;
    if (edge('arrowright') || edge('d')) cs.cursor = Math.min(last, cs.cursor + 1);
    if (edge('arrowleft') || edge('a')) cs.cursor = Math.max(0, cs.cursor - 1);
    const enter = edge('enter') || edge(' ');

    const down = this.input.mouse.down;
    const click = down && !cs.prevMouseDown;
    cs.prevMouseDown = down;

    if (click && overBack) { this.closeCharacterSelect(); return; }
    if ((click && hover >= 0) || enter) { this.confirmCharacter(cs.cursor); return; }
  }

  private renderCharacterSelect(ctx: CanvasRenderingContext2D): void {
    const cs = this.charSelect!;
    const th = this._theme;
    ctx.save();
    ctx.translate(this.fx.camOffX(), this.fx.camOffY());
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    const rc = this._room;
    const W = ROOM.WALL;
    this.drawCachedFloor(ctx);
    ctx.fillStyle = vignetteGradient(ctx, this.cx, this.cy, rc, th.vignette);
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.fillStyle = th.wall;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y + rc.h, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y, W, rc.h);
    ctx.fillRect(rc.x + rc.w, rc.y, W, rc.h);
    ctx.strokeStyle = th.wallEdge; ctx.lineWidth = 4;
    ctx.strokeRect(rc.x - 2, rc.y - 2, rc.w + 4, rc.h + 4);
    ctx.fillStyle = th.wallTop;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, 5);
    this.particles.draw(ctx);

    const layout = this.charSelectLayout();
    const mx = this.input.mouse.x, my = this.input.mouse.y;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;
    drawCharacterSelect(ctx, rc, layout, {
      title: tr('char.title'),
      sub: tr('char.sub'),
      hint: tr('char.hint'),
      backLabel: tr('select.back'),
      cards: this.charCardViews(),
      selected: cs.cursor,
      backHover: overBack,
      accent: th.accent,
      t: performance.now() / 1000,
    });
    this.fx.draw(ctx);
    ctx.restore();
  }

  // ---- Kihívás-módok (#51, HUB Kihívás-obeliszk) ------------------------------

  /** Igaz, ha a kihívás-választó (#51) aktív. */
  get isChallengeSelect(): boolean { return this.chalSelect !== null; }
  /** Az aktív kihívás neve a HUD-hoz (üres, ha normál futás). */
  get challengeName(): string { return this.challenge ? tr(`challenge.${this.challenge.id}.name`) : ''; }
  /** Az aktív kihívás id-je (a Game a teljesítés-rögzítéshez olvassa), vagy null. */
  get activeChallengeId(): string | null { return this.challenge?.id ?? null; }
  /** A futás VÉGSŐ pontja: a nyers pont a kihívás-szorzóval (a game-over ezt használja). */
  get finalScore(): number { return Math.round(this.score * (this.challenge?.scoreMul ?? 1)); }

  /** A kihívás-mód restrikcióinak alkalmazása a (vándor utáni) kezdő-statokra. */
  private applyChallenge(c: ChallengeDef | null): void {
    if (!c) return;
    const p = this.player;
    if (c.maxHpHearts) { p.maxHp = HP.heart * c.maxHpHearts; p.hp = p.maxHp; }
    if (c.dmgMul) p.dmg = Math.round(p.dmg * c.dmgMul);
    if (c.fireRateMul) p.fireRate = p.fireRate * c.fireRateMul;
    if (c.sightMul) p.sight = p.sight * c.sightMul;
    if (c.extraStartPower) p.startPower += c.extraStartPower; // keményebb ellenfelek a meglévő difficulty-úton
  }

  openChallengeSelect(): void {
    this.computeRoom();
    this.chalSelect = { cursor: 0, prevMouseDown: this.input.mouse.down, prevKeys: {} };
  }

  closeChallengeSelect(): void {
    this.chalSelect = null;
    this.hubArmed = false;
  }

  /** A kihívás-kártyák (a vándor-választó kártya-rendererét újrahasználva). */
  private chalCardViews(): CharCardView[] {
    const cleared = loadClearedChallenges();
    return CHALLENGES.map((c) => ({
      name: tr(`challenge.${c.id}.name`) + (cleared.has(c.id) ? '  ✓' : ''),
      skill: tr('challenge.scoreLabel', { mul: c.scoreMul.toFixed(1) }),
      desc: tr(`challenge.${c.id}.desc`),
      accent: c.accent,
      stats: [], // a hatások a leírásban (a nyíl-szemantika itt félrevezető lenne)
    }));
  }

  /** A kiválasztott kihívás indítása (friss kampány-futás a kihívás-móddal). */
  private launchChallenge(i: number): void {
    const c = CHALLENGES[i];
    if (!c) return;
    this.audio.stairs();
    this.chalSelect = null;
    this.newGame(1, c);
  }

  private updateChallengeSelect(dt: number): void {
    const cs = this.chalSelect!;
    this.computeRoom();
    this.particles.update(dt);
    this.fx.update(dt);
    this.audio.setMusicScene(0);

    const layout = layoutCharacterSelect(this._room, CHALLENGES.length);
    const mx = this.input.mouse.x, my = this.input.mouse.y;
    let hover = -1;
    for (const card of layout.cards) {
      if (mx >= card.x && mx <= card.x + card.w && my >= card.y - 12 && my <= card.y + card.h) {
        hover = card.i; break;
      }
    }
    if (hover >= 0) cs.cursor = hover;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;

    const k = this.input.keys;
    const edge = (code: string): boolean => {
      const now = !!k[code]; const was = !!cs.prevKeys[code];
      cs.prevKeys[code] = now; return now && !was;
    };
    const last = CHALLENGES.length - 1;
    if (edge('arrowright') || edge('d')) cs.cursor = Math.min(last, cs.cursor + 1);
    if (edge('arrowleft') || edge('a')) cs.cursor = Math.max(0, cs.cursor - 1);
    const enter = edge('enter') || edge(' ');

    const down = this.input.mouse.down;
    const click = down && !cs.prevMouseDown;
    cs.prevMouseDown = down;

    if (click && overBack) { this.closeChallengeSelect(); return; }
    if ((click && hover >= 0) || enter) { this.launchChallenge(cs.cursor); return; }
  }

  private renderChallengeSelect(ctx: CanvasRenderingContext2D): void {
    const cs = this.chalSelect!;
    const th = this._theme;
    ctx.save();
    ctx.translate(this.fx.camOffX(), this.fx.camOffY());
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    const rc = this._room;
    const W = ROOM.WALL;
    this.drawCachedFloor(ctx);
    ctx.fillStyle = vignetteGradient(ctx, this.cx, this.cy, rc, th.vignette);
    ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.fillStyle = th.wall;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y + rc.h, rc.w + W * 2, W);
    ctx.fillRect(rc.x - W, rc.y, W, rc.h);
    ctx.fillRect(rc.x + rc.w, rc.y, W, rc.h);
    ctx.strokeStyle = th.wallEdge; ctx.lineWidth = 4;
    ctx.strokeRect(rc.x - 2, rc.y - 2, rc.w + 4, rc.h + 4);
    ctx.fillStyle = th.wallTop;
    ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, 5);
    this.particles.draw(ctx);

    const layout = layoutCharacterSelect(this._room, CHALLENGES.length);
    const mx = this.input.mouse.x, my = this.input.mouse.y;
    const overBack = mx >= layout.back.x && mx <= layout.back.x + layout.back.w
      && my >= layout.back.y && my <= layout.back.y + layout.back.h;
    drawCharacterSelect(ctx, rc, layout, {
      title: tr('challenge.title'),
      sub: tr('challenge.sub'),
      hint: tr('challenge.hint'),
      backLabel: tr('select.back'),
      cards: this.chalCardViews(),
      selected: cs.cursor,
      backHover: overBack,
      accent: th.accent,
      t: performance.now() / 1000,
    });
    this.fx.draw(ctx);
    ctx.restore();
  }

  /**
   * Boss-roham (#52, HUB boss-portál) indítása: a 10 boss (BOSS_ORDER) egymás
   * után, FRISS karakterrel, egy külön konténer-szobában (`bossRushRoom`) - a
   * `dungeon` ÉRINTETLEN marad alatta, mint a labirintusnál. A bossok fix-statúak;
   * a kihívás a sorrendből + az endurance-ből jön, a játékos pedig bossonként
   * gyógyul és egy tárgyat kap (build-up gauntlet). A nehézség-referencia rögzített
   * (`BOSS_RUSH.floor`): a bossok raw-sebzése amúgy sem skálázódik, csak a
   * megidézett adds + a pont-jutalom érzi.
   */
  startBossRush(startIdx = 0): void {
    this.stageSelect = null;
    this.labyrinth = null;
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
    this.sandbox = false;
    this.pendingBossNext = false;
    // a szakasz-választón megadott kezdő-boss (0-alapú); innen a sorozat a végéig megy
    const idx = clamp(Math.floor(startIdx), 0, BOSS_ORDER.length - 1);
    this.bossRush = { idx };
    this.floor = BOSS_RUSH.floor;
    this.score = 0;
    this.runStats.resetRun();
    this.firstBossVoicePlayed = false;
    // friss karakter (a labirintus/story hub-futás filozófiája: önálló futás)
    this.dungeon = new Dungeon(this.floor); // háttér-konténer (a render a bossRushRoom-ot használja)
    this.player.reset(this.cx, this.cy);
    if (this.player.activeSkillId) unlockSkill(this.player.activeSkillId);
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;
    this.buildBossArena(idx);
  }

  /**
   * Egy boss-roham aréna felépítése a `idx`. bosshoz: a fejezet-témát a boss
   * sorszáma adja (2 boss / fejezet → vizuális eszkaláció Pince→Sárkányfészek),
   * az akadály-elrendezés a fejezet egy boss-sablonjából. A szoba `boss` típusú,
   * NEM kipucolt → a normál szoba-pucolás-logika ad „BOSS LEGYŐZVE" + csapóajtót,
   * amit a boss-roham a következő bossra/győzelemre fog le (lásd updateRoom-trapdoor).
   */
  private buildBossArena(idx: number): void {
    const fejezetek = CHAPTERS.filter((c) => c.category === 'fejezet');
    const chapter = fejezetek[Math.min(Math.floor(idx / 2), fejezetek.length - 1)] ?? CHAPTERS[0]!;
    this._theme = chapter.theme;
    const target = BOSS_ORDER[idx]!;

    this.stageClock = 0; // a szakasz-óra nulláról (per-boss legjobb idő méréshez)
    // friss konténer-szoba (a dungeon érintetlen alatta)
    this.bossRushRoom = new Room(0, 0, 'boss');
    this.computeRoom();
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    this.floors.invalidate();
    this.props.invalidate();

    const room = this.bossRushRoom;
    room.decorations = [];
    this.spawnDecorations(room);
    const parsed = parseTemplate(pick(chapter.bossTemplates));
    room.obstacles = parsed.obstacles;
    room.anim = parsed.anim;
    room.enemies.length = 0;
    room.pickups = [];
    room.pedestal = null;
    room.splats = [];
    room.cleared = false;
    room.spawned = true;

    const at = parsed.boss ?? { col: 6, row: 2, kind: target };
    const c = this.cellCenter(at.col, at.row);
    room.enemies.push(this.makeBoss(c.x, c.y, target));
    this.audio.boss();
    this.addShake(10);
    // gótikus névtábla (#60): a boss SAJÁT neve + a fejezet latin idézete
    this.bossIntro = { name: BOSS_REGISTRY[target].name, quote: chapterBossQuote(chapter), t: 2.4 };
    this.player.placeAtCenter(this.cx, this.cy);
    this.doorT = 0;
  }

  /**
   * Egy boss legyőzve a boss-rohamban: tovább a következőre, vagy ha az utolsó is
   * elesett, GYŐZELEM. A bossok közt gyógyulás + egy tárgy-jutalom (megálló kártya
   * a `pendingBossNext`-szel; a RENDBEN építi fel a következő arénát).
   */
  private advanceBossRush(): void {
    if (!this.bossRush) return;
    recordStageClear('boss', this.bossRush.idx, this.stageClock); // a most legyőzött boss ideje
    this.bossRush.idx++;
    const idx = this.bossRush.idx;
    // pont-bónusz a legyőzöttek számával skálázva (push-incentíva)
    this.score += BOSS_RUSH.stageBonus * idx;

    if (idx >= BOSS_ORDER.length) {
      this.bossRushWin();
      return;
    }

    // gyógyulás a következő boss előtt + tárgy-jutalom (build-up)
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + BOSS_RUSH.healBetween * HP.heart);
    const reward = rollItem();
    this.giveItem(reward);
    this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 22, 220, 0.8);
    this.trapdoor = null;
    // megálló jutalom-kártya: a RENDBEN (acceptOffer) építi fel a következő arénát
    this.pendingBossNext = true;
    this.callbacks.onOffer({
      badge: tr('bossrush.reward.badge', { n: idx, total: BOSS_ORDER.length }),
      title: itemName(reward),
      desc: itemDesc(reward),
      sub: tr('bossrush.reward.sub', { hearts: BOSS_RUSH.healBetween }),
      color: reward.col,
      acceptLabel: tr('offer.ok'),
      hideDecline: true,
    });
  }

  /** A boss-roham megnyerve (mind a 10 boss): záró-bónusz + győzelem-képernyő. */
  private bossRushWin(): void {
    this.score += BOSS_RUSH.stageBonus * BOSS_ORDER.length; // záró-bónusz
    this.trapdoor = null;
    this.addFloater(this.player.x, this.player.y - 40, tr('fx.bossRushWin'), '#ffe9a8');
    this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 40, 320, 1.0);
    this.callbacks.onWin();
  }

  // ---- Dungeon-mód (#52, HUB dungeon-portál): 15 arénaszoba egymás után --------

  /**
   * Dungeon-mód indítása: 15 arénaszoba egymás után (külön konténer-szobában,
   * `dungeonRoom`), friss karakterrel. Rendes ellenfelek, egyre több + erősebb;
   * mini-boss az 5./10. szobában, finálé-boss a 15.-ben. A köztes szobák a
   * csapóajtón MAGUKTÓL léptetnek, a boss-szobák után jutalom-kártya + gyógyulás.
   */
  startDungeonRun(startRoom = 1): void {
    this.stageSelect = null;
    this.labyrinth = null;
    this.labRoom = null;
    this.hub = null;
    this.hubRoom = null;
    this.bossRush = null;
    this.bossRushRoom = null;
    this.labGauntlet = null;
    this.sandbox = false;
    this.pendingDungeonNext = false;
    // a szakasz-választón megadott kezdő-szoba (1-alapú); innen a 15.-ig megy
    const room = clamp(Math.floor(startRoom), 1, DUNGEON_RUN.rooms);
    this.dungeonRun = { room };
    this.score = 0;
    this.runStats.resetRun();
    this.firstBossVoicePlayed = false;
    this.floor = DUNGEON_RUN.floorBase;
    this.dungeon = new Dungeon(this.floor); // háttér-konténer (a render a dungeonRoom-ot használja)
    this.player.reset(this.cx, this.cy);
    if (this.player.activeSkillId) unlockSkill(this.player.activeSkillId);
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;
    this.buildDungeonRoom(room);
  }

  /**
   * Egy dungeon-arénaszoba felépítése (1-alapú `roomNo`) - ADAT-vezérelt: a layout
   * + ellenfelek a `Kazamata` fejezet `roomNo`. szoba-sablonjából jönnek (`maps.ts`
   * → MAPS.kazamata, az admin MAP csempe-editorában szerkeszthető). A sablon
   * SORBAN játszódik (nem sorsolás → fix), a boss-szobákban (5/10/15) boss-token van.
   * A `floor` (nehézség + pont) szobánként nő.
   */
  private buildDungeonRoom(roomNo: number): void {
    const chapter = CHAPTERS.find((c) => c.id === 'kazamata') ?? CHAPTERS[0]!;
    this._theme = chapter.theme;
    this.floor = DUNGEON_RUN.floorBase + (roomNo - 1) * DUNGEON_RUN.floorPerRoom;
    const list = chapter.normalTemplates;
    const tpl = list[(roomNo - 1) % Math.max(1, list.length)] ?? list[0]!;
    const parsed = parseTemplate(tpl);
    const isBoss = parsed.boss !== null;

    this.stageClock = 0; // a szakasz-óra nulláról (per-szoba legjobb idő méréshez)
    this.dungeonRoom = new Room(0, 0, isBoss ? 'boss' : 'normal');
    this.computeRoom();
    this.entities.clear();
    this.hazards.clear();
    this.fx.clear();
    this.particles.clear();
    this.trapdoor = null;
    this.enemySlowT = 0;
    this.floors.invalidate();
    this.props.invalidate();

    const room = this.dungeonRoom;
    room.decorations = [];
    this.spawnDecorations(room);
    // a szoba KÖZEPÉT szabadon hagyjuk (3×3 cella): ide spawnol a játékos ÉS ide kerül a
    // csapóajtó (ha a szerkesztett sablon közepére akadály kerülne, az elérhetetlen lenne)
    const ccol = Math.floor(GRID.W / 2), crow = Math.floor(GRID.H / 2);
    room.obstacles = parsed.obstacles.filter((o) => Math.abs(o.col - ccol) > 1 || Math.abs(o.row - crow) > 1);
    room.anim = parsed.anim;
    room.enemies.length = 0;
    room.pickups = [];
    room.pedestal = null;
    room.splats = [];
    room.cleared = false;
    room.spawned = true;

    if (isBoss) {
      const at = parsed.boss!;
      const c = this.cellCenter(at.col, at.row);
      room.enemies.push(this.makeBoss(c.x, c.y, at.kind));
      this.audio.boss();
      this.addShake(10);
      this.bossIntro = { name: BOSS_REGISTRY[at.kind].name, quote: chapterBossQuote(chapter), t: 2.4 };
    }
    // ellenfelek a sablon spawn-helyeiről (a token adja a típust → determinisztikus + WYSIWYG)
    const scale = enemyScale(this.floor, this.player);
    for (const sp of parsed.spawns) {
      const c = this.cellCenter(sp.col, sp.row);
      const kind = sp.slot === 'any' ? chapter.enemyKinds[(sp.col + sp.row) % chapter.enemyKinds.length]! : sp.slot;
      if (kind === 'roach') this.spawnRoachSwarm(c.x, c.y, room, scale);
      else room.enemies.push(new Enemy(kind, c.x, c.y, scale));
    }
    this.player.placeAtCenter(this.cx, this.cy);
    this.doorT = 0;
  }

  /**
   * Egy dungeon-szoba kipucolva → tovább. A boss-szobák (5/10) után jutalom-kártya
   * + gyógyulás (mérföldkő), a köztes szobák MAGUKTÓL léptetnek; a 15. után GYŐZELEM.
   */
  private advanceDungeon(): void {
    if (!this.dungeonRun) return;
    const cleared = this.dungeonRun.room; // a most kipucolt szoba
    recordStageClear('dungeon', cleared - 1, this.stageClock); // a szoba teljesítési ideje
    this.score += DUNGEON_RUN.stageBonus * cleared;
    this.trapdoor = null;

    if (cleared >= DUNGEON_RUN.rooms) { this.dungeonRunWin(); return; }
    const next = cleared + 1;
    this.dungeonRun.room = next;

    // mérföldkő (mini-boss után): gyógyulás + tárgy-jutalom megálló kártyával
    if (DUNGEON_RUN.bossRooms.includes(cleared)) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + DUNGEON_RUN.healAmount * HP.heart);
      const reward = rollItem();
      this.giveItem(reward);
      this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 22, 220, 0.8);
      this.pendingDungeonNext = true;
      this.callbacks.onOffer({
        badge: tr('dungeon.reward.badge', { n: cleared, total: DUNGEON_RUN.rooms }),
        title: itemName(reward),
        desc: itemDesc(reward),
        sub: tr('dungeon.reward.sub', { hearts: DUNGEON_RUN.healAmount }),
        color: reward.col,
        acceptLabel: tr('offer.ok'),
        hideDecline: true,
      });
    } else {
      this.buildDungeonRoom(next); // köztes szoba: azonnali továbblépés
    }
  }

  /** A dungeon megnyerve (mind a 15 szoba): záró-bónusz + győzelem-képernyő. */
  private dungeonRunWin(): void {
    if (this.dungeonRun) this.dungeonRun.room = DUNGEON_RUN.rooms + 1; // a sorszám az ÖSSZESET mutassa (15/15)
    this.score += DUNGEON_RUN.stageBonus * DUNGEON_RUN.rooms; // záró-bónusz
    this.trapdoor = null;
    this.addFloater(this.player.x, this.player.y - 40, tr('fx.dungeonWin'), '#ffe9a8');
    this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 40, 320, 1.0);
    this.callbacks.onWin();
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
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null; // a kampány-kapun át indított labirintus EGY maze (nem gauntlet)
    this.setupLabyrinthStage(lab, theme, enemyKinds, chapterId);
  }

  /**
   * Egy labirintus-PÁLYA felépítése (a kampány-kapu és a HUB-gauntlet közös magja).
   * A `enemyCount` az ellenfél-szám felső korlátja (a gauntletben pálya-1; ha
   * nincs megadva, a maze összes spawn-helye benépesül - a kampány-kapu viselkedése).
   */
  private setupLabyrinthStage(lab: Labyrinth, theme: Theme, enemyKinds: EnemyKind[], chapterId: string, enemyCount?: number, rng?: () => number): void {
    this.labyrinth = lab;
    this.labChapterId = chapterId;
    this._theme = theme;
    this.labWon = false;
    this.pendingLabExit = false;
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
    this.floors.invalidate(); // a maze-világ mérete eltér a szobáétól → újrasütés
    this.props.invalidate();

    const TILE = ROOM.TILE;
    this.player.x = (lab.start.col + 0.5) * TILE;
    this.player.y = (lab.start.row + 0.5) * TILE;
    this.player.vx = 0;
    this.player.vy = 0;
    const startSkill = this.player.activeSkillId ? SKILL_BY_ID[this.player.activeSkillId] : undefined;
    if (startSkill) this.player.skillCharge = startSkill.chargeMax;

    this.spawnLabEnemies(lab, enemyKinds, enemyCount, rng);
  }

  /**
   * Labirintus-ellenfelek a maze spawn-helyeire, a fejezet palettájából sorsolva.
   * `maxCount`: ha megadva, csak ennyi ellenfél kerül ki (a gauntlet pálya-1-et
   * ad; a kampány-kapu nem ad korlátot → minden spawn-hely benépesül).
   */
  private spawnLabEnemies(lab: Labyrinth, kinds: EnemyKind[], maxCount?: number, rng?: () => number): void {
    if (kinds.length === 0 || maxCount === 0) return;
    // A labirintusban NINCS repülő ellenfél: a `floats` típusok átszállnának a
    // maze falain (egy útvesztőben értelmetlen), ezért kiszűrjük őket. Ha a
    // fejezet palettája CSAK repülőkből áll, maradunk az eredetinél, hogy legyen
    // kivel harcolni.
    const grounded = kinds.filter((k) => !ENEMY_STATS[k].floats);
    const pool = grounded.length > 0 ? grounded : kinds;
    const TILE = ROOM.TILE;
    const scale = enemyScale(this.floor, this.player);
    // a gauntletben a START-tól TÁVOLI spawnokat preferáljuk (ne a kezdőcellára
    // essen ellenfél), és csak `maxCount`-ot népesítünk be
    let spawns = lab.spawns;
    if (maxCount !== undefined && maxCount < spawns.length) {
      const sx = lab.start.col, sy = lab.start.row;
      spawns = [...spawns]
        .sort((a, b) => ((b.col - sx) ** 2 + (b.row - sy) ** 2) - ((a.col - sx) ** 2 + (a.row - sy) ** 2))
        .slice(0, maxCount);
    }
    for (const s of spawns) {
      const kind = rng ? spick(pool, rng) : pick(pool); // rng → determinisztikus típus-választás
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
    this.floors.invalidate();
    this.props.invalidate();
    this.runStats.endLab();
    this.computeRoom();
  }

  // ---- Labirintus-gauntlet (#52, HUB labirintus-portál): 15 maze-pálya ---------

  /**
   * Labirintus-gauntlet indítása: 15 maze-pálya egymás után, friss karakterrel,
   * pályánként (pálya-1) ellenféllel, egyre nagyobb + erősebb. A maze-keret a
   * meglévő labyrinth-rendszer; a stage-vezérlés + a kontrollált ellenfél-szám új.
   */
  startLabGauntlet(startStage = 1): void {
    this.stageSelect = null;
    this.hub = null;
    this.hubRoom = null;
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.sandbox = false;
    this.pendingLabNext = false;
    this.onLabyrinthExit = null; // a gauntlet győzelme/halála a game-overre visz (nem hub-vissza)
    // a szakasz-választón megadott kezdő-pálya (1-alapú); innen a 15.-ig megy
    const stage = clamp(Math.floor(startStage), 1, LAB_GAUNTLET.stages);
    this.labGauntlet = { stage };
    this.score = 0;
    this.runStats.resetRun();
    this.dungeon = new Dungeon(1); // háttér-konténer
    this.player.reset(0, 0);
    if (this.player.activeSkillId) unlockSkill(this.player.activeSkillId);
    this.buildLabStage(stage);
  }

  /** Egy gauntlet-pálya felépítése (1-alapú `stage`) - ADAT-vezérelt: a maze-config a
   *  `Labirintus <stage>` fejezetből (`chapterOverrides.ts`, az adminban szerkeszthető).
   *  A maze fix seedje az adatban → a pálya MINDIG ugyanaz; az ellenfél-típus-választás
   *  seedelt (determinisztikus). Ellenfél-szám = (pálya − 1). */
  private buildLabStage(stage: number): void {
    const chapter = CHAPTERS.find((c) => c.id === `labirintus${stage}`)
      ?? CHAPTERS.find((c) => c.category === 'kulonleges') ?? CHAPTERS[0]!;
    const cfg = chapter.labyrinth ?? { cols: 8, rows: 5, loop: 0.12, enemyDensity: 0.25, seed: 1000 + stage };
    this.floor = LAB_GAUNTLET.floorBase + (stage - 1) * LAB_GAUNTLET.floorPerStage;
    const rng = mulberry32(LAB_SEED_BASE + ((cfg.seed >>> 0) || 1) + stage);
    const lab = generateLabyrinth(cfg);
    this.stageClock = 0; // a szakasz-óra nulláról (per-pálya legjobb idő méréshez)
    // pályánkénti ellenfél-szám = (pálya - 1): 1. pálya 0 ellenfél, …, 15. pálya 14
    this.setupLabyrinthStage(lab, chapter.theme, chapter.enemyKinds, chapter.id, stage - 1, rng);
  }

  /** Egy gauntlet-pálya teljesítve (kijárat elérve): jutalom + tovább, vagy győzelem. */
  private advanceLabGauntlet(): void {
    if (!this.labGauntlet) return;
    const stage = this.labGauntlet.stage;
    recordStageClear('labyrinth', stage - 1, this.stageClock); // a pálya teljesítési ideje
    this.score += LAB_GAUNTLET.stageBonus * stage;
    recordLabClear(this.labChapterId, this.runStats.lab);
    this.runStats.labsCleared++;
    this.audio.door();

    if (stage >= LAB_GAUNTLET.stages) { this.labGauntletWin(); return; }

    // jutalom a pályáért (a karakteren marad): tárgy + érme - build-up a következő pályára
    const reward = rollItem();
    this.giveItem(reward);
    const coins = 6 + stage * 2;
    this.player.coins += coins;
    this.score += coins * 25;
    this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 22, 220, 0.8);
    this.pendingLabNext = true;
    this.callbacks.onOffer({
      badge: tr('labg.reward.badge', { n: stage, total: LAB_GAUNTLET.stages }),
      title: itemName(reward),
      desc: itemDesc(reward),
      sub: tr('labg.reward.sub', { coins }),
      color: reward.col,
      acceptLabel: tr('offer.ok'),
      hideDecline: true,
    });
  }

  /** A gauntlet megnyerve (mind a 15 pálya): záró-bónusz + győzelem-képernyő. */
  private labGauntletWin(): void {
    if (this.labGauntlet) this.labGauntlet.stage = LAB_GAUNTLET.stages + 1; // a sorszám az ÖSSZESET mutassa (15/15)
    this.score += LAB_GAUNTLET.stageBonus * LAB_GAUNTLET.stages; // záró-bónusz
    this.clearLabyrinthState(); // a game-over a normál nézettel jöjjön (a labGauntlet flag marad a sorszámhoz)
    this.addFloater(this.player.x, this.player.y - 40, tr('fx.labGauntletWin'), '#ffe9a8');
    this.callbacks.onWin();
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
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
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
    this.bossRush = null;
    this.bossRushRoom = null;
    this.dungeonRun = null;
    this.dungeonRoom = null;
    this.labGauntlet = null;
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
      this.bossIntro = { name: chapterBossName(chapter), quote: chapterBossQuote(chapter), t: 2.4 }; // az előnézet is mutassa az introt
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
  /**
   * Egy szoba determinisztikus seedje (seed-rendszer, #49): a futás-seedből + a
   * szinből + a szoba rács-koordinátáiból. A szoba TARTALMA (sablon, ellenfél-típus
   * + pozíció, champion, tárgy) és a kipucolás-DROPja ebből reprodukálható.
   */
  private roomSeed(room: Room): number {
    return mix(mix(this.runSeed, this.floor), mix(room.gx | 0, room.gy | 0));
  }

  private spawnRoomContents(room: Room): void {
    // A teljes tartalom-generálás a szoba seedjéből (a hívási helyek érintése nélkül:
    // a `withRng`-scope alatt minden `rand`/`pick` determinisztikus). A drop külön
    // seedet kap (lásd a kipucolásnál), hogy ölés-sorrendtől független legyen.
    withRng(mulberry32(this.roomSeed(room)), () => this.spawnRoomContentsSeeded(room));
  }

  private spawnRoomContentsSeeded(room: Room): void {
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
      room.pedestal.label = tr('fx.free', { name: itemName(freeItem) });
      room.shop = new Shop(this.cx, this.cy);
      return;
    }

    if (room.type === 'blood') {
      // VÉR-OLTÁR (#35): kockázat/jutalom terem - tárgy ÉLETPONTÉRT, nem érméért.
      // Tiszta, harc nélküli szoba (mint a szerencse-szoba), saját vér-oltárral.
      room.cleared = true;
      room.anim = null;
      room.obstacles = [];
      room.bloodAltar = new BloodAltar(this.cx, this.cy);
      return;
    }

    if (room.type === 'curse') {
      // ÁTOKVEREM (#38): kockázat/jutalom terem - EGY ritka tárgy, fix 1 szívért,
      // EGYSZER. Tiszta, harc nélküli szoba (mint a vér-oltár), átok-reliquáriummal.
      room.cleared = true;
      room.anim = null;
      room.obstacles = [];
      room.curseAltar = new CurseAltar(this.cx, this.cy);
      return;
    }

    if (room.type === 'secret') {
      // TITKOS SZOBA (#37): bombázással feltárt forrás-cache. Harc nélküli, tiszta
      // szoba; a jutalom érme-szórás + 1 garantált fogyó + ritkán ingyen tárgy.
      room.cleared = true;
      room.anim = null;
      room.obstacles = [];
      this.spawnSecretReward(room);
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
      this.bossIntro = { name: chapterBossName(chapter), quote: chapterBossQuote(chapter), t: 2.4 }; // gótikus névtábla (#60/Ú4)
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
    // Horda-kihívás (#51): extra ellenfelek a meglévő spawn-pontok köré szórva
    // (plafonos: csak ha van legalább 1 spawn, és a fejezet palettájából).
    if (this.challenge?.enemyExtra && parsed.spawns.length > 0) {
      for (let i = 0; i < this.challenge.enemyExtra; i++) {
        const base = parsed.spawns[i % parsed.spawns.length]!;
        const c = this.cellCenter(base.col, base.row);
        const x = c.x + (random() - 0.5) * 80;
        const y = c.y + (random() - 0.5) * 80;
        room.enemies.push(new Enemy(pick(chapter.enemyKinds), x, y, scale, false, this.rollChampion()));
      }
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

  /** Champion-variáns sorsolása egy spawn-hoz (Wave 3); null = sima ellenfél.
   *  `rng` megadva: DETERMINISZTIKUS (a HUB-módok fix pályáihoz). Megadás nélkül a
   *  globális forráson át (a kampány-szoba seed-scope-jában szintén determinisztikus). */
  private rollChampion(rng?: () => number): ChampionTrait | null {
    const r = rng ?? random;
    return r() < TUNING.championChance ? spick(CHAMPION_TRAITS, r) : null;
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
    this.startRoomSlide(dir);
    // 0.7 másodperc türelmi idő: az ellenfelek csak ezután indulnak el
    this.enemyFreezeT = next.cleared ? 0 : 0.7;
    this.audio.door();
  }

  /**
   * Szobaváltás-csúsztatás indítása: pillanatkép a (még a régi szobát mutató)
   * canvasról, majd a render `slideP`-vel a régit kicsúsztatja, az újat beúsztatja.
   * A snapshot a canvas éles felbontásán készül, hogy ne legyen életlen.
   */
  private startRoomSlide(dir: Dir): void {
    const src = this.engine.canvas;
    let snap = this.slideSnap;
    if (!snap) { snap = document.createElement('canvas'); this.slideSnap = snap; }
    if (snap.width !== src.width || snap.height !== src.height) {
      snap.width = src.width;
      snap.height = src.height;
    }
    const sctx = snap.getContext('2d');
    if (!sctx) { this.slideSnap = null; this.slideP = 1; return; }
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, snap.width, snap.height);
    sctx.drawImage(src, 0, 0);
    this.slideDir = dir;
    this.slideP = 0;
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
      this.triggerHitStop(0.06);   // a bejövő ütés súlya (DoT-tick nem fagyaszt)
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
    if (enemy instanceof Enemy) unlockEnemy(enemy.kind); // bestiárium: feloldás első megöléskor
    else if (enemy.boss && enemy.bossId) unlockBoss(enemy.bossId); // boss-bestiárium

    this.audio.splat();
    this.particles.spawn(enemy.x, enemy.y, enemy.col, enemy.boss ? 40 : 12, enemy.boss ? 320 : 180, enemy.boss ? 0.9 : 0.45);
    this.particles.spawn(enemy.x, enemy.y, '#fff', enemy.boss ? 16 : 4, 200, 0.4);
    this.addShake(enemy.boss ? 14 : 4);
    this.triggerHitStop(enemy.boss ? 0.09 : 0.04);   // ölés-súly (boss erősebb)
    this.score += enemy.score;
    this.addFloater(enemy.x, enemy.y, `+${enemy.score}`, '#f3e2bf');

    // Maradandó folt a padlón (plafonnal: a legrégebbit dobjuk, ne nőjön korlátlanul)
    const splats = this.currentRoom.splats;
    if (splats.length >= MAX_SPLATS) splats.shift();
    splats.push({
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

  /**
   * Summoner-champion: gyenge csótány-csatlóst idéz a közelébe. A szoba-zsúfoltság
   * a plafon (28 fölött nem idéz), így nem pörög túl a tömb/bake. Igaz, ha idézett.
   */
  summonMinion(summoner: Enemy): boolean {
    const room = this.currentRoom;
    if (room.enemies.length >= 28) return false;
    const scale = enemyScale(this.floor, this.player);
    const ang = rand(0, TAU), rad = rand(14, 34);
    room.enemies.push(new Enemy('roach', summoner.x + Math.cos(ang) * rad, summoner.y + Math.sin(ang) * rad, scale));
    this.particles.spawn(summoner.x, summoner.y, '#c89af0', 12, 180, 0.5);
    this.audio.splat();
    return true;
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
    // Fiola (#44): kis FÜGGETLEN esély a többi pickup elé (kockázat/jutalom fogyó).
    // Külön rétegként él, hogy a meglévő nettó-súlyokat (érme/bomba/szív/TNT) ne hígítsa.
    if (random() < FIOLA.dropChance) {
      const colorIdx = randi(0, FIOLA_COLORS.length - 1);
      this.currentRoom.pickups.push(new Pickup(x, y, 'fiola', colorIdx));
      return;
    }
    // Sorslap (#46/#47): a fiola UTÁN egy MÁSODIK független fogyó-réteg (kártya/rúna).
    if (random() < CARD.dropChance) {
      this.currentRoom.pickups.push(new Pickup(x, y, 'card', 0, rollCardEffect()));
      return;
    }
    // A típus a nettó-súlyok arányában (a gate már eldöntötte, hogy esik valami).
    const n = dropConfig.nets;
    const total = netSum();
    let r = random() * (total > 0 ? total : 1);
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

  /**
   * Titkos szoba (#37) jutalma: forrás-cache. Érme-szórás + EGY garantált fogyó
   * (súlyozott: bomba/TNT/fiola/sorslap - részben visszatéríti a bomba-költséget),
   * + `SECRET.itemChance` eséllyel egy INGYEN tárgy-pedesztál (a „jackpot").
   */
  private spawnSecretReward(room: Room): void {
    // érme-szórás a szoba közepe köré
    for (let i = 0; i < SECRET.coins; i++) {
      const a = rand(0, TAU);
      const d = rand(24, 92);
      room.pickups.push(new Pickup(this.cx + Math.cos(a) * d, this.cy + Math.sin(a) * d, 'coin'));
    }
    // 1 garantált fogyó (súlyozott)
    const r = random();
    const cy = this.cy + 60;
    if (r < 0.34) room.pickups.push(new Pickup(this.cx, cy, 'bomb'));
    else if (r < 0.5) room.pickups.push(new Pickup(this.cx, cy, 'tnt'));
    else if (r < 0.78) room.pickups.push(new Pickup(this.cx, cy, 'fiola', randi(0, FIOLA_COLORS.length - 1)));
    else room.pickups.push(new Pickup(this.cx, cy, 'card', 0, rollCardEffect()));
    // ritkán INGYEN tárgy-pedesztál (a tárgy a collectItem-en megy → difficulty beépíti)
    if (random() < SECRET.itemChance) {
      const freeItem = rollItem();
      room.pedestal = new Pedestal(this.cx, this.cy - 150, freeItem);
      room.pedestal.label = tr('fx.free', { name: itemName(freeItem) });
    }
  }

  /** A felugró ablak „Megveszem / Felveszem / Rendben" gombja. */
  acceptOffer(): void {
    // labirintus-jutalom kártyája: a RENDBEN kilép a labirintusból
    if (this.pendingLabExit) { this.pendingLabExit = false; this.exitLabyrinth(); return; }
    // labirintus-gauntlet pályák közti jutalma: a RENDBEN a következő pályát hozza
    if (this.pendingLabNext) { this.pendingLabNext = false; if (this.labGauntlet) { this.labGauntlet.stage++; this.buildLabStage(this.labGauntlet.stage); } return; }
    // boss-roham bossok közti jutalma: a RENDBEN a következő arénát építi fel
    if (this.pendingBossNext) { this.pendingBossNext = false; this.buildBossArena(this.bossRush?.idx ?? 0); return; }
    // dungeon-mód mérföldkő-jutalma: a RENDBEN a következő szobát építi fel
    if (this.pendingDungeonNext) { this.pendingDungeonNext = false; this.buildDungeonRoom(this.dungeonRun?.room ?? 1); return; }
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

    // vér-oltár vásárlás: ÉLET a fizetség (nem érme)
    const bs = this.pendingBlood;
    this.pendingBlood = null;
    if (bs && !bs.sold) {
      if (this.player.hp <= bs.cost) {
        // nem fizethetsz vért, ha az megölne (legalább 1 fél szív maradjon)
        this.audio.denied();
        this.addFloater(this.player.x, this.player.y - 30, tr('fx.noBlood'), '#ff6a6a');
        bs.declined = true;
        return;
      }
      this.buyBlood(bs);
      return;
    }

    // átokverem fizetség: ÉLET a fizetség (egyszeri, ritka jutalomért)
    const cs = this.pendingCurse;
    this.pendingCurse = null;
    if (cs && !cs.sold) {
      if (this.player.hp <= cs.cost) {
        // nem fizethetsz, ha az megölne (legalább 1 fél szív maradjon)
        this.audio.denied();
        this.addFloater(this.player.x, this.player.y - 30, tr('fx.noBlood'), '#ff6a6a');
        cs.declined = true;
        return;
      }
      this.buyCurse(cs);
      return;
    }

    const s = this.pendingStall;
    this.pendingStall = null;
    if (!s || s.sold) return;
    if (this.player.coins < s.price) {
      this.audio.denied();
      this.addFloater(this.player.x, this.player.y - 30, tr('fx.noCoins'), '#ff6a6a');
      s.declined = true;
      return;
    }
    this.player.coins -= s.price;
    s.sold = true;
    this.buyStall(s);
  }

  /** A felugró ablak „Mégsem" gombja (vagy ESC): az ajánlat elutasítása. */
  declineOffer(): void {
    // labirintus-jutalom kártyája: ESC is kilép (a jutalom már a játékoson van)
    if (this.pendingLabExit) { this.pendingLabExit = false; this.exitLabyrinth(); return; }
    // labirintus-gauntlet pályák közti jutalma: ESC is tovább léptet
    if (this.pendingLabNext) { this.pendingLabNext = false; if (this.labGauntlet) { this.labGauntlet.stage++; this.buildLabStage(this.labGauntlet.stage); } return; }
    // boss-roham jutalma: ESC is tovább léptet (a tárgy/gyógyulás már megvan)
    if (this.pendingBossNext) { this.pendingBossNext = false; this.buildBossArena(this.bossRush?.idx ?? 0); return; }
    // dungeon mérföldkő-jutalma: ESC is tovább léptet
    if (this.pendingDungeonNext) { this.pendingDungeonNext = false; this.buildDungeonRoom(this.dungeonRun?.room ?? 1); return; }
    if (this.pendingNotice) { this.pendingNotice = false; return; }
    const gi = this.pendingGambleItem;
    this.pendingGambleItem = null;
    if (gi) {
      this.addFloater(this.player.x, this.player.y - 30, tr('fx.skipped', { name: itemName(gi) }), '#9a93a8');
      return;
    }
    const pd = this.pendingPedestal;
    this.pendingPedestal = null;
    if (pd) { pd.declined = true; return; }
    const bs = this.pendingBlood;
    this.pendingBlood = null;
    if (bs) { bs.declined = true; return; }
    const cs = this.pendingCurse;
    this.pendingCurse = null;
    if (cs) { cs.declined = true; return; }
    const s = this.pendingStall;
    this.pendingStall = null;
    if (s) s.declined = true;
  }

  /** Kódex-feloldás felvételkor: skillt adó tárgy → skill, egyébként perk. */
  private registerCollected(item: Item): void {
    if (item.skill) unlockSkill(item.skill);
    else unlockPerk(item.name);
  }

  /**
   * Egy tárgy felvétele a játékosra: hatás + kódex-feloldás + a felvett-listára
   * fűzés + kinézet-frissítés + SZETT-tier-ellenőrzés. MINDEN felvétel-útvonal
   * (pedesztál/bolt/sorsoló/jackpot/admin) ezt hívja, hogy a szett-bónuszok
   * egységesen aktiválódjanak. A hang/részecske a hívónál marad (útvonalanként eltér).
   */
  collectItem(item: Item): void {
    item.apply(this.player);
    this.registerCollected(item);
    this.player.collected.push(item);
    this.player.refreshLook();
    this.applySetTiers(item);
  }

  /**
   * Felvételkor a tárgy minden szett-címkéjére: ha az ÚJ darabszám PONT egy
   * küszöböt ér el, a tier bónusza egyszer lefut + aktiválás-floater. (A számláló
   * felvételenként +1, így minden tier pontosan egyszer sül el a küszöbnél.)
   */
  private applySetTiers(item: Item): void {
    if (!item.tags) return;
    const p = this.player;
    for (const id of item.tags) {
      const tier = tierAtExactly(ITEM_SETS[id], setCount(p.collected, id));
      if (!tier) continue;
      tier.apply(p);
      unlockSetTier(id, tier.need); // a Kódex RENDEK fülén a hatás aktiválás után tárul fel
      const set = ITEM_SETS[id];
      this.addFloater(p.x, p.y - 48, `${tr(set.nameKey)} · ${tr(tier.descKey)}`, set.color);
    }
  }

  /** Egy megnyert/elfogadott tárgy felvétele a játékosra (hang + effekt). */
  private giveItem(item: Item): void {
    this.collectItem(item);
    this.audio.item();
    this.addFloater(this.player.x, this.player.y - 30, tr('fx.pickup', { name: itemName(item), desc: itemDesc(item) }), item.col);
    this.particles.spawn(this.player.x, this.player.y, item.col, 22, 260, 0.8);
  }

  /** Ingyenes pedesztál-tárgy felvétele: alkalmazás + hang/effekt. */
  private collectPedestal(pd: Pedestal): void {
    pd.taken = true;
    this.collectItem(pd.item);
    this.audio.item();
    this.addFloater(this.player.x, this.player.y - 30, tr('fx.pickup', { name: itemName(pd.item), desc: itemDesc(pd.item) }), pd.item.col);
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
      this.collectItem(item);
      this.addFloater(this.player.x, this.player.y - 30, tr('fx.pickup', { name: itemName(item), desc: itemDesc(item) }), item.col);
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
      this.addFloater(shop.ax, shop.ay - 60, tr('fx.noCoins'), '#ff6a6a');
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
        badge: tr('offer.gamble.badge'),
        title: tr('offer.gamble.noWinTitle'),
        desc: tr('offer.gamble.noWinDesc'),
        sub: tr('offer.gamble.noWinSub'),
        color: '#9a93a8',
        acceptLabel: tr('offer.ok'),
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
      this.addFloater(x, y, tr('fx.plusBomb'), '#cfcfd6');
    } else if (out.kind === 'tnt') {
      p.tnt++;
      this.audio.buy();
      this.addFloater(x, y, '+TNT', '#ff7b5a');
    } else if (out.kind === 'heart') {
      p.hp = clamp(p.hp + HP.heart, 0, p.maxHp);
      this.audio.buy();
      this.addFloater(x, y, tr('fx.plusHeart'), '#ff5b6a');
    } else {
      // JACKPOT: véletlen tárgy (a közös, súlyozott rollItem — a perkWeight itt is él)
      const item = rollItem();
      this.audio.jackpot();
      this.addFloater(x, y, tr('fx.jackpot', { name: itemName(item) }), '#ffe9a8');
      this.particles.spawn(x, y, item.col, 26, 300, 0.9);
      this.addShake(6);
      if (item.skill) {
        // skill-tárgy: NEM cseréljük le azonnal — a játékos dönt a felugró ablakban
        this.offerGambleSkill(item);
      } else {
        this.collectItem(item);
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
      badge: tr('offer.skillWon.badge'),
      title: skill ? skillName(skill) : itemName(item),
      desc: skill ? skillDesc(skill) : itemDesc(item),
      sub: (skill ? tr('offer.activeSkill', { n: skill.chargeMax }) : itemDesc(item))
        + (cur ? tr('offer.replaces', { name: skillName(cur) }) : ''),
      color: item.col,
      acceptLabel: tr('offer.take'),
    });
  }

  private doReroll(shop: Shop): void {
    const price = rerollPrice(shop.rerollUses);
    if (this.player.coins < price) {
      this.audio.denied();
      this.addFloater(shop.rx, shop.ry - 30, tr('fx.rerollPoor', { price }), '#ff6a6a');
      return;
    }
    this.player.coins -= price;
    shop.reroll();
    this.pendingStall = null;
    this.audio.gamble();
    this.particles.spawn(shop.rx, shop.ry - 6, '#7fe0c4', 16, 200, 0.6);
    this.addFloater(shop.rx, shop.ry - 30, tr('fx.rerollOk', { price }), '#bdeedd');
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
        badge: tr('offer.freeSkill.badge'),
        title: skill ? skillName(skill) : itemName(pd.item),
        desc: skill ? skillDesc(skill) : itemDesc(pd.item),
        sub: skill ? tr('offer.activeSkillE', { n: skill.chargeMax }) : itemDesc(pd.item),
        color: pd.item.col,
        acceptLabel: tr('offer.take'),
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
        badge: s.offer.kind === 'item' ? tr('offer.purchase.badge') : tr('offer.consumable.badge'),
        title: view.name,
        desc: view.desc,
        sub: tr('offer.priceHave', { price: s.price, coins: p.coins }),
        color: view.color,
        acceptLabel: tr('offer.buy', { price: s.price }),
      });
      return;
    }
  }

  /** Pont → szív-szöveg a vér-oltár ablakhoz (egész szív → „2", tört → „1,5"). */
  private heartsLabel(points: number): string {
    const h = points / HP.heart;
    return h % 1 === 0 ? String(h) : h.toFixed(1).replace('.', ',');
  }

  private updateBloodAltar(altar: BloodAltar, dt: number): void {
    altar.update(dt);
    if (this.pendingStall || this.pendingPedestal || this.pendingBlood) return;
    const p = this.player;
    for (const s of altar.stands) {
      if (s.sold) continue;
      const near = dist2(s.x, s.y, p.x, p.y) < (p.r + 18) ** 2;
      if (!near) { s.declined = false; continue; }
      if (s.declined) continue;
      this.pendingBlood = s;
      this.callbacks.onOffer({
        badge: tr('offer.blood.badge'),
        title: itemName(s.item),
        desc: itemDesc(s.item),
        sub: tr('offer.blood.price', { hearts: this.heartsLabel(s.cost), have: this.heartsLabel(p.hp) }),
        color: s.item.col,
        acceptLabel: tr('offer.blood.buy', { hearts: this.heartsLabel(s.cost) }),
      });
      return;
    }
  }

  /** Vér-oltár vásárlás: ÉLETPONT-fizetség + tárgy felvétele (hang + vér-effekt). */
  private buyBlood(s: BloodStand): void {
    const p = this.player;
    s.sold = true;
    p.hp = Math.max(1, p.hp - s.cost); // a guard miatt sosem 0; biztonsági alsó vágás
    this.addShake(7);
    this.audio.hurt();
    this.particles.spawn(p.x, p.y, '#c01828', 22, 240, 0.7); // vér-fröccs a játékoson
    this.particles.spawn(s.x, s.y - 20, s.item.col, 16, 200, 0.6);
    this.collectItem(s.item);
    this.addFloater(p.x, p.y - 30, tr('fx.pickup', { name: itemName(s.item), desc: itemDesc(s.item) }), s.item.col);
    this.addFloater(p.x, p.y - 52, `-${this.heartsLabel(s.cost)} ♥`, '#ff5b6a');
  }

  /**
   * Átok-reliquárium ajánlat (#38): proximity → felugró ablak. A vér-oltár
   * mintájára, de EGY ajánlat (átok-téma). A `pendingCurse` zárolja a többi
   * ajánlatot, amíg el nem dönti.
   */
  private updateCurseAltar(altar: CurseAltar, dt: number): void {
    altar.update(dt);
    if (this.pendingStall || this.pendingPedestal || this.pendingBlood || this.pendingCurse) return;
    const p = this.player;
    for (const s of altar.stands) {
      if (s.sold) continue;
      const near = dist2(s.x, s.y, p.x, p.y) < (p.r + 18) ** 2;
      if (!near) { s.declined = false; continue; }
      if (s.declined) continue;
      this.pendingCurse = s;
      this.callbacks.onOffer({
        badge: tr('offer.curse.badge'),
        title: itemName(s.item),
        desc: itemDesc(s.item),
        sub: tr('offer.curse.price', { hearts: this.heartsLabel(s.cost), have: this.heartsLabel(p.hp) }),
        color: s.item.col,
        acceptLabel: tr('offer.curse.buy', { hearts: this.heartsLabel(s.cost) }),
      });
      return;
    }
  }

  /** Átokverem fizetség: EGY szív (élet) → INGYEN ritka tárgy (hang + átok-effekt). */
  private buyCurse(s: CurseStand): void {
    const p = this.player;
    s.sold = true;
    p.hp = Math.max(1, p.hp - s.cost); // a guard miatt sosem 0; biztonsági alsó vágás
    this.addShake(7);
    this.audio.hurt();
    this.particles.spawn(p.x, p.y, '#7b3fd0', 22, 240, 0.7); // lila átok-fröccs a játékoson
    this.particles.spawn(s.x, s.y - 20, s.item.col, 16, 200, 0.6);
    this.collectItem(s.item);
    this.addFloater(p.x, p.y - 30, tr('fx.pickup', { name: itemName(s.item), desc: itemDesc(s.item) }), s.item.col);
    this.addFloater(p.x, p.y - 52, `-${this.heartsLabel(s.cost)} ♥`, '#ff5b6a');
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
    this.addFloater(this.player.x, this.player.y - 34, `${skillName(skill)}!`, skill.col);
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
      if (!e.boss) e.flash = 0.1;
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
  /**
   * Kénkő-sugár (#1): folyamatos, raycast-alapú sugár-lőmód. A `Player.beaming`
   * jelzi, hogy ebben a frame-ben tüzel; ekkor a sugár a torkolattól a lövésirányba
   * megy az ELSŐ kőig/falig, és `BEAM.tick` időnként sebzi a vonalon álló MINDEN
   * ellenfelet (átütő jelleg). Saját csavar: a játékos elemi flagjei (burn/poison/
   * freeze) a teljes vonalon terjednek - a sugár így a status-buildek motorja.
   */
  private updateBeam(dt: number): void {
    const p = this.player;
    if (!p.beamMode || !p.beaming || !p.alive) {
      this.beam.on = false;
      p.beamTickAcc = 0;
      return;
    }
    const dir = p.beamDir;
    const ang = Math.atan2(dir.y, dir.x);
    const ox = p.x + dir.x * 18; // a torkolatnál indul (kicsivel a test szélén kívül)
    const oy = p.y + dir.y * 18;

    // hossz: a szoba faláig ÉS az első kőig, a BEAM.range plafonnal vágva
    const rc = this._room;
    const m = 4; // fal-margó
    let wall = BEAM.range;
    if (dir.x > 0) wall = Math.min(wall, (rc.x + rc.w - m - ox) / dir.x);
    else if (dir.x < 0) wall = Math.min(wall, (rc.x + m - ox) / dir.x);
    if (dir.y > 0) wall = Math.min(wall, (rc.y + rc.h - m - oy) / dir.y);
    else if (dir.y < 0) wall = Math.min(wall, (rc.y + m - oy) / dir.y);
    wall = Math.max(0, wall);
    const len = Math.min(wall, this.rayObstacleDistance(ox, oy, ang, wall));
    const ex = ox + dir.x * len;
    const ey = oy + dir.y * len;
    this.beam.on = true;
    this.beam.x0 = ox; this.beam.y0 = oy; this.beam.x1 = ex; this.beam.y1 = ey;
    this.beam.t += dt;

    // játékérzet: a nézet a sugár irányába simul + enyhe, FOLYAMATOS visszarúgás
    // (a sima lövés impulzusos 26-ja ≈ 36/mp; itt dt-vel arányosan adagoljuk)
    if (this.gameFeel) {
      this.setCamLook(dir.x, dir.y);
      p.vx -= dir.x * 36 * dt;
      p.vy -= dir.y * 36 * dt;
    }

    // sebzés-tick: a könny-DPS-hez igazítva (dmg/fireRate), hogy EGY célon ne
    // legyen erősebb a sima lövésnél; a vonalon mindenkit talál (tömeg-előny).
    p.beamTickAcc += dt;
    if (p.beamTickAcc < BEAM.tick) return;
    p.beamTickAcc -= BEAM.tick;
    const dps = (p.dmg / Math.max(0.01, p.fireRate)) * BEAM.dpsMul;
    this.beamDamage(ox, oy, ex, ey, dps * BEAM.tick);
    this.audio.hitEnemy();
  }

  /** A sugár vonalán álló MINDEN ellenfél sebzése (pont-szakasz távolság). */
  private beamDamage(x0: number, y0: number, x1: number, y1: number, dmg: number): void {
    const p = this.player;
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (const e of [...this.currentRoom.enemies]) {
      if (e instanceof Enemy && !e.targetable) continue; // föld alatt / eltűnt
      // a sugár-szakaszra vetített legközelebbi pont (t∈[0,1])
      const tt = clamp(((e.x - x0) * dx + (e.y - y0) * dy) / len2, 0, 1);
      const cx = x0 + dx * tt, cy = y0 + dy * tt;
      const rr = BEAM.width + e.r;
      if (dist2(e.x, e.y, cx, cy) >= rr * rr) continue;
      if (e instanceof Enemy && e.blocking) { // blokkol: ezen a célon elnyeli
        this.particles.spawn(cx, cy, '#cfe0ff', 3, 90, 0.2);
        continue;
      }
      e.hp -= dmg;
      if (!e.boss) e.flash = 0.06;
      this.addDamage(e.x, e.y - e.r, dmg, { color: BEAM.core });
      this.particles.spawn(e.x, e.y, e.col, 3, 110, 0.2);
      // saját csavar: az elemi flagek a TELJES vonalon terjednek
      if (e instanceof Enemy) {
        if (p.burn) e.applyBurn(2.5);
        if (p.poison) e.applyPoison(4);
        if (p.freeze) e.applyFreeze(1.5);
      }
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  /**
   * Kénkő-sugár kirajzolása - procedurális „pokoltűz" nyaláb, NEM lapos vonal.
   * Saját, forgatott koordináta-keretben (origó a torkolatnál, +x a sugár mentén)
   * dolgozunk, így a perpendikuláris (y) gradiens adja a forró-mag → lágy izzó perem
   * átmenetet, a test pedig HULLÁMZÓ szélű (élő plazma). Rétegek additívan:
   * hő-köd → izzó test (wavy) → forró mag → végigfutó energia-csomók. (A torkolat-
   * villanás és a becsapódás-robbanás KIVÉVE - kérésre kevesebb animáció.)
   */
  private drawBeam(ctx: CanvasRenderingContext2D): void {
    if (!this.beam.on) return;
    const { x0, y0, x1, y1, t } = this.beam;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const ang = Math.atan2(dy, dx);
    const W = BEAM.width;
    // szabálytalan villódzás (több, nem összemérhető frekvencia → nem gépies pulzálás)
    const flick = 0.86 + 0.14 * Math.sin(t * 47) + 0.06 * Math.sin(t * 113 + 1.7);
    const flow = t * 6.2; // az energia-áramlás fázisa a sugár mentén

    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';

    // 1) Külső hő-köd: széles, lágy szélű, perpendikuláris gradiens (a sugár „aurája")
    const hazeW = W * 3.4;
    const haze = ctx.createLinearGradient(0, -hazeW, 0, hazeW);
    haze.addColorStop(0.0, 'rgba(190,30,12,0)');
    haze.addColorStop(0.5, `rgba(230,70,28,${0.16 * flick})`);
    haze.addColorStop(1.0, 'rgba(190,30,12,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(-W, -hazeW, len + W * 2, hazeW * 2);

    // 2) Izzó TEST hullámzó peremmel: a fél-szélesség hely+idő-függő zavarral mozog,
    //    a torkolatnál enyhén kiszélesedik (flare). A kitöltés perpendikuláris gradiens:
    //    áttetsző perem → molten narancs → majdnem fehér a tengelynél.
    const segs = Math.max(10, Math.floor(len / 22));
    const bodyW = W * 1.15;
    const halfAt = (i: number): number => {
      const f = i / segs;
      const flare = 1 + Math.exp(-f * 7) * 0.6;            // torkolat-kiszélesedés
      const wob = 1 + 0.16 * Math.sin(f * len * 0.05 - flow * 2) + 0.10 * Math.sin(f * len * 0.11 + flow);
      return bodyW * flare * wob * flick;
    };
    ctx.beginPath();
    ctx.moveTo(0, -halfAt(0));
    for (let i = 1; i <= segs; i++) ctx.lineTo((len * i) / segs, -halfAt(i)); // felső perem
    for (let i = segs; i >= 0; i--) ctx.lineTo((len * i) / segs, halfAt(i));   // alsó perem
    ctx.closePath();
    const body = ctx.createLinearGradient(0, -bodyW * 1.6, 0, bodyW * 1.6);
    body.addColorStop(0.0, 'rgba(150,18,8,0)');
    body.addColorStop(0.28, `rgba(214,42,16,${0.85 * flick})`);
    body.addColorStop(0.5, `rgba(255,150,70,${0.96 * flick})`);
    body.addColorStop(0.72, `rgba(214,42,16,${0.85 * flick})`);
    body.addColorStop(1.0, 'rgba(150,18,8,0)');
    ctx.fillStyle = body;
    ctx.fill();

    // 3) Forró MAG: vékony, fehér-arany, áttetsző szélű szál a tengelyen
    const coreW = Math.max(2.2, W * 0.42) * flick;
    const core = ctx.createLinearGradient(0, -coreW, 0, coreW);
    core.addColorStop(0.0, 'rgba(255,210,150,0)');
    core.addColorStop(0.5, `rgba(255,247,224,${0.95 * flick})`);
    core.addColorStop(1.0, 'rgba(255,210,150,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, -coreW, len, coreW * 2);

    // 4) Végigfutó energia-csomók: pár fényes, megnyúlt folt a mag mentén (mozgás-érzet)
    const pellets = Math.max(2, Math.floor(len / 130));
    for (let i = 0; i < pellets; i++) {
      const px = ((flow * 60 + i * (len / pellets)) % (len + 60)) - 30;
      if (px < 0 || px > len) continue;
      const pr = coreW * 1.7;
      const g = ctx.createRadialGradient(px, 0, 0, px, 0, pr * 3);
      g.addColorStop(0, `rgba(255,244,210,${0.8 * flick})`);
      g.addColorStop(0.5, `rgba(255,130,60,${0.4 * flick})`);
      g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(px, 0); ctx.scale(2.4, 1); // a haladás irányába megnyújtva
      ctx.beginPath(); ctx.arc(0, 0, pr * 1.6, 0, TAU); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Lángkúp (#4): folyamatos, közeli kúp-AoE (lángszóró). A `Player.coning` jelzi a
   * tüzelő frame-et; ekkor a torkolatból a célirányba egy `FLAME.halfAngle` fél-szögű,
   * `FLAME.range` hosszú kúp ég. Tick-sebzés a kúpban álló MINDEN ellenfélre + beépített
   * burn, és a játékos egyéb elemi flagjei (poison/freeze) is terjednek. Saját csavar:
   * a kúp végén player-tulajdonú égő talaj-nyom marad (plafonnal: `FLAME.floorMax`).
   */
  private updateCone(dt: number): void {
    const p = this.player;
    if (!p.flameMode || !p.coning || !p.alive || p.beamMode) { // a sugár elsőbbséget élvez
      this.cone.on = false;
      p.coneTickAcc = 0; p.coneFloorAcc = 0;
      return;
    }
    const ang = Math.atan2(p.coneDir.y, p.coneDir.x);
    const ox = p.x + p.coneDir.x * 14, oy = p.y + p.coneDir.y * 14; // torkolat
    this.cone.on = true;
    this.cone.x = ox; this.cone.y = oy; this.cone.ang = ang; this.cone.t += dt;

    // játékérzet: a nézet a kúp irányába simul + enyhe, folyamatos visszarúgás
    if (this.gameFeel) {
      this.setCamLook(p.coneDir.x, p.coneDir.y);
      p.vx -= p.coneDir.x * 28 * dt;
      p.vy -= p.coneDir.y * 28 * dt;
    }

    // sebzés-tick (a könny-DPS-hez igazítva; a burn DoT a tetejére jön)
    p.coneTickAcc += dt;
    if (p.coneTickAcc >= FLAME.tick) {
      p.coneTickAcc -= FLAME.tick;
      const dps = (p.dmg / Math.max(0.01, p.fireRate)) * FLAME.dpsMul;
      this.coneDamage(ox, oy, ang, dps * FLAME.tick);
      this.audio.hitEnemy();
    }

    // égő talaj-nyom a kúp végén, ritka ütemmel és plafonnal (perf + balansz)
    p.coneFloorAcc += dt;
    if (p.coneFloorAcc >= FLAME.floorEvery) {
      p.coneFloorAcc -= FLAME.floorEvery;
      if (this.hazards.playerFireCount() < FLAME.floorMax) {
        const reach = FLAME.range * (0.6 + Math.random() * 0.35);
        const spread = (Math.random() - 0.5) * FLAME.halfAngle * 1.2;
        const fx = ox + Math.cos(ang + spread) * reach;
        const fy = oy + Math.sin(ang + spread) * reach;
        this.addHazard('fire', fx, fy, FLAME.floorR, FLAME.floorLife, 0, 'player');
      }
    }
  }

  /** A kúpban álló MINDEN ellenfél sebzése (pont-a-kúpban teszt) + elemi flagek. */
  private coneDamage(ox: number, oy: number, ang: number, dmg: number): void {
    const p = this.player;
    const cosHalf = Math.cos(FLAME.halfAngle);
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    const R2 = FLAME.range * FLAME.range;
    for (const e of [...this.currentRoom.enemies]) {
      if (e instanceof Enemy && !e.targetable) continue;
      const vx = e.x - ox, vy = e.y - oy;
      const d2 = vx * vx + vy * vy;
      if (d2 > R2) continue; // hatótávon kívül
      const d = Math.sqrt(d2) || 1;
      // szög-teszt: a célhoz mutató egységvektor a kúp tengelyén belül van-e
      if ((vx / d) * dirX + (vy / d) * dirY < cosHalf) continue;
      if (e instanceof Enemy && e.blocking) { this.particles.spawn(e.x, e.y, '#cfe0ff', 3, 90, 0.2); continue; }
      e.hp -= dmg;
      if (!e.boss) e.flash = 0.05;
      this.addDamage(e.x, e.y - e.r, dmg, { color: FLAME.hot });
      if (e instanceof Enemy) {
        e.applyBurn(2.5);             // a tűz beépített
        if (p.poison) e.applyPoison(4);
        if (p.freeze) e.applyFreeze(1.5);
      }
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  /**
   * Lángkúp kirajzolása - igazi TŰZ-hatás: a kúpot sok átfedő, HEGYESEDŐ, ívelt
   * lángnyelv (flame-lick) adja, mindegyik LINEÁRIS gradienssel (fehér-forró tő →
   * sárga → narancs → vörös → áttetsző füst-hegy). Nincs kerek/radiális folt (a
   * „láva-gömb" érzet onnan jött). A mozgás LASSÚ és organikus (alacsony frekvencia
   * → nem strobe/villog). Forgatott keret: origó a torkolat, +x a tengely.
   */
  private drawCone(ctx: CanvasRenderingContext2D): void {
    if (!this.cone.on) return;
    const { x, y, ang, t } = this.cone;
    const R = FLAME.range, ha = FLAME.halfAngle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = 'lighter';

    const N = 16; // ennyi átfedő lángnyelv adja ki a kúpot
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const base = -ha + 2 * ha * f;
      // lassú, organikus lengés (két nem összemérhető, ALACSONY frekvencia)
      const a = base + 0.09 * Math.sin(t * 2.1 + i * 1.27) + 0.05 * Math.sin(t * 3.3 + i * 0.7);
      // a középső nyelvek hosszabbak (kúp-forma); a hossz lassan lüktet
      const center = 1 - Math.abs(f - 0.5) * 1.3;
      const L = R * (0.5 + 0.46 * center) * (0.72 + 0.28 * Math.sin(t * 2.4 + i * 1.9));
      if (L < 8) continue;
      const tipx = Math.cos(a) * L, tipy = Math.sin(a) * L;
      const baseW = Math.max(3, R * 0.055);
      const nx = -Math.sin(base), ny = Math.cos(base);  // a tő merőlegese (szélesség-irány)
      const bend = 0.16 * Math.sin(t * 1.6 + i) * L;     // a nyelv enyhén oldalra hajlik
      const mx = Math.cos(a) * L * 0.5 + nx * bend, my = Math.sin(a) * L * 0.5 + ny * bend;
      const g = ctx.createLinearGradient(0, 0, tipx, tipy);
      g.addColorStop(0.0, 'rgba(255,248,214,0.82)'); // fehér-forró tő
      g.addColorStop(0.25, 'rgba(255,196,90,0.7)');  // sárga
      g.addColorStop(0.55, 'rgba(255,116,28,0.48)'); // narancs
      g.addColorStop(0.8, 'rgba(214,48,12,0.26)');   // vörös
      g.addColorStop(1.0, 'rgba(150,22,8,0)');        // áttetsző, füstös hegy
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(nx * baseW, ny * baseW);
      ctx.quadraticCurveTo(mx + nx * baseW * 0.5, my + ny * baseW * 0.5, tipx, tipy);
      ctx.quadraticCurveTo(mx - nx * baseW * 0.5, my - ny * baseW * 0.5, -nx * baseW, -ny * baseW);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Felhúzott csapás (#5) töltés-kijelző: a játékos körül egy gyűlő ív + a most
   * leadható sebzés száma. Csak töltés közben (`player.charging`) látszik; a
   * célzásirányból két oldalra nő, full töltésnél pulzál.
   */
  private drawCharge(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (!p.chargeMode || !p.charging || !p.alive) return;
    const f = p.chargeFraction();
    if (f <= 0) return;
    const dir = p.chargeDir;
    const ang0 = Math.atan2(dir.y, dir.x);
    const R = p.r + 12;
    const full = f >= 1;

    ctx.save();
    // halvány háttér-gyűrű (a teljes kört jelzi)
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, TAU);
    ctx.stroke();
    // töltés-ív: a célzásirány körül szimmetrikusan nő (f arányban)
    const sweep = TAU * f;
    ctx.lineWidth = 4;
    ctx.strokeStyle = full ? CHARGE.glow : CHARGE.ring;
    ctx.shadowColor = CHARGE.glow;
    ctx.shadowBlur = 6 + 10 * f;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, ang0 - sweep / 2, ang0 + sweep / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // full töltésnél pulzáló jel a torkolat irányában
    if (full) {
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 70);
      ctx.fillStyle = `rgba(255,210,74,${pulse.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x + dir.x * (R + 5), p.y + dir.y * (R + 5), 4, 0, TAU);
      ctx.fill();
    }
    // sebzés-előnézet a fej fölött (a valós pont-skálán, mint a HUD)
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = full ? '#ffe9a0' : '#ffd24a';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.fillText(p.chargedDamage().toFixed(0), p.x, p.y - p.r - 14);
    ctx.restore();
  }

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
            if (!e.boss) e.flash = 0.1;
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

  /**
   * Fiola kiivása (#44, F-gomb): a következő (legrégebbi) fiolát fogyasztja, a
   * futáson belüli szín→hatás társítás (`fiolaMap`) szerinti hatást alkalmazza, és
   * az első kiivásnál FELFEDI a hatást (`fiolaSeen`). A hatások a MEGLÉVŐ státuszokra
   * épülnek; a bad-trip (burn) tét: a DoT-ot a `updateSelfBurn` tickeli, killhet.
   */
  private drinkFiola(): void {
    const p = this.player;
    if (!p.alive || p.fiolas.length === 0) return;
    const colorIdx = p.fiolas.shift()!;
    const effId = p.fiolaMap[colorIdx] ?? 'heal';
    const def = FIOLA_EFFECT_BY_ID[effId];
    const firstReveal = !p.fiolaSeen[colorIdx];
    p.fiolaSeen[colorIdx] = true;
    if (firstReveal) markFiolaSeen(effId); // Kódex feloldás-kapu (futásokon át)

    this.audio.pickup();
    switch (effId) {
      case 'heal':
        p.hp = clamp(p.hp + FIOLA.heal, 0, p.maxHp);
        this.particles.spawn(p.x, p.y, '#ff5b6a', 16, 200, 0.6);
        break;
      case 'haste':
        p.hasteT = FIOLA.hasteTime;
        this.particles.spawn(p.x, p.y, '#7adfff', 16, 240, 0.55);
        break;
      case 'rage':
        // a bónuszt PONTOSAN a jelenlegi dmg-ből számítjuk, és így vonjuk vissza (Player.update)
        if (p.rageBonus > 0) p.dmg -= p.rageBonus; // korábbi rage felülírása tisztán
        p.rageBonus = p.dmg * (FIOLA.rageDmgMul - 1);
        p.dmg += p.rageBonus;
        p.rageT = FIOLA.rageTime;
        this.particles.spawn(p.x, p.y, '#ff8a3a', 16, 240, 0.6);
        break;
      case 'confuse':
        p.confusedT = FIOLA.confuseTime;
        this.particles.spawn(p.x, p.y, '#c89adf', 16, 220, 0.55);
        break;
      case 'burn':
        // önsorsoló tűz-DoT: a teljes időt felvesszük, a tick-eket az updateSelfBurn adja le
        p.selfBurnT = FIOLA.burnTick * FIOLA.burnTicks;
        p.selfBurnAcc = 0;
        this.audio.burn();
        this.particles.spawn(p.x, p.y, '#ff7b3a', 18, 200, 0.6);
        break;
      case 'slow':
        p.slowT = FIOLA.slowTime;
        p.slowMul = FIOLA.slowMul;
        this.particles.spawn(p.x, p.y, '#8aa0c0', 16, 180, 0.5);
        break;
    }

    // floater: felfedésnél a hatás neve, már ismertnél is (egyértelmű visszajelzés)
    const col = def.good ? (firstReveal ? '#9ad88a' : '#cfe8c0') : '#e88a6a';
    this.addFloater(p.x, p.y - 30, tr(def.nameKey), col);
  }

  /**
   * Rossz adag-fiola (bad trip): önsorsoló tűz-DoT. Fix (raw) sebzés tickenként,
   * az i-frame-et megkerüli (mint a talaj-veszély), és KILLHET - ez a kockázat a
   * vegyes fiola-paletta tétje. A `updatePlay` hívja a játékos frissítése után.
   */
  private updateSelfBurn(dt: number): void {
    const p = this.player;
    if (p.selfBurnT <= 0 || !p.alive) return;
    p.selfBurnT = Math.max(0, p.selfBurnT - dt);
    p.selfBurnAcc += dt;
    while (p.selfBurnAcc >= FIOLA.burnTick && p.alive) {
      p.selfBurnAcc -= FIOLA.burnTick;
      this.damagePlayer(FIOLA.burnDmg, 'burn', true, true); // raw + dot (nem skálázódik, megkerüli az i-frame-et)
    }
  }

  /**
   * Sorslap kijátszása (#46/#47, G-gomb): a következő (legrégebbi) lapot fogyasztja
   * és az ISMERT hatását AZONNAL kiváltja. A kártyák a meglévő SKILL-könyvtárból
   * merítenek (a skill `activate`-jét hívják), a 2 rúna (purge/ward) erős egyszeri
   * effekt. Tisztán tranziens/egyszeri - a difficulty playerPower-t nem mozgatja.
   */
  private useCard(): void {
    const p = this.player;
    if (!p.alive || p.cards.length === 0) return;
    const id: CardEffect = p.cards.shift()!;
    const def = CARD_BY_ID[id];
    this.audio.pickup();
    switch (id) {
      case 'nova':  SKILL_BY_ID['nova']!.activate(this); break;
      case 'slow':  SKILL_BY_ID['slow']!.activate(this); break;
      case 'heal':  SKILL_BY_ID['heal']!.activate(this); break;
      case 'blink': SKILL_BY_ID['blink']!.activate(this); break;
      case 'purge': this.purgeEnemies(); break;
      case 'ward':
        p.invuln = Math.max(p.invuln, CARD.wardTime);
        this.particles.spawn(p.x, p.y, '#3df0ff', 22, 220, 0.6);
        break;
    }
    this.addFloater(p.x, p.y - 30, tr(def.nameKey), def.col);
  }

  /**
   * Pusztítás rúnája (szoba-törlő): a NEM-boss ellenfeleket azonnal megöli, a fix-
   * statú bossnak `CARD.purgeBossDmg` fix sebzést visz be (anti-OP: nem trivializálja).
   */
  private purgeEnemies(): void {
    this.addShake(16);
    this.audio.boom();
    this.particles.spawn(this.player.x, this.player.y, '#ff8a3a', 30, 400, 0.7);
    this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 16, 300, 0.6);
    for (const e of [...this.currentRoom.enemies]) {
      if (e.boss) {
        e.hp -= CARD.purgeBossDmg;
        this.addDamage(e.x, e.y - e.r, CARD.purgeBossDmg, { color: '#ff6a4a' });
        if (e.hp <= 0) this.killEnemy(e);
      } else {
        this.addDamage(e.x, e.y - e.r, Math.max(0, e.hp), { color: '#ff6a4a' });
        e.hp = 0;
        this.killEnemy(e);
      }
    }
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
        if (!e.boss) e.flash = 0.12;
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
    // titkos szoba (#37): fal melletti robbanás feltárhatja a rejtett szomszédot
    if (!this.labyrinth) this.tryRevealSecret(b.x, b.y);
  }

  /**
   * Titkos szoba feltárása fal melletti robbanáskor (#37): ha a robbanás elég közel
   * van egy falhoz, és arra REJTETT titkos szomszéd van, feltárul (ajtó megnyílik,
   * minimapon megjelenik). A rossz irányokat a `revealSecret` magától kiszűri.
   */
  private tryRevealSecret(bx: number, by: number): void {
    const rc = this._room;
    const D = SECRET.revealDist;
    const checks: Array<[Dir, boolean]> = [
      ['W', bx - rc.x < D],
      ['E', rc.x + rc.w - bx < D],
      ['N', by - rc.y < D],
      ['S', rc.y + rc.h - by < D],
    ];
    for (const [dir, near] of checks) {
      if (!near) continue;
      if (this.dungeon.revealSecret(dir)) {
        this.addShake(16);
        this.particles.spawn(bx, by, '#ffe08a', 26, 320, 0.7);
        this.particles.spawn(bx, by, '#cfa0ff', 14, 240, 0.6);
        this.audio.door();
        this.addFloater(this.cx, this.cy - 40, tr('fx.secretFound'), '#ffe08a');
        return;
      }
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
        this.addFloater(this.player.x, this.player.y - 26, tr('fx.tickLatch'), '#c86a6a');
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
    this.addFloater(p.x, p.y - 22, tr('fx.tickMinus'), '#d05a5a');
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
    // Seed-kapu modal (#49): a hub be van fagyasztva (a player nem mozog, az
    // állomás nem trigger újra) - csak a hangulat-animáció él tovább.
    if (this.seedGate) { this.particles.update(dt); this.fx.update(dt); return; }
    if (this.stageSelect) { this.updateStageSelect(dt); return; } // HUB-mód szakasz-választó
    if (this.charSelect) { this.updateCharacterSelect(dt); return; } // vándor-választó (#53)
    if (this.chalSelect) { this.updateChallengeSelect(dt); return; } // kihívás-választó (#51)
    if (this.hub) { this.updateHub(dt); return; } // hub: harc nélküli mód-választó
    // Hit-stop: pár frame-re a teljes játékmenet áll (a kiváltó ütés „súlyt" kap).
    // VALÓS dt-vel csökken (nem a fagyasztott idővel), így mindig feloldódik.
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    this.computeRoom();
    this.collision.indexEnemies(); // ellenfél-térrács erre a frame-re (lövedék-broad-phase)
    this.runStats.tick(dt);
    if (this.isSpecialRun) this.stageClock += dt; // a jelenlegi HUB-szakasz élő ideje
    if (this.slideP < 1) this.slideP = Math.min(1, this.slideP + dt / World.SLIDE_DUR);
    if (this.enemyFreezeT > 0) this.enemyFreezeT -= dt;
    if (this.bossIntro) { this.bossIntro.t -= dt; if (this.bossIntro.t <= 0) this.bossIntro = null; }

    // Csalások: kivégzés (Szóköz → minden ellenfél) + max arany (folyamatos feltöltés)
    if (this._cheats.execute && this.input.isDown(' ')) {
      const enemies = [...this.currentRoom.enemies];
      for (const e of enemies) this.killEnemy(e);
    }
    if (this._cheats.maxGold) this.player.coins = CHEAT_MAX_GOLD;

    this.player.update(dt, this);
    this.updateBeam(dt); // Kénkő-sugár (#1): folyamatos sugár sebzése/rajz-állapota
    this.updateCone(dt); // Lángkúp (#4): folyamatos kúp-AoE sebzése + égő talaj
    this.updateSelfBurn(dt); // Rossz adag-fiola (#44): önsorsoló tűz-DoT tickjei
    this.updateFamiliars(dt); // keringő orbok sebzése (Wave 4)

    // aktív skill (E) + robbanószer lerakás (T = TNT, B = bomba)
    // E-gomb: a szerencse-szobában az oltárt/rúnát működteti, egyébként az aktív skillt.
    if (this.input.consumeSkill()) { if (!this.tryAltarAction()) this.useSkill(); }
    if (this.input.consumeTnt()) this.placeBomb('tnt');
    if (this.input.consumeBomb()) this.placeBomb('bomb');
    if (this.input.consumeFiola()) this.drinkFiola();
    if (this.input.consumeCard()) this.useCard();

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

    // Pecsétgyűrűk (#2): utazó sebző-korongok
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.update(dt, this);
      if (r.dead) this.rings.splice(i, 1);
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
          this.addFloater(this.player.x, this.player.y - 22, tr('fx.slow'), '#9fdf4a');
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
          this.addFloater(pk.x, pk.y - 16, tr('fx.plusBomb'), '#cfcfd6');
          room.pickups.splice(i, 1);
        } else if (pk.type === 'fiola') {
          // a fiola a zsebbe kerül (a szín-index a hatást azonosítja - lásd drinkFiola)
          this.player.fiolas.push(pk.fiolaColor);
          this.audio.pickup();
          this.addFloater(pk.x, pk.y - 16, tr('fx.plusFiola'), '#bcd0e8');
          room.pickups.splice(i, 1);
        } else if (pk.type === 'card') {
          // a sorslap a (külön) zsebbe kerül; ISMERT hatású, a hatás-id-t tároljuk (lásd useCard)
          this.player.cards.push(pk.cardId);
          markCardSeen(pk.cardId); // Kódex feloldás-kapu (felvételkor, mert a hatás ismert)
          this.audio.pickup();
          this.addFloater(pk.x, pk.y - 16, tr('fx.plusCard'), CARD_BY_ID[pk.cardId].col);
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

    // vér-oltár: állványok (vér-ajánlat ablakkal) + medence animáció
    if (room.bloodAltar) this.updateBloodAltar(room.bloodAltar, dt);
    if (room.curseAltar) this.updateCurseAltar(room.curseAltar, dt);

    // szoba kipucolva?
    if (!room.cleared && room.enemies.length === 0) {
      room.cleared = true;
      this.runStats.roomsCleared++;
      this.audio.door();
      this.chargeSkill();
      if (room.type === 'boss') {
        this.trapdoor = { x: this.cx, y: this.cy, bob: 0 };
        this.addFloater(this.cx, this.cy - 60, tr('fx.bossDefeated'), '#ff7b4d');
        this.score += 500;
        // Az első legyőzött boss a futásban → Sentex narrációja.
        if (!this.firstBossVoicePlayed) {
          this.firstBossVoicePlayed = true;
          this.audio.playVoice('sentex');
        }
      } else if (this.dungeonRun) {
        // dungeon-mód köztes (nem-boss) szobája: csapóajtó a következő szobára
        this.trapdoor = { x: this.cx, y: this.cy, bob: 0 };
      } else {
        // Kipucolás-drop: a szoba seedjéből KÜLÖN sózva → ölés-sorrendtől FÜGGETLEN,
        // mert a roll EGYSZER fut (a szoba kiürülésekor). Ua. seed = ua. drop.
        withRng(mulberry32(mix(this.roomSeed(room), 0xd309)), () => {
          // szobánként legfeljebb egy pickup, az esély a dropConfig nettóiból (szerencse növeli)
          if (random() < roomDropChance() + this.player.luck * TUNING.luckRoomDrop) {
            this.dropPickup(this.cx, this.cy);
          }
        });
      }
    }

    // ajtó-rács animáció: kipucolt szobánál felhúzódik, egyébként zárva marad
    this.doorT += ((room.cleared ? 1 : 0) - this.doorT) * Math.min(1, dt * 9);

    // csapóajtó a következő szintre (boss-rohamban: a következő bossra / győzelemre)
    if (this.trapdoor) {
      this.trapdoor.bob += dt * 3;
      if (dist2(this.trapdoor.x, this.trapdoor.y, this.player.x, this.player.y) < (this.player.r + 16) ** 2) {
        if (this.bossRush) {
          this.advanceBossRush();
        } else if (this.dungeonRun) {
          this.advanceDungeon();
        } else {
          // szint-teljesítés bónusz: mélységgel skálázva (mélyebb = több)
          this.score += 100 * this.floor;
          // szint-tisztítási idő-rekord (a SZÁM stabil → versenyezhető), majd számláló
          recordFloorClear(this.floor, this.runStats.floor);
          this.runStats.floorsCleared++;
          this.nextFloor();
        }
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
      if (!this.labWon && dist2(this.player.x, this.player.y, ex, ey) < (TILE * 0.55) ** 2) {
        this.labWon = true;
        if (this.labGauntlet) {
          // 15-pályás gauntlet: tovább a következő pályára / győzelem (saját ág)
          this.advanceLabGauntlet();
        } else {
          this.score += 100 * this.floor; // teljesítés-bónusz (mint a csapóajtónál)
          // labirintus-idő rekord (fejezetenként stabil → versenyezhető), majd számláló
          recordLabClear(this.labChapterId, this.runStats.lab);
          this.runStats.labsCleared++;
          this.audio.door();
          // JUTALOM a kockázatért (időlimit + ellenfelek): garantált tárgy + érme.
          // A tárgy/érme a karakteren marad (a kapun át indított labirintusban).
          const reward = rollItem();
          this.giveItem(reward);
          const coins = 8 + this.floor * 2;
          this.player.coins += coins;
          this.score += coins * 25;
          this.particles.spawn(this.player.x, this.player.y, '#ffd36a', 22, 220, 0.8);
          // megálló jutalom-kártya: a játékos rendesen lássa, mit kapott; a kilépést
          // a RENDBEN gomb (vagy ESC) váltja ki (lásd acceptOffer/declineOffer).
          this.pendingLabExit = true;
          this.callbacks.onOffer({
            badge: tr('lab.reward.badge'),
            title: itemName(reward),
            desc: itemDesc(reward),
            sub: tr('lab.reward.sub', { coins }),
            color: reward.col,
            acceptLabel: tr('offer.ok'),
            hideDecline: true,
          });
        }
      } else if (!this.labWon && this.player.alive && (this.labTimeLeft -= dt) <= 0) {
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
            // a boss/dungeon portál a feloldás-feltételt mutatja (#52)
            const msg =
              p.id === 'boss' ? tr('fx.bossLocked', { n: BOSS_RUSH.unlockFloor })
              : p.id === 'dungeon' ? tr('fx.dungeonLocked', { n: DUNGEON_RUN.unlockFloor })
              : tr('fx.comingSoon');
            this.addFloater(c.x, c.y - 38, msg, '#cdbb9a');
            this.audio.denied();
          } else {
            this.audio.stairs();
            this.onHubChoice?.(p.id);
          }
        }
        break;
      }
    }
    // meta-állomások (Ú3): rálépve a Game nyitja a kódex/rang nézetet
    if (!near) {
      for (const s of this.hubStations) {
        const c = this.cellCenter(s.col, s.row);
        if (dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2) {
          near = true;
          if (this.hubArmed) {
            this.hubArmed = false;
            this.audio.stairs();
            this.onHubStation?.(s.id);
          }
          break;
        }
      }
    }
    // Vándor-szobor (#53): rálépve a karakterválasztó nyílik (a hubon belül)
    if (!near && this.hubCharStation) {
      const c = this.cellCenter(this.hubCharStation.col, this.hubCharStation.row);
      if (dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2) {
        near = true;
        if (this.hubArmed) { this.hubArmed = false; this.openCharacterSelect(); }
      }
    }
    // Kihívás-obeliszk (#51): rálépve a kihívás-választó nyílik
    if (!near && this.hubChalStation) {
      const c = this.cellCenter(this.hubChalStation.col, this.hubChalStation.row);
      if (dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2) {
        near = true;
        if (this.hubArmed) { this.hubArmed = false; this.openChallengeSelect(); }
      }
    }
    // Krónikás NPC: rálépve egy forgó hangulat-sort vet fel (nincs overlay)
    if (!near && this.hubNpc) {
      const c = this.cellCenter(this.hubNpc.col, this.hubNpc.row);
      if (dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 26) ** 2) {
        near = true;
        if (this.hubArmed) {
          this.hubArmed = false;
          this.addFloater(c.x, c.y - 40, tr(`hub.npc.${this.hubNpcLine}`), '#e8d8b0');
          this.hubNpcLine = (this.hubNpcLine + 1) % 3;
        }
      }
    }
    if (!near) this.hubArmed = true; // lelépett minden portálról/állomásról → újra élesedik
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
    if (this.stageSelect) { this.renderStageSelect(ctx); return; }
    if (this.charSelect) { this.renderCharacterSelect(ctx); return; }
    if (this.chalSelect) { this.renderChallengeSelect(ctx); return; }
    if (this.hub) { this.renderHub(ctx); return; }
    if (this.labyrinth) { this.renderLabyrinth(ctx); return; }

    // Szobaváltás-csúsztatás: az új szoba a mozgásirány felőli képernyő-élről
    // úszik be (slx/sly), a régi pillanatkép vele szemben csúszik ki (lent).
    const sliding = this.slideP < 1 && this.slideSnap !== null && this.slideDir !== null;
    let slx = 0, sly = 0;
    let se = 0;
    if (sliding) {
      const W = this.engine.width, H = this.engine.height;
      se = 1 - Math.pow(1 - this.slideP, 3); // easeOutCubic
      const sx = this.slideDir === 'E' ? W : this.slideDir === 'W' ? -W : 0;
      const sy = this.slideDir === 'N' ? -H : this.slideDir === 'S' ? H : 0;
      slx = sx * (1 - se);
      sly = sy * (1 - se);
    }

    ctx.save();
    ctx.translate(slx + this.fx.camOffX(), sly + this.fx.camOffY());

    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    this.drawRoom(ctx);
    this.drawObstacles(ctx);
    this.hazards.draw(ctx);
    this.particles.draw(ctx);

    const room = this.currentRoom;
    for (const pk of room.pickups) pk.draw(ctx);
    if (room.shop) room.shop.draw(ctx);
    if (room.bloodAltar) room.bloodAltar.draw(ctx);
    if (room.curseAltar) room.curseAltar.draw(ctx);
    if (room.pedestal && !room.pedestal.taken) room.pedestal.draw(ctx);
    if (room.gate) this.drawGate(ctx, room.gate);
    if (room.dungeonGate) this.drawDungeonGate(ctx, room.dungeonGate);
    if (this.trapdoor) drawTrapdoor(ctx, this.trapdoor);
    drawProjectileGlow(ctx, this.tears, this.ebullets, this.bombs);
    for (const bomb of this.bombs) bomb.draw(ctx);

    const bulletT = performance.now() / 1000;
    for (const b of this.ebullets) drawBullet(ctx, b, bulletT);
    ctx.shadowBlur = 0;

    for (const e of room.enemies) e.draw(ctx);
    for (const t of this.tears) t.draw(ctx);
    for (const r of this.rings) r.draw(ctx); // Pecsétgyűrűk (#2)
    this.drawBeam(ctx); // Kénkő-sugár (#1) az ellenfelek fölött, a játékos alatt
    this.drawCone(ctx); // Lángkúp (#4) ugyanitt
    if (this.player.alive) this.player.draw(ctx);
    this.drawCharge(ctx); // Felhúzott csapás (#5) töltés-gyűrű a játékos fölött
    this.drawFamiliars(ctx); // keringő orbok + blokkoló légy (Wave 4)
    this.drawAttachedTicks(ctx); // a játékoson ülő kullancsok

    // szoba-méretű légköri animáció (eső/köd/szél…) az entitások fölött.
    // A sablon-jel erősebb; ha nincs, a fejezet-téma alap-effektje (ambient) szól.
    const ambient = room.anim ?? (this._theme.ambient ? MAP_ANIM_BY_CH[this._theme.ambient] : undefined);
    if (ambient) ambient(ctx, this._room, performance.now() / 1000);

    // ködfelhők az entitások fölött (ténylegesen eltakarják, ami alattuk van)
    this.hazards.drawFog(ctx);

    // 2D fény-térkép: ambient sötétség + dinamikus lámpák (multiply) — a látótáv
    // (sight) most a játékos-fáklya sugarát skálázza, így ez a régi drawFog-ot is kiváltja
    this.applyLighting(ctx);

    // lebegő szövegek
    this.fx.draw(ctx);

    // teszt-aréna: minden (nem-boss) ellenfél fölött a TÉNYLEGES sebzése
    if (this.sandbox) drawDamageLabels(ctx, this.currentRoom.enemies, this.floor);

    ctx.restore();

    // A régi szoba pillanatképe a mozgásiránnyal SZEMBEN csúszik ki (ugyanaz az
    // eased érték, így a két szoba éle pontosan egymáshoz simul, nincs rés).
    if (sliding && this.slideSnap) {
      const W = this.engine.width, H = this.engine.height;
      const ox = (this.slideDir === 'E' ? -W : this.slideDir === 'W' ? W : 0) * se;
      const oy = (this.slideDir === 'N' ? H : this.slideDir === 'S' ? -H : 0) * se;
      ctx.drawImage(this.slideSnap, ox, oy, W, H);
    }
  }

  // ---- Hub (mód-választó) kirajzolása ----
  /**
   * Hub-render: egyetlen, normál méretű terem (ajtók nélkül), középen a rúna-
   * glyph + játékos, a négy fal felé egy-egy portál. A zárt portálokra lakat-
   * fátyol kerül. A teljes-képernyős látótáv-sötétséget (drawFog) SZÁNDÉKOSAN
   * kihagyjuk, hogy mind a négy portál látszódjon.
   */
  private renderHub(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.fx.camOffX(), this.fx.camOffY());

    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);

    const rc = this._room;
    const W = ROOM.WALL;
    const th = this._theme;

    // padló (gyorsítótárból) + szél-árnyalat (memoizált gradiens)
    this.drawCachedFloor(ctx);
    ctx.fillStyle = vignetteGradient(ctx, this.cx, this.cy, rc, th.vignette);
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

    // hangulat-parázstartó a jobb alsó sarokban (a Krónikás párja, csak dísz)
    const brz = this.cellCenter(10.8, 5);
    drawHubBrazier(ctx, brz.x, brz.y, t);

    // meta-állomások (Ú3) - a közelség kiemeli a feliratot
    for (const s of this.hubStations) {
      const c = this.cellCenter(s.col, s.row);
      const near = dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2;
      drawHubStation(ctx, c.x, c.y, th.accent, s.id, near, t);
    }
    // Krónikás NPC
    if (this.hubNpc) {
      const c = this.cellCenter(this.hubNpc.col, this.hubNpc.row);
      drawHubNpc(ctx, c.x, c.y, t);
    }
    // Vándor-szobor (#53) - a jelenleg választott vándor accentjével
    if (this.hubCharStation) {
      const c = this.cellCenter(this.hubCharStation.col, this.hubCharStation.row);
      const sel = CHARACTER_BY_ID[loadCharacterId()] ?? CHARACTERS[0]!;
      const near = dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2;
      drawHubCharStatue(ctx, c.x, c.y, sel.accent, tr('char.station'), near, t);
    }
    // Kihívás-obeliszk (#51)
    if (this.hubChalStation) {
      const c = this.cellCenter(this.hubChalStation.col, this.hubChalStation.row);
      const near = dist2(c.x, c.y, this.player.x, this.player.y) < (this.player.r + 24) ** 2;
      drawHubChalObelisk(ctx, c.x, c.y, '#d86a6a', tr('challenge.station'), near, t);
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
    ctx.translate(this.fx.camOffX(), this.fx.camOffY());
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
    drawProjectileGlow(ctx, this.tears, this.ebullets, this.bombs);
    for (const bomb of this.bombs) bomb.draw(ctx);
    const bulletT = performance.now() / 1000;
    for (const b of this.ebullets) drawBullet(ctx, b, bulletT);
    ctx.shadowBlur = 0;
    for (const e of room.enemies) e.draw(ctx);
    for (const t of this.tears) t.draw(ctx);
    for (const r of this.rings) r.draw(ctx); // Pecsétgyűrűk (#2) a labirintusban is
    this.drawBeam(ctx); // Kénkő-sugár (#1) a labirintusban is
    this.drawCone(ctx); // Lángkúp (#4) a labirintusban is
    if (this.player.alive) this.player.draw(ctx);
    this.drawCharge(ctx); // Felhúzott csapás (#5) a labirintusban is
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
    for (const r of this.rings) lt.add(r.x + offX, r.y + offY, r.rad * 1.6, r.color, 0.7); // Pecsétgyűrűk (#2) fénye
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

  private drawCachedFloor(ctx: CanvasRenderingContext2D): void {
    this.floors.drawFloor(ctx, this._room, this.currentRoom, this._theme, this.engine.pixelRatio, (x, y) => this.isBlocked(x, y));
  }

  private drawCachedSplats(ctx: CanvasRenderingContext2D): void {
    this.floors.drawSplats(ctx, this._room, this.currentRoom, this.engine.pixelRatio);
  }

  private drawRoom(ctx: CanvasRenderingContext2D): void {
    const rc = this._room;
    const th = this._theme;

    if (this.currentRoom.type === 'item') {
      // SZERENCSE-SZOBA: tiszta, díszes padló — nincs kosz/repedés/dekoráció.
      // A statikus márvány+mandala gyorsítótárból (egy drawImage), csak a forgó
      // belső csillag él — különben a teljes díszpadló frame-enként újrasült (FPS-feleződés).
      this.floors.drawLuckFloor(ctx, rc, this.currentRoom, this.cx, this.cy, this.engine.pixelRatio);
      drawLuckSpinner(ctx, this.cx, this.cy, Math.min(rc.w, rc.h) * 0.46, performance.now() / 1000);
    } else {
      // ---- procedurális kőpadló ----
      // A padló + pocsolyák statikusak a szobán belül → gyorsítótárból, egyetlen
      // drawImage-dzsel (lásd drawCachedFloor). A foltok/dekoráció ezután élőben,
      // mert azok harc közben változnak / témánként animálnak.
      this.drawCachedFloor(ctx);
      this.drawCachedSplats(ctx);
      drawDecorations(ctx, this.currentRoom, th, (x, y) => this.isBlocked(x, y));

      // szél-árnyalat (memoizált gradiens - szobánként állandó)
      ctx.fillStyle = vignetteGradient(ctx, this.cx, this.cy, rc, th.vignette);
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);

      // VÉR-OLTÁR szoba: vörös, baljós tónus a kőpadló fölött (a hangulat miatt)
      if (this.currentRoom.type === 'blood') {
        const bg = ctx.createRadialGradient(this.cx, this.cy, 40, this.cx, this.cy, Math.max(rc.w, rc.h) * 0.62);
        bg.addColorStop(0, 'rgba(120,12,20,0.10)');
        bg.addColorStop(1, 'rgba(60,4,10,0.46)');
        ctx.fillStyle = bg;
        ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      }

      // ÁTOKVEREM szoba: hideg lila/beteges tónus (megkülönbözteti a vér vöröstől)
      if (this.currentRoom.type === 'curse') {
        const bg = ctx.createRadialGradient(this.cx, this.cy, 40, this.cx, this.cy, Math.max(rc.w, rc.h) * 0.62);
        bg.addColorStop(0, 'rgba(80,30,130,0.10)');
        bg.addColorStop(1, 'rgba(34,10,58,0.48)');
        ctx.fillStyle = bg;
        ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      }
    }

    drawWalls(ctx, rc, th);
    drawDoors(ctx, rc, this.cx, this.cy, this.doorT, th, (dir) => this.dungeon.hasNeighbor(dir));
  }

  private drawObstacles(ctx: CanvasRenderingContext2D): void {
    const obs = this.currentRoom.obstacles;
    // 1) víz a padlóra, EGY összefüggő folyótestként (az entitások alá kerül)
    const water = obs.filter((o) => o.kind === 'water');
    if (water.length) this.drawWater(ctx, water);
    // 2) STATIKUS tárgyak: egyetlen gyorsítótárazott rétegként (egy drawImage).
    //    A kő/fa/láda/dísz a szobán belül nem változik → fölösleges frame-enként
    //    újrarajzolni (friss gradiensekkel). Lásd PropCache.
    this.props.draw(ctx, this._room, this.currentRoom, this._theme, this.engine.pixelRatio, (c, r) => this.cellRect(c, r));
    // 3) ANIMÁLT tárgyak élőben (fáklya/tűz/kristály/fű/indák… + luckrock); a víz
    //    már megvolt fent, külön folyótestként.
    const t = performance.now() / 1000;
    for (const o of obs) {
      if (o.kind === 'water' || !isAnimatedProp(o.kind)) continue;
      const r = this.cellRect(o.col, o.row);
      if (o.kind === 'luckrock') drawLuckRock(ctx, r, o.col, o.row, t);
      else drawTerrainObstacle(ctx, o.kind, r, this._theme, o.col, o.row, t);
    }
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
    drawWaterBody(ctx, this.waterLayout(cells), performance.now() / 1000);
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

}
