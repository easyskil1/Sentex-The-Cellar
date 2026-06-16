import type { Rect } from '../../types';
import { hash2 } from '../../../engine/math';
import { groundShadow, drawConiferTier } from './helpers';

/** Fenyő: egymásra rétegzett, tűlevelű háromszög-emeletek hegyes csúccsal,
 *  keskeny barna törzzsel és finom tűlevél-textúrával. */
export function drawPine(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const seed = hash2(col * 11 + 2, row * 13 + 7);
  const topY = cy - rad * 0.92;
  const botY = cy + rad * 0.7;

  groundShadow(ctx, cx + rad * 0.08, cy + rad * 0.78, rad * 0.7, rad * 0.26);

  // törzs
  const trunkW = rad * 0.12;
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(cx - trunkW, cy + rad * 0.4, trunkW * 2, rad * 0.34);
  ctx.fillStyle = 'rgba(110,70,40,0.6)';
  ctx.fillRect(cx - trunkW * 0.3, cy + rad * 0.4, trunkW * 0.5, rad * 0.34);

  // 4 tűlevél-emelet alulról fölfelé, csökkenő szélességgel
  const tiers = 4;
  const dark = '#15401d';
  const mid = '#256b30';
  const lite = '#3f9447';
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1);
    const tierTop = botY + (topY - botY) * (f * 0.78 + 0.06);
    const tierBot = botY + (topY - botY) * (f * 0.78 - 0.16);
    const halfW = rad * (0.86 - f * 0.62);
    const wob = (hash2(col + t, row * 2 + t) - 0.5) * rad * 0.05;
    // árnyékos alap
    ctx.fillStyle = dark;
    drawConiferTier(ctx, cx + wob, tierTop, tierBot + rad * 0.04, halfW * 1.04);
    // fő réteg
    ctx.fillStyle = mid;
    drawConiferTier(ctx, cx + wob, tierTop, tierBot, halfW);
    // bal-felső fény
    ctx.fillStyle = lite;
    ctx.save();
    ctx.beginPath();
    drawConiferTier(ctx, cx + wob, tierTop, tierBot, halfW, true);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx + wob, tierTop);
    ctx.lineTo(cx + wob - halfW, tierBot);
    ctx.lineTo(cx + wob - halfW * 0.2, tierBot);
    ctx.lineTo(cx + wob, tierTop + (tierBot - tierTop) * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // tűlevél-textúra (rövid ferde vonalak a perem mentén)
    ctx.strokeStyle = 'rgba(20,50,24,0.45)';
    ctx.lineWidth = 1;
    for (let n = 0; n < 6; n++) {
      const tt = n / 5;
      const ex = cx + wob - halfW + 2 * halfW * tt;
      const ey = tierBot - 1;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + (tt < 0.5 ? -3 : 3), ey + 4);
      ctx.stroke();
    }
  }
  void seed;
}
