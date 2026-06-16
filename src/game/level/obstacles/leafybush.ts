import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Dús lombú bokor: alacsony, széles, rétegzett zöld levélcsomók néhány piros
 *  bogyóval és levélcsillámmal. Törzs nélkül, a talajból nő. */
export function drawLeafyBush(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const seed = hash2(col * 9 + 1, row * 7 + 4);
  const baseY = cy + rad * 0.5;

  groundShadow(ctx, cx, cy + rad * 0.66, rad * 0.86, rad * 0.3);

  const clumps: Array<{ x: number; y: number; r: number }> = [];
  const ring = 7;
  for (let i = 0; i < ring; i++) {
    const a = Math.PI + (i / (ring - 1)) * Math.PI; // felső félkör (széles, lapos)
    const jx = (hash2(col + i * 3, row * 2 + i) - 0.5) * rad * 0.18;
    const jy = (hash2(col * 2 + i, row + i * 5) - 0.5) * rad * 0.14;
    clumps.push({
      x: cx + Math.cos(a) * rad * 0.66 + jx,
      y: baseY + Math.sin(a) * rad * 0.7 + jy,
      r: rad * (0.34 + 0.12 * hash2(i * 7 + 2, col + row)),
    });
  }
  clumps.push({ x: cx, y: baseY - rad * 0.36, r: rad * 0.5 });
  clumps.push({ x: cx - rad * 0.3, y: baseY - rad * 0.12, r: rad * 0.4 });
  clumps.push({ x: cx + rad * 0.34, y: baseY - rad * 0.1, r: rad * 0.42 });

  ctx.fillStyle = '#173314';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x, c.y + rad * 0.05, c.r * 1.05, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#2f6326';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#478f37';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x - c.r * 0.24, c.y - c.r * 0.28, c.r * 0.72, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#6fb84d';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x - c.r * 0.32, c.y - c.r * 0.4, c.r * 0.4, 0, TAU); ctx.fill(); }

  // levélcsillám + bogyók
  for (let i = 0; i < 16; i++) {
    const a = hash2(col * 13 + i, row * 5 + i * 3) * TAU;
    const rr = Math.sqrt(hash2(i * 3 + 1, col + row + i)) * rad * 0.7;
    const px = cx + Math.cos(a) * rr;
    const py = baseY - rad * 0.2 + Math.sin(a) * rr * 0.6;
    ctx.fillStyle = (i & 1) ? 'rgba(150,205,110,0.55)' : 'rgba(18,40,16,0.4)';
    ctx.beginPath(); ctx.arc(px, py, rad * 0.045, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const px = cx + (hash2(col * 4 + i, row + i * 2) - 0.5) * rad * 1.1;
    const py = baseY - rad * 0.1 - hash2(col + i, row * 2 + i) * rad * 0.5;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(px, py, rad * 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,190,0.7)';
    ctx.beginPath(); ctx.arc(px - rad * 0.02, py - rad * 0.02, rad * 0.02, 0, TAU); ctx.fill();
  }
  void seed;
}
