import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, radial3, radial2 } from './helpers';

/* ===================================================================== *
 *  ROTLING — zöld, puffadt mérgező féreg, csöpögő nyálkával
 * ===================================================================== */
export function drawRotling(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const pulse = 1 + Math.sin(v.bob * 1.1) * 0.06;
  const squash = 1 + Math.sin(v.bob * 1.1 + Math.PI) * 0.05;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.45);
  const toxic = v.flash ? '#fff' : '#dcff7a';

  shadow(ctx, v, 1.05, 0.7);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // csöpögő nyálka az alja alól
  ctx.fillStyle = 'rgba(143,191,74,0.5)';
  for (const sgn of [-1, 0.4, 1]) {
    const dl = (Math.sin(v.wob * 1.3 + sgn * 2) * 0.5 + 0.5) * r * 0.5;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.5, r * 0.75 + dl, r * 0.12, r * 0.18 + dl * 0.3, 0, 0, TAU);
    ctx.fill();
  }

  // puffadt test
  const g = radial3(ctx, -r * 0.3, -r * 0.4, r * 0.15, 0, 0, r * 1.1, 0.6, light, body, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.02 * pulse, r * 0.86 * squash, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // mérgező hólyagok a háton
  for (const [bx, by, bs] of [[-0.4, -0.45, 0.26], [0.2, -0.55, 0.22], [0.5, -0.2, 0.2], [-0.1, -0.25, 0.18]] as const) {
    const bubble = radial2(ctx, bx * r - bs * r * 0.3, by * r - bs * r * 0.3, 1, bx * r, by * r, bs * r, v.flash ? '#fff' : '#f4ffb0', v.flash ? '#fff' : toxic);
    ctx.fillStyle = bubble;
    ctx.strokeStyle = darken('#8fbf4a', 0.35);
    ctx.lineWidth = 1.2;
    const wob = v.active ? 1 + Math.sin(v.wob * 8 + bx * 9) * 0.12 : 1;
    ctx.beginPath();
    ctx.arc(bx * r, by * r, bs * r * wob, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // világos has-folt
  ctx.fillStyle = v.flash ? '#fff' : lighten(v.col, 0.25);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.32, 0, 0, TAU);
  ctx.fill();

  // beesett apró szemek + morc redő
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06;
  const dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#1d2a0c';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.26, r * 0.02, r * 0.13, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = toxic;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.26 + dx, r * 0.02 + dy, r * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.1, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
