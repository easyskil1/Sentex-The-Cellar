import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  TURRET — rögzített talapzat forgó ágyúfejjel; a cső a lövés-szögbe
 *  fordul (wob×2), lövéskor (active) a torkolat felizzik.
 * ===================================================================== */
export function drawTurret(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.44);
  const metal = v.flash ? '#fff' : '#6a6478';
  const aim = v.wob * 2; // egyezik az Enemy.updateTurret lövés-szögével

  shadow(ctx, v, 1.1, 0.7);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // rögzített talapzat (széles, alacsony, csavarokkal)
  const base = ctx.createLinearGradient(0, 0, 0, r * 0.8);
  base.addColorStop(0, light);
  base.addColorStop(1, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : base;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, r * 0.7);
  ctx.lineTo(-r * 0.75, r * 0.05);
  ctx.lineTo(r * 0.75, r * 0.05);
  ctx.lineTo(r * 1.0, r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // talp-csavarok
  ctx.fillStyle = darken(v.col, 0.5);
  for (const sx of [-0.7, 0.7]) {
    ctx.beginPath();
    ctx.arc(sx * r, r * 0.5, r * 0.09, 0, TAU);
    ctx.fill();
  }

  // --- forgó ágyúfej (a cső a lövés-szögbe áll) ---
  ctx.save();
  ctx.rotate(aim);
  // cső
  const tube = ctx.createLinearGradient(0, -r * 0.22, 0, r * 0.22);
  tube.addColorStop(0, lighten(metal, 0.3));
  tube.addColorStop(1, '#26222e');
  ctx.fillStyle = v.flash ? '#fff' : tube;
  ctx.strokeStyle = '#15121c';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.rect(0, -r * 0.2, r * 1.15, r * 0.4);
  ctx.fill();
  ctx.stroke();
  // cső-gyűrűk
  ctx.strokeStyle = '#15121c';
  ctx.lineWidth = 1.4;
  for (const xx of [0.5, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(xx * r, -r * 0.2); ctx.lineTo(xx * r, r * 0.2);
    ctx.stroke();
  }
  // torkolat
  ctx.fillStyle = '#100e16';
  ctx.beginPath();
  ctx.ellipse(r * 1.15, 0, r * 0.08, r * 0.16, 0, 0, TAU);
  ctx.fill();
  if (v.active) glow(ctx, r * 1.15, 0, r * (0.12 + (v.wob * 4 % 1) * 0.16), '#c8a0ff', 12);
  ctx.restore();

  // forgó torony-kupola középen
  const dome = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 0.62);
  dome.addColorStop(0, light);
  dome.addColorStop(0.7, body);
  dome.addColorStop(1, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : dome;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.58, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // páncél-szegecsek a kupolán
  ctx.fillStyle = metal;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + v.wob * 0.3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.05, 0, TAU);
    ctx.fill();
  }

  // gépi szenzor-szem a kupola közepén (a cél felé)
  const ex = Math.cos(aim) * r * 0.16, ey = Math.sin(aim) * r * 0.16;
  ctx.fillStyle = '#100e16';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = v.active ? '#e0c0ff' : '#a080d0';
  glow(ctx, ex, ey, r * 0.1, '#b08aff', v.active ? 8 : 4);
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.11, 0, TAU);
  ctx.fill();

  ctx.restore();
}
