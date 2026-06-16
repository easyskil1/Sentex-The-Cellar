import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  FLANKER — karcsú, aerodinamikus sikló-bestia oldalsó uszony-szárnyakkal;
 *  gyors ívelő mozgás, hátul sebesség-csíkokkal.
 * ===================================================================== */
export function drawFlanker(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.44);
  const look = v.face;
  const cos = Math.cos(look), sin = Math.sin(look);
  const flap = Math.sin(v.wob * 6);

  // sebesség-csíkok hátul
  if (v.moving) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = lighten(v.col, 0.25);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const o of [-0.35, 0, 0.35]) {
      const px = v.x - cos * r * 0.8 + Math.cos(look + Math.PI / 2) * o * r;
      const py = v.y - sin * r * 0.8 + Math.sin(look + Math.PI / 2) * o * r;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - cos * r * 1.3, py - sin * r * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.9, 0.78);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(look); // a hegyes orr (+x) a haladás irányába néz
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // oldalsó uszony-szárnyak (csapkodnak)
  for (const sgn of [-1, 1]) {
    const wing = ctx.createLinearGradient(0, 0, 0, sgn * r);
    wing.addColorStop(0, v.flash ? '#fff' : body);
    wing.addColorStop(1, v.flash ? '#fff' : darken(v.col, 0.3));
    ctx.fillStyle = wing;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, sgn * r * 0.2);
    ctx.quadraticCurveTo(-r * 0.5, sgn * r * (0.9 + flap * 0.2), r * 0.1, sgn * r * (1.05 + flap * 0.25));
    ctx.quadraticCurveTo(r * 0.3, sgn * r * 0.5, r * 0.35, sgn * r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // megnyúlt, áramvonalas test
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, darken(v.col, 0.25));
  g.addColorStop(0.5, body);
  g.addColorStop(1, light);
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(r * 1.15, 0); // hegyes orr
  ctx.quadraticCurveTo(r * 0.3, -r * 0.62, -r * 0.7, -r * 0.4);
  ctx.quadraticCurveTo(-r * 1.1, 0, -r * 0.7, r * 0.4);
  ctx.quadraticCurveTo(r * 0.3, r * 0.62, r * 1.15, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // háti gerinc-él
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.9, 0);
  ctx.lineTo(-r * 0.6, 0);
  ctx.stroke();
  // farok-uszony
  ctx.fillStyle = darken(v.col, 0.2);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(-r * 1.0, -r * 0.3 + flap * r * 0.1);
  ctx.lineTo(-r * 0.95, 0);
  ctx.lineTo(-r * 1.0, r * 0.3 + flap * r * 0.1);
  ctx.closePath();
  ctx.fill();

  // ravasz szempár az orr közelében
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(r * 0.5, sgn * r * 0.22, r * 0.15, r * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(r * 0.56, sgn * r * 0.22, r * 0.07, 0, TAU);
    ctx.fill();
  }

  // orr-csillanás
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(r * 0.55, -r * 0.12, r * 0.18, r * 0.07, 0.3, 0, TAU);
  ctx.fill();

  ctx.restore();
}
