import type { Rect } from '../../types';
import { hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Koporsó: hatszög-sziluettű álló fakoporsó, vasalással és kereszttel. */
export function drawCoffin(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const w = rad * 0.5;
  const headW = w * 0.62;
  const topY = cy - rad * 0.78, botY = cy + rad * 0.82, shoulderY = cy - rad * 0.36;
  const tilt = (hash2(col, row) - 0.5) * 0.08;
  groundShadow(ctx, cx, botY, w * 1.3, rad * 0.16);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(tilt); ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.moveTo(cx - headW, topY); ctx.lineTo(cx + headW, topY);
  ctx.lineTo(cx + w, shoulderY); ctx.lineTo(cx + w * 0.42, botY);
  ctx.lineTo(cx - w * 0.42, botY); ctx.lineTo(cx - w, shoulderY);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, '#3a2718'); g.addColorStop(0.5, '#5e4128'); g.addColorStop(1, '#2c1d11');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#1c120a'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = 'rgba(20,12,6,0.5)'; ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) { const px = cx + i * w * 0.5; ctx.beginPath(); ctx.moveTo(px, topY + 2); ctx.lineTo(px, botY - 2); ctx.stroke(); }
  ctx.strokeStyle = '#6a6a74'; ctx.lineWidth = Math.max(2, rad * 0.06);
  for (const yy of [shoulderY + rad * 0.16, cy + rad * 0.34]) { ctx.beginPath(); ctx.moveTo(cx - w * 0.92, yy); ctx.lineTo(cx + w * 0.92, yy); ctx.stroke(); }
  ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = Math.max(2, rad * 0.06);
  ctx.beginPath(); ctx.moveTo(cx, topY + rad * 0.18); ctx.lineTo(cx, shoulderY); ctx.moveTo(cx - headW * 0.5, topY + rad * 0.34); ctx.lineTo(cx + headW * 0.5, topY + rad * 0.34); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,0.18)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - headW + 1, topY + 1); ctx.lineTo(cx - w + 1, shoulderY); ctx.stroke();
  ctx.restore();
}
