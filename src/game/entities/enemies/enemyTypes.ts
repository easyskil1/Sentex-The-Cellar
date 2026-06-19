/** Az alap (nem boss) ellenségek statisztikái típusonként. */
import { ENEMY_OVERRIDES } from './enemyOverrides';

export type EnemyKind =
  | 'fly'
  | 'walker'
  | 'shooter'
  | 'charger'
  | 'rotling'
  | 'spitter'
  | 'chiller'
  | 'lancer'
  | 'pyro'
  | 'bombardier'
  | 'mistweaver'
  | 'roach'
  | 'spider'
  | 'spiderling'
  | 'tick'
  | 'sniper'
  | 'mortar'
  | 'summoner'
  | 'striker'
  | 'worm'
  | 'shotgunner'
  | 'gunner'
  | 'blinker'
  | 'confuser'
  | 'blocker'
  | 'leaper'
  | 'flanker'
  | 'healer'
  | 'enrager'
  | 'kamikaze'
  | 'slammer'
  | 'turret'
  | 'gasbag'
  | 'puller'
  | 'bombthrower'
  // --- Wave 6: mitológiai hősök / klasszikus szörnyek ---
  | 'minotaur'
  | 'mummy'
  | 'scarab'
  | 'vampire'
  | 'bat'
  | 'leech'
  | 'serpent'
  | 'medusa'
  | 'skeleton'
  | 'wraith'
  | 'gargoyle'
  | 'harpy'
  | 'cyclops'
  | 'golem'
  | 'scorpion'
  | 'wisp'
  | 'banshee'
  | 'imp'
  | 'hydra'
  | 'werewolf';

export interface EnemyStats {
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  col: string;
  col2: string;
  score: number;
  /** Régi viselkedés-kapcsolók (a shooter/charger ezeket használja). */
  shoots?: boolean;
  charges?: boolean;
  /** Átrepül a köveken (nem ütközik akadállyal), pl. légy / szellem. */
  floats?: boolean;
  /** Nem sebez érintésre (pl. Dermesztő: csak lassít, nem üt). */
  noContact?: boolean;
  /** Admin nehézség-felülírás: 0/undefined = automatikus (statokból), 1–4 = kézi tier. */
  tier?: number;
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  fly: { r: 13, hp: 1400, speed: 78, dmg: 1, col: '#caa6d8', col2: '#2a1830', score: 30, floats: true },
  walker: { r: 17, hp: 2600, speed: 96, dmg: 1, col: '#e08a6a', col2: '#3a1c12', score: 50 },
  shooter: { r: 16, hp: 2200, speed: 60, dmg: 1, col: '#7fc4d8', col2: '#16323a', score: 70, shoots: true },
  charger: { r: 18, hp: 3400, speed: 70, dmg: 1, col: '#d8c46a', col2: '#3a3212', score: 80, charges: true },

