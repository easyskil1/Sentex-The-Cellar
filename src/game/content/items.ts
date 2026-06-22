import type { Player } from '../entities/Player';
import type { PillShape, PillPattern, PillLook } from './Pill';
import type { BodyLook } from '../entities/PlayerRenderer';
import { shade, pick, weightedPick, random } from '../../engine/math';
import { applyPerk, perkWeight } from './perkConfig';
import { tc } from '../../i18n';

/**
 * A tárgy KATEGÓRIÁJA - a négy fogalmilag külön lelet-fajta szétválasztása
 * (eddig minden „perk"-ként, egy csövön ment). Csak osztályozás, a hatást nem
 * befolyásolja; a HUD/admin és a JÁTÉKBELI ikon-vizuál (`itemIcon.ts` kategória-
 * diszpécser: perk→tabletta, relic→relikvia, skill→tekercs, familiar→orb) erre épül.
 *   - `perk`     passzív, halmozható stat-tabletta (Éles Könny, Háborús Jel, …)
 *   - `relic`    build-meghatározó lőmód-relikvia (Kénkő-sugár, Lángkúp, …)
 *   - `familiar` kísérő (Holdkő, Őrző Légy)
 *   - `skill`    aktív képességet adó tekercs (lecseréli az aktív skillt)
 */
export type ItemCategory = 'perk' | 'relic' | 'familiar' | 'skill';

/**
 * Szett-CÍMKE = egy `SetId` (lásd `itemSets.ts`). Egy tárgy több szetthez is
 * tartozhat. A küszöb elérésekor a szett tematikus bónuszt ad (lásd `itemSets`).
 */
export type ItemTag = 'war' | 'elemental' | 'barrage' | 'swift' | 'familiar';

/** Felvehető tárgy, amely tartósan módosítja a játékos statisztikáit. */
export interface Item {
  name: string;
  desc: string;
  /** A lelet fogalmi fajtája (osztályozás; a hatást nem befolyásolja). */
  category: ItemCategory;
  /** Szett-címkék: mely tematikus rendekbe számít bele (lásd `itemSets.ts`). */
  tags?: ItemTag[];
  /** A tabletta fő színe. */
  col: string;
  /** A tabletta másodlagos színe (kapszula másik fele / minta színe). */
  col2?: string;
  /** A tabletta sziluettje. Alap: `round`. */
  shape?: PillShape;
  /** A tabletta felületi mintája. Alap: `plain`. */
  pattern?: PillPattern;
  /**
   * Ha a tárgy aktív képességet ad, ez a `Skill` id-ja. Az ilyen tárgyak
   * felvételekor megerősítő ablak ugrik fel a skill leírásával, és a játékos
   * eldöntheti, felveszi-e (lecseréli a jelenlegi aktív képességet).
   */
  skill?: string;
  apply: (p: Player) => void;
  /**
   * A tárgy hatása a LÖVEDÉK kinézetére (a karakter testét nem érinti). A
   * felvett tárgyakon sorban lefut (lásd `Player.refreshLook`): a legutóbb
   * felvett szín/alak nyer.
   */
  mutateLook?: (look: BodyLook) => void;
}

/** A tárgy megjelenítendő neve a jelenlegi nyelven (az `item.name` az angol forrás
 *  + a perk-azonosító; a HU-t a `CONTENT_HU` adja). */
export function itemName(it: Item): string {
  return tc(it.name, `item.${it.name}.name`);
}

/** A tárgy megjelenítendő leírása a jelenlegi nyelven. */
export function itemDesc(it: Item): string {
  return tc(it.desc, `item.${it.name}.desc`);
}

/** A tárgy tabletta-kinézete a rajzolóknak (a hiányzó mezőkre alapértelmezés). */
export function pillLook(item: Item): PillLook {
  return {
    col: item.col,
    col2: item.col2 ?? shade(item.col, -0.38),
    shape: item.shape ?? 'round',
    pattern: item.pattern ?? 'plain',
  };
}

