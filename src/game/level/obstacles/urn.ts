import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Temetkezési urna: kővázа talapzaton, füllel, fedéllel. */
export function drawUrn(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.78, neckY = cy - rad * 0.42;
  groundShadow(ctx, cx, baseY, rad * 0.42, rad * 0.12);
  ctx.fillStyle = '#54565c'; ctx.strokeStyle = '#34363c'; ctx.lineWidth = 1.4;
  roundRectPath(ctx, cx - rad * 0.26, baseY - rad * 0.12, rad * 0.52, rad * 0.14, rad * 0.02); ctx.fill(); ctx.stroke();
  const g = ctx.createLinearGradient(cx - rad * 0.36, 0, cx + rad * 0.36, 0);
  g.addColorStop(0, '#52545a'); g.addColorStop(0.45, '#83868c'); g.addColorStop(1, '#4a4c52');
  ctx.fillStyle = g; ctx.strokeStyle = '#34363c'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.12, baseY - rad * 0.12);
  ctx.quadraticCurveTo(cx - rad * 0.4, cy + rad * 0.12, cx - rad * 0.28, neckY + rad * 0.12);
  ctx.quadraticCurveTo(cx - rad * 0.24, neckY, cx - rad * 0.3, neckY);
  ctx.lineTo(cx + rad * 0.3, neckY);
  ctx.quadraticCurveTo(cx + rad * 0.24, neckY, cx + rad * 0.28, neckY + rad * 0.12);
  ctx.quadraticCurveTo(cx + rad * 0.4, cy + rad * 0.12, cx + rad * 0.12, baseY - rad * 0.12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const s of [-1, 1]) { ctx.strokeStyle = '#3a3c42'; ctx.lineWidth = Math.max(2, rad * 0.05); ctx.beginPath(); ctx.arc(cx + s * rad * 0.3, cy - rad * 0.14, rad * 0.12, Math.PI * 1.3, Math.PI * 0.3, s < 0); ctx.stroke(); }
  ctx.fillStyle = '#6a6c72'; ctx.strokeStyle = '#34363c'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(cx, neckY, rad * 0.3, rad * 0.07, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7e8086'; ctx.beginPath(); ctx.ellipse(cx, neckY - rad * 0.06, rad * 0.16, rad * 0.05, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - rad * 0.24, neckY + rad * 0.16); ctx.quadraticCurveTo(cx - rad * 0.33, cy + rad * 0.1, cx - rad * 0.13, baseY - rad * 0.14); ctx.stroke();
  void col; void row;
}
