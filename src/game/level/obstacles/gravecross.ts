import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Sírkereszt: dőlt kőkereszt földkupacban, mohafoltokkal. */
export function drawGraveCross(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const tilt = (hash2(col, row) - 0.5) * 0.18;
  const armW = rad * 0.15, armSpan = rad * 0.42;
  const topY = cy - rad * 0.7, botY = cy + rad * 0.6, crossY = cy - rad * 0.28;
  groundShadow(ctx, cx, botY, rad * 0.5, rad * 0.14);
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath(); ctx.ellipse(cx, botY, rad * 0.5, rad * 0.16, 0, Math.PI, 0); ctx.fill();
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(tilt); ctx.translate(-cx, -cy);
  const s = ctx.createLinearGradient(cx - armW, 0, cx + armW, 0);
  s.addColorStop(0, '#5a5c62'); s.addColorStop(0.5, '#85888e'); s.addColorStop(1, '#4e5056');
  ctx.fillStyle = s; ctx.strokeStyle = '#34363c'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(cx - armW, topY, armW * 2, botY - topY); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - armSpan, crossY - armW, armSpan * 2, armW * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - armW + 1, topY + 2); ctx.lineTo(cx - armW + 1, botY - 2); ctx.stroke();
  ctx.fillStyle = 'rgba(70,110,50,0.45)';
  ctx.beginPath(); ctx.ellipse(cx - armW * 0.2, crossY + armW * 0.6, armW * 0.9, armW * 0.5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + armW * 0.3, botY - rad * 0.12, armW * 0.7, armW * 0.4, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
