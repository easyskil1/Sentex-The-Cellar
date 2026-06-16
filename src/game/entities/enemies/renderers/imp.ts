import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ---------------------------------------------------------------------
 *  IMP — kis vörös ördögfióka szarvakkal, denevérszárnnyal és villás farokkal;
 *  tűzgolyót tart (active), teleportáláskor (hidden) elhalványul.
 * ------------------------------------------------------------------- */
export function drawImp(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob * 1.6) * r * 0.14;
  const flap = Math.sin(v.wob * 6);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;
  const mat = v.hidden ? 0.4 + Math.sin(v.wob * 18) * 0.2 : 1;

  if (v.hidden) {
    ctx.save();
    ctx.globalAlpha = 0.5 * mat;
    ctx.strokeStyle = '#ff8a4a';
    ctx.shadowColor = '#ff6a2a';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.6 + i * 0.5) * (1.2 - mat), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.7, 1.0);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.globalAlpha = mat;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // denevérszárnyak
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.flash ? '#fff' : darken(v.col, 0.3);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    const lift = -flap * r * 0.2;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, -r * 0.2);
    ctx.quadraticCurveTo(sgn * r * 0.9, -r * 0.5 + lift, sgn * r * 1.1, -r * 0.05 + lift);
    ctx.lineTo(sgn * r * 0.8, r * 0.05);
    ctx.lineTo(sgn * r * 0.9, r * 0.3);
    ctx.lineTo(sgn * r * 0.5, r * 0.1);
    ctx.lineTo(sgn * r * 0.35, r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // villás farok
  ctx.strokeStyle = body;
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.4);
  ctx.quadraticCurveTo(r * 0.4, r * 0.7, r * 0.3 + Math.sin(v.wob * 3) * r * 0.1, r * 0.95);
  ctx.stroke();
  ctx.fillStyle = darken(v.col, 0.1);
  const tx2 = r * 0.3 + Math.sin(v.wob * 3) * r * 0.1;
  ctx.beginPath();
  ctx.moveTo(tx2, r * 0.92); ctx.lineTo(tx2 + r * 0.14, r * 1.1); ctx.lineTo(tx2 - r * 0.04, r * 1.0);
  ctx.lineTo(tx2 - r * 0.18, r * 1.12); ctx.lineTo(tx2 - r * 0.06, r * 0.92);
  ctx.closePath();
  ctx.fill();

  // test
  const g = ctx.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.1, 0, 0, r * 0.6);
  g.addColorStop(0, light);
  g.addColorStop(0.6, body);
  g.addColorStop(1, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.05, r * 0.46, r * 0.54, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // fej + szarvak
  ctx.save();
  ctx.translate(0, -r * 0.5);
  ctx.fillStyle = v.flash ? '#fff' : light;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.36, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = darken(v.col, 0.2);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.22, -r * 0.18);
    ctx.quadraticCurveTo(sgn * r * 0.42, -r * 0.5, sgn * r * 0.3, -r * 0.6);
    ctx.quadraticCurveTo(sgn * r * 0.26, -r * 0.4, sgn * r * 0.1, -r * 0.28);
    ctx.closePath();
    ctx.fill();
  }
  // kaján szemek + vigyor
  const dx = Math.cos(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#ffd23a';
    glow(ctx, sgn * r * 0.14 + dx, -r * 0.02, r * 0.05, '#ffb13a', 4);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.14 + dx, -r * 0.02, r * 0.07, r * 0.06, sgn * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.14 + dx, -r * 0.02, r * 0.03, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, r * 0.16);
  ctx.quadraticCurveTo(0, r * 0.26, r * 0.16, r * 0.16);
  ctx.stroke();
  ctx.restore();

  // tűzgolyó a kézben (lövés előtt)
  if (v.active && !v.hidden) {
    const fx = Math.cos(look) * r * 0.6, fy = Math.sin(look) * r * 0.6 + r * 0.1;
    const fire = ctx.createRadialGradient(fx, fy, 1, fx, fy, r * 0.3);
    fire.addColorStop(0, '#fff3b0');
    fire.addColorStop(0.5, '#ff9a3a');
    fire.addColorStop(1, '#ff4a1e');
    ctx.fillStyle = fire;
    glow(ctx, fx, fy, r * 0.2, '#ff7a2a', 12);
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.2, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
