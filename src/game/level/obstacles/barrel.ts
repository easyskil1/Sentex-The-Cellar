import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Fahordó: enyhén hasas, dongákból álló fatest három fémabronccsal,
 *  felső karima-ellipszissel és fa-erezettel. (Törhető tárolónak is jó.) */
export function drawBarrel(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const hw = rad * 0.5;      // fél-szélesség a középen
  const hwTop = rad * 0.4;   // szűkebb tető/alj
  const topY = cy - rad * 0.62;
  const botY = cy + rad * 0.62;
  const ry = rad * 0.14;

  groundShadow(ctx, cx, botY + 1, hw * 1.05, ry * 1.1);

  // hordó-sziluett (hasas oldalakkal)
  const silhouette = () => {
    ctx.beginPath();
    ctx.moveTo(cx - hwTop, topY);
    ctx.quadraticCurveTo(cx - hw - rad * 0.06, cy, cx - hwTop, botY);
    ctx.ellipse(cx, botY, hwTop, ry, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(cx + hw + rad * 0.06, cy, cx + hwTop, topY);
    ctx.ellipse(cx, topY, hwTop, ry, 0, 0, Math.PI, true);
    ctx.closePath();
  };
  silhouette();
  const g = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  g.addColorStop(0, '#5a3a1e');
  g.addColorStop(0.4, '#9c6a37');
  g.addColorStop(0.6, '#b07d44');
  g.addColorStop(1, '#5a3a1e');
  ctx.fillStyle = g;
  ctx.fill();

  // dongák + erezet (testre vágva)
  ctx.save();
  silhouette();
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,24,12,0.5)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    const xx = cx - hw + f * hw * 2;
    const bow = Math.sin(f * Math.PI) * rad * 0.06;
    ctx.beginPath();
    ctx.moveTo(xx - bow * Math.sign(0.5 - f) * 0 + (xx < cx ? -1 : 1) * 0, topY + ry);
    ctx.moveTo(xx, topY + ry * 0.5);
    ctx.quadraticCurveTo(xx + (f < 0.5 ? -bow : bow), cy, xx, botY - ry * 0.5);
    ctx.stroke();
  }
  // fa-erezet rövid ívek
  ctx.strokeStyle = 'rgba(70,44,22,0.4)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const yy = topY + (i + 0.5) / 5 * (botY - topY);
    ctx.beginPath();
    ctx.moveTo(cx - hw, yy);
    ctx.quadraticCurveTo(cx, yy + (hash2(col + i, row + i) - 0.5) * 6, cx + hw, yy);
    ctx.stroke();
  }
  ctx.restore();

  // fémabroncsok (3)
  const hoopYs = [topY + (botY - topY) * 0.16, cy, botY - (botY - topY) * 0.16];
  for (let i = 0; i < hoopYs.length; i++) {
    const yy = hoopYs[i]!;
    const f = 1 - Math.abs((yy - cy) / (cy - topY)) * 0.2; // középen szélesebb
    const w = (i === 1 ? hw : hwTop + (hw - hwTop) * 0.6) * f;
    const hg = ctx.createLinearGradient(0, yy - ry * 0.6, 0, yy + ry * 0.6);
    hg.addColorStop(0, '#9aa0a6');
    hg.addColorStop(0.5, '#5b626a');
    hg.addColorStop(1, '#33383d');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(cx, yy, w, ry * 0.7, 0, 0, TAU);
    ctx.ellipse(cx, yy, w - rad * 0.07, ry * 0.5, 0, 0, TAU, true);
    ctx.fill('evenodd');
    // abroncs-csúcsfény
    ctx.fillStyle = 'rgba(220,228,235,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.4, yy - ry * 0.2, w * 0.18, ry * 0.18, 0, 0, TAU);
    ctx.fill();
  }

  // felső karima (fedél)
  ctx.fillStyle = '#7c5326';
  ctx.beginPath();
  ctx.ellipse(cx, topY, hwTop, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3c2613';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,140,90,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, topY, hwTop * 0.7, ry * 0.6, 0, 0, TAU);
  ctx.fill();
}
