import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Virágos fűcsomó: fölfelé legyező fűszálak néhány apró vadvirággal,
 *  enyhén ringva. Könnyű, dekoratív talajtárgy. (Animált: `t`.) */
export function drawGrassTuft(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.58;
  const sway = Math.sin(t * 1.4 + hash2(col, row) * 6) * rad * 0.06;

  groundShadow(ctx, cx, baseY + rad * 0.06, rad * 0.5, rad * 0.12, 0.2);

  // fűszálak
  const blades = 11;
  for (let i = 0; i < blades; i++) {
    const f = i / (blades - 1) - 0.5;
    const baseX = cx + f * rad * 0.7;
    const h = rad * (0.7 + 0.5 * hash2(col + i, row + i * 2));
    const lean = f * rad * 0.5 + sway * (0.5 + Math.abs(f));
    const tipX = baseX + lean;
    const tipY = baseY - h;
    const dark = i % 2 === 0;
    ctx.strokeStyle = dark ? '#2f6b2a' : '#479238';
    ctx.lineWidth = Math.max(1.2, rad * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + lean * 0.4, baseY - h * 0.6, tipX, tipY);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // vadvirágok pár szálon
  const flowers = [
    { x: -0.26, h: 0.82, c: '#f2c94c' },
    { x: 0.18, h: 0.96, c: '#e8e8ee' },
    { x: 0.34, h: 0.66, c: '#b07ad6' },
  ];
  for (let i = 0; i < flowers.length; i++) {
    const fl = flowers[i]!;
    const baseX = cx + fl.x * rad * 0.7;
    const h = rad * fl.h;
    const lean = fl.x * rad * 0.5 + sway;
    const fx = baseX + lean;
    const fy = baseY - h;
    // szár
    ctx.strokeStyle = '#3c7e34';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + lean * 0.4, baseY - h * 0.6, fx, fy);
    ctx.stroke();
    // szirmok
    ctx.fillStyle = fl.c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU + i;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(a) * rad * 0.08, fy + Math.sin(a) * rad * 0.08, rad * 0.06, rad * 0.035, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#f7b733';
    ctx.beginPath();
    ctx.arc(fx, fy, rad * 0.045, 0, TAU);
    ctx.fill();
  }
}
