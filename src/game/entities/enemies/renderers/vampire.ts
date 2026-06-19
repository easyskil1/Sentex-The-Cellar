import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, radial3, linear2 } from './helpers';

/* ---------------------------------------------------------------------
 *  VAMPIRE — sápadt köpenyes alak, felálló gallérral és agyarakkal;
 *  denevér-csapáskor (dash) a köpeny szárnnyá tárul, szemei felizzanak.
 * ------------------------------------------------------------------- */
export function drawVampire(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.1);
  const dash = v.charge === 'dash';
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const skin = v.flash ? '#fff' : '#e6dce0';
  const look = v.face;

  // VÉR-AURA: a vámpír körüli sebző kör (követi a vámpírt). A sugár r × 13 —
  // SZINKRONBAN az Enemy.ts updateVampire gameplay-sugarával.
  const auraR = r * 13;
  const tt = performance.now() / 1000;
  ctx.save();
  const ag = radial3(ctx, v.x, v.y, auraR * 0.2, v.x, v.y, auraR, 0.7, 'rgba(150,20,40,0.18)', 'rgba(110,12,30,0.1)', 'rgba(80,8,22,0)');
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.arc(v.x, v.y, auraR, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(tt * 3)); // lüktető perem
  ctx.strokeStyle = '#c0223e';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);
  ctx.lineDashOffset = -tt * 18;
  ctx.beginPath();
  ctx.arc(v.x, v.y, auraR, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  shadow(ctx, v, dash ? 1.2 : 0.85, 0.82);

  ctx.save();
  ctx.translate(v.x, v.y - Math.abs(step) * 1.5);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // köpeny-szárnyak (csapáskor széttárva, mint a denevérszárny)
  const spread = dash ? 1.0 : 0.4 + Math.sin(v.bob) * 0.05;
  for (const sgn of [-1, 1]) {
    const wing = linear2(ctx, 0, 0, sgn * r * 1.4, 0, v.flash ? '#fff' : body, v.flash ? '#fff' : darken(v.col, 0.5));
    ctx.fillStyle = wing;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.quadraticCurveTo(sgn * r * (0.8 + spread), -r * 0.6 * spread, sgn * r * (0.7 + spread * 0.9), r * 0.3);
    // denevérszárny-ujjak (cikkcakk perem)
    for (let i = 3; i >= 0; i--) {
      const t = i / 3;
      const wx = sgn * r * (0.2 + (0.7 + spread * 0.9) * t);
      const wy = r * (0.3 + t * 0.6) - Math.sin(t * Math.PI) * r * 0.2;
      ctx.lineTo(wx + sgn * r * 0.12, wy - r * 0.1);
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(0, r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // test (köpeny-burok)
  const g = linear2(ctx, 0, -r, 0, r, lighten(v.col, 0.2), darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.4);
  ctx.quadraticCurveTo(-r * 0.6, r * 0.8, 0, r * 0.95);
  ctx.quadraticCurveTo(r * 0.6, r * 0.8, r * 0.5, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // felálló gallér
  ctx.fillStyle = darken(v.col, 0.45);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.45);
  ctx.lineTo(-r * 0.55, -r * 0.95);
  ctx.lineTo(-r * 0.12, -r * 0.5);
  ctx.lineTo(r * 0.12, -r * 0.5);
  ctx.lineTo(r * 0.55, -r * 0.95);
  ctx.lineTo(r * 0.5, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // sápadt arc
  ctx.fillStyle = v.flash ? '#fff' : skin;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.5, r * 0.32, r * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // hegyes hajvonal (özvegycsúcs)
  ctx.fillStyle = darken(v.col, 0.5);
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.58);
  ctx.quadraticCurveTo(0, -r * 0.78, r * 0.32, -r * 0.58);
  ctx.lineTo(r * 0.26, -r * 0.66);
  ctx.lineTo(0, -r * 0.5);
  ctx.lineTo(-r * 0.26, -r * 0.66);
  ctx.closePath();
  ctx.fill();
  // izzó vörös szemek
  const dx = Math.cos(look) * r * 0.05, dy = Math.sin(look) * r * 0.04;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = dash ? '#ff2a4a' : '#c83040';
    glow(ctx, sgn * r * 0.13 + dx, -r * 0.52 + dy, r * 0.06, '#ff2a4a', dash ? 10 : 5);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.13 + dx, -r * 0.52 + dy, r * 0.06, r * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // agyarak
  ctx.fillStyle = '#fff';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.1, -r * 0.36);
    ctx.lineTo(sgn * r * 0.14, -r * 0.24);
    ctx.lineTo(sgn * r * 0.05, -r * 0.34);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