/**
 * Tárgylista. Bővíthető: új belépőt adva azonnal megjelenhet a pedesztálon.
 * Minden tárgy más alakú/mintájú/színű tablettaként jelenik meg (lásd `Pill.ts`),
 * hogy ránézésre megkülönböztethetők legyenek.
 */
export const ITEMS: readonly Item[] = [
  { name: 'Sharp Tear', desc: '+damage', category: 'perk', tags: ['war'], col: '#ff7b6a', col2: '#c63a2a', shape: 'capsule', apply: (p) => applyPerk(p, 'Sharp Tear'), mutateLook: (l) => { l.tearColor = '#ff3a2a'; } },
  { name: 'Spider Leg', desc: '+speed', category: 'perk', tags: ['swift'], col: '#8fe08f', col2: '#3f9f5f', shape: 'round', pattern: 'split', apply: (p) => applyPerk(p, 'Spider Leg') },
  { name: 'Rainstone', desc: 'faster fire', category: 'perk', tags: ['swift'], col: '#7fc4ff', col2: '#3a7fd0', shape: 'oval', pattern: 'bars', apply: (p) => applyPerk(p, 'Rainstone') },
  { name: 'Spyglass', desc: '+range', category: 'perk', col: '#ffd36a', col2: '#c89a2a', shape: 'diamond', pattern: 'dot', apply: (p) => applyPerk(p, 'Spyglass') },
  { name: 'Flywheel', desc: '+shot speed', category: 'perk', tags: ['swift'], col: '#d8a0ff', col2: '#8a5fd0', shape: 'hexagon', pattern: 'ring', apply: (p) => applyPerk(p, 'Flywheel'), mutateLook: (l) => { l.tearSquashY = 0.55; } },
  { name: 'Twin Drop', desc: 'double shot', category: 'perk', tags: ['barrage'], col: '#ff9bd6', col2: '#d04f9f', shape: 'capsule', apply: (p) => applyPerk(p, 'Twin Drop') },
  { name: 'Blood Heart', desc: '+1 heart, heals', category: 'perk', col: '#ff5b6a', col2: '#a02838', shape: 'round', pattern: 'cross', apply: (p) => applyPerk(p, 'Blood Heart') },
  { name: 'Horseshoe', desc: '+luck', category: 'perk', col: '#9bffd6', col2: '#3fb088', shape: 'triangle', pattern: 'dot', apply: (p) => applyPerk(p, 'Horseshoe') },
  { name: 'Lantern', desc: '+sight', category: 'perk', col: '#ffe08a', col2: '#c8a83a', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Lantern') },
  { name: 'Dark Veil', desc: '−sight, ++damage', category: 'perk', tags: ['war'], col: '#6a5a8a', col2: '#3a2f5a', shape: 'hexagon', pattern: 'bars', apply: (p) => applyPerk(p, 'Dark Veil') },
  { name: 'War Mark', desc: '++damage', category: 'perk', tags: ['war'], col: '#ff4d3d', col2: '#a01818', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'War Mark'), mutateLook: (l) => { l.tearColor = '#ff3a2a'; } },
  { name: 'Winged Sandal', desc: '++speed', category: 'perk', tags: ['swift'], col: '#8fe08f', col2: '#3f9f5f', shape: 'capsule', pattern: 'split', apply: (p) => applyPerk(p, 'Winged Sandal') },

  // Lövés-perkek (Wave 1: lövés-rendszer)
  { name: 'Triple Tear', desc: '3 shots, shorter range', category: 'perk', tags: ['barrage'], col: '#7fd0ff', col2: '#3a7fd0', shape: 'oval', pattern: 'bars', apply: (p) => applyPerk(p, 'Triple Tear'), mutateLook: (l) => { if (l.tearColor === undefined && l.tearSquashY === undefined) { l.tearColor = '#1c2f86'; l.tearSquashY = 0.55; } } },
  { name: 'Buckshot Eye', desc: 'many shots, close range', category: 'perk', tags: ['barrage'], col: '#ffb060', col2: '#c06820', shape: 'hexagon', pattern: 'dot', apply: (p) => applyPerk(p, 'Buckshot Eye') },
  { name: 'Needle Point', desc: 'piercing shot', category: 'perk', tags: ['barrage'], col: '#e0e0ff', col2: '#8080c0', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'Needle Point') },
  { name: 'Rubber Wall', desc: 'bounces off walls', category: 'perk', tags: ['barrage'], col: '#9bff9b', col2: '#3fb03f', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Rubber Wall') },
  { name: "Hunter's Eye", desc: 'homing shot', category: 'perk', tags: ['barrage'], col: '#ff9bd6', col2: '#d04f9f', shape: 'diamond', pattern: 'dot', apply: (p) => applyPerk(p, "Hunter's Eye") },
  { name: 'Ghost Tear', desc: 'flies through rocks', category: 'perk', tags: ['barrage'], col: '#c0b0e0', col2: '#6a5a8a', shape: 'oval', pattern: 'plain', apply: (p) => applyPerk(p, 'Ghost Tear') },
  { name: 'Shrapnel Drop', desc: 'splits on hit', category: 'perk', tags: ['barrage'], col: '#ffd36a', col2: '#c89a2a', shape: 'triangle', pattern: 'split', apply: (p) => applyPerk(p, 'Shrapnel Drop') },
  { name: 'Knockback Tear', desc: 'knocks the enemy back', category: 'perk', tags: ['barrage'], col: '#7fe0ff', col2: '#3a9fc0', shape: 'capsule', pattern: 'ring', apply: (p) => applyPerk(p, 'Knockback Tear') },

  // Elemi könnyek (Wave 2: státusz-rendszer)
  { name: 'Ember Tear', desc: 'burning damage (DoT)', category: 'perk', tags: ['elemental'], col: '#ff7a3a', col2: '#c0401a', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'Ember Tear'), mutateLook: (l) => { l.tearColor = '#ff7a2a'; } },
  { name: 'Venom Drop', desc: 'poison damage (DoT)', category: 'perk', tags: ['elemental'], col: '#9fd84a', col2: '#5a8f20', shape: 'round', pattern: 'dot', apply: (p) => applyPerk(p, 'Venom Drop'), mutateLook: (l) => { l.tearColor = '#7ad046'; } },
  { name: 'Frost Shard', desc: 'freezes the target', category: 'perk', tags: ['elemental'], col: '#9fe0ec', col2: '#3a9fc0', shape: 'diamond', pattern: 'bars', apply: (p) => applyPerk(p, 'Frost Shard'), mutateLook: (l) => { l.tearColor = '#a6ecff'; } },
  { name: 'Lightning Eye', desc: 'chain lightning to nearby', category: 'perk', tags: ['elemental'], col: '#ffe04a', col2: '#c0a020', shape: 'hexagon', pattern: 'cross', apply: (p) => applyPerk(p, 'Lightning Eye'), mutateLook: (l) => { l.tearColor = '#ffe14a'; } },

  // Alternatív lőmód (Fázis B: tartalmi tengely) - relikvia (lőmódot vált, kölcsönösen kizáró → nincs szett-tag)
  { name: 'Sulfur Beam', desc: 'continuous beam (replaces shots)', category: 'relic', col: '#ff5a2a', col2: '#a01818', shape: 'hexagon', pattern: 'cross', apply: (p) => applyPerk(p, 'Sulfur Beam'), mutateLook: (l) => { l.tearColor = '#ff5a2a'; } },
  { name: 'Hellfire Breath', desc: 'flame cone (replaces shots)', category: 'relic', col: '#ff9a3a', col2: '#c0401a', shape: 'triangle', pattern: 'split', apply: (p) => applyPerk(p, 'Hellfire Breath'), mutateLook: (l) => { l.tearColor = '#ff9a3a'; } },
  { name: 'Charged Shot', desc: 'charged shot (replaces shots)', category: 'relic', col: '#ffd24a', col2: '#c08010', shape: 'diamond', pattern: 'ring', apply: (p) => applyPerk(p, 'Charged Shot'), mutateLook: (l) => { l.tearColor = '#ffd24a'; } },
  { name: 'Signet Ring', desc: 'traveling damage ring (replaces shots)', category: 'relic', col: '#d8b24a', col2: '#8a6a1a', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Signet Ring'), mutateLook: (l) => { l.tearColor = '#d8b24a'; } },

  // Kísérők (Wave 4: familiar-rendszer)
  { name: 'Moonstone', desc: 'orbiting damage orb', category: 'familiar', tags: ['familiar'], col: '#aef3ff', col2: '#3a7fd0', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Moonstone') },
  { name: 'Guardian Fly', desc: 'blocks projectiles', category: 'familiar', tags: ['familiar'], col: '#cfe0ff', col2: '#3a7fd0', shape: 'oval', pattern: 'dot', apply: (p) => applyPerk(p, 'Guardian Fly') }, // a vizuál maga a kísérő-légy (lásd World.drawFamiliars)

  // Aktív skillt adó tárgyak (lecserélik az aktív képességet)
  { name: 'Shockwave Scroll', desc: 'skill: Shockwave', category: 'skill', col: '#7fc4ff', col2: '#3a7fd0', shape: 'hexagon', pattern: 'ring', skill: 'nova', apply: (p) => { p.activeSkillId = 'nova'; p.skillCharge = 0; } },
  { name: 'Time Vial', desc: 'skill: Time Slow', category: 'skill', col: '#9b8cff', col2: '#5f4fd0', shape: 'oval', pattern: 'dot', skill: 'slow', apply: (p) => { p.activeSkillId = 'slow'; p.skillCharge = 0; } },
  { name: 'Teleport Stone', desc: 'skill: Teleport', category: 'skill', col: '#ffd36a', col2: '#c89a2a', shape: 'diamond', pattern: 'split', skill: 'blink', apply: (p) => { p.activeSkillId = 'blink'; p.skillCharge = 0; } },
  { name: 'Shield Amulet', desc: 'skill: Shield', category: 'skill', col: '#3df0ff', col2: '#1aa8c0', shape: 'round', pattern: 'ring', skill: 'shield', apply: (p) => { p.activeSkillId = 'shield'; p.skillCharge = 0; } },
  { name: 'Blessing', desc: 'skill: Heal', category: 'skill', col: '#5cff8f', col2: '#2aa85f', shape: 'triangle', pattern: 'cross', skill: 'heal', apply: (p) => { p.activeSkillId = 'heal'; p.skillCharge = 0; } },
];

/** Csak STAT-itemek (passzív, tiszta fejlesztés — a túlsúly ezeké). */
export const STAT_ITEMS: readonly Item[] = ITEMS.filter((it) => !it.skill);
/** Csak aktív SKILL-tárgyak (lecserélik az aktív képességet — ritkább lelet). */
export const SKILL_ITEMS: readonly Item[] = ITEMS.filter((it) => it.skill);

/** Esély, hogy egy lelet STAT-perk (a maradék skill-tárgy). A bolt, az ingyenes
 *  pedesztál és a jackpot is EZT használja (egységes súlyozás — lásd rollItem). */
export const STAT_ITEM_CHANCE = 0.78;

/**
 * Egy véletlen lelet-tárgy: túlnyomórészt esély-súlyozott STAT-perk (perkWeight),
 * ritkán aktív skill-tárgy. Egyetlen forrás a pedesztálnak, boltnak és a
 * jackpotnak, hogy a `perkWeight` (köztük a „súly=0 → sosem jön elő") MINDENHOL
 * érvényesüljön.
 */
export function rollItem(statChance = STAT_ITEM_CHANCE): Item {
  const stat = random() < statChance || SKILL_ITEMS.length === 0;
  return stat ? weightedPick(STAT_ITEMS, (it) => perkWeight(it.name)) : pick(SKILL_ITEMS);
}
