/**
 * Idő-mérés + futás-statisztika mag. Itt él (1) a futás közbeni ÉLŐ időzítő- és
 * számláló-állapot (`RunStats`), és (2) az élethosszig gyűjtött összesített
 * statisztika + idő-rekordok perzisztenciája (localStorage).
 *
 * A modul szándékosan keret- és játék-független (csak localStorage), így — a
 * `progression.ts`-hez hasonlóan — később egy szerverre (online ranglista,
 * speedrun-tábla) is bővíthető; az adatszerkezetek már most illeszkednek.
 *
 * Fogalmak (lásd CLAUDE.md „Pálya-modell"):
 * - **Szoba** — egyetlen terem. Nincs stabil, futások közti azonosítója → csak
 *   ÉLŐ kijelzés, nincs szoba-rekord.
 * - **Map / szint** — egy generált szint (10–16 szobából). A szint-SZÁM stabil →
 *   van „leggyorsabb szint-tisztítás" rekord szintenként.
 * - **Labirintus** — fejezetenként stabil → van labirintus-rekord.
 */

// ---------------------------------------------------------------------------
// Idő-formázás (egyetlen forrás a HUD-nak és a menüknek)
// ---------------------------------------------------------------------------

/** mp → „m:ss" vagy „h:mm:ss"; `tenths` esetén tizedmásodperccel („m:ss.d"). */
export function formatTime(sec: number, tenths = false): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  if (tenths) {
    const d = Math.floor((sec * 10) % 10);
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}.${d}` : `${m}:${pad(s)}.${d}`;
  }
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ---------------------------------------------------------------------------
// ÉLŐ futás-állapot (a World ticki; nem perzisztens)
// ---------------------------------------------------------------------------

/**
 * Egy futás közben gyűlő idők és számlálók. A `World` birtokolja, képkockánként
 * `tick(dt)`-vel lépteti (csak aktív játék alatt — szünet/menü nem). A futás
 * végén a `Game` a `commitRun`-nal összesíti az élethosszig statba.
 */
export class RunStats {
  // --- idők (mp) ---
  run = 0;   // teljes futás
  floor = 0; // aktuális szint (map)
  room = 0;  // aktuális szoba
  lab = 0;   // labirintus (csak ha aktív)
  labActive = false;

  // --- per-futás számlálók (a végén az élethossziba olvadnak) ---
  kills = 0;
  bossKills = 0;
  roomsCleared = 0;
  floorsCleared = 0;
  labsCleared = 0;

  /** Igaz, ha a futást már beolvasztottuk (kétszeres számolás ellen). */
  flushed = false;

  /** Új futás: minden nulláról. */
  resetRun(): void {
    this.run = this.floor = this.room = this.lab = 0;
    this.labActive = false;
    this.kills = this.bossKills = this.roomsCleared = this.floorsCleared = this.labsCleared = 0;
    this.flushed = false;
  }
  /** Új szint: a szint- és szoba-óra nulláról (a futás-óra megy tovább). */
  resetFloor(): void { this.floor = 0; this.room = 0; }
  /** Új szoba: csak a szoba-óra nulláról. */
  resetRoom(): void { this.room = 0; }
  /** Labirintusba lépés: a labirintus-óra nulláról, a szint/szoba-óra szünetel. */
  startLab(): void { this.lab = 0; this.labActive = true; }
  /** Labirintusból ki: a szint/szoba-óra folytatódik. */
  endLab(): void { this.labActive = false; }

  /** Aktív játék-képkocka: a futás-óra mindig megy; labirintusban a labirintus-,
   *  egyébként a szint- és szoba-óra. */
  tick(dt: number): void {
    this.run += dt;
    if (this.labActive) this.lab += dt;
    else { this.floor += dt; this.room += dt; }
  }
}

// ---------------------------------------------------------------------------
// PERZISZTENS összesített statisztika + idő-rekordok
// ---------------------------------------------------------------------------

const STATS_KEY = 'sentex_stats';
const RECORDS_KEY = 'sentex_records';

/** Élethosszig gyűjtött összesítők (a RANG · Statisztika lap forrása). */
export interface LifetimeStats {
  playTime: number;      // össz aktív játékidő (mp)
  runs: number;          // befejezett (elhalt) futások
  deaths: number;        // halálok
  kills: number;         // ellenfél-ölés
  bossKills: number;     // boss-ölés
  floorsCleared: number; // teljesített szintek (csapóajtó)
  roomsCleared: number;  // kipucolt szobák
  labsCleared: number;   // teljesített labirintusok
  coins: number;         // összegyűjtött érme
}

/** Idő- és csúcs-rekordok (a RANG · Rekordok lap forrása). */
export interface TimeRecords {
  /** szint-szám → leggyorsabb tisztítás (mp). */
  floorClear: Record<number, number>;
  /** fejezet-id → leggyorsabb labirintus (mp). */
  labClear: Record<string, number>;
  /** leghosszabb túlélés egy futásban (mp). */
  longestRun: number;
  /** legjobb egy-futás pont. */
  bestScore: number;
}

const ZERO_STATS: LifetimeStats = {
  playTime: 0, runs: 0, deaths: 0, kills: 0, bossKills: 0,
  floorsCleared: 0, roomsCleared: 0, labsCleared: 0, coins: 0,
};

function readJSON<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return { ...fallback };
  }
}

export function loadStats(): LifetimeStats {
  return readJSON<LifetimeStats>(STATS_KEY, ZERO_STATS);
}

function saveStats(s: LifetimeStats): void {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* nem elérhető */ }
}

export function loadRecords(): TimeRecords {
  const r = readJSON<TimeRecords>(RECORDS_KEY, {
    floorClear: {}, labClear: {}, longestRun: 0, bestScore: 0,
  });
  // a beágyazott objektumok a spread után referenciák lehetnek → biztosítsuk őket
  if (!r.floorClear || typeof r.floorClear !== 'object') r.floorClear = {};
  if (!r.labClear || typeof r.labClear !== 'object') r.labClear = {};
  return r;
}

function saveRecords(r: TimeRecords): void {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(r)); } catch { /* nem elérhető */ }
}

/** Szint-tisztítási idő rögzítése, ha új csúcs (gyorsabb). Igaz = új rekord. */
export function recordFloorClear(floor: number, seconds: number): boolean {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const r = loadRecords();
  const prev = r.floorClear[floor];
  if (prev === undefined || seconds < prev) {
    r.floorClear[floor] = seconds;
    saveRecords(r);
    return true;
  }
  return false;
}

/** Labirintus-idő rögzítése, ha új csúcs (gyorsabb). Igaz = új rekord. */
export function recordLabClear(chapterId: string, seconds: number): boolean {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const r = loadRecords();
  const prev = r.labClear[chapterId];
  if (prev === undefined || seconds < prev) {
    r.labClear[chapterId] = seconds;
    saveRecords(r);
    return true;
  }
  return false;
}

/** Egy lezárt futás összesítése: élethosszig statok + csúcs-rekordok frissítése. */
export interface RunSummary {
  time: number;
  kills: number;
  bossKills: number;
  roomsCleared: number;
  floorsCleared: number;
  labsCleared: number;
  coins: number;
  score: number;
  died: boolean;
}

export function commitRun(s: RunSummary): void {
  const st = loadStats();
  st.playTime += Math.max(0, s.time);
  st.runs += 1;
  if (s.died) st.deaths += 1;
  st.kills += s.kills;
  st.bossKills += s.bossKills;
  st.roomsCleared += s.roomsCleared;
  st.floorsCleared += s.floorsCleared;
  st.labsCleared += s.labsCleared;
  st.coins += Math.max(0, s.coins);
  saveStats(st);

  const rec = loadRecords();
  if (s.score > rec.bestScore) rec.bestScore = s.score;
  if (s.time > rec.longestRun) rec.longestRun = s.time;
  saveRecords(rec);
}

/** Az összesített statisztika ÉS az idő-rekordok törlése (a RANG · Beállítások „Reset"-jéhez). */
export function resetAllStats(): void {
  try {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(RECORDS_KEY);
  } catch { /* nem elérhető */ }
}
