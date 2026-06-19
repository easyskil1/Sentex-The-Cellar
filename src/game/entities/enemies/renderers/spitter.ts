import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, linear3, radial2 } from './helpers';

/* ===================================================================== *
 *  SPITTER — savzöld varangy, felfúvódó toroktömlővel és tátott pofával
 * ===================================================================== */
export function drawSpitter(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const hop = Math.abs(Math.sin(v.bob * 1.5));
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const sac = v.active ? 1.35 + Math.sin(v.wob * 10) * 0.1 : 1; // toroktömlő felfúvódik lövéskor

  shadow(ctx, v, 1.0, 0.78);

  ctx.save();
  ctx.translate(v.x, v.y - hop * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hátsó guggoló lábak
  ctx.fillStyle = darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.85, r * 0.55, r * 0.3, r * 0.2, sgn * 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // test
  const g = linear3(ctx, 0, -r * 0.8, 0, r * 0.8, 0.55, light, body, darken(v.col, 0.28));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.96, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // foltok a háton
  ctx.fillStyle = darken(v.col, 0.32);
  for (const [sx, sy, ss] of [[-0.4, -0.3, 0.16], [0.35, -0.35, 0.13], [0.1, -0.5, 0.11]] as const) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, ss * r, ss * r * 0.8, 0, 0, TAU);
    ctx.fill();
  }

  // felfúvódó toroktömlő (savsárga, lövéskor világít)
  const throatGrad = radial2(ctx, 0, r * 0.3, 2, 0, r * 0.3, r * 0.5 * sac, v.active ? '#f4ff8a' : lighten(v.col, 0.3), darken(v.col, 0.1));
  ctx.fillStyle = v.flash ? '#fff' : throatGrad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.34, r * 0.42 * sac, r * 0.32 * sac, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // nagy kidülledő szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.1;
  const dy = Math.sin(look) * r * 0.08;
  for (const sgn of [-1, 1]) {
    // szemdudor
    ctx.fillStyle = v.flash ? '#fff' : light;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.4, -r * 0.55, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f4ff8a';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.4, -r * 0.55, r * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1d2400';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.4 + dx, -r * 0.55 + dy, r * 0.07, r * 0.12, 0, 0, TAU);
    ctx.fill();
  }

  // széles száj (lövéskor tátva)
  ctx.fillStyle = '#1d2400';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (v.active) {
    ctx.ellipse(Math.cos(look) * r * 0.2, -r * 0.05 + Math.sin(look) * r * 0.1, r * 0.26, r * 0.22, 0, 0, TAU);
  } else {
    ctx.ellipse(0, -r * 0.02, r * 0.42, r * 0.12, 0, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
