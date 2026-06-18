import { TAU } from '../../engine/math';
import type { HubChoice } from '../World';
import {
  drawGate,
  drawDungeonGate,
  drawStoryPortal,
  drawBossPortal,
  drawPortalLock,
} from './gateRender';

/**
 * Hub-terem (mód-választó) levél-rajzolói — szabad függvények, állapot nélkül.
 * A jelenet-orchesztrálás (padló, falak, részecskék, játékos) a `World`
 * `renderHub`-jában marad; itt a glyph, a portálok és a címsor élnek.
 */

/** Egy portál: a mód szerinti rajzoló + zárt esetben lakat-fátyol. */
export function drawHubPortal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  accent: string,
  id: HubChoice,
  locked: boolean,
  t: number,
): void {
  const r = 30;
  switch (id) {
    case 'story':     drawStoryPortal(ctx, cx, cy, r, accent, t); break;
    case 'labyrinth': drawGate(ctx, cx, cy, r, accent, t); break;
    case 'dungeon':   drawDungeonGate(ctx, cx, cy, r, accent, t); break;
    case 'boss':      drawBossPortal(ctx, cx, cy, r, t); break;
  }
  if (locked) drawPortalLock(ctx, cx, cy, r);
}

/** Lüktető rúna-glyph a terem közepén (a játékos alatt). */
export function drawHubGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: string): void {
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
  const R = 48;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.45 + 0.3 * pulse;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.35 + 0.3 * pulse;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  ctx.restore();
}

/** A hub címsora a felső fal fölött. */
export function drawHubTitle(ctx: CanvasRenderingContext2D, centerX: number, topY: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#e8d8b0';
  ctx.font = '700 26px Cinzel, Georgia, serif';
  ctx.fillText('CHOOSE YOUR PATH', centerX, topY);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
