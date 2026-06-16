import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow } from './helpers';

/* ===================================================================== *
 *  SPIDER — pók (nagy és fióka egyaránt): tojás-potroh, fejtor, 8 ízelt láb,
 *  szemcsoport. A „harapós" fióka (más szín) az `active` jelzőtől pírt kap.
 * ===================================================================== */
export function drawSpider(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const body = v.flash ? '#fff' : v.col;
  const dark = v.flash ? '#000' : v.col2;
  const light = v.flash ? '#fff' : lighten(v.col, 0.32);
  const legPhase = v.wob * 6;

  shadow(ctx, v, 1.05, 0.5);

  // harapós fióka: vészjósló pír
  if (v.active) {
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(v.wob * 6) * 0.14;
    ctx.fillStyle = '#ff5a3a';
    ctx.shadowColor = '#ff3a1e';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(v.x, v.y, r * 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.face); // a fejtor a haladás irányába néz (+x)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 8 ízelt láb (4 oldalanként), térdnél hajlítva, járás-animációval
  const feet = [[1.45, 1.15], [0.6, 1.6], [-0.25, 1.6], [-1.05, 1.25]];
  const bases = [[0.5, 0.28], [0.22, 0.3], [-0.08, 0.3], [-0.35, 0.28]];
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bob = Math.sin(legPhase + i * 1.1 + (sgn > 0 ? 0 : 0.55));
      const bx = bases[i]![0] * r, by = sgn * bases[i]![1] * r;
      const fx = feet[i]![0] * r, fy = sgn * (feet[i]![1] * r) + bob * r * 0.12;
      const mx = (bx + fx) / 2, my = (by + fy) / 2;
      const kx = mx, ky = my + sgn * r * 0.4 - Math.abs(bob) * r * 0.16; // kiemelt térd
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(kx, ky, fx, fy);
      ctx.stroke();
    }
  }

  // potroh (nagy tojás, hátul)
  const g = ctx.createRadialGradient(-r * 0.45, -r * 0.2, r * 0.15, -r * 0.5, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.6, body);
  g.addColorStop(1, darken(v.col, 0.3));
  ctx.fillStyle = v.flash ? '#fff' : g;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.ellipse(-r * 0.5, 0, r * 0.92, r * 0.78, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // potroh-mintázat: világos kereszt (keresztespók)
  const cross = v.flash ? '#fff' : 'rgba(238,232,248,0.88)';
  ctx.strokeStyle = cross;
  ctx.lineWidth = Math.max(1.2, r * 0.13);
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, 0); ctx.lineTo(-r * 0.12, 0);                // hosszanti szár
  ctx.moveTo(-r * 0.52, -r * 0.46); ctx.lineTo(-r * 0.52, r * 0.46); // kereszt-szár
  ctx.stroke();
  // apró pöttyök a kereszt végein (jellegzetes minta)
  ctx.fillStyle = cross;
  for (const [dx, dy] of [[-0.95, 0], [-0.12, 0], [-0.52, -0.46], [-0.52, 0.46], [-0.52, 0]] as const) {
    ctx.beginPath();
    ctx.arc(dx * r, dy * r, Math.max(1, r * 0.08), 0, TAU);
    ctx.fill();
  }

  // fejtor (kisebb, elöl)
  const cg = ctx.createRadialGradient(r * 0.5, -r * 0.15, r * 0.1, r * 0.45, 0, r * 0.6);
  cg.addColorStop(0, light);
  cg.addColorStop(1, body);
  ctx.fillStyle = v.flash ? '#fff' : cg;
  ctx.strokeStyle = dark;
  ctx.beginPath();
  ctx.ellipse(r * 0.5, 0, r * 0.55, r * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // csáprágók elöl
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.9, sgn * r * 0.18);
    ctx.lineTo(r * 1.15, sgn * r * 0.28 + Math.sin(legPhase) * 1.5);
    ctx.stroke();
  }

  // szemcsoport (több apró szem a fejtor elején)
  ctx.fillStyle = v.flash ? '#000' : '#0c0710';
  const eyes = [[0.78, 0.16], [0.78, -0.16], [0.62, 0.28], [0.62, -0.28], [0.7, 0]];
  for (const [ex, ey] of eyes) {
    ctx.beginPath();
    ctx.arc(ex * r, ey * r, Math.max(0.8, r * 0.09), 0, TAU);
    ctx.fill();
  }
  // két fő szem csillanása
  ctx.fillStyle = v.active ? '#ffd0c0' : 'rgba(255,255,255,0.7)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.78, sgn * r * 0.16, Math.max(0.5, r * 0.04), 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
