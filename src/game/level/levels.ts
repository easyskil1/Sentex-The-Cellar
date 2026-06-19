import type { EnemyKind } from '../entities/enemies/enemyTypes';
import type { Theme } from './theme';
import { MAPS } from './maps';
import { ensureChapterMaps } from './mapStore';
import { CHAPTER_OVERRIDES } from './chapterOverrides';
import { HARD_LABYRINTH, cloneLabyrinthConfig, type LabyrinthConfig } from './labyrinth';
import { tc } from '../../i18n';

/**
 * Fejezet = egy „világ" több szinttel. Minden fejezetnek saját
 * szoba-sablon készlete, ellenfél-palettája, témája és boss-neve van.
 *
 * ITT TERVEZED A PÁLYÁKAT: a `BASE_CHAPTERS` tömbbe írod, hogy melyik fejezetben
 * milyen szobák, ellenfelek, színek és boss legyenek. A `CHAPTERS` ennek a
 * MUTÁLHATÓ, futásidejű változata: a gyári fejezetekre az adminban tett
 * módosítások (sztori, nehézség, …) és az újonnan létrehozott fejezetek is
 * rákerülnek (lásd `chapterOverrides.ts` + localStorage).
 *
 * Egy generált szint 10–16 szobából áll (lásd config DUNGEON), amelyeket a
 * fejezet `normalTemplates` pooljából húz — ezért érdemes fejezetenként sok
 * (≥10) különböző sablont adni, hogy változatos legyen a pálya.
 *
 * A definiált fejezeteken túl (végtelen játék) az utolsó fejezet ismétlődik,
 * növekvő nehézséggel.
 */
/**
 * A pálya-kategóriák (admin · MAP lap három legördülője):
 * - `fejezet`     — a normál kampány-világok; EZEK adják a globális szint-
 *                   progressziót (resolveLevel, nehézség-létra).
 * - `dungeon`     — különálló dungeon-pályák pool-ja (nem a fő ívben).
 * - `kulonleges`  — rejtett extra/különleges pályák (nem a fő ívben).
 *
 * Csak a `fejezet` kategória számít a globális szintszámozásba; a `dungeon` és
 * `kulonleges` pályák opcionális/rejtett tartalom, nem tolják el a fő ívet.
 */
export type ChapterCategory = 'fejezet' | 'dungeon' | 'kulonleges';
export const CHAPTER_CATEGORIES: ChapterCategory[] = ['fejezet', 'dungeon', 'kulonleges'];
const CATEGORY_LABEL: Record<ChapterCategory, string> = {
  fejezet: 'Fejezetek', dungeon: 'Dungeon', kulonleges: 'Különleges pályák',
};
export function chapterCategoryLabel(c: ChapterCategory): string { return CATEGORY_LABEL[c]; }

export interface Chapter {
  id: string;
  /** Megjelenő név (a szint így jelenik meg: "<name> <index>"). */
  name: string;
  /** Melyik MAP-legördülőbe (kategóriába) tartozik. Csak a `fejezet` ad globális szintet. */
  category: ChapterCategory;
  /** Hány szintet fed le ez a fejezet. */
  floors: number;
  /** Normál harci szobák sablonjai (13×7 rács). */
  normalTemplates: string[][];
  /** Boss-szobák sablonjai. */
  bossTemplates: string[][];
  /** A generikus 'e' ellenfél-slot ezekből választ véletlenszerűen. */
  enemyKinds: EnemyKind[];
  bossName: string;
  theme: Theme;
  /** Rövid, egymondatos hangulati leírás (admin · MAP lapon szerkeszthető). */
  description?: string;
  /** Hosszabb bevezető sztori (több bekezdés is lehet). */
  story?: string;
  /** Opcionális, fejezet-szintű nehézség-szorzó az ellenfél-HP-ra (1 = nincs hatás). */
  difficultyMul?: number;
  /** Ha jelen van, ez a pálya egy LABIRINTUS (a szoba-sablonok helyett). */
  labyrinth?: LabyrinthConfig;
}

