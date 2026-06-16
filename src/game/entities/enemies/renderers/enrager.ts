import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  ENRAGER — felhergelő dühdémon, izzó erekkel; üvöltéskor (active)
 *  tátott pofa, vörös felizzás és kifelé lüktető hanghullám-gyűrűk.
 * ===================================================================== */
export function drawEnrager(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.4);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;
  const throb = 1 + Math.sin(v.wob * (v.active ? 9 : 4)) * (v.active ? 0.07 : 0.03);

  // üvöltés-hanghullámok
  if (v.active) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const ph = (v.wob * 1.6 + i / 3) % 1;
      ctx.globalAlpha = 0.35 * (1 - ph);
      ctx.strokeStyle = '#ff5a4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(v.x, v.y, r * (0.9 + ph * 2.2), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 1.0, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // dobogó lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.45, r * 0.82 - lift * 5, r * 0.28, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // felmeredő hát-tüskék
  ctx.fillStyle = darken(v.col, 0.35);
  for (let i = -2; i <= 2; i++) {
    const h = r * (0.2 + Math.abs(i) * 0.04) * (v.active ? 1.4 : 1);
    ctx.beginPath();
    ctx.moveTo(i * r * 0.22 - r * 0.07, -r * 0.7);
    ctx.lineTo(i * r * 0.22, -r * 0.7 - h);
    ctx.lineTo(i * r * 0.22 + r * 0.07, -r * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  // izmos test (lüktet)
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.94 * throb, r * 0.88, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // izzó düh-erek
  ctx.strokeStyle = v.active ? '#ff8a4a' : '#c0402a';
  if (v.active) { ctx.shadowColor = '#ff4a2a'; ctx.shadowBlur = 8; }
  ctx.lineWidth = 1.8;
  for (const [sx, sy, mx, my, ex, ey] of [
    [-0.5, -0.1, -0.35, 0.2, -0.2, 0.5],
    [0.45, -0.2, 0.5, 0.1, 0.35, 0.45],
    [0.0, -0.45, 0.15, -0.2, 0.05, 0.05],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(sx * r, sy * r);
    ctx.quadraticCurveTo(mx * r, my * r, ex * r, ey * r);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // dühös, lefelé döntött szemöldök + izzó szemek
  const dx = Math.cos(look) * r * 0.08, dy = Math.sin(look) * r * 0.06;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.42); ctx.lineTo(-r * 0.12, -r * 0.16);
  ctx.moveTo(r * 0.55, -r * 0.42); ctx.lineTo(r * 0.12, -r * 0.16);
  ctx.stroke();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#ffd23a';
    glow(ctx, sgn * r * 0.3 + dx, -r * 0.05 + dy, r * 0.11, v.active ? '#ff6a2a' : '#ffb13a', v.active ? 10 : 4);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.05 + dy, r * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5a1500';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.05 + dy, r * 0.05, 0, TAU);
    ctx.fill();
  }

  // üvöltő/morgó száj fogakkal
  const open = v.active ? r * 0.28 : r * 0.12;
  ctx.fillStyle = '#3a0c00';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.36, open, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.13 - r * 0.05, r * 0.45 - open * 0.7);
    ctx.lineTo(i * r * 0.13 + r * 0.05, r * 0.45 - open * 0.7);
    ctx.lineTo(i * r * 0.13, r * 0.45 - open * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
