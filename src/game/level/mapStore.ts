/**
 * A pálya-sablonok futásidejű tárolója és perzisztenciája (Admin · Pályák · ✎).
 *
 * A `MAPS` tömbjeit HELYBEN módosítjuk (nem cseréljük a referenciát), mert a
 * `levels.ts` CHAPTERS bejegyzései és a futó játék ezekre a tömbökre mutatnak —
 * így a szerkesztés azonnal él a generált szobákban is.
 *
 *  - élő szerkesztés  → automatikusan a böngészőbe (localStorage) mentjük
 *  - „Mentés fájlba"  → a forrás `maps.ts`-t is felülírja (dev szerver plugin)
 */
import { GRID } from '../config';
import { MAPS, type ChapterMaps } from './maps';
import { blankRow, normalizeRow, withToken } from './cell';

export type MapCategory = 'normal' | 'boss';

const STORAGE_KEY = 'sentex_maps';

/**
 * A böngésző-másolat verziója. **EMELD MEG, ha a `maps.ts`-t a szerkesztőn KÍVÜL
 * írod át** (kézzel vagy git-tel)! A localStorage a szerkesztő gyors-mentése, és
 * induláskor felülírja a fájlt — emiatt a fájl-szintű szerkesztés különben nem
 * látszana. Verzió-eltéréskor a régi böngésző-másolatot eldobjuk, így a FÁJL nyer,
 * majd a következő szerkesztő-mentés újra szinkronba hozza a kettőt.
 */
const STORAGE_VERSION = 3; // 3: áttérés 2-karakteres cella-tokenekre (a régi 1-karakteres másolat eldobódik)

interface StoredMaps { v: number; maps: Record<string, Partial<ChapterMaps>>; }

/**
 * A böngészőbe mentett pályák kiolvasása — verzió-ellenőrzéssel. Ha nincs mentés,
 * elavult a formátum, vagy a verzió nem egyezik, `null`-t ad és eldobja a kulcsot
 * (ekkor a `maps.ts` fájlbeli tartalma marad érvényben).
 */
function readSavedMaps(): Record<string, Partial<ChapterMaps>> | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredMaps>;
    if (!parsed || parsed.v !== STORAGE_VERSION || typeof parsed.maps !== 'object') {
      localStorage.removeItem(STORAGE_KEY); // elavult/régi verzió → a fájl nyerjen
      return null;
    }
    return parsed.maps;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/** Üres (csak padló) sablon a megfelelő rácsmérettel. */
export function blankTemplate(): string[] {
  return Array.from({ length: GRID.H }, () => blankRow());
}

/** Egy sablon érvényes méretűre igazítása (vágás/feltöltés padlóval). */
function normalizeTemplate(tpl: string[]): string[] {
  const rows: string[] = [];
  for (let r = 0; r < GRID.H; r++) rows.push(normalizeRow(tpl[r] ?? ''));
  return rows;
}

/** Egy cella tokenjének beállítása (új tömböt NEM hoz létre). A `token` 2 karakter. */
export function setCell(tpl: string[], col: number, row: number, token: string): void {
  if (row < 0 || row >= GRID.H || col < 0 || col >= GRID.W) return;
  tpl[row] = withToken(tpl[row]!, col, token);
}

/** A fejezet adott kategóriájú sablonlistája (élő referencia). */
export function templatesOf(chapterId: string, cat: MapCategory): string[][] {
  const cm = MAPS[chapterId];
  if (!cm) return [];
  return cat === 'normal' ? cm.normal : cm.boss;
}

/**
 * Biztosítja, hogy a megadott fejezethez legyen MAPS-bejegyzés (üres sablonokkal,
 * ha még nincs), és visszatölti a böngészőbe mentett pályáit. Az adminból
 * létrehozott új fejezetek (`levels.ts`) hívják, mert azokhoz a `maps.ts` még nem
 * tartalmaz pályát.
 */
export function ensureChapterMaps(id: string): void {
  if (MAPS[id]) return;
  MAPS[id] = { normal: [blankTemplate()], boss: [blankTemplate()] };
  applyLocalFor(id);
}

