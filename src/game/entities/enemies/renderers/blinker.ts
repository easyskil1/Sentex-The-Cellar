import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  BLINKER — fázis-szellem: rendesen áttetsző lila lidérc nagy szemmel;
 *  (újra)materializáláskor (hidden) kicsiről felskálázódik, glitch-gyűrűkkel.
 * ===================================================================== */
export function drawBlinker(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.16;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  // materializáció: hidden alatt 0.4→teljes méret/átlátszóság
  const mat = v.hidden ? 0.45 + Math.sin(v.wob * 20) * 0.25 : 1;
  const scl = v.hidden ? 0.5 + (1 - (mat < 0.6 ? 0.4 : 0)) * 0.5 : 1;

  // teleport glitch-gyűrűk megjelenéskor
  if (v.hidden) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#c8a0ff';
    ctx.shadowColor = '#b08aff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const rr = r * (0.6 + i * 0.5) * (1.2 - mat);
      ctx.globalAlpha = 0.5 * mat;
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, rr, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.7 * scl, 1.0);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.scale(scl, scl);
  ctx.globalAlpha = mat;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // alul szétfoszló energia-üstök
  const g = ctx.createLinearGradient(0, -r, 0, r * 1.2);
  g.addColorStop(0, light);
  g.addColorStop(0.6, body);
  g.addColorStop(1, 'rgba(42,26,74,0)');
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, 0);
  ctx.quadraticCurveTo(-r * 0.88, -r * 0.9, 0, -r * 0.9);
  ctx.quadraticCurveTo(r * 0.88, -r * 0.9, r * 0.78, 0);
  for (let i = 4; i >= 0; i--) {
    const tx = -r * 0.78 + (i / 4) * r * 1.56;
    const low = r * (0.7 + Math.sin(v.wob * 4 + i * 1.4) * 0.45);
    if (i === 4) ctx.lineTo(tx, r * 0.3);
    ctx.quadraticCurveTo(tx + r * 0.1, low, tx - r * 0.16, r * 0.35);
  }
  ctx.closePath();
  ctx.fill();

  // belső energia-erezet
  ctx.strokeStyle = 'rgba(200,160,255,0.5)';
  ctx.lineWidth = 1.2;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.quadraticCurveTo(sgn * r * 0.4, 0, sgn * r * 0.2, r * 0.5);
    ctx.stroke();
  }

  // nagy ciklop-szem a játékos felé
  const look = v.face;
  const ex = Math.cos(look) * r * 0.18, ey = Math.sin(look) * r * 0.16;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#b08aff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.3, r * 0.38, r * 0.44, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = darken(v.col, 0.05);
  ctx.beginPath();
  ctx.arc(ex, -r * 0.3 + ey, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a0c2a';
  ctx.beginPath();
  ctx.arc(ex, -r * 0.3 + ey, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(ex - r * 0.07, -r * 0.38 + ey, r * 0.05, 0, TAU);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}
