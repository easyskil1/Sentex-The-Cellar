/**
 * PERK-KONFIG (adat-alapú, futásidőben szerkeszthető)
 *
 * A perkek (passzív, halmozható itemek) HATÁSAIT és MEGJELENÉSI ESÉLYÉT itt
 * tároljuk adatként — így az Admin · PERK lap élőben állíthatja, és fájlba is
 * menthet. A kinézet (szín/alak/minta) az `items.ts`-ben marad, azt itt nem
 * szerkesztjük.
 *
 *   - stats:  a perk passzív hatása (additív/szorzó/kapcsoló mezők). A `name`
 *             kulcs az item NEVE (items.ts `name`).
 *   - weight: megjelenési esély-súly a boltban és az ingyenes pedesztálon
 *             (1 = alap; 0 = sosem jön elő; 2 = kétszer akkora eséllyel).
 *
 * Az ÁR az erő-pontból (itemPower) számítódik (lásd shopPricing), ezért itt
 * nincs külön ár-mező.
 */
import type { Player } from '../entities/Player';
import { clamp } from '../../engine/math';
import { HP } from '../config';

/** Egy perk passzív hatás-mezői (mind opcionális; csak amit a perk módosít). */
export interface PerkStats {
  /** Sebzés (+, additív). */
  dmg?: number;
  /** Mozgássebesség (+, additív). */
  speed?: number;
  /** Lövedék-tempó (+, additív). */
  shotSpeed?: number;
  /** Lőtáv = lövedék-élettartam (+, additív). */
  range?: number;
  /** Tűzgyorsaság (×, szorzó; <1 = gyorsabb tűz). */
  fireRateMul?: number;
  /** Szerencse (+, additív). */
  luck?: number;
  /** Max életerő fél-szívekben (+, additív; felvételkor teljes feltöltés). */
  maxHp?: number;
  /** Látótáv (+/−, additív; [0.35, 1] közé klampolva). */
  sightAdd?: number;
  /** Dupla lövés (kapcsoló). */
  doubleShot?: boolean;
  /** Plusz egyidejű lövedék a legyezőben (+, additív). */
  shots?: number;
  /** Legyező teljes szórás-szöge radiánban (+, additív). */
  spread?: number;
  /** Lőtáv-szorzó (×, multiplikatív; <1 rövidít). */
  rangeMul?: number;
  /** Átütő lövedék: átmegy az ellenfélen (kapcsoló). */
  pierce?: boolean;
  /** Falról pattanó lövedék (kapcsoló). */
  bounce?: boolean;
  /** Célkövető lövedék (kapcsoló). */
  homing?: boolean;
  /** Szellem lövedék: átrepül a köveken (kapcsoló). */
  spectral?: boolean;
  /** Hasadó lövedék: találatkor szilánkokra esik (kapcsoló). */
  split?: boolean;
  /** Lökő lövedék: ellöki az ellenfelet (kapcsoló). */
  knockback?: boolean;
  /** Égő DoT a találatra (kapcsoló). */
  burn?: boolean;
  /** Mérgező DoT a találatra (kapcsoló). */
  poison?: boolean;
  /** Lefagyasztja (lassítja) a célt (kapcsoló). */
  freeze?: boolean;
  /** Lánc-villám a közeli ellenfelekre (kapcsoló). */
  shock?: boolean;
  /** Keringő sebző orb-kísérő (kapcsoló; +1 orb). */
  orbital?: boolean;
  /** Blokkoló légy: elnyeli a közeli ellenséges lövedékeket (kapcsoló). */
  shieldFly?: boolean;
}

/** GYÁRI hatás-értékek perkenként (a fájlmentő ezt írja át). */
export const DEFAULT_PERK_STATS: Record<string, PerkStats> = {
  'Sharp Tear': { dmg: 160 },
  'Spider Leg': { speed: 42 },
  'Rainstone': { fireRateMul: 0.78 },
  'Spyglass': { range: 0.45 },
  'Flywheel': { shotSpeed: 130 },
  'Twin Drop': { doubleShot: true },
  'Blood Heart': { maxHp: 2 },
  'Horseshoe': { luck: 2 },
  'Lantern': { sightAdd: 0.2 },
  'Dark Veil': { sightAdd: -0.2, dmg: 200 },
  'War Mark': { dmg: 260 },
  'Winged Sandal': { speed: 60 },

  // --- Lövés-perkek (Wave 1: lövés-rendszer) ---
  'Triple Tear': { shots: 2, spread: 0.5, rangeMul: 0.7 },
  'Buckshot Eye': { shots: 4, spread: 0.95, rangeMul: 0.5, fireRateMul: 1.2 },
  'Needle Point': { pierce: true },
  'Rubber Wall': { bounce: true },
  "Hunter's Eye": { homing: true },
  'Ghost Tear': { spectral: true },
  'Shrapnel Drop': { split: true },
  'Knockback Tear': { knockback: true, dmg: 50 },

  // --- Elemi könnyek (Wave 2: státusz-rendszer) ---
  'Ember Tear': { burn: true },
  'Venom Drop': { poison: true },
  'Frost Shard': { freeze: true },
  'Lightning Eye': { shock: true },

  // --- Kísérők (Wave 4: familiar-rendszer) ---
  'Moonstone': { orbital: true },
  'Guardian Fly': { shieldFly: true },
};

