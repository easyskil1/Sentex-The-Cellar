import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2, radial3 } from './helpers';

/* ===================================================================== *
 *  GUNNER — fürge gépkarú lövész forgócsöves (minigun) karral;
 *  lövéskor (active) a csőköteg pörög és a torkolat pislákol.
 * ===================================================================== */
export function drawGunner(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.12;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.46);
  const metal = v.flash ? '#fff' : '#5a6470';
  const look = v.face;
  const spin = v.active ? v.wob * 22 : v.wob * 3;

  shadow(ctx, v, 0.85, 0.92);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // két lebegő stabilizátor-szárny
  ctx.fillStyle = darken(v.col, 0.25);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.rotate(sgn * (0.5 + Math.sin(v.wob * 4) * 0.15));
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.85, r * 0.1, r * 0.42, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- forgócsöves kar a játékos felé ---
  ctx.save();
  ctx.rotate(look);
  // tok
  ctx.fillStyle = v.flash ? '#fff' : linear2(ctx, 0, -r * 0.3, 0, r * 0.3, lighten(metal, 0.3), '#2a3038');
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.rect(r * 0.3, -r * 0.28, r * 0.55, r * 0.56);
  ctx.fill();
  ctx.stroke();
  // pörgő csőköteg (a forgást a függőleges eltolás mutatja)
  for (let i = 0; i < 4; i++) {
    const ph = spin + (i / 4) * TAU;
    const oy = Math.cos(ph) * r * 0.16;
    const depth = (Math.sin(ph) + 1) * 0.5; // 0..1 mélységi árnyalás
    ctx.fillStyle = v.flash ? '#fff' : `rgb(${40 + depth * 90},${46 + depth * 96},${52 + depth * 100})`;
    ctx.strokeStyle = '#15181c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(r * 0.8, oy - r * 0.07, r * 0.7, r * 0.14);
    ctx.fill();
    ctx.stroke();
  }
  // torkolat-villanás
  if (v.active) {
    glow(ctx, r * 1.5, 0, r * (0.12 + (v.wob * 3 % 1) * 0.18), '#ffe08a', 12);
  }
  ctx.restore();

  // test (sima dróngömb)
  ctx.fillStyle = v.flash ? '#fff' : radial3(ctx, -r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 0.8, 0.7, light, body, darken(v.col, 0.32));
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // páncél-osztóvonal
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // gépi vizor-szem (vízszintes rés a játékos felé)
  const dx = Math.cos(look) * r * 0.12;
  ctx.fillStyle = '#101418';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.46, r * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = v.active ? '#7fe0ff' : '#4aa0c0';
  glow(ctx, dx, -r * 0.05, r * 0.09, '#4ad0ff', v.active ? 8 : 4);
  ctx.beginPath();
  ctx.ellipse(dx, -r * 0.05, r * 0.12, r * 0.08, 0, 0, TAU);
  ctx.fill();

  // fénypötty
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.16, r * 0.08, -0.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}
