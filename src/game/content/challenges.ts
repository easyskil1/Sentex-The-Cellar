/**
 * Kihívás-módok (#51) - fix, korlátozott kampány-futások a HUB Kihívás-obeliszkjéről.
 * Mind RESTRIKCIÓ (nehezebb futás), NEM erő: a meglévő rendszerekre húzva (player-stat
 * a newGame-ben + 1 contained spawn-horog), pont-szorzóval jutalmazva. A választott
 * vándor (#53) is érvényes a kihívás-futásban.
 *
 * SZERKESZTHETŐ (dev): a stat-mezőket az Admin · PRÓBA lap élőben hangolja és fájlba
 * menti. A gyári defek (`DEFAULT_CHALLENGES`) érintetlenek; az eltérők a
 * `challengeOverrides.ts`-be (fájl) + localStorage-ba (élő) kerülnek. Az `id` NEM
 * szerkeszthető.
 */
import { CHALLENGE_OVERRIDES } from './challengeOverrides';

export interface ChallengeDef {
  id: string;
  accent: string;
  /** Pont-szorzó a futás végén (a nehezítés jutalma). */
  scoreMul: number;
  /** Max-HP szívekben (alap 3). */
  maxHpHearts?: number;
  dmgMul?: number;       // sebzés-szorzó
  fireRateMul?: number;  // tűz-köz szorzó (>1 = ritkább)
  sightMul?: number;     // látótáv-szorzó (<1 = sötétebb)
  /** Extra kezdő-erő-pont → a difficulty keményebb ellenfeleket ad (meglévő úton). */
  extraStartPower?: number;
  /** Extra ellenfél normál szobánként (plafonos, perf-védett). */
  enemyExtra?: number;
}

/** A szerkeszthető (admin) mezők - az `id` szerkezeti, kimarad. */
export type ChalEdit = Pick<ChallengeDef,
  'accent' | 'scoreMul' | 'maxHpHearts' | 'dmgMul' | 'fireRateMul' |
  'sightMul' | 'extraStartPower' | 'enemyExtra'>;

/** A szerkeszthető kulcsok (a diff + apply + reset ezeken iterál). */
export const CHAL_EDIT_KEYS: ReadonlyArray<keyof ChalEdit> = [
  'accent', 'scoreMul', 'maxHpHearts', 'dmgMul', 'fireRateMul',
  'sightMul', 'extraStartPower', 'enemyExtra',
];

/** GYÁRI kihívás-defek (a fájlmentő ezeket NEM írja - csak az eltérők mennek override-ba). */
const DEFAULT_CHALLENGES: readonly ChallengeDef[] = [
  // 1 szív, de +70% sebzés - minden találat majdnem végzetes.
  { id: 'glass', accent: '#ff5a6a', scoreMul: 1.6, maxHpHearts: 1, dmgMul: 1.7 },
  // Fél látótáv - a szobák sötétek, a veszély későn látszik.
  { id: 'dark', accent: '#6a7bd8', scoreMul: 1.4, sightMul: 0.5 },
  // Több ellenfél minden harci szobában (zsúfolt, kaotikus).
  { id: 'horde', accent: '#e0823a', scoreMul: 1.6, enemyExtra: 3 },
  // Keményebb ellenfelek (a difficulty-erő megemelve), lassabb tűz.
  { id: 'elite', accent: '#b06ad8', scoreMul: 1.7, extraStartPower: 18, fireRateMul: 1.15 },
];

/** Az ÉLŐ (szerkeszthető) kihívások - a defek mély-másolatából. */
export const CHALLENGES: ChallengeDef[] = DEFAULT_CHALLENGES.map((c) => ({ ...c }));

export const CHALLENGE_BY_ID: Record<string, ChallengeDef> =
  Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

const DEFAULT_BY_ID: Record<string, ChallengeDef> =
  Object.fromEntries(DEFAULT_CHALLENGES.map((c) => [c.id, c]));

const KEY = 'sentex_challenges';

/** A teljesített kihívások id-halmaza (a választón ✓-vel jelölve). */
export function loadClearedChallenges(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* localStorage nem elérhető / sérült */ }
  return new Set();
}

/** Egy kihívás teljesítésének rögzítése (győzelemkor). */
export function markChallengeCleared(id: string): void {
  try {
    if (!CHALLENGE_BY_ID[id]) return;
    const set = loadClearedChallenges();
    set.add(id);
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

// ---- Szerkeszthető stat-overlay (Admin · PRÓBA) ----

const rec = (o: object): Record<string, unknown> => o as Record<string, unknown>;

/** Egy szerkesztés alkalmazása egy kihívásra: üres/undefined kulcs törli az opcionális mezőt. */
function applyEdit(c: ChallengeDef, edit: Partial<ChalEdit>): void {
  for (const k of CHAL_EDIT_KEYS) {
    if (!(k in edit)) continue;
    const v = edit[k];
    if (v === undefined || v === null || v === '') {
      if (k !== 'scoreMul' && k !== 'accent') delete rec(c)[k]; // a kötelezőket nem töröljük
    } else {
      rec(c)[k] = v;
    }
  }
}

/** Egy kihívás visszaállítása a gyári defre. */
function resetChal(c: ChallengeDef): void {
  const def = DEFAULT_BY_ID[c.id];
  if (!def) return;
  for (const k of CHAL_EDIT_KEYS) {
    if (k in def) rec(c)[k] = rec(def)[k];
    else delete rec(c)[k];
  }
}

/** A gyári deftől eltérő szerkeszthető mezők kihívásonként (a mentés ezt írja). */
export function challengeDiff(): Record<string, Partial<ChalEdit>> {
  const out: Record<string, Partial<ChalEdit>> = {};
  for (const c of CHALLENGES) {
    const def = DEFAULT_BY_ID[c.id];
    if (!def) continue;
    const e: Partial<ChalEdit> = {};
    for (const k of CHAL_EDIT_KEYS) {
      const live = rec(c)[k];
      const base = rec(def)[k];
      if (live !== base) rec(e)[k] = live;
    }
    if (Object.keys(e).length) out[c.id] = e;
  }
  return out;
}

export function resetChallengeConfig(): void {
  for (const c of CHALLENGES) resetChal(c);
}

// ---- Tartós mentés ----
const CONFIG_KEY = 'sentex_challenge_cfg';

export function saveChallengeConfig(): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(challengeDiff())); } catch { /* ignore */ }
}

export function loadChallengeConfig(): void {
  for (const c of CHALLENGES) resetChal(c);
  for (const [id, e] of Object.entries(CHALLENGE_OVERRIDES)) {
    const c = CHALLENGE_BY_ID[id];
    if (c && e) applyEdit(c, e);
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, Partial<ChalEdit>>;
      for (const [id, e] of Object.entries(data)) {
        const c = CHALLENGE_BY_ID[id];
        if (c && e && typeof e === 'object') applyEdit(c, e);
      }
    }
  } catch { /* hibás mentés - a fájl-override marad érvényben */ }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin újraírja a `challengeOverrides.ts`-t. */
export async function saveChallengeConfigToFile(): Promise<string> {
  saveChallengeConfig();
  try {
    const res = await fetch('/__save-challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(challengeDiff()),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (challengeOverrides.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

loadChallengeConfig();
