import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2, radial3, radial2 } from './helpers';

/* ===================================================================== *
 *  BOMBTHROWER — repülő dobász denevérszárnyakon, karmai közt ketyegő
 *  aknát szorongatva; dobáskor (active) kinyúlik a kar és villog az akna.
 * ===================================================================== */
export function drawBombthrower(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.14;
  const flap = Math.sin(v.wob * 5);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const metal = v.flash ? '#fff' : '#7a7060';

  shadow(ctx, v, 0.75, 1.0);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // denevér-szárnyak (csapkodó, bordázott)
  for (const sgn of [-1, 1]) {
    const wing = linear2(ctx, 0, 0, sgn * r, 0, v.flash ? '#fff' : body, v.flash ? '#fff' : darken(v.col, 0.4));
    ctx.fillStyle = wing;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    const lift = -r * 0.3 - flap * r * 0.35;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.4, -r * 0.25);
    ctx.quadraticCurveTo(sgn * r * 1.1, lift, sgn * r * 1.5, -r * 0.05 + flap * r * 0.1);
    ctx.quadraticCurveTo(sgn * r * 1.2, r * 0.1, sgn * r * 1.35, r * 0.4 + flap * r * 0.1);
    ctx.quadraticCurveTo(sgn * r * 0.95, r * 0.2, sgn * r * 0.7, r * 0.4);
    ctx.quadraticCurveTo(sgn * r * 0.85, r * 0.0, sgn * r * 0.4, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // szárny-bordák
    ctx.strokeStyle = darken(v.col, 0.3);
    ctx.lineWidth = 1.2;
    for (const t of [0.4, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.5, -r * 0.1);
      ctx.lineTo(sgn * r * (0.7 + t * 0.7), r * 0.35 + flap * r * 0.1);
      ctx.stroke();
    }
  }

  // test (kicsi, gömbölyded)
  const g = radial3(ctx, -r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 0.7, 0.6, light, body, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.6, r * 0.66, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // két fülecske
  ctx.fillStyle = darken(v.col, 0.2);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.2, -r * 0.55);
    ctx.lineTo(sgn * r * 0.35, -r * 0.9);
    ctx.lineTo(sgn * r * 0.45, -r * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // ravasz szempár
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.22, -r * 0.08, r * 0.13, r * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.22 + dx, -r * 0.08 + dy, r * 0.07, 0, TAU);
    ctx.fill();
  }

  // --- karmok közt szorongatott ketyegő akna (lent) ---
  const grab = v.active ? r * 0.5 : r * 0.35; // dobáskor lejjebb-kinyújtva
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.12;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.3, r * 0.4);
    ctx.lineTo(sgn * r * 0.22, r * 0.55 + grab);
    ctx.stroke();
  }
  const mineY = r * 0.6 + grab;
  const mg = radial2(ctx, -r * 0.08, mineY - r * 0.1, 1, 0, mineY, r * 0.3, lighten(metal, 0.4), '#2a2620');
  ctx.fillStyle = v.flash ? '#fff' : mg;
  ctx.strokeStyle = '#15120c';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, mineY, r * 0.28, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // akna-szegecsek + villogó jelzőfény
  ctx.fillStyle = '#15120c';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.18, mineY + Math.sin(a) * r * 0.18, r * 0.03, 0, TAU);
    ctx.fill();
  }
  const spark = v.active ? 1 : 0.4 + Math.sin(v.wob * 6) * 0.3;
  glow(ctx, 0, mineY, r * 0.07 * (0.7 + spark * 0.6), `rgba(255,${120 + spark * 100},40,${spark})`, 10 * spark);

  ctx.restore();
}
