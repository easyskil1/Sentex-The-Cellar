import { TAU } from '../../../../engine/math';
import type { EnemyVisual } from './types';

/* Megosztott rajz-segédek (szín-árnyalás, talaj-árnyék, izzás, aura, szarvak). */

/* ----------------------------------------------------------------- *
 *  Szín-segédek: a típus-színből világosabb/sötétebb árnyalat
 * ----------------------------------------------------------------- */
export function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lighten(hex: string, f: number): string {
  const [r, g, b] = parse(hex);
  return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
}

export function darken(hex: string, f: number): string {
  const [r, g, b] = parse(hex);
  return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
}

/** Talaj-árnyék — minden típus ezt használja, méret-skálával. */
export function shadow(ctx: CanvasRenderingContext2D, v: EnemyVisual, scale = 0.9, lift = 0.7): void {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + v.r * lift, v.r * scale, v.r * 0.38, 0, 0, TAU);
  ctx.fill();
}

/** Izzó korong (neon pötty / torkolattűz / energiamag) — lágy fénykoszorúval. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rr: number, col: string, blur: number): void {
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = blur;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Lágy, kifelé halványuló energiamező-korong (lassító/húzó/gyógyító aura). `rgb` = "r,g,b". */
export function aura(ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number, rgb: string, a0: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
  g.addColorStop(0, `rgba(${rgb},${a0})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Két ívelt szarv a játékos irányába kifordítva. */
export function drawHorns(ctx: CanvasRenderingContext2D, v: EnemyVisual, dark: string, light: string): void {
  const { r } = v;
  const dirx = Math.cos(v.face);
  for (const sgn of [-1, 1]) {
    const baseX = sgn * r * 0.55;
    const baseY = -r * 0.5;
    const tipX = sgn * r * 0.95 + dirx * r * 0.35;
    const tipY = -r * 0.95;
    const grad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
    grad.addColorStop(0, v.flash ? '#fff' : light);
    grad.addColorStop(1, v.flash ? '#fff' : darken(v.col, 0.1));
    ctx.fillStyle = grad;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX - sgn * r * 0.12, baseY);
    ctx.quadraticCurveTo(sgn * r * 0.85, baseY - r * 0.5, tipX, tipY);
    ctx.quadraticCurveTo(sgn * r * 0.7, baseY - r * 0.2, baseX + sgn * r * 0.12, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
