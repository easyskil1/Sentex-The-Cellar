import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { darken, shadow, glow, radial2 } from './helpers';

/* ---------------------------------------------------------------------
 *  SKELETON — koponya + bordák + csont-végtagok; csontnyíl-lövéskor
 *  (active) a szemgödrök felizzanak.
 * ------------------------------------------------------------------- */
export function drawSkeleton(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.3);
  const bone = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const shade = v.flash ? '#fff' : darken(v.col, 0.18);
  const look = v.face;

  shadow(ctx, v, 0.8, 0.84);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // láb-csontok
  ctx.strokeStyle = bone;
  ctx.lineWidth = r * 0.16;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.2, r * 0.3);
    ctx.lineTo(sgn * r * 0.3, r * 0.95 - lift * 4);
    ctx.stroke();
  }

  // bordakosár
  ctx.fillStyle = v.flash ? '#fff' : shade;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.5, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // gerinc + bordák
  ctx.strokeStyle = bone;
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.05); ctx.lineTo(0, r * 0.55);
  ctx.stroke();
  ctx.lineWidth = r * 0.07;
  for (const yy of [0.05, 0.25, 0.45]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * yy);
    ctx.quadraticCurveTo(0, r * (yy + 0.12), r * 0.4, r * yy);
    ctx.stroke();
  }

  // kar-csontok (egyik a játékos felé nyúl, mint egy csont-íj/nyíl)
  ctx.strokeStyle = bone;
  ctx.lineWidth = r * 0.13;
  const reach = Math.cos(look) * r * 0.5;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.45, r * 0.1);
    ctx.lineTo(sgn * r * 0.55 + reach * 0.5, r * 0.0 + (v.active ? -r * 0.1 : r * 0.1));
    ctx.stroke();
  }

  // koponya
  const sg = radial2(ctx, -r * 0.12, -r * 0.55, r * 0.1, 0, -r * 0.45, r * 0.55, '#fff', bone);
  ctx.fillStyle = v.flash ? '#fff' : sg;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // állkapocs
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.12, r * 0.26, r * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // fogsor
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.08, -r * 0.2); ctx.lineTo(i * r * 0.08, -r * 0.05);
    ctx.stroke();
  }
  // szemgödrök (izzanak lövéskor)
  const dx = Math.cos(look) * r * 0.05, dy = Math.sin(look) * r * 0.04;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#0a0806';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.16, -r * 0.5, r * 0.12, r * 0.14, 0, 0, TAU);
    ctx.fill();
    if (v.active) {
      glow(ctx, sgn * r * 0.16 + dx, -r * 0.5 + dy, r * 0.06, '#ff7a3a', 8);
      ctx.fillStyle = '#ffb13a';
      ctx.beginPath();
      ctx.arc(sgn * r * 0.16 + dx, -r * 0.5 + dy, r * 0.05, 0, TAU);
      ctx.fill();
    }
  }
  // orrüreg
  ctx.fillStyle = '#0a0806';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.42); ctx.lineTo(-r * 0.05, -r * 0.3); ctx.lineTo(r * 0.05, -r * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
