import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Kőangyal: leszegett fejű, szárnyas köpenyes szobor talapzaton. */
export function drawAngelStatue(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.82, topY = cy - rad * 0.66;
  groundShadow(ctx, cx, baseY, rad * 0.6, rad * 0.16);
  const pl = ctx.createLinearGradient(cx - rad * 0.5, 0, cx + rad * 0.5, 0);
  pl.addColorStop(0, '#4e5056'); pl.addColorStop(0.5, '#6e7076'); pl.addColorStop(1, '#44464c');
  ctx.fillStyle = pl; ctx.strokeStyle = '#34363c'; ctx.lineWidth = 1.4;
  roundRectPath(ctx, cx - rad * 0.5, baseY - rad * 0.18, rad, rad * 0.2, rad * 0.03); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#76797f';
  const wing = (s: number) => { ctx.beginPath(); ctx.moveTo(cx, cy - rad * 0.18); ctx.quadraticCurveTo(cx + s * rad * 0.72, cy - rad * 0.48, cx + s * rad * 0.56, cy + rad * 0.22); ctx.quadraticCurveTo(cx + s * rad * 0.3, cy - rad * 0.02, cx, cy - rad * 0.08); ctx.closePath(); ctx.fill(); };
  wing(-1); wing(1);
  ctx.strokeStyle = 'rgba(48,50,56,0.45)'; ctx.lineWidth = 1;
  for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + s * rad * 0.12 * i, cy - rad * 0.1); ctx.lineTo(cx + s * rad * (0.2 + 0.12 * i), cy + rad * 0.16); ctx.stroke(); }
  const robe = ctx.createLinearGradient(cx - rad * 0.3, 0, cx + rad * 0.3, 0);
  robe.addColorStop(0, '#5a5c62'); robe.addColorStop(0.45, '#8e9096'); robe.addColorStop(1, '#52545a');
  ctx.fillStyle = robe; ctx.strokeStyle = '#3a3c42'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.16, topY + rad * 0.42); ctx.lineTo(cx + rad * 0.16, topY + rad * 0.42);
  ctx.lineTo(cx + rad * 0.32, baseY - rad * 0.16); ctx.lineTo(cx - rad * 0.32, baseY - rad * 0.16);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,42,48,0.4)'; ctx.lineWidth = 1;
  for (const s of [-0.12, 0, 0.12]) { ctx.beginPath(); ctx.moveTo(cx + s * rad, topY + rad * 0.52); ctx.lineTo(cx + s * rad * 1.7, baseY - rad * 0.18); ctx.stroke(); }
  ctx.fillStyle = '#9a9ca2'; ctx.strokeStyle = '#4a4c52'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, topY + rad * 0.3, rad * 0.17, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,235,255,0.16)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, topY + rad * 0.26, rad * 0.24, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  void col; void row;
}
