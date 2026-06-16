import type { Rect } from '../../types';
import { hash2 } from '../../../engine/math';
import { groundShadow, drawFlame, roundRectPath } from './helpers';

/** Álló fáklya: fa nyél, körültekert rongyos fej és élő, lobogó láng
 *  fény-udvarral. (Animált: `t`.) */
export function drawTorch(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.8;
  const headY = cy - rad * 0.2;

  groundShadow(ctx, cx, baseY, rad * 0.32, rad * 0.1, 0.3);

  // nyél
  const pg = ctx.createLinearGradient(cx - rad * 0.08, 0, cx + rad * 0.08, 0);
  pg.addColorStop(0, '#3c2613');
  pg.addColorStop(0.5, '#6b4524');
  pg.addColorStop(1, '#3c2613');
  ctx.fillStyle = pg;
  roundRectPath(ctx, cx - rad * 0.07, headY, rad * 0.14, baseY - headY, rad * 0.06);
  ctx.fill();

  // körültekert rongyos fej
  ctx.fillStyle = '#5a4326';
  roundRectPath(ctx, cx - rad * 0.16, headY - rad * 0.12, rad * 0.32, rad * 0.26, rad * 0.06);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,8,0.6)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const yy = headY - rad * 0.08 + i * rad * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - rad * 0.16, yy);
    ctx.lineTo(cx + rad * 0.16, yy + rad * 0.04);
    ctx.stroke();
  }

  drawFlame(ctx, cx, headY - rad * 0.08, rad * 0.4, rad * 0.66, t, hash2(col, row) * 5);
}
