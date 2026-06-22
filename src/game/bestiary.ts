// ════════════════════════════════════════════════════════════════════════
//  Bestiárium (Kódex) - feloldható ellenfél-gyűjtemény
// ════════════════════════════════════════════════════════════════════════
//
// Játékos-facing meta-tartalom a már megrajzolt ~55 ellenfélre: az első
// megölésig sötét sziluett, utána feloldva (név + statok). Keret-független
// (csak localStorage), mint a stats.ts. A megjelenítést az Overlays adja, a
// rajzot a meglévő `drawEnemy` (EnemyRenderer) - itt csak az adat él.

import type { EnemyKind } from './entities/enemies/enemyTypes';
import type { BossTarget } from './entities/enemies/bossRegistry';

const KEY = 'sentex_bestiary';
const BOSS_KEY = 'sentex_bestiary_boss';
const PERK_KEY = 'sentex_codex_perks';
const SKILL_KEY = 'sentex_codex_skills';
const SETS_KEY = 'sentex_codex_sets';

/** Magyar megjelenítendő nevek a katakomba-fal bejegyzéseihez (gótikus téma). */
export const ENEMY_NAMES: Record<EnemyKind, string> = {
  fly: 'Légy', walker: 'Csoszogó', shooter: 'Lövő', charger: 'Rohamozó',
  rotling: 'Rothadék', spitter: 'Köpködő', chiller: 'Dermesztő', lancer: 'Lándzsás',
  pyro: 'Gyújtogató', bombardier: 'Bombázó', mistweaver: 'Ködszövő', roach: 'Csótány',
  spider: 'Pók', spiderling: 'Pókfióka', tick: 'Kullancs', sniper: 'Mesterlövész',
  mortar: 'Aknavető', summoner: 'Megidéző', striker: 'Sújtó', worm: 'Féreg',
  shotgunner: 'Sörétes', gunner: 'Géppuskás', blinker: 'Villanó', confuser: 'Zavaró',
  blocker: 'Blokkoló', leaper: 'Ugró', flanker: 'Oldalazó', healer: 'Gyógyító',
  enrager: 'Feldühítő', kamikaze: 'Kamikaze', slammer: 'Csapó', turret: 'Lövegtorony',
  gasbag: 'Gázzsák', puller: 'Magához rántó', bombthrower: 'Bombadobó', minotaur: 'Minótaurusz',
  mummy: 'Múmia', scarab: 'Szkarabeusz', vampire: 'Vámpír', bat: 'Denevér',
  leech: 'Pióca', serpent: 'Kígyó', medusa: 'Medúza', skeleton: 'Csontváz',
  wraith: 'Lidérc', gargoyle: 'Kőszörny', harpy: 'Hárpia', cyclops: 'Küklopsz',
  golem: 'Gólem', scorpion: 'Skorpió', wisp: 'Lidércfény', banshee: 'Sikoltó szellem',
  imp: 'Ördögfióka', hydra: 'Hidra', werewolf: 'Vérfarkas',
};

/** A felfedezett ellenfél-kulcsok betöltése (a meg nem öltek sötét sziluettek). */
export function loadBestiary(): Set<EnemyKind> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as EnemyKind[]);
  } catch {
    return new Set();
  }
}

function save(set: Set<EnemyKind>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* nem elérhető */ }
}

/** Egy ellenfél feloldása (a World.killEnemy hívja az első megöléskor). */
export function unlockEnemy(kind: EnemyKind): void {
  const set = loadBestiary();
  if (set.has(kind)) return;
  set.add(kind);
  save(set);
}

/** A bestiárium nullázása (a profil-reset hívja). */
export function resetBestiary(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BOSS_KEY);
    localStorage.removeItem(PERK_KEY);
    localStorage.removeItem(SKILL_KEY);
    localStorage.removeItem(SETS_KEY);
  } catch { /* nem elérhető */ }
}

// ──────────────────────────────────────────────────────────────────────
//  Tárgyak (perkek) + Képességek (skillek) - a Kódex külön füleihez
// ──────────────────────────────────────────────────────────────────────
//
// A perk a FELVÉTELKOR oldódik fel (item neve), a skill az EGYENLEGKOR/induláskor
// (skill id). Külön kulcsok, hogy a meglévő ellenfél/boss-feloldás érintetlen.

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function addToSet(key: string, value: string): void {
  const set = loadSet(key);
  if (set.has(value)) return;
  set.add(value);
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* nem elérhető */ }
}

/** A felfedezett perk-nevek (felvett tárgyak). */
export function loadPerksSeen(): Set<string> { return loadSet(PERK_KEY); }

/** Egy perk feloldása felvételkor (item neve = stabil kulcs). */
export function unlockPerk(name: string): void { addToSet(PERK_KEY, name); }

/** A felfedezett skill-azonosítók. */
export function loadSkillsSeen(): Set<string> { return loadSet(SKILL_KEY); }

/** Egy skill feloldása (felszereléskor vagy induló skillként). */
export function unlockSkill(id: string): void { addToSet(SKILL_KEY, id); }

// ──────────────────────────────────────────────────────────────────────
//  Szettek („Rendek") - a Kódex RENDEK füléhez
// ──────────────────────────────────────────────────────────────────────
//
// Egy szett-tier (küszöb-bónusz) akkor oldódik fel, amikor a játékos ELŐSZÖR
// AKTIVÁLJA (a World.applySetTiers hívja). A kulcs `setId:need` (pl. „war:2"),
// így a Kódexben a hatás csak aktiválás után tárul fel (a tagság a perk-feloldástól).

/** A felfedezett (aktivált) szett-tierek kulcsai (`setId:need`). */
export function loadSetTiersSeen(): Set<string> { return loadSet(SETS_KEY); }

/** Egy szett-tier feloldása az ELSŐ aktiváláskor (`setId:need` kulcs). */
export function unlockSetTier(id: string, need: number): void { addToSet(SETS_KEY, `${id}:${need}`); }

// ──────────────────────────────────────────────────────────────────────
//  Bossok - külön kulcs (a fő ellenfél-fal alatt, saját szekcióban)
// ──────────────────────────────────────────────────────────────────────

/** A felfedezett boss-azonosítók betöltése (a meg nem öltek sötét sziluettek). */
export function loadBossBestiary(): Set<BossTarget> {
  try {
    const raw = localStorage.getItem(BOSS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as BossTarget[]);
  } catch {
    return new Set();
  }
}

/** Egy boss feloldása (a World.killEnemy hívja az első megöléskor). */
export function unlockBoss(target: BossTarget): void {
  const set = loadBossBestiary();
  if (set.has(target)) return;
  set.add(target);
  try { localStorage.setItem(BOSS_KEY, JSON.stringify([...set])); } catch { /* nem elérhető */ }
}
