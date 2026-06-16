import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { TAU, shade } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Kőkút: kör alakú kávás kút sötét vízzel, két tartóoszloppal, kis
 *  tetővel és kötélen lógó vödörrel. (Téma-kőszínből.) */
export function drawWell(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const r = rad * 0.6;
  const wallTop = cy + rad * 0.04;
  const wallBot = cy + rad * 0.6;
  const ry = r * 0.34;
  const light = shade(th.rock, 0.24);
  const dark = shade(th.rock, -0.28);

  groundShadow(ctx, cx, wallBot, r * 1.05, ry * 1.1);

  // káva-test
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, dark);
  g.addColorStop(0.5, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - r, wallTop);
  ctx.lineTo(cx - r, wallBot);
  ctx.ellipse(cx, wallBot, r, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + r, wallTop);
  ctx.ellipse(cx, wallTop, r, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  // kőtömb-fugák a kávén
  ctx.strokeStyle = th.rockStroke;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const xx = cx - r + (i + 0.5) / 6 * r * 2;
    ctx.beginPath();
    ctx.moveTo(xx, wallTop + ry * 0.4);
    ctx.lineTo(xx, wallBot - 1);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, (wallTop + wallBot) / 2);
  ctx.lineTo(cx + r, (wallTop + wallBot) / 2);
  ctx.stroke();

  // felső káva-perem + sötét víz
  ctx.fillStyle = shade(th.rock, 0.12);
  ctx.beginPath();
  ctx.ellipse(cx, wallTop, r, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = th.rockStroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const wg = ctx.createRadialGradient(cx, wallTop, ry * 0.2, cx, wallTop, r * 0.8);
  wg.addColorStop(0, '#16384e');
  wg.addColorStop(1, '#0a1820');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(cx, wallTop, r * 0.78, ry * 0.78, 0, 0, TAU);
  ctx.fill();
  // víz-csillám
  ctx.fillStyle = 'rgba(120,170,200,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.2, wallTop - ry * 0.1, r * 0.16, ry * 0.12, 0, 0, TAU);
  ctx.fill();

  // tartóoszlopok
  ctx.fillStyle = '#5a3a1c';
  ctx.strokeStyle = '#3a2512';
  ctx.lineWidth = 1.2;
  const postTop = cy - rad * 0.78;
  for (const sx of [-1, 1]) {
    ctx.fillRect(cx + sx * r * 0.82 - rad * 0.05, postTop, rad * 0.1, wallTop - postTop + ry);
    ctx.strokeRect(cx + sx * r * 0.82 - rad * 0.05, postTop, rad * 0.1, wallTop - postTop + ry);
  }
  // henger (kötéldob)
  ctx.fillStyle = '#7c5326';
  roundRectPath(ctx, cx - r * 0.82, postTop + rad * 0.1, r * 1.64, rad * 0.1, rad * 0.04);
  ctx.fill();
  ctx.strokeStyle = '#3a2512';
  ctx.stroke();

  // tető
  ctx.fillStyle = '#7a3f24';
  ctx.beginPath();
  ctx.moveTo(cx, postTop - rad * 0.34);
  ctx.lineTo(cx - r * 1.05, postTop + rad * 0.08);
  ctx.lineTo(cx + r * 1.05, postTop + rad * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4a2515';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // tetőcserép-vonalak
  ctx.strokeStyle = 'rgba(40,20,12,0.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const f = i / 3;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.05 * f, postTop + rad * 0.08 - (postTop + rad * 0.08 - (postTop - rad * 0.34)) * f);
    ctx.lineTo(cx + r * 1.05 * f, postTop + rad * 0.08 - (postTop + rad * 0.08 - (postTop - rad * 0.34)) * f);
    ctx.stroke();
  }

  // kötél + vödör
  ctx.strokeStyle = 'rgba(220,200,150,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.3, postTop + rad * 0.15);
  ctx.lineTo(cx + r * 0.3, wallTop - ry * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#6b4524';
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.3 - rad * 0.08, wallTop - ry * 0.4);
  ctx.lineTo(cx + r * 0.3 + rad * 0.08, wallTop - ry * 0.4);
  ctx.lineTo(cx + r * 0.3 + rad * 0.06, wallTop - ry * 0.08);
  ctx.lineTo(cx + r * 0.3 - rad * 0.06, wallTop - ry * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a2512';
  ctx.stroke();
  void col; void row;
}