/** GYÁRI megjelenési esély-súlyok (alap 1). */
export const DEFAULT_PERK_WEIGHT: Record<string, number> = {
  'Sharp Tear': 1,
  'Spider Leg': 1,
  'Rainstone': 1,
  'Spyglass': 1,
  'Flywheel': 1,
  'Twin Drop': 1,
  'Blood Heart': 1,
  'Horseshoe': 1,
  'Lantern': 1,
  'Dark Veil': 1,
  'War Mark': 1,
  'Winged Sandal': 1,
  'Triple Tear': 1,
  'Buckshot Eye': 1,
  'Needle Point': 1,
  'Rubber Wall': 1,
  "Hunter's Eye": 1,
  'Ghost Tear': 1,
  'Shrapnel Drop': 1,
  'Knockback Tear': 1,
  'Ember Tear': 1,
  'Venom Drop': 1,
  'Frost Shard': 1,
  'Lightning Eye': 1,
  'Moonstone': 1,
  'Guardian Fly': 1,
};

/** Az ÉLŐ (szerkeszthető) másolatok. */
export const PERK_STATS: Record<string, PerkStats> = clonePerkStats(DEFAULT_PERK_STATS);
export const PERK_WEIGHT: Record<string, number> = { ...DEFAULT_PERK_WEIGHT };

function clonePerkStats(src: Record<string, PerkStats>): Record<string, PerkStats> {
  const out: Record<string, PerkStats> = {};
  for (const [k, v] of Object.entries(src)) out[k] = { ...v };
  return out;
}

/** Egy perk élő hatás-mezői (ismeretlenre üres). */
export function perkStats(name: string): PerkStats {
  return PERK_STATS[name] ?? {};
}

/** Egy perk megjelenési súlya (ismeretlenre 1). */
export function perkWeight(name: string): number {
  const w = PERK_WEIGHT[name];
  return typeof w === 'number' && w >= 0 ? w : 1;
}

/** Egy perk passzív hatásának alkalmazása a játékosra (az élő értékekből). */
export function applyPerk(p: Player, name: string): void {
  const s = perkStats(name);
  if (s.dmg) p.dmg += s.dmg;
  if (s.speed) p.speed += s.speed;
  if (s.shotSpeed) p.shotSpeed += s.shotSpeed;
  if (s.range) p.range += s.range;
  if (s.fireRateMul) p.fireRate *= s.fireRateMul;
  if (s.luck) p.luck += s.luck;
  if (s.maxHp) { p.maxHp += s.maxHp * HP.half; p.hp = p.maxHp; } // s.maxHp fél-szívben
  if (s.sightAdd) p.sight = clamp(p.sight + s.sightAdd, 0.35, 1.2); // 1.2 = a +látótáv tartalék-plafonja (1 fölött ugyanannyit látsz)
  if (s.doubleShot) p.doubleShot = true;
  if (s.shots) p.shots += s.shots;
  if (s.spread) p.spread += s.spread;
  if (s.rangeMul) p.rangeMul *= s.rangeMul;
  if (s.pierce) p.pierce = true;
  if (s.bounce) p.bounce = true;
  if (s.homing) p.homing = true;
  if (s.spectral) p.spectral = true;
  if (s.split) p.split = true;
  if (s.knockback) p.tearKnock = true;
  if (s.burn) p.burn = true;
  if (s.poison) p.poison = true;
  if (s.freeze) p.freeze = true;
  if (s.shock) p.shock = true;
  if (s.orbital) p.orbitals += 1;
  if (s.shieldFly) p.shieldFly = true;
}

export function resetPerkConfig(): void {
  for (const k of Object.keys(PERK_STATS)) delete PERK_STATS[k];
  Object.assign(PERK_STATS, clonePerkStats(DEFAULT_PERK_STATS));
  for (const k of Object.keys(PERK_WEIGHT)) delete PERK_WEIGHT[k];
  Object.assign(PERK_WEIGHT, DEFAULT_PERK_WEIGHT);
}

// ---- Tartós mentés (localStorage) ----
const STORAGE_KEY = 'sentex_perks';

export function savePerkConfig(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats: PERK_STATS, weight: PERK_WEIGHT }));
  } catch {
    /* localStorage nem elérhető */
  }
}

export function loadPerkConfig(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { stats?: Record<string, PerkStats>; weight?: Record<string, number> };
    if (data.stats) {
      for (const [k, v] of Object.entries(data.stats)) {
        if (k in PERK_STATS && v && typeof v === 'object') PERK_STATS[k] = { ...v };
      }
    }
    if (data.weight) {
      for (const [k, v] of Object.entries(data.weight)) {
        if (k in PERK_WEIGHT && typeof v === 'number' && Number.isFinite(v) && v >= 0) PERK_WEIGHT[k] = v;
      }
    }
  } catch {
    /* hibás mentés — alapértékkel indulunk */
  }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin átírja a DEFAULT_PERK_* blokkokat. */
export async function savePerkConfigToFile(): Promise<string> {
  savePerkConfig();
  try {
    const res = await fetch('/__save-perks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: PERK_STATS, weight: PERK_WEIGHT }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (perkConfig.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

loadPerkConfig();
