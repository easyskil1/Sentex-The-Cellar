import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Csont-halom: koponya szem-üregekkel és fogsorral, két keresztezett
 *  combcsont és pár borda-töredék — fakó csontszínben, lágy árnyékolással. */
export function drawBones(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const bone = '#e6ddc8';
  const boneShade = '#bcae90';
  const boneDark = '#8f8166';

  groundShadow(ctx, cx, cy + rad * 0.5, rad * 0.82, rad * 0.24, 0.26);

  // hosszúcsontok (keresztezve, hátul)
  const drawBone = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
    ctx.rotate(ang);
    const L = Math.hypot(x2 - x1, y2 - y1);
    ctx.fillStyle = bone;
    ctx.strokeStyle = boneDark;
    ctx.lineWidth = 1;
    // szár
    ctx.beginPath();
    ctx.moveTo(-L / 2 + w, -w * 0.5);
    ctx.lineTo(L / 2 - w, -w * 0.5);
    ctx.lineTo(L / 2 - w, w * 0.5);
    ctx.lineTo(-L / 2 + w, w * 0.5);
    ctx.closePath();
    ctx.fill();
    // végbütykök (2-2 kör)
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * (L / 2 - w * 0.6), sy * w * 0.7, w * 0.7, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  drawBone(cx - rad * 0.5, cy + rad * 0.34, cx + rad * 0.5, cy - rad * 0.2, rad * 0.1);
  drawBone(cx - rad * 0.5, cy - rad * 0.2, cx + rad * 0.5, cy + rad * 0.34, rad * 0.1);

  // borda-töredékek
  ctx.strokeStyle = boneShade;
  ctx.lineWidth = rad * 0.06;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bxp = cx - rad * 0.5 + i * rad * 0.12;
    const byp = cy + rad * 0.5;
    ctx.beginPath();
    ctx.moveTo(bxp, byp);
    ctx.quadraticCurveTo(bxp - rad * 0.18, byp - rad * 0.16, bxp - rad * 0.04, byp - rad * 0.3);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // koponya (elöl)
  const skx = cx + rad * 0.04;
  const sky = cy - rad * 0.06;
  const skR = rad * 0.46;
  // árnyék-alap
  ctx.fillStyle = boneShade;
  ctx.beginPath();
  ctx.arc(skx + 1.5, sky + 1.5, skR, 0, TAU);
  ctx.fill();
  // koponyatető
  const skg = ctx.createRadialGradient(skx - skR * 0.3, sky - skR * 0.3, skR * 0.2, skx, sky, skR);
  skg.addColorStop(0, '#f3ecd9');
  skg.addColorStop(1, boneShade);
  ctx.fillStyle = skg;
  ctx.beginPath();
  ctx.arc(skx, sky, skR, Math.PI * 0.92, Math.PI * 2.08);
  // arc/állkapocs lefelé szűkül
  ctx.lineTo(skx + skR * 0.42, sky + skR * 0.78);
  ctx.quadraticCurveTo(skx, sky + skR * 1.02, skx - skR * 0.42, sky + skR * 0.78);
  ctx.closePath();
  ctx.fill();
  // szemüregek
  ctx.fillStyle = '#2a2418';
  ctx.beginPath();
  ctx.ellipse(skx - skR * 0.4, sky + skR * 0.05, skR * 0.26, skR * 0.3, 0.2, 0, TAU);
  ctx.ellipse(skx + skR * 0.4, sky + skR * 0.05, skR * 0.26, skR * 0.3, -0.2, 0, TAU);
  ctx.fill();
  // üreg-csillám
  ctx.fillStyle = 'rgba(120,150,160,0.4)';
  ctx.beginPath();
  ctx.arc(skx - skR * 0.46, sky - skR * 0.02, skR * 0.07, 0, TAU);
  ctx.arc(skx + skR * 0.34, sky - skR * 0.02, skR * 0.07, 0, TAU);
  ctx.fill();
  // orrüreg
  ctx.fillStyle = '#3a3122';
  ctx.beginPath();
  ctx.moveTo(skx, sky + skR * 0.32);
  ctx.lineTo(skx - skR * 0.1, sky + skR * 0.54);
  ctx.lineTo(skx + skR * 0.1, sky + skR * 0.54);
  ctx.closePath();
  ctx.fill();
  // fogsor
  ctx.fillStyle = '#3a3122';
  ctx.fillRect(skx - skR * 0.34, sky + skR * 0.66, skR * 0.68, skR * 0.16);
  ctx.strokeStyle = boneShade;
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const xx = skx - skR * 0.34 + i * (skR * 0.68 / 5);
    ctx.beginPath();
    ctx.moveTo(xx, sky + skR * 0.66);
    ctx.lineTo(xx, sky + skR * 0.82);
    ctx.stroke();
  }
  void col; void row;
}
