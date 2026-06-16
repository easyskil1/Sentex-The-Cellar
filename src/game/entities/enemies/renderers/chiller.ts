import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  CHILLER — sápadt kék jégszellem, kristálytüskékkel és fagyos aurával
 * ===================================================================== */
export function drawChiller(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.16;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  const ice = v.flash ? '#fff' : '#eafaff';

  shadow(ctx, v, 0.7, 1.05);

  // fagyos aura (lassító mező, ha aktív)
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(v.wob * 4) * 0.05;
    const aura = ctx.createRadialGradient(v.x, v.y + float, r * 0.5, v.x, v.y + float, r * 2.6);
    aura.addColorStop(0, '#cdeefa');
    aura.addColorStop(1, 'rgba(120,200,230,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(v.x, v.y + float, r * 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    // lebegő hópelyhek
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 5; i++) {
      const a = v.wob * 1.5 + (i / 5) * TAU;
      const rr = r * (1.5 + Math.sin(v.wob * 2 + i) * 0.4);
      ctx.beginPath();
      ctx.arc(v.x + Math.cos(a) * rr, v.y + float + Math.sin(a) * rr * 0.7, 1.6, 0, TAU);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // kristálytüskék a test körül
  ctx.fillStyle = ice;
  ctx.strokeStyle = '#7fc4d8';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + v.wob * 0.3;
    const bx = Math.cos(a) * r * 0.7;
    const by = Math.sin(a) * r * 0.7;
    const tx = Math.cos(a) * r * 1.25;
    const ty = Math.sin(a) * r * 1.25;
    const pa = a + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(pa) * r * 0.12, by + Math.sin(pa) * r * 0.12);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - Math.cos(pa) * r * 0.12, by - Math.sin(pa) * r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // jeges test (áttetsző gömb)
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.65, body);
  g.addColorStop(1, darken(v.col, 0.25));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // belső csillámlás (fazettás él)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.lineTo(-r * 0.05, -r * 0.45);
  ctx.lineTo(r * 0.35, -r * 0.05);
  ctx.stroke();

  // izzó hideg szemek
  const look = v.face;
  const dx = Math.cos(look) * r * 0.1;
  const dy = Math.sin(look) * r * 0.08;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#dffaff';
    ctx.shadowColor = '#9fe0ec';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.28 + dx, -r * 0.08 + dy, r * 0.12, r * 0.18, 0, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // felső jégcsillanás
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.42, r * 0.2, r * 0.1, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
