import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, linear3, softGlow } from './helpers';

/* ===================================================================== *
 *  ROACH — apró csótány: ovális tor, fejpajzs, csápok, cikázó lábak.
 *  A „harapós" példány (más szín) az `active` jelzőtől vészjósló pírt kap.
 * ===================================================================== */
export function drawRoach(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.3);
  const sk = Math.sin(v.wob * 7); // gyors lábmozgás

  shadow(ctx, v, 0.85, 0.5);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.face); // a tor a haladás irányába áll
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // harapós példány: halvány pír a teste körül
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(v.wob * 6) * 0.15;
    softGlow(ctx, 0, 0, r * 1.7, '#ff3a1e');
    ctx.fillStyle = '#ff5a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r * 1.05, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 6 ideges láb (3 oldalanként)
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.16);
  for (let i = -1; i <= 1; i++) {
    for (const sgn of [-1, 1]) {
      const bx = i * r * 0.5;
      const wig = sk * sgn * (i === 0 ? 1 : -1) * 2;
      ctx.beginPath();
      ctx.moveTo(bx, sgn * r * 0.45);
      ctx.lineTo(bx + i * r * 0.3 + wig, sgn * r * 1.05);
      ctx.stroke();
    }
  }

  // csápok elöl
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.9, sgn * r * 0.2);
    ctx.quadraticCurveTo(r * 1.7, sgn * r * 0.5 + sk * sgn * 2, r * 2.1, sgn * r * 0.15 + sk * 2);
    ctx.stroke();
  }

  // tor (megnyúlt ovál)
  ctx.fillStyle = v.flash ? '#fff' : linear3(ctx, -r * 1.2, 0, r * 1.2, 0, 0.5, dark, body, light);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r * 0.82, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // szárnyfedő középvonal
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.5, 0);
  ctx.lineTo(-r * 1.15, 0);
  ctx.stroke();

  // fejpajzs (pronotum) elöl
  ctx.fillStyle = v.flash ? '#fff' : darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(r * 0.72, 0, r * 0.5, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // apró szemek
  ctx.fillStyle = v.flash ? '#000' : '#0a0603';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.95, sgn * r * 0.32, r * 0.12, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
