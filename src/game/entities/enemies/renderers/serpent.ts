import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, radial3, radial2 } from './helpers';

/* ---------------------------------------------------------------------
 *  SERPENT — tekergő kígyó pikkely-mintával, villás nyelvvel és méregfoggal;
 *  harapáskor (active) tátott pofa + méregcsepp.
 * ------------------------------------------------------------------- */
export function drawSerpent(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const belly = v.flash ? '#fff' : lighten(v.col, 0.55);
  const look = v.face;

  shadow(ctx, v, 1.0, 0.6);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(look);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tekergő test (S-kanyar, hátrafelé), pikkely-szegmensekből
  const segs = 6;
  for (let i = segs; i >= 1; i--) {
    const t = i / segs;
    const sx = -t * r * 1.5;
    const sy = Math.sin(v.wob * 3 + t * 5) * r * 0.4 * t;
    const sr = r * (0.7 - t * 0.18);
    const seg = radial3(ctx, sx, sy - sr * 0.3, sr * 0.2, sx, sy, sr, 0.6, light, body, darken(v.col, 0.3));
    ctx.fillStyle = v.flash ? '#fff' : seg;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // hasi pikkely-csík
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(sx, sy + sr * 0.4, sr * 0.6, sr * 0.25, 0, 0, TAU);
    ctx.fill();
  }

  // fej (ék alakú)
  const hg = radial2(ctx, r * 0.3, -r * 0.1, r * 0.1, r * 0.2, 0, r * 0.7, light, body);
  ctx.fillStyle = v.flash ? '#fff' : hg;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.9, 0);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.6, -r * 0.2, -r * 0.3);
  ctx.quadraticCurveTo(-r * 0.35, 0, -r * 0.2, r * 0.3);
  ctx.quadraticCurveTo(r * 0.3, r * 0.6, r * 0.9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // villás nyelv (kicsap)
  const tongue = r * (v.active ? 1.1 : 0.7 + Math.abs(Math.sin(v.wob * 4)) * 0.4);
  ctx.strokeStyle = '#e0405a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.85, 0);
  ctx.lineTo(r * tongue, 0);
  ctx.moveTo(r * tongue, 0); ctx.lineTo(r * tongue + r * 0.12, -r * 0.1);
  ctx.moveTo(r * tongue, 0); ctx.lineTo(r * tongue + r * 0.12, r * 0.1);
  ctx.stroke();

  // tátott pofa + méregfog harapáskor
  if (v.active) {
    ctx.fillStyle = '#2a0c10';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.1);
    ctx.lineTo(r * 0.95, -r * 0.05);
    ctx.lineTo(r * 0.5, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.04); ctx.lineTo(r * 0.78, r * 0.14); ctx.lineTo(r * 0.66, r * 0.02);
    ctx.closePath();
    ctx.fill();
  }

  // izzó kígyó-szemek (függőleges pupilla)
  const dx = Math.cos(look) * r * 0.04;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#f4e04a';
    ctx.beginPath();
    ctx.ellipse(r * 0.3, sgn * r * 0.22, r * 0.12, r * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1400';
    ctx.beginPath();
    ctx.ellipse(r * 0.3 + dx, sgn * r * 0.22, r * 0.04, r * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
