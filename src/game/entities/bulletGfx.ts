// Lövedék-grafika segédek: (1) memoizált gradiensek, hogy a forró úton ne
// allokáljunk képkockánként új `CanvasGradient`-et (GC-barát, lásd az ellenfél-
// renderelő azonos mintáját), és (2) a stílus → glow-szín leképezés, amivel a
// lövedék-glow a már cache-elt, additív `drawProjectileGlow` rétegbe kerül (így a
// drága per-lövedék `shadowBlur` teljesen kiesik).
import type { BulletStyle } from '../types';

/* ---- Memoizált gradiens-cache (ctx-őrzött, egész-koordinátás kulcs) ---- */
const cache = new Map<string, CanvasGradient>();
let cacheCtx: CanvasRenderingContext2D | null = null;

function guard(ctx: CanvasRenderingContext2D): void {
  if (ctx !== cacheCtx) { cache.clear(); cacheCtx = ctx; }
}
function evict(): void {
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
}

/** Memoizált 3-stop lineáris gradiens (lokális koordináta, translate/rotate UTÁN). */
export function lin3(
  ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
  o1: number, c0: string, c1: string, c2: string,
): CanvasGradient {
  guard(ctx);
  const key = `L3|${x0 | 0},${y0 | 0},${x1 | 0},${y1 | 0}|${o1}|${c0}|${c1}|${c2}`;
  let g = cache.get(key);
  if (g === undefined) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(o1, c1); g.addColorStop(1, c2);
    cache.set(key, g); evict();
  }
  return g;
}

/** Memoizált 4-stop lineáris gradiens. */
export function lin4(
  ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
  o1: number, o2: number, c0: string, c1: string, c2: string, c3: string,
): CanvasGradient {
  guard(ctx);
  const key = `L4|${x0 | 0},${y0 | 0},${x1 | 0},${y1 | 0}|${o1},${o2}|${c0}|${c1}|${c2}|${c3}`;
  let g = cache.get(key);
  if (g === undefined) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(o1, c1); g.addColorStop(o2, c2); g.addColorStop(1, c3);
    cache.set(key, g); evict();
  }
  return g;
}

/**
 * Egy lövedék-stílus glow-(halo-)színe a `drawProjectileGlow` additív rétegéhez.
 * A korábbi per-lövedék `shadowColor` értékeket tükrözi. A `null` (csont/kő) sötét
 * volt → additív módban láthatatlan, ezért nem kérünk hozzá színes glow-t.
 */
export function glowColorOf(style: BulletStyle): string | null {
  switch (style) {
    case 'energy': return '#5fd0ff';
    case 'poison': return '#8fcf3a';
    case 'slime':  return '#7faf3a';
    case 'arcane': return '#b06aff';
    case 'sonic':  return '#cfe0ff';
    case 'fire':   return '#ff7a1e';
    case 'pellet': return '#caa24a';
    case 'heavy':  return '#ff5a2a';
    case 'gas':    return '#9fdf4a';
    case 'bone':   return null;
    case 'stone':  return null;
    case 'ember':  return '#ff5a30';
    default:       return '#ff8a5a';
  }
}
