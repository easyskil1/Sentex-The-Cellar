import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  MORTAR — zömök, megvetett tüzér-gólem, hátán ferdén felfelé álló
 *  mozsárcsővel; lövéskor (active) torkolatfüst és villanás felfelé.
 * ===================================================================== */
export function drawMortar(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const metal = v.flash ? '#fff' : '#7c7866';
  const recoil = v.active ? Math.max(0, 1 - (v.wob % 1) * 4) : 0; // rövid visszarúgás-lökés

  shadow(ctx, v, 1.1, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömzsi talpak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.5, r * 0.82, r * 0.34, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // --- mozsárcső a háton (jobb-hátra dőlve) ---
  ctx.save();
  ctx.translate(-r * 0.1, -r * 0.5);
  ctx.rotate(-0.5 - recoil * 0.12);
  const tube = ctx.createLinearGradient(-r * 0.3, 0, r * 0.3, 0);
  tube.addColorStop(0, '#34302a');
  tube.addColorStop(0.5, metal);
  tube.addColorStop(1, '#2a2620');
  ctx.fillStyle = v.flash ? '#fff' : tube;
  ctx.strokeStyle = '#1a1712';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, 0);
  ctx.lineTo(-r * 0.26, -r * 0.95);
  ctx.lineTo(r * 0.26, -r * 0.95);
  ctx.lineTo(r * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // csőszáj-perem
  ctx.fillStyle = '#15120c';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.95, r * 0.26, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = metal;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // megerősítő gyűrűk
  ctx.strokeStyle = '#1a1712';
  ctx.lineWidth = 1.4;
  for (const yy of [-0.3, -0.6]) {
    ctx.beginPath();
    ctx.moveTo(-r * (0.3 + yy * 0.06), yy * r);
    ctx.lineTo(r * (0.3 + yy * 0.06), yy * r);
    ctx.stroke();
  }
  // torkolatfüst + villanás lövéskor
  if (v.active) {
    glow(ctx, 0, -r * 0.95, r * (0.18 + recoil * 0.3), '#ffd27a', 14);
    ctx.fillStyle = 'rgba(180,180,170,0.35)';
    for (let i = 0; i < 4; i++) {
      const pf = ((v.wob * 0.8 + i * 0.25) % 1);
      ctx.globalAlpha = 0.4 * (1 - pf);
      ctx.beginPath();
      ctx.arc(Math.sin(i * 2) * r * 0.2, -r * 0.95 - pf * r * 0.9, r * (0.14 + pf * 0.4), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // testpáncél (széles, alacsony)
  const g = ctx.createLinearGradient(0, -r * 0.8, 0, r * 0.9);
  g.addColorStop(0, light);
  g.addColorStop(0.55, body);
  g.addColorStop(1, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 1.02, r * 0.74, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // szegecselt mellvért-lemez
  ctx.fillStyle = darken(v.col, 0.18);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.28, r * 0.6, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = metal;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.5, r * 0.28 + Math.sin(a) * r * 0.32, r * 0.05, 0, TAU);
    ctx.fill();
  }

  // mogorva szemvágás + szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.08;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.18, r * 0.55, r * 0.2, 0, 0, TAU);
  ctx.fill();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#ffb13a' : '#ffd98a';
    glow(ctx, sgn * r * 0.26 + dx, -r * 0.18, r * 0.1, v.active ? '#ff8a3a' : 'rgba(0,0,0,0)', v.active ? 8 : 0);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.26 + dx, -r * 0.18, r * 0.09, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
