import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2 } from './helpers';

/* ---------------------------------------------------------------------
 *  MEDUSA — gorgó kígyó-hajjal: tekergő kígyók a fej körül, izzó tekintet;
 *  megkövítéskor (active) a szemek és a kígyók felragyognak.
 * ------------------------------------------------------------------- */
export function drawMedusa(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.06;
  const dark = v.flash ? '#000' : v.col2;
  const skin = v.flash ? '#fff' : lighten(v.col, 0.3);
  const snake = v.flash ? '#fff' : darken(v.col, 0.05);
  const look = v.face;

  // megkövítő tekintet-sugár
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(v.wob * 12) * 0.15;
    ctx.strokeStyle = '#dffae8';
    ctx.shadowColor = '#bfe8cf';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;
    const cos = Math.cos(look), sin = Math.sin(look);
    ctx.beginPath();
    ctx.moveTo(v.x + cos * r * 0.4, v.y + float + sin * r * 0.4);
    ctx.lineTo(v.x + cos * 300, v.y + float + sin * 300);
    ctx.stroke();
    ctx.restore();
  }

  shadow(ctx, v, 0.85, 0.85);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // kígyó-haj (tekergő kígyók a fej körül)
  for (let i = 0; i < 9; i++) {
    const baseA = -Math.PI * 0.95 + (i / 8) * Math.PI * 1.9;
    const wig = Math.sin(v.wob * 3 + i) * 0.4;
    const bx = Math.cos(baseA) * r * 0.5;
    const by = Math.sin(baseA) * r * 0.5 - r * 0.3;
    const mx = Math.cos(baseA + wig) * r * 1.0;
    const my = Math.sin(baseA + wig) * r * 1.0 - r * 0.4;
    const tx = Math.cos(baseA + wig * 1.6) * r * 1.3;
    const ty = Math.sin(baseA + wig * 1.6) * r * 1.3 - r * 0.45;
    ctx.strokeStyle = snake;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    // kígyófejecske a végén
    ctx.fillStyle = v.active ? '#9fffc0' : lighten(v.col, 0.2);
    ctx.beginPath();
    ctx.ellipse(tx, ty, r * 0.13, r * 0.09, baseA + wig, 0, TAU);
    ctx.fill();
    ctx.fillStyle = v.active ? '#1a3a24' : dark;
    ctx.beginPath();
    ctx.arc(tx + Math.cos(baseA) * r * 0.06, ty + Math.sin(baseA) * r * 0.06, r * 0.03, 0, TAU);
    ctx.fill();
  }

  // felsőtest / váll
  const g = linear2(ctx, 0, -r * 0.3, 0, r, skin, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.7, r * 0.2, -r * 0.4, -r * 0.1);
  ctx.lineTo(r * 0.4, -r * 0.1);
  ctx.quadraticCurveTo(r * 0.7, r * 0.2, r * 0.6, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // arc
  ctx.fillStyle = v.flash ? '#fff' : skin;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.28, r * 0.42, r * 0.46, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // izzó megkövítő szemek
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#0e2418';
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.17, -r * 0.28, r * 0.13, r * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = v.active ? '#eaffe8' : '#9fe8b0';
    glow(ctx, sgn * r * 0.17 + dx, -r * 0.28 + dy, r * 0.06, v.active ? '#6fffa0' : '#5cd88f', v.active ? 12 : 5);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.17 + dx, -r * 0.28 + dy, r * 0.055, 0, TAU);
    ctx.fill();
  }
  // száj
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 0.05);
  ctx.quadraticCurveTo(0, -r * 0.02, r * 0.12, -r * 0.05);
  ctx.stroke();

  ctx.restore();
}
