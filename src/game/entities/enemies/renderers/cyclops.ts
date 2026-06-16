import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ---------------------------------------------------------------------
 *  CYCLOPS — egyszemű húsóriás bunkó-ököllel; szikla-vetéskor (active)
 *  felemeli a sziklát és a szeme kitágul.
 * ------------------------------------------------------------------- */
export function drawCyclops(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.0);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.36);
  const look = v.face;

  shadow(ctx, v, 1.1, 0.74);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömzsi lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.4, r * 0.9 - lift * 4, r * 0.3, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // felemelt kar + szikla (aktívkor a feje fölé)
  if (v.active) {
    ctx.strokeStyle = darken(v.col, 0.2);
    ctx.lineWidth = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.3);
    ctx.lineTo(r * 0.5, -r * 1.0);
    ctx.stroke();
    const rock = ctx.createRadialGradient(r * 0.4, -r * 1.2, r * 0.1, r * 0.5, -r * 1.1, r * 0.5);
    rock.addColorStop(0, '#9a8a76');
    rock.addColorStop(1, '#4a4036');
    ctx.fillStyle = rock;
    ctx.strokeStyle = '#2a241c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 1.05);
    ctx.lineTo(r * 0.55, -r * 1.35);
    ctx.lineTo(r * 0.85, -r * 1.1);
    ctx.lineTo(r * 0.7, -r * 0.8);
    ctx.lineTo(r * 0.3, -r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // izmos törzs
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.34));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, 0.05 * r, r * 0.92, r * 0.94, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // pihenő kar (a játékostól elfelé)
  if (!v.active) {
    ctx.strokeStyle = darken(v.col, 0.2);
    ctx.lineWidth = r * 0.24;
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.1);
    ctx.lineTo(r * 0.95, r * 0.4);
    ctx.stroke();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(r * 0.97, r * 0.42, r * 0.2, 0, TAU);
    ctx.fill();
  }

  // EGY nagy központi szem
  const ex = Math.cos(look) * r * 0.18, ey = Math.sin(look) * r * 0.14;
  const eyeR = v.active ? r * 0.4 : r * 0.34;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, eyeR, eyeR * 1.05, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = v.active ? '#d24a3a' : '#b85a3a';
  ctx.beginPath();
  ctx.arc(ex, -r * 0.2 + ey, eyeR * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a0c08';
  ctx.beginPath();
  ctx.arc(ex, -r * 0.2 + ey, eyeR * 0.28, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(ex - eyeR * 0.2, -r * 0.28 + ey, eyeR * 0.14, 0, TAU);
  ctx.fill();
  // vastag szemöldök-redő
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.5);
  ctx.quadraticCurveTo(0, -r * 0.62, r * 0.4, -r * 0.5);
  ctx.stroke();
  // mogorva száj
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.5);
  ctx.quadraticCurveTo(0, r * 0.4, r * 0.3, r * 0.5);
  ctx.stroke();

  ctx.restore();
}
