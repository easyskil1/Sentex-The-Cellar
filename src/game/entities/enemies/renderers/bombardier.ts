import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, linear3, radial2, softGlow } from './helpers';

/* ===================================================================== *
 *  BOMBARDIER — páncélos bogár-gólem, hátán ketyegő aknával
 * ===================================================================== */
export function drawBombardier(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.6);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const metal = v.flash ? '#fff' : '#7a7060';

  shadow(ctx, v, 1.0, 0.74);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // apró ízelt lábak
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.13;
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lift = ((i % 2 === 0) === (sgn > 0) ? Math.max(0, step) : Math.max(0, -step)) * 3;
      const bx = sgn * r * 0.55;
      const lx = sgn * r * (0.95 + i * 0.05);
      const ly = r * (0.35 + i * 0.22) - lift;
      ctx.beginPath();
      ctx.moveTo(bx, r * (0.1 + i * 0.18));
      ctx.lineTo(lx, ly);
      ctx.stroke();
    }
  }

  // páncélozott test
  const g = linear3(ctx, 0, -r, 0, r, 0.55, light, body, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.95, r * 0.78, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // páncéllemez-varratok
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.6;
  for (const yy of [-0.2, 0.15, 0.45]) {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.95 * (1 - Math.abs(yy) * 0.3), r * 0.06, 0, 0, Math.PI, true);
    ctx.stroke();
  }

  // hátára szerelt akna (fémgömb + gyújtózsinór, aktívkor világít)
  const mineY = -r * 0.55;
  const mg = radial2(ctx, -r * 0.1, mineY - r * 0.15, 1, 0, mineY, r * 0.42, lighten(metal, 0.4), '#2a2620');
  ctx.fillStyle = v.flash ? '#fff' : mg;
  ctx.strokeStyle = '#15120c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, mineY, r * 0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // szegecsek
  ctx.fillStyle = '#15120c';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.28, mineY + Math.sin(a) * r * 0.28, r * 0.04, 0, TAU);
    ctx.fill();
  }
  // gyújtózsinór + szikra
  ctx.strokeStyle = '#3a2c20';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, mineY - r * 0.4);
  ctx.quadraticCurveTo(r * 0.2, mineY - r * 0.7, r * 0.12, mineY - r * 0.85);
  ctx.stroke();
  const spark = v.active ? 1 : 0.4 + Math.sin(v.wob * 6) * 0.3;
  softGlow(ctx, r * 0.12, mineY - r * 0.85, r * 0.09 * (0.7 + spark * 0.6) + 10 * spark, '#ff8a2a');
  ctx.fillStyle = `rgba(255,${120 + spark * 100},40,${spark})`;
  ctx.beginPath();
  ctx.arc(r * 0.12, mineY - r * 0.85, r * 0.09 * (0.7 + spark * 0.6), 0, TAU);
  ctx.fill();

  // gépi szem-szenzor
  const look = v.face;
  const dx = Math.cos(look) * r * 0.1;
  ctx.fillStyle = '#15120c';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.5, r * 0.18, 0, 0, TAU);
  ctx.fill();
  softGlow(ctx, dx, r * 0.18, r * 0.16, '#ff3a1e');
  ctx.fillStyle = v.flash ? '#fff' : '#ff5a3a';
  ctx.beginPath();
  ctx.arc(dx, r * 0.18, r * 0.08, 0, TAU);
  ctx.fill();

  ctx.restore();
}
