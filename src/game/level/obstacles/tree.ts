import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';

/** Fa: rétegzett lombkorona törzzsel, determinisztikus variációval. */
export function drawTree(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const seed = hash2(col * 9 + 2, row * 5 + 1);
  const canopyCy = cy - rad * 0.34;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + rad * 0.12, cy + rad * 0.72, rad * 0.92, rad * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  const trunkTop = canopyCy + rad * 0.32;
  const trunkBot = cy + rad * 0.62;
  const wTop = rad * 0.16, wBot = rad * 0.3;
  const tg = ctx.createLinearGradient(cx - wBot, 0, cx + wBot, 0);
  tg.addColorStop(0, '#3c2613');
  tg.addColorStop(0.5, '#6b4524');
  tg.addColorStop(1, '#3c2613');
  ctx.fillStyle = tg;
  ctx.strokeStyle = '#2c1a0d';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - wTop, trunkTop);
  ctx.lineTo(cx + wTop, trunkTop);
  ctx.quadraticCurveTo(cx + wBot * 0.7, (trunkTop + trunkBot) / 2, cx + wBot, trunkBot);
  ctx.lineTo(cx - wBot, trunkBot);
  ctx.quadraticCurveTo(cx - wBot * 0.7, (trunkTop + trunkBot) / 2, cx - wTop, trunkTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,24,12,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.02, trunkTop + 2);
  ctx.lineTo(cx + rad * 0.02, trunkBot - 2);
  ctx.stroke();

  const clumps: Array<{ x: number; y: number; r: number }> = [];
  const ring = 6;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * TAU + seed * TAU;
    const jx = (hash2(col + i * 3, row * 2 + i) - 0.5) * rad * 0.22;
    const jy = (hash2(col * 2 + i, row + i * 3) - 0.5) * rad * 0.18;
    clumps.push({
      x: cx + Math.cos(a) * rad * 0.5 + jx,
      y: canopyCy + Math.sin(a) * rad * 0.42 + jy,
      r: rad * (0.4 + 0.14 * hash2(i * 7, col + row)),
    });
  }
  clumps.push({ x: cx, y: canopyCy, r: rad * 0.62 });

  ctx.fillStyle = '#1e3a1a';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x, c.y + rad * 0.06, c.r * 1.04, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#356f2c';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#4f9038';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x - c.r * 0.26, c.y - c.r * 0.3, c.r * 0.72, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#74b94f';
  for (const c of clumps) {
    if (c.y > canopyCy + rad * 0.05) continue;
    ctx.beginPath(); ctx.arc(c.x - c.r * 0.34, c.y - c.r * 0.42, c.r * 0.4, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const a = hash2(col * 13 + i, row * 7 + i * 5) * TAU;
    const rr = Math.sqrt(hash2(i * 3 + 1, col + row + i)) * rad * 0.66;
    const px = cx + Math.cos(a) * rr;
    const py = canopyCy + Math.sin(a) * rr * 0.86;
    const lite = (i & 1) === 0;
    ctx.fillStyle = lite ? 'rgba(140,200,110,0.5)' : 'rgba(20,44,18,0.45)';
    ctx.beginPath();
    ctx.arc(px - (lite ? 0.6 : 0), py - (lite ? 0.6 : 0), rad * 0.05, 0, TAU);
    ctx.fill();
  }
}
