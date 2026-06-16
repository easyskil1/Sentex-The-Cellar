/**
 * Labirintus-rajzoló. Egységes megjelenítés az admin-előnézethez ÉS (később) a
 * játékbeli kamera-követéses kirajzoláshoz. A `tile` a cella pixelmérete, az
 * (`ox`,`oy`) a bal-felső eltolás — így ugyanaz a kód rajzol kicsiben (előnézet)
 * és nagyban (játék, görgetve), SOSEM összenyomva (a tile mindig négyzetes).
 */
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
