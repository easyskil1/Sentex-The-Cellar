/**
 * Rang-, érem- és progresszió-mag. Itt kap a pont (`world.score`) valódi értelmet:
 * az ÖSSZESÍTETT (élethosszig gyűjtött) pont egy 1..100 rangot hajt, sávonként
 * (bronz→legendás) egy-egy éremmel. A küszöb-görbe mértani: minden rang-ugrás
 * `GROWTH`-szor nagyobb az előzőnél. Részletes terv: RANG_RENDSZER.md.
 *
 * A modul keret- és játék-független (csak localStorage-ot használ), így később
 * egy szerverre (online ranglista) is bővíthető — az adatszerkezetek már most
 * illeszkednek.
 */

import { tc } from '../i18n';

export interface RankTuning {
  /** A küszöb-rés mértani szorzója — a fő hangoló-paraméter (nagyobb = meredekebb). */
  growth: number;
  /** Az 1. rang küszöbe pontban (rang 2 ≈ 2× ennyi). */
  anchor: number;
}

/** GYÁRI alapértékek — a „Visszaállítás" ezekre tér vissza. (A fájlmentő ezt írja át.) */
export const DEFAULT_RANK_TUNING: RankTuning = {
  growth: 1.07,
  anchor: 5000,
};

/** Az ÉLŐ (futásidőben módosítható) rang-hangolás. Az Admin · BALANSZ lap állítja. */
export const RANK_TUNING: RankTuning = { ...DEFAULT_RANK_TUNING };

export const MAX_RANK = 100;

export type Band = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';

/** Érem-sávok határa (felső rang, bezárólag) + megjelenítési adat. */
export const BANDS: Array<{ band: Band; upTo: number; label: string; icon: string }> = [
  { band: 'bronze', upTo: 20, label: 'Bronze', icon: '🥉' },
  { band: 'silver', upTo: 40, label: 'Silver', icon: '🥈' },
  { band: 'gold', upTo: 60, label: 'Gold', icon: '🥇' },
  { band: 'platinum', upTo: 80, label: 'Platinum', icon: '💠' },
  { band: 'diamond', upTo: 99, label: 'Diamond', icon: '💎' },
  { band: 'legend', upTo: 100, label: 'Legend', icon: '🏆' },
];

/** Tematikus rang-nevek; minden név egy 10-es rang-sávot fed (a 100. egyedi). */
const RANK_NAMES = [
  'Cellar Dweller', // 1–10
  'Rat Slayer', // 11–20
  'Hollow Delver', // 21–30
  'Deepwalker', // 31–40
  'Shadow Hunter', // 41–50
  'Bone Collector', // 51–60
  'Dread Hunter', // 61–70
  'Hellwalker', // 71–80
  'Lord of the Depths', // 81–99
];
const LEGEND_NAME = 'Legend of the Cellar'; // rang 100
const ROOKIE_NAME = 'Rookie'; // rang 0 (még nincs rang)

/**
 * küszöb(n) = round( anchor × (growth^n − 1) / (growth − 1) ) — mértani összeg.
 * n=0 → 0; n=1 → anchor; n=2 ≈ 2× anchor; … monoton nő.
 */
export function scoreForRank(n: number): number {
  if (n <= 0) return 0;
  const { growth, anchor } = RANK_TUNING;
  // growth ≈ 1 → a mértani összeg lineárisra egyszerűsödik (0-osztás elkerülése)
  if (growth <= 1.0001) return Math.round(anchor * n);
  return Math.round((anchor * (Math.pow(growth, n) - 1)) / (growth - 1));
}

