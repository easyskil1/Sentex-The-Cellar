/** Közös, könnyű adatszerkezetek, amelyeket több modul is használ. */

/** Téglalap (a szoba belső területe). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Lövedék-megjelenés. Minden stílusnak külön alakja / színe / effektje van, így
 * ránézésre meg lehet különböztetni, melyik ellenfél lőtte. A renderelés a
 * `BulletRenderer`-ben van; a sebesség alapból nyújtja a testet (gyorsabb =
 * keskenyebb, hosszúkásabb), a stílus pedig a karaktert adja hozzá.
 *   ember  — alap narancs-vörös plazmagömb (általános lövő, bossok)
 *   energy — kékes energialövedék: fényes mag, nyúlt, enyhén vibrál
 *   poison — savzöld méreggömb, buborékos csillanással
 *   slime  — hosszúkás nyálcsepp a haladás irányába
 *   bone   — csontfehér szilánk: hegyes, pörgő
 *   stone  — szürke, szabálytalan kőtömb, lassan forgó (kövület)
 *   arcane — lila bűbáj-orb: lüktető gyűrű + szikrakereszt, vibrál
 *   sonic  — halvány, táguló hanghullám-gyűrű (csak körvonal)
 *   fire   — lobogó tűzgolyó: vörös-narancs-fehér rétegek, libegő lángnyelvek
 *   pellet — apró, sötét-arany sörét
 *   heavy  — nagy, izzó nehéz-lövedék hosszú fénycsóvával (mesterlövész)
 */
export type BulletStyle =
  | 'ember'
  | 'energy'
  | 'poison'
  | 'slime'
  | 'bone'
  | 'stone'
  | 'arcane'
  | 'sonic'
  | 'fire'
  | 'pellet'
  | 'heavy'
  | 'gas';

/** Ellenséges lövedék. */
export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  /** Vizuális stílus (lásd {@link BulletStyle}). Hiányában: `ember`. */
  style?: BulletStyle;
  /** Mérgező köpés: becsapódáskor mérgező tócsát hagy a padlón. */
  poison?: boolean;
  /** Nyál-köpés: hosszúkás, zöldes nyálcsepp alakban, a haladás irányába nyúlva. */
  slime?: boolean;
  /** Gáz-lövedék (gázzsák): találatkor a SZOBA végéig -50% sebesség a játékosra. */
  slow?: boolean;
}

/**
 * Talaj-veszély: egy ellenfél által a padlóra hagyott terület-effekt.
 *   poison — mérgező tócsa, periodikusan sebzi a benne álló játékost
 *   fire   — égő folt, sebzi a benne állót (rövid életű)
 *   fog    — köd, csak látást zavar (2–10 mp után eltűnik)
 *   mine   — ketyegő akna: a `life` a gyújtózsinór; lejártakor robban
 */
export type HazardKind = 'poison' | 'fire' | 'fog' | 'mine';

export interface Hazard {
  kind: HazardKind;
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  age: number; // mp a keletkezés óta (benövéshez / animációhoz)
  tick: number; // sebző-ütem visszaszámláló
  arm?: number; // telegraf-idő (mp): eddig csak látszik a zóna, NEM sebez (becsapódó AoE-hoz)
}

/** Lebegő szöveg (pl. +pont, +szív). */
export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
  /** Vízszintes sodródás (sebzésszámoknál szétszórja az egymásra eső találatokat). */
  vx?: number;
  /** Kezdő élettartam — ha jelen van, a floater „sebzésszám”: pop-animáció + kontúr. */
  max?: number;
  /** Alap betűméret px-ben (alap 15). A sebzésszám a sebzéssel arányosan nagyobb. */
  size?: number;
}

/**
 * Pálya-tárgyak (a szoba rács-cellái). Nem minden tárgy akadály:
 *   rock     — kő: tömör, robbantható (bomba), könnyel nem törhető
 *   tree     — fa: tömör, robbantható, könnyel nem törhető
 *   crate    — fa doboz: tömör, KÖNNYEKKEL SZÉTLŐHETŐ (eshet belőle zsákmány)
 *   water    — folyó/víz: NEM akadály (átjárható, a lövedékek átrepülnek felette)
 *   luckrock — szerencse-kő: CSAK a szerencse-szobában. Aranyeres kristályos
 *              szikla, bombával/TNT-vel robbantható, alatta GARANTÁLT érme.
 *
 * A többi a TEREPTÁR (a Pálya-szerkesztő részletes tereptárgyai). Három csoport:
 *   - TÖMÖR dísz   (solid, bombával pusztítható): sziklák, fák, oszlopok, kút, üst…
 *   - TÖRHETŐ      (könnyel szétlőhető, eshet zsákmány): barrel, pots
 *   - ÁTJÁRHATÓ dísz (decal, nem ütközik, az entitások alá rajzolódik): fű, virág,
 *     gomba, páfrány, kavics, csont, indák — pusztán hangulati.
 */
export type ObstacleKind =
  | 'rock' | 'tree' | 'crate' | 'water' | 'luckrock'
  // TEREPTÁR — tömör dísz
  | 'boulder' | 'slate' | 'bush' | 'thornbush' | 'pine' | 'drytree' | 'stump'
  | 'log' | 'crystals' | 'deadtree' | 'cactus' | 'stalagmites' | 'torch'
  | 'brazier' | 'tombstone' | 'pillar' | 'chest' | 'cauldron' | 'campfire' | 'well'
  // TEREPTÁR — törhető
  | 'barrel' | 'pots'
  // TEREPTÁR — átjárható dísz (decal)
  | 'mushrooms' | 'bones' | 'grass' | 'reeds' | 'fern' | 'flowers' | 'pebbles' | 'vines'
  // GOTH TEREPTÁR — tömör dísz
  | 'coffin' | 'gravecross' | 'celticcross' | 'angelstatue' | 'gargoyle'
  | 'ironfence' | 'candelabra' | 'skullpile' | 'urn' | 'obelisk'
  // GOTH TEREPTÁR — átjárható dísz (decal)
  | 'cobweb' | 'ritualcircle';

