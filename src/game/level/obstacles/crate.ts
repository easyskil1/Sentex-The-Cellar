import type { Rect } from '../../types';
import { OBSTACLES } from '../../types';
import { TAU } from '../../../engine/math';

/** Faláda (X-merevítéssel); ha `hp` < teljes, sérülés-repedéssel. */
export function drawCrate(ctx: CanvasRenderingContext2D, cell: Rect, hp?: number): void {
  const s = Math.min(cell.w, cell.h) * 0.8;
  const x = cell.x + (cell.w - s) / 2;
  const y = cell.y + (cell.h - s) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cell.x + cell.w / 2, y + s + s * 0.04, s * 0.56, s * 0.16, 0, 0, TAU);
  ctx.fill();

  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, '#bd884c');
  g.addColorStop(1, '#7c5326');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, s, s);

  ctx.strokeStyle = '#5a3a1e';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.strokeRect(x, y, s, s);
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + s, y + s);
  ctx.moveTo(x + s, y); ctx.lineTo(x, y + s);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,228,184,0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8);

  if (hp !== undefined && hp < OBSTACLES.crate.hp) {
    ctx.strokeStyle = 'rgba(40,24,12,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.3, y + s * 0.2);
    ctx.lineTo(x + s * 0.45, y + s * 0.5);
    ctx.lineTo(x + s * 0.34, y + s * 0.78);
    ctx.stroke();
  }
}
