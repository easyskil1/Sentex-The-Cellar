import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, glow, aura } from './helpers';

/* ---------------------------------------------------------------------
 *  WRAITH — csuklyás kísértet hideg aurában, alul szétfoszló lepellel
 *  és sarló-szerű árny-kezekkel; aktívkor (active) erősebb a fagyos köd.
 * ------------------------------------------------------------------- */
export function drawWraith(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.2;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);

  // hideg aura
  aura(ctx, v.x, v.y + float, r * (v.active ? 2.4 : 1.7), '150,180,210', v.active ? 0.26 : 0.14);
  if (v.active) {
    ctx.fillStyle = 'rgba(220,235,250,0.7)';
    for (let i = 0; i < 5; i++) {
      const a = v.wob * 1.4 + (i / 5) * TAU;
      const rr = r * (1.4 + Math.sin(v.wob * 2 + i) * 0.4);
      ctx.beginPath();
      ctx.arc(v.x + Math.cos(a) * rr, v.y + float + Math.sin(a) * rr * 0.7, 1.6, 0, TAU);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.globalAlpha = 0.9;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // sarló-szerű árny-kezek
  ctx.strokeStyle = light;
  ctx.lineWidth = r * 0.1;
  ctx.globalAlpha = 0.55;
  for (const sgn of [-1, 1]) {
    const sw = Math.sin(v.wob * 1.6 + (sgn > 0 ? 0 : 1.6));
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.55, -r * 0.15);
    ctx.quadraticCurveTo(sgn * r * 1.15, r * 0.0 + sw * r * 0.2, sgn * r * 0.95, r * 0.55 + sw * r * 0.15);
    ctx.stroke();
    // karom-ujjak
    for (const k of [-0.12, 0, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.95, r * 0.55 + sw * r * 0.15);
      ctx.lineTo(sgn * r * (0.95 + k) + sgn * r * 0.18, r * 0.8 + sw * r * 0.15);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.92;

  // alul szétfoszló lepel
  const tatters = 7;
  const g = ctx.createLinearGradient(0, -r, 0, r * 1.4);
  g.addColorStop(0, light);
  g.addColorStop(0.55, body);
  g.addColorStop(1, 'rgba(26,36,48,0)');
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.82, 0);
  ctx.quadraticCurveTo(-r * 0.92, -r * 0.98, 0, -r * 0.98);
  ctx.quadraticCurveTo(r * 0.92, -r * 0.98, r * 0.82, 0);
  for (let i = tatters; i >= 0; i--) {
    const tx = -r * 0.82 + (i / tatters) * r * 1.64;
    const low = r * (0.9 + Math.sin(v.wob * 2.2 + i * 1.3) * 0.4);
    if (i === tatters) ctx.lineTo(tx, r * 0.5);
    ctx.quadraticCurveTo(tx + r * 0.08, low, tx - r * 0.12, r * 0.55);
  }
  ctx.closePath();
  ctx.fill();

  // csuklya-üreg
  ctx.fillStyle = 'rgba(14,20,30,0.9)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.4, r * 0.46, r * 0.52, 0, 0, TAU);
  ctx.fill();

  // izzó jeges szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.07, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#dff2ff';
    glow(ctx, sgn * r * 0.18 + dx, -r * 0.42 + dy, r * 0.08, '#9fc8ec', v.active ? 12 : 8);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.18 + dx, -r * 0.42 + dy, r * 0.08, r * 0.13, 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
