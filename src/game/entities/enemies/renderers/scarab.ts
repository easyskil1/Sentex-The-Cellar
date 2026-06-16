import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ---------------------------------------------------------------------
 *  SCARAB — fémkék-arany szkarabeusz: ovális kitin, fejpajzs, ízelt lábak.
 *  ZÁRT szárnyfedővel sebezhető; NYITOTT szárnyfedővel (v.active) a két
 *  elytra kitárul, alóla membrán-szárnyak + védő-csillám látszik — EKKOR
 *  ELNYELI a lövedékeket (lásd Enemy.blocking / Tear). Random nyit-zár.
 * ------------------------------------------------------------------- */
export function drawScarab(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const gold = v.flash ? '#fff' : '#d8b24a';
  const sk = Math.sin(v.wob * 9);
  const open = !!v.active;
  const split = open ? r * 0.5 : 0; // a két szárnyfedő szétnyílása a középvonaltól

  shadow(ctx, v, 0.9, 0.55);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.face);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 6 ízelt láb
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.16);
  for (let i = -1; i <= 1; i++) {
    for (const sgn of [-1, 1]) {
      const bx = i * r * 0.5;
      const wig = sk * sgn * (i === 0 ? 1 : -1) * 2;
      ctx.beginPath();
      ctx.moveTo(bx, sgn * r * 0.5);
      ctx.lineTo(bx + i * r * 0.3 + wig, sgn * r * 1.05);
      ctx.stroke();
    }
  }

  // NYITOTT: a szárnyfedők alatti sötét test + áttetsző membrán-szárnyak
  if (open) {
    ctx.fillStyle = darken(v.col, 0.5);
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, 0, r * 0.92, r * 0.66, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,214,235,0.4)';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, sgn * r * 0.2, r * 0.85, r * 0.4, sgn * 0.28, 0, TAU);
      ctx.fill();
    }
  }

  // a két szárnyfedő (elytra) — a középvonaltól ±split-tel eltolva (zárva egybeolvad)
  for (const sgn of [-1, 1]) {
    const cy = sgn * split;
    const g = ctx.createRadialGradient(-r * 0.3, cy - r * 0.2, r * 0.12, 0, cy, r * 1.05);
    g.addColorStop(0, lighten(v.col, 0.5));
    g.addColorStop(0.6, body);
    g.addColorStop(1, darken(v.col, 0.35));
    ctx.fillStyle = v.flash ? '#fff' : g;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, cy, r * 1.05, open ? r * 0.5 : r * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // ZÁRT: középvonal-varrat + arany szkarabeusz-minta a háton
  if (!open) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.55, 0); ctx.lineTo(-r * 0.9, 0);
    ctx.moveTo(0, -r * 0.5); ctx.quadraticCurveTo(-r * 0.5, 0, 0, r * 0.5);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, 0, r * 0.28, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.18, r * 0.16, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // fejpajzs (clypeus) elöl, fogazott peremmel
  ctx.fillStyle = v.flash ? '#fff' : darken(v.col, 0.15);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(r * 0.78, 0, r * 0.34, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = gold;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(r * 1.05, i * r * 0.18);
    ctx.lineTo(r * 1.22, i * r * 0.18 - r * 0.06);
    ctx.lineTo(r * 1.22, i * r * 0.18 + r * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  // apró szemek
  ctx.fillStyle = '#0a0603';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.8, sgn * r * 0.34, r * 0.08, 0, TAU);
    ctx.fill();
  }

  // NYITOTT: pulzáló védő-csillám a test körül (jelzi, hogy a lövés lepattan)
  if (open) {
    ctx.globalAlpha = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(v.wob * 8));
    ctx.strokeStyle = '#bfe6ff';
    ctx.shadowColor = '#9fd6ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 1.12, 0, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
