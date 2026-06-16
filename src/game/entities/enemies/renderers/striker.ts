import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  STRIKER — agresszív ragadozó nagy sarló-karmokkal; rárontáskor
 *  (active) előredől, mozgási-csíkok és kinyújtott karmok.
 * ===================================================================== */
export function drawStriker(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.5);
  const lunge = v.active ? 1 : 0;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const look = v.face;
  const cos = Math.cos(look), sin = Math.sin(look);

  // rárontás-csíkok a háta mögött
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = lighten(v.col, 0.2);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const o of [-0.4, 0, 0.4]) {
      const ox = -cos, oy = -sin;
      const px = v.x + ox * r * 0.6 + Math.cos(look + Math.PI / 2) * o * r;
      const py = v.y + oy * r * 0.6 + Math.sin(look + Math.PI / 2) * o * r;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + ox * r * 1.6, py + oy * r * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 1.0, 0.7);

  ctx.save();
  ctx.translate(v.x + cos * lunge * r * 0.15, v.y - Math.abs(step) * 2 + sin * lunge * r * 0.15);
  ctx.rotate(look + Math.PI / 2); // a test a haladás irányába dől (fej +y irányba)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // két nagy sarló-karom elöl (a fej két oldalán), rárontáskor kinyúlnak
  for (const sgn of [-1, 1]) {
    const reach = 0.55 + lunge * 0.4 + Math.max(0, sgn * step) * 0.12;
    const grad = ctx.createLinearGradient(0, -r, 0, -r * 1.6);
    grad.addColorStop(0, v.flash ? '#fff' : light);
    grad.addColorStop(1, v.flash ? '#fff' : '#fff0e6');
    ctx.fillStyle = grad;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.5, -r * 0.5);
    ctx.quadraticCurveTo(sgn * r * 1.15, -r * (0.7 + reach), sgn * r * 0.45, -r * (1.05 + reach));
    ctx.quadraticCurveTo(sgn * r * 0.2, -r * (0.7 + reach * 0.6), sgn * r * 0.18, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // hátsó lábak (rovarszerű, lépő)
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.15;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.4, r * 0.4);
    ctx.quadraticCurveTo(sgn * r * 0.9, r * 0.6, sgn * r * 0.75, r * 1.0 - lift * 4);
    ctx.stroke();
  }

  // megnyúlt test (páncélos tor)
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.7, r * 0.98, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // páncél-szegmensek
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.6;
  for (const yy of [-0.3, 0.05, 0.4]) {
    ctx.beginPath();
    ctx.ellipse(0, yy * r, r * 0.66 * (1 - Math.abs(yy) * 0.3), r * 0.08, 0, 0, Math.PI);
    ctx.stroke();
  }

  // dühös szempár a fej-végen (+y)
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#fff' : '#ffe2d2';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.26, -r * 0.6, r * 0.16, r * 0.2, sgn * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = v.active ? '#d22' : dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.26, -r * 0.6, r * 0.08, 0, TAU);
    ctx.fill();
  }
  // agresszív szemöldök-él
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.78); ctx.lineTo(-r * 0.1, -r * 0.6);
  ctx.moveTo(r * 0.42, -r * 0.78); ctx.lineTo(r * 0.1, -r * 0.6);
  ctx.stroke();

  ctx.restore();
}
