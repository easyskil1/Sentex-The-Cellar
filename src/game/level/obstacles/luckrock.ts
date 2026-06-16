import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';

/**
 * Szerencse-kő: sötét, aranyeres szikla egy izzó arany kristállyal a tetején —
 * csak a szerencse-szobában fordul elő. A `t` (mp) a kristály lüktetéséhez.
 */
export function drawLuckRock(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;

  // árnyék
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + rad * 0.58, rad, rad * 0.45, 0, 0, TAU);
  ctx.fill();

  // szikla-test (sötét, kicsit kékes kő)
  ctx.beginPath();
  const verts = 9;
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * TAU;
    const hh = hash2(col * 53 + i, row * 31 + i * 7);
    const rr = rad * (0.84 + hh * 0.26);
    const vx = cx + Math.cos(a) * rr;
    const vy = cy + Math.sin(a) * rr * 0.92;
    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(cx, cy - rad, cx, cy + rad);
  g.addColorStop(0, '#3a3550');
  g.addColorStop(0.55, '#272338');
  g.addColorStop(1, '#171428');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#0e0b1c';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.fill();
  ctx.stroke();

  // arany erezet a kövön
  ctx.strokeStyle = 'rgba(214,176,92,0.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.6, cy + rad * 0.2);
  ctx.lineTo(cx - rad * 0.1, cy - rad * 0.1);
  ctx.lineTo(cx + rad * 0.2, cy + rad * 0.25);
  ctx.lineTo(cx + rad * 0.6, cy + rad * 0.05);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.1, cy - rad * 0.1);
  ctx.lineTo(cx - rad * 0.2, cy + rad * 0.5);
  ctx.stroke();

  // izzó arany kristály a tetején
  const pulse = 0.5 + Math.sin(t * 3 + col + row) * 0.5;
  const ky = cy - rad * 0.32;
  ctx.save();
  ctx.shadowColor = '#ffe08a';
  ctx.shadowBlur = 8 + pulse * 10;
  const cg = ctx.createLinearGradient(cx, ky - rad * 0.5, cx, ky + rad * 0.45);
  cg.addColorStop(0, '#fff4cf');
  cg.addColorStop(0.5, '#ffd36a');
  cg.addColorStop(1, '#b8862a');
  ctx.fillStyle = cg;
  ctx.strokeStyle = '#8a6a22';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, ky - rad * 0.5);
  ctx.lineTo(cx + rad * 0.26, ky - rad * 0.05);
  ctx.lineTo(cx + rad * 0.16, ky + rad * 0.42);
  ctx.lineTo(cx - rad * 0.16, ky + rad * 0.42);
  ctx.lineTo(cx - rad * 0.26, ky - rad * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // belső él (fazetta)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, ky - rad * 0.5);
  ctx.lineTo(cx, ky + rad * 0.42);
  ctx.moveTo(cx - rad * 0.26, ky - rad * 0.05);
  ctx.lineTo(cx + rad * 0.26, ky - rad * 0.05);
  ctx.stroke();
  ctx.restore();
}
