import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Kelta kereszt: gyűrűs kőkereszt talapzaton, befaragott csomóval. */
export function drawCelticCross(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const tilt = (hash2(col, row) - 0.5) * 0.1;
  const armW = rad * 0.14, armSpan = rad * 0.4, ringR = rad * 0.3;
  const topY = cy - rad * 0.66, botY = cy + rad * 0.66, crossY = cy - rad * 0.2;
  groundShadow(ctx, cx, botY, rad * 0.46, rad * 0.13);
  ctx.fillStyle = '#46484e';
  roundRectPath(ctx, cx - rad * 0.34, botY - rad * 0.12, rad * 0.68, rad * 0.14, rad * 0.02); ctx.fill();
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(tilt); ctx.translate(-cx, -cy);
  const s = ctx.createLinearGradient(cx - armW, 0, cx + armW, 0);
  s.addColorStop(0, '#56585e'); s.addColorStop(0.5, '#7e8086'); s.addColorStop(1, '#4a4c52');
  ctx.fillStyle = s; ctx.strokeStyle = '#32343a'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.rect(cx - armW, topY, armW * 2, botY - rad * 0.1 - topY); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - armSpan, crossY - armW, armSpan * 2, armW * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = armW * 0.9; ctx.strokeStyle = s;
  ctx.beginPath(); ctx.arc(cx, crossY, ringR, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.4; ctx.strokeStyle = '#32343a';
  ctx.beginPath(); ctx.arc(cx, crossY, ringR + armW * 0.45, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, crossY, ringR - armW * 0.45, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,42,48,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, crossY, ringR * 0.4, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - armW + 1, topY + 2); ctx.lineTo(cx - armW + 1, botY - rad * 0.12); ctx.stroke();
  ctx.restore();
}
