import type { IEnemy } from './Enemy';
import { Boss } from './Boss';
import { Boss2 } from './Boss2';
import { Boss3 } from './Boss3';
import { Boss4 } from './Boss4';
import { BossMummy } from './BossMummy';
import { BossMummyRage } from './BossMummyRage';
import { BossSatan } from './BossSatan';
import { BossSatanHand } from './BossSatanHand';
import { BossDragon } from './BossDragon';
import { BossDragonTwin } from './BossDragonTwin';

/** A teszt-aréna / admin által hivatkozott boss-azonosító. */
export type BossTarget =
  | 'boss' | 'boss2' | 'boss3' | 'boss4'
  | 'mummy' | 'mummyrage' | 'satan' | 'satanhand' | 'dragon' | 'twindragon';

export interface BossInfo {
  /** Megjelenített név (a BOSS admin lap kártyáján). */
  name: string;
  /** Boss-példány gyártása az adott helyre (a `color` a fejezet boss-színe). */
  make: (x: number, y: number, floor: number, color: string) => IEnemy;
}

/** Minden boss egy helyen: a gyártó + a megjelenített név. */
export const BOSS_REGISTRY: Record<BossTarget, BossInfo> = {
  boss:       { name: 'A Fenevad',        make: (x, y, f, c) => new Boss(x, y, f, c) },
  boss3:      { name: 'A mérges Fenevad', make: (x, y, f, c) => new Boss3(x, y, f, c) },
  boss2:      { name: 'A Lidérc',         make: (x, y, f, c) => new Boss2(x, y, f, c) },
  boss4:      { name: 'A lidérc mérge',   make: (x, y, f, c) => new Boss4(x, y, f, c) },
  mummy:      { name: 'Múmia',            make: (x, y, f, c) => new BossMummy(x, y, f, c) },
  mummyrage:  { name: 'Múmia haragja',    make: (x, y, f, c) => new BossMummyRage(x, y, f, c) },
  satan:      { name: 'Sátán',            make: (x, y, f, c) => new BossSatan(x, y, f, c) },
  satanhand:  { name: 'Sátán keze',       make: (x, y, f, c) => new BossSatanHand(x, y, f, c) },
  dragon:     { name: 'Sárkány',          make: (x, y, f, c) => new BossDragon(x, y, f, c) },
  twindragon: { name: 'Kétfejű sárkány',  make: (x, y, f, c) => new BossDragonTwin(x, y, f, c) },
};

/** A BOSS admin lap megjelenítési sorrendje = a kiírt sorszám (Boss 1…10). */
export const BOSS_ORDER: BossTarget[] = [
  'boss', 'boss3', 'boss2', 'boss4',
  'mummy', 'mummyrage', 'satan', 'satanhand', 'dragon', 'twindragon',
];

/** Igaz, ha a string egy boss-azonosító (a teszt-aréna ezzel különbözteti meg). */
export function isBossTarget(t: string): t is BossTarget {
  return Object.prototype.hasOwnProperty.call(BOSS_REGISTRY, t);
}
