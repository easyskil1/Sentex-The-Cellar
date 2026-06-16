import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { shade, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Cseppkő/sztalagmit-csoport: a talajból fölfelé álló, hegyes kőtüskék
 *  réteges árnyalással és nedves csúcsfénnyel. (Téma-kőszínből.) */
export function drawStalagmites(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.66;

  groundShadow(ctx, cx, baseY + rad * 0.04, rad * 0.8, rad * 0.2);

  const spikes = [
    { x: -0.4, h: 0.72, w: 0.26 },
    { x: 0.34, h: 0.86, w: 0.3 },
    { x: 0.0, h: 1.18, w: 0.36 },
    { x: -0.12, h: 0.5, w: 0.2 },
    { x: 0.5, h: 0.46, w: 0.18 },
  ];
  const order = [4, 0, 1, 3, 2];
  for (const idx of order) {
    const s = spikes[idx]!;
    const bx = cx + s.x * rad;
    const topY = baseY - s.h * rad;
    const hw = s.w * rad * 0.5;
    const lean = (hash2(col + idx, row + idx) - 0.5) * rad * 0.1;
    const g = ctx.createLinearGradient(bx - hw, 0, bx + hw, 0);
    g.addColorStop(0, shade(th.rock, -0.28));
    g.addColorStop(0.45, shade(th.rock, 0.08));
    g.addColorStop(0.6, shade(th.rock, 0.22));
    g.addColorStop(1, shade(th.rock, -0.32));
    ctx.fillStyle = g;
    ctx.strokeStyle = th.rockStroke;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - hw, baseY);
    ctx.quadraticCurveTo(bx - hw * 0.5, baseY - s.h * rad * 0.5, bx + lean, topY);
    ctx.quadraticCurveTo(bx + hw * 0.5, baseY - s.h * rad * 0.5, bx + hw, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // rétegvonalak
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    for (let k = 1; k <= 3; k++) {
      const f = k / 4;
      const yy = baseY - s.h * rad * f;
      const ww = hw * (1 - f);
      ctx.beginPath();
      ctx.moveTo(bx + lean * f - ww, yy);
      ctx.quadraticCurveTo(bx + lean * f, yy + 2, bx + lean * f + ww, yy);
      ctx.stroke();
    }
    // nedves csúcsfény
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx + lean, topY + 1);
    ctx.quadraticCurveTo(bx - hw * 0.4, baseY - s.h * rad * 0.5, bx - hw * 0.5, baseY - 3);
    ctx.stroke();
  }
}
