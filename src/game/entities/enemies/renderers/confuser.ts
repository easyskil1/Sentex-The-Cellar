import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  CONFUSER — hipnotikus lebegő lidérc örvénylő spirál-szemmel;
 *  hatókörben (active) a spirál pörög és pszichedelikus gyűrűk lüktetnek.
 * ===================================================================== */
export function drawConfuser(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.18;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  const spin = v.wob * (v.active ? 3.5 : 1.4);

  // pszichedelikus zavar-gyűrűk
  if (v.active) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const ph = (v.wob * 1.5 + i / 3) % 1;
      ctx.globalAlpha = 0.3 * (1 - ph);
      ctx.strokeStyle = i % 2 ? '#ff8aff' : '#a0e0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.8 + ph * 2), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.75, 1.05);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // lebegő test (lágy gömb, hullámzó peremmel)
  ctx.beginPath();
  const lobes = 8;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * TAU;
    const wob = 1 + Math.sin(a * 3 + v.wob * 2) * 0.06;
    const px = Math.cos(a) * r * 0.82 * wob;
    const py = Math.sin(a) * r * 0.82 * wob;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 0.85);
  g.addColorStop(0, light);
  g.addColorStop(0.7, body);
  g.addColorStop(1, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.fill();
  ctx.stroke();

  // két lebegő, hullámzó csáp alul
  ctx.strokeStyle = darken(v.col, 0.15);
  ctx.lineWidth = r * 0.12;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, r * 0.6);
    ctx.quadraticCurveTo(sgn * r * 0.6 + Math.sin(v.wob * 2) * 4, r * 0.95, sgn * r * 0.35, r * 1.2 + Math.sin(v.wob * 3 + sgn) * 3);
    ctx.stroke();
  }

  // hipnotikus spirál-szem (a teljes test közepén)
  ctx.save();
  ctx.rotate(spin);
  ctx.strokeStyle = v.flash ? '#000' : '#1c0a2a';
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  for (let t = 0; t < Math.PI * 5; t += 0.25) {
    const rr = (t / (Math.PI * 5)) * r * 0.62;
    const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
    if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // világos spirál-köz
  ctx.strokeStyle = v.active ? '#ffd0ff' : light;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  for (let t = 0.4; t < Math.PI * 5; t += 0.25) {
    const rr = (t / (Math.PI * 5)) * r * 0.62;
    const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
    if (t === 0.4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // izzó örvény-mag
  glow(ctx, 0, 0, r * 0.1, v.active ? '#ff8aff' : '#d86aff', v.active ? 12 : 6);

  ctx.restore();
}
