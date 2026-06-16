import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  PYRO — narancs magma-szörny, izzó repedésekkel; közelről lángot okád
 * ===================================================================== */
export function drawPyro(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.3);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;

  // --- lángcsóva a szájból (a test mögé világ-térben) ---
  if (v.breathing) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(look);
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const reach = r * 0.7 + t * 150;
      const spread = (Math.sin(v.wob * 12 + i) ) * r * (0.3 + t * 1.3);
      const fr = r * (0.55 - t * 0.34) * (0.8 + Math.random() * 0.4);
      const col = t < 0.4 ? '#fff3b0' : t < 0.7 ? '#ffb13a' : '#ff5a1e';
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(reach, spread, Math.max(1, fr), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  shadow(ctx, v, 1.05, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömzsi lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.5, r * 0.85 - lift * 4, r * 0.3, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // szarvak
  ctx.fillStyle = darken(v.col, 0.45);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.45, -r * 0.6);
    ctx.quadraticCurveTo(sgn * r * 0.95, -r * 0.95, sgn * r * 0.7, -r * 1.25);
    ctx.quadraticCurveTo(sgn * r * 0.62, -r * 0.85, sgn * r * 0.25, -r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // test (sötét megszilárdult kéreg)
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.15, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.55));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.98, r * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // izzó magma-repedések
  ctx.strokeStyle = v.flash ? '#fff' : '#ffd23a';
  ctx.shadowColor = '#ff7a1e';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  for (const [sx, sy, ex2, ey2, mx, my] of [
    [-0.5, -0.2, -0.1, 0.5, -0.3, 0.15],
    [0.45, -0.35, 0.2, 0.4, 0.4, 0.05],
    [-0.1, -0.55, 0.1, -0.1, 0.05, -0.35],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(sx * r, sy * r);
    ctx.quadraticCurveTo(mx * r, my * r, ex2 * r, ey2 * r);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // dühös szemek
  const dx = Math.cos(look) * r * 0.08;
  const dy = Math.sin(look) * r * 0.06;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.4); ctx.lineTo(-r * 0.15, -r * 0.2);
  ctx.moveTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.15, -r * 0.2);
  ctx.stroke();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fff3b0';
    ctx.shadowColor = '#ffb13a';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.08 + dy, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7a1500';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.08 + dy, r * 0.06, 0, TAU);
    ctx.fill();
  }

  // izzó száj (lángoláskor tátva, világít)
  const open = v.breathing ? r * 0.26 : r * 0.1;
  const mouthGrad = ctx.createRadialGradient(0, r * 0.42, 1, 0, r * 0.42, r * 0.4);
  mouthGrad.addColorStop(0, '#fff3b0');
  mouthGrad.addColorStop(0.5, '#ff7a1e');
  mouthGrad.addColorStop(1, '#7a1500');
  ctx.fillStyle = v.breathing ? mouthGrad : '#3a1000';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.34, open, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
