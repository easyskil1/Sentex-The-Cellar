import { TAU } from '../../../../engine/math';
import type { EnemyVisual } from './types';

/* Megosztott rajz-segédek (szín-árnyalás, talaj-árnyék, izzás, aura, szarvak). */

/* ----------------------------------------------------------------- *
 *  Szín-segédek: a típus-színből világosabb/sötétebb árnyalat
 *
 *  FORRÓ ÚT: a renderek képkockánként, ellenfelenként 3-5× hívják ezeket
 *  fix színekkel/faktorokkal — ezért MEMOIZÁLT. Cache nélkül minden hívás egy
 *  `parseInt`×3 + tömb + `rgb(...)` stringet allokálna (GC-nyomás), holott a
 *  (hex, f) bemenet véges és ismétlődő. A cache így pixel-azonos, csak nem szemetel.
 * ----------------------------------------------------------------- */
const parseCache = new Map<string, [number, number, number]>();
const lightenCache = new Map<string, string>();
const darkenCache = new Map<string, string>();

/** A visszaadott tömb a cache-é — CSAK olvasásra (a hívók azonnal destrukturálják). */
export function parse(hex: string): [number, number, number] {
  let rgb = parseCache.get(hex);
  if (!rgb) {
    const h = hex.replace('#', '');
    rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    parseCache.set(hex, rgb);
  }
  return rgb;
}

export function lighten(hex: string, f: number): string {
  const key = hex + ';' + f;
  let s = lightenCache.get(key);
  if (s === undefined) {
    const [r, g, b] = parse(hex);
    s = `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
    lightenCache.set(key, s);
  }
  return s;
}

export function darken(hex: string, f: number): string {
  const key = hex + ';' + f;
  let s = darkenCache.get(key);
  if (s === undefined) {
    const [r, g, b] = parse(hex);
    s = `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
    darkenCache.set(key, s);
  }
  return s;
}

/* ----------------------------------------------------------------- *
 *  Gradiens-cache (FORRÓ ÚT)
 *
 *  A renderek a `translate(v.x, v.y)` UTÁN, LOKÁLIS koordinátán hozzák létre a
 *  body-gradienst — a geometria csak `r`-től, a stopok a (cache-elt) színektől
 *  függenek. Cache nélkül minden ellenfél képkockánként egy CanvasGradient + 2-3
 *  colorStop objektumot allokál (GC-szemét). A `(geometria|színek)` kulcs szerint
 *  memoizálva ugyanaz az ellenfél képkockáról képkockára újrahasználja, és a
 *  szomszédos azonos típusúak is osztoznak. A gradiens-objektum kontextus-függő,
 *  ezért ctx-váltáskor (ritka) ürítünk. A koordináták egészre kerekülnek a kulcsban:
 *  ez korlátozza a cache-t; egy adott ellenfél `r`-je állandó → frame-azonos rajz.
 * ----------------------------------------------------------------- */
const gradCache = new Map<string, CanvasGradient>();
let gradCtx: CanvasRenderingContext2D | null = null;

function evict(): void {
  if (gradCache.size > 600) gradCache.delete(gradCache.keys().next().value!);
}

/** Memoizált 2-stop radiális gradiens (lokális koordináta, translate UTÁN). */
export function radial2(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, r0: number, x1: number, y1: number, r1: number,
  c0: string, c1: string,
): CanvasGradient {
  if (ctx !== gradCtx) { gradCache.clear(); gradCtx = ctx; }
  const key = `R2|${x0 | 0},${y0 | 0},${r0 | 0},${x1 | 0},${y1 | 0},${r1 | 0}|${c0}|${c1}`;
  let g = gradCache.get(key);
  if (g === undefined) {
    g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    gradCache.set(key, g);
    evict();
  }
  return g;
}

/** Memoizált 3-stop radiális gradiens (lokális koordináta, translate UTÁN). */
export function radial3(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, r0: number, x1: number, y1: number, r1: number,
  o1: number, c0: string, c1: string, c2: string,
): CanvasGradient {
  if (ctx !== gradCtx) { gradCache.clear(); gradCtx = ctx; }
  const key = `R3|${x0 | 0},${y0 | 0},${r0 | 0},${x1 | 0},${y1 | 0},${r1 | 0}|${o1}|${c0}|${c1}|${c2}`;
  let g = gradCache.get(key);
  if (g === undefined) {
    g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    g.addColorStop(0, c0);
    g.addColorStop(o1, c1);
    g.addColorStop(1, c2);
    gradCache.set(key, g);
    evict();
  }
  return g;
}

/** Memoizált 4-stop radiális gradiens (lokális koordináta, translate UTÁN). */
export function radial4(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, r0: number, x1: number, y1: number, r1: number,
  o1: number, o2: number, c0: string, c1: string, c2: string, c3: string,
): CanvasGradient {
  if (ctx !== gradCtx) { gradCache.clear(); gradCtx = ctx; }
  const key = `R4|${x0 | 0},${y0 | 0},${r0 | 0},${x1 | 0},${y1 | 0},${r1 | 0}|${o1},${o2}|${c0}|${c1}|${c2}|${c3}`;
  let g = gradCache.get(key);
  if (g === undefined) {
    g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    g.addColorStop(0, c0);
    g.addColorStop(o1, c1);
    g.addColorStop(o2, c2);
    g.addColorStop(1, c3);
    gradCache.set(key, g);
    evict();
  }
  return g;
}

/** Memoizált 2-stop lineáris gradiens (lokális koordináta, translate UTÁN). */
export function linear2(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  c0: string, c1: string,
): CanvasGradient {
  if (ctx !== gradCtx) { gradCache.clear(); gradCtx = ctx; }
  const key = `L2|${x0 | 0},${y0 | 0},${x1 | 0},${y1 | 0}|${c0}|${c1}`;
  let g = gradCache.get(key);
  if (g === undefined) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    gradCache.set(key, g);
    evict();
  }
  return g;
}

/** Memoizált 3-stop lineáris gradiens (lokális koordináta, translate UTÁN). */
export function linear3(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  o1: number, c0: string, c1: string, c2: string,
): CanvasGradient {
  if (ctx !== gradCtx) { gradCache.clear(); gradCtx = ctx; }
  const key = `L3|${x0 | 0},${y0 | 0},${x1 | 0},${y1 | 0}|${o1}|${c0}|${c1}|${c2}`;
  let g = gradCache.get(key);
  if (g === undefined) {
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0);
    g.addColorStop(o1, c1);
    g.addColorStop(1, c2);
    gradCache.set(key, g);
    evict();
  }
  return g;
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
