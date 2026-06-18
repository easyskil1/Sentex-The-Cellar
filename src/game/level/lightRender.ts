/**
 * Finom additív fény-réteg (Canvas 2D, NINCS WebGL). A lövedékek/könnyek/bombák
 * lágy, lüktető fénykört vetnek — a látótáv-sötétség (drawFog) VÁLTOZATLAN marad,
 * a pálya alap-fényereje sem változik. Szín szerint gyorsítótárazott lágy
 * korong-bélyegző, `lighter` (additív) módban kitéve: a forró úton csak
 * `drawImage` fut, nincs képkockánkénti gradiens-allokáció (GC-barát).
 */
const glowStamps = new Map<string, HTMLCanvasElement>();

function glowStamp(color: string): HTMLCanvasElement {
  let s = glowStamps.get(color);
  if (!s) { s = makeGlow(color); glowStamps.set(color, s); }
  return s;
}

/** Lágy korong-bélyegző: tömör szín + radiális alfa-maszk (bármilyen színformátum). */
function makeGlow(color: string): HTMLCanvasElement {
  const S = 64;
  const r = S / 2;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = color;
  c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  return cv;
}

/** Egy lágy fénykör. A hívó előbb állítsa be az additív módot (lásd {@link withGlow}). */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.drawImage(glowStamp(color), x - r, y - r, r * 2, r * 2);
}

/** Additív fény-batch: `lighter` mód be → rajzol → vissza (a globalAlpha-t is visszaállítja). */
export function withGlow(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  draw();
  ctx.restore();
}
