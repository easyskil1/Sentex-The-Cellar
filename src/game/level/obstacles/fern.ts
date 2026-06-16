import type { Rect } from '../../types';
import { hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Páfrány: a tőből ívelten kihajló levélnyelek, mindkét oldalukon apró
 *  levélkékkel; rétegzett zöldek, friss erdei aljnövényzet. */
export function drawFern(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.6;

  groundShadow(ctx, cx, baseY + rad * 0.04, rad * 0.6, rad * 0.14, 0.2);

  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const f = i / (fronds - 1) - 0.5;
    const ang = -Math.PI / 2 + f * 1.5;
    const len = rad * (0.95 + 0.25 * hash2(col + i, row + i));
    const dark = i % 2 === 0;
    const stemCol = dark ? '#23561f' : '#2f6b27';
    const leafCol = dark ? '#357a2b' : '#4f9a38';
    // levélnyél (ívelt, a végén visszahajlik)
    const ex = cx + Math.cos(ang) * len;
    const ey = baseY + Math.sin(ang) * len * 0.92;
    const cxp = cx + Math.cos(ang) * len * 0.5 - Math.sin(ang) * rad * 0.18 * Math.sign(f || 1);
    const cyp = baseY + Math.sin(ang) * len * 0.5;
    ctx.strokeStyle = stemCol;
    ctx.lineWidth = Math.max(1.4, rad * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cxp, cyp, ex, ey);
    ctx.stroke();
    // levélkék a nyél mentén
    ctx.strokeStyle = leafCol;
    ctx.lineWidth = Math.max(1, rad * 0.03);
    const segs = 7;
    for (let s = 1; s <= segs; s++) {
      const tt = s / (segs + 1);
      // pont a kvadratikus görbén
      const px = (1 - tt) * (1 - tt) * cx + 2 * (1 - tt) * tt * cxp + tt * tt * ex;
      const py = (1 - tt) * (1 - tt) * baseY + 2 * (1 - tt) * tt * cyp + tt * tt * ey;
      const leafLen = rad * 0.16 * (1 - tt * 0.6);
      // érintő-merőleges irány
      const tx = 2 * (1 - tt) * (cxp - cx) + 2 * tt * (ex - cxp);
      const ty = 2 * (1 - tt) * (cyp - baseY) + 2 * tt * (ey - cyp);
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + nx * leafLen + (tx / tl) * leafLen * 0.4, py + ny * leafLen + (ty / tl) * leafLen * 0.4);
      ctx.moveTo(px, py);
      ctx.lineTo(px - nx * leafLen + (tx / tl) * leafLen * 0.4, py - ny * leafLen + (ty / tl) * leafLen * 0.4);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}
