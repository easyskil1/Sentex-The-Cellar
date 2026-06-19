import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear3, radial2, linear2 } from './helpers';

/* ---------------------------------------------------------------------
 *  MINOTAUR — izmos bika-ember, ívelt szarvakkal és orrkarikával;
 *  töltéskor (wind) horkant és dobog, rohamban (dash) előredől.
 * ------------------------------------------------------------------- */
export function drawMinotaur(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const step = Math.sin(v.bob * 1.2);
  const dash = v.charge === 'dash';
  const wind = v.charge === 'wind';
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.36);
  const look = v.face;
  const lean = dash ? 0.18 : 0;

  shadow(ctx, v, 1.1, 0.74);

  ctx.save();
  ctx.translate(v.x + Math.cos(look) * lean * r, v.y - Math.abs(step) * 2 + Math.sin(look) * lean * r);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // hátsó paták
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.5, r * 0.9 - lift * 5, r * 0.28, r * 0.22, 0, 0, TAU);
    ctx.fill();
  }

  // vaskos kar-öklök
  ctx.strokeStyle = darken(v.col, 0.2);
  ctx.lineWidth = r * 0.28;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.7, -r * 0.2);
    ctx.lineTo(sgn * r * 0.95, r * 0.4 + (dash ? -r * 0.2 : 0));
    ctx.stroke();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.97, r * 0.42 + (dash ? -r * 0.2 : 0), r * 0.2, 0, TAU);
    ctx.fill();
  }

  // izmos törzs
  const g = linear3(ctx, 0, -r, 0, r, 0.5, light, body, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * 0.86, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // mellkas-szőrzet él
  ctx.strokeStyle = darken(v.col, 0.3);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(0, 0); ctx.lineTo(r * 0.3, -r * 0.4);
  ctx.stroke();

  // bika-fej
  ctx.save();
  ctx.translate(0, -r * 0.65);
  // pofa
  const hg = radial2(ctx, -r * 0.1, -r * 0.1, r * 0.1, 0, 0, r * 0.6, light, body);
  ctx.fillStyle = v.flash ? '#fff' : hg;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 0.46, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // orr-rész (világos pofa)
  ctx.fillStyle = lighten(v.col, 0.2);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.22, r * 0.32, r * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // orrlyukak + orrkarika
  ctx.fillStyle = dark;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.12, r * 0.2, r * 0.05, r * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#d8c46a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  // ívelt szarvak
  for (const sgn of [-1, 1]) {
    const horn = linear2(ctx, 0, -r * 0.3, sgn * r * 0.7, -r * 0.7, '#efe7d2', '#b8a878');
    ctx.fillStyle = v.flash ? '#fff' : horn;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.42, -r * 0.2);
    ctx.quadraticCurveTo(sgn * r * 0.85, -r * 0.35, sgn * r * 0.78, -r * 0.8);
    ctx.quadraticCurveTo(sgn * r * 0.66, -r * 0.45, sgn * r * 0.32, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // dühös, izzó szemek
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = wind || dash ? '#ffd23a' : '#ffe9b0';
    glow(ctx, sgn * r * 0.22, -r * 0.05, r * 0.09, wind || dash ? '#ff6a2a' : 'rgba(0,0,0,0)', wind || dash ? 8 : 0);
    ctx.beginPath();
    ctx.arc(sgn * r * 0.22, -r * 0.05, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sgn * r * 0.22, -r * 0.05, r * 0.04, 0, TAU);
    ctx.fill();
  }
  // szemöldök-redő
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.36, -r * 0.24); ctx.lineTo(-r * 0.08, -r * 0.12);
  ctx.moveTo(r * 0.36, -r * 0.24); ctx.lineTo(r * 0.08, -r * 0.12);
  ctx.stroke();
  ctx.restore();

  // töltéskor orr-pára
  if (wind) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const sgn of [-1, 1]) {
      const pf = (v.wob * 0.6) % 1;
      ctx.globalAlpha = 0.5 * (1 - pf);
      ctx.beginPath();
      ctx.arc(sgn * r * 0.2 + sgn * pf * r * 0.5, -r * 0.3 + pf * r * 0.3, r * 0.1 * (1 + pf), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