// ---- Témák ----
const THEME_PINCE: Theme = {
  floor: '#241d2a', grid: 'rgba(0,0,0,0.22)', vignette: 0.4,
  wall: '#3a2c20', wallEdge: '#1a120c', wallTop: 'rgba(255,220,170,0.05)',
  doorFrame: '#1a120c', doorFloor: '#241d2a', doorBar: '#5a4030', doorBarStroke: '#2a1d12',
  rock: '#5a5260', rockStroke: '#2a2630', bossColor: '#9c4bd8', accent: '#f0c878',
  ambient: '88', // szentjánosbogarak: pislákoló élet a nyirkos sötétben
};

const THEME_UREG: Theme = {
  floor: '#1b2a24', grid: 'rgba(0,0,0,0.25)', vignette: 0.42,
  wall: '#243a30', wallEdge: '#0f1a14', wallTop: 'rgba(180,255,210,0.05)',
  doorFrame: '#0f1a14', doorFloor: '#1b2a24', doorBar: '#356050', doorBarStroke: '#16302a',
  rock: '#4a5a54', rockStroke: '#243029', bossColor: '#3fd8a0', accent: '#8fe0c0',
  decorations: ['#2d4a3e', '#3a5a4a', '#8fe0c0'], // Indák, fű, moha színei
  ambient: '**', // mérgező spórák: az „élő barlang" lélegzik (lásd sztori)
};

const THEME_MELYSEG: Theme = {
  floor: '#1d1b2e', grid: 'rgba(0,0,0,0.28)', vignette: 0.5,
  wall: '#2a2440', wallEdge: '#120f1f', wallTop: 'rgba(200,180,255,0.05)',
  doorFrame: '#120f1f', doorFloor: '#1d1b2e', doorBar: '#453d66', doorBarStroke: '#221d38',
  rock: '#4a4560', rockStroke: '#262238', bossColor: '#ff5b8a', accent: '#b8a0ff',
  decorations: ['#2a2440', '#3a2d5a', '#ff5b8a'], // Kristályok, sötét kövek színei
  ambient: '55', // köd: mélységi homály, csökkent láthatóság
};

// Holtak városa — vörös-csont-fekete, fáklyafényes kripta.
const THEME_NECRO: Theme = {
  floor: '#241016', grid: 'rgba(0,0,0,0.32)', vignette: 0.52,
  wall: '#3a1a1a', wallEdge: '#1a0a0a', wallTop: 'rgba(255,180,160,0.05)',
  doorFrame: '#1a0a0a', doorFloor: '#241016', doorBar: '#6a2828', doorBarStroke: '#2a1010',
  rock: '#5a4a4a', rockStroke: '#2a2020', bossColor: '#ff3b3b', accent: '#e0a890',
  decorations: ['#3a1a1a', '#5a2828', '#e0a890'], // Sírkövek, vér, csont árnyalatai
  ambient: '44', // parázs szállás: fáklyafény szikrái a kriptában
};

// Sárkányfészek — arany-tűz-fekete, izzó parázzsal.
const THEME_LAIR: Theme = {
  floor: '#241a10', grid: 'rgba(0,0,0,0.3)', vignette: 0.55,
  wall: '#3a2a14', wallEdge: '#1a1208', wallTop: 'rgba(255,210,140,0.06)',
  doorFrame: '#1a1208', doorFloor: '#241a10', doorBar: '#7a5424', doorBarStroke: '#3a2810',
  rock: '#5a4e3a', rockStroke: '#2a2418', bossColor: '#ff8030', accent: '#f0a830',
  decorations: ['#3a2a14', '#6a4420', '#f0a830'], // Arany, parázs, kristály színei
  ambient: '00', // hamueső: vulkáni, fojtott légkör a sárkányfészekben
};

