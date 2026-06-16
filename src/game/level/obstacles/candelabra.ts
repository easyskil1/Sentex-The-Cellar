import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, drawFlame } from './helpers';

/** Kandeláber: kovácsoltvas gyertyatartó három lángoló gyertyával. */
export function drawCandelabra(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.78, poleTop = cy - rad * 0.28;
  void col; void row;
  groundShadow(ctx, cx, baseY, rad * 0.36, rad * 0.12);
  ctx.fillStyle = '#33353b';
  ctx.beginPath(); ctx.moveTo(cx - rad * 0.24, baseY - rad * 0.04); ctx.lineTo(cx + rad * 0.24, baseY - rad * 0.04); ctx.lineTo(cx + rad * 0.12, baseY - rad * 0.2); ctx.lineTo(cx - rad * 0.12, baseY - rad * 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a2c32'; ctx.lineWidth = Math.max(2, rad * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, baseY - rad * 0.12); ctx.lineTo(cx, poleTop); ctx.stroke();
  ctx.lineWidth = Math.max(2, rad * 0.07);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, poleTop + rad * 0.14); ctx.quadraticCurveTo(cx + s * rad * 0.36, poleTop + rad * 0.04, cx + s * rad * 0.36, poleTop - rad * 0.02); ctx.stroke(); }
  ctx.lineCap = 'butt';
  const arms = [{ x: cx, y: poleTop - rad * 0.04 }, { x: cx - rad * 0.36, y: poleTop - rad * 0.02 }, { x: cx + rad * 0.36, y: poleTop - rad * 0.02 }];
  for (let i = 0; i < arms.length; i++) {
    const a = arms[i]!;
    ctx.fillStyle = '#dcd6c4'; ctx.fillRect(a.x - rad * 0.045, a.y - rad * 0.22, rad * 0.09, rad * 0.22);
    ctx.fillStyle = 'rgba(220,214,196,0.7)'; ctx.beginPath(); ctx.ellipse(a.x, a.y, rad * 0.06, rad * 0.03, 0, 0, TAU); ctx.fill();
    drawFlame(ctx, a.x, a.y - rad * 0.22, rad * 0.17, rad * 0.32, t, i * 3 + 1, false);
  }
}
