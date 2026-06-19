import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, radial3 } from './helpers';

/* ===================================================================== *
 *  LEAPER — szöcske/béka-szerű ugró erős hátsó lábakkal; töltéskor
 *  (active) összehúzódik és feszül, ugrás közben (lift>0) a levegőben
 *  lebeg, a talajon kis árnyékkal.
 * ===================================================================== */
export function drawLeaper(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const lift = v.lift ?? 0;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const look = v.face;
  const crouch = v.active ? 1 : 0; // töltés-guggolás
  // guggoláskor lapos, ugrás közben enyhén nyúlt
  const sx = 1 + crouch * 0.18 - lift * 0.1;
  const sy = 1 - crouch * 0.22 + lift * 0.14;

  // talaj-árnyék (ugrás közben kisebb és halványabb)
  ctx.save();
  ctx.globalAlpha = 0.28 * (1 - lift * 0.6);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + r * 0.7, r * 0.8 * (1 - lift * 0.3), r * 0.32 * (1 - lift * 0.3), 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(v.x, v.y - lift * r * 1.6);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // erős hátsó lábak (összehajtva guggolva, hátranyúlva ugrás közben)
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.2;
  for (const sgn of [-1, 1]) {
    // comb
    const kneeX = sgn * r * (0.7 + lift * 0.2);
    const kneeY = -r * (0.1 + crouch * 0.2) - lift * r * 0.1;
    const footX = sgn * r * (0.5 - lift * 0.3);
    const footY = r * (0.75 + lift * 0.5);
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, 0);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    // lábfej
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(footX, footY, r * 0.18, r * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  // apró első karok
  ctx.strokeStyle = darken(v.col, 0.2);
  ctx.lineWidth = r * 0.1;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, r * 0.2);
    ctx.lineTo(sgn * r * 0.5, r * 0.45);
    ctx.stroke();
  }

  // test
  const g = radial3(ctx, -r * 0.2, -r * 0.3, r * 0.1, 0, 0, r, 0.6, light, body, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78 * sx, r * 0.82 * sy, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // háti minta-csíkok
  ctx.strokeStyle = darken(v.col, 0.28);
  ctx.lineWidth = 2;
  for (const off of [-0.22, 0, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(off * r, -r * 0.7 * sy);
    ctx.quadraticCurveTo(off * r * 1.6, 0, off * r, r * 0.6 * sy);
    ctx.stroke();
  }

  // nagy kidülledő békaszem-pár a játékos felé
  const dx = Math.cos(look) * r * 0.1, dy = Math.sin(look) * r * 0.08;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.flash ? '#fff' : light;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.38, -r * 0.5 * sy, r * 0.26, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = v.active ? '#ffe08a' : '#dff0c0';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.38, -r * 0.5 * sy, r * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#16240a';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.38 + dx, -r * 0.5 * sy + dy, r * 0.07, r * 0.11, 0, 0, TAU);
    ctx.fill();
  }

  // töltés-feszültség jelzés
  if (v.active) {
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05 + Math.sin(v.wob * 10) * 2, -0.3, Math.PI + 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
