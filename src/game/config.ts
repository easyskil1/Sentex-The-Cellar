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

// ── Fiola (#44, random-hatású fogyóeszköz) ──────────────────────────────────
// A „Fiola" azonosítatlan, futáson belüli szín→hatás társítással (lásd Fiola.ts /
// Player.fiolaMap). A hatások a MEGLÉVŐ státuszokra épülnek; az alábbi számok a
// tranziens buffok hangolása. A bad-trip (burn) tét: KILLHET, ezért fix (raw) DoT.
export const FIOLA = {
  /** Drop-esély: a `dropPickup` ELŐTT független rétegként (a nettó-súlyokat nem hígítja). */
  dropChance: 0.14,
  /** Gyógyír: azonnali HP-vissza (pont). */
  heal: HP.heart * 2,
  /** Fürgeség (haste): időtartam mp + sebesség-/tűz-szorzók. */
  hasteTime: 8,
  hasteSpeed: 1.4,   // mozgás-sebesség ×
  hasteFire: 0.62,   // fireCd × (kisebb = gyorsabb tűz)
  /** Dühroham (rage): időtartam mp + sebzés-szorzó (a bónusz lejáratkor visszavonva). */
  rageTime: 8,
  rageDmgMul: 1.5,
  /** Káprázat (confuse): fordított irányítás mp. */
  confuseTime: 5,
  /** Rossz adag (burn): önsorsoló DoT - tick-köz + összes tick + tickenként pont. */
  burnTick: 1.0,
  burnTicks: 3,
  burnDmg: HP.half,  // tickenként fél szív (3 tick = 1,5 szív, killhet - ez a tét)
  /** Ólomláb (slow): időtartam mp + sebesség-szorzó. */
  slowTime: 6,
  slowMul: 0.5,
};

// ── Sorslap (#46/#47, kártya/rúna fogyó) ────────────────────────────────────
// A „Sorslap" a Fiola MELLETT egy MÁSODIK egyszer-használatos zseb (G-gomb). A
// hatások a meglévő SKILL-könyvtárból merítve (kártyák), + 2 erős rúna (szoba-
// törlő + sérthetetlenség). Tisztán tranziens/egyszeri hatások: a difficulty
// playerPower-t NEM mozgatják (nem „láthatatlan ingyen erő"). Lásd `World.useCard`.
export const CARD = {
  /** Drop-esély: a fiola UTÁN, külön FÜGGETLEN rétegként (a nettó-súlyokat nem hígítja). */
  dropChance: 0.09,
  /** Pusztítás rúnája (szoba-törlő): a NEM-boss ellenfeleket azonnal megöli; a bossnak
   *  ennyi fix sebzést visz be (anti-OP: a fix-statú bosst nem trivializálja). */
  purgeBossDmg: 4000,
  /** Pajzs rúnája: sérthetetlenség mp (a shield-skill 5s rokona, kissé hosszabb). */
  wardTime: 6,
};

// ── Vér-oltár szoba (#35, kockázat/jutalom terem) ───────────────────────────
// Külön szobatípus (`blood`): a játékos NEM érméért, hanem ÉLETPONTÉRT (vérért)
// vásárol tárgyat. FIX szív-ár / tárgy (a felhasználó döntése: nem skálázódó,
// nem max-HP-konténer - csak az AKTUÁLIS HP-ból von le). A tét: gyengébb maradsz,
// de azonnal erősebb buildet kapsz. Anti-OP: a felvett tárgy emeli a játékos-erőt,
// amit a `difficulty` modell már beépít (az ellenfelek skálázódnak vele); és nem
// vásárolhatsz, ha a vér megölne (legalább 1 fél szív marad). Lásd `BloodAltar`.
export const BLOOD = {
  /** Egy tárgy ára pontban (fix). HP.heart = 1 teljes szív (1000). */
  cost: HP.heart,
  /** Hány tárgy-állvány legyen a vér-oltárban. */
  stands: 2,
  /** Megjelenési esély szintenként (ha van szabad zsákutca a térképen). */
  chance: 0.6,
};

