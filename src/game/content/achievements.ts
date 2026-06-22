/**
 * Teljesítmények (Ú3 / #52-farok) - a MEGLÉVŐ élethosszig-statokból és rekordokból
 * kiértékelt elismerések, ÚJ követés nélkül. A futás végén kiértékelődnek és
 * perzisztálódnak; a RANGLISTA-képernyő egy szekciója mutatja őket. Egy
 * teljesítmény (`trialmaster`) felold egy 5. titkos vándort (#53) - valódi
 * „feloldás", additívan (a 4 meglévő vándor marad).
 */

import { loadStats, loadRecords } from '../stats';
import { loadProgress } from '../progression';
import { loadBestiary } from '../bestiary';
import { loadClearedChallenges } from './challenges';

/** Minden adat, ami egy teljesítmény kiértékeléséhez kell (meglévő forrásokból). */
export interface AchieveCtx {
  kills: number;
  bossKills: number;
  bestFloor: number;
  longestRun: number;
  coins: number;
  labsCleared: number;
  bestScore: number;
  bestiaryCount: number;
  challengesCleared: number;
}

export interface AchievementDef {
  id: string;
  /** Procedurális ikon-glyph (emoji-mentes, a renderer rajzolja id szerint). */
  tier: 'bronze' | 'silver' | 'gold';
  check: (c: AchieveCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', tier: 'bronze', check: (c) => c.kills >= 1 },
  { id: 'veteran', tier: 'silver', check: (c) => c.kills >= 1000 },
  { id: 'exterminator', tier: 'gold', check: (c) => c.kills >= 5000 },
  { id: 'boss_slayer', tier: 'silver', check: (c) => c.bossKills >= 25 },
  { id: 'descent10', tier: 'bronze', check: (c) => c.bestFloor >= 10 },
  { id: 'descent20', tier: 'gold', check: (c) => c.bestFloor >= 20 },
  { id: 'endurance', tier: 'silver', check: (c) => c.longestRun >= 600 },
  { id: 'hoarder', tier: 'silver', check: (c) => c.coins >= 10000 },
  { id: 'scholar', tier: 'bronze', check: (c) => c.bestiaryCount >= 25 },
  { id: 'naturalist', tier: 'gold', check: (c) => c.bestiaryCount >= 50 },
  { id: 'labyrinth_runner', tier: 'silver', check: (c) => c.labsCleared >= 3 },
  { id: 'challenger', tier: 'bronze', check: (c) => c.challengesCleared >= 1 },
  { id: 'trialmaster', tier: 'gold', check: (c) => c.challengesCleared >= 4 },
  { id: 'high_roller', tier: 'silver', check: (c) => c.bestScore >= 50000 },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Az 5. vándort feloldó teljesítmény (#53 reward). */
export const REWARD_ACHIEVEMENT = 'trialmaster';

const KEY = 'sentex_achievements';

/** A meglévő forrásokból összerakott kiértékelő-kontextus. */
export function buildAchieveCtx(): AchieveCtx {
  const s = loadStats();
  const r = loadRecords();
  const p = loadProgress();
  return {
    kills: s.kills,
    bossKills: s.bossKills,
    bestFloor: p.bestFloor,
    longestRun: r.longestRun,
    coins: s.coins,
    labsCleared: s.labsCleared,
    bestScore: r.bestScore,
    bestiaryCount: loadBestiary().size,
    challengesCleared: loadClearedChallenges().size,
  };
}

/** A feloldott teljesítmények id-halmaza. */
export function loadAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* localStorage nem elérhető / sérült */ }
  return new Set();
}

function saveAchievements(set: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

/**
 * Kiértékeli az összes teljesítményt a jelenlegi adatok ellen, perzisztálja az
 * újakat, és visszaadja a MOST feloldottak id-listáját (a game-over értesítéshez).
 */
export function evaluateAchievements(): string[] {
  const ctx = buildAchieveCtx();
  const have = loadAchievements();
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.id) && a.check(ctx)) { have.add(a.id); fresh.push(a.id); }
  }
  if (fresh.length) saveAchievements(have);
  return fresh;
}

/** Igaz, ha az adott teljesítmény fel van oldva (pl. a vándor-feloldáshoz). */
export function hasAchievement(id: string): boolean {
  return loadAchievements().has(id);
}
