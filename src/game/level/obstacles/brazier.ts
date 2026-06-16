import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow, drawFlame } from './helpers';

/** Vas parázstartó: háromlábú tál izzó parázzsal és élő lánggal, fémes
 *  csillanással. (Animált: `t`.) */
export function drawBrazier(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const bowlY = cy + rad * 0.1;
  const bowlW = rad * 0.6;

  groundShadow(ctx, cx, cy + rad * 0.78, rad * 0.6, rad * 0.16);

  // lábak
  ctx.strokeStyle = '#2a2d31';
  ctx.lineWidth = rad * 0.07;
  ctx.lineCap = 'round';
  for (const sx of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * bowlW * 0.5, bowlY + rad * 0.1);
    ctx.lineTo(cx + sx * bowlW * 0.7, cy + rad * 0.74);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // tál
  const g = ctx.createLinearGradient(0, bowlY - rad * 0.1, 0, bowlY + rad * 0.3);
  g.addColorStop(0, '#5b626a');
  g.addColorStop(1, '#26292d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - bowlW, bowlY);
  ctx.quadraticCurveTo(cx, bowlY + rad * 0.36, cx + bowlW, bowlY);
  ctx.closePath();
  ctx.fill();
  // perem
  ctx.fillStyle = '#4a5159';
  ctx.beginPath();
  ctx.ellipse(cx, bowlY, bowlW, rad * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#22252a';
  ctx.beginPath();
  ctx.ellipse(cx, bowlY, bowlW * 0.82, rad * 0.1, 0, 0, TAU);
  ctx.fill();
  // perem-csúcsfény
  ctx.strokeStyle = 'rgba(200,210,220,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, bowlY, bowlW, rad * 0.14, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  // parázs
  for (let i = 0; i < 6; i++) {
    const ex = cx + (hash2(col + i, row + i) - 0.5) * bowlW * 1.2;
    const ey = bowlY + (hash2(col + i * 2, row + i) - 0.5) * rad * 0.06;
    const glow = 0.5 + 0.5 * Math.sin(t * 4 + i);
    ctx.fillStyle = `rgba(255,${90 + glow * 90},30,${0.6 + glow * 0.4})`;
    ctx.beginPath();
    ctx.arc(ex, ey, rad * 0.04, 0, TAU);
    ctx.fill();
  }

  drawFlame(ctx, cx, bowlY - rad * 0.02, rad * 0.7, rad * 0.6, t, hash2(col, row) * 3);
}