/** A böngészőbe mentett pályák visszatöltése EGYETLEN fejezetre (ha van). */
function applyLocalFor(id: string): void {
  const data = readSavedMaps();
  if (!data) return;
  const saved = data[id];
  const cm = MAPS[id];
  if (!saved || !cm) return;
  applyList(cm.normal, saved.normal);
  applyList(cm.boss, saved.boss);
}

/** Üres BOSS-szoba: csak padló + egy boss-jel (BB) a közepén. */
export function blankBossTemplate(): string[] {
  const tpl = blankTemplate();
  setCell(tpl, Math.floor(GRID.W / 2), Math.floor(GRID.H / 2), 'BB');
  return tpl;
}

/** Új üres sablon hozzáadása; visszaadja az új indexét. */
export function addTemplate(chapterId: string, cat: MapCategory): number {
  const list = templatesOf(chapterId, cat);
  list.push(cat === 'boss' ? blankBossTemplate() : blankTemplate());
  saveLocal();
  return list.length - 1;
}

/**
 * Biztosítja, hogy a fejezetnek LEGALÁBB `count` boss-szobája legyen — minden
 * szintnek saját boss-szobája (lásd World: a boss-sablont a szint-index választja).
 * Csak PÓTOL (üres boss-szobával), sosem töröl, így a meglévő munka megmarad.
 * Igaz, ha hozzáadott (a hívó frissíthet).
 */
export function ensureBossRooms(chapterId: string, count: number): boolean {
  ensureChapterMaps(chapterId);
  const list = templatesOf(chapterId, 'boss');
  let added = false;
  while (list.length < count) { list.push(blankBossTemplate()); added = true; }
  if (added) saveLocal();
  return added;
}

/** Egy sablon duplikálása (a kijelölt után szúrja be); visszaadja az új indexét. */
export function duplicateTemplate(chapterId: string, cat: MapCategory, index: number): number {
  const list = templatesOf(chapterId, cat);
  const orig = list[index];
  if (!orig) return index;
  list.splice(index + 1, 0, [...orig]);
  saveLocal();
  return index + 1;
}

/** Egy sablon törlése (legalább 1-et meghagyunk kategóriánként). */
export function deleteTemplate(chapterId: string, cat: MapCategory, index: number): void {
  const list = templatesOf(chapterId, cat);
  if (list.length <= 1) return;
  list.splice(index, 1);
  saveLocal();
}

// ---- Perzisztencia ----

/** A jelenlegi pályák mentése a böngészőbe (újratöltés után is megmarad). */
export function saveLocal(): void {
  try {
    const maps: Record<string, ChapterMaps> = {};
    for (const id of Object.keys(MAPS)) maps[id] = MAPS[id]!;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, maps }));
  } catch {
    /* localStorage nem elérhető — csendben kihagyjuk */
  }
}

/** Mentett pályák visszatöltése a böngészőből (helyben felülírja a MAPS-ot). */
export function loadLocal(): void {
  const data = readSavedMaps();
  if (!data) return;
  for (const id of Object.keys(MAPS)) {
    const cm = MAPS[id]!;
    const saved = data[id];
    if (!saved) continue;
    applyList(cm.normal, saved.normal);
    applyList(cm.boss, saved.boss);
  }
}

/** Egy listát helyben felülír a mentett tartalommal (érvényesítve a méreteket). */
function applyList(target: string[][], saved: unknown): void {
  if (!Array.isArray(saved)) return;
  target.length = 0;
  for (const tpl of saved) {
    if (Array.isArray(tpl) && tpl.every((r) => typeof r === 'string')) {
      target.push(normalizeTemplate(tpl as string[]));
    }
  }
  if (target.length === 0) target.push(blankTemplate());
}

/**
 * Mentés a FORRÁSFÁJLBA (dev mód): a Vite plugin újragenerálja a `maps.ts`-t.
 * Production buildben nincs szerver → hibaüzenetet ad vissza.
 */
export async function saveMapsToFile(): Promise<string> {
  saveLocal();
  try {
    const data: Record<string, ChapterMaps> = {};
    for (const id of Object.keys(MAPS)) data[id] = MAPS[id]!;
    const res = await fetch('/__save-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    return json.ok ? 'Fájlba mentve ✓ (maps.ts)' : `Hiba: ${json.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

// Modul betöltésekor azonnal visszaolvassuk a böngészőbe mentett pályákat.
loadLocal();
