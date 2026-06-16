import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Kidőlt fatörzs: oldalt fekvő, mohás rönk évgyűrűs véglappal, kéreg-textúrával
 *  és pár rajta növő apró gombával. */
export function drawLog(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const len = rad * 1.6;
  const r = rad * 0.34;
  const x0 = cx - len / 2;
  const x1 = cx + len / 2;

  groundShadow(ctx, cx, cy + r * 0.9, len * 0.5, r * 0.5);

  // henger-test
  const bg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  bg.addColorStop(0, '#7a5230');
  bg.addColorStop(0.5, '#5c3c20');
  bg.addColorStop(1, '#3a2512');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x0, cy - r);
  ctx.lineTo(x1, cy - r);
  ctx.ellipse(x1, cy, r * 0.42, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0, cy + r);
  ctx.ellipse(x0, cy, r * 0.42, r, 0, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();

  // kéreg-textúra (hosszanti vonalak)
  ctx.strokeStyle = 'rgba(30,18,8,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const yy = cy - r + (i + 0.7) / 4.2 * 2 * r;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, yy);
    for (let sx = 0; sx <= 1; sx += 0.2) {
      ctx.lineTo(x0 + sx * len, yy + Math.sin(sx * 8 + i) * 1.2);
    }
    ctx.stroke();
  }
  // felső csúcsfény
  ctx.strokeStyle = 'rgba(190,150,100,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + 2, cy - r * 0.7);
  ctx.lineTo(x1 - 2, cy - r * 0.7);
  ctx.stroke();

  // véglap (bal) évgyűrűkkel
  ctx.fillStyle = '#a9824e';
  ctx.beginPath();
  ctx.ellipse(x0, cy, r * 0.42, r, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,30,0.7)';
  ctx.lineWidth = 1;
  for (let k = 1; k <= 4; k++) {
    const f = k / 4.5;
    ctx.beginPath();
    ctx.ellipse(x0, cy, r * 0.42 * f, r * f, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(210,180,130,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x0, cy, r * 0.42, r, 0, 0, TAU);
  ctx.stroke();

  // moha a tetején
  ctx.fillStyle = '#3f7a32';
  for (let i = 0; i < 7; i++) {
    const px = x0 + len * (0.2 + 0.7 * hash2(col + i, row + i * 2));
    const py = cy - r * (0.5 + 0.3 * hash2(col + i * 2, row + i));
    ctx.beginPath();
    ctx.ellipse(px, py, rad * 0.1, rad * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120,180,90,0.5)';
  for (let i = 0; i < 6; i++) {
    const px = x0 + len * (0.25 + 0.6 * hash2(col + i * 3, row + i));
    const py = cy - r * (0.55 + 0.2 * hash2(col + i, row + i * 3));
    ctx.beginPath(); ctx.arc(px, py, 1.2, 0, TAU); ctx.fill();
  }
  // két apró gomba a rönkön
  for (let i = 0; i < 2; i++) {
    const mx = x0 + len * (0.35 + i * 0.3);
    const my = cy - r * 0.6;
    ctx.fillStyle = '#e8d8b8';
    ctx.fillRect(mx - 1, my, 2, rad * 0.12);
    ctx.fillStyle = '#d2603a';
    ctx.beginPath();
    ctx.ellipse(mx, my, rad * 0.08, rad * 0.05, 0, Math.PI, TAU);
    ctx.fill();
  }
}
