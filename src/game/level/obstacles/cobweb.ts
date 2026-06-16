import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';

/** Pókháló: sarokba feszített, sugaras-spirális háló, kis pókkal (átjárható). */
export function drawCobweb(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const s = Math.min(cell.w, cell.h);
  const corner = Math.floor(hash2(col, row) * 4) % 4;
  const ax = corner === 0 || corner === 2 ? cell.x + 2 : cell.x + cell.w - 2;
  const ay = corner < 2 ? cell.y + 2 : cell.y + cell.h - 2;
  const sgnX = corner === 0 || corner === 2 ? 1 : -1;
  const sgnY = corner < 2 ? 1 : -1;
  const R = s * 0.92;
  ctx.save();
  ctx.strokeStyle = 'rgba(222,226,232,0.5)'; ctx.lineWidth = 1;
  const spokes = 6;
  const ang = (i: number) => (i / spokes) * (Math.PI / 2);
  for (let i = 0; i <= spokes; i++) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + sgnX * Math.cos(ang(i)) * R, ay + sgnY * Math.sin(ang(i)) * R); ctx.stroke(); }
  for (let r = R * 0.26; r < R; r += R * 0.22) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) { const px = ax + sgnX * Math.cos(ang(i)) * r, py = ay + sgnY * Math.sin(ang(i)) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
  }
  const spx = ax + sgnX * R * 0.5, spy = ay + sgnY * R * 0.5;
  ctx.fillStyle = 'rgba(18,18,22,0.85)';
  ctx.beginPath(); ctx.ellipse(spx, spy, s * 0.05, s * 0.06, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(18,18,22,0.75)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const a = 0.5 + i * 0.5; ctx.beginPath(); ctx.moveTo(spx, spy); ctx.lineTo(spx + Math.cos(a) * s * 0.1, spy + Math.sin(a) * s * 0.1); ctx.moveTo(spx, spy); ctx.lineTo(spx - Math.cos(a) * s * 0.1, spy + Math.sin(a) * s * 0.1); ctx.stroke(); }
  ctx.restore();
}
