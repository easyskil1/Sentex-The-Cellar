/**
 * 2D láthatósági poligon (Red Blob Games / „Sight & Light" szögseprés). Egy
 * fénypontból kiszámítja a látható területet a takaró szakaszok (kő-élek + a
 * szoba külső doboza) közt: minden él-végpontba sugarat lövünk (±ε, hogy a
 * sarkok mögötti falba is beleérjen), a sugár ELSŐ metszéspontjáig, majd a
 * pontokat szög szerint összekötve adódik a fény-poligon. A `LightingSystem`
 * erre a poligonra vágja a fáklyát → a kövek mögött valódi árnyék.
 *
 * Forrás: https://www.redblobgames.com/articles/visibility/
 */

/** Takaró szakasz (egy kő-él vagy a szoba-fal egy oldala). */
export interface Seg { ax: number; ay: number; bx: number; by: number; }

/** Újrahasznált szög-puffer (nincs képkockánkénti allokáció). */
const angleBuf: number[] = [];

/** Sugár–szakasz metszés: a sugár (o, irány d egységvektor) távolsága az első
 *  találatig a szakaszon, vagy -1 ha nincs. d-t egységvektornak feltételezzük → a
 *  visszaadott t a tényleges távolság. */
function raySeg(ox: number, oy: number, dx: number, dy: number, ax: number, ay: number, bx: number, by: number): number {
  const sx = bx - ax, sy = by - ay;
  const denom = sx * dy - dx * sy;
  if (denom > -1e-9 && denom < 1e-9) return -1; // párhuzamos
  const t1 = (sx * (ay - oy) - sy * (ax - ox)) / denom; // sugár-paraméter (= távolság)
  const t2 = (dx * (ay - oy) - dy * (ax - ox)) / denom; // szakasz-paraméter [0,1]
  if (t1 < 0 || t2 < 0 || t2 > 1) return -1;
  return t1;
}

/**
 * A (lx,ly) pontból látható terület poligonja. A csúcsokat a `out` lapos
 * tömbbe írja (x0,y0,x1,y1,… szög szerint rendezve) — a hívó újrahasználhatja.
 */
export function computeVisibility(lx: number, ly: number, segs: Seg[], out: number[]): number[] {
  out.length = 0;
  const n = segs.length;
  if (n === 0) return out;

  // 1) egyedi szögek az él-végpontokból, ±ε a sarkok mögé
  angleBuf.length = 0;
  for (let i = 0; i < n; i++) {
    const s = segs[i]!;
    const a1 = Math.atan2(s.ay - ly, s.ax - lx);
    const a2 = Math.atan2(s.by - ly, s.bx - lx);
    angleBuf.push(a1 - 1e-4, a1, a1 + 1e-4, a2 - 1e-4, a2, a2 + 1e-4);
  }
  angleBuf.sort((p, q) => p - q);

  // 2) minden szögre az első metszéspont
  for (let i = 0; i < angleBuf.length; i++) {
    const ang = angleBuf[i]!;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let closest = Infinity;
    for (let j = 0; j < n; j++) {
      const s = segs[j]!;
      const t = raySeg(lx, ly, dx, dy, s.ax, s.ay, s.bx, s.by);
      if (t >= 0 && t < closest) closest = t;
    }
    if (closest < Infinity && closest !== 0) out.push(lx + dx * closest, ly + dy * closest);
  }
  return out;
}
