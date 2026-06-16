import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Kaktusz: bordázott, tüskés sivatagi szár két karral és egy nyíló virággal a
 *  tetején. Sárgászöld test, fény-árnyék oldalakkal. */
export function drawCactus(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.72;
  const bw = rad * 0.26;

  groundShadow(ctx, cx, baseY, rad * 0.6, rad * 0.16, 0.24);

  const grad = (x: number) => {
    const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    g.addColorStop(0, '#2f5a2a');
    g.addColorStop(0.45, '#4c8a3c');
    g.addColorStop(0.7, '#6aa84e');
    g.addColorStop(1, '#356030');
    return g;
  };

  // bal kar
  const armY = cy + rad * 0.1;
  ctx.strokeStyle = '#3a6b32';
  ctx.lineWidth = bw * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.4, armY + rad * 0.18);
  ctx.lineTo(cx - rad * 0.42, armY + rad * 0.05);
  ctx.lineTo(cx - rad * 0.42, armY - rad * 0.22);
  ctx.stroke();
  // jobb kar
  ctx.beginPath();
  ctx.moveTo(cx + bw * 0.4, armY - rad * 0.02);
  ctx.lineTo(cx + rad * 0.4, armY - rad * 0.12);
  ctx.lineTo(cx + rad * 0.4, armY - rad * 0.4);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // fő szár
  ctx.fillStyle = grad(cx);
  roundRectPath(ctx, cx - bw, cy - rad * 0.7, bw * 2, baseY - (cy - rad * 0.7), bw);
  ctx.fill();
  // kar-fejek a grad színnel (átfedés)
  ctx.fillStyle = grad(cx - rad * 0.42);
  roundRectPath(ctx, cx - rad * 0.42 - bw * 0.45, armY - rad * 0.28, bw * 0.9, rad * 0.34, bw * 0.45);
  ctx.fill();
  ctx.fillStyle = grad(cx + rad * 0.4);
  roundRectPath(ctx, cx + rad * 0.4 - bw * 0.45, armY - rad * 0.46, bw * 0.9, rad * 0.34, bw * 0.45);
  ctx.fill();

  // bordák + tüskék a fő száron
  ctx.strokeStyle = 'rgba(20,50,20,0.4)';
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    const xx = cx + i * bw * 0.5;
    ctx.beginPath();
    ctx.moveTo(xx, cy - rad * 0.6);
    ctx.lineTo(xx, baseY - bw * 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#e8e0c0';
  ctx.lineWidth = 1;
  for (let r = 0; r < 7; r++) {
    const yy = cy - rad * 0.6 + r * rad * 0.2;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * bw * 0.7, yy);
      ctx.lineTo(cx + sx * (bw * 0.7 + 3), yy - 1.5);
      ctx.stroke();
    }
  }

  // virág a tetőn
  const fx = cx, fy = cy - rad * 0.72;
  ctx.fillStyle = '#e85aa0';
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * TAU;
    ctx.beginPath();
    ctx.ellipse(fx + Math.cos(a) * rad * 0.1, fy + Math.sin(a) * rad * 0.1, rad * 0.07, rad * 0.04, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(fx, fy, rad * 0.05, 0, TAU);
  ctx.fill();
  void col; void row;
}