  // --- Új ellenfelek ---
  // Mételyező: lassan kúszik, és mérgező nyálkát hagy maga után a padlón.
  rotling: { r: 19, hp: 3000, speed: 50, dmg: 1, col: '#8fbf4a', col2: '#243a12', score: 75 },
  // Köpködő: gyorsan üldöz, és közelből gyors savsorozatot lő.
  spitter: { r: 15, hp: 2000, speed: 116, dmg: 1, col: '#b6e04a', col2: '#2c3a12', score: 80 },
  // Dermesztő: lebegő jégszellem, a közelében lelassítja a játékost (nem sebez).
  chiller: { r: 17, hp: 5200, speed: 64, dmg: 1, col: '#9fe0ec', col2: '#163840', score: 90, floats: true, noContact: true },
  // Lézervető: megcéloz, majd átsöprő energiasugarat lő (a sugár teljes szívet sebez).
  lancer: { r: 16, hp: 3000, speed: 52, dmg: 2, col: '#d86ad0', col2: '#3a163a', score: 120 },
  // Tűzokádó: közel rohan, és lángcsóvát okád, ami égő foltokat hagy.
  pyro: { r: 18, hp: 3600, speed: 86, dmg: 1, col: '#f08a3a', col2: '#3a1808', score: 100 },
  // Aknász: ketyegő aknákat rak le; a saját robbanása nem hat rá.
  bombardier: { r: 17, hp: 3000, speed: 66, dmg: 1, col: '#c8b48a', col2: '#2a2418', score: 105 },
  // Ködszövő: kísértet, ködfelhőket hagy, amik 2–10 mp alatt eloszlanak.
  mistweaver: { r: 15, hp: 1800, speed: 66, dmg: 1, col: '#b0a6e0', col2: '#221d3a', score: 85, floats: true },
  // Csótány: rajban (20 db) jön, kevés HP, gyorsan cikáz, ártalmatlan — KIVÉVE egy
  // „harapós" példányt (más szín, átlagos tempó, sebez), amit a raj a konstruktorban jelöl ki.
  roach: { r: 9, hp: 300, speed: 162, dmg: 1, col: '#7a5230', col2: '#241405', score: 10, noContact: true },
  // Nagy pók: megöléskor 10 pók-fiókára robban szét (lásd World.killEnemy).
  spider: { r: 21, hp: 3000, speed: 74, dmg: 1, col: '#5a3a6a', col2: '#170d20', score: 90 },
  // Pók-fióka: nagyon gyors, kevés HP, ártalmatlan — kettő közülük „harapós" (sebez, más szín).
  spiderling: { r: 7, hp: 200, speed: 214, dmg: 1, col: '#7a6a78', col2: '#1c1620', score: 8, noContact: true },
  // Kullancs: nem mozog; ha közel mész, rád mászik és a játékoson marad (szobák között is).
  // 120 és 240 mp-nél harap egy-egy fél szívet (összesen 1 szív), majd megsemmisül.
  // Lelőhető, mielőtt rád kerül. (Lásd World: attachedTicks.)
  tick: { r: 8, hp: 600, speed: 0, dmg: 0, col: '#6b5a4a', col2: '#241810', score: 25, noContact: true },

  // --- Wave 5: új viselkedések (a kinézet egyelőre fallback-folt; később pótoljuk) ---
  // Mesterlövész: távol marad, telegrafál, majd egy gyors, erős lövedéket lő.
  sniper: { r: 16, hp: 2600, speed: 44, dmg: 2, col: '#c87a7a', col2: '#3a1818', score: 130 },
  // Mozsár: hátul áll, és a játékos helyére becsapódó tűz-AoE-t lő.
  mortar: { r: 18, hp: 3400, speed: 40, dmg: 1, col: '#9a9a5a', col2: '#2a2a18', score: 115 },
  // Megidéző: középtávon lebeg, és időnként egy legyet idéz (rajszám-korláttal).
  summoner: { r: 17, hp: 3000, speed: 50, dmg: 1, col: '#6a8ad0', col2: '#1a2440', score: 120 },

