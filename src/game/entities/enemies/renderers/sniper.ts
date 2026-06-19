import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2, radial3 } from './helpers';

/* ===================================================================== *
 *  SNIPER — karcsú orvlövész-lidérc háromlábú állványon, hosszú
 *  teleszkóp-orral; célzáskor (active) vörös lézervonal és izzó szem.
 * ===================================================================== */
export function drawSniper(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.08;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const look = v.face;
  const cos = Math.cos(look), sin = Math.sin(look);

  // --- célzólézer a test elől (világ-térben, a test mögé) ---
  if (v.active) {
    const muzzleX = v.x + cos * r * 1.5;
    const muzzleY = v.y + float + sin * r * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(v.wob * 16) * 0.25;
    ctx.strokeStyle = '#ff4a4a';
    ctx.shadowColor = '#ff2a2a';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(muzzleX + cos * 460, muzzleY + sin * 460);
    ctx.stroke();
    ctx.restore();
  }

  shadow(ctx, v, 0.7, 1.05);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // háromlábú állvány (hátranyúló merevítők)
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.12;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.2, r * 0.2);
    ctx.lineTo(sgn * r * 0.7 - cos * r * 0.4, r * 1.05);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, r * 0.3);
  ctx.lineTo(-cos * r * 0.6, r * 1.05);
  ctx.stroke();

  // hosszú teleszkóp-orr / puskacső a játékos felé
  ctx.save();
  ctx.rotate(look);
  const barrel = linear2(ctx, 0, -r * 0.18, 0, r * 0.18, light, dark);
  ctx.fillStyle = v.flash ? '#fff' : barrel;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.2);
  ctx.lineTo(r * 1.55, -r * 0.12);
  ctx.lineTo(r * 1.55, r * 0.12);
  ctx.lineTo(0, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // torkolat-gyűrű
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(r * 1.5, 0, r * 0.07, r * 0.15, 0, 0, TAU);
  ctx.fill();
  if (v.active) { glow(ctx, r * 1.5, 0, r * 0.09, '#ff5a3a', 8); }
  ctx.restore();

  // karcsú test (megnyúlt tojás)
  const g = radial3(ctx, -r * 0.25, -r * 0.3, r * 0.1, 0, 0, r, 0.65, light, body, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.66, r * 0.84, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // homlokpánt-vonal
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.32);
  ctx.quadraticCurveTo(0, -r * 0.2, r * 0.5, -r * 0.32);
  ctx.stroke();

  // egyetlen nagy teleszkóp-szem a játékos felé
  const ex = cos * r * 0.18, ey = sin * r * 0.14;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, -r * 0.04, r * 0.36, 0, TAU);
  ctx.fill();
  const iris = radial3(ctx, ex, -r * 0.04 + ey, 1, 0, -r * 0.04, r * 0.3, 0.5, v.active ? '#ffd0c0' : '#fff', v.active ? '#ff6a4a' : light, darken(v.col, 0.15));
  ctx.fillStyle = v.flash ? '#fff' : iris;
  ctx.beginPath();
  ctx.arc(0, -r * 0.04, r * 0.27, 0, TAU);
  ctx.fill();
  // szálkereszt a lencsén
  ctx.strokeStyle = v.active ? '#ff2a2a' : dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.27, -r * 0.04); ctx.lineTo(r * 0.27, -r * 0.04);
  ctx.moveTo(0, -r * 0.31); ctx.lineTo(0, r * 0.23);
  ctx.stroke();
  ctx.fillStyle = v.active ? '#ff2a2a' : '#1a0c10';
  ctx.beginPath();
  ctx.arc(ex, -r * 0.04 + ey, r * 0.08, 0, TAU);
  ctx.fill();

  // fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.26, -r * 0.42, r * 0.16, r * 0.08, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
