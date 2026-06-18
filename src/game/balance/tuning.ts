/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  BALANSZ – KÖZPONTI HANGOLÓ SZÁMOK                                     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Itt él MINDEN nehézség- és erő-varázsszám egy helyen. A játékélmény ettől
 * függ. Az Admin · BALANSZ lap élőben állítja ezeket (és fájlba is menthet).
 *
 * A rendszer szándékosan ADDITÍV (nem szorzódó), hogy kiszámítható és
 * karbantartható legyen:
 *
 *   ellenfél-erő = 1 + (szint-tag)  +  (játékos-erő tag)
 *
 * Mindkét tag lineáris és felülről korlátos (az itemek/pálya plafon miatt),
 * így a nehézség sosem "száll el".  Lásd: difficulty.ts
 */

export interface BalanceTuning {
  /** Globális ellenfél-HP alap-szorzó (az egész roszter HP-ját skálázza,
   *  a játékos kimenő sebzéséhez igazítva). 1.0 = nyers ENEMY_STATS HP. */
  enemyHpBase: number;
  /** Ellenfél HP-szorzó szintenkénti többlete (+10% = 0.10). */
  hpFloorSlope: number;
  /** Ellenfél HP-szorzó: minden item-erő-pont ennyit told (+1.2% = 0.012). */
  hpPowerFactor: number;
  /** GLOBÁLIS bejövő-sebzés szorzó szintenkénti többlete: minden szinttel ennyivel
   *  nő MINDEN nem-boss ellenfél sebzése (lövedék/érintés/talaj-veszély egyaránt).
   *  Lásd difficulty.ts → enemyDamageMul. (+12% = 0.12) */
  atkFloorSlope: number;
  /** A bejövő-sebzés szorzó felső plafonja (fél→teljes szív minta, de a
   *  mély szinteken sem szállhat el). */
  enemyDmgMaxMul: number;
  /** Klasszikus boss fix életereje. */
  bossClassicHp: number;
  /** Klasszikus boss körkörös lövedékeinek száma. */
  bossClassicProjectiles: number;
  /** Virág-boss fix életereje. */
  bossFlowerHp: number;
  /** Virág-boss „kert" fázis: a méreg/köd gyűrű foltjainak száma. */
  bossFlowerGarden: number;
  /** Virág-boss „spirál" fázis: az egyszerre kilőtt karok száma. */
  bossFlowerSpiralArms: number;
  /** Virág-boss „nova" fázis: a táguló tűzgyűrű foltjainak száma. */
  bossFlowerNova: number;
  /** Champion-variáns esélye spawn-onként (Wave 3). 0 = nincs champion. */
  championChance: number;
  /** Szerencse-állvány alap esélye (luck=0). */
  luckBase: number;
  /** Szerencse-állvány: +esély minden luck-pontonként. */
  luckPerLuck: number;
  /** Szerencse-állvány esély felső plafonja. */
  luckMax: number;
  /** Szoba-drop bónusz: +esély minden luck-pontonként, hogy egy kipucolt szobában
   *  essen valami (a dropConfig nettói FÖLÉ adódik). */
  luckRoomDrop: number;
}

/** GYÁRI alapértékek — a „Visszaállítás" ezekre tér vissza. (A fájlmentő ezt írja át.) */
export const DEFAULT_TUNING: BalanceTuning = {
  enemyHpBase: 0.60,
  hpFloorSlope: 0.10,
  hpPowerFactor: 0.012,
  atkFloorSlope: 0.12,
  enemyDmgMaxMul: 2.5,
  bossClassicHp: 25000,
  bossClassicProjectiles: 14,
  bossFlowerHp: 30000,
  bossFlowerGarden: 9,
  bossFlowerSpiralArms: 2,
  bossFlowerNova: 16,
  championChance: 0.12,
  luckBase: 0.10,
  luckPerLuck: 0.05,
  luckMax: 0.75,
  luckRoomDrop: 0.03,
};

/** Az ÉLŐ (futásidőben módosítható) hangolás. Az Admin · BALANSZ lap állítja. */
export const TUNING: BalanceTuning = { ...DEFAULT_TUNING };

export function resetTuning(): void {
  Object.assign(TUNING, DEFAULT_TUNING);
}

// ---- Tartós mentés (localStorage) ----
const STORAGE_KEY = 'sentex_tuning';

export function saveTuning(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TUNING));
  } catch {
    /* localStorage nem elérhető — csendben kihagyjuk */
  }
}

export function loadTuning(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<BalanceTuning>;
    for (const k of Object.keys(TUNING) as (keyof BalanceTuning)[]) {
      const v = data[k];
      if (typeof v === 'number' && Number.isFinite(v)) TUNING[k] = v;
    }
  } catch {
    /* hibás mentés — alapértékkel indulunk */
  }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin átírja a DEFAULT_TUNING-ot. */
export async function saveTuningToFile(): Promise<string> {
  saveTuning();
  try {
    const res = await fetch('/__save-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tuning: TUNING }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (tuning.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

// Modul betöltésekor visszaolvassuk a mentett értékeket.
loadTuning();
