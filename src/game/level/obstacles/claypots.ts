import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';
import { groundShadow, roundRectPath } from './helpers';

/** Agyagedények: terrakotta amfora és gömbölyű korsó csoportja, eltérő
 *  formával, csúcsfénnyel és pár repedéssel. (Törhető tárolónak is jó.) */
export function drawClayPots(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.62;

  groundShadow(ctx, cx, baseY + rad * 0.02, rad * 0.78, rad * 0.16);

  const clay = (x: number) => {
    const g = ctx.createLinearGradient(x - rad * 0.3, 0, x + rad * 0.3, 0);
    g.addColorStop(0, '#8a4a2a');
    g.addColorStop(0.45, '#c87a44');
    g.addColorStop(0.65, '#d68b52');
    g.addColorStop(1, '#7a3f24');
    return g;
  };

  // hátsó: gömbölyű korsó
  const px = cx - rad * 0.4;
  const pr = rad * 0.34;
  const py = baseY - pr * 0.9;
  ctx.fillStyle = clay(px);
  ctx.beginPath();
  ctx.ellipse(px, py, pr, pr * 1.05, 0, 0, TAU);
  ctx.fill();
  // nyak
  ctx.fillStyle = clay(px);
  roundRectPath(ctx, px - pr * 0.4, py - pr * 1.25, pr * 0.8, pr * 0.45, pr * 0.12);
  ctx.fill();
  // perem
  ctx.fillStyle = '#a05a32';
  ctx.beginPath();
  ctx.ellipse(px, py - pr * 1.2, pr * 0.5, pr * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a2f1a';
  ctx.beginPath();
  ctx.ellipse(px, py - pr * 1.2, pr * 0.34, pr * 0.09, 0, 0, TAU);
  ctx.fill();
  // csúcsfény + repedés
  ctx.fillStyle = 'rgba(255,220,180,0.35)';
  ctx.beginPath();
  ctx.ellipse(px - pr * 0.35, py - pr * 0.3, pr * 0.18, pr * 0.4, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,35,18,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + pr * 0.2, py - pr * 0.6);
  ctx.lineTo(px + pr * 0.3, py);
  ctx.lineTo(px + pr * 0.15, py + pr * 0.5);
  ctx.stroke();

  // elülső: amfora (magas, fülekkel)
  const ax = cx + rad * 0.42;
  const aw = rad * 0.3;
  const aTop = cy - rad * 0.5;
  const aBot = baseY;
  ctx.fillStyle = clay(ax);
  ctx.beginPath();
  ctx.moveTo(ax - aw * 0.5, aTop);
  ctx.quadraticCurveTo(ax - aw, aTop + rad * 0.3, ax - aw * 0.7, cy);
  ctx.quadraticCurveTo(ax - aw * 0.3, aBot, ax, aBot);
  ctx.quadraticCurveTo(ax + aw * 0.3, aBot, ax + aw * 0.7, cy);
  ctx.quadraticCurveTo(ax + aw, aTop + rad * 0.3, ax + aw * 0.5, aTop);
  ctx.closePath();
  ctx.fill();
  // nyak + perem
  ctx.fillStyle = clay(ax);
  roundRectPath(ctx, ax - aw * 0.5, aTop - rad * 0.14, aw, rad * 0.18, aw * 0.16);
  ctx.fill();
  ctx.fillStyle = '#a05a32';
  ctx.beginPath();
  ctx.ellipse(ax, aTop - rad * 0.12, aw * 0.6, aw * 0.18, 0, 0, TAU);
  ctx.fill();
  // fülek
  ctx.strokeStyle = clay(ax) as unknown as string;
  ctx.strokeStyle = '#b06a3c';
  ctx.lineWidth = aw * 0.16;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(ax + sx * aw * 0.45, aTop - rad * 0.04);
    ctx.quadraticCurveTo(ax + sx * aw * 0.95, aTop + rad * 0.04, ax + sx * aw * 0.55, aTop + rad * 0.16);
    ctx.stroke();
  }
  // csúcsfény
  ctx.fillStyle = 'rgba(255,220,180,0.35)';
  ctx.beginPath();
  ctx.ellipse(ax - aw * 0.3, cy - rad * 0.1, aw * 0.16, rad * 0.26, -0.1, 0, TAU);
  ctx.fill();
  void col; void row;
}
