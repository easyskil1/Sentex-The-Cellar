import type { Rect } from '../../types';
import { TAU } from '../../../engine/math';

/**
 * Egyetlen víz-csempe (a szerkesztő rácsához). A játék a folyót összefüggő
 * testként rajzolja (lásd World.drawWater) — itt cellánként, egyszerűbben, de
 * felismerhetően: kék felület animált fodrokkal és parti peremmel.
 */
export function drawWaterTile(ctx: CanvasRenderingContext2D, cell: Rect, t: number): void {
  const { x, y, w, h } = cell;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2f6f9e');
  g.addColorStop(1, '#1c4f78');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // fodrok
  ctx.strokeStyle = 'rgba(180,225,255,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const ry = y + h * (0.35 + i * 0.32) + Math.sin(t * 1.6 + i) * 1.5;
    ctx.beginPath();
    for (let sx = 0; sx <= w; sx += 4) {
      const yy = ry + Math.sin((sx / w) * TAU * 2 + t * 2 + i) * 1.6;
      if (sx === 0) ctx.moveTo(x + sx, yy); else ctx.lineTo(x + sx, yy);
    }
    ctx.stroke();
  }
  // csillám
  ctx.fillStyle = 'rgba(220,240,255,0.5)';
  const sx = x + w * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.1)));
  ctx.beginPath();
  ctx.arc(sx, y + h * 0.4, 1.4, 0, TAU);
  ctx.fill();

  // parti perem
  ctx.strokeStyle = 'rgba(120,90,60,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
