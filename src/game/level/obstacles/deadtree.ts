import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Holt fa: teljesen lombtalan, göcsörtös, szétágazó száraz fa egy odúval —
 *  baljós, csupasz sziluett. (A „száraz fá"-tól eltérően nincs rajta levél.) */
export function drawDeadTree(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.74;
  const forkY = cy - rad * 0.1;

  groundShadow(ctx, cx + rad * 0.06, cy + rad * 0.78, rad * 0.66, rad * 0.24);

  ctx.strokeStyle = '#4a3a2c';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // törzs
  ctx.lineWidth = rad * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.03, baseY);
  ctx.quadraticCurveTo(cx + rad * 0.08, (baseY + forkY) / 2, cx, forkY);
  ctx.stroke();

  // rekurzív-szerű ágak (kézzel, 2 szint)
  const limb = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    const mx = x + Math.cos(ang) * len * 0.5 + (hash2(col + depth, row + len) - 0.5) * rad * 0.1;
    const my = y + Math.sin(ang) * len * 0.5;
    ctx.lineWidth = Math.max(1, w);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    if (depth > 0) {
      limb(ex, ey, ang - 0.5 - hash2(col + depth, row) * 0.3, len * 0.62, w * 0.6, depth - 1);
      limb(ex, ey, ang + 0.4 + hash2(row + depth, col) * 0.3, len * 0.6, w * 0.6, depth - 1);
      if (depth > 1) limb(ex, ey, ang + 0.05, len * 0.55, w * 0.55, depth - 1);
    }
  };
  limb(cx, forkY, -2.0, rad * 0.5, rad * 0.13, 2);
  limb(cx, forkY, -1.2, rad * 0.56, rad * 0.13, 2);
  limb(cx, forkY, -0.5, rad * 0.46, rad * 0.11, 2);
  limb(cx, forkY, -2.7, rad * 0.4, rad * 0.1, 2);
  ctx.lineCap = 'butt';

  // világos oldalél a törzsön
  ctx.strokeStyle = 'rgba(150,120,90,0.45)';
  ctx.lineWidth = rad * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.07, baseY - 2);
  ctx.quadraticCurveTo(cx, (baseY + forkY) / 2, cx - rad * 0.04, forkY);
  ctx.stroke();

  // odú
  ctx.fillStyle = '#1a120a';
  ctx.beginPath();
  ctx.ellipse(cx + rad * 0.02, cy + rad * 0.2, rad * 0.08, rad * 0.13, 0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,120,90,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
