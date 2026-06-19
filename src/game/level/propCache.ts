// A STATIKUS pálya-tárgyak (kő, fa, láda, és a tereptár nem-animált fajtái)
// off-screen gyorsítótára. Korábban a `World.drawObstacles` minden követ/fát/díszt
// KÉPKOCKÁNKÉNT újrarajzolt, friss gradiensekkel + sok path-tal (~20-40 elem/szoba)
// — ez volt a render forró útjának egyik fő, fölösleges tétele. A padló-cache
// mintájára most egyszer egy rejtett canvasra sütjük, és frame-enként csak egyetlen
// `drawImage`. Az ANIMÁLT fajták (fáklya, tűz, kristály, fű, indák…) és a víz
// továbbra is élőben rajzolódnak (lásd `isAnimatedProp`).
import { drawRock, drawTree, drawCrate, drawTerrainObstacle } from './obstacleRender';
import { bake } from './bakeLayer';
import type { Rect, Obstacle, ObstacleKind } from '../types';
import type { Room } from './Room';
import type { Theme } from './theme';

/**
 * Az időfüggő (animált) tárgyfajták: ezeket a PropCache KIHAGYJA, a World élőben
 * rajzolja őket. A lista a `obstacles/index.ts` dispatcherrel egyezik (ahol a
 * rajzoló a `t` mp-paramétert ténylegesen használja), plusz a `luckrock` (lüktető
 * kristály) és a `water` (külön folyótestként rajzolva).
 */
const ANIMATED: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>([
  'water', 'luckrock', 'crystals', 'torch', 'brazier', 'cauldron', 'campfire',
  'grass', 'reeds', 'vines', 'candelabra', 'ritualcircle',
]);

/** Igaz, ha a tárgyat élőben kell rajzolni (animált / víz) — különben cache-elhető. */
export function isAnimatedProp(kind: ObstacleKind): boolean {
  return ANIMATED.has(kind);
}

type CellRect = (col: number, row: number) => Rect;

export class PropCache {
  private cv: HTMLCanvasElement | null = null;
  private key = '';

  /** Szoba/méretváltáskor a következő rajzolás újrasüti a tárgy-réteget. */
  invalidate(): void {
    this.cv = null;
  }

  /**
   * A statikus tárgy-réteget gyorsítótárból teszi ki. A kulcs tartalmazza a
   * statikus tárgyak aláírását (fajta+pozíció+HP), így ha egy láda törik vagy egy
   * követ szétrobbantanak (kikerül a tömbből), a réteg magától újrasül.
   */
  draw(ctx: CanvasRenderingContext2D, rc: Rect, room: Room, theme: Theme, dpr: number, cellRect: CellRect): void {
    const statics = room.obstacles.filter((o) => !ANIMATED.has(o.kind));
    let sig = '';
    for (const o of statics) sig += `${o.kind}${o.col},${o.row},${o.hp ?? ''};`;
    const key = `${room.gx},${room.gy}|${Math.round(rc.x)},${Math.round(rc.y)},${Math.round(rc.w)},${Math.round(rc.h)}|${theme.rock}|${dpr}|${sig}`;
    if (key !== this.key || !this.cv) {
      this.cv = bake(this.cv, rc, dpr, (cctx) => {
        for (const o of statics) paintOne(cctx, o, theme, cellRect);
      });
      this.key = key;
    }
    if (this.cv) ctx.drawImage(this.cv, rc.x, rc.y, rc.w, rc.h);
  }
}

/** Egy statikus tárgy rajzolása a megfelelő rajzolóval (a World élő hurokjával azonos elágazás). */
function paintOne(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, cellRect: CellRect): void {
  const r = cellRect(o.col, o.row);
  if (o.kind === 'rock') drawRock(ctx, r, theme, o.col, o.row);
  else if (o.kind === 'tree') drawTree(ctx, r, o.col, o.row);
  else if (o.kind === 'crate') drawCrate(ctx, r, o.hp);
  else drawTerrainObstacle(ctx, o.kind, r, theme, o.col, o.row, 0);
}
