import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  WORM — gilista: a föld alatt (buried) csak feltüremlő földpúp + repedés
 *  látszik; felszínen szegmentált, kibukkanó test fogas szájjal.
 * ===================================================================== */
export function drawWorm(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.36);
  const look = v.face;

  // --- FÖLD ALATT: csak egy mozgó földpúp + repedés a haladás irányába ---
  if (v.buried) {
    ctx.save();
    ctx.translate(v.x, v.y);
    // földpúp
    const mound = ctx.createRadialGradient(0, -r * 0.1, r * 0.2, 0, 0, r * 1.1);
    mound.addColorStop(0, '#6b4a30');
    mound.addColorStop(1, 'rgba(58,38,22,0)');
    ctx.fillStyle = mound;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.6, 0, 0, TAU);
    ctx.fill();
    // repedés-vonalak
    ctx.strokeStyle = 'rgba(30,18,8,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const o of [-0.5, 0, 0.5]) {
      const a = look + o;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * (0.9 + Math.sin(v.wob * 3 + o * 4) * 0.15), Math.sin(a) * r * 0.5);
      ctx.stroke();
    }
    // kibökkenő apró földrögök
    ctx.fillStyle = '#5a3a24';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + v.wob;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.35, r * 0.08, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  shadow(ctx, v, 0.9, 0.85);

  // frissen felbukkant: kidobott föld-törmelék gyűrűje
  if (v.active) {
    ctx.fillStyle = 'rgba(90,58,36,0.6)';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const rr = r * (1.1 + Math.sin(v.wob * 5 + i) * 0.2);
      ctx.beginPath();
      ctx.arc(v.x + Math.cos(a) * rr, v.y + r * 0.6 + Math.sin(a) * rr * 0.3, r * 0.1, 0, TAU);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(look + Math.PI / 2); // a fej (+y) a játékos felé hajlik
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // kibukkanó, ívben hajló test (alulról jön elő → lentebbi szegmensek kisebbek)
  const segs = 5;
  for (let i = segs; i >= 0; i--) {
    const t = i / segs;
    const sy = -r * 0.7 + t * r * 1.5; // fej fent, farok lent
    const sway = Math.sin(v.wob * 2 + t * 3) * r * 0.18 * t;
    const sr = r * (0.78 - t * 0.32);
    const seg = ctx.createRadialGradient(sway - sr * 0.3, sy - sr * 0.3, sr * 0.2, sway, sy, sr);
    seg.addColorStop(0, light);
    seg.addColorStop(0.6, body);
    seg.addColorStop(1, darken(v.col, 0.35));
    ctx.fillStyle = v.flash ? '#fff' : seg;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sway, sy, sr, sr * 0.92, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // szelvény-gyűrű
    if (i > 0) {
      ctx.strokeStyle = darken(v.col, 0.3);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(sway, sy - sr * 0.5, sr * 0.8, sr * 0.18, 0, 0, Math.PI);
      ctx.stroke();
    }
  }

  // fej-vég: kör alakú, fogas száj (lamprey-pofa)
  const hy = -r * 0.7;
  ctx.fillStyle = '#3a1c10';
  ctx.beginPath();
  ctx.arc(0, hy, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // koncentrikus fogsorok
  ctx.fillStyle = '#fff4e8';
  for (const ring of [0.38, 0.24]) {
    const n = ring > 0.3 ? 10 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (ring > 0.3 ? 0 : 0.3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * ring, hy + Math.sin(a) * r * ring);
      ctx.lineTo(Math.cos(a + 0.12) * r * (ring - 0.1), hy + Math.sin(a + 0.12) * r * (ring - 0.1));
      ctx.lineTo(Math.cos(a - 0.12) * r * (ring - 0.1), hy + Math.sin(a - 0.12) * r * (ring - 0.1));
      ctx.closePath();
      ctx.fill();
    }
  }
  // sötét torok-közép
  ctx.fillStyle = '#160a06';
  ctx.beginPath();
  ctx.arc(0, hy, r * 0.12, 0, TAU);
  ctx.fill();

  ctx.restore();
}
