import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, glow, aura, linear3 } from './helpers';

/* ---------------------------------------------------------------------
 *  BANSHEE — sirató kísértet hosszú hajjal, alul elfoszló; sikolykor
 *  (active) tágra nyílt sikoltó száj és kifelé lüktető hanghullámok.
 * ------------------------------------------------------------------- */
export function drawBanshee(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.2;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  const look = v.face;

  // sikoly-hanghullámok
  if (v.active) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const ph = (v.wob * 1.8 + i / 3) % 1;
      ctx.globalAlpha = 0.4 * (1 - ph);
      ctx.strokeStyle = '#dceaf2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.7 + ph * 2.6), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  aura(ctx, v.x, v.y + float, r * 1.6, '170,192,208', 0.14);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.globalAlpha = 0.92;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hosszú, lobogó haj + alul foszló test
  const g = linear3(ctx, 0, -r, 0, r * 1.4, 0.5, light, body, 'rgba(32,48,58,0)');
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.2);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.9, 0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.95, -r * 0.9, r * 0.7, -r * 0.2);
  // foszló alj (haj-tincsek)
  for (let i = 5; i >= 0; i--) {
    const tx = -r * 0.7 + (i / 5) * r * 1.4;
    const low = r * (0.9 + Math.sin(v.wob * 2.5 + i * 1.2) * 0.5);
    if (i === 5) ctx.lineTo(tx, r * 0.4);
    ctx.quadraticCurveTo(tx + r * 0.12, low, tx - r * 0.16, r * 0.4);
  }
  ctx.closePath();
  ctx.fill();

  // arc
  ctx.fillStyle = 'rgba(232,242,250,0.92)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.35, r * 0.38, r * 0.44, 0, 0, TAU);
  ctx.fill();
  // beesett üres szemek
  const dx = Math.cos(look) * r * 0.05, dy = Math.sin(look) * r * 0.04;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#16242e';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.15, -r * 0.4, r * 0.09, r * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = v.active ? '#dffaff' : '#8ab0c4';
    glow(ctx, sgn * r * 0.15 + dx, -r * 0.4 + dy, r * 0.04, '#aad0e4', v.active ? 8 : 3);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.15 + dx, -r * 0.4 + dy, r * 0.035, 0, TAU);
    ctx.fill();
  }
  // sikoltó száj (függőleges ovális, tágra nyílva aktívkor)
  ctx.fillStyle = '#101c24';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.12, r * (v.active ? 0.13 : 0.07), r * (v.active ? 0.22 : 0.1), 0, 0, TAU);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}
