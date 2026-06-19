// Közös segéd a statikus szoba-rétegek off-screen „kisütéséhez". A padló, a
// vérfoltok és a pálya-tárgyak (PropCache) mind ugyanazt a mintát követik: ami a
// szobán belül nem változik képkockánként, azt egyszer egy rejtett canvasra
// rajzoljuk, majd frame-enként csak egyetlen `drawImage`.
import type { Rect } from '../types';

/**
 * Egy szoba-méretű off-screen réteg (újra)sütése: a meglévő canvast eszköz-pixel
 * élességűre méretezi, a világ-koordinátákat a (0,0)-ra tolja (a rajzolók abszolút
 * koordinátával dolgoznak), törli, majd lefuttatja a rajzoló callbacket.
 */
export function bake(
  prev: HTMLCanvasElement | null,
  rc: Rect,
  dpr: number,
  paint: (cctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  const cw = Math.max(1, Math.round(rc.w * dpr));
  const ch = Math.max(1, Math.round(rc.h * dpr));
  const cv = prev ?? document.createElement('canvas');
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const cctx = cv.getContext('2d');
  if (!cctx) return prev;
  cctx.setTransform(dpr, 0, 0, dpr, -rc.x * dpr, -rc.y * dpr);
  cctx.clearRect(rc.x, rc.y, rc.w, rc.h);
  paint(cctx);
  return cv;
}
