// A statikus szoba-rétegek (padló + pocsolyák, valamint a maradandó vérfoltok)
// off-screen gyorsítótára. A padló/folt a szobán belül nem változik képkockánként,
// ezért egyszer egy rejtett canvasra sütjük, majd frame-enként csak egyetlen
// `drawImage`. Ez a render forró útjának fő tétele volt (~280 csempe/frame).
// A két réteg külön kulcson sül újra; a World a szoba/labirintus-váltáskor
// `invalidate()`-tel kényszeríti az újrasütést (a méret eltérhet).
import { drawFloorTiles, drawPuddles, drawSplats } from './floorRender';
import type { Rect } from '../types';
import type { Room } from './Room';
import type { Theme } from './theme';

type Blocked = (x: number, y: number) => boolean;

export class FloorCache {
  private floor: HTMLCanvasElement | null = null;
  private floorKey = '';
  private splat: HTMLCanvasElement | null = null;
  private splatKey = '';

  /** A szoba/labirintus mérete eltérhet → a következő rajzolás újrasüti a padlót. */
  invalidate(): void {
    this.floor = null;
  }

  /**
   * A statikus padló-réteget (padló + pocsolyák) gyorsítótárból teszi ki: ha a
   * szoba/méret/téma kulcs változott, egyszer újrasüti egy off-screen canvasra,
   * majd frame-enként csak egyetlen `drawImage`.
   */
  drawFloor(ctx: CanvasRenderingContext2D, rc: Rect, room: Room, theme: Theme, dpr: number, isBlocked: Blocked): void {
    const key = `${room.gx},${room.gy}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${theme.floor}|${dpr}`;
    if (key !== this.floorKey || !this.floor) {
      this.floor = bake(this.floor, rc, dpr, (cctx) => {
        drawFloorTiles(cctx, rc, theme);
        drawPuddles(cctx, rc, room, isBlocked);
      });
      this.floorKey = key;
    }
    if (this.floor) ctx.drawImage(this.floor, rc.x, rc.y, rc.w, rc.h);
  }

  /**
   * Maradandó vérfoltok — a padló-réteghez hasonló GYORSÍTÓTÁRBÓL. A `drawSplats`
   * determinisztikus (a folt pozíciójából hash-elt), így elég egyszer egy
   * off-screen rétegre bélyegezni, és frame-enként csak egy `drawImage`.
   */
  drawSplats(ctx: CanvasRenderingContext2D, rc: Rect, room: Room, dpr: number): void {
    if (room.splats.length === 0) return; // nincs folt → nincs réteg
    // Az utolsó folt pozíciója is a kulcsban: a plafonon (shift+push) a length
    // állandó marad, így enélkül az új folt nem frissítené a gyorsítótárat.
    const last = room.splats[room.splats.length - 1]!;
    const key = `${room.gx},${room.gy}|${room.splats.length}|${Math.round(last.x)},${Math.round(last.y)}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${dpr}`;
    if (key !== this.splatKey || !this.splat) {
      this.splat = bake(this.splat, rc, dpr, (cctx) => drawSplats(cctx, room));
      this.splatKey = key;
    }
    if (this.splat) ctx.drawImage(this.splat, rc.x, rc.y, rc.w, rc.h);
  }
}

/**
 * Egy szoba-méretű off-screen réteg (újra)sütése: a meglévő canvast eszköz-pixel
 * élességűre méretezi, a világ-koordinátákat a (0,0)-ra tolja (a rajzolók abszolút
 * koordinátával dolgoznak), törli, majd lefuttatja a rajzoló callbacket.
 */
function bake(
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
