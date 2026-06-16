import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';

/** Rituálé-kör: a padlóra rajzolt, pulzáló fénnyel izzó pentagramm (átjárható). */
export function drawRitualCircle(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.46;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + (col + row));
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, 0.58); ctx.translate(-cx, -cy);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  glow.addColorStop(0, `rgba(180,70,210,${0.06 + 0.12 * pulse})`);
  glow.addColorStop(1, 'rgba(120,20,160,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill();
  const line = `rgba(206,104,224,${0.5 + 0.4 * pulse})`;
  ctx.strokeStyle = line; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.9, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, rad * 0.62, 0, TAU); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const idx = (i * 2) % 5; const a = -Math.PI / 2 + idx * (TAU / 5); const px = cx + Math.cos(a) * rad * 0.62, py = cy + Math.sin(a) * rad * 0.62; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rad * 0.62, cy + Math.sin(a) * rad * 0.62); ctx.lineTo(cx + Math.cos(a) * rad * 0.9, cy + Math.sin(a) * rad * 0.9); ctx.stroke(); }
  ctx.restore();
}
