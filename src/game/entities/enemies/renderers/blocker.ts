import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  BLOCKER — nehéz páncélos őr nagy energiapajzzsal; blokkoláskor
 *  (active) a pajzsot maga elé emeli, fényes hatszög-energiamezővel.
 * ===================================================================== */
export function drawBlocker(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.1);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const look = v.face;
  const cos = Math.cos(look), sin = Math.sin(look);

  shadow(ctx, v, 1.05, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömzsi lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.42, r * 0.85 - lift * 3, r * 0.3, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // test (vaskos páncél)
  const g = ctx.createLinearGradient(0, -r, 0, r * 0.9);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.86, r * 0.92, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // sisak-taréj
  ctx.fillStyle = darken(v.col, 0.25);
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 0.9);
  ctx.lineTo(0, -r * 1.15);
  ctx.lineTo(r * 0.12, -r * 0.9);
  ctx.closePath();
  ctx.fill();

  // vizor-szemrés
  const dx = cos * r * 0.06;
  ctx.fillStyle = '#0e1014';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.12, r * 0.46, r * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = v.active ? '#aef0ff' : '#7fb0c8';
  for (const sgn of [-1, 1]) {
    glow(ctx, sgn * r * 0.2 + dx, -r * 0.12, r * 0.07, '#9fe0ff', v.active ? 8 : 3);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.2 + dx, -r * 0.12, r * 0.06, 0, TAU);
    ctx.fill();
  }

  // mellvért-perem
  ctx.strokeStyle = darken(v.col, 0.35);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, r * 0.05, r * 0.6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();

  // --- nagy energiapajzs a játékos felé (a test fölé, világ-térben) ---
  const sx = v.x + cos * r * (v.active ? 1.15 : 0.9);
  const sy = v.y + sin * r * (v.active ? 1.15 : 0.9) - Math.abs(step) * 1.5;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(look + Math.PI / 2);
  const shScale = v.active ? 1.18 : 0.96;
  // pajzs-lemez
  const sh = ctx.createLinearGradient(0, -r * shScale, 0, r * shScale);
  sh.addColorStop(0, lighten(v.col, 0.3));
  sh.addColorStop(1, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : sh;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.0 * shScale);
  ctx.quadraticCurveTo(r * 0.5 * shScale, -r * 0.7 * shScale, r * 0.46 * shScale, r * 0.5 * shScale);
  ctx.quadraticCurveTo(r * 0.25 * shScale, r * 0.95 * shScale, 0, r * 1.05 * shScale);
  ctx.quadraticCurveTo(-r * 0.25 * shScale, r * 0.95 * shScale, -r * 0.46 * shScale, r * 0.5 * shScale);
  ctx.quadraticCurveTo(-r * 0.5 * shScale, -r * 0.7 * shScale, 0, -r * 1.0 * shScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // pajzs-bordák
  ctx.strokeStyle = lighten(v.col, 0.15);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9 * shScale); ctx.lineTo(0, r * 0.95 * shScale);
  ctx.moveTo(-r * 0.36 * shScale, -r * 0.2 * shScale); ctx.lineTo(r * 0.36 * shScale, -r * 0.2 * shScale);
  ctx.stroke();
  // aktív energiamező-ragyogás
  if (v.active) {
    ctx.globalAlpha = 0.4 + Math.sin(v.wob * 8) * 0.2;
    ctx.strokeStyle = '#aef0ff';
    ctx.shadowColor = '#7fd0ff';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.stroke();
    // központi energiamag
    glow(ctx, 0, 0, r * 0.14, '#cdf4ff', 12);
  }
  ctx.restore();
}
