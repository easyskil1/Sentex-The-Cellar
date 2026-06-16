import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Nádas: víz menti magas, vékony nádszálak barna buzogány-fejekkel,
 *  enyhén ringva. (Animált: `t`.) */
export function drawReeds(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.66;

  groundShadow(ctx, cx, baseY + rad * 0.04, rad * 0.5, rad * 0.1, 0.18);

  const stalks = [
    { x: -0.34, h: 0.95, cat: true },
    { x: -0.1, h: 1.2, cat: true },
    { x: 0.14, h: 1.05, cat: false },
    { x: 0.34, h: 1.32, cat: true },
    { x: 0.0, h: 0.8, cat: false },
    { x: -0.22, h: 1.1, cat: false },
  ];
  // hátulról előre (magasság szerint)
  const order = [...stalks.keys()].sort((a, b) => stalks[a]!.h - stalks[b]!.h);
  for (const idx of order) {
    const s = stalks[idx]!;
    const baseX = cx + s.x * rad * 0.8;
    const h = rad * s.h;
    const sway = Math.sin(t * 1.2 + idx + hash2(col, row) * 5) * rad * 0.1 * s.h;
    const tipX = baseX + sway;
    const tipY = baseY - h;
    // szár
    ctx.strokeStyle = '#5f7d32';
    ctx.lineWidth = Math.max(1.4, rad * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + sway * 0.4, baseY - h * 0.55, tipX, tipY);
    ctx.stroke();
    // világos szár-él
    ctx.strokeStyle = 'rgba(160,190,110,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + sway * 0.4, baseY - h * 0.55, tipX, tipY);
    ctx.stroke();
    if (s.cat) {
      // buzogány-fej
      const cg = ctx.createLinearGradient(tipX - 3, 0, tipX + 3, 0);
      cg.addColorStop(0, '#5a3a1c');
      cg.addColorStop(0.5, '#8a5a2c');
      cg.addColorStop(1, '#4a2f16');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY + rad * 0.18, rad * 0.07, rad * 0.2, 0, 0, TAU);
      ctx.fill();
      // hegyes folytatás fent
      ctx.strokeStyle = '#6f8a3a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY + rad * 0.02);
      ctx.lineTo(tipX + sway * 0.1, tipY - rad * 0.16);
      ctx.stroke();
    } else {
      // levél-csúcs
      ctx.strokeStyle = '#6f8a3a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + rad * 0.1, tipY - rad * 0.18);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}
