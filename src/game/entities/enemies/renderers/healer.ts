import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, aura, linear3 } from './helpers';

/* ===================================================================== *
 *  HEALER — lebegő gyógyító-pap zöld életaurában, kereszt-amulettel;
 *  gyógyításkor (active) az amulett felragyog és gyógyhullám-gyűrűk
 *  terjednek kifelé.
 * ===================================================================== */
export function drawHealer(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.18;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);

  // állandó lágy életaura + gyógyhullám aktívkor
  aura(ctx, v.x, v.y + float, r * (v.active ? 2.4 : 1.7), '120,240,160', v.active ? 0.3 : 0.16);
  if (v.active) {
    ctx.save();
    ctx.strokeStyle = '#8fffba';
    ctx.shadowColor = '#5cff8f';
    ctx.shadowBlur = 8;
    for (let i = 0; i < 2; i++) {
      const ph = (v.wob * 1.2 + i / 2) % 1;
      ctx.globalAlpha = 0.6 * (1 - ph);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(v.x, v.y + float, r * (0.8 + ph * 2.2), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.8, 1.05);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // lebegő gyógyító-szikrák felfelé
  ctx.fillStyle = '#aaffce';
  for (let i = 0; i < 4; i++) {
    const ph = (v.wob * 0.8 + i / 4) % 1;
    ctx.globalAlpha = 0.7 * (1 - ph);
    const sx = Math.sin(i * 2 + v.wob) * r * 0.5;
    ctx.beginPath();
    ctx.arc(sx, -r * 0.5 - ph * r * 1.2, r * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // köpenyes test (lágy, lekerekített)
  const g = linear3(ctx, 0, -r, 0, r * 1.1, 0.55, light, body, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, r * 0.55);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.95, 0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.95, r * 0.72, r * 0.55);
  ctx.quadraticCurveTo(0, r * 0.85, -r * 0.72, r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // csuklya-perem
  ctx.strokeStyle = lighten(v.col, 0.2);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.85, r * 0.6, -r * 0.1);
  ctx.stroke();

  // csuklya-üreg + jámbor szemek
  ctx.fillStyle = '#0e2418';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.32, r * 0.4, r * 0.42, 0, 0, TAU);
  ctx.fill();
  const look = v.face;
  const dx = Math.cos(look) * r * 0.06, dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#dfffe8' : '#9fffc0';
    glow(ctx, sgn * r * 0.16 + dx, -r * 0.34 + dy, r * 0.07, '#5cff8f', v.active ? 10 : 5);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.16 + dx, -r * 0.34 + dy, r * 0.06, 0, TAU);
    ctx.fill();
  }

  // gyógyító kereszt-amulett a mellkason (aktívkor ragyog)
  const cy = r * 0.28;
  ctx.fillStyle = v.active ? '#eaffe8' : lighten(v.col, 0.35);
  if (v.active) { ctx.shadowColor = '#7cff9f'; ctx.shadowBlur = 12; }
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.4;
  const cw = r * 0.1, cl = r * 0.26;
  ctx.beginPath();
  ctx.rect(-cw, cy - cl, cw * 2, cl * 2); // függőleges szár
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.rect(-cl, cy - cw, cl * 2, cw * 2); // vízszintes szár
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}