// ── Átokverem (#38, kockázat/jutalom szoba) ─────────────────────────────────
// A vér-oltár párja: itt EGYSZER fizetsz (fix 1 szív, az AKTUÁLIS HP-ból) a
// tüskés átok-reliquáriumnál, cserébe EGY INGYEN, RITKA tárgyat kapsz. A vér-
// oltár pay-per-item piacával szemben ez EGY döntés / EGY erős jutalom. A „ritka"
// jelleget a `rollBest` adja: ennyi nem-skill sorsolásból a legmagasabb erő-pontút
// választjuk (nincs új tartalom, csak kedvezőbb eloszlás). Anti-OP: a felvett
// tárgy emeli a játékos-erőt, amit a `difficulty` modell beépít; halál-guard
// védi, hogy a fizetség sose öljön be (lásd World.acceptOffer/buyCurse).
export const CURSE = {
  /** A belépés/áldozat ára pontban (fix, egyszeri). HP.heart = 1 teljes szív. */
  cost: HP.heart,
  /** Hány nem-skill jelöltből választjuk a legerősebbet (ritka jutalom). */
  rollBest: 3,
  /** Megjelenési esély szintenként (ha van SZABAD zsákutca a tárgy/vér után). */
  chance: 0.45,
};

// ── Titkos szoba (#37, bombázással feltárható) ──────────────────────────────
// Egy REJTETT graph-szoba egy üres, létező szobával szomszédos cellán. Nincs hozzá
// nyitott ajtó és a minimapon sem látszik, amíg fel nem tárod: bombát/TNT-t kell a
// megfelelő fal mellett robbantani (a meglévő `explode` ágon). A jutalom forrás-cache
// (érme + 1 garantált fogyó + ritkán tárgy) - megkülönbözteti a garantált-tárgyas
// szobáktól (item/vér/curse), és részben visszatéríti a bomba-költséget. Anti-OP:
// főleg forrás; a ritka tárgy a `collectItem` egységes útján → difficulty beépíti.
export const SECRET = {
  /** Megjelenési esély szintenként (ha van alkalmas üres, szomszédos cella). */
  chance: 0.55,
  /** Robbanás-távolság a faltól, ami feltárja a rejtett szomszédot (px). */
  revealDist: ROOM.TILE * 1.3,
  /** Szórt érmék száma a feltárt szobában. */
  coins: 6,
  /** Esély, hogy a forrás-cache mellett INGYEN tárgy-pedesztál is van. */
  itemChance: 0.4,
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

// ── Boss-roham mód (#52 / Fázis D, HUB boss-portál) ─────────────────────────
// A HUB „boss" portálja mögötti, FELOLDHATÓ kihívás-mód: a 10 meglévő boss
// (BOSS_ORDER) egymás után, FRISS karakterrel. A bossok fix-statúak (nem
// skálázódnak), a kihívás a sorrendből (egyre nehezebb bossok) + az endurance-ből
// jön; cserébe a játékos bossonként gyógyul + egy tárgyat kap (build-up gauntlet).
// Feloldás: a kampányban elért legmélyebb szint (`bestFloor`) >= unlockFloor -
// így a mód a mélyebbre jutás jutalma. A `floor` rögzített referencia (a bossok
// raw-sebzése amúgy sem skálázódik vele; csak a megidézett adds + a pont-jutalom
// érzi). A pont a finishRun-on át a rangba/ranglistába folyik (countBestFloor=false,
// hogy a boss-roham ne hígítsa a kampány „legmélyebb szint" rekordot).
export const BOSS_RUSH = {
  /** Feloldási küszöb: a kampányban elért legmélyebb szint (10 szintes a kampány). */
  unlockFloor: 5,
  /** Rögzített referencia-szint (megidézett adds nehézsége + boss pont-jutalom). */
  floor: 8,
  /** Bossok közti gyógyulás teljes szívben. */
  healBetween: 2,
  /** Extra pont-bónusz bossonként (a legyőzöttek számával skálázva: stageBonus×n). */
  stageBonus: 750,
};

// ── Dungeon mód (#52 / Fázis D, HUB dungeon-portál) ─────────────────────────
// A HUB „dungeon" portálja mögötti, FELOLDHATÓ kihívás-mód: 15 arénaszoba egymás
// után (mint a boss-roham, de RENDES ellenfelekkel), FRISS karakterrel, egyre
// több + erősebb ellenfél. Mini-boss az 5./10. szobában, FINÁLÉ-boss a 15.-ben.
// A meglévő fejezet-sablonokat + ellenfél-palettát + bossokat hasznosítja újra
// (zéró új tartalom). Mérföldkövenként (boss-szobák) gyógyulás + tárgy-jutalom;
// a köztes szobák a csapóajtó-UX-en MAGUKTÓL léptetnek (nincs kártya, ne legyen
// vontatott). Feloldás: bestFloor >= unlockFloor (korábban, mint a boss-roham).
export const DUNGEON_RUN = {
  /** Hány arénaszoba egy futás. */
  rooms: 15,
  /** Feloldási küszöb: a kampányban elért legmélyebb szint. */
  unlockFloor: 3,
  /** Kezdő referencia-szint (sebzés + ellenfél-erő); szobánként nő. */
  floorBase: 1,
  /** Szobánkénti referencia-szint növekmény (nehézség-eszkaláció). */
  floorPerRoom: 1.2,
  /** Az 1. szoba ellenfél-száma. */
  enemyBase: 2,
  /** Szobánkénti ellenfél-szám növekmény (lineáris, plafonnal). */
  enemyPerRoom: 0.5,
  /** Egyszerre max ennyi ellenfél egy szobában (perf + balansz plafon). */
  enemyMax: 9,
  /** Ezekben a szobákban (1-alapú) mini-boss / finálé van. */
  bossRooms: [5, 10, 15],
  /** Gyógyulás a boss-szobák után, teljes szívben. */
  healAmount: 2,
  /** Extra pont-bónusz szobánként (a sorszámmal skálázva). */
  stageBonus: 150,
};

// ── Labirintus-gauntlet (#52 / Fázis D, HUB labirintus-portál) ──────────────
// A HUB labirintus-portálja 15 maze-PÁLYÁS, egyre nagyobb + erősebb gauntlet
// (a régi EGY maze helyett). A pályánkénti ellenfél-szám = (pálya - 1): az 1.
// pálya tiszta navigációs verseny (0 ellenfél), a 2. egy ellenfél, és így tovább
// a 15. pályáig (14 ellenfél). A pálya-méret + ellenfél-erő is nő pályánként.
// (A kampány-kapun át indított labirintus VÁLTOZATLAN: EGY maze, megtartott build.)
export const LAB_GAUNTLET = {
  /** Hány pálya egy futás. */
  stages: 15,
  /** Az 1. pálya maze-cellái (vízszintes/függőleges); pályánként nő. */
  baseCols: 8,
  baseRows: 5,
  /** Pályánkénti méret-növekmény (cellában). */
  growCols: 0.6,
  growRows: 0.4,
  /** Maximális maze-méret (cellában) - a perf/olvashatóság plafonja. */
  maxCols: 18,
  maxRows: 12,
  /** Rövidítő-hurok esélye (0 = egyetlen megoldás). */
  loop: 0.12,
  /** Kezdő referencia-szint; pályánként nő. */
  floorBase: 1,
  /** Pályánkénti referencia-szint növekmény (ellenfél-erő). */
  floorPerStage: 1.3,
  /** Extra pont-bónusz pályánként (a sorszámmal skálázva). */
  stageBonus: 200,
};

export const STORAGE_KEY = 'sentex_pince_best';
