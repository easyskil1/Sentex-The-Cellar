import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { TAU, shade, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Mohás kőtömb: lekerekített, alul lapított dóm vízszintes ülepedési sávokkal
 *  és a tetejére telepedő mohafoltokkal. Lágyabb, gömbölyűbb a sziklánál. */
export function drawMossBoulder(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const base = th.rock;
  const light = shade(base, 0.28);
  const dark = shade(base, -0.3);
  const seam = shade(base, -0.42);

  groundShadow(ctx, cx, cy + rad * 0.6, rad * 0.96, rad * 0.4);

  // test-útvonal (lapos talp, gömbölyű tető)
  const verts = 16;
  const bodyPath = () => {
    ctx.beginPath();
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * TAU;
      const wob = hash2(col * 7 + i, row * 11 + i * 3);
      const rr = rad * (0.9 + wob * 0.12);
      const vx = cx + Math.cos(a) * rr;
      let vy = cy + Math.sin(a) * rr * 0.82;
      if (Math.sin(a) > 0) vy = cy + Math.sin(a) * rr * 0.5 + rad * 0.12; // lapos talp
      if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
  };

  bodyPath();
  const g = ctx.createLinearGradient(cx, cy - rad, cx, cy + rad * 0.7);
  g.addColorStop(0, light);
  g.addColorStop(0.5, base);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = th.rockStroke;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.fill();
  ctx.stroke();

  // ülepedési sávok (testre vágva)
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.strokeStyle = seam;
  ctx.lineWidth = 1.6;
  for (let b = 0; b < 3; b++) {
    const yy = cy - rad * 0.36 + b * rad * 0.34 + (hash2(col + b, row * 3 + b) - 0.5) * rad * 0.1;
    ctx.beginPath();
    for (let sx = -1; sx <= 1.001; sx += 0.1) {
      const px = cx + sx * rad;
      const py = yy + Math.sin(sx * 2.4 + b) * rad * 0.05;
      if (sx <= -1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // fénylő perem fent
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx - rad * 0.24, cy - rad * 0.42, rad * 0.5, rad * 0.2, -0.4, 0, TAU);
  ctx.fill();

  // moha a tetőn (sötét alap → élénk → csillám)
  const mossClumps: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < 5; i++) {
    const ang = -0.4 - i * 0.5 + (hash2(col * 3 + i, row + i) - 0.5);
    const dist = rad * (0.2 + 0.42 * hash2(i * 5, col + row));
    mossClumps.push({
      x: cx + Math.cos(ang) * dist,
      y: cy - rad * 0.34 + Math.sin(ang) * dist * 0.5,
      r: rad * (0.18 + 0.14 * hash2(i + 2, row + i * 3)),
    });
  }
  ctx.fillStyle = '#274d22';
  for (const m of mossClumps) { ctx.beginPath(); ctx.arc(m.x, m.y + 1, m.r * 1.05, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#3f7a32';
  for (const m of mossClumps) { ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(120,180,90,0.6)';
  for (const m of mossClumps) {
    for (let k = 0; k < 3; k++) {
      const px = m.x + (hash2(col + k, row + k * 2) - 0.5) * m.r * 1.2;
      const py = m.y + (hash2(col * 2 + k, row + k) - 0.5) * m.r * 1.2;
      ctx.beginPath(); ctx.arc(px, py, m.r * 0.16, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
