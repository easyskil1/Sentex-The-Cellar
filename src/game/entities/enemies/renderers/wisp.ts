import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { glow, radial2, radial3 } from './helpers';

/* ---------------------------------------------------------------------
 *  WISP — lidércfény: izzó tűzmag lobogó lángnyelvekkel, halvány arccal.
 * ------------------------------------------------------------------- */
export function drawWisp(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob * 2.2) * r * 0.18;
  const flick = 1 + Math.sin(v.wob * 9) * 0.12;

  // talaj-fényfolt
  ctx.save();
  ctx.globalAlpha = 0.35;
  const gl = radial2(ctx, v.x, v.y + r * 0.8, 1, v.x, v.y + r * 0.8, r * 1.4, 'rgba(255,180,74,0.5)', 'rgba(255,120,40,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + r * 0.8, r * 1.4, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(v.x, v.y + float);

  // lobogó lángnyelvek (a mag körül felfelé)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const len = r * (1.0 + Math.sin(v.wob * 8 + i * 2) * 0.4) * flick;
    const col = i % 3 === 0 ? '#fff3b0' : i % 3 === 1 ? '#ffb13a' : '#ff6a1e';
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.3) * r * 0.4, Math.sin(a - 0.3) * r * 0.4 - r * 0.2);
    ctx.quadraticCurveTo(Math.cos(a) * len * 0.7, Math.sin(a) * len * 0.7 - r * 0.4, Math.cos(a) * len, Math.sin(a) * len - r * 0.5);
    ctx.quadraticCurveTo(Math.cos(a) * len * 0.7, Math.sin(a) * len * 0.7 - r * 0.2, Math.cos(a + 0.3) * r * 0.4, Math.sin(a + 0.3) * r * 0.4 - r * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // izzó mag
  const core = radial3(ctx, 0, -r * 0.2, r * 0.05, 0, -r * 0.2, r * 0.6, 0.5, '#ffffe0', '#ffd27a', '#ff7a1e');
  ctx.fillStyle = v.flash ? '#fff' : core;
  glow(ctx, 0, -r * 0.2, r * 0.42 * flick, '#ffb13a', 16);
  ctx.beginPath();
  ctx.arc(0, -r * 0.2, r * 0.42, 0, TAU);
  ctx.fill();

  // halvány szellem-arc a magban
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  ctx.fillStyle = 'rgba(90,40,8,0.7)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.13 + dx, -r * 0.22 + dy, r * 0.05, r * 0.08, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(dx, -r * 0.05 + dy, r * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.fill();

  ctx.restore();
}
