import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, drawHorns } from './helpers';

/* ===================================================================== *
 *  CHARGER — sárga zömök bika-fenevad, a nekifutás irányába mutató szarvakkal
 * ===================================================================== */
export function drawCharger(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.2);
  const lean = v.dashing ? 0.12 : 0;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);

  shadow(ctx, v, 1.0, 0.72);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);

  // nekifutás-irányba enyhén megnyúlik
  ctx.rotate(Math.sin(v.face) * lean * 0.3);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hátsó lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.55, r * 0.82 - lift * 5, r * 0.28, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // szarvak a játékos felé (a nekifutás iránya)
  drawHorns(ctx, v, dark, light);

  // test (tömzsi, kissé szélesebb)
  const bodyGrad = ctx.createLinearGradient(0, -r, 0, r);
  bodyGrad.addColorStop(0, light);
  bodyGrad.addColorStop(0.55, body);
  bodyGrad.addColorStop(1, darken(v.col, 0.28));
  ctx.fillStyle = v.flash ? '#fff' : bodyGrad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.86, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // sörény-tüskék a tetején
  ctx.fillStyle = darken(v.col, 0.3);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.18 - r * 0.08, -r * 0.78);
    ctx.lineTo(i * r * 0.18, -r * 0.98);
    ctx.lineTo(i * r * 0.18 + r * 0.08, -r * 0.78);
    ctx.closePath();
    ctx.fill();
  }

  // dühös szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.08;
  const dy = Math.sin(look) * r * 0.06;
  // szemöldök
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.38);
  ctx.lineTo(-r * 0.18, -r * 0.18);
  ctx.moveTo(r * 0.55, -r * 0.38);
  ctx.lineTo(r * 0.18, -r * 0.18);
  ctx.stroke();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.windup ? '#fff' : '#ffe9b0';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.34, -r * 0.05, r * 0.2, r * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = v.windup ? '#d23' : dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.34 + dx, -r * 0.05 + dy, r * 0.1, 0, TAU);
    ctx.fill();
  }

  // orrlyukak + szufla
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.16, r * 0.42, r * 0.08, r * 0.11, sgn * 0.3, 0, TAU);
    ctx.fill();
  }
  if (v.windup) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const sgn of [-1, 1]) {
      const pf = (v.wob * 0.5) % 1;
      ctx.globalAlpha = 0.5 * (1 - pf);
      ctx.beginPath();
      ctx.arc(sgn * r * 0.2 + sgn * pf * r * 0.4, r * 0.55 + pf * r * 0.2, r * 0.1 * (1 + pf), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // felső fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.26, r * 0.12, -0.5, 0, TAU);
  ctx.fill();

  // nekifutás-töltés gyűrű
  if (v.windup) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15 + Math.sin(v.wob * 8) * 2, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
