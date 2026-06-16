import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  SLAMMER — nehéz kőököl-gólem hatalmas mancsokkal; földcsapáskor
 *  (active) a mancsok lecsapnak, becsapódási gyűrű és porfelhő.
 * ===================================================================== */
export function drawSlammer(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.0);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.38);
  const slam = v.active ? Math.max(0, 1 - (v.wob % 1) * 2.5) : 0; // csapás-lökés

  // becsapódási lökéshullám-gyűrű
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.4 * slam;
    ctx.strokeStyle = '#d8c0a0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(v.x, v.y + r * 0.7, r * (1.2 + (1 - slam) * 2), r * (0.4 + (1 - slam) * 0.7), 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  shadow(ctx, v, 1.15, 0.74);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5 + slam * r * 0.1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // zömök test (kő-tömb)
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.55);
  ctx.quadraticCurveTo(0, -r * 0.78, r * 0.7, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.85, r * 0.1, r * 0.55, r * 0.6);
  ctx.quadraticCurveTo(0, r * 0.78, -r * 0.55, r * 0.6);
  ctx.quadraticCurveTo(-r * 0.85, r * 0.1, -r * 0.7, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // kőzet-repedések
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.15, -r * 0.1); ctx.lineTo(-r * 0.35, r * 0.3);
  ctx.moveTo(r * 0.4, -r * 0.4); ctx.lineTo(r * 0.2, 0);
  ctx.stroke();

  // mély szemvágás + izzó szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06;
  ctx.fillStyle = '#0e0a06';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.12, r * 0.46, r * 0.16, 0, 0, TAU);
  ctx.fill();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#ffd27a' : '#e0a85a';
    glow(ctx, sgn * r * 0.22 + dx, -r * 0.12, r * 0.08, '#ffb13a', v.active ? 8 : 3);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.22 + dx, -r * 0.12, r * 0.07, 0, TAU);
    ctx.fill();
  }

  ctx.restore();

  // --- két hatalmas kő-mancs a test két oldalán (csapáskor lent) ---
  for (const sgn of [-1, 1]) {
    const fistX = v.x + sgn * r * 1.0;
    const fistY = v.y + (v.active ? r * (0.5 + slam * 0.5) : r * 0.1 + Math.sin(v.wob * 1.0 + sgn) * r * 0.08);
    ctx.save();
    ctx.translate(fistX, fistY);
    // kar-összekötő
    ctx.strokeStyle = darken(v.col, 0.3);
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(-sgn * r * 0.5, -r * 0.3);
    ctx.lineTo(0, 0);
    ctx.stroke();
    // mancs (rögös gömb)
    const fg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.1, 0, 0, r * 0.5);
    fg.addColorStop(0, light);
    fg.addColorStop(1, darken(v.col, 0.32));
    ctx.fillStyle = v.flash ? '#fff' : fg;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.35, 0, r * 0.45);
    ctx.quadraticCurveTo(r * 0.5, r * 0.35, r * 0.42, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.45, -r * 0.4, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // bütyök-vonalak (ujjperc)
    ctx.strokeStyle = darken(v.col, 0.28);
    ctx.lineWidth = 1.4;
    for (const ox of [-0.15, 0.15]) {
      ctx.beginPath();
      ctx.moveTo(ox * r, -r * 0.15);
      ctx.lineTo(ox * r, r * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }
}
