import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear2, linear3, radial2 } from './helpers';

/* ---------------------------------------------------------------------
 *  WEREWOLF — görnyedt, izmos farkasember: bozontos sörény, hosszú karmos
 *  karok, digitigrád lábak és farok, agyaras farkasfej izzó szemekkel.
 *  Üvöltéskor (wind) hátravetett fej + hanggyűrűk, ugráskor (dash) előredől
 *  és előrenyújtja a karmait, tátott pofával.
 * ------------------------------------------------------------------- */
export function drawWerewolf(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const dash = v.charge === 'dash';
  const howl = v.charge === 'wind';
  const step = Math.sin(v.bob * 1.5);
  const sway = Math.sin(v.bob * 1.0);
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.42);
  const mane = v.flash ? '#fff' : lighten(v.col, 0.16);
  const belly = v.flash ? '#fff' : lighten(v.col, 0.3);
  const fur = v.flash ? '#fff' : darken(v.col, 0.35);
  const claw = '#efe7d4';
  const look = v.face;
  const dirx = Math.cos(look);
  const lean = dash ? 0.22 : 0;
  const tailSide = dirx >= 0 ? -1 : 1;

  shadow(ctx, v, 1.16, 0.82);

  ctx.save();
  ctx.translate(v.x + dirx * lean * r, v.y - Math.abs(step) * 1.6);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ---------- FAROK (a test mögött, lengve) ----------
  ctx.save();
  ctx.translate(tailSide * r * 0.55, r * 0.3);
  ctx.rotate(tailSide * (0.4 + sway * 0.2));
  const tg = linear2(ctx, 0, 0, tailSide * r, r * 0.2, darken(v.col, 0.18), fur);
  ctx.fillStyle = v.flash ? '#fff' : tg;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.2);
  ctx.quadraticCurveTo(tailSide * r * 1.0, -r * 0.18, tailSide * r * 1.22, r * 0.42);
  ctx.quadraticCurveTo(tailSide * r * 0.95, r * 0.16, 0, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // ---------- LÁBAK (digitigrád) ----------
  for (const sgn of [-1, 1]) {
    const lift = sgn > 0 ? Math.max(0, step) : Math.max(0, -step);
    // comb
    ctx.fillStyle = darken(v.col, 0.24);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.4, r * 0.45, r * 0.27, r * 0.36, sgn * 0.18, 0, TAU);
    ctx.fill();
    // lábszár
    ctx.strokeStyle = darken(v.col, 0.3);
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.44, r * 0.62);
    ctx.lineTo(sgn * r * 0.5, r * 0.86 - lift * 4);
    ctx.stroke();
    // mancs
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.53 + dirx * r * 0.04, r * 0.92 - lift * 4, r * 0.17, r * 0.1, 0, 0, TAU);
    ctx.fill();
    // mancs-karmok
    ctx.strokeStyle = claw;
    ctx.lineWidth = r * 0.035;
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.53 + dirx * r * 0.04 + k * r * 0.06, r * 0.95 - lift * 4);
      ctx.lineTo(sgn * r * 0.53 + dirx * r * 0.08 + k * r * 0.06, r * 1.04 - lift * 4);
      ctx.stroke();
    }
  }

  // ---------- TÖRZS (görnyedt, izmos) ----------
  const g = linear3(ctx, 0, -r * 0.9, 0, r * 0.7, 0.45, light, body, darken(v.col, 0.42));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.45);
  ctx.quadraticCurveTo(-r * 0.92, 0, -r * 0.5, r * 0.58);
  ctx.quadraticCurveTo(0, r * 0.8, r * 0.5, r * 0.58);
  ctx.quadraticCurveTo(r * 0.92, 0, r * 0.62, -r * 0.45);
  ctx.quadraticCurveTo(0, -r * 0.72, -r * 0.62, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // has/mell világos folt
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, -r * 0.18);
  ctx.quadraticCurveTo(0, r * 0.72, r * 0.28, -r * 0.18);
  ctx.quadraticCurveTo(0, r * 0.14, -r * 0.28, -r * 0.18);
  ctx.closePath();
  ctx.fill();

  // mell-szőr középvonal + hasizom-jelzés
  ctx.strokeStyle = darken(v.col, 0.32);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.12);
  ctx.lineTo(0, r * 0.5);
  ctx.moveTo(-r * 0.16, r * 0.14);
  ctx.lineTo(r * 0.16, r * 0.14);
  ctx.moveTo(-r * 0.14, r * 0.3);
  ctx.lineTo(r * 0.14, r * 0.3);
  ctx.stroke();

  // ---------- SÖRÉNY (bozontos szőr-tüskék a vállak körül) ----------
  ctx.fillStyle = mane;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  const tufts = 9;
  for (let i = 0; i <= tufts; i++) {
    const a = Math.PI + (i / tufts) * Math.PI; // felső ív (PI..2PI → fent)
    const bx = Math.cos(a) * r * 0.58;
    const by = -r * 0.42 + Math.sin(a) * r * 0.3;
    const out = 1 + (i % 2) * 0.2;
    const tx = Math.cos(a) * r * 0.82 * out;
    const ty = -r * 0.5 + Math.sin(a) * r * 0.46 * out;
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.09, by);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + r * 0.09, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ---------- KARMOS KAROK (a törzs előtt) ----------
  const reach = dash ? r * 0.42 : 0;
  for (const sgn of [-1, 1]) {
    const handX = sgn * r * 0.72 + dirx * reach;
    const handY = dash ? r * 0.08 : r * 0.5;
    // felkar + alkar
    ctx.strokeStyle = darken(v.col, 0.14);
    ctx.lineWidth = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.5, -r * 0.28);
    ctx.quadraticCurveTo(sgn * r * 0.86, r * 0.12, handX, handY);
    ctx.stroke();
    // mancs-ököl
    ctx.fillStyle = darken(v.col, 0.08);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(handX, handY, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // karmok (ívelt)
    ctx.strokeStyle = claw;
    ctx.lineWidth = r * 0.05;
    for (const k of [-0.16, -0.05, 0.06, 0.17]) {
      ctx.beginPath();
      ctx.moveTo(handX + k * r, handY + r * 0.06);
      ctx.quadraticCurveTo(handX + k * r + dirx * r * 0.06, handY + r * 0.26, handX + k * r + dirx * r * 0.13, handY + r * 0.34);
      ctx.stroke();
    }
  }

  // ---------- FEJ ----------
  ctx.save();
  ctx.translate(dirx * r * 0.06, -r * 0.64);
  ctx.rotate(howl ? (dirx >= 0 ? -0.5 : 0.5) : 0);

  // hegyes fülek (a koponya mögött)
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = darken(v.col, 0.2);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.16, -r * 0.16);
    ctx.lineTo(sgn * r * 0.36, -r * 0.62);
    ctx.lineTo(sgn * r * 0.42, -r * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // belső fül
    ctx.fillStyle = darken(v.col, 0.46);
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.22, -r * 0.18);
    ctx.lineTo(sgn * r * 0.33, -r * 0.46);
    ctx.lineTo(sgn * r * 0.36, -r * 0.16);
    ctx.closePath();
    ctx.fill();
  }

  // koponya
  const hg = radial2(ctx, -r * 0.1, -r * 0.12, r * 0.06, 0, 0, r * 0.5, light, body);
  ctx.fillStyle = v.flash ? '#fff' : hg;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.4, r * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // pofa (megnyúlt orr, a játékos felé)
  const sx = dirx * r * 0.24;
  const sy = r * 0.24;
  ctx.fillStyle = v.flash ? '#fff' : lighten(v.col, 0.26);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(sx, sy, r * 0.32, r * 0.18, dirx * 0.32, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // orr
  ctx.fillStyle = '#15110d';
  ctx.beginPath();
  ctx.ellipse(sx + dirx * r * 0.27, sy + r * 0.02, r * 0.085, r * 0.07, 0, 0, TAU);
  ctx.fill();
  // pofa-vonal
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(sx - r * 0.2, sy + r * 0.08);
  ctx.lineTo(sx + dirx * r * 0.22, sy + r * 0.1);
  ctx.stroke();

  // tátott pofa + agyarak üvöltéskor/ugráskor, különben két kis agyar
  if (howl || dash) {
    ctx.fillStyle = '#3a0e0e';
    ctx.beginPath();
    ctx.ellipse(sx + dirx * r * 0.04, sy + r * 0.07, r * 0.17, r * 0.1, dirx * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = claw;
    for (const fx of [-0.11, 0, 0.11]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx * r - r * 0.026, sy + r * 0.01);
      ctx.lineTo(sx + fx * r, sy + r * 0.18);
      ctx.lineTo(sx + fx * r + r * 0.026, sy + r * 0.01);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = claw;
    for (const fx of [-0.07, 0.07]) {
      ctx.beginPath();
      ctx.moveTo(sx + fx * r - r * 0.022, sy + r * 0.1);
      ctx.lineTo(sx + fx * r, sy + r * 0.21);
      ctx.lineTo(sx + fx * r + r * 0.022, sy + r * 0.1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // izzó szemek (mandulavágású, függőleges pupilla)
  const aggro = howl || dash;
  const ex = dirx * r * 0.05;
  for (const sgn of [-1, 1]) {
    const eyx = sgn * r * 0.18 + ex;
    const eyy = -r * 0.05;
    glow(ctx, eyx, eyy, r * 0.05, aggro ? '#ff7a1e' : '#ffb020', aggro ? 9 : 5);
    ctx.fillStyle = aggro ? '#ffd23a' : '#ffd86a';
    ctx.beginPath();
    ctx.ellipse(eyx, eyy, r * 0.075, r * 0.055, sgn * 0.32, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.ellipse(eyx, eyy, r * 0.02, r * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // dühös szemöldök-redő
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.18);
  ctx.lineTo(-r * 0.06, -r * 0.06);
  ctx.moveTo(r * 0.3, -r * 0.18);
  ctx.lineTo(r * 0.06, -r * 0.06);
  ctx.stroke();
  ctx.restore();

  // ---------- üvöltés-hanghullámok ----------
  if (howl) {
    ctx.strokeStyle = 'rgba(225,225,215,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = (v.wob * 1.4 + i / 3) % 1;
      ctx.globalAlpha = 0.55 * (1 - ph);
      ctx.beginPath();
      ctx.arc(dirx * r * 0.4, -r * 1.05, r * (0.25 + ph * 0.9), -1.0, 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- ugrás: sebesség-csíkok ----------
  if (dash) {
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.6;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-dirx * r * 0.9, sgn * r * 0.3);
      ctx.lineTo(-dirx * r * 1.4, sgn * r * 0.42);
      ctx.stroke();
    }
  }

  ctx.restore();
}