  // --- Wave 5b: nagy ellenfél-batch (user-ötletek + katalógus; kinézet még fallback) ---
  // Csapó: gyorsan ráront és sebez, majd pár mp-ig megáll, és ismétli.
  striker: { r: 16, hp: 2400, speed: 90, dmg: 2, col: '#e06a4a', col2: '#3a160c', score: 95 },
  // Gilista: a föld alatt mozog (sebezhetetlen), majd a játékos mellett bukkan fel és sebez.
  worm: { r: 14, hp: 2000, speed: 55, dmg: 1, col: '#b07a4a', col2: '#3a2410', score: 90 },
  // Sörétes: legyezőnyi lövést ad le közelről.
  shotgunner: { r: 17, hp: 3000, speed: 64, dmg: 1, col: '#d8a050', col2: '#3a2a10', score: 105 },
  // Gyorslövő: gyors sorozatban pötyög.
  gunner: { r: 15, hp: 2400, speed: 72, dmg: 1, col: '#7fb0d8', col2: '#16303a', score: 100 },
  // Villanó: eltűnik, majd a játékos közelében újra megjelenik és lő.
  blinker: { r: 15, hp: 2200, speed: 60, dmg: 1, col: '#b08aff', col2: '#2a1a4a', score: 115, floats: true },
  // Zavaró: a közelében MINDEN irányítás fordítva működik (nem sebez érintésre).
  confuser: { r: 15, hp: 2200, speed: 58, dmg: 0, col: '#d86aff', col2: '#3a163a', score: 100, floats: true, noContact: true },
  // Blokkoló: közeledik, és időnként 2 mp-ig blokkol (a lövéseket elnyeli).
  blocker: { r: 18, hp: 4000, speed: 52, dmg: 1, col: '#c0c8d0', col2: '#2a3038', score: 110 },
  // Ugró: telegrafál, majd ívben a játékos helyére ugrik.
  leaper: { r: 17, hp: 2800, speed: 70, dmg: 2, col: '#d8c050', col2: '#3a3210', score: 95 },
  // Bekerítő: nem szemből, hanem oldalról ível be.
  flanker: { r: 16, hp: 2400, speed: 108, dmg: 1, col: '#e08a6a', col2: '#3a1c12', score: 90 },
  // Gyógyító: távol tart, és periodikusan gyógyítja a közeli ellenfeleket (nem sebez).
  healer: { r: 16, hp: 3000, speed: 64, dmg: 0, col: '#6aff9f', col2: '#163a24', score: 135, noContact: true },
  // Feldühítő: a közeli ellenfeleket felgyorsítja.
  enrager: { r: 16, hp: 2800, speed: 64, dmg: 1, col: '#ff6a6a', col2: '#3a1414', score: 120 },
  // Kamikaze: ráront, és közel érve felrobban (a robbanás sebez, az érintés nem).
  kamikaze: { r: 15, hp: 1400, speed: 130, dmg: 2, col: '#ff8a3a', col2: '#3a1808', score: 90, noContact: true },
  // Földcsapó: a földre csap → körkörös golyó-gyűrű.
  slammer: { r: 20, hp: 4800, speed: 50, dmg: 2, col: '#a08a6a', col2: '#2a2014', score: 130 },
  // Torony: nem mozog, lassan forgó spirált lő.
  turret: { r: 17, hp: 3600, speed: 0, dmg: 1, col: '#8a7ab0', col2: '#1a1430', score: 110 },
  // Gázzsák: lassan követ; megöléskor tartós méregfelhővé robban.
  gasbag: { r: 19, hp: 2600, speed: 48, dmg: 1, col: '#9fb04a', col2: '#2a3010', score: 95 },
  // Húzó: lebeg, és maga felé húzza a játékost (hazardokkal kombózik).
  puller: { r: 17, hp: 3400, speed: 40, dmg: 1, col: '#6a6ad0', col2: '#16163a', score: 115, floats: true },
  // Bombázó: átrepül (lebeg), és időnként ketyegő aknát dob a játékos felé.
  bombthrower: { r: 16, hp: 2400, speed: 80, dmg: 1, col: '#c8b48a', col2: '#2a2418', score: 110, floats: true },

