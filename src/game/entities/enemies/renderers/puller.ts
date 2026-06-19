import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, aura, radial4 } from './helpers';

/* ===================================================================== *
 *  PULLER — örvény-lidérc, lebegve maga felé szív; hatókörben (active)
 *  a befelé pörgő spirálkarok és gyűrűk a játékos irányába nyúlnak.
 * ===================================================================== */
export function drawPuller(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.16;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.46);
  const spin = v.wob * (v.active ? 4 : 1.8);

  // befelé húzó energia-aura + szívó-gyűrűk
  if (v.active) {
    aura(ctx, v.x, v.y + float, r * 2.6, '120,120,220', 0.16);
    ctx.save();
    ctx.strokeStyle = '#9aa0ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = 1 - ((v.wob * 1.2 + i / 3) % 1); // kifelé→befelé (összehúzódó gyűrűk)
      ctx.globalAlpha = 0.4 * (1 - Math.abs(ph - 0.5) * 2);
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.6 + ph * 2.2), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.75, 1.05);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // örvénylő spirálkarok (befelé csavarodó)
  ctx.save();
  ctx.rotate(spin);
  ctx.strokeStyle = darken(v.col, 0.1);
  ctx.lineWidth = r * 0.16;
  for (let k = 0; k < 4; k++) {
    ctx.rotate(TAU / 4);
    ctx.beginPath();
    for (let t = 0; t < 2.4; t += 0.2) {
      const rr = r * (0.5 + t * 0.32);
      const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // központi test (sötét örvénymag, befelé sötétülő)
  const g = radial4(ctx, 0, 0, r * 0.05, 0, 0, r * 0.8, 0.5, 0.8, '#0c0a20', darken(v.col, 0.2), body, light);
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // belső szívó-örvény (forgó spirálvonal)
  ctx.save();
  ctx.rotate(-spin * 1.5);
  ctx.strokeStyle = 'rgba(180,185,255,0.6)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  for (let t = 0; t < Math.PI * 4; t += 0.2) {
    const rr = (1 - t / (Math.PI * 4)) * r * 0.6;
    const px = Math.cos(t) * rr, py = Math.sin(t) * rr;
    if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // izzó örvénymag-szem a játékos felé
  const look = v.face;
  const ex = Math.cos(look) * r * 0.12, ey = Math.sin(look) * r * 0.12;
  glow(ctx, ex, ey, r * 0.13, v.active ? '#aab0ff' : '#6a6ad0', v.active ? 12 : 6);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.07, 0, TAU);
  ctx.fill();

  ctx.restore();
}
