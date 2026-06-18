/**
 * Labirintus-rajzoló. Egységes megjelenítés az admin-előnézethez ÉS (később) a
 * játékbeli kamera-követéses kirajzoláshoz. A `tile` a cella pixelmérete, az
 * (`ox`,`oy`) a bal-felső eltolás — így ugyanaz a kód rajzol kicsiben (előnézet)
 * és nagyban (játék, görgetve), SOSEM összenyomva (a tile mindig négyzetes).
 */
import { ROOM } from '../config';
import type { Rect } from '../types';
import type { Theme } from './theme';
import type { Labyrinth } from './labyrinth';

export interface LabDrawOpts {
  tile: number;
  ox: number;
  oy: number;
  theme: Theme;
  /** Rácsvonalak a padlón (előnézethez kikapcsolható). */
  grid?: boolean;
}

export function drawLabyrinth(ctx: CanvasRenderingContext2D, lab: Labyrinth, o: LabDrawOpts): void {
  const { tile: t, ox, oy, theme } = o;
  const wpx = lab.W * t;
  const hpx = lab.H * t;

  // háttér (padló-alap)
  ctx.fillStyle = theme.floor;
  ctx.fillRect(ox, oy, wpx, hpx);

  // padló-rácsvonalak (halvány)
  if (o.grid !== false) {
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= lab.W; x++) { ctx.moveTo(ox + x * t, oy); ctx.lineTo(ox + x * t, oy + hpx); }
    for (let y = 0; y <= lab.H; y++) { ctx.moveTo(ox, oy + y * t); ctx.lineTo(ox + wpx, oy + y * t); }
    ctx.stroke();
  }

  // falak — tömör kő-tile-ok, fent világos perem (kis 3D érzet)
  for (let y = 0; y < lab.H; y++) {
    for (let x = 0; x < lab.W; x++) {
      if (!lab.wall[y * lab.W + x]) continue;
      const px = ox + x * t;
      const py = oy + y * t;
      ctx.fillStyle = theme.wall;
      ctx.fillRect(px, py, t, t);
      // felső világos perem, ha fölötte nincs fal
      const above = y > 0 && lab.wall[(y - 1) * lab.W + x];
      if (!above) {
        ctx.fillStyle = theme.wallTop;
        ctx.fillRect(px, py, t, Math.max(1, t * 0.22));
      }
      // alsó él-árnyék
      ctx.fillStyle = theme.wallEdge;
      ctx.fillRect(px, py + t - Math.max(1, t * 0.16), t, Math.max(1, t * 0.16));
    }
  }

  // start (zöld) és exit (arany csapóajtó-jel)
  marker(ctx, ox, oy, t, lab.start.col, lab.start.row, '#3fd87a', 'S');
  marker(ctx, ox, oy, t, lab.exit.col, lab.exit.row, theme.accent, '▼');

  // ellenfél-helyek (pontok, jelleg szerint árnyalva)
  for (const s of lab.spawns) {
    const cx = ox + (s.col + 0.5) * t;
    const cy = oy + (s.row + 0.5) * t;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.5, t * 0.26), 0, Math.PI * 2);
    ctx.fillStyle = s.kind === 'deadend' ? '#ff5b5b' : s.kind === 'junction' ? '#ff9b4b' : theme.bossColor;
    ctx.fill();
  }
}

function marker(
  ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number,
  col: number, row: number, color: string, glyph: string,
): void {
  const px = ox + col * t;
  const py = oy + row * t;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(px + t * 0.12, py + t * 0.12, t * 0.76, t * 0.76);
  ctx.globalAlpha = 1;
  if (t >= 12) {
    ctx.fillStyle = '#10100a';
    ctx.font = `700 ${Math.round(t * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px + t * 0.5, py + t * 0.56);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}

// ---------------------------------------------------------------------------
// In-game labirintus-jelenet levél-rajzolói (a World `renderLabyrinth`-ja hívja).
// A kamera-orchesztrálás (clip, translate, entitások) a World-ben marad; ezek a
// maze-specifikus, állapotmentes darabok explicit paraméterekkel dolgoznak.
// ---------------------------------------------------------------------------

/** Fal-tile-ok a látható ablakra (felső világos perem / alsó él-árnyék). */
export function drawLabWalls(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  c0: number, c1: number, r0: number, r1: number,
  isWall: (col: number, row: number) => boolean,
): void {
  const TILE = ROOM.TILE;
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isWall(col, row)) continue;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = theme.wall;
      ctx.fillRect(x, y, TILE, TILE);
      if (!isWall(col, row - 1)) { // felső világos perem, ha fölötte folyosó
        ctx.fillStyle = theme.wallTop;
        ctx.fillRect(x, y, TILE, 6);
      }
      if (!isWall(col, row + 1)) { // alsó él-árnyék, ha alatta folyosó
        ctx.fillStyle = theme.wallEdge;
        ctx.fillRect(x, y + TILE - 5, TILE, 5);
      }
    }
  }
}

/** A kijárat (csapóajtó) — lüktető akcentus + ▼ jel. */
export function drawLabExit(ctx: CanvasRenderingContext2D, exitCol: number, exitRow: number, accent: string): void {
  const TILE = ROOM.TILE;
  const x = exitCol * TILE;
  const y = exitRow * TILE;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 250);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.35 * pulse;
  ctx.fillStyle = accent;
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#10100a';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▼', x + TILE / 2, y + TILE / 2 + 2);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** A pálya-keret (fal-szegély) a doboz körül — a normál pálya kinézete. */
export function drawLabFrame(ctx: CanvasRenderingContext2D, box: Rect, theme: Theme): void {
  const W = ROOM.WALL;
  ctx.fillStyle = theme.wall;
  ctx.fillRect(box.x - W, box.y - W, box.w + 2 * W, W);
  ctx.fillRect(box.x - W, box.y + box.h, box.w + 2 * W, W);
  ctx.fillRect(box.x - W, box.y, W, box.h);
  ctx.fillRect(box.x + box.w, box.y, W, box.h);
  ctx.fillStyle = theme.wallTop;
  ctx.fillRect(box.x - W, box.y - W, box.w + 2 * W, 5);
  ctx.strokeStyle = theme.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
}

/** Alsó tipp + „LABYRINTH COMPLETE" felvillanás. */
export function drawLabOverlay(ctx: CanvasRenderingContext2D, box: Rect, won: boolean): void {
  ctx.save();
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(243, 226, 191, 0.85)';
  ctx.textAlign = 'center';
  ctx.fillText('WASD: move · shoot · ESC: back · find the ▼ exit', box.x + box.w / 2, box.y + box.h + 22);
  ctx.textAlign = 'start';

  if (won) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    ctx.fillStyle = 'rgba(5, 4, 10, 0.6)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#3fd87a';
    ctx.font = '800 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LABYRINTH COMPLETE!', cx, cy - 8);
    ctx.textAlign = 'start';
  }
  ctx.restore();
}
