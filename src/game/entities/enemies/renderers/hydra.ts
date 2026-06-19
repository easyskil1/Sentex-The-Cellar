import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, radial3, radial2 } from './helpers';

/* ---------------------------------------------------------------------
 *  HYDRA — közös test több kígyó-nyakkal; a fejek száma a HP-tól függ
 *  (sérülten több: 3→5). Lövéskor (active) a fejek tátognak.
 * ------------------------------------------------------------------- */
export function drawHydra(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;
  const heads = 3 + Math.round((1 - (v.hpFrac ?? 1)) * 2); // 3..5 fej

  shadow(ctx, v, 1.1, 0.78);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // közös test (zömök, tüskés)
  const g = radial3(ctx, -r * 0.2, -r * 0.1, r * 0.15, 0, 0, r, 0.6, light, body, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.92, r * 0.66, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // háti tüskék
  ctx.fillStyle = darken(v.col, 0.3);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.3 - r * 0.08, r * 0.0);
    ctx.lineTo(i * r * 0.3, -r * 0.25);
    ctx.lineTo(i * r * 0.3 + r * 0.08, r * 0.0);
    ctx.closePath();
    ctx.fill();
  }

  // kígyó-nyakak + fejek (legyezőszerűen a játékos felé)
  const baseAng = look;
  for (let h = 0; h < heads; h++) {
    const spread = (heads > 1 ? (h / (heads - 1) - 0.5) : 0) * 1.4; // legyező
    const na = baseAng + spread;
    const wig = Math.sin(v.wob * 3 + h * 1.7) * 0.18;
    const bx = Math.cos(baseAng + spread * 0.4) * r * 0.3;
    const by = Math.sin(baseAng + spread * 0.4) * r * 0.3 - r * 0.1;
    const nx = bx + Math.cos(na + wig) * r * 1.15;
    const ny = by + Math.sin(na + wig) * r * 1.15;
    const mx = bx + Math.cos(na) * r * 0.6;
    const my = by + Math.sin(na) * r * 0.6 - r * 0.3;
    // nyak
    ctx.strokeStyle = body;
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, nx, ny);
    ctx.stroke();
    ctx.strokeStyle = darken(v.col, 0.2);
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, nx, ny);
    ctx.stroke();
    // fej
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(na + wig);
    const hg = radial2(ctx, r * 0.1, -r * 0.05, r * 0.05, 0, 0, r * 0.4, light, body);
    ctx.fillStyle = v.flash ? '#fff' : hg;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // tátott pofa lövéskor
    if (v.active) {
      ctx.fillStyle = '#2a0c10';
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.12); ctx.lineTo(r * 0.42, 0); ctx.lineTo(r * 0.1, r * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    // szemek
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = '#f4e04a';
      ctx.beginPath();
      ctx.arc(-r * 0.05, sgn * r * 0.1, r * 0.06, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1400';
      ctx.beginPath();
      ctx.arc(-r * 0.03, sgn * r * 0.1, r * 0.03, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}
