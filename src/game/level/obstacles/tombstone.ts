import type { Rect } from '../../types';
import { hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Sírkő: ívelt tetejű, mállott kőlap repedéssel és bevésett kereszttel,
 *  enyhén megdőlve, a tövénél fűcsomókkal. */
export function drawTombstone(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const tilt = (hash2(col, row) - 0.5) * 0.12;
  const w = rad * 0.62;
  const topY = cy - rad * 0.62;
  const botY = cy + rad * 0.62;

  groundShadow(ctx, cx, botY, rad * 0.66, rad * 0.16);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy);

  // kőlap
  const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, '#5e6066');
  g.addColorStop(0.5, '#878a90');
  g.addColorStop(1, '#54565c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w, botY);
  ctx.lineTo(cx - w, topY + w);
  ctx.arc(cx, topY + w, w, Math.PI, 0);
  ctx.lineTo(cx + w, botY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3c3e44';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // belső süllyesztett mező
  ctx.strokeStyle = 'rgba(40,42,48,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.72, botY - rad * 0.1);
  ctx.lineTo(cx - w * 0.72, topY + w);
  ctx.arc(cx, topY + w, w * 0.72, Math.PI, 0);
  ctx.lineTo(cx + w * 0.72, botY - rad * 0.1);
  ctx.stroke();

  // bevésett kereszt
  ctx.strokeStyle = 'rgba(40,42,48,0.7)';
  ctx.lineWidth = Math.max(2, rad * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx, topY + w * 0.4);
  ctx.lineTo(cx, topY + w * 1.5);
  ctx.moveTo(cx - w * 0.32, topY + w * 0.78);
  ctx.lineTo(cx + w * 0.32, topY + w * 0.78);
  ctx.stroke();
  // bal él csúcsfénye
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - w + 1, botY);
  ctx.lineTo(cx - w + 1, topY + w);
  ctx.stroke();

  // repedés
  ctx.strokeStyle = 'rgba(30,32,38,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.5, topY + w * 0.2);
  ctx.lineTo(cx + w * 0.3, cy);
  ctx.lineTo(cx + w * 0.5, botY - rad * 0.1);
  ctx.stroke();
  ctx.restore();

  // fű a tövénél
  ctx.strokeStyle = '#3f8a34';
  ctx.lineWidth = Math.max(1.2, rad * 0.04);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const bx = cx + (hash2(col + i, row + i) - 0.5) * w * 2;
    ctx.beginPath();
    ctx.moveTo(bx, botY + rad * 0.02);
    ctx.quadraticCurveTo(bx + (i % 2 ? 4 : -4), botY - rad * 0.12, bx + (i % 2 ? 7 : -7), botY - rad * 0.2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
