import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Vaskerítés: kovácsoltvas rács lándzsahegyes pálcákkal, rozsdafoltokkal. */
export function drawIronFence(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const topY = cy - rad * 0.5, baseY = cy + rad * 0.72;
  const left = cx - rad * 0.82, right = cx + rad * 0.82;
  groundShadow(ctx, cx, baseY, rad * 0.8, rad * 0.1, 0.22);
  ctx.fillStyle = '#26282e';
  for (const yy of [topY + rad * 0.18, baseY - rad * 0.16]) ctx.fillRect(left, yy, right - left, rad * 0.07);
  const bars = 5;
  for (let i = 0; i < bars; i++) {
    const bx = left + (i + 0.5) / bars * (right - left);
    ctx.fillStyle = '#2c2e34';
    ctx.fillRect(bx - rad * 0.03, topY, rad * 0.06, baseY - topY);
    ctx.beginPath(); ctx.moveTo(bx - rad * 0.07, topY + rad * 0.02); ctx.lineTo(bx, topY - rad * 0.16); ctx.lineTo(bx + rad * 0.07, topY + rad * 0.02); ctx.closePath(); ctx.fill();
    if (hash2(col + i, row) > 0.6) { ctx.fillStyle = 'rgba(150,80,40,0.4)'; ctx.beginPath(); ctx.arc(bx, cy + rad * (hash2(i, row) - 0.5) * 0.4, rad * 0.05, 0, TAU); ctx.fill(); }
  }
  ctx.strokeStyle = 'rgba(120,124,134,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left + 1, topY + rad * 0.18 + 1); ctx.lineTo(right - 1, topY + rad * 0.18 + 1); ctx.stroke();
}
