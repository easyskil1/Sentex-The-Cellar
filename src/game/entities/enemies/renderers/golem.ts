import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear3, softGlow } from './helpers';

/* ---------------------------------------------------------------------
 *  GOLEM — agyag/kő-kolosszus tömbkarokkal és izzó maggal a mellkasban;
 *  földcsapáskor (active) a repedések felizzanak.
 * ------------------------------------------------------------------- */
export function drawGolem(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 0.8);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.34);
  const look = v.face;

  // földcsapás lökéshullám
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.4 * Math.max(0, 1 - (v.wob % 1) * 2);
    ctx.strokeStyle = '#c8a070';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(v.x, v.y + r * 0.7, r * (1.3 + (v.wob % 1) * 2), r * 0.5, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  shadow(ctx, v, 1.2, 0.76);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömb-lábak
  ctx.fillStyle = darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(sgn * r * 0.55 - r * 0.24, r * 0.5, r * 0.48, r * 0.5);
    ctx.fill();
    ctx.stroke();
  }

  // vaskos tömb-karok (ököllel)
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.flash ? '#fff' : body;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.rect(sgn * r * 0.7 - r * 0.2, -r * 0.5, r * 0.4, r * 0.9);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.7, r * 0.5, r * 0.32, r * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // törzs (kő-tömb)
  const g = linear3(ctx, 0, -r, 0, r, 0.5, light, body, darken(v.col, 0.36));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.7);
  ctx.lineTo(r * 0.6, -r * 0.7);
  ctx.lineTo(r * 0.7, r * 0.55);
  ctx.lineTo(-r * 0.7, r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // izzó repedés-mag a mellkasban
  const glowI = v.active ? 1 : 0.5 + Math.sin(v.wob * 2) * 0.2;
  softGlow(ctx, 0, 0, r * 0.55, '#ff8a2a');
  ctx.strokeStyle = `rgba(255,${140 + glowI * 80},60,${0.6 + glowI * 0.4})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.15, -r * 0.1); ctx.lineTo(r * 0.12, r * 0.1); ctx.lineTo(-r * 0.05, r * 0.45);
  ctx.moveTo(-r * 0.15, -r * 0.1); ctx.lineTo(-r * 0.4, 0);
  ctx.moveTo(r * 0.12, r * 0.1); ctx.lineTo(r * 0.4, r * 0.05);
  ctx.stroke();
  // izzó mag
  glow(ctx, 0, 0, r * 0.13 * glowI, '#ffb13a', 12 * glowI);

  // fej (kicsi, a tömb tetején)
  ctx.fillStyle = v.flash ? '#fff' : darken(v.col, 0.1);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.rect(-r * 0.3, -r * 1.0, r * 0.6, r * 0.34);
  ctx.fill();
  ctx.stroke();
  // szem-rés
  const dx = Math.cos(look) * r * 0.05;
  ctx.fillStyle = '#100c08';
  ctx.fillRect(-r * 0.24, -r * 0.92, r * 0.48, r * 0.12);
  for (const sgn of [-1, 1]) {
    glow(ctx, sgn * r * 0.12 + dx, -r * 0.86, r * 0.05, '#ffb13a', v.active ? 8 : 4);
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.12 + dx, -r * 0.86, r * 0.045, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