/** A választható téma-alapok (új fejezet ezek egyikének kinézetét örökli). */
export type ThemeBaseId = 'pince' | 'ureg' | 'melyseg';
export const THEME_BASES: ThemeBaseId[] = ['pince', 'ureg', 'melyseg'];
const THEME_BY_BASE: Record<ThemeBaseId, Theme> = {
  pince: THEME_PINCE, ureg: THEME_UREG, melyseg: THEME_MELYSEG,
};
const THEME_BASE_LABEL: Record<ThemeBaseId, string> = {
  pince: 'The Cellar (barna)', ureg: 'Üreg (zöld)', melyseg: 'Mélység (lila)',
};
export function themeBaseLabel(id: ThemeBaseId): string { return THEME_BASE_LABEL[id]; }

/** Egy téma másolata (a decorations tömböt is külön másolja). */
function cloneTheme(t: Theme): Theme {
  return t.decorations ? { ...t, decorations: [...t.decorations] } : { ...t };
}

// ---- Gyári fejezetek (a tervezés alapja) ----
function baseChapters(): Chapter[] {
  return [
    {
      id: 'pince',
      name: 'The Cellar',
      category: 'fejezet',
      floors: 2,
      enemyKinds: ['fly', 'walker'],
      bossName: 'The Grub',
      theme: THEME_PINCE,
      normalTemplates: MAPS.pince.normal,
      bossTemplates: MAPS.pince.boss,
      difficultyMul: 1,
      description: 'A ház alatti nyirkos pince — itt kezdődik a leereszkedés.',
      story: 'A padlódeszkák megnyíltak, és a hideg, dohos sötét magába szippantott. '
        + 'A pince falain régi karcolások: valaki — vagy valami — már járt itt előtted.',
    },
    {
      id: 'ureg',
      name: 'Hollow',
      category: 'fejezet',
      floors: 2,
      enemyKinds: ['walker', 'shooter', 'fly', 'rotling', 'mistweaver', 'spider'],
      bossName: 'The Stoneeater',
      theme: THEME_UREG,
      normalTemplates: MAPS.ureg.normal,
      bossTemplates: MAPS.ureg.boss,
      difficultyMul: 1,
      description: 'Gyökerekkel és mohával benőtt, élő barlangrendszer.',
      story: 'A pince mélyén a kő átadja helyét a földnek. Indák tapogatóznak a sötétben, '
        + 'és a nedves levegőben spórák kavarognak — az Üreg lélegzik.',
    },
    {
      id: 'melyseg',
      name: 'Depths',
      category: 'fejezet',
      floors: 2,
      enemyKinds: ['shooter', 'charger', 'walker', 'chiller', 'lancer', 'pyro', 'bombardier', 'spitter', 'rotling', 'mistweaver'],
      bossName: 'The Depth Lord',
      theme: THEME_MELYSEG,
      normalTemplates: MAPS.melyseg.normal,
      bossTemplates: MAPS.melyseg.boss,
      difficultyMul: 1,
      description: 'Kristályoktól izzó, hideg mélység, egyre lejjebb a sötétbe.',
      story: 'Itt már nincs felszín, nincs visszaút. A kristályok lüktető fénye '
        + 'idegen geometriát rajzol a falakra. Valami ősi vár rád a sötét fenekén.',
    },
    {
      id: 'necropolis',
      name: 'Necropolis',
      category: 'fejezet',
      floors: 2,
      enemyKinds: ['skeleton', 'wraith', 'banshee', 'imp', 'vampire', 'bat', 'gargoyle',
        'medusa', 'harpy', 'mummy', 'summoner', 'healer', 'enrager', 'confuser', 'blinker',
        'gunner', 'sniper', 'tick', 'wisp'],
      bossName: 'Satan',
      theme: THEME_NECRO,
      normalTemplates: MAPS.necropolis.normal,
      bossTemplates: MAPS.necropolis.boss,
      difficultyMul: 1,
      description: 'Csontból és sírkőből rakott holt város, ahol a halottak nem nyugszanak.',
      story: 'A mélység alatt eltemetett város terül el. Koporsók nyikorognak, a fáklyák '
        + 'maguktól lobbannak, és a falból kinyúló kezek a nevedet suttogják. Maga a Sátán '
        + 'tartja itt udvarát.',
    },
    {
      id: 'dragonlair',
      name: "Dragon's Lair",
      category: 'fejezet',
      floors: 2,
      enemyKinds: ['minotaur', 'cyclops', 'golem', 'hydra', 'werewolf', 'scorpion', 'serpent',
        'scarab', 'leech', 'slammer', 'kamikaze', 'striker', 'leaper', 'flanker', 'blocker',
        'mortar', 'shotgunner', 'bombthrower', 'turret', 'gasbag', 'puller', 'worm', 'roach'],
      bossName: 'Dragon',
      theme: THEME_LAIR,
      normalTemplates: MAPS.dragonlair.normal,
      bossTemplates: MAPS.dragonlair.boss,
      difficultyMul: 1,
      description: 'Izzó, aranytól és parázstól fénylő sárkánybarlang, a leereszkedés legmélye.',
      story: 'A legalsó kamrában a hőség elviselhetetlen. Felhalmozott kincs csillog a parázs '
        + 'fényében, és a sötétből két (vagy négy?) szempár figyel. A sárkány ébren van.',
    },
  ];
}