  // ===================================================================== //
  //  Wave 6: mitológiai hősök / klasszikus szörnyek (új képességekkel)    //
  // ===================================================================== //
  // Minotaurusz: telegrafál, majd hosszan, gyorsan ráront, és a roham végén
  // földet renget → körkörös lökéshullám taszítja a játékost.
  minotaur: { r: 24, hp: 6400, speed: 92, dmg: 2, col: '#a06038', col2: '#2a1408', score: 165 },
  // Múmia: lassan vánszorog, lassító átok-pólyát lök; megöléskor 3 skarabeuszra
  // esik szét (lásd World.killEnemy).
  mummy: { r: 19, hp: 4200, speed: 38, dmg: 1, col: '#cabf9a', col2: '#4a4028', score: 115 },
  // Skarabeusz: fémkék-arany bogár; gömbbé gömbölyödik és pattogva ráront,
  // visszaverődve a falakról. Gyors, kevés HP.
  scarab: { r: 12, hp: 1200, speed: 132, dmg: 1, col: '#3f9a6a', col2: '#103a28', score: 35 },
  // Vámpír: közelít és érintésre ÉLETET SZÍV (gyógyul, amikor sebez); időnként
  // denevérré olvad és gyorsan a játékosra csap.
  vampire: { r: 17, hp: 4600, speed: 92, dmg: 1, col: '#7a2a3a', col2: '#2a0810', score: 155 },
  // Óriásdenevér: kiszámíthatatlanul cikázó repülő (lebeg), időnként körkörös
  // hangrobbanás-lövést ad le (echolokáció). Rajban jön.
  bat: { r: 12, hp: 1000, speed: 152, dmg: 1, col: '#6a5a7a', col2: '#1a1422', score: 30, floats: true },
  // Pióca: lassan kúszik; érintésben ÉLETET SZÍV és lassítja a játékost.
  leech: { r: 13, hp: 2200, speed: 62, dmg: 1, col: '#7a2a4a', col2: '#200818', score: 70 },
  // Kígyó: gyorsan, cikkcakkban csúszik; közelről mérgező harapást lő.
  serpent: { r: 14, hp: 2400, speed: 122, dmg: 1, col: '#4a8a3a', col2: '#143012', score: 90 },
  // Medúza: ránézésre MEGKÖVÍTI a játékost (erős, rövid dermesztés), és kő-
  // lövedéket lő. Nem sebez érintésre (a tekintet a fegyvere).
  medusa: { r: 18, hp: 4000, speed: 46, dmg: 1, col: '#6abf8a', col2: '#163a24', score: 150, noContact: true },
  // Csontváz: csontnyilat lő; megöléskor csonthalommá esik, majd EGYSZER
  // feltámad (fele HP-val).
  skeleton: { r: 16, hp: 2200, speed: 72, dmg: 1, col: '#d8d0c0', col2: '#3a3630', score: 105 },
  // Lidérc: átúszik a köveken (lebeg), és a körülötte lévő hideg AURA lassítja
  // és sebzi a játékost (nem sebez érintésre).
  wraith: { r: 17, hp: 3000, speed: 60, dmg: 1, col: '#8aa6c0', col2: '#1a2430', score: 125, floats: true, noContact: true },
  // Vízköpő: kővé dermedve áll (SEBEZHETETLEN, nem mozog), majd életre kel és
  // ráront; utána visszadermed.
  gargoyle: { r: 19, hp: 4600, speed: 84, dmg: 1, col: '#8a8a7a', col2: '#2a2a24', score: 135 },
  // Hárpia: repülő ragadozó (lebeg); lecsap és ELTASZÍTJA a játékost (szél-lökés).
  harpy: { r: 16, hp: 2600, speed: 112, dmg: 1, col: '#c8a85a', col2: '#3a2c10', score: 115, floats: true },
  // Küklopsz: egyszemű óriás; nagy sziklatömböt vet, ami a játékos helyére csapódik
  // (telegrafált AoE).
  cyclops: { r: 23, hp: 5800, speed: 44, dmg: 2, col: '#b07a5a', col2: '#3a2014', score: 160 },
  // Gólem: agyag-kolosszus, nagyon lassú és szívós; a földre csap → terjedő
  // lökéshullám-gyűrű (golyók).
  golem: { r: 24, hp: 8200, speed: 36, dmg: 2, col: '#9a7a5a', col2: '#2a1c10', score: 175 },
  // Skorpió: gyors; ívben mérget lő a fullánkjából, és közel csap.
  scorpion: { r: 15, hp: 2400, speed: 102, dmg: 1, col: '#8a4a2a', col2: '#2a1408', score: 95 },
  // Lidércfény: apró lebegő tűzgömb; gyorsan cikázik és égő nyomot hagy. Rajban.
  wisp: { r: 9, hp: 600, speed: 150, dmg: 1, col: '#ffb84a', col2: '#5a2808', score: 25, floats: true },
  // Banshee: repülő sirató; SIKOLYA hanghullámmal eltaszít ÉS megzavar (nem
  // sebez érintésre).
  banshee: { r: 16, hp: 2400, speed: 60, dmg: 0, col: '#aac0d0', col2: '#20303a', score: 120, floats: true, noContact: true },
  // Ördögfióka: teleportál a játékos közelébe, és tűzgolyót dob; kaján, fürge.
  imp: { r: 14, hp: 1800, speed: 70, dmg: 1, col: '#c0402a', col2: '#3a0c08', score: 110, floats: true },
  // Hidra: többfejű; legyezőben lő, és minél kevesebb a HP-ja, annál több fejjel
  // (több lövedék).
  hydra: { r: 20, hp: 5200, speed: 40, dmg: 1, col: '#3a8a7a', col2: '#103028', score: 150 },
  // Vérfarkas: gyors falka-ragadozó; üvöltésre önmagát felgyorsítja, majd a
  // játékosra ugrik.
  werewolf: { r: 21, hp: 3800, speed: 116, dmg: 2, col: '#5a5048', col2: '#1a1612', score: 135 },
};

