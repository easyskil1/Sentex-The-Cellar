import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, radial2, linear3 } from './helpers';

/* ===================================================================== *
 *  MISTWEAVER — kísértet-lidérc, rongyos lepelben, ködöt szövő kezekkel
 * ===================================================================== */
export function drawMistweaver(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.2;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  const body = v.flash ? '#fff' : v.col;

  // halvány köd-glória maga körül
  ctx.save();
  ctx.globalAlpha = 0.15 + (v.active ? 0.12 : 0) + Math.sin(v.wob * 2) * 0.04;
  const halo = radial2(ctx, v.x, v.y + float, r * 0.4, v.x, v.y + float, r * 2.4, '#cfc8ee', 'rgba(176,166,224,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(v.x, v.y + float, r * 2.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.92;

  // rongyos, alul szétfoszló lepel
  const tatters = 7;
  const g = linear3(ctx, 0, -r, 0, r * 1.4, 0.6, light, body, 'rgba(34,29,58,0)');
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.95, 0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.95, -r * 0.95, r * 0.85, 0);
  // alul cikkcakkos, hullámzó rojtok
  for (let i = tatters; i >= 0; i--) {
    const tx = -r * 0.85 + (i / tatters) * r * 1.7;
    const low = r * (0.9 + Math.sin(v.wob * 2 + i * 1.3) * 0.35);
    const mid = r * 0.5;
    if (i === tatters) ctx.lineTo(tx, mid);
    ctx.quadraticCurveTo(tx + r * 0.08, low, tx - r * 0.12, mid + r * 0.1);
  }
  ctx.closePath();
  ctx.fill();

  // csuklya-árnyék
  ctx.fillStyle = 'rgba(20,16,38,0.85)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.35, r * 0.5, r * 0.55, 0, 0, TAU);
  ctx.fill();

  // ködszövő kezek (oldalt nyúló halvány karok)
  ctx.strokeStyle = light;
  ctx.lineWidth = r * 0.12;
  ctx.globalAlpha = 0.5;
  for (const sgn of [-1, 1]) {
    const sw = Math.sin(v.wob * 1.5 + (sgn > 0 ? 0 : 1.5));
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.6, -r * 0.1);
    ctx.quadraticCurveTo(sgn * r * 1.1, r * 0.1 + sw * r * 0.2, sgn * r * 0.9, r * 0.5 + sw * r * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.92;

  // izzó üres szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.08;
  const dy = Math.sin(look) * r * 0.06;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#e8e2ff';
    ctx.shadowColor = '#b0a6e0';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.2 + dx, -r * 0.35 + dy, r * 0.09, r * 0.15, 0, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.restore();
  ctx.globalAlpha = 1;
}