// ---- Felülírások (admin szerkesztések + új fejezetek) ----

/** Egy meglévő/új fejezet módosított mezői (csak az eltérők). */
export interface ChapterEdit {
  name?: string;
  category?: ChapterCategory;
  floors?: number;
  bossName?: string;
  enemyKinds?: EnemyKind[];
  description?: string;
  story?: string;
  difficultyMul?: number;
  labyrinth?: LabyrinthConfig;
}

/** Egy adminból létrehozott új fejezet alap-rekordja (a téma egy alapból klónozódik). */
export interface NewChapterRecord {
  id: string;
  themeBase: ThemeBaseId;
  name: string;
  category?: ChapterCategory;
  floors: number;
  bossName: string;
  enemyKinds: EnemyKind[];
  description?: string;
  story?: string;
  difficultyMul?: number;
  labyrinth?: LabyrinthConfig;
}

export interface ChapterOverrides {
  edits: Record<string, ChapterEdit>;
  created: NewChapterRecord[];
}

const STORAGE_KEY = 'sentex_chapters';

/** A working-copy felülírások: localStorage (élő), különben a fájl-baseline. */
function loadOverrides(): ChapterOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<ChapterOverrides>;
      return { edits: d.edits ?? {}, created: d.created ?? [] };
    }
  } catch {
    /* localStorage nem elérhető — a fájl-baseline-nal indulunk */
  }
  return { edits: { ...CHAPTER_OVERRIDES.edits }, created: [...CHAPTER_OVERRIDES.created] };
}

let overrides: ChapterOverrides = loadOverrides();

function persistLocal(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch { /* kihagyjuk */ }
}

/** Egy fejezetre alkalmazza a megadott módosításokat (helyben). */
function applyEdit(ch: Chapter, e: ChapterEdit | undefined): void {
  if (!e) return;
  if (e.name !== undefined) ch.name = e.name;
  if (e.category !== undefined) ch.category = e.category;
  if (e.labyrinth !== undefined) ch.labyrinth = cloneLabyrinthConfig(e.labyrinth);
  if (e.floors !== undefined) ch.floors = Math.max(1, Math.round(e.floors));
  if (e.bossName !== undefined) ch.bossName = e.bossName;
  if (e.enemyKinds !== undefined) ch.enemyKinds = [...e.enemyKinds];
  if (e.description !== undefined) ch.description = e.description;
  if (e.story !== undefined) ch.story = e.story;
  if (e.difficultyMul !== undefined) ch.difficultyMul = e.difficultyMul;
}

/**
 * A futásidejű fejezetlista — MUTÁLHATÓ, de a REFERENCIA állandó (más modulok
 * ezt importálják). Ezért mindig HELYBEN frissítjük (length=0 + push), sosem
 * cseréljük a tömböt.
 */
export const CHAPTERS: Chapter[] = [];

