import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, aura, radial3, radial2 } from './helpers';

/* ===================================================================== *
 *  GASBAG — puffadt, áttetsző méreggömb gomolygó gázzal és feszülő bőrrel;
 *  lassan kúszik apró lábakon, a robbanás előtti telítettség érzetével.
 * ===================================================================== */
export function drawGasbag(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const pulse = 1 + Math.sin(v.bob * 1.2) * 0.07;
  const squash = 1 - Math.sin(v.bob * 1.2) * 0.05;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.45);

  // szivárgó méreg-glória
  aura(ctx, v.x, v.y, r * 1.6 * pulse, '159,176,74', 0.16);

  shadow(ctx, v, 1.0, 0.78);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // apró kapálózó lábacskák
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.1;
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const bx = sgn * r * (0.3 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(bx * 0.7, r * 0.6);
      ctx.lineTo(bx, r * 0.95 + Math.sin(v.wob * 3 + i + sgn) * 2);
      ctx.stroke();
    }
  }

  // puffadt, áttetsző gömbtest
  const g = radial3(ctx, -r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.05, 0.55, light, body, darken(v.col, 0.28));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.96 * pulse, r * 0.92 * squash, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // belül gomolygó gáz-örvények (áttetsző)
  ctx.save();
  ctx.clip(); // a testen belülre vágva
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 4; i++) {
    const a = v.wob * 0.8 + (i / 4) * TAU;
    const ox = Math.cos(a) * r * 0.4, oy = Math.sin(a) * r * 0.35;
    const blob = radial2(ctx, ox, oy, 1, ox, oy, r * 0.5, '#e8ff9a', 'rgba(159,176,74,0)');
    ctx.fillStyle = blob;
    ctx.beginPath();
    ctx.arc(ox, oy, r * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // feszülő bőr-csillanás
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.24, r * 0.12, -0.5, 0, TAU);
  ctx.fill();

  // beesett apró szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#243000';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.24, r * 0.05, r * 0.12, r * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#cfe07a';
    ctx.beginPath();
    ctx.arc(sgn * r * 0.24 + dx, r * 0.05 + dy, r * 0.05, 0, TAU);
    ctx.fill();
  }
  // csüngő, csöpögő száj
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.restore();
}
