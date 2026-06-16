import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { shade } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Obeliszk: csúcsos tetejű, elkeskenyedő kőmonolit talapzaton. */
export function drawObelisk(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.82, topY = cy - rad * 0.74;
  const halfBot = rad * 0.2, halfTop = rad * 0.1, shaftTop = topY + rad * 0.22;
  groundShadow(ctx, cx, baseY, rad * 0.5, rad * 0.14);
  const dark = shade(th.rock, -0.28), light = shade(th.rock, 0.22);
  ctx.fillStyle = shade(th.rock, -0.12); ctx.strokeStyle = th.rockStroke; ctx.lineWidth = 1.4;
  roundRectPath(ctx, cx - rad * 0.3, baseY - rad * 0.16, rad * 0.6, rad * 0.16, rad * 0.02); ctx.fill(); ctx.stroke();
  roundRectPath(ctx, cx - halfBot * 1.2, baseY - rad * 0.26, halfBot * 2.4, rad * 0.12, rad * 0.02); ctx.fill(); ctx.stroke();
  const g = ctx.createLinearGradient(cx - halfBot, 0, cx + halfBot, 0);
  g.addColorStop(0, dark); g.addColorStop(0.5, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.strokeStyle = th.rockStroke; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - halfBot, baseY - rad * 0.26); ctx.lineTo(cx - halfTop, shaftTop); ctx.lineTo(cx + halfTop, shaftTop); ctx.lineTo(cx + halfBot, baseY - rad * 0.26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(cx - halfTop, shaftTop); ctx.lineTo(cx, topY); ctx.lineTo(cx + halfTop, shaftTop); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - halfBot + 1, baseY - rad * 0.28); ctx.lineTo(cx - halfTop + 1, shaftTop); ctx.stroke();
  ctx.strokeStyle = shade(th.rock, -0.4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, shaftTop + rad * 0.1); ctx.lineTo(cx, baseY - rad * 0.3); ctx.stroke();
  void col; void row;
}