/** Újraépíti a CHAPTERS-t: gyári + új fejezetek + a módosítások rátételével. */
function rebuild(): void {
  const list = baseChapters();
  for (const rec of overrides.created) {
    ensureChapterMaps(rec.id); // a generált pályákhoz kell egy MAPS-bejegyzés
    const cm = MAPS[rec.id];
    list.push({
      id: rec.id,
      name: rec.name,
      category: rec.category ?? 'fejezet',
      floors: Math.max(1, Math.round(rec.floors)),
      enemyKinds: [...rec.enemyKinds],
      bossName: rec.bossName,
      theme: cloneTheme(THEME_BY_BASE[rec.themeBase] ?? THEME_PINCE),
      normalTemplates: cm.normal,
      bossTemplates: cm.boss,
      difficultyMul: rec.difficultyMul ?? 1,
      description: rec.description,
      story: rec.story,
      labyrinth: rec.labyrinth ? cloneLabyrinthConfig(rec.labyrinth) : undefined,
    });
  }
  for (const ch of list) applyEdit(ch, overrides.edits[ch.id]);
  CHAPTERS.length = 0;
  CHAPTERS.push(...list);
}

// ---- Admin-CRUD (a MAP lap használja) ----

/** Igaz, ha a fejezetet az adminból hozták létre (és így törölhető). */
export function isCreatedChapter(id: string): boolean {
  return overrides.created.some((c) => c.id === id);
}

/** Egy fejezet mezőinek módosítása (gyári és új fejezetre is). */
export function setChapterEdit(id: string, patch: ChapterEdit): void {
  overrides.edits[id] = { ...overrides.edits[id], ...patch };
  persistLocal();
  rebuild();
}

/** Új pálya létrehozása a megadott kategóriába + téma-alappal; visszaadja az új id-t. */
export function addChapter(category: ChapterCategory = 'fejezet', themeBase: ThemeBaseId = 'melyseg'): string {
  let i = overrides.created.length + 1;
  let id = `uj${i}`;
  const exists = (x: string): boolean => CHAPTERS.some((c) => c.id === x) || x in MAPS;
  while (exists(id)) { i++; id = `uj${i}`; }
  const namePrefix = category === 'dungeon' ? 'Új dungeon' : category === 'kulonleges' ? 'A Labirintus' : 'Új fejezet';
  // Különleges pálya = alapból egy NEHÉZ labirintus (saját, véletlen seeddel).
  const labyrinth = category === 'kulonleges'
    ? { ...cloneLabyrinthConfig(HARD_LABYRINTH), seed: Math.floor(Math.random() * 1e9) }
    : undefined;
  overrides.created.push({
    id, themeBase, category, labyrinth,
    name: category === 'kulonleges' ? namePrefix : `${namePrefix} ${i}`,
    floors: 1,
    bossName: 'Új boss',
    enemyKinds: ['fly', 'walker'],
    description: '',
    story: '',
    difficultyMul: 1,
  });
  persistLocal();
  rebuild();
  return id;
}

/** Egy létrehozott fejezet téma-alapja (gyári/ismeretlen fejezetnél null). */
export function createdThemeBase(id: string): ThemeBaseId | null {
  return overrides.created.find((c) => c.id === id)?.themeBase ?? null;
}

/** Egy létrehozott fejezet téma-alapjának módosítása (a kinézet onnan klónozódik). */
export function setChapterThemeBase(id: string, base: ThemeBaseId): void {
  const rec = overrides.created.find((c) => c.id === id);
  if (!rec) return;
  rec.themeBase = base;
  persistLocal();
  rebuild();
}

/** Egy adminból létrehozott fejezet törlése (gyári fejezet nem törölhető). */
export function deleteChapter(id: string): void {
  const idx = overrides.created.findIndex((c) => c.id === id);
  if (idx < 0) return;
  overrides.created.splice(idx, 1);
  delete overrides.edits[id];
  persistLocal();
  rebuild();
}

/** Vissza a gyári fejezetekre (localStorage törlése). */
export function resetChapters(): void {
  overrides = { edits: { ...CHAPTER_OVERRIDES.edits }, created: [...CHAPTER_OVERRIDES.created] };
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* kihagyjuk */ }
  rebuild();
}

/**
 * Mentés a FORRÁSFÁJLBA (dev mód): a Vite plugin újraírja a `chapterOverrides.ts`-t.
 * Production buildben nincs szerver → hibaüzenetet ad vissza.
 */
