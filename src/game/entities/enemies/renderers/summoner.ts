import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, linear3 } from './helpers';

/* ===================================================================== *
 *  SUMMONER — lebegő csuklyás idéző, alatta forgó idéző-glifa-koronggal;
 *  idézéskor (active) a glifák és a szempár felragyognak.
 * ===================================================================== */
export function drawSummoner(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.18;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.5);
  const rune = v.active ? '#cfe0ff' : lighten(v.col, 0.3);

  shadow(ctx, v, 0.8, 1.1);

  // --- forgó idéző-glifa a test alatt (a talajra vetülő rúna-korong) ---
  ctx.save();
  ctx.translate(v.x, v.y + r * 0.95);
  ctx.scale(1, 0.4); // perspektíva: lapított korong
  ctx.rotate(v.wob * (v.active ? 1.4 : 0.5));
  ctx.globalAlpha = v.active ? 0.55 + Math.sin(v.wob * 8) * 0.2 : 0.3;
  ctx.strokeStyle = rune;
  if (v.active) { ctx.shadowColor = '#9fc0ff'; ctx.shadowBlur = 12; }
  ctx.lineWidth = 2;
  for (const rad of [r * 1.25, r * 0.8]) {
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
  }
  // két elforgatott háromszög (hexagramm)
  for (const off of [0, Math.PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = off + (i / 3) * TAU;
      const fx = Math.cos(a) * r * 1.1, fy = Math.sin(a) * r * 1.1;
      if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // alul szétfoszló köpenyszél
  const tatters = 6;
  const g = linear3(ctx, 0, -r, 0, r * 1.3, 0.55, light, body, darken(v.col, 0.4));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0);
  ctx.quadraticCurveTo(-r * 0.95, -r * 1.05, 0, -r * 1.05);
  ctx.quadraticCurveTo(r * 0.95, -r * 1.05, r * 0.8, 0);
  for (let i = tatters; i >= 0; i--) {
    const tx = -r * 0.8 + (i / tatters) * r * 1.6;
    const low = r * (0.75 + Math.sin(v.wob * 2.4 + i * 1.2) * 0.28);
    if (i === tatters) ctx.lineTo(tx, r * 0.4);
    ctx.quadraticCurveTo(tx + r * 0.1, low, tx - r * 0.13, r * 0.4 + r * 0.08);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // díszszegély a csuklya peremén
  ctx.strokeStyle = rune;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.18);
  ctx.quadraticCurveTo(0, -r * 0.95, r * 0.62, -r * 0.18);
  ctx.stroke();

  // csuklya-üreg (sötét belső)
  ctx.fillStyle = '#120e22';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.4, r * 0.46, r * 0.56, 0, 0, TAU);
  ctx.fill();

  // izzó szempár a csuklyában
  const look = v.face;
  const dx = Math.cos(look) * r * 0.07;
  const dy = Math.sin(look) * r * 0.05;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = v.active ? '#dff0ff' : '#acc6ff';
    glow(ctx, sgn * r * 0.18 + dx, -r * 0.42 + dy, r * 0.09, '#9fc0ff', v.active ? 12 : 6);
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.18 + dx, -r * 0.42 + dy, r * 0.08, r * 0.12, 0, 0, TAU);
    ctx.fill();
  }

  // lebegő idéző-szikrák, ha aktív
  if (v.active) {
    ctx.fillStyle = '#cfe0ff';
    for (let i = 0; i < 6; i++) {
      const a = v.wob * 3 + (i / 6) * TAU;
      const rr = r * (0.9 + Math.sin(v.wob * 4 + i) * 0.3);
      ctx.globalAlpha = 0.5 + Math.sin(v.wob * 6 + i) * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, -r * 0.3 + Math.sin(a) * rr * 0.7, r * 0.05, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
