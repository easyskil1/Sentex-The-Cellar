import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Száraz, leveles fa: göcsörtös törzs látható ágakkal, gyér őszi
 *  (okker/narancs/barna) lombbal, kikandikáló csupasz ágvégekkel és pár
 *  lehulló levéllel a tövénél. */
export function drawDryTree(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  const seed = hash2(col * 5 + 3, row * 9 + 2);
  const canopyCy = cy - rad * 0.36;

  groundShadow(ctx, cx + rad * 0.1, cy + rad * 0.74, rad * 0.84, rad * 0.3);

  // göcsörtös törzs + fő ágak (sötét vázrajz)
  const trunkBot = cy + rad * 0.66;
  const forkY = canopyCy + rad * 0.2;
  ctx.strokeStyle = '#3a2614';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // törzs
  ctx.lineWidth = rad * 0.26;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.04, trunkBot);
  ctx.quadraticCurveTo(cx + rad * 0.06, (trunkBot + forkY) / 2, cx, forkY);
  ctx.stroke();
  // ágak
  const limbs = [
    { a: -1.9, len: 0.62, w: 0.13 },
    { a: -1.15, len: 0.7, w: 0.12 },
    { a: -0.4, len: 0.55, w: 0.1 },
    { a: -2.55, len: 0.5, w: 0.1 },
  ];
  const tips: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < limbs.length; i++) {
    const l = limbs[i]!;
    const ex = cx + Math.cos(l.a) * rad * l.len;
    const ey = forkY + Math.sin(l.a) * rad * l.len;
    const mx = cx + Math.cos(l.a) * rad * l.len * 0.4 + (hash2(col + i, row + i) - 0.5) * rad * 0.12;
    const my = forkY + Math.sin(l.a) * rad * l.len * 0.4;
    ctx.lineWidth = rad * l.w;
    ctx.beginPath();
    ctx.moveTo(cx, forkY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    tips.push({ x: ex, y: ey });
    // csupasz gallyvégek
    ctx.lineWidth = Math.max(1, rad * 0.03);
    for (let k = 0; k < 2; k++) {
      const ta = l.a + (k ? 0.5 : -0.5);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(ta) * rad * 0.2, ey + Math.sin(ta) * rad * 0.2);
      ctx.stroke();
    }
  }
  // törzs világos oldala
  ctx.strokeStyle = 'rgba(120,82,46,0.55)';
  ctx.lineWidth = rad * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.06, trunkBot - 2);
  ctx.quadraticCurveTo(cx, (trunkBot + forkY) / 2, cx - rad * 0.03, forkY);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // gyér őszi lombcsomók az ágvégek körül
  const autumn = ['#7a3b14', '#a8631e', '#c98a2e', '#caa24a'];
  const clumps: Array<{ x: number; y: number; r: number; c: string }> = [];
  for (let i = 0; i < tips.length; i++) {
    const t = tips[i]!;
    const n = 2 + Math.floor(hash2(col + i, row * 2 + i) * 2);
    for (let j = 0; j < n; j++) {
      clumps.push({
        x: t.x + (hash2(col + i * 3 + j, row + j) - 0.5) * rad * 0.34,
        y: t.y + (hash2(col + j, row + i * 3 + j) - 0.5) * rad * 0.3 - rad * 0.04,
        r: rad * (0.2 + 0.12 * hash2(i + j, col + row + j)),
        c: autumn[(i + j) % autumn.length]!,
      });
    }
  }
  // sötét alap
  ctx.fillStyle = 'rgba(70,40,16,0.85)';
  for (const c of clumps) { ctx.beginPath(); ctx.arc(c.x, c.y + 1.5, c.r * 1.05, 0, TAU); ctx.fill(); }
  for (const c of clumps) { ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); }
  // levélpöttyök
  for (let i = 0; i < 14; i++) {
    const a = hash2(col * 7 + i, row * 3 + i) * TAU;
    const rr = Math.sqrt(hash2(i + 1, col + row + i)) * rad * 0.6;
    const px = cx + Math.cos(a) * rr;
    const py = canopyCy + Math.sin(a) * rr * 0.8;
    ctx.fillStyle = (i & 1) ? 'rgba(220,170,80,0.6)' : 'rgba(120,60,20,0.5)';
    ctx.beginPath(); ctx.arc(px, py, rad * 0.04, 0, TAU); ctx.fill();
  }
  // lehullott levelek a tövénél
  for (let i = 0; i < 4; i++) {
    const px = cx + (hash2(col + i * 2, row + i) - 0.5) * rad * 1.1;
    const py = cy + rad * (0.6 + 0.16 * hash2(col + i, row + i * 2));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hash2(i, col + row) * TAU);
    ctx.fillStyle = autumn[i % autumn.length]!;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.09, rad * 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  void seed;
}
