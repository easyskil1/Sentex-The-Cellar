/**
 * ITEM-ERŐ PONTOK (additív)
 *
 * Minden tárgyhoz egy fix "erő-pont". A játékos ereje = a felvett itemek
 * pontjainak ÖSSZEGE (nem szorzata!). Ez tartja kiszámíthatóan és könnyen
 * hangolhatóan a balanszt: új item belövése = egyetlen szám.
 *
 * A nehézség-logika (difficulty.ts) ebből az összegből számol enyhe
 * ellenfél-erő korrekciót — minél erősebb a build, annál keményebb a pálya,
 * de SOSEM annyira, hogy értelmetlen legyen gyűjteni (lásd TUNING.*PowerFactor).
 *
 * A kulcs az item NEVE (items.ts `name` mezője). Az Admin · BALANSZ lap élőben
 * állítja, és fájlba is menthet.
 */

export const DEFAULT_POWER = 6;

/** GYÁRI alapértékek (a fájlmentő ezt írja át, a „Visszaállítás" ide tér vissza). */
export const DEFAULT_ITEM_POWER: Record<string, number> = {
  // --- Offenzív (nagy súly) ---
  'Twin Drop': 18, // dupla lövés – a legnagyobb DPS-ugrás
  'War Mark': 16, // ++sebzés
  'Rainstone': 14, // gyorsabb tűz
  'Dark Veil': 11, // ++sebzés, de −látótáv (a hátrány csökkenti)
  'Sharp Tear': 10, // +sebzés

  // --- Lövés-perkek (Wave 1) ---
  'Triple Tear': 16, // 3 lövedék (a range-büntetés ellensúlyoz)
  'Buckshot Eye': 16, // sok lövedék, közeli
  'Needle Point': 14, // átütő
  "Hunter's Eye": 13, // célkövető
  'Shrapnel Drop': 12, // hasadó
  'Rubber Wall': 9, // pattanó
  'Ghost Tear': 8, // szellem (átrepül a köveken)
  'Knockback Tear': 8, // lökő

  // --- Elemi könnyek (Wave 2) ---
  'Ember Tear': 13, // gyújtó DoT
  'Venom Drop': 12, // mérgező DoT
  'Frost Shard': 12, // fagyasztó
  'Lightning Eye': 14, // lánc-villám

  // --- Kísérők (Wave 4) ---
  'Moonstone': 13, // keringő orb
  'Guardian Fly': 12, // lövedék-blokk

  // --- Túlélés / hasznosság ---
  'Blood Heart': 10, // +1 szív + gyógyulás (a túlélés is erő)
  'Winged Sandal': 14, // ++sebesség
  'Spider Leg': 8, // +sebesség
  'Flywheel': 6, // +lövéssebesség
  'Spyglass': 9, // +lőtáv
  'Horseshoe': 4, // +szerencse (közvetett)
  'Lantern': 5, // +látótáv (alig harci érték)

  // --- Aktív skillek ---
  'Shield Amulet': 10, // sebezhetetlenség ablak
  'Time Vial': 9, // időlassítás
  'Blessing': 9, // gyógyír
  'Shockwave Scroll': 8, // lökéshullám
  'Teleport Stone': 6, // mobilitás
};

/** Az ÉLŐ (futásidőben módosítható) item-erő tábla. */
export const ITEM_POWER: Record<string, number> = { ...DEFAULT_ITEM_POWER };

/** Egyetlen item erő-pontja (ismeretlenre a DEFAULT_POWER). */
export function itemPower(name: string): number {
  return ITEM_POWER[name] ?? DEFAULT_POWER;
}

export function resetItemPower(): void {
  for (const k of Object.keys(ITEM_POWER)) delete ITEM_POWER[k];
  Object.assign(ITEM_POWER, DEFAULT_ITEM_POWER);
}

// ---- Tartós mentés (localStorage) ----
const STORAGE_KEY = 'sentex_item_power';

export function saveItemPower(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ITEM_POWER));
  } catch {
    /* localStorage nem elérhető */
  }
}

export function loadItemPower(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, number>;
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) ITEM_POWER[k] = v;
    }
  } catch {
    /* hibás mentés */
  }
}

/** Mentés a FORRÁSFÁJLBA (dev): a Vite plugin átírja a DEFAULT_ITEM_POWER-t. */
export async function saveItemPowerToFile(): Promise<string> {
  saveItemPower();
  try {
    const res = await fetch('/__save-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemPower: ITEM_POWER }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data.ok ? 'Fájlba mentve ✓ (itemPower.ts)' : `Hiba: ${data.error ?? '?'}`;
  } catch (e) {
    return `Nem sikerült (csak dev szerverrel megy): ${String(e)}`;
  }
}

loadItemPower();
