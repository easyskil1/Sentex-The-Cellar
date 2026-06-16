import type { ObstacleKind } from '../../types';
import type { Theme } from '../theme';

/** Egy tárgy alap-színe a robbanás-szilánkokhoz (a kő/szikla a téma szerint). */
export function obstacleShardColor(kind: ObstacleKind, th: Theme): string {
  switch (kind) {
    case 'rock': case 'boulder': case 'slate': case 'pebbles':
    case 'stalagmites': case 'pillar': case 'well': case 'tombstone': return th.rock;
    case 'tree': case 'pine': case 'bush': return '#3f6a36';
    case 'thornbush': return '#4a5a2e';
    case 'drytree': case 'deadtree': case 'stump': case 'log': return '#6a4a2c';
    case 'crate': case 'barrel': case 'chest': return '#9a6a38';
    case 'pots': return '#b5763a';
    case 'water': return '#3f86b8';
    case 'luckrock': return '#d6b05c';
    case 'crystals': return '#8a6ad0';
    case 'cactus': return '#3f7a4a';
    case 'torch': case 'brazier': case 'campfire': return '#d07a3a';
    case 'cauldron': return '#5a5a5a';
    case 'mushrooms': return '#c08a6a';
    case 'bones': return '#cfc8b0';
    case 'grass': case 'reeds': case 'fern': return '#5a8a3a';
    case 'flowers': return '#c86aa0';
    case 'vines': return '#4a7a3a';
    case 'coffin': return '#5e4128';
    case 'gravecross': case 'celticcross': case 'angelstatue': case 'urn': return '#83868c';
    case 'gargoyle': case 'obelisk': return th.rock;
    case 'ironfence': case 'candelabra': return '#3a3c44';
    case 'skullpile': return '#d8d2bf';
    case 'cobweb': return '#dee2e8';
    case 'ritualcircle': return '#ce68e0';
  }
}
