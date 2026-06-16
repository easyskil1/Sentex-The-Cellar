import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  SHOOTER — cián lebegő egyszemű köpködő, töltéskor felizzik
 * ===================================================================== */
export function drawShooter(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.16;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.45);

  shadow(ctx, v, 0.85, 1.0);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // lebegő csápok alul
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.14;
  for (const sgn of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.4, r * 0.5);
    ctx.quadraticCurveTo(
      sgn * r * 0.5 + Math.sin(v.wob + sgn) * 3,
      r * 0.9,
      sgn * r * 0.4 + Math.sin(v.wob * 1.5 + sgn) * 5,
      r * 1.15,
    );
    ctx.stroke();
  }

  // test (lebegő gömb)
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.7, body);
  g.addColorStop(1, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // töltés-felizzás
  if (v.aiming) {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(v.wob * 6) * 0.3;
    ctx.strokeStyle = light;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95 + Math.sin(v.wob * 6) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // nagy központi szem
  const look = v.face;
  const px = Math.cos(look) * r * 0.22;
  const py = Math.sin(look) * r * 0.2;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.42, r * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // írisz
  ctx.fillStyle = v.aiming ? lighten(v.col, 0.2) : darken(v.col, 0.1);
  ctx.beginPath();
  ctx.arc(px, -r * 0.05 + py, r * 0.24, 0, TAU);
  ctx.fill();
  // pupilla
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(px, -r * 0.05 + py, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px - r * 0.05, -r * 0.12 + py, r * 0.05, 0, TAU);
  ctx.fill();

  // köpő-mirigy alul (töltéskor világít)
  ctx.fillStyle = v.aiming ? light : darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.55, r * 0.2, r * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // felső fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.2, r * 0.1, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
