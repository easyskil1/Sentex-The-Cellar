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

// ── Kénkő-sugár (#1, tartós sugár-lőmód) ────────────────────────────────────
// A „Kénkő-sugár" relikvia a sima könny-lövést egy FOLYAMATOS, raycast-alapú
// sugárra cseréli. Tick-sebzés a vonalon álló MINDEN ellenfélre (átütő jelleg),
// + a játékos elemi flagjei (burn/poison/freeze) a teljes vonalon terjednek (saját
// csavar). A sebzés a könny-DPS-hez igazodik (dmg/fireRate), hogy egy célon ne
// legyen erősebb a sima lövésnél; a tömeg-clear az inherens előnye.
export const BEAM = {
  /** Sebzés-tick köze másodpercben (kisebb = simább, de több hívás). */
  tick: 0.09,
  /** A sugár fél-szélessége px-ben (ennyin belül kap találatot az ellenfél). */
  width: 15,
  /** Maximális sugárhossz px-ben (kőnél/falnál ennél hamarabb megáll). */
  range: 540,
  /** DPS-szorzó a könny-DPS-hez képest (1 = egy célon azonos a sima lövéssel). */
  dpsMul: 1.0,
  /** Vizuális mag-szín (kénkő: izzó vörös-narancs). */
  core: '#ff5a2a',
  /** Vizuális ragyogás-szín. */
  glow: '#ff2a1a',
};

// ── Lángkúp (#4, „Pokoltüzes lehelet") ──────────────────────────────────────
// A Lángkúp relikvia a sima könny-lövést egy FOLYAMATOS, közeli kúp-AoE-ra cseréli
// (lángszóró). A kúpban álló minden ellenfél tick-sebzést kap + beépített `burn`,
// és a kúp végén égő talaj-nyom marad (saját csavar, player-tulajdonú `fire` hazard).
// Rövid hatótáv = kockázat (oda kell menni); cserébe ív-AoE + DoT + zóna-kontroll.
export const FLAME = {
  /** A kúp hossza px-ben (rövid, a sugár 540-éhez képest). */
  range: 170,
  /** A kúp fél-nyílásszöge radiánban (teljes ≈ 2× ennyi). */
  halfAngle: 0.44,
  /** Sebzés-tick köze másodpercben. */
  tick: 0.08,
  /** DPS-szorzó a könny-DPS-hez képest (a burn DoT a tetejére jön → <1). */
  dpsMul: 0.8,
  /** Égő talaj-nyom lerakásának köze másodpercben. */
  floorEvery: 0.3,
  /** Egy nyom-folt sugara px-ben. */
  floorR: 26,
  /** Egy nyom-folt élettartama másodpercben. */
  floorLife: 1.8,
  /** Max egyszerre aktív player-tűz folt (perf + balansz plafon). */
  floorMax: 6,
  /** Vizuál: forró mag és láng-szín. */
  core: '#fff0c0',
  hot: '#ff9a3a',
  edge: '#d62a0e',
};

// ── Felhúzott csapás (#5, töltött lövés) ────────────────────────────────────
// A „Felhúzott csapás" relikvia a rapid-fire-t felhúzós lövésre cseréli: nyomva
// tartás TÖLT (chargeT nő), az elengedés ad le EGY felskálázott könnycseppet
// (nagyobb sebzés + nagyobb test). A sebzés a töltöttséggel arányos. Anti-OP:
// a szorzó net-DPS-PARITÁSRA van állítva a sima lövéshez (a töltés-idő ELLEN a
// kihagyott lövésekkel) → a koncentrált burst az előny, nem a net-DPS. A `dpsMul`
// egy enyhe burst-prémium a töltés-kockázatért (1.0 = tiszta paritás). Lásd
// `Player.releaseCharge`/`chargeMul` + `World.drawCharge`.
export const CHARGE = {
  /** Teljes töltéshez szükséges idő mp-ben. */
  maxTime: 1.1,
  /** Ennél rövidebb töltés nem lő (véletlen koccanás-szűrő). */
  minTime: 0.1,
  /** Net-DPS szorzó a sima lövéshez képest (1.0 = paritás; >1 = burst-prémium). */
  dpsMul: 1.2,
  /** A lövedék test-sugara full töltésnél (×, az alap 6.5 fölött). */
  sizeMul: 2.3,
  /** A töltött lövedék sebesség-szorzója (gyorsabb, „nehéz" lövés). */
  speedMul: 1.15,
  /** Töltés-gyűrű színe (HUD). */
  ring: '#ffd24a',
  /** Töltés-gyűrű ragyogása full töltésnél (HUD). */
  glow: '#ff8a1a',
};

// ── Pecsétgyűrű (#2, utazó gyűrű-korong) ────────────────────────────────────
// A „Pecsétgyűrű" relikvia a sima lövést egy utazó arany pecsét-KORONGRA cseréli
// (lásd `Ring.ts`). A teljes korong-belseje sebző zóna (terület + áthatolás
// egyben): minden ellenfelet ÁTHALADVA egyszer sebez. Anti-OP: egy célon a sebzés
// = sima lövés (`dmg` egyszer), így single-target paritás; a multi-target AoE az
// inherens előny (a sugár filozófiája). A sebesség/hatótáv a játékos
// shotSpeed/range-éből jön (a perkek így hatnak rá). Lásd `Player.shootRing`.
export const RING = {
  /** A korong sugara px-ben (a teljes belseje sebző zóna). */
  radius: 44,
  /** A pecsét-perem vizuális vastagsága px-ben. */
  bandW: 9,
  /** Forgás rad/s (tisztán vizuál). */
  spin: 3.2,
  /** A korong utazási sebessége a játékos shotSpeed-jéhez képest (×). */
  speedMul: 0.85,
  /** Arany pecsét fő-szín + ragyogás. */
  core: '#d8b24a',
  glow: '#ffe08a',
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
