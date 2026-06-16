import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';

/** Lecsüngő indák: a cella tetejéről aláhulló kúszónövény-szálak apró
 *  levelekkel, lágyan ringva. (Animált: `t`.) */
export function drawVines(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const topY = cell.y + 1;
  const rad = Math.min(cell.w, cell.h) * 0.5;

  const strands = 5;
  for (let i = 0; i < strands; i++) {
    const sx = cell.x + (i + 0.5) / strands * cell.w + (hash2(col + i, row) - 0.5) * rad * 0.2;
    const len = cell.h * (0.5 + 0.42 * hash2(col + i * 2, row + i));
    const sway = Math.sin(t * 1.3 + i + hash2(col, row) * 5) * rad * 0.16;
    const midX = sx + sway * 0.5;
    const endX = sx + sway;
    const endY = topY + len;
    const dark = i % 2 === 0;
    ctx.strokeStyle = dark ? '#2f6b27' : '#3f8a30';
    ctx.lineWidth = Math.max(1.4, rad * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, topY);
    ctx.quadraticCurveTo(midX, topY + len * 0.5, endX, endY);
    ctx.stroke();

    // levelek a szál mentén
    ctx.fillStyle = dark ? '#357a2b' : '#4f9a38';
    const leaves = 5;
    for (let l = 1; l <= leaves; l++) {
      const tt = l / (leaves + 0.5);
      const px = (1 - tt) * (1 - tt) * sx + 2 * (1 - tt) * tt * midX + tt * tt * endX;
      const py = (1 - tt) * (1 - tt) * topY + 2 * (1 - tt) * tt * (topY + len * 0.5) + tt * tt * endY;
      const side = l % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(side * 0.6 + sway * 0.04);
      ctx.beginPath();
      ctx.ellipse(side * rad * 0.1, 0, rad * 0.1, rad * 0.05, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // csúcsbimbó
    ctx.fillStyle = '#6fb84d';
    ctx.beginPath();
    ctx.arc(endX, endY, rad * 0.045, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}
