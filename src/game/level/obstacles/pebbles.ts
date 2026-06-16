import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { TAU, shade, hash2 } from '../../../engine/math';

/** Kavics-csomó: szétszórt, lekerekített kis kövek a talajon, eltérő mérettel
 *  és árnyalattal, apró saját árnyékkal. (Téma-kőszínből.) */
export function drawPebbles(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;

  const stones: Array<{ x: number; y: number; rx: number; ry: number; sh: number }> = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    stones.push({
      x: cx + (hash2(col * 3 + i, row + i) - 0.5) * rad * 1.4,
      y: cy + (hash2(col + i, row * 3 + i) - 0.5) * rad * 1.0,
      rx: rad * (0.12 + 0.16 * hash2(i + 1, col + row)),
      ry: 0,
      sh: (hash2(i * 2, col + row + i) - 0.5) * 0.4,
    });
  }
  for (const s of stones) s.ry = s.rx * (0.66 + 0.1 * hash2(s.x | 0, s.y | 0));
  stones.sort((a, b) => a.y - b.y);
  for (const s of stones) {
    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + s.ry * 0.6, s.rx * 1.05, s.ry * 0.7, 0, 0, TAU);
    ctx.fill();
    // kő
    const g = ctx.createLinearGradient(s.x, s.y - s.ry, s.x, s.y + s.ry);
    g.addColorStop(0, shade(th.rock, 0.22 + s.sh));
    g.addColorStop(1, shade(th.rock, -0.22 + s.sh));
    ctx.fillStyle = g;
    ctx.strokeStyle = th.rockStroke;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, s.sh, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // csúcsfény
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(s.x - s.rx * 0.25, s.y - s.ry * 0.3, s.rx * 0.4, s.ry * 0.3, s.sh, 0, TAU);
    ctx.fill();
  }
}
