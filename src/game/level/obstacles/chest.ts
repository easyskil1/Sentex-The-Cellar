import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Kincsesláda: ívelt fedelű fatest fém pántokkal, zárral és aranyló
 *  fény-réssel a fedél alatt. */
export function drawChest(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const w = rad * 0.84;
  const bodyTop = cy - rad * 0.02;
  const botY = cy + rad * 0.56;
  const lidTop = cy - rad * 0.5;

  groundShadow(ctx, cx, botY + rad * 0.04, w * 0.92, rad * 0.14);

  // test
  const bg = ctx.createLinearGradient(0, bodyTop, 0, botY);
  bg.addColorStop(0, '#8a5a2c');
  bg.addColorStop(1, '#5a3a1c');
  ctx.fillStyle = bg;
  roundRectPath(ctx, cx - w, bodyTop, w * 2, botY - bodyTop, rad * 0.06);
  ctx.fill();
  // fa-deszkák
  ctx.strokeStyle = 'rgba(40,24,12,0.5)';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 3; i++) {
    const yy = bodyTop + (botY - bodyTop) * (i / 3);
    ctx.beginPath();
    ctx.moveTo(cx - w, yy);
    ctx.lineTo(cx + w, yy);
    ctx.stroke();
  }

  // fedél (ív)
  const lg = ctx.createLinearGradient(0, lidTop, 0, bodyTop);
  lg.addColorStop(0, '#9c6a37');
  lg.addColorStop(1, '#6b4524');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(cx - w, bodyTop);
  ctx.lineTo(cx - w, bodyTop - rad * 0.04);
  ctx.quadraticCurveTo(cx - w, lidTop, cx, lidTop);
  ctx.quadraticCurveTo(cx + w, lidTop, cx + w, bodyTop - rad * 0.04);
  ctx.lineTo(cx + w, bodyTop);
  ctx.closePath();
  ctx.fill();
  // fedél csúcsfény
  ctx.strokeStyle = 'rgba(220,180,120,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.8, bodyTop - rad * 0.08);
  ctx.quadraticCurveTo(cx, lidTop + rad * 0.04, cx + w * 0.8, bodyTop - rad * 0.08);
  ctx.stroke();

  // aranyló rés a fedél alatt
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - w * 0.86, bodyTop - 2, w * 1.72, 3);
  ctx.fillStyle = 'rgba(255,240,180,0.6)';
  for (let i = 0; i < 4; i++) {
    const gx = cx - w * 0.6 + i * w * 0.4;
    ctx.beginPath();
    ctx.arc(gx, bodyTop, 1.4, 0, TAU);
    ctx.fill();
  }

  // fém pántok
  ctx.fillStyle = '#5b626a';
  ctx.strokeStyle = '#33383d';
  ctx.lineWidth = 1;
  for (const sx of [-0.66, 0.66]) {
    ctx.fillRect(cx + sx * w - rad * 0.05, lidTop + rad * 0.06, rad * 0.1, botY - lidTop - rad * 0.06);
    ctx.strokeRect(cx + sx * w - rad * 0.05, lidTop + rad * 0.06, rad * 0.1, botY - lidTop - rad * 0.06);
  }
  // sarokszegecsek
  ctx.fillStyle = '#c8ccd2';
  for (const sx of [-0.66, 0.66]) {
    for (const sy of [lidTop + rad * 0.12, botY - rad * 0.08]) {
      ctx.beginPath();
      ctx.arc(cx + sx * w, sy, 1.5, 0, TAU);
      ctx.fill();
    }
  }

  // zár
  ctx.fillStyle = '#d9a93a';
  roundRectPath(ctx, cx - rad * 0.1, bodyTop - rad * 0.06, rad * 0.2, rad * 0.24, rad * 0.04);
  ctx.fill();
  ctx.strokeStyle = '#8a6a1e';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#5a3a1c';
  ctx.beginPath();
  ctx.arc(cx, bodyTop + rad * 0.05, rad * 0.03, 0, TAU);
  ctx.fill();
  void col; void row;
}
