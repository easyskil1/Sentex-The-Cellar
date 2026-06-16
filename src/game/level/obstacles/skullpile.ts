import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Koponyahalom: piramisba rakott koponyák, lent pár szétszórt csonttal. */
export function drawSkullPile(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.74, r0 = rad * 0.2;
  groundShadow(ctx, cx, baseY + r0 * 0.6, rad * 0.78, rad * 0.18, 0.26);
  const skull = (sx: number, sy: number, sr: number) => {
    ctx.fillStyle = '#d8d2bf'; ctx.strokeStyle = '#9a917c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, sr, Math.PI * 0.92, Math.PI * 0.08); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - sr * 0.72, sy + sr * 0.18); ctx.quadraticCurveTo(sx, sy + sr * 1.05, sx + sr * 0.72, sy + sr * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#26221c';
    ctx.beginPath(); ctx.arc(sx - sr * 0.36, sy - sr * 0.02, sr * 0.26, 0, TAU); ctx.arc(sx + sr * 0.36, sy - sr * 0.02, sr * 0.26, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy + sr * 0.12); ctx.lineTo(sx - sr * 0.13, sy + sr * 0.42); ctx.lineTo(sx + sr * 0.13, sy + sr * 0.42); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9a917c'; ctx.lineWidth = 0.8;
    for (const dx of [-0.26, 0, 0.26]) { ctx.beginPath(); ctx.moveTo(sx + sr * dx, sy + sr * 0.5); ctx.lineTo(sx + sr * dx, sy + sr * 0.78); ctx.stroke(); }
  };
  ctx.strokeStyle = '#c9c2ac'; ctx.lineWidth = Math.max(2, rad * 0.07); ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rad * 0.5, baseY + r0 * 0.3); ctx.lineTo(cx + s * rad * 0.1, baseY + r0 * 0.5); ctx.stroke(); }
  ctx.lineCap = 'butt';
  const pos: Array<[number, number]> = [
    [cx - rad * 0.42, baseY], [cx, baseY], [cx + rad * 0.42, baseY],
    [cx - rad * 0.21, baseY - r0 * 1.7], [cx + rad * 0.21, baseY - r0 * 1.7],
    [cx, baseY - r0 * 3.3],
  ];
  for (const [sx, sy] of pos) skull(sx, sy, r0);
  void col; void row;
}
