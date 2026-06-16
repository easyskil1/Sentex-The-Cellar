import type { Rect, ObstacleKind } from '../../types';
import type { Theme } from '../theme';
import { drawMossBoulder } from './mossboulder';
import { drawSlateRock } from './slaterock';
import { drawLeafyBush } from './leafybush';
import { drawThornBush } from './thornbush';
import { drawPine } from './pine';
import { drawDryTree } from './drytree';
import { drawMushrooms } from './mushrooms';
import { drawStump } from './stump';
import { drawLog } from './log';
import { drawCrystals } from './crystals';
import { drawBones } from './bones';
import { drawBarrel } from './barrel';
import { drawGrassTuft } from './grasstuft';
import { drawReeds } from './reeds';
import { drawDeadTree } from './deadtree';
import { drawFern } from './fern';
import { drawCactus } from './cactus';
import { drawFlowerPatch } from './flowerpatch';
import { drawPebbles } from './pebbles';
import { drawStalagmites } from './stalagmites';
import { drawTorch } from './torch';
import { drawBrazier } from './brazier';
import { drawTombstone } from './tombstone';
import { drawBrokenPillar } from './brokenpillar';
import { drawChest } from './chest';
import { drawCauldron } from './cauldron';
import { drawCampfire } from './campfire';
import { drawClayPots } from './claypots';
import { drawVines } from './vines';
import { drawWell } from './well';
import { drawCoffin } from './coffin';
import { drawGraveCross } from './gravecross';
import { drawCelticCross } from './celticcross';
import { drawAngelStatue } from './angelstatue';
import { drawGargoyle } from './gargoyle';
import { drawIronFence } from './ironfence';
import { drawCandelabra } from './candelabra';
import { drawSkullPile } from './skullpile';
import { drawCobweb } from './cobweb';
import { drawUrn } from './urn';
import { drawObelisk } from './obelisk';
import { drawRitualCircle } from './ritualcircle';

export { drawRock } from './rock';
export { drawTree } from './tree';
export { drawCrate } from './crate';
export { drawWaterTile } from './watertile';
export { drawLuckRock } from './luckrock';
export { obstacleShardColor } from './obstacleshardcolor';

/**
 * Egy pálya-tárgy kirajzolása a fajtája alapján — EGY belépési pont a World és a
 * szerkesztő számára, hogy ugyanazt lássák. A `t` (mp) az animált tárgyakhoz
 * (kristály, fű, nádas, fáklya, parázstartó, üst, tábortűz, indák, víz).
 * A `rock`/`tree`/`crate`/`water`/`luckrock` itt nincs (a World külön kezeli őket
 * a víz-folyótest és a láda-HP miatt) — itt csak a TEREPTÁR fajtái.
 */
export function drawTerrainObstacle(
  ctx: CanvasRenderingContext2D, kind: ObstacleKind, cell: Rect, th: Theme, col: number, row: number, t = 0,
): void {
  switch (kind) {
    case 'boulder':     drawMossBoulder(ctx, cell, th, col, row); return;
    case 'slate':       drawSlateRock(ctx, cell, th, col, row); return;
    case 'bush':        drawLeafyBush(ctx, cell, col, row); return;
    case 'thornbush':   drawThornBush(ctx, cell, col, row); return;
    case 'pine':        drawPine(ctx, cell, col, row); return;
    case 'drytree':     drawDryTree(ctx, cell, col, row); return;
    case 'stump':       drawStump(ctx, cell, col, row); return;
    case 'log':         drawLog(ctx, cell, col, row); return;
    case 'crystals':    drawCrystals(ctx, cell, col, row, t); return;
    case 'deadtree':    drawDeadTree(ctx, cell, col, row); return;
    case 'cactus':      drawCactus(ctx, cell, col, row); return;
    case 'stalagmites': drawStalagmites(ctx, cell, th, col, row); return;
    case 'torch':       drawTorch(ctx, cell, col, row, t); return;
    case 'brazier':     drawBrazier(ctx, cell, col, row, t); return;
    case 'tombstone':   drawTombstone(ctx, cell, col, row); return;
    case 'pillar':      drawBrokenPillar(ctx, cell, th, col, row); return;
    case 'chest':       drawChest(ctx, cell, col, row); return;
    case 'cauldron':    drawCauldron(ctx, cell, col, row, t); return;
    case 'campfire':    drawCampfire(ctx, cell, col, row, t); return;
    case 'well':        drawWell(ctx, cell, th, col, row); return;
    case 'barrel':      drawBarrel(ctx, cell, col, row); return;
    case 'pots':        drawClayPots(ctx, cell, col, row); return;
    case 'mushrooms':   drawMushrooms(ctx, cell, col, row); return;
    case 'bones':       drawBones(ctx, cell, col, row); return;
    case 'grass':       drawGrassTuft(ctx, cell, col, row, t); return;
    case 'reeds':       drawReeds(ctx, cell, col, row, t); return;
    case 'fern':        drawFern(ctx, cell, col, row); return;
    case 'flowers':     drawFlowerPatch(ctx, cell, col, row); return;
    case 'pebbles':     drawPebbles(ctx, cell, th, col, row); return;
    case 'vines':       drawVines(ctx, cell, col, row, t); return;
    // GOTH TEREPTÁR
    case 'coffin':       drawCoffin(ctx, cell, col, row); return;
    case 'gravecross':   drawGraveCross(ctx, cell, col, row); return;
    case 'celticcross':  drawCelticCross(ctx, cell, col, row); return;
    case 'angelstatue':  drawAngelStatue(ctx, cell, col, row); return;
    case 'gargoyle':     drawGargoyle(ctx, cell, col, row); return;
    case 'ironfence':    drawIronFence(ctx, cell, col, row); return;
    case 'candelabra':   drawCandelabra(ctx, cell, col, row, t); return;
    case 'skullpile':    drawSkullPile(ctx, cell, col, row); return;
    case 'cobweb':       drawCobweb(ctx, cell, col, row); return;
    case 'urn':          drawUrn(ctx, cell, col, row); return;
    case 'obelisk':      drawObelisk(ctx, cell, th, col, row); return;
    case 'ritualcircle': drawRitualCircle(ctx, cell, col, row, t); return;
    // a World külön kezeli — ide nem jut el
    case 'rock': case 'tree': case 'crate': case 'water': case 'luckrock': return;
  }
}
