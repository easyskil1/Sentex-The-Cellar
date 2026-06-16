import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Virág-mező: alacsony, sűrű talajtakaró sokszínű apró virággal és rövid
 *  fűvel — dúsabb és laposabb, mint a „virágos fűcsomó". */
export function drawFlowerPatch(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.5;

  groundShadow(ctx, cx, baseY + rad * 0.1, rad * 0.8, rad * 0.18, 0.16);

  // rövid fűpamacsok
  ctx.strokeStyle = '#3f8a34';
  ctx.lineWidth = Math.max(1.2, rad * 0.04);
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const bx = cx + (hash2(col + i, row + i * 2) - 0.5) * rad * 1.5;
    const by = baseY + (hash2(col + i * 3, row + i) - 0.5) * rad * 0.5;
    const h = rad * (0.22 + 0.18 * hash2(i, col + row));
    const lean = (hash2(col + i, row + i) - 0.5) * rad * 0.18;
    ctx.strokeStyle = i % 2 ? '#3f8a34' : '#56a542';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * 0.5, by - h * 0.6, bx + lean, by - h);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // virágok
  const cols = ['#f25c5c', '#f2c94c', '#7d9ff2', '#e07ad6', '#ffffff', '#ff944d'];
  const n = 11;
  const spots: Array<{ x: number; y: number; c: string; r: number }> = [];
  for (let i = 0; i < n; i++) {
    spots.push({
      x: cx + (hash2(col * 2 + i, row + i) - 0.5) * rad * 1.6,
      y: baseY - rad * 0.05 + (hash2(col + i, row * 2 + i) - 0.5) * rad * 0.5,
      c: cols[i % cols.length]!,
      r: rad * (0.09 + 0.05 * hash2(i + 3, col + row)),
    });
  }
  spots.sort((a, b) => a.y - b.y);
  for (const s of spots) {
    ctx.fillStyle = s.c;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * TAU;
      ctx.beginPath();
      ctx.ellipse(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r * 0.9, s.r * 0.7, s.r * 0.45, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.5, 0, TAU);
    ctx.fill();
  }
}
