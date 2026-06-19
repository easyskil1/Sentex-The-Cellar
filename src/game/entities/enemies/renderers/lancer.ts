import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, radial3 } from './helpers';

/* ===================================================================== *
 *  LANCER — lila lebegő szentinel-szem, fókuszlencsével és energiasugárral
 * ===================================================================== */
export function drawLancer(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const float = Math.sin(v.bob) * r * 0.12;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.45);
  const state = v.laserState ?? 'idle';

  // --- a sugár / célzóvonal (a test mögé, világ-térben) ---
  if (state !== 'idle' && v.laserLen && v.laserAng !== undefined) {
    const ax = Math.cos(v.laserAng), ay = Math.sin(v.laserAng);
    const ex = v.x + ax * (v.laserLen || 0);
    const ey = v.y + float + ay * (v.laserLen || 0);
    ctx.save();
    if (state === 'aim') {
      // vékony, pulzáló telegrafáló vonal
      ctx.globalAlpha = 0.35 + Math.sin(v.wob * 14) * 0.25;
      ctx.strokeStyle = '#ff9af0';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y + float);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // vastag izzó energiasugár
      ctx.shadowColor = '#ff4ae0';
      ctx.shadowBlur = 18;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,140,240,0.35)';
      ctx.lineWidth = 18;
      ctx.beginPath(); ctx.moveTo(v.x, v.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ff6ae6';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(v.x, v.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(v.x, v.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  shadow(ctx, v, 0.8, 1.0);

  ctx.save();
  ctx.translate(v.x, v.y + float);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // keringő burkolat-szilánkok
  ctx.fillStyle = darken(v.col, 0.2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = v.wob * (state === 'idle' ? 0.6 : 2) + (i / 3) * TAU;
    const ox = Math.cos(a) * r * 1.05;
    const oy = Math.sin(a) * r * 1.05;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, 0);
    ctx.lineTo(0, -r * 0.28);
    ctx.lineTo(r * 0.18, 0);
    ctx.lineTo(0, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // burkolat-gömb
  const g = radial3(ctx, -r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 0.85, 0.7, light, body, darken(v.col, 0.35));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // fókuszlencse-szem a játékos felé (töltéskor felizzik)
  const look = v.laserAng ?? v.face;
  const ex = Math.cos(look) * r * 0.2;
  const ey = Math.sin(look) * r * 0.2;
  const glow = state === 'aim' ? 0.5 + Math.sin(v.wob * 14) * 0.5 : state === 'fire' ? 1 : 0.2;
  // szemhéj-gyűrű
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 0.42, look, 0, TAU);
  ctx.fill();
  // írisz
  const iris = radial3(ctx, ex, ey, 1, ex, ey, r * 0.34, 0.4, '#ffffff', `rgba(255,140,240,${0.5 + glow * 0.5})`, darken(v.col, 0.1));
  ctx.fillStyle = v.flash ? '#fff' : iris;
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.32, 0, TAU);
  ctx.fill();
  // pupilla
  ctx.fillStyle = '#1a0820';
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.14, 0, TAU);
  ctx.fill();
  if (glow > 0.3) {
    ctx.fillStyle = `rgba(255,200,250,${glow})`;
    ctx.shadowColor = '#ff6ae6';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.07, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
