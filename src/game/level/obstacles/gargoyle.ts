import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Vízköpő (gargoyle): kuporgó, szárnyas, szarvas kőszörny izzó szemmel. */
export function drawGargoyle(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.82;
  groundShadow(ctx, cx, baseY, rad * 0.56, rad * 0.14);
  ctx.fillStyle = '#3e4046'; ctx.strokeStyle = '#26282e'; ctx.lineWidth = 1.4;
  roundRectPath(ctx, cx - rad * 0.44, baseY - rad * 0.16, rad * 0.88, rad * 0.18, rad * 0.02); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#44464e';
  const w = (s: number) => { ctx.beginPath(); ctx.moveTo(cx + s * rad * 0.1, cy - rad * 0.3); ctx.lineTo(cx + s * rad * 0.62, cy - rad * 0.5); ctx.lineTo(cx + s * rad * 0.5, cy + rad * 0.16); ctx.lineTo(cx + s * rad * 0.18, cy + rad * 0.02); ctx.closePath(); ctx.fill(); };
  w(-1); w(1);
  const st = ctx.createLinearGradient(cx - rad * 0.4, 0, cx + rad * 0.4, 0);
  st.addColorStop(0, '#3a3c42'); st.addColorStop(0.5, '#5a5c64'); st.addColorStop(1, '#34363c');
  ctx.fillStyle = st; ctx.strokeStyle = '#26282e'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(cx - rad * 0.3, baseY - rad * 0.16); ctx.quadraticCurveTo(cx - rad * 0.36, cy - rad * 0.18, cx - rad * 0.1, cy - rad * 0.32); ctx.quadraticCurveTo(cx, cy - rad * 0.4, cx + rad * 0.1, cy - rad * 0.32); ctx.quadraticCurveTo(cx + rad * 0.36, cy - rad * 0.18, cx + rad * 0.3, baseY - rad * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy - rad * 0.4, rad * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2c2e34';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rad * 0.12, cy - rad * 0.54); ctx.lineTo(cx + s * rad * 0.26, cy - rad * 0.72); ctx.lineTo(cx + s * rad * 0.2, cy - rad * 0.5); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#ffae3a';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * rad * 0.08, cy - rad * 0.4, rad * 0.045, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#1c1e22'; ctx.beginPath(); ctx.moveTo(cx - rad * 0.08, cy - rad * 0.3); ctx.lineTo(cx + rad * 0.08, cy - rad * 0.3); ctx.lineTo(cx, cy - rad * 0.24); ctx.closePath(); ctx.fill();
  void col; void row;
}