/**
 * Champion-variáns trait (Wave 3): bármely alap-ellenfél ritkán „championként"
 * jön — szívósabb, átszínezett, és EGY extra tulajdonsággal. Egy rendszer →
 * az egész roszter változatosabb (roguelike-minta).
 *   tough     — sokkal több HP, kissé lassabb
 *   swift     — sokkal gyorsabb
 *   giant     — nagyobb test, +HP, +érintés-sebzés
 *   explosive — halálkor körkörös golyózápor
 *   vengeful  — halálkor mérgező tócsát hagy
 *   regen     — folyamatosan gyógyul (a DoT-ot ellensúlyozza)
 *   shielded  — időszakosan blokkol (a Blokkoló mechanikájából)
 *   frozen    — fagyos aura: a közeli játékost lassítja
 *   summoner  — időnként gyenge csótány-csatlóst idéz (véges számban)
 */
export type ChampionTrait = 'tough' | 'swift' | 'giant' | 'explosive' | 'vengeful' | 'regen' | 'shielded' | 'frozen' | 'summoner';

export const CHAMPION_TRAITS: readonly ChampionTrait[] = ['tough', 'swift', 'giant', 'explosive', 'vengeful', 'regen', 'shielded', 'frozen', 'summoner'];

/** Champion átszínezés — ránézésre megkülönböztető (a részletes kinézet később). */
export const CHAMPION_COLORS: Record<ChampionTrait, { col: string; col2: string }> = {
  tough: { col: '#c0c0d0', col2: '#3a3a4a' },
  swift: { col: '#7fe0ff', col2: '#1a4a5a' },
  giant: { col: '#d89060', col2: '#3a2010' },
  explosive: { col: '#ff7a3a', col2: '#5a1a08' },
  vengeful: { col: '#9fd84a', col2: '#2a3a10' },
  regen: { col: '#ff8ab0', col2: '#5a1a30' },
  shielded: { col: '#b0c4e0', col2: '#1a2a4a' },
  frozen: { col: '#aef0ff', col2: '#0a3a5a' },
  summoner: { col: '#c89af0', col2: '#3a1a5a' },
};

// ════════════════════════════════════════════════════════════════════════
//  Szerkeszthető statok perzisztenciája (Admin · ENEMY lap)
// ════════════════════════════════════════════════════════════════════════
//
// Az ENEMY_STATS-ot HELYBEN módosítjuk (mint a MAPS-ot), hogy a változás
// azonnal éljen a játékban. A defaulttól eltérő számokat (csak hp/speed/dmg/r/
// score) a böngészőbe és — „Mentés fájlba" — az `enemyOverrides.ts`-be mentjük.

/** A futásidőben szerkeszthető (numerikus) ellenfél-stat mezők. `tier` = admin
 *  nehézség-felülírás (0 = automatikus), a többi valódi játék-stat. */
export type EditableEnemyStat = 'hp' | 'speed' | 'dmg' | 'r' | 'score' | 'tier';

const EDITABLE_STATS: readonly EditableEnemyStat[] = ['hp', 'speed', 'dmg', 'r', 'score', 'tier'];

/** A GYÁRI értékek pillanatképe (a „Visszaállítás" ezekre tér vissza). */
const DEFAULT_EDITABLE: Record<string, Record<EditableEnemyStat, number>> = (() => {
  const out: Record<string, Record<EditableEnemyStat, number>> = {};
  for (const k of Object.keys(ENEMY_STATS) as EnemyKind[]) {
    const s = ENEMY_STATS[k];
    if (s.tier === undefined) s.tier = 0; // a tier mindig konkrét szám legyen (0 = auto)
    out[k] = { hp: s.hp, speed: s.speed, dmg: s.dmg, r: s.r, score: s.score, tier: s.tier };
  }
  return out;
})();

const ENEMY_STORAGE_KEY = 'sentex_enemy_overrides';

type Overrides = Partial<Record<string, Partial<Record<EditableEnemyStat, number>>>>;

/** A defaulttól eltérő statok (csak ezeket mentjük / írjuk fájlba). */
function currentOverrides(): Overrides {
  const out: Overrides = {};
  for (const k of Object.keys(DEFAULT_EDITABLE) as EnemyKind[]) {
    const diff: Partial<Record<EditableEnemyStat, number>> = {};
    for (const f of EDITABLE_STATS) {
      if (ENEMY_STATS[k][f] !== DEFAULT_EDITABLE[k]![f]) diff[f] = ENEMY_STATS[k][f];
    }
    if (Object.keys(diff).length) out[k] = diff;
  }
  return out;
}

