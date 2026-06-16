import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Bugyogó üst: öntöttvas fazék kis lábakon, fortyogó zöld főzettel, fölszálló
 *  buborékokkal és gőzpárával. (Animált: `t`.) */
export function drawCauldron(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const r = rad * 0.56;
  const potCy = cy + rad * 0.12;

  groundShadow(ctx, cx, cy + rad * 0.74, rad * 0.6, rad * 0.16);

  // lábak
  ctx.fillStyle = '#1f2226';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * r * 0.6, potCy + r * 0.7);
    ctx.lineTo(cx + sx * r * 0.8, cy + rad * 0.72);
    ctx.lineTo(cx + sx * r * 0.5, cy + rad * 0.72);
    ctx.closePath();
    ctx.fill();
  }

  // fazék-test
  const g = ctx.createRadialGradient(cx - r * 0.3, potCy - r * 0.3, r * 0.2, cx, potCy, r * 1.1);
  g.addColorStop(0, '#4a5159');
  g.addColorStop(1, '#1c1f23');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, potCy, r, Math.PI * 0.82, Math.PI * 2.18);
  ctx.closePath();
  ctx.fill();
  // perem
  ctx.fillStyle = '#3a4047';
  ctx.beginPath();
  ctx.ellipse(cx, potCy - r * 0.5, r * 1.04, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#22262b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // főzet
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, potCy - r * 0.5, r * 0.84, r * 0.26, 0, 0, TAU);
  ctx.clip();
  const lg = ctx.createLinearGradient(0, potCy - r * 0.8, 0, potCy - r * 0.2);
  lg.addColorStop(0, '#7ad84a');
  lg.addColorStop(1, '#2f7a2c');
  ctx.fillStyle = lg;
  ctx.fillRect(cx - r, potCy - r, r * 2, r);
  // buborékok
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.7 + i * 0.3 + hash2(col + i, row)) % 1;
    const bx = cx + (hash2(col + i, row + i) - 0.5) * r * 1.2;
    const by = potCy - r * 0.5 - p * r * 0.12;
    const br = (1 - p) * r * 0.12 + r * 0.03;
    ctx.fillStyle = `rgba(170,240,130,${(1 - p) * 0.8})`;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // főzet csúcsfény-perem
  ctx.strokeStyle = 'rgba(190,250,150,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, potCy - r * 0.5, r * 0.84, r * 0.26, 0, 0, TAU);
  ctx.stroke();

  // zöldes fény-pára
  const glow = 0.5 + 0.5 * Math.sin(t * 2);
  ctx.fillStyle = `rgba(120,230,90,${0.06 + glow * 0.06})`;
  ctx.beginPath();
  ctx.ellipse(cx, potCy - r * 0.6, r * 1.1, r * 0.5, 0, 0, TAU);
  ctx.fill();
  // gőz
  ctx.strokeStyle = 'rgba(200,240,190,0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const sx = cx + (i ? r * 0.3 : -r * 0.3);
    ctx.beginPath();
    for (let s = 0; s <= 4; s++) {
      const yy = potCy - r * 0.5 - s * r * 0.22;
      const xx = sx + Math.sin(t * 2 + s * 0.9 + i * 2) * r * 0.16;
      if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
}
