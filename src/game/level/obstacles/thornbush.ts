import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Száraz tüskebozót: gyér, gallyas barna ágszövevény néhány fakó olajzöld
 *  levéllel és tüskével — száraz, arid kinézet. */
export function drawThornBush(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseX = cx;
  const baseY = cy + rad * 0.58;

  groundShadow(ctx, cx, cy + rad * 0.64, rad * 0.6, rad * 0.2, 0.24);

  // gyökérpontból kihajló gallyak
  const branches = 9;
  const tips: Array<{ x: number; y: number }> = [];
  ctx.lineCap = 'round';
  for (let i = 0; i < branches; i++) {
    const a = -Math.PI * 0.5 + (i / (branches - 1) - 0.5) * Math.PI * 1.3;
    const len = rad * (0.7 + 0.4 * hash2(col * 3 + i, row + i));
    const midA = a + (hash2(col + i, row * 2 + i) - 0.5) * 0.5;
    const mx = baseX + Math.cos(midA) * len * 0.55;
    const my = baseY + Math.sin(midA) * len * 0.55;
    const ex = baseX + Math.cos(a) * len;
    const ey = baseY + Math.sin(a) * len * 0.92;
    // ág
    ctx.strokeStyle = '#5a4326';
    ctx.lineWidth = Math.max(1.4, rad * 0.06);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    // világos él
    ctx.strokeStyle = 'rgba(160,130,80,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    tips.push({ x: ex, y: ey });
    // pár kis tüske az ág mentén
    for (let k = 0; k < 2; k++) {
      const t = 0.5 + k * 0.25;
      const bxp = baseX + (ex - baseX) * t;
      const byp = baseY + (ey - baseY) * t;
      const ta = a + (k ? 0.7 : -0.7);
      ctx.strokeStyle = '#4a3620';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bxp, byp);
      ctx.lineTo(bxp + Math.cos(ta) * rad * 0.12, byp + Math.sin(ta) * rad * 0.12);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // gyér, fakó levelek az ágvégeken
  for (let i = 0; i < tips.length; i++) {
    if (hash2(col + i * 3, row * 2 + i) > 0.6) continue;
    const t = tips[i]!;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(hash2(col + i, row + i) * TAU);
    ctx.fillStyle = '#6e7a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.12, rad * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // egy-két aszott bogyó
  for (let i = 0; i < 2; i++) {
    const t = tips[(i * 3 + 1) % tips.length]!;
    ctx.fillStyle = '#8a3b2a';
    ctx.beginPath(); ctx.arc(t.x, t.y, rad * 0.05, 0, TAU); ctx.fill();
  }
}
