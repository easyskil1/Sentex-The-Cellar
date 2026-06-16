import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow, drawFlame } from './helpers';

/** Tábortűz: körberakott kövek, keresztbe tett hasábok és élő láng
 *  parázzsal, fény-udvarral. (Animált: `t`.) */
export function drawCampfire(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const ringY = cy + rad * 0.36;

  groundShadow(ctx, cx, ringY + rad * 0.06, rad * 0.78, rad * 0.2);

  // kőkör (hátsó kövek)
  const drawRing = (back: boolean) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const isBack = Math.sin(a) < 0;
      if (isBack !== back) continue;
      const sx = cx + Math.cos(a) * rad * 0.62;
      const sy = ringY + Math.sin(a) * rad * 0.28;
      const g = ctx.createLinearGradient(sx, sy - rad * 0.1, sx, sy + rad * 0.1);
      g.addColorStop(0, '#8a8a92');
      g.addColorStop(1, '#4a4a52');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#33333a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rad * 0.12, rad * 0.1, a * 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  };
  drawRing(true);

  // keresztbe tett hasábok
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const ang = i ? 0.5 : -0.5;
    ctx.save();
    ctx.translate(cx, ringY);
    ctx.rotate(ang);
    ctx.strokeStyle = '#5a3a1c';
    ctx.lineWidth = rad * 0.13;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.5, 0);
    ctx.lineTo(rad * 0.5, 0);
    ctx.stroke();
    // véglap-izzás
    ctx.fillStyle = '#a9824e';
    ctx.beginPath();
    ctx.arc(-rad * 0.5, 0, rad * 0.06, 0, TAU);
    ctx.arc(rad * 0.5, 0, rad * 0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = 'butt';

  // parázs a hasábok között
  for (let i = 0; i < 5; i++) {
    const ex = cx + (hash2(col + i, row + i) - 0.5) * rad * 0.5;
    const ey = ringY + (hash2(col + i * 2, row + i) - 0.5) * rad * 0.12;
    const glow = 0.5 + 0.5 * Math.sin(t * 5 + i);
    ctx.fillStyle = `rgba(255,${90 + glow * 100},30,${0.6 + glow * 0.4})`;
    ctx.beginPath();
    ctx.arc(ex, ey, rad * 0.045, 0, TAU);
    ctx.fill();
  }

  drawFlame(ctx, cx, ringY - rad * 0.02, rad * 0.8, rad * 0.74, t, hash2(col, row) * 4);

  // elülső kövek (a láng tövét takarják)
  drawRing(false);
}
