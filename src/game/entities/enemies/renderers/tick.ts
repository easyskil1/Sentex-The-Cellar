import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, radial3 } from './helpers';

/* ===================================================================== *
 *  TICK — kullancs: teleszívott, tojásszerű potroh, elöl apró fej +
 *  rövid lábak; idővel (a hívó a sugárral/színnel jelzi) vörösebb, nagyobb.
 * ===================================================================== */
export function drawTick(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.3);

  shadow(ctx, v, 0.9, 0.55);

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.face); // a fej (+x) a haladás / a játékos teste felé néz
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 8 rövid láb a fej környékén (4 oldalanként)
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bx = r * (0.55 - i * 0.16);
      const by = sgn * r * 0.4;
      const bob = Math.sin(v.wob * 6 + i + (sgn > 0 ? 0 : 0.5)) * r * 0.08;
      const fx = bx + r * (0.2 - i * 0.04);
      const fy = sgn * r * 0.95 + bob;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + fx) / 2, by + sgn * r * 0.35, fx, fy);
      ctx.stroke();
    }
  }

  // teleszívott potroh (tojás, hátrafelé nagyobb)
  const g = radial3(ctx, -r * 0.2, -r * 0.25, r * 0.15, -r * 0.3, 0, r * 1.1, 0.6, light, body, darken(v.col, 0.32));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, 0, r * 0.95, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // háti pajzs (scutum) elöl
  ctx.fillStyle = v.flash ? '#000' : darken(v.col, 0.28);
  ctx.beginPath();
  ctx.ellipse(r * 0.28, 0, r * 0.38, r * 0.44, 0, 0, TAU);
  ctx.fill();

  // fej / szájszerv elöl
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(r * 0.78, 0, r * 0.22, r * 0.17, 0, 0, TAU);
  ctx.fill();

  // csillanás a potrohon
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.34, r * 0.26, r * 0.14, -0.4, 0, TAU);
  ctx.fill();

  ctx.restore();
}
