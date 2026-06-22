import { TAU } from '../../engine/math';

/* ===================================================================== *
 *  Cache-elt fénykoszorú-bélyegző - a `shadowBlur` KIVÁLTÁSÁRA.
 *
 *  A `shadowBlur` a 2D-canvas LEGDRÁGÁBB művelete (képkockánként, rajzonként
 *  újraszámolt blur, retinán/magas DPR-en sokszoros költség). Helyette egy
 *  szín szerint gyorsítótárazott, lágy korong-bélyegzőt `drawImage`-elünk -
 *  pixelben közeli, de nagyságrenddel olcsóbb. Semleges hely: az ellenfél-
 *  renderer (`enemies/renderers/helpers`) ÉS a UI/entitások (pl. bolt) is innen
 *  veszi (a helpers újraexportálja, így a meglévő renderer-importok változatlanok).
 * ===================================================================== */
const glowStamps = new Map<string, HTMLCanvasElement>();

function glowStamp(col: string): HTMLCanvasElement {
  let s = glowStamps.get(col);
  if (s) return s;
  const S = 64, r = S / 2;
  s = document.createElement('canvas');
  s.width = S; s.height = S;
  const c = s.getContext('2d')!;
  c.fillStyle = col;
  c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  glowStamps.set(col, s);
  return s;
}

/**
 * Csak a lágy fénykoszorú (mag nélkül) - tetszőleges alakzat MÖGÉ, a `shadowBlur`
 * kiváltására. A `rad` a koszorú sugara (kb. az alakzat mérete + a régi blur).
 */
export function softGlow(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string): void {
  ctx.drawImage(glowStamp(col), x - rad, y - rad, rad * 2, rad * 2);
}

/** Izzó korong (neon pötty / torkolattűz / energiamag) - lágy, cache-elt fénykoszorúval. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rr: number, col: string, blur: number): void {
  // lágy fénykoszorú a cache-elt bélyegzőből (a shadowBlur-t váltja ki)
  const R = rr + blur;
  ctx.drawImage(glowStamp(col), x - R, y - R, R * 2, R * 2);
  // tömör mag
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, TAU);
  ctx.fill();
}
