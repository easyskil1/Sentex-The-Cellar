import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { TAU, shade, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Törött oszlop: kanellúrázott (hornyolt) kőoszlop letört, csorba tetővel,
 *  talapzaton, körülötte törmelékkel. (Téma-kőszínből.) */
export function drawBrokenPillar(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const w = rad * 0.5;
  const baseY = cy + rad * 0.6;
  const breakY = cy - rad * 0.3;
  const light = shade(th.rock, 0.3);
  const dark = shade(th.rock, -0.26);

  groundShadow(ctx, cx, baseY + rad * 0.06, rad * 0.7, rad * 0.18);

  // talapzat
  ctx.fillStyle = shade(th.rock, -0.05);
  ctx.fillRect(cx - w * 1.3, baseY - rad * 0.12, w * 2.6, rad * 0.18);
  ctx.strokeStyle = th.rockStroke;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(cx - w * 1.3, baseY - rad * 0.12, w * 2.6, rad * 0.18);

  // törmelék-darabok
  ctx.fillStyle = shade(th.rock, 0.05);
  for (let i = 0; i < 3; i++) {
    const rx = cx + (i - 1) * rad * 0.5 + (hash2(col + i, row) - 0.5) * rad * 0.2;
    const ry = baseY + rad * 0.04;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rad * 0.12, rad * 0.07, hash2(i, col) * TAU, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = th.rockStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // oszloptest
  const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, dark);
  g.addColorStop(0.4, light);
  g.addColorStop(0.6, shade(th.rock, 0.1));
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w, baseY - rad * 0.1);
  ctx.lineTo(cx - w * 0.94, breakY + rad * 0.04);
  // csorba törésvonal
  ctx.lineTo(cx - w * 0.5, breakY - rad * 0.04);
  ctx.lineTo(cx - w * 0.1, breakY + rad * 0.06);
  ctx.lineTo(cx + w * 0.3, breakY - rad * 0.06);
  ctx.lineTo(cx + w * 0.7, breakY + rad * 0.02);
  ctx.lineTo(cx + w * 0.94, breakY - rad * 0.02);
  ctx.lineTo(cx + w, baseY - rad * 0.1);
  ctx.closePath();
  ctx.fill();

  // kanellúrák (függőleges hornyok)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    const xx = cx + i * w * 0.32;
    ctx.beginPath();
    ctx.moveTo(xx, breakY + rad * 0.04);
    ctx.lineTo(xx, baseY - rad * 0.12);
    ctx.stroke();
  }
  // törésfelület (világos perem)
  ctx.fillStyle = shade(th.rock, 0.34);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.94, breakY + rad * 0.04);
  ctx.lineTo(cx - w * 0.5, breakY - rad * 0.04);
  ctx.lineTo(cx - w * 0.1, breakY + rad * 0.06);
  ctx.lineTo(cx + w * 0.3, breakY - rad * 0.06);
  ctx.lineTo(cx + w * 0.7, breakY + rad * 0.02);
  ctx.lineTo(cx + w * 0.94, breakY - rad * 0.02);
  ctx.lineTo(cx + w * 0.7, breakY + rad * 0.08);
  ctx.lineTo(cx + w * 0.3, breakY);
  ctx.lineTo(cx - w * 0.1, breakY + rad * 0.12);
  ctx.lineTo(cx - w * 0.5, breakY + rad * 0.02);
  ctx.closePath();
  ctx.fill();
}
