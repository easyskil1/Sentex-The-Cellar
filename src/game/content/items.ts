import type { Player } from '../entities/Player';
import type { PillShape, PillPattern, PillLook } from './Pill';
import type { BodyLook } from '../entities/PlayerRenderer';
import { shade, pick, weightedPick } from '../../engine/math';
import { applyPerk, perkWeight } from './perkConfig';

/** Felvehető tárgy, amely tartósan módosítja a játékos statisztikáit. */
export interface Item {
  name: string;
  desc: string;
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
   * A tabletta látványos hatása a karakter kinézetére. A felvett tárgyakon
   * sorban lefut (lásd `Player.refreshLook`): a szín-mezők felülírják az
   * alapot, a számlálók halmozódnak — így több tabletta egymásra épül.
   */
  mutateLook?: (look: BodyLook) => void;
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
  { name: 'Sharp Tear', desc: '+damage', col: '#ff7b6a', col2: '#c63a2a', shape: 'capsule', apply: (p) => applyPerk(p, 'Sharp Tear'), mutateLook: (l) => { l.horns += 1; l.eye = '#c22a1a'; l.tearColor = '#ff3a2a'; } },
  { name: 'Spider Leg', desc: '+speed', col: '#8fe08f', col2: '#3f9f5f', shape: 'round', pattern: 'split', apply: (p) => applyPerk(p, 'Spider Leg'), mutateLook: (l) => { l.spikes += 2; l.legColor = '#3f9f5f'; } },
  { name: 'Rainstone', desc: 'faster fire', col: '#7fc4ff', col2: '#3a7fd0', shape: 'oval', pattern: 'bars', apply: (p) => applyPerk(p, 'Rainstone'), mutateLook: (l) => { l.antennae += 1; l.handColor = '#3a7fd0'; } },
  { name: 'Spyglass', desc: '+range', col: '#ffd36a', col2: '#c89a2a', shape: 'diamond', pattern: 'dot', apply: (p) => applyPerk(p, 'Spyglass'), mutateLook: (l) => { l.glasses = true; } },
  { name: 'Flywheel', desc: '+shot speed', col: '#d8a0ff', col2: '#8a5fd0', shape: 'hexagon', pattern: 'ring', apply: (p) => applyPerk(p, 'Flywheel'), mutateLook: (l) => { l.tearSquashY = 0.55; } },
  { name: 'Twin Drop', desc: 'double shot', col: '#ff9bd6', col2: '#d04f9f', shape: 'capsule', apply: (p) => applyPerk(p, 'Twin Drop'), mutateLook: (l) => { l.bumps += 2; l.bumpColor = '#ff9bd6'; } },
  { name: 'Blood Heart', desc: '+1 heart, heals', col: '#ff5b6a', col2: '#a02838', shape: 'round', pattern: 'cross', apply: (p) => applyPerk(p, 'Blood Heart'), mutateLook: (l) => { l.chestHeart = true; } },
  { name: 'Horseshoe', desc: '+luck', col: '#9bffd6', col2: '#3fb088', shape: 'triangle', pattern: 'dot', apply: (p) => applyPerk(p, 'Horseshoe'), mutateLook: (l) => { l.horseshoe = true; } },
  { name: 'Lantern', desc: '+sight', col: '#ffe08a', col2: '#c8a83a', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Lantern'), mutateLook: (l) => { l.scopeEye = true; } },
  { name: 'Dark Veil', desc: '−sight, ++damage', col: '#6a5a8a', col2: '#3a2f5a', shape: 'hexagon', pattern: 'bars', apply: (p) => applyPerk(p, 'Dark Veil'), mutateLook: (l) => { l.veil = true; l.eye = '#ffd96a'; } },
  { name: 'War Mark', desc: '++damage', col: '#ff4d3d', col2: '#a01818', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'War Mark'), mutateLook: (l) => { l.halfHeadColor = '#1f6b3a'; l.tearColor = '#ff3a2a'; } },
  { name: 'Winged Sandal', desc: '++speed', col: '#8fe08f', col2: '#3f9f5f', shape: 'capsule', pattern: 'split', apply: (p) => applyPerk(p, 'Winged Sandal'), mutateLook: (l) => { l.footWingColor = '#5fd07f'; } },

