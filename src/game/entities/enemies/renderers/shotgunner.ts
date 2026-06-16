import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ===================================================================== *
 *  SHOTGUNNER — testes zsoldos-lény két nagy duplacsövű "öklével";
 *  lövéskor (active) a csőtorkok felvillannak és a test hátrarúg.
 * ===================================================================== */
export function drawShotgunner(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.3);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.4);
  const metal = v.flash ? '#fff' : '#6e6a5e';
  const look = v.face;
  const cos = Math.cos(look), sin = Math.sin(look);
  const recoil = v.active ? Math.max(0, 1 - (v.wob % 1) * 3) : 0;

  shadow(ctx, v, 1.05, 0.72);

  ctx.save();
  ctx.translate(v.x - cos * recoil * r * 0.18, v.y - Math.abs(step) * 2 - sin * recoil * r * 0.18);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // tömzsi lábak
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.45, r * 0.85 - lift * 4, r * 0.3, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // --- nagy duplacsövű kar a játékos felé ---
  ctx.save();
  ctx.rotate(look);
  // kar-tő (váll)
  ctx.fillStyle = darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(r * 0.4, 0, r * 0.42, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // két cső
  const gun = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
  gun.addColorStop(0, lighten(metal, 0.3));
  gun.addColorStop(1, '#2c2a24');
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.flash ? '#fff' : gun;
    ctx.strokeStyle = '#1a1813';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(r * 0.5, sgn * r * 0.04 - r * 0.13, r * 0.8, r * 0.18);
    ctx.fill();
    ctx.stroke();
    // torkolat
    ctx.fillStyle = '#100e0a';
    ctx.beginPath();
    ctx.ellipse(r * 1.3, sgn * r * 0.04 - r * 0.04, r * 0.05, r * 0.08, 0, 0, TAU);
    ctx.fill();
    if (v.active) glow(ctx, r * 1.32, sgn * r * 0.04 - r * 0.04, r * (0.1 + recoil * 0.3), '#ffd27a', 12);
  }
  ctx.restore();

  // test (zömök páncél)
  const g = ctx.createLinearGradient(0, -r, 0, r * 0.9);
  g.addColorStop(0, light);
  g.addColorStop(0.55, body);
  g.addColorStop(1, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.94, r * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // vállheveder-pánt
  ctx.strokeStyle = darken(v.col, 0.35);
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.5);
  ctx.lineTo(r * 0.55, r * 0.45);
  ctx.stroke();
  // tölténytartó pöttyök a heveden
  ctx.fillStyle = '#d8b44a';
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    ctx.beginPath();
    ctx.arc(-r * 0.6 + t * r * 1.15, -r * 0.5 + t * r * 0.95, r * 0.07, 0, TAU);
    ctx.fill();
  }

  // mogorva szemek
  const dx = cos * r * 0.08, dy = sin * r * 0.06;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.34); ctx.lineTo(-r * 0.14, -r * 0.16);
  ctx.moveTo(r * 0.5, -r * 0.34); ctx.lineTo(r * 0.14, -r * 0.16);
  ctx.stroke();
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.3, -r * 0.04, r * 0.16, r * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.3 + dx, -r * 0.04 + dy, r * 0.08, 0, TAU);
    ctx.fill();
  }

  // fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.5, r * 0.22, r * 0.1, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
