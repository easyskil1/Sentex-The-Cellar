/**
 * Pince-vándorok (#53) - választható kezdő-karakterek a HUB-bázison. Mind a
 * MEGLÉVŐ rendszerekből áll össze (kezdő-stat-módosító + meglévő skill + max 1
 * elemi flag/fiola + saját könny-szín), ÚJ tartalom nélkül.
 *
 * BALANSZ (anti-OP): minden vándor SIDEGRADE - egy téren erősebb, máson gyengébb,
 * a nettó kezdő-erő ~azonos. A `startPower` a `difficulty.playerPower`-be folyik,
 * így egy „erősebb" start nem ingyen (az ellenfelek skálázódnak rá). Lőmód-relikviát
 * (sugár/gyűrű/kúp/töltés) SZÁNDÉKOSAN nem ad egyik sem.
 *
 * SZERKESZTHETŐ (dev): a stat-mezőket az Admin · VÁNDOR lap élőben hangolja és
 * fájlba menti. A gyári defek (`DEFAULT_CHARACTERS`) érintetlenek; az eltérők a
 * `characterOverrides.ts`-be (fájl) + localStorage-ba (élő) kerülnek. A SZERKEZETI
 * mezők (`id`, `unlockAchievement`) NEM szerkeszthetők.
 */

/** Egy választható kezdő-karakter definíciója. A stat-mezők szorzók (1 = alap). */
import { hasAchievement } from './achievements';
import { CHARACTER_OVERRIDES } from './characterOverrides';

export interface CharacterDef {
  id: string;
  /** Vizuál-accent (választó-kártya + jelölés). */
  accent: string;
  /** Ha meg van adva, a vándor zárva van, amíg ez a teljesítmény fel nem oldódik. */
  unlockAchievement?: string;
  /** A vándor signature könny-színe (a Player baseLook-jába kerül → látszik a játékban). */
  tearColor?: string;
  dmgMul?: number;       // sebzés-szorzó
  speedMul?: number;     // mozgás-szorzó
  fireRateMul?: number;  // tűz-köz szorzó (>1 = RITKÁBB tűz, <1 = gyorsabb)
  maxHpHearts?: number;  // max-HP szívekben (alap 3)
  skillId?: string;      // induló aktív skill (alap 'nova')
  startBurn?: boolean;   // induló burn elemi flag
  startFiolas?: number;  // induló fiola-darab a zsebben
  /** A kezdő-eltérés erő-pontja (a nehézségbe számít; sidegrade → kicsi). */
  startPower: number;
}

/** A szerkeszthető (admin) mezők - a szerkezetiek (id/unlockAchievement) kimaradnak. */
export type CharEdit = Pick<CharacterDef,
  'accent' | 'tearColor' | 'dmgMul' | 'speedMul' | 'fireRateMul' |
  'maxHpHearts' | 'skillId' | 'startBurn' | 'startFiolas' | 'startPower'>;

/** A szerkeszthető kulcsok (a diff + apply + reset ezeken iterál). */
export const CHAR_EDIT_KEYS: ReadonlyArray<keyof CharEdit> = [
  'accent', 'tearColor', 'dmgMul', 'speedMul', 'fireRateMul',
  'maxHpHearts', 'skillId', 'startBurn', 'startFiolas', 'startPower',
];

/** GYÁRI vándor-defek (a fájlmentő ezeket NEM írja - csak az eltérők mennek override-ba). */
const DEFAULT_CHARACTERS: readonly CharacterDef[] = [
  // A baseline - a jelenlegi alap-start (semmi eltérés).
  { id: 'zarandok', accent: '#cdbb9a', startPower: 0 },
  // Lassú, ütős: több sebzés, kevesebb tempó + tűzgyorsaság.
  {
    id: 'meszaros', accent: '#ff6b4a', tearColor: '#ff6b4a',
    dmgMul: 1.35, speedMul: 0.85, fireRateMul: 1.18, startPower: 2,
  },
  // Fürge, gyors tűz: kevesebb sebzés, +sebesség/+tűzgyorsaság, 1 kezdő-fiola, Ugrás.
  {
    id: 'surrano', accent: '#6be0ff', tearColor: '#6be0ff',
    dmgMul: 0.8, speedMul: 1.18, fireRateMul: 0.82, startFiolas: 1, skillId: 'blink', startPower: 2,
  },
  // Magas kockázat/jutalom: 2 szív, de induló burn + Gyógyír skill.
  {
    id: 'eretnek', accent: '#ffae5c', tearColor: '#ffae5c',
    maxHpHearts: 2, startBurn: true, skillId: 'heal', startPower: 3,
  },
  // TITKOS (feloldás: mind a 4 próba teljesítve, `trialmaster`): fürge, égő
  // portyázó - gyors tűz + sebesség, de gyenge lövés; induló burn, Időlassítás.
  {
    id: 'elatkozott', accent: '#b06ad8', tearColor: '#c97bff',
    dmgMul: 0.7, speedMul: 1.1, fireRateMul: 0.7, startBurn: true, skillId: 'slow',
    startPower: 3, unlockAchievement: 'trialmaster',
  },
];

