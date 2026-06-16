import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ---------------------------------------------------------------------
 *  HARPY — madár-nő tollas szárny-karokkal és karmos lábakkal;
 *  lecsapáskor (dash) a szárnyak hátracsapnak, karmok előre.
 * ------------------------------------------------------------------- */
export function drawHarpy(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const dash = v.charge === 'dash';
  const float = Math.sin(v.bob * 1.4) * r * 0.12;
  const flap = Math.sin(v.wob * (dash ? 9 : 5));
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;

  shadow(ctx, v, 0.8, 1.05);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tollas szárny-karok
  for (const sgn of [-1, 1]) {
    const back = dash ? -0.5 : 0;
    ctx.fillStyle = v.flash ? '#fff' : body;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.save();
    ctx.rotate(sgn * (0.3 + back) + sgn * flap * 0.15);
    // tollsorok
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const fl = r * (0.6 + t * 0.7);
      ctx.fillStyle = v.flash ? '#fff' : (i % 2 ? light : body);
      ctx.beginPath();
      ctx.ellipse(sgn * r * (0.5 + t * 0.5), r * 0.1 + t * r * 0.2, r * 0.16, fl * 0.5, sgn * (0.5 + t * 0.5), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // test (madár-törzs)
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.6, body);
  g.addColorStop(1, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // mell-tollazat
  ctx.fillStyle = lighten(v.col, 0.25);
  for (const yy of [0.0, 0.25, 0.5]) {
    ctx.beginPath();
    ctx.arc(0, r * yy, r * 0.3 * (1 - yy * 0.5), 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.fill();
  }

  // karmos lábak (lecsapáskor előre)
  ctx.strokeStyle = '#d8b24a';
  ctx.lineWidth = r * 0.1;
  const clawY = dash ? r * 0.5 : r * 0.7;
  const clawF = dash ? Math.cos(look) * r * 0.4 : 0;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.25, r * 0.55);
    ctx.lineTo(sgn * r * 0.3 + clawF, clawY);
    ctx.stroke();
    // karmok
    for (const k of [-0.1, 0.1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.3 + clawF, clawY);
      ctx.lineTo(sgn * r * 0.3 + clawF + k * r, clawY + r * 0.2);
      ctx.stroke();
    }
  }

  // fej (női, tollkoronával)
  ctx.save();
  ctx.translate(0, -r * 0.7);
  ctx.fillStyle = v.flash ? '#fff' : lighten(v.col, 0.3);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.32, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // tollkorona
  ctx.fillStyle = darken(v.col, 0.2);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.12, -r * 0.25);
    ctx.lineTo(i * r * 0.12 + Math.sign(i || 1) * r * 0.06, -r * 0.6);
    ctx.lineTo(i * r * 0.12 + r * 0.06, -r * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  // éles szemek + csőr
  const dx = Math.cos(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.13, -r * 0.02, r * 0.1, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.13 + dx, -r * 0.02, r * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#e8b44a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, r * 0.1); ctx.lineTo(r * 0.06, r * 0.1); ctx.lineTo(0, r * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
