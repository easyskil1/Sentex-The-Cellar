import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2, radial2 } from './helpers';

/* ---------------------------------------------------------------------
 *  BAT — óriásdenevér nagy bőrszárnyakkal és nagy fülekkel;
 *  hangrobbanáskor (active) kitátott pofa és hullámgyűrűk.
 * ------------------------------------------------------------------- */
export function drawBat(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const flap = Math.sin(v.wob * 7);
  const float = Math.sin(v.bob * 2) * r * 0.12;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;

  // hangrobbanás-gyűrűk
  if (v.active) {
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const ph = (v.wob * 1.6 + i / 2) % 1;
      ctx.globalAlpha = 0.4 * (1 - ph);
      ctx.strokeStyle = '#c0b0d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.8 + ph * 2.4), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.7, 1.1);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // két nagy bőrszárny (csapkodnak)
  for (const sgn of [-1, 1]) {
    const lift = -flap * r * 0.3;
    ctx.fillStyle = linear2(ctx, 0, 0, sgn * r * 1.5, 0, v.flash ? '#fff' : body, v.flash ? '#fff' : darken(v.col, 0.4));
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, -r * 0.1);
    ctx.quadraticCurveTo(sgn * r * 1.0, -r * 0.5 + lift, sgn * r * 1.55, -r * 0.1 + lift);
    ctx.lineTo(sgn * r * 1.2, r * 0.05 + lift * 0.6);
    ctx.lineTo(sgn * r * 1.35, r * 0.35 + lift * 0.5);
    ctx.lineTo(sgn * r * 0.85, r * 0.15);
    ctx.lineTo(sgn * r * 0.95, r * 0.45);
    ctx.lineTo(sgn * r * 0.4, r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // szárny-ujjak (bordák)
    ctx.strokeStyle = darken(v.col, 0.3);
    ctx.lineWidth = 1.2;
    for (const t of [0.5, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.35, 0);
      ctx.lineTo(sgn * r * (0.5 + t * 0.85), r * 0.3 + lift * 0.4);
      ctx.stroke();
    }
  }

  // pici test
  ctx.fillStyle = v.flash ? '#fff' : radial2(ctx, -r * 0.1, -r * 0.2, r * 0.1, 0, 0, r * 0.55, light, body);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.05, r * 0.42, r * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // nagy fülek
  ctx.fillStyle = darken(v.col, 0.15);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.2, -r * 0.4);
    ctx.lineTo(sgn * r * 0.4, -r * 0.95);
    ctx.lineTo(sgn * r * 0.46, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // szemek + tátott pofa
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#ffe08a' : '#ffd23a';
    glow(ctx, sgn * r * 0.16 + dx, -r * 0.05 + dy, r * 0.06, '#ffb13a', v.active ? 6 : 3);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.16 + dx, -r * 0.05 + dy, r * 0.07, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.16 + dx, -r * 0.05 + dy, r * 0.035, 0, TAU);
    ctx.fill();
  }
  // sikoltó száj + agyarak
  ctx.fillStyle = '#3a0c16';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.28, r * 0.14, v.active ? r * 0.16 : r * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.08, r * 0.2);
    ctx.lineTo(sgn * r * 0.11, r * 0.32);
    ctx.lineTo(sgn * r * 0.04, r * 0.22);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
