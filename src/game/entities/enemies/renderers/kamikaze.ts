import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { parse, lighten, darken, shadow, glow, radial3 } from './helpers';

/* ===================================================================== *
 *  KAMIKAZE — ketyegő élő bomba: gömbtest sercegő kanóccal, vészjósló
 *  vörös villogással (active végig igaz) és riadt nagy szemekkel.
 * ===================================================================== */
export function drawKamikaze(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob * 2) * r * 0.06;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  // gyorsuló villogás (a robbanás közeledtét sugallja)
  const blink = (Math.sin(v.wob * 9) + 1) * 0.5;
  const body = v.flash ? '#fff' : `rgb(${Math.round(parse(v.col)[0] + blink * 60)},${Math.round(parse(v.col)[1] * (1 - blink * 0.3))},${Math.round(parse(v.col)[2] * (1 - blink * 0.3))})`;

  // vészjósló pír
  ctx.save();
  ctx.globalAlpha = 0.25 + blink * 0.25;
  ctx.fillStyle = '#ff5a2a';
  ctx.shadowColor = '#ff3a1e';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(v.x, v.y + float, r * 1.35, 0, TAU);
  ctx.fill();
  ctx.restore();

  shadow(ctx, v, 0.85, 0.85);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // apró kapálózó lábacskák
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.13;
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const bx = sgn * r * (0.3 + i * 0.3);
      ctx.beginPath();
      ctx.moveTo(bx * 0.6, r * 0.55);
      ctx.lineTo(bx, r * 0.95 + Math.sin(v.wob * 12 + i + sgn) * 3);
      ctx.stroke();
    }
  }

  // bomba-gömbtest
  const g = radial3(ctx, -r * 0.3, -r * 0.35, r * 0.12, 0, 0, r * 0.9, 0.6, light, body, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // kanóc-csonk a tetején + sercegő szikra
  ctx.strokeStyle = '#3a2c20';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.18, -r * 1.05, r * 0.08, -r * 1.2);
  ctx.stroke();
  glow(ctx, r * 0.08, -r * 1.2, r * 0.12 * (0.7 + blink * 0.6), blink > 0.5 ? '#fff3b0' : '#ff8a2a', 12);
  // kipattanó szikrák
  ctx.fillStyle = '#ffd27a';
  for (let i = 0; i < 3; i++) {
    const a = v.wob * 4 + i * 2.1;
    const rr = r * (0.2 + (blink) * 0.2);
    ctx.globalAlpha = blink;
    ctx.beginPath();
    ctx.arc(r * 0.08 + Math.cos(a) * rr, -r * 1.2 + Math.sin(a) * rr, r * 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // riadt, tágra nyílt szempár
  const look = v.face;
  const dx = Math.cos(look) * r * 0.08, dy = Math.sin(look) * r * 0.06;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3, -r * 0.05, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0805';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.05 + dy, r * 0.1, 0, TAU);
    ctx.fill();
    // ideges csillanás
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx - r * 0.05, -r * 0.1 + dy, r * 0.04, 0, TAU);
    ctx.fill();
  }
  // tátott riadt száj
  ctx.fillStyle = '#1a0805';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.32, r * 0.14, r * 0.18, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}