/** Az összesített pontból a legmagasabb elért rang (0..MAX_RANK). */
export function rankForScore(total: number): number {
  if (total < scoreForRank(1)) return 0;
  // a görbe monoton; bináris keresés a legnagyobb n-re, amire küszöb(n) ≤ total
  let lo = 1;
  let hi = MAX_RANK;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (scoreForRank(mid) <= total) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function bandForRank(n: number): Band {
  for (const b of BANDS) if (n <= b.upTo) return b.band;
  return 'legend';
}

export function bandInfo(band: Band): { label: string; icon: string } {
  const found = BANDS.find((b) => b.band === band)!;
  return { label: found.label, icon: found.icon };
}

export function rankName(n: number): string {
  const en =
    n <= 0 ? ROOKIE_NAME
    : n >= MAX_RANK ? LEGEND_NAME
    : RANK_NAMES[Math.min(RANK_NAMES.length - 1, Math.floor((n - 1) / 10))]!;
  return tc(en, `rank.name.${en}`);
}

export interface RankInfo {
  rank: number; // 0..100
  name: string; // tematikus név
  band: Band;
  threshold: number; // a JELENLEGI rang küszöbe (rang 0 → 0)
  nextThreshold: number; // a KÖVETKEZŐ rang küszöbe (rang 100 → önmaga)
  progress: number; // 0..1 a következő rangig (rang 100 → 1)
}

export function rankInfo(total: number): RankInfo {
  const rank = rankForScore(total);
  const threshold = scoreForRank(rank);
  const atMax = rank >= MAX_RANK;
  const nextThreshold = atMax ? threshold : scoreForRank(rank + 1);
  const span = nextThreshold - threshold;
  const progress = atMax || span <= 0 ? 1 : (total - threshold) / span;
  return {
    rank,
    name: rankName(rank),
    band: bandForRank(rank),
    threshold,
    nextThreshold,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

// ---------------------------------------------------------------------------
// Perzisztencia (localStorage; online-ra bővíthetőre tervezve)
// ---------------------------------------------------------------------------

const PROFILE_KEY = 'sentex_profile';
const PROGRESS_KEY = 'sentex_progress';
const LEADERBOARD_KEY = 'sentex_leaderboard';
const LEGACY_BEST_KEY = 'sentex_pince_best'; // a régi „legmélyebb szint" rekord
export const LEADERBOARD_MAX = 20;

export interface Profile {
  name: string;
}

export interface Progress {
  totalScore: number; // az összes futás pontja összeadva → ez hajtja a rangot
  rank: number; // gyorsítótár (totalScore-ból)
  bestFloor: number; // a meglévő „legmélyebb szint" ide olvad
}

export interface RunResult {
  name: string;
  score: number;
  floor: number;
  rank: number;
  date: number; // epoch ms
  time?: number; // a futás hossza mp-ben (régi mentésekből hiányozhat)
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    return typeof p.name === 'string' && p.name.trim() ? { name: p.name } : null;
  } catch {
    return null;
  }
}

export function saveProfile(name: string): Profile {
  const profile: Profile = { name: sanitizeName(name) };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

/** Karakternév-szabály (egyetlen forrás): CSAK angol betű + szám — ékezet,
 *  szóköz és írásjel kiszűrve —, max 12 karakter; üresre tisztulva „Névtelen". */
export const NAME_MAX_LEN = 12;
/** A név-szabály FALLBACK NÉLKÜL (élő gépelés-szűréshez is): csak angol betű +
 *  szám, max NAME_MAX_LEN. Üres bemenet → üres (nem „Névtelen"). */
export function stripName(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, NAME_MAX_LEN);
}
export function sanitizeName(name: string): string {
  return stripName(name) || 'Unnamed';
}

/**
 * Véletlen 12 karakteres vendég-név (betű + szám), ha a játékos kihagyja a
 * névadást. Az összetéveszthető karaktereket (0/O/1/I/L) kihagyjuk; az első
 * karakter betű, az utolsó szám → garantáltan vegyes, és illeszkedik a
 * sanitizeName szabályára.
 */
export function randomGuestName(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string): string => set[Math.floor(Math.random() * set.length)]!;
  let out = pick(letters);
  for (let i = 1; i < NAME_MAX_LEN - 1; i++) out += pick(all);
  return out + pick(digits);
}

export function loadProgress(): Progress {
  const p = readJSON<Progress>(PROGRESS_KEY, { totalScore: 0, rank: 0, bestFloor: 0 });
  // Egyszeri migráció: a régi „legmélyebb szint" rekordot beolvasztjuk.
  const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY) ?? '0') || 0;
  if (legacy > p.bestFloor) p.bestFloor = legacy;
  p.rank = rankForScore(p.totalScore);
  return p;
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function loadLeaderboard(): RunResult[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as RunResult[]) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(list: RunResult[]): void {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
}

