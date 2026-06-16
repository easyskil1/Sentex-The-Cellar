import type { Rect } from '../../types';
import type { Theme } from '../theme';
import { shade, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Pala-szikla: élesen szögletes, egymásra torlódott kőlapok hideg tónusban,
 *  éles felső él-csúcsfényekkel. Geometrikus ellenpontja a gömbölyű köveknek. */
export function drawSlateRock(ctx: CanvasRenderingContext2D, cell: Rect, th: Theme, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;
  // hidegre tolt kőszín (kékes pala)
  const cool = shade(th.rock, -0.12);
  const f1 = shade(cool, 0.18);
  const f2 = cool;
  const f3 = shade(cool, -0.22);
  const f4 = shade(cool, -0.4);
  const edge = shade(cool, 0.45);

  groundShadow(ctx, cx, cy + rad * 0.58, rad * 0.92, rad * 0.34);

  // több, enyhén elforgatott szögletes lap egymásra torlódva
  const slabs: Array<{ pts: number[][]; fill: string }> = [];
  const layout = [
    { ox: -0.34, oy: 0.28, w: 0.62, h: 0.5, tilt: -0.16, fill: f3 },
    { ox: 0.32, oy: 0.32, w: 0.58, h: 0.44, tilt: 0.18, fill: f2 },
    { ox: -0.06, oy: -0.02, w: 0.7, h: 0.62, tilt: -0.05, fill: f1 },
    { ox: 0.18, oy: -0.3, w: 0.42, h: 0.5, tilt: 0.26, fill: f2 },
    { ox: -0.26, oy: -0.18, w: 0.34, h: 0.42, tilt: -0.3, fill: f4 },
  ];
  for (let i = 0; i < layout.length; i++) {
    const s = layout[i]!;
    const jx = (hash2(col * 5 + i, row + i) - 0.5) * rad * 0.1;
    const bx = cx + s.ox * rad + jx;
    const by = cy + s.oy * rad;
    const hw = s.w * rad * 0.5;
    const hh = s.h * rad * 0.5;
    const c = Math.cos(s.tilt), si = Math.sin(s.tilt);
    // szögletes ék-lap (felül csúcsos)
    const local = [[-hw, hh], [hw, hh * 0.8], [hw * 0.6, -hh], [-hw * 0.2, -hh * 1.05], [-hw, -hh * 0.3]];
    const pts = local.map(([lx, ly]) => [bx + lx! * c - ly! * si, by + lx! * si + ly! * c]);
    slabs.push({ pts, fill: s.fill });
  }

  for (const sl of slabs) {
    ctx.beginPath();
    sl.pts.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px!, py!); else ctx.lineTo(px!, py!); });
    ctx.closePath();
    ctx.fillStyle = sl.fill;
    ctx.fill();
    ctx.strokeStyle = shade(th.rock, -0.5);
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // felső él-csúcsfény (a két legfelső pont közötti él)
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sl.pts[3]![0]!, sl.pts[3]![1]!);
    ctx.lineTo(sl.pts[2]![0]!, sl.pts[2]![1]!);
    ctx.stroke();
    // rétegvonalak a lapon (pala-erezet)
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    const a = sl.pts[0]!, b = sl.pts[4]!;
    for (let k = 1; k <= 2; k++) {
      const t = k / 3;
      ctx.beginPath();
      ctx.moveTo(a[0]! + (sl.pts[1]![0]! - a[0]!) * t, a[1]! + (sl.pts[1]![1]! - a[1]!) * t);
      ctx.lineTo(b[0]! + (sl.pts[2]![0]! - b[0]!) * t, b[1]! + (sl.pts[2]![1]! - b[1]!) * t);
      ctx.stroke();
    }
  }
}