function applyOverrides(ov: Overrides | undefined): void {
  if (!ov) return;
  for (const k of Object.keys(ov)) {
    if (!(k in ENEMY_STATS)) continue;
    const diff = ov[k]!;
    for (const f of EDITABLE_STATS) {
      const v = diff[f];
      if (typeof v === 'number' && Number.isFinite(v)) ENEMY_STATS[k as EnemyKind][f] = v;
    }
  }
}

function saveEnemyLocal(): void {
  try { localStorage.setItem(ENEMY_STORAGE_KEY, JSON.stringify(currentOverrides())); } catch { /* nem elérhető */ }
}

/** Egy stat élő beállítása (helyben) + böngésző-mentés. */
export function setEnemyStat(kind: EnemyKind, field: EditableEnemyStat, value: number): void {
  ENEMY_STATS[kind][field] = value;
  saveEnemyLocal();
}

/** Minden szerkeszthető stat visszaállítása a gyári értékre. */
export function resetEnemyStats(): void {
  for (const k of Object.keys(DEFAULT_EDITABLE) as EnemyKind[]) {
    for (const f of EDITABLE_STATS) ENEMY_STATS[k][f] = DEFAULT_EDITABLE[k]![f];
  }
  saveEnemyLocal();
}

// ---------------------------------------------------------------------------
// Nehézség-kategória (admin ENEMY lap): statokból SZÁMÍTOTT tier, kézzel
// FELÜLÍRHATÓ a `tier` szerkeszthető mezőn át (ami a fájl-mentésbe is bekerül).
// ---------------------------------------------------------------------------

export type DifficultyTier = 1 | 2 | 3 | 4;

export const TIER_META: Record<DifficultyTier, { label: string; color: string }> = {
  1: { label: 'Könnyű', color: '#7ec88a' },
  2: { label: 'Közepes', color: '#e8c878' },
  3: { label: 'Nehéz', color: '#ff9a7a' },
  4: { label: 'Halálos', color: '#ff5b6a' },
};

/**
 * A statokból SZÁMÍTOTT nehézség: a HP (túlélőképesség), a TÉNYLEGES érintés-
 * sebzés (noContact → 0; 1 dmg = 50 pont a 0..100 skálán) és a sebesség (nyomás)
 * súlyozott „fenyegetettsége" egy 0..100 pontszám, négy sávra osztva. A viselkedés
 * (lövész/megidéző/…) nem tükröződik teljesen → a kézi felülírás korrigálja.
 */
export function computeTier(kind: EnemyKind): DifficultyTier {
  const s = ENEMY_STATS[kind];
  const hpNorm = Math.min(100, (s.hp / 5200) * 100);
  const spdNorm = Math.min(100, (s.speed / 214) * 100);
  const dmgNorm = Math.min(100, (s.noContact ? 0 : s.dmg) * 50); // 1 dmg = 500 pont = a 1000-es plafon fele
  const threat = 0.5 * hpNorm + 0.3 * spdNorm + 0.2 * dmgNorm;
  if (threat >= 68) return 4;
  if (threat >= 50) return 3;
  if (threat >= 30) return 2;
  return 1;
}

/** A megjelenítendő nehézség: kézi felülírás (tier 1–4), ha van, különben számított. */
export function enemyTier(kind: EnemyKind): { tier: DifficultyTier; computed: DifficultyTier; overridden: boolean } {
  const computed = computeTier(kind);
  const ov = ENEMY_STATS[kind].tier ?? 0;
  const overridden = ov >= 1 && ov <= 4;
  return { tier: overridden ? (ov as DifficultyTier) : computed, computed, overridden };
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin átírja az `enemyOverrides.ts`-t. */
export async function saveEnemyStatsToFile(): Promise<string> {
  saveEnemyLocal();
  try {
    const res = await fetch('/__save-enemies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentOverrides()),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (enemyOverrides.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

function loadEnemyLocal(): void {
  try {
    const raw = localStorage.getItem(ENEMY_STORAGE_KEY);
    if (raw) applyOverrides(JSON.parse(raw) as Overrides);
  } catch { /* hibás mentés — gyári értékkel */ }
}

// Modul betöltésekor: előbb a fájl-overrides (committelt), majd a böngésző.
applyOverrides(ENEMY_OVERRIDES);
loadEnemyLocal();