/** Az összesített pont, rang, legmélyebb szint ÉS a ranglista törlése (a profil-név megmarad). */
export function resetAllProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(LEADERBOARD_KEY);
  localStorage.removeItem(LEGACY_BEST_KEY);
}

/**
 * Egy futás eredményét beilleszti a ranglistába (pont szerint csökkenő), a top
 * `LEADERBOARD_MAX`-ot megtartva. Visszaadja a frissített listát és a helyezést
 * (1-alapú; 0 = nem fért be).
 */
export function recordRun(run: RunResult): { list: RunResult[]; place: number } {
  const list = loadLeaderboard();
  list.push(run);
  list.sort((a, b) => b.score - a.score || b.floor - a.floor || a.date - b.date);
  const trimmed = list.slice(0, LEADERBOARD_MAX);
  saveLeaderboard(trimmed);
  const idx = trimmed.indexOf(run);
  return { list: trimmed, place: idx < 0 ? 0 : idx + 1 };
}

/** A futás végén: pont hozzáadása az összesítetthez + rang/legmélyebb frissítés. */
export interface FinishOutcome {
  progress: Progress;
  prevRank: number;
  rankedUp: boolean;
  place: number; // ranglista-helyezés (0 = nem fért be)
}

export function finishRun(name: string, score: number, floor: number, time = 0): FinishOutcome {
  const progress = loadProgress();
  const prevRank = progress.rank;
  progress.totalScore += Math.max(0, Math.round(score));
  progress.rank = rankForScore(progress.totalScore);
  if (floor > progress.bestFloor) progress.bestFloor = floor;
  saveProgress(progress);
  const { place } = recordRun({ name, score, floor, rank: progress.rank, date: Date.now(), time });
  return { progress, prevRank, rankedUp: progress.rank > prevRank, place };
}

// ---------------------------------------------------------------------------
// Rang-küszöb hangolás perzisztenciája (admin · BALANSZ → „Rangok" szekció)
// ---------------------------------------------------------------------------

const RANK_TUNING_KEY = 'sentex_rank_tuning';

export function resetRankTuning(): void {
  Object.assign(RANK_TUNING, DEFAULT_RANK_TUNING);
}

export function saveRankTuning(): void {
  try {
    localStorage.setItem(RANK_TUNING_KEY, JSON.stringify(RANK_TUNING));
  } catch {
    /* localStorage nem elérhető — csendben kihagyjuk */
  }
}

export function loadRankTuning(): void {
  try {
    const raw = localStorage.getItem(RANK_TUNING_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<RankTuning>;
    for (const k of Object.keys(RANK_TUNING) as (keyof RankTuning)[]) {
      const v = data[k];
      if (typeof v === 'number' && Number.isFinite(v)) RANK_TUNING[k] = v;
    }
  } catch {
    /* hibás mentés — alapértékkel indulunk */
  }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin átírja a DEFAULT_RANK_TUNING-ot. */
export async function saveRankTuningToFile(): Promise<string> {
  saveRankTuning();
  try {
    const res = await fetch('/__save-ranks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankTuning: RANK_TUNING }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (progression.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

// Modul betöltésekor visszaolvassuk a mentett rang-küszöböket.
loadRankTuning();
