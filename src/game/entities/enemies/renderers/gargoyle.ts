import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ---------------------------------------------------------------------
 *  GARGOYLE — szárnyas kődémon. Kő-fázisban (petrified) szürke, repedezett
 *  szobor; életre kelve (egyébként) a kő alól izzó szemek, kitárt szárnyak.
 * ------------------------------------------------------------------- */
export function drawGargoyle(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const stone = v.petrified;
  const step = stone ? 0 : Math.sin(v.bob * 1.2);
  // kő-fázisban kifakult szürke, élve a saját szín
  const body = v.flash ? '#fff' : stone ? '#8c8c80' : v.col;
  const dark = v.flash ? '#000' : stone ? '#3a3a32' : v.col2;
  const light = v.flash ? '#fff' : stone ? '#a8a89a' : lighten(v.col, 0.36);
  const look = v.face;

  shadow(ctx, v, 1.0, 0.74);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // szárnyak (kő-fázisban összezárva a háton, élve kitárva)
  const open = stone ? 0.2 : 0.6 + Math.sin(v.bob) * 0.08;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = stone ? '#7e7e72' : darken(v.col, 0.2);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.4, -r * 0.5);
    ctx.quadraticCurveTo(sgn * r * (0.9 + open), -r * (0.6 + open * 0.4), sgn * r * (1.1 + open), -r * 0.1);
    // szárny-ujjak közti hártya
    for (let i = 2; i >= 0; i--) {
      const t = i / 2;
      ctx.lineTo(sgn * r * (0.5 + (0.6 + open) * t), -r * 0.1 + t * r * 0.5);
      ctx.lineTo(sgn * r * (0.5 + (0.6 + open) * t) - sgn * r * 0.05, -r * 0.1 + t * r * 0.35);
    }
    ctx.lineTo(sgn * r * 0.4, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // hátsó láb-karmok
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.4, r * 0.85, r * 0.26, r * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // törzs (kő-tömb)
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(stone ? '#6a6a5e' : v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.8, r * 0.84, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // fej + szarvak
  ctx.save();
  ctx.translate(0, -r * 0.7);
  ctx.fillStyle = v.flash ? '#fff' : body;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = stone ? '#7e7e72' : darken(v.col, 0.3);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.28, -r * 0.2);
    ctx.lineTo(sgn * r * 0.5, -r * 0.6);
    ctx.lineTo(sgn * r * 0.14, -r * 0.32);
    ctx.closePath();
    ctx.fill();
  }
  // pofa / agyarak
  ctx.fillStyle = '#1a1a14';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.24, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = stone ? '#a8a89a' : '#e8e8d8';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.12, r * 0.12);
    ctx.lineTo(sgn * r * 0.16, r * 0.24);
    ctx.lineTo(sgn * r * 0.06, r * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  // szemek: kő-fázisban vájatok, élve izzó vörös
  const dx = Math.cos(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    if (stone) {
      ctx.fillStyle = '#2a2a22';
      ctx.beginPath();
      ctx.ellipse(sgn * r * 0.16, -r * 0.02, r * 0.08, r * 0.06, 0, 0, TAU);
      ctx.fill();
    } else {
      glow(ctx, sgn * r * 0.16 + dx, -r * 0.02, r * 0.07, '#ff5a2a', 8);
      ctx.fillStyle = '#ffb13a';
      ctx.beginPath();
      ctx.arc(sgn * r * 0.16 + dx, -r * 0.02, r * 0.06, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // kő-repedések (mindkét fázisban, de kő-fázisban hangsúlyosabb)
  ctx.strokeStyle = stone ? '#5a5a50' : darken(v.col, 0.4);
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = stone ? 0.9 : 0.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.15, -r * 0.1); ctx.lineTo(-r * 0.35, r * 0.3);
  ctx.moveTo(r * 0.35, -r * 0.3); ctx.lineTo(r * 0.18, r * 0.1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // mohás foltok kő-fázisban
  if (stone) {
    ctx.fillStyle = 'rgba(110,140,80,0.4)';
    for (const [mx, my, ms] of [[-0.4, 0.4, 0.18], [0.3, -0.3, 0.14], [0.45, 0.5, 0.12]] as const) {
      ctx.beginPath();
      ctx.ellipse(mx * r, my * r, ms * r, ms * r * 0.7, 0, 0, TAU);
      ctx.fill();
    }
  } else {
    // életre-kelés szikrái
    ctx.fillStyle = 'rgba(200,200,180,0.5)';
    for (let i = 0; i < 4; i++) {
      const a = v.wob * 3 + i * 1.6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.05, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}
