import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, shadow } from './helpers';

/* ===================================================================== *
 *  FLY — lila, zümmögő szúnyog/szellem-bogár, csapkodó szárnyakkal
 * ===================================================================== */
export function drawFly(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const flap = Math.abs(Math.sin(v.wob * 3));
  const float = Math.sin(v.bob) * r * 0.12;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);

  shadow(ctx, v, 0.7, 0.85);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // lelógó vékony lábak
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lx = sgn * r * (0.3 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.25, r * 0.2);
      ctx.quadraticCurveTo(lx, r * 0.7, lx + sgn * r * 0.15, r * 1.0 + Math.sin(v.wob + i) * 2);
      ctx.stroke();
    }
  }

  // szárnyak (áttetsző, csapkodó) — a függőleges sugár mindig pozitív
  const wingH = r * (0.35 + flap * 0.9);
  ctx.fillStyle = 'rgba(220,230,255,0.28)';
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.translate(sgn * r * 0.55, -r * 0.35);
    ctx.rotate(sgn * (0.5 + flap * 0.4));
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.5, 0, r * 0.6, wingH, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // potroh (hátsó, hosszúkás szegmens)
  const abGrad = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.8);
  abGrad.addColorStop(0, light);
  abGrad.addColorStop(1, body);
  ctx.fillStyle = v.flash ? '#fff' : abGrad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.5, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // szegmens-csíkok a potrohon
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  for (const yy of [0.2, 0.5]) {
    ctx.beginPath();
    ctx.ellipse(0, r * (0.35 + yy * 0.5), r * 0.46 * (1 - yy * 0.4), r * 0.08, 0, 0, Math.PI);
    ctx.stroke();
  }

  // fej (gömb)
  const headGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.55, r * 0.1, 0, -r * 0.35, r * 0.7);
  headGrad.addColorStop(0, light);
  headGrad.addColorStop(1, body);
  ctx.fillStyle = v.flash ? '#fff' : headGrad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.35, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // nagy összetett szemek
  const look = v.face;
  const ex = Math.cos(look) * r * 0.1;
  const ey = Math.sin(look) * r * 0.08;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.28, -r * 0.4, r * 0.24, r * 0.3, sgn * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.28 + ex - r * 0.06, -r * 0.45 + ey, r * 0.08, 0, TAU);
    ctx.fill();
  }

  // szívócső
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.05);
  ctx.lineTo(Math.cos(look) * r * 0.5, -r * 0.05 + Math.sin(look) * r * 0.4);
  ctx.stroke();

  ctx.restore();
}