export async function saveLevelsToFile(): Promise<string> {
  persistLocal();
  try {
    const res = await fetch('/__save-levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    return json.ok ? 'Fájlba mentve ✓ (chapterOverrides.ts)' : `Hiba: ${json.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

// Modul betöltésekor azonnal felépítjük a fejezetlistát.
rebuild();

export interface ResolvedLevel {
  chapter: Chapter;
  /** Hányadik szint a fejezeten belül (1-alapú). */
  index: number;
  /** Igaz, ha a definiált fejezeteken túl vagyunk (ismétlődő utolsó fejezet). */
  isBeyond: boolean;
}

/** Csak a `fejezet` kategóriás (kampány) világok — EZEK adják a globális ívet. */
export function campaignChapters(): Chapter[] {
  return CHAPTERS.filter((c) => c.category === 'fejezet');
}

/** A fejezet megjelenítendő neve a jelenlegi nyelven (az `id` a stabil kulcs; a
 *  felhasználó által létrehozott/átnevezett fejezeteknél nincs HU kulcs → az
 *  eredeti név marad). */
export function chapterName(ch: Chapter): string {
  return tc(ch.name, `chapter.${ch.id}.name`);
}

/** A fejezet boss-ának megjelenítendő neve a jelenlegi nyelven (boss-introhoz). */
export function chapterBossName(ch: Chapter): string {
  return tc(ch.bossName, `chapter.${ch.id}.boss`);
}

/**
 * Gótikus latin alcím a boss-introhoz (#60). Nyelv-SEMLEGES (latin), ezért itt
 * él, nem az i18n EN/HU térképben - mindkét nyelven ugyanaz a hangulati idézet.
 * Ismeretlen/felhasználói fejezethez üres (akkor csak a kicker + név látszik).
 */
const BOSS_QUOTES: Record<string, string> = {
  pince: 'Ex putredine, vita',          // A Lárva - rothadásból élet
  ureg: 'Qui petram vorat',             // A Kőfaló - aki követ fal
  melyseg: 'De profundis, dominus',     // A Mélység Ura - a mélyből úr
  necropolis: 'Mors non est finis',     // Sátán - a halál nem a vég
  dragonlair: 'Igne natus, igne peris', // A Sárkány - tűzből születtél, tűzben veszel
};
export function chapterBossQuote(ch: Chapter): string {
  return BOSS_QUOTES[ch.id] ?? '';
}

/**
 * Egy globális szintszámból megadja, melyik fejezet és azon belül hányadik szint.
 * CSAK a kampány-fejezeteket veszi figyelembe (a dungeon/különleges pályák nem
 * a fő ívben vannak).
 */
export function resolveLevel(floor: number): ResolvedLevel {
  const camp = campaignChapters();
  let f = floor;
  for (const ch of camp) {
    if (f <= ch.floors) return { chapter: ch, index: f, isBeyond: false };
    f -= ch.floors;
  }
  const last = camp[camp.length - 1] ?? CHAPTERS[CHAPTERS.length - 1]!;
  return { chapter: last, index: last.floors + f, isBeyond: true };
}

/**
 * Az adott fejezet kezdő/záró globális szintszáma (1-alapú) — csak kijelzéshez.
 * Nem-kampány (dungeon/különleges) pályára `null` (azok nincsenek a fő ívben).
 */
export function chapterFloorRange(id: string): { start: number; end: number } | null {
  let start = 1;
  for (const ch of campaignChapters()) {
    if (ch.id === id) return { start, end: start + ch.floors - 1 };
    start += ch.floors;
  }
  return null;
}

/** Az összes kampány-fejezet által lefedett szintek száma. */
export function totalDefinedFloors(): number {
  return campaignChapters().reduce((sum, ch) => sum + ch.floors, 0);
}

/** Egy adott globális szint fejezet-szintű nehézség-szorzója (1 = nincs hatás). */
export function chapterDifficultyMul(floor: number): number {
  return resolveLevel(floor).chapter.difficultyMul ?? 1;
}
