import type { EditableEnemyStat, EnemyKind } from './enemyTypes';

/**
 * Szerkesztett ellenfél-stat felülírások (CSAK a gyári `ENEMY_STATS`-tól eltérők).
 * Az Admin · ENEMY lap „Mentés fájlba" gombja írja felül (dev Vite plugin,
 * `/__save-enemies`). Üres objektum = minden a gyári érték szerint.
 */
export const ENEMY_OVERRIDES: Partial<Record<EnemyKind, Partial<Record<EditableEnemyStat, number>>>> = {
  "gasbag": {
    "tier": 3
  },
  "puller": {
    "dmg": 0.2
  },
  "vampire": {
    "tier": 4
  },
  "bat": {
    "dmg": 1.2,
    "tier": 3
  },
  "leech": {
    "tier": 1
  },
  "medusa": {
    "hp": 3500,
    "dmg": 1.2,
    "tier": 3
  },
  "wraith": {
    "tier": 3
  },
  "gargoyle": {
    "tier": 2
  },
  "harpy": {
    "hp": 1400,
    "dmg": 1.5
  },
  "cyclops": {
    "tier": 3
  },
  "golem": {
    "tier": 2
  },
  "wisp": {
    "tier": 1
  },
  "banshee": {
    "tier": 1
  }
};
