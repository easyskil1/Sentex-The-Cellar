/**
 * Futásidőben módosítható drop-beállítások (az Admin · Esély lap állítja).
 *
 * A típusonkénti `nets` érték a NETTÓ/SZOBA valószínűség: ekkora eséllyel esik
 * az adott típus egy kipucolt szobában. Ebből minden más származik:
 *   - Szoba-drop esély = a nettók összege (max 1)
 *   - Esély dropkor    = net_i / összeg
 *
 * Az alapértékek a `DEFAULT_NETS`-ben vannak — ezt írja át az Admin „Mentés
 * fájlba" gombja (dev módban, a Vite plugin segítségével).
 */
export type DropKey = 'coin' | 'bomb' | 'heart' | 'tnt';

/** GYÁRI nettó/szoba esélyek. A szerencse-bolt árazása ehhez viszonyít
 *  (ritkábbra állított típus → drágább a boltban). */
export const DEFAULT_NETS: Record<DropKey, number> = { coin: 0.24, bomb: 0.115, heart: 0.095, tnt: 0.02 };

export const dropConfig: { nets: Record<DropKey, number> } = { nets: { ...DEFAULT_NETS } };

/** Esély, hogy egy szétlőtt/robbantott LÁDÁBÓL essen pickup (mindkét törés-úton közös). */
export const CRATE_DROP_CHANCE = 0.225;

/** Esély, hogy egy kipucolt szobában egyáltalán esik valami (a nettók összege, max 1). */
export function roomDropChance(): number {
  const n = dropConfig.nets;
  return Math.min(1, n.coin + n.bomb + n.heart + n.tnt);
}

/** A nettók összege skálázás nélkül (lehet >1 is, a kijelzéshez). */
export function netSum(): number {
  const n = dropConfig.nets;
  return n.coin + n.bomb + n.heart + n.tnt;
}

/** Az összes nettót arányosan átskálázza, hogy az összegük `target` legyen. */
export function scaleNetsTo(target: number): void {
  const cur = netSum();
  if (cur <= 0) return;
  const k = target / cur;
  const n = dropConfig.nets;
  n.coin *= k; n.bomb *= k; n.heart *= k; n.tnt *= k;
}

/**
 * Az „Esély dropkor" (arány) módosítása egy típusra `delta` arányponttal,
 * miközben a szoba-drop esély (a nettók összege) VÁLTOZATLAN marad — a többi
 * típust arányosan átsúlyozza.
 */
export function adjustOdds(key: DropKey, delta: number): void {
  const n = dropConfig.nets;
  const sum = netSum();
  if (sum <= 0) return;
  const oldNet = n[key];
  const newOdds = Math.max(0, Math.min(1, oldNet / sum + delta));
  const newNet = newOdds * sum;
  const othersSum = sum - oldNet;
  const d = newNet - oldNet;
  if (othersSum > 1e-9) {
    const k = Math.max(0, (othersSum - d) / othersSum);
    (['coin', 'bomb', 'heart', 'tnt'] as DropKey[]).forEach((k2) => { if (k2 !== key) n[k2] *= k; });
  }
  n[key] = newNet;
}

export function resetDropConfig(): void {
  dropConfig.nets = { ...DEFAULT_NETS };
}

// ---- Tartós mentés (localStorage) ----
const STORAGE_KEY = 'sentex_drops';

/** A jelenlegi beállítás mentése a böngészőbe (újratöltés után is megmarad). */
export function saveDropConfig(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dropConfig.nets));
  } catch {
    /* localStorage nem elérhető — csendben kihagyjuk */
  }
}

/** Mentett beállítás visszatöltése (ha van). Indításkor fut. */
export function loadDropConfig(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<Record<DropKey, number>>;
    (['coin', 'bomb', 'heart', 'tnt'] as DropKey[]).forEach((k) => {
      const v = data[k];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) dropConfig.nets[k] = v;
    });
  } catch {
    /* hibás mentés — alapértékkel indulunk */
  }
}

/**
 * Mentés a FORRÁSFÁJLBA (dev mód): a Vite plugin átírja a DEFAULT_NETS-et.
 * Visszaad egy szöveges státuszt. Production buildben nincs szerver → hibát ad.
 */
export async function saveDropConfigToFile(): Promise<string> {
  saveDropConfig(); // a localStorage is szinkronban marad
  try {
    const res = await fetch('/__save-drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dropConfig.nets),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (dropConfig.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

// Modul betöltésekor azonnal visszaolvassuk a mentett értékeket.
loadDropConfig();
