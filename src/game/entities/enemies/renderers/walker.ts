import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  WALKER — narancs zömök, mérges talajlény, billegő lábakkal
 * ===================================================================== */
export function drawWalker(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.4);
  const squash = 1 + Math.sin(v.bob * 1.4 + Math.PI) * 0.06;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const belly = v.flash ? '#fff' : lighten(v.col, 0.18);

  shadow(ctx, v, 0.95, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // lábak (két stubby, váltakozva lépnek)
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.45, r * 0.85 - lift * 4, r * 0.26, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // apró karok
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.16;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.7, r * 0.05);
    ctx.lineTo(sgn * r * 0.95, r * 0.35 + (sgn > 0 ? -step : step) * 3);
    ctx.stroke();
  }

  // test (zömök, lekerekített)
  const bodyGrad = ctx.createLinearGradient(0, -r, 0, r * 0.9);
  bodyGrad.addColorStop(0, light);
  bodyGrad.addColorStop(0.55, body);
  bodyGrad.addColorStop(1, darken(v.col, 0.25));
  ctx.fillStyle = v.flash ? '#fff' : bodyGrad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * squash, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // világosabb has-folt
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.28, r * 0.5, r * 0.42, 0, 0, TAU);
  ctx.fill();

  // mérges monobrow
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.32);
  ctx.lineTo(-r * 0.12, -r * 0.12);
  ctx.moveTo(r * 0.5, -r * 0.32);
  ctx.lineTo(r * 0.12, -r * 0.12);
  ctx.stroke();

  // szemek (a szemöldök alatt, a játékos felé pislantanak)
  const look = v.face;
  const dx = Math.cos(look) * r * 0.08;
  const dy = Math.sin(look) * r * 0.06;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.3, -r * 0.02, r * 0.2, r * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.02 + dy, r * 0.1, 0, TAU);
    ctx.fill();
  }

  // morgó száj, kis fogakkal
  ctx.fillStyle = darken(v.col, 0.55);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.34, r * 0.18 * (1 + Math.abs(step) * 0.3), 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (const tx of [-0.18, 0.06]) {
    ctx.beginPath();
    ctx.moveTo(r * (tx - 0.06), r * 0.34);
    ctx.lineTo(r * (tx + 0.06), r * 0.34);
    ctx.lineTo(r * tx, r * 0.46);
    ctx.closePath();
    ctx.fill();
  }

  // felső fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.5, r * 0.22, r * 0.12, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
