import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, shadow } from './helpers';

/**
 * Fallback-rajz: egyszerű színes folt szemekkel — a MÉG kinézet nélküli új
 * ellenfelekhez (Wave 5+). Így azonnal láthatók/tesztelhetők; a részletes,
 * típus-specifikus rajzot később pótoljuk (a `col`/`col2`-t használja, mint a többi).
 */
export function drawBlob(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const float = Math.sin(v.bob) * r * 0.1;
  shadow(ctx, v, 0.8, 0.8);
  ctx.save();
  ctx.translate(v.x, v.y + float);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, lighten(body, 0.35));
  g.addColorStop(1, body);
  ctx.fillStyle = g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // szemek a játékos felé fordulva
  const ex = Math.cos(v.face) * r * 0.28;
  const ey = Math.sin(v.face) * r * 0.28;
  const px = Math.cos(v.face + Math.PI / 2), py = Math.sin(v.face + Math.PI / 2);
  for (const sgn of [-1, 1]) {
    const ox = ex + px * sgn * r * 0.32;
    const oy = ey + py * sgn * r * 0.32 - r * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ox, oy, r * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16101e';
    ctx.beginPath(); ctx.arc(ox + Math.cos(v.face) * r * 0.07, oy + Math.sin(v.face) * r * 0.07, r * 0.1, 0, TAU); ctx.fill();
  }
  if (v.active || v.aiming) {
    ctx.fillStyle = 'rgba(255,80,80,0.22)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