  // Lövés-perkek (Wave 1: lövés-rendszer)
  { name: 'Triple Tear', desc: '3 shots, shorter range', col: '#7fd0ff', col2: '#3a7fd0', shape: 'oval', pattern: 'bars', apply: (p) => applyPerk(p, 'Triple Tear'), mutateLook: (l) => { if (l.tearColor === undefined && l.tearSquashY === undefined) { l.tearColor = '#1c2f86'; l.tearSquashY = 0.55; } l.halfHeadColorLeft = '#2f6fd0'; } },
  { name: 'Buckshot Eye', desc: 'many shots, close range', col: '#ffb060', col2: '#c06820', shape: 'hexagon', pattern: 'dot', apply: (p) => applyPerk(p, 'Buckshot Eye'), mutateLook: (l) => { l.earrings = true; } },
  { name: 'Needle Point', desc: 'piercing shot', col: '#e0e0ff', col2: '#8080c0', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'Needle Point'), mutateLook: (l) => { l.punkHair = true; } },
  { name: 'Rubber Wall', desc: 'bounces off walls', col: '#9bff9b', col2: '#3fb03f', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Rubber Wall'), mutateLook: (l) => { l.springAntenna = true; } },
  { name: "Hunter's Eye", desc: 'homing shot', col: '#ff9bd6', col2: '#d04f9f', shape: 'diamond', pattern: 'dot', apply: (p) => applyPerk(p, "Hunter's Eye"), mutateLook: (l) => { l.foreheadCrosshair = true; } },
  { name: 'Ghost Tear', desc: 'flies through rocks', col: '#c0b0e0', col2: '#6a5a8a', shape: 'oval', pattern: 'plain', apply: (p) => applyPerk(p, 'Ghost Tear'), mutateLook: (l) => { l.teardropEarring = true; } },
  { name: 'Shrapnel Drop', desc: 'splits on hit', col: '#ffd36a', col2: '#c89a2a', shape: 'triangle', pattern: 'split', apply: (p) => applyPerk(p, 'Shrapnel Drop'), mutateLook: (l) => { l.leftEarBlack = true; } },
  { name: 'Knockback Tear', desc: 'knocks the enemy back', col: '#7fe0ff', col2: '#3a9fc0', shape: 'capsule', pattern: 'ring', apply: (p) => applyPerk(p, 'Knockback Tear'), mutateLook: (l) => { l.boxingGloves = true; } },

  // Elemi könnyek (Wave 2: státusz-rendszer)
  { name: 'Ember Tear', desc: 'burning damage (DoT)', col: '#ff7a3a', col2: '#c0401a', shape: 'diamond', pattern: 'cross', apply: (p) => applyPerk(p, 'Ember Tear'), mutateLook: (l) => { l.tearColor = '#ff7a2a'; l.headOutline = '#ff3a1a'; } },
  { name: 'Venom Drop', desc: 'poison damage (DoT)', col: '#9fd84a', col2: '#5a8f20', shape: 'round', pattern: 'dot', apply: (p) => applyPerk(p, 'Venom Drop'), mutateLook: (l) => { l.tearColor = '#7ad046'; l.poisonShorts = true; } },
  { name: 'Frost Shard', desc: 'freezes the target', col: '#9fe0ec', col2: '#3a9fc0', shape: 'diamond', pattern: 'bars', apply: (p) => applyPerk(p, 'Frost Shard'), mutateLook: (l) => { l.tearColor = '#a6ecff'; l.iceShadow = true; } },
  { name: 'Lightning Eye', desc: 'chain lightning to nearby', col: '#ffe04a', col2: '#c0a020', shape: 'hexagon', pattern: 'cross', apply: (p) => applyPerk(p, 'Lightning Eye'), mutateLook: (l) => { l.tearColor = '#ffe14a'; l.floatingEye = true; } },

  // Kísérők (Wave 4: familiar-rendszer)
  { name: 'Moonstone', desc: 'orbiting damage orb', col: '#aef3ff', col2: '#3a7fd0', shape: 'round', pattern: 'ring', apply: (p) => applyPerk(p, 'Moonstone'), mutateLook: (l) => { l.crescentMark = true; } },
  { name: 'Guardian Fly', desc: 'blocks projectiles', col: '#cfe0ff', col2: '#3a7fd0', shape: 'oval', pattern: 'dot', apply: (p) => applyPerk(p, 'Guardian Fly') }, // a vizuál maga a kísérő-légy (lásd World.drawFamiliars)

  // Aktív skillt adó tárgyak (lecserélik az aktív képességet)
  { name: 'Shockwave Scroll', desc: 'skill: Shockwave', col: '#7fc4ff', col2: '#3a7fd0', shape: 'hexagon', pattern: 'ring', skill: 'nova', apply: (p) => { p.activeSkillId = 'nova'; p.skillCharge = 0; }, mutateLook: (l) => { l.antennae += 1; l.trim = '#3a7fd0'; } },
  { name: 'Time Vial', desc: 'skill: Time Slow', col: '#9b8cff', col2: '#5f4fd0', shape: 'oval', pattern: 'dot', skill: 'slow', apply: (p) => { p.activeSkillId = 'slow'; p.skillCharge = 0; }, mutateLook: (l) => { l.bumps += 1; l.glow = '#9b8cff'; } },
  { name: 'Teleport Stone', desc: 'skill: Teleport', col: '#ffd36a', col2: '#c89a2a', shape: 'diamond', pattern: 'split', skill: 'blink', apply: (p) => { p.activeSkillId = 'blink'; p.skillCharge = 0; }, mutateLook: (l) => { l.extraEyes += 1; l.robe = '#caa24a'; } },
  { name: 'Shield Amulet', desc: 'skill: Shield', col: '#3df0ff', col2: '#1aa8c0', shape: 'round', pattern: 'ring', skill: 'shield', apply: (p) => { p.activeSkillId = 'shield'; p.skillCharge = 0; }, mutateLook: (l) => { l.spikes += 1; l.glow = '#3df0ff'; } },
  { name: 'Blessing', desc: 'skill: Heal', col: '#5cff8f', col2: '#2aa85f', shape: 'triangle', pattern: 'cross', skill: 'heal', apply: (p) => { p.activeSkillId = 'heal'; p.skillCharge = 0; }, mutateLook: (l) => { l.glow = '#5cff8f'; l.skin = '#dfffe0'; } },
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
  const stat = Math.random() < statChance || SKILL_ITEMS.length === 0;
  return stat ? weightedPick(STAT_ITEMS, (it) => perkWeight(it.name)) : pick(SKILL_ITEMS);
}
