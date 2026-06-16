import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { TAU, shade, hash2 } from '../../../engine/math';

/** Kő: szabálytalan, témaszínű szikla repedésekkel. */
export function drawRock(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const light = shade(th.rock, 0.2);
  const dark = shade(th.rock, -0.24);
  const crack = shade(th.rock, -0.4);
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + rad * 0.55, rad, rad * 0.45, 0, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  const verts = 9;
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * TAU;
    const hh = hash2(col * 53 + i, row * 31 + i * 7);
    const rr = rad * (0.86 + hh * 0.26);
    const vx = cx + Math.cos(a) * rr;
    const vy = cy + Math.sin(a) * rr * 0.92;
    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(cx, cy - rad, cx, cy + rad);
  g.addColorStop(0, light);
  g.addColorStop(0.55, th.rock);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = th.rockStroke;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.ellipse(cx - rad * 0.28, cy - rad * 0.34, rad * 0.42, rad * 0.22, -0.5, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = crack;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.05, cy - rad * 0.4);
  ctx.lineTo(cx + rad * 0.12, cy - rad * 0.02);
  ctx.lineTo(cx - rad * 0.1, cy + rad * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + rad * 0.12, cy - rad * 0.02);
  ctx.lineTo(cx + rad * 0.45, cy + rad * 0.1);
  ctx.stroke();
}
