import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Kristály-csoport: több, fölfelé álló, sokszögletű kristályhasáb áttetsző
 *  ragyogással, lüktető belső fénnyel és lágy fény-udvarral. (Animált: `t`.) */
export function drawCrystals(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number, t = 0): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const baseY = cy + rad * 0.5;
  const hueSeed = hash2(col * 13 + 1, row * 7 + 3);
  // két paletta: cián vagy ametiszt
  const amethyst = hueSeed > 0.5;
  const core = amethyst ? '#c77dff' : '#6ee7ff';
  const body = amethyst ? '#7b3fd1' : '#2f9fd0';
  const deep = amethyst ? '#3d1a78' : '#15506e';
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + hueSeed * 6);

  groundShadow(ctx, cx, baseY + rad * 0.08, rad * 0.7, rad * 0.18, 0.22);

  // fény-udvar
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.1);
  const a = 0.12 + 0.12 * pulse;
  halo.addColorStop(0, amethyst ? `rgba(200,130,255,${a})` : `rgba(120,230,255,${a})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 1.1, 0, TAU);
  ctx.fill();

  const shards = [
    { x: -0.36, h: 0.7, w: 0.16, tilt: -0.2 },
    { x: 0.32, h: 0.62, w: 0.15, tilt: 0.22 },
    { x: 0.02, h: 1.05, w: 0.2, tilt: -0.02 },
    { x: -0.12, h: 0.5, w: 0.12, tilt: -0.35 },
    { x: 0.2, h: 0.42, w: 0.11, tilt: 0.4 },
  ];
  // hátul álló kisebbek előbb
  const order = [3, 0, 1, 4, 2];
  for (const idx of order) {
    const s = shards[idx]!;
    const bx = cx + s.x * rad;
    const topY = baseY - s.h * rad;
    const hw = s.w * rad;
    const c = Math.cos(s.tilt), si = Math.sin(s.tilt);
    const apex = [s.tilt * rad * 0.3, -(baseY - topY)];
    // hasáb: két oldallap a középéllel
    const pL = [[-hw, 0], [-hw * 0.4, -(baseY - topY) * 0.78], apex];
    const pR = [[hw, 0], [hw * 0.4, -(baseY - topY) * 0.78], apex];
    const tx = (p: number[]) => bx + p[0]! * c - p[1]! * si;
    const ty = (p: number[]) => baseY + p[0]! * si + p[1]! * c;
    // bal lap (sötét)
    ctx.beginPath();
    ctx.moveTo(tx([-hw, 0]), ty([-hw, 0]));
    pL.slice(1).forEach((p) => ctx.lineTo(tx(p), ty(p)));
    ctx.lineTo(bx, baseY);
    ctx.closePath();
    ctx.fillStyle = deep;
    ctx.fill();
    // jobb lap (világos test)
    ctx.beginPath();
    ctx.moveTo(tx([hw, 0]), ty([hw, 0]));
    pR.slice(1).forEach((p) => ctx.lineTo(tx(p), ty(p)));
    ctx.lineTo(bx, baseY);
    ctx.closePath();
    const fg = ctx.createLinearGradient(bx, topY, bx, baseY);
    fg.addColorStop(0, core);
    fg.addColorStop(0.5, body);
    fg.addColorStop(1, deep);
    ctx.fillStyle = fg;
    ctx.fill();
    // kontúr
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.3 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx([-hw, 0]), ty([-hw, 0]));
    ctx.lineTo(tx(apex), ty(apex));
    ctx.lineTo(tx([hw, 0]), ty([hw, 0]));
    ctx.stroke();
    // belső középél-ragyogás
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tx(apex), ty(apex));
    ctx.lineTo(bx, baseY - 2);
    ctx.stroke();
    // csúcs-csillám
    ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * pulse})`;
    ctx.beginPath();
    ctx.arc(tx(apex), ty(apex), 1.6 + pulse, 0, TAU);
    ctx.fill();
  }
}