/** Az ÉLŐ (szerkeszthető) vándorok - a defek mély-másolatából (a stat-overlay ezeket mozgatja). */
export const CHARACTERS: CharacterDef[] = DEFAULT_CHARACTERS.map((c) => ({ ...c }));

export const CHARACTER_BY_ID: Record<string, CharacterDef> =
  Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

const DEFAULT_BY_ID: Record<string, CharacterDef> =
  Object.fromEntries(DEFAULT_CHARACTERS.map((c) => [c.id, c]));

/** Igaz, ha a vándor választható (nincs feloldás-feltétele, vagy az teljesült). */
export function isCharacterUnlocked(c: CharacterDef): boolean {
  return !c.unlockAchievement || hasAchievement(c.unlockAchievement);
}

const KEY = 'sentex_character';

/** A kiválasztott vándor id-je (perzisztens); ismeretlen/hiányzó → az első (Zarándok). */
export function loadCharacterId(): string {
  try {
    const id = localStorage.getItem(KEY);
    if (id && CHARACTER_BY_ID[id]) return id;
  } catch { /* localStorage nem elérhető */ }
  return CHARACTERS[0]!.id;
}

/** A kiválasztott vándor mentése. */
export function saveCharacterId(id: string): void {
  try { if (CHARACTER_BY_ID[id]) localStorage.setItem(KEY, id); } catch { /* ignore */ }
}

// ---- Szerkeszthető stat-overlay (Admin · VÁNDOR) ----

/** Indexelhető nézet egy def-objektumra (a heterogén mezők dinamikus eléréséhez). */
const rec = (o: object): Record<string, unknown> => o as Record<string, unknown>;

/** Egy szerkesztés (edit) alkalmazása egy vándorra: üres/undefined kulcs törli a mezőt. */
function applyEdit(c: CharacterDef, edit: Partial<CharEdit>): void {
  for (const k of CHAR_EDIT_KEYS) {
    if (!(k in edit)) continue;
    const v = edit[k];
    if (v === undefined || v === null || v === '') {
      if (k !== 'startPower' && k !== 'accent') delete rec(c)[k]; // a kötelezőket nem töröljük
    } else {
      rec(c)[k] = v;
    }
  }
}

/** Egy vándor visszaállítása a gyári defre (a nem-def szerkeszthető kulcsok törlésével). */
function resetChar(c: CharacterDef): void {
  const def = DEFAULT_BY_ID[c.id];
  if (!def) return;
  for (const k of CHAR_EDIT_KEYS) {
    if (k in def) rec(c)[k] = rec(def)[k];
    else delete rec(c)[k];
  }
}

/** A gyári deftől eltérő szerkeszthető mezők vándoronként (a mentés ezt írja). */
export function characterDiff(): Record<string, Partial<CharEdit>> {
  const out: Record<string, Partial<CharEdit>> = {};
  for (const c of CHARACTERS) {
    const def = DEFAULT_BY_ID[c.id];
    if (!def) continue;
    const e: Partial<CharEdit> = {};
    for (const k of CHAR_EDIT_KEYS) {
      const live = rec(c)[k];
      const base = rec(def)[k];
      if (live !== base) rec(e)[k] = live;
    }
    if (Object.keys(e).length) out[c.id] = e;
  }
  return out;
}

export function resetCharacterConfig(): void {
  for (const c of CHARACTERS) resetChar(c);
}

// ---- Tartós mentés ----
const CONFIG_KEY = 'sentex_characters';

export function saveCharacterConfig(): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(characterDiff())); } catch { /* ignore */ }
}

export function loadCharacterConfig(): void {
  // gyári defekből indulunk, majd: (1) fájl-override, (2) localStorage-élő-szerkesztés
  for (const c of CHARACTERS) resetChar(c);
  for (const [id, e] of Object.entries(CHARACTER_OVERRIDES)) {
    const c = CHARACTER_BY_ID[id];
    if (c && e) applyEdit(c, e);
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, Partial<CharEdit>>;
      for (const [id, e] of Object.entries(data)) {
        const c = CHARACTER_BY_ID[id];
        if (c && e && typeof e === 'object') applyEdit(c, e);
      }
    }
  } catch { /* hibás mentés - a fájl-override marad érvényben */ }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin újraírja a `characterOverrides.ts`-t. */
export async function saveCharacterConfigToFile(): Promise<string> {
  saveCharacterConfig();
  try {
    const res = await fetch('/__save-characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterDiff()),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (characterOverrides.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

loadCharacterConfig();
