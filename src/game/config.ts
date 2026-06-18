/**
 * Központi játékbeállítások és hangoló-paraméterek.
 * Minden "varázsszám" ide kerül, hogy a balanszolás egy helyen történjen.
 */

/** A szoba belső rácsa a sablonokhoz (13×7 cella). */
export const GRID = {
  W: 13,
  H: 7,
};

export const ROOM = {
  /** Fal vastagsága pixelben. */
  WALL: 26,
  /** Ajtónyílás fél-szélessége. */
  DOOR: 52,
  /** Maximális belső szobaméret (reszponzív vágás ezekre). */
  MAX_W: 1040,
  MAX_H: 720,
  /** Csemperács mérete a padlón. */
  TILE: 52,
};

// ── Életerő-modell ───────────────────────────────────────────────────────────
// A HP belül FINOM pont-skálán él: 1 szív = 1000 pont (alap 3 szív = 3000), a
// HUD viszont fél-szívenként rajzol. Így a bejövő sebzés tetszőlegesen finoman
// hangolható (250 = negyed szív, 500 = fél, 1000 = egy teljes szív), a kijelzés
// mégis a megszokott, olvasható szív-ikon marad.
export const HP = {
  /** Egy fél szív pont-értéke — a kijelzés legkisebb lépése. */
  half: 500,
  /** Egy teljes szív pont-értéke (= 2 fél szív). */
  heart: 1000,
};

export const PLAYER_BASE = {
  r: 22,
  speed: 230,
  // „Snappy" mozgásprofil: a steady-state sebesség ≈ accel/friction (a speed-cap
  // vágja 230-ra), így accel ÉS friction arányos emelése a VÉGSEBESSÉGET tartja,
  // de a felgyorsulást/megállást ~2× pattanósabbá teszi (kevésbé „úszós").
  accel: 4200,
  friction: 14,
  dmg: 300, // a harci gazdaság ×100-on él (finomabb enemy-HP hangolás); a HUD a valós pontot mutatja (300,0)
  fireRate: 0.72, // mp/lövés (nagyobb = ritkábban lő); 0.4→0.72 ≈ 45%-kal ritkább tűz
  shotSpeed: 320, // lövedék tempója px/mp (430→320 ≈ 26%-kal lassabb, súlyosabb)
  range: 1.2, // = a lövedék élettartama mp-ben; a HUD ezt ×10-zel mutatja → „Lőtáv 12"
  maxHp: HP.heart * 3, // pontban (3000 = 3 teljes szív, 1 szív = 1000); a HUD fél-szívenként rajzol
  invulnTime: 1.0,
  // Alap látótáv: 1 = teljes szoba látszik (nincs vignetta). A +látótáv perk
  // 1 FÖLÉ tölt (max 1.2) — ez TARTALÉK: alapból ugyanannyit látsz, de ha a
  // látótáv leesik (Sötét fátyol / sötét szoba), a többlet kitart még 100%-on.
  sight: 1,
};

export const DUNGEON = {
  /** Szobaszám-alap: target = clamp(BASE + level * PER_LEVEL + 0..2, MIN, MAX). */
  BASE_ROOMS: 8,
  PER_LEVEL: 2,
  /** Minden szint legalább ennyi szobából áll. */
  MIN_ROOMS: 10,
  /** Felső korlát, hogy a mély szintek ne szálljanak el. */
  MAX_ROOMS: 16,
};

// ── Labirintus visszaszámláló ────────────────────────────────────────────────
// A labirintusnak idő-limitje van: a játékosnak a kijáratig kell érnie, mielőtt
// lejár. Az időkeret a maze legrövidebb útjából (`pathLen`) számítódik, hogy
// minden generált pálya a saját méretéhez igazodjon, nem fix érték.
//   limit = max(MIN, (pathLen·TILE / játékos-sebesség) · PACE) + BONUS
export const LAB_TIMER = {
  /**
   * A puszta egyenes-séta-idő (legrövidebb úton) szorzója. >1, mert a valóságban
   * kanyarodni, gyorsulni/fékezni és ellenfelekkel harcolni kell - ez adja a
   * „pontos idő, ami alatt végig lehet vinni" reális becslését.
   */
  PACE: 2.5,
  /** Ráhagyás másodpercben a számolt idő fölött (a „kevés plusz idő"). */
  BONUS: 12,
  /** Alsó korlát: rövid labirintusnál is legyen értelmes a keret. */
  MIN: 25,
};

export const STORAGE_KEY = 'sentex_pince_best';
