import type { Rect } from '../../types';
import { TAU, hash2 } from '../../../engine/math';
import { groundShadow } from './helpers';

/** Gomba-csokor: 3 különböző méretű, piros-fehér pöttyös kalapú gomba krémszín
 *  tönkkel, körül apró sarjakkal és kis mohával. */
export function drawMushrooms(ctx: CanvasRenderingContext2D, cell: Rect, col: number, row: number): void {
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h / 2;
  const rad = Math.min(cell.w, cell.h) * 0.5;

  groundShadow(ctx, cx, cy + rad * 0.62, rad * 0.66, rad * 0.2, 0.26);

  // talajmoha
  ctx.fillStyle = 'rgba(60,110,50,0.5)';
  for (let i = 0; i < 5; i++) {
    const px = cx + (hash2(col + i, row + i * 2) - 0.5) * rad * 1.0;
    const py = cy + rad * (0.46 + 0.12 * hash2(col + i * 2, row + i));
    ctx.beginPath(); ctx.arc(px, py, rad * 0.08, 0, TAU); ctx.fill();
  }

  const caps = [
    { x: cx + rad * 0.32, y: cy + rad * 0.3, s: 0.7 },
    { x: cx - rad * 0.34, y: cy + rad * 0.36, s: 0.56 },
    { x: cx + rad * 0.02, y: cy - rad * 0.06, s: 1.0 },
  ];
  for (let i = 0; i < caps.length; i++) {
    const m = caps[i]!;
    const ch = rad * 0.5 * m.s;
    const capR = rad * 0.42 * m.s;
    const stemW = capR * 0.5;
    const stemTop = m.y;
    const stemBot = m.y + ch;
    // tönk
    const sg = ctx.createLinearGradient(m.x - stemW, 0, m.x + stemW, 0);
    sg.addColorStop(0, '#d9cdb0');
    sg.addColorStop(0.5, '#f3ead2');
    sg.addColorStop(1, '#c9bb9a');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(m.x - stemW * 0.7, stemTop);
    ctx.quadraticCurveTo(m.x - stemW, (stemTop + stemBot) / 2, m.x - stemW * 0.5, stemBot);
    ctx.lineTo(m.x + stemW * 0.5, stemBot);
    ctx.quadraticCurveTo(m.x + stemW, (stemTop + stemBot) / 2, m.x + stemW * 0.7, stemTop);
    ctx.closePath();
    ctx.fill();
    // kalap-alsó (lemezes perem)
    ctx.fillStyle = '#e8d8b8';
    ctx.beginPath();
    ctx.ellipse(m.x, stemTop, capR * 0.92, capR * 0.3, 0, 0, TAU);
    ctx.fill();
    // kalap
    const cg = ctx.createLinearGradient(m.x, stemTop - capR, m.x, stemTop + capR * 0.2);
    cg.addColorStop(0, '#e8503a');
    cg.addColorStop(1, '#b3271a');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(m.x, stemTop, capR, capR * 0.85, 0, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    // fénylő él
    ctx.fillStyle = 'rgba(255,210,180,0.5)';
    ctx.beginPath();
    ctx.ellipse(m.x - capR * 0.3, stemTop - capR * 0.4, capR * 0.4, capR * 0.22, -0.5, 0, TAU);
    ctx.fill();
    // fehér pöttyök
    ctx.fillStyle = '#f6efe0';
    for (let d = 0; d < 4; d++) {
      const da = Math.PI + 0.4 + d * 0.55;
      const dr = capR * (0.3 + 0.4 * hash2(col + d + i, row + d));
      ctx.beginPath();
      ctx.arc(m.x + Math.cos(da) * dr, stemTop + Math.sin(da) * dr * 0.7, capR * (0.1 + 0.05 * hash2(d, i)), 0, TAU);
      ctx.fill();
    }
  }
}
