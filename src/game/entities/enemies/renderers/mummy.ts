import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow } from './helpers';

/* ---------------------------------------------------------------------
 *  MUMMY — bepólyált alak, kibomló kötés-végekkel és üres szemgödrökkel;
 *  átok-lövéskor (active) a szemek felizzanak.
 * ------------------------------------------------------------------- */
export function drawMummy(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const sway = Math.sin(v.bob * 0.9) * 0.05;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const wrap = v.flash ? '#fff' : lighten(v.col, 0.25);
  const look = v.face;

  shadow(ctx, v, 0.85, 0.86);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(sway);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // előrenyújtott karok (klasszikus múmia-tartás, a játékos felé)
  ctx.strokeStyle = body;
  ctx.lineWidth = r * 0.3;
  const armA = Math.cos(look) * r * 0.5;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.5, -r * 0.1);
    ctx.lineTo(sgn * r * 0.4 + armA, r * 0.15 + Math.sin(v.bob + sgn) * r * 0.05);
    ctx.stroke();
  }

  // test (oszlopszerű, alul szélesedő)
  const g = ctx.createLinearGradient(-r * 0.6, 0, r * 0.6, 0);
  g.addColorStop(0, darken(v.col, 0.2));
  g.addColorStop(0.5, body);
  g.addColorStop(1, darken(v.col, 0.2));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.55);
  ctx.quadraticCurveTo(-r * 0.78, r * 0.5, -r * 0.62, r * 0.95);
  ctx.lineTo(r * 0.62, r * 0.95);
  ctx.quadraticCurveTo(r * 0.78, r * 0.5, r * 0.6, -r * 0.55);
  ctx.quadraticCurveTo(0, -r * 0.95, -r * 0.6, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // pólya-csíkok (átlós kötés-tekercsek)
  ctx.strokeStyle = darken(v.col, 0.22);
  ctx.lineWidth = 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-r * 0.7, -r * 0.9, r * 1.4, r * 1.9);
  ctx.clip();
  for (let i = -4; i <= 5; i++) {
    const yy = i * r * 0.26;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, yy);
    ctx.quadraticCurveTo(0, yy + r * 0.12, r * 0.75, yy - r * 0.05);
    ctx.stroke();
  }
  ctx.restore();
  // kilógó kötés-végek
  ctx.strokeStyle = wrap;
  ctx.lineWidth = r * 0.1;
  for (const [sx, sy, ang] of [[-0.5, 0.3, 2.4], [0.55, 0.5, 0.8], [-0.2, 0.9, 1.6]] as const) {
    ctx.beginPath();
    ctx.moveTo(sx * r, sy * r);
    ctx.quadraticCurveTo(sx * r + Math.cos(ang) * r * 0.2, sy * r + r * 0.2, sx * r + Math.cos(ang + Math.sin(v.wob)) * r * 0.3, sy * r + r * 0.35);
    ctx.stroke();
  }

  // fej (pólyázott, üres szemgödrök)
  ctx.fillStyle = v.flash ? '#fff' : wrap;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.4, r * 0.44, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // szemgödrök
  const dx = Math.cos(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#100a06';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.16, -r * 0.56, r * 0.1, r * 0.13, 0, 0, TAU);
    ctx.fill();
    if (v.active) {
      glow(ctx, sgn * r * 0.16 + dx, -r * 0.56, r * 0.06, '#7affc8', 8);
      ctx.fillStyle = '#aaffd8';
      ctx.beginPath();
      ctx.arc(sgn * r * 0.16 + dx, -r * 0.56, r * 0.05, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}