export interface Obstacle {
  col: number;
  row: number;
  kind: ObstacleKind;
  /** Törhető tárgynál (láda) a hátralévő életerő (könny-találatban). */
  hp?: number;
}

export interface ObstacleDef {
  /** Blokkolja a mozgást, a lövedékeket és a látást. */
  solid: boolean;
  /** A játékos könnyei szétlövik. */
  breakable: boolean;
  /** A bomba/akna NEM pusztítja el. */
  bombProof: boolean;
  /** Törhetőnél: hány könny-találat kell a szétlövéshez. */
  hp: number;
}

export const OBSTACLES: Record<ObstacleKind, ObstacleDef> = {
  rock:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  tree:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  crate:    { solid: true,  breakable: true,  bombProof: false, hp: 200 },
  water:    { solid: false, breakable: false, bombProof: true,  hp: 0 },
  luckrock: { solid: true,  breakable: false, bombProof: false, hp: 0 },
  // TEREPTÁR — tömör dísz (mint a kő/fa: ütközik, bombával pusztítható)
  boulder:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  slate:       { solid: true,  breakable: false, bombProof: false, hp: 0 },
  bush:        { solid: true,  breakable: false, bombProof: false, hp: 0 },
  thornbush:   { solid: true,  breakable: false, bombProof: false, hp: 0 },
  pine:        { solid: true,  breakable: false, bombProof: false, hp: 0 },
  drytree:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  stump:       { solid: true,  breakable: false, bombProof: false, hp: 0 },
  log:         { solid: true,  breakable: false, bombProof: false, hp: 0 },
  crystals:    { solid: true,  breakable: false, bombProof: false, hp: 0 },
  deadtree:    { solid: true,  breakable: false, bombProof: false, hp: 0 },
  cactus:      { solid: true,  breakable: false, bombProof: false, hp: 0 },
  stalagmites: { solid: true,  breakable: false, bombProof: false, hp: 0 },
  torch:       { solid: true,  breakable: false, bombProof: false, hp: 0 },
  brazier:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  tombstone:   { solid: true,  breakable: false, bombProof: false, hp: 0 },
  pillar:      { solid: true,  breakable: false, bombProof: false, hp: 0 },
  chest:       { solid: true,  breakable: false, bombProof: false, hp: 0 },
  cauldron:    { solid: true,  breakable: false, bombProof: false, hp: 0 },
  campfire:    { solid: true,  breakable: false, bombProof: false, hp: 0 },
  well:        { solid: true,  breakable: false, bombProof: false, hp: 0 },
  // TEREPTÁR — törhető (könnyel szétlőhető, mint a láda)
  barrel:      { solid: true,  breakable: true,  bombProof: false, hp: 2 },
  pots:        { solid: true,  breakable: true,  bombProof: false, hp: 1 },
  // TEREPTÁR — átjárható dísz (nem ütközik, nem pusztul; az entitások alatt)
  mushrooms:   { solid: false, breakable: false, bombProof: true,  hp: 0 },
  bones:       { solid: false, breakable: false, bombProof: true,  hp: 0 },
  grass:       { solid: false, breakable: false, bombProof: true,  hp: 0 },
  reeds:       { solid: false, breakable: false, bombProof: true,  hp: 0 },
  fern:        { solid: false, breakable: false, bombProof: true,  hp: 0 },
  flowers:     { solid: false, breakable: false, bombProof: true,  hp: 0 },
  pebbles:     { solid: false, breakable: false, bombProof: true,  hp: 0 },
  vines:       { solid: false, breakable: false, bombProof: true,  hp: 0 },
  // GOTH TEREPTÁR — tömör dísz
  coffin:      { solid: true,  breakable: false, bombProof: false, hp: 0 },
  gravecross:  { solid: true,  breakable: false, bombProof: false, hp: 0 },
  celticcross: { solid: true,  breakable: false, bombProof: false, hp: 0 },
  angelstatue: { solid: true,  breakable: false, bombProof: false, hp: 0 },
  gargoyle:    { solid: true,  breakable: false, bombProof: false, hp: 0 },
  ironfence:   { solid: true,  breakable: false, bombProof: false, hp: 0 },
  candelabra:  { solid: true,  breakable: false, bombProof: false, hp: 0 },
  skullpile:   { solid: true,  breakable: false, bombProof: false, hp: 0 },
  urn:         { solid: true,  breakable: false, bombProof: false, hp: 0 },
  obelisk:     { solid: true,  breakable: false, bombProof: false, hp: 0 },
  // GOTH TEREPTÁR — átjárható dísz (decal)
  cobweb:      { solid: false, breakable: false, bombProof: true,  hp: 0 },
  ritualcircle:{ solid: false, breakable: false, bombProof: true,  hp: 0 },
};

/** Égtáji irány az ajtókhoz / szobaváltáshoz. */
export type Dir = 'N' | 'S' | 'W' | 'E';

export interface Decoration {
  x: number;
  y: number;
  type: number;
  size: number;
  rot: number;
}

export interface Splat {
  x: number;
  y: number;
  size: number;
  rot: number;
  color: string;
}

export const DIRS: readonly Dir[] = ['N', 'S', 'W', 'E'] as const;

/** Irány → rács-eltolás. */
export const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
  E: { dx: 1, dy: 0 },
};
