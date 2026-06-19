import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, radial3 } from './helpers';

/* ---------------------------------------------------------------------
 *  LEECH — szegmentált pióca gyűrűs testtel és elülső szívó-szájkoronggal;
 *  szíváskor (active) vörös pír lükteti a testet.
 * ------------------------------------------------------------------- */
export function drawLeech(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.36);
  const look = v.face;
  const pulse = v.active ? 1 + Math.sin(v.wob * 10) * 0.12 : 1 + Math.sin(v.bob * 1.5) * 0.04;

  shadow(ctx, v, 0.95, 0.6);

  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(v.wob * 8) * 0.12;
    glow(ctx, v.x, v.y, r * 1.2, '#ff4a6a', 12);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(look);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ívelt, szegmentált test (hátrafelé kígyózó)
  const segs = 5;
  for (let i = segs; i >= 0; i--) {
    const t = i / segs;
    const sx = -t * r * 1.3;
    const sy = Math.sin(v.wob * 2 + t * 4) * r * 0.18 * t;
    const sr = r * (0.82 - t * 0.3) * pulse;
    const seg = radial3(ctx, sx - sr * 0.3, sy - sr * 0.3, sr * 0.2, sx, sy, sr, 0.6, light, body, darken(v.col, 0.35));
    ctx.fillStyle = v.flash ? '#fff' : seg;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr, sr * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // gyűrű-barázda
    ctx.strokeStyle = darken(v.col, 0.3);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 0.7, sr * 0.85, 0, -1, 1);
    ctx.stroke();
  }
  // háti hosszanti csík
  ctx.strokeStyle = darken(v.col, 0.4);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.7, 0); ctx.lineTo(-r * 1.3, 0);
  ctx.stroke();

  // elülső szívó-szájkorong (fogas gyűrű)
  ctx.fillStyle = '#2a0810';
  ctx.beginPath();
  ctx.arc(r * 0.78, 0, r * 0.38, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = v.active ? '#ff6a7a' : '#7a2a3a';
  ctx.beginPath();
  ctx.arc(r * 0.78, 0, r * 0.22, 0, TAU);
  ctx.fill();
  // apró fogak a perem mentén
  ctx.fillStyle = '#e8d8d0';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(r * 0.78 + Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36);
    ctx.lineTo(r * 0.78 + Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(r * 0.78 + Math.cos(a + 0.3) * r * 0.3, Math.sin(a + 0.3) * r * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
