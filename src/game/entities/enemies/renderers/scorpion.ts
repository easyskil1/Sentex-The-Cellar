import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ---------------------------------------------------------------------
 *  SCORPION — páncélos skorpió két ollóval és felgörbülő méreg-farokkal;
 *  lövéskor (active) a fullánk előrecsap és csöppen róla a méreg.
 * ------------------------------------------------------------------- */
export function drawScorpion(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const look = v.face;
  const sk = Math.sin(v.wob * 6);

  shadow(ctx, v, 1.05, 0.6);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(look);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 8 ízelt láb
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bx = r * (0.3 - i * 0.22);
      const wig = sk * (i % 2 ? 1 : -1) * 2;
      ctx.beginPath();
      ctx.moveTo(bx, sgn * r * 0.4);
      ctx.lineTo(bx - r * 0.1, sgn * r * 1.0 + wig);
      ctx.stroke();
    }
  }

  // farok (hátulról felgörbülve a fej fölé), méreg-fullánkkal
  ctx.strokeStyle = body;
  ctx.lineWidth = r * 0.26;
  const sting = v.active ? 1 : 0;
  ctx.beginPath();
  ctx.moveTo(-r * 1.1, 0);
  ctx.quadraticCurveTo(-r * 1.6, -r * 0.8, -r * 0.8, -r * 1.2);
  ctx.quadraticCurveTo(-r * 0.2, -r * 1.5, r * (0.4 + sting * 0.5), -r * (1.2 - sting * 0.4));
  ctx.stroke();
  // farok-szegmens csomók
  ctx.fillStyle = light;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  for (const [tx, ty] of [[-1.1, 0], [-1.45, -0.5], [-1.2, -1.0], [-0.6, -1.3]] as const) {
    ctx.beginPath();
    ctx.arc(tx * r, ty * r, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // méreg-fullánk hegye
  const stx = r * (0.4 + sting * 0.5), sty = -r * (1.2 - sting * 0.4);
  ctx.fillStyle = '#2a1408';
  ctx.beginPath();
  ctx.moveTo(stx - r * 0.15, sty - r * 0.1);
  ctx.lineTo(stx + r * 0.25, sty + r * 0.05);
  ctx.lineTo(stx - r * 0.1, sty + r * 0.2);
  ctx.closePath();
  ctx.fill();
  if (v.active) {
    glow(ctx, stx + r * 0.22, sty + r * 0.04, r * 0.07, '#bfff6a', 8); // méregcsepp
  }

  // test (páncélos)
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, darken(v.col, 0.2));
  g.addColorStop(0.5, body);
  g.addColorStop(1, light);
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.9, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // páncél-szelvények
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.4;
  for (const xx of [-0.3, 0.1, 0.45]) {
    ctx.beginPath();
    ctx.ellipse(xx * r, 0, r * 0.1, r * 0.5, 0, 0, TAU);
    ctx.stroke();
  }

  // két nagy olló elöl (pedipalpus)
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.translate(r * 0.85, sgn * r * 0.4);
    ctx.rotate(sgn * 0.3 + (v.active ? -sgn * 0.2 : 0));
    // kar
    ctx.strokeStyle = body;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, 0); ctx.lineTo(r * 0.4, 0);
    ctx.stroke();
    // olló (két ujj)
    ctx.fillStyle = v.flash ? '#fff' : light;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(r * 0.5, 0, r * 0.26, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = r * 0.08;
    ctx.strokeStyle = darken(v.col, 0.1);
    const open = v.active ? 0.25 : 0.12;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.05); ctx.lineTo(r * 0.85, -open * r);
    ctx.moveTo(r * 0.6, r * 0.05); ctx.lineTo(r * 0.85, open * r);
    ctx.stroke();
    ctx.restore();
  }

  // apró szemek a háton
  ctx.fillStyle = '#1a0c04';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.5, sgn * r * 0.12, r * 0.06, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
