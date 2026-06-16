import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Fatönk: kivágott fa maradéka — koncentrikus évgyűrűs vágott felület, kérges
 *  oldal, szétterülő gyökerek és egy kis moha a peremén. */
export function drawStump(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const topR = rad * 0.6;
  const topY = cy - rad * 0.18;
  const botY = cy + rad * 0.4;
  const topRy = topR * 0.42;

  groundShadow(ctx, cx, botY + rad * 0.12, rad * 0.82, rad * 0.24);

  // gyökerek
  ctx.fillStyle = '#4a3018';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.25 + i * (Math.PI / 2) * 1.0 + 0.3;
    const rx = cx + Math.cos(a) * topR * 0.9;
    const ry = botY + Math.abs(Math.sin(a)) * rad * 0.06;
    ctx.beginPath();
    ctx.moveTo(rx, ry - rad * 0.08);
    ctx.quadraticCurveTo(rx + Math.cos(a) * rad * 0.3, ry + rad * 0.06, rx + Math.cos(a) * rad * 0.42, botY + rad * 0.12);
    ctx.lineTo(rx + Math.cos(a) * rad * 0.18, botY + rad * 0.16);
    ctx.quadraticCurveTo(rx, ry + rad * 0.04, rx, ry + rad * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  // oldal (kéreg)
  const sg = ctx.createLinearGradient(cx - topR, 0, cx + topR, 0);
  sg.addColorStop(0, '#3c2613');
  sg.addColorStop(0.5, '#6b4524');
  sg.addColorStop(1, '#3c2613');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(cx - topR, topY);
  ctx.lineTo(cx - topR, botY);
  ctx.ellipse(cx, botY, topR, topRy, 0, Math.PI, 0, true);
  ctx.lineTo(cx + topR, topY);
  ctx.ellipse(cx, topY, topR, topRy, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  // függőleges kéreg-barázdák
  ctx.strokeStyle = 'rgba(30,18,8,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const xx = cx - topR + (i + 0.5) / 6 * topR * 2;
    ctx.beginPath();
    ctx.moveTo(xx, topY + topRy * 0.5);
    ctx.lineTo(xx, botY - 2 + Math.sin(i) * 2);
    ctx.stroke();
  }

  // vágott felület + évgyűrűk
  ctx.fillStyle = '#a9824e';
  ctx.beginPath();
  ctx.ellipse(cx, topY, topR, topRy, 0, 0, TAU);
  ctx.fill();
  const ringCx = cx + (hash2(col, row) - 0.5) * topR * 0.3;
  const ringCy = topY + (hash2(col + 1, row + 1) - 0.5) * topRy * 0.3;
  ctx.strokeStyle = 'rgba(90,60,30,0.7)';
  ctx.lineWidth = 1;
  for (let r = 1; r <= 5; r++) {
    const f = r / 5.5;
    ctx.beginPath();
    ctx.ellipse(ringCx + (cx - ringCx) * (1 - f) * 0.2, ringCy, topR * f, topRy * f, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,40,20,0.8)';
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, 1.6, 0, TAU);
  ctx.fill();
  // repedés a középről kifelé
  ctx.strokeStyle = 'rgba(60,40,20,0.6)';
  ctx.beginPath();
  ctx.moveTo(ringCx, ringCy);
  ctx.lineTo(cx + Math.cos(1) * topR, topY + Math.sin(1) * topRy);
  ctx.stroke();
  // perem-csúcsfény
  ctx.strokeStyle = 'rgba(220,190,140,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, topY, topR - 1, topRy - 1, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // kis moha a peremen
  ctx.fillStyle = '#3f7a32';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.15 + i * 0.4;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * topR, topY + Math.sin(a) * topRy, rad * 0.07, 0, TAU);
    ctx.fill();
  }
}
