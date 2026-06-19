// Szoba-keret rajzolók: falak, ajtók, csapóajtó és összefüggő víztest.
// Tiszta (állapotmentes) függvények - a World hívja a render forró útján,
// minden bemenet explicit paraméter. A gyorsítótárak (padló/folt/víz-elrendezés)
// a World-ben maradnak; ez a modul csak rajzol.
import { ROOM } from '../config';
import { TAU } from '../../engine/math';
import type { Rect, Dir } from '../types';
import type { Theme } from './theme';

/** A szoba négy fala (perem + felső él-csík). */
export function drawWalls(ctx: CanvasRenderingContext2D, rc: Rect, th: Theme): void {
  const W = ROOM.WALL;
  ctx.fillStyle = th.wall;
  ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, W);
  ctx.fillRect(rc.x - W, rc.y + rc.h, rc.w + W * 2, W);
  ctx.fillRect(rc.x - W, rc.y, W, rc.h);
  ctx.fillRect(rc.x + rc.w, rc.y, W, rc.h);
  ctx.strokeStyle = th.wallEdge;
  ctx.lineWidth = 4;
  ctx.strokeRect(rc.x - 2, rc.y - 2, rc.w + 4, rc.h + 4);
  ctx.fillStyle = th.wallTop;
  ctx.fillRect(rc.x - W, rc.y - W, rc.w + W * 2, 5);
}

/**
 * A szoba ajtói: a négy oldal közül azokra, ahol van szomszéd (`hasNeighbor`),
 * a `doorT` (0..1) felhúzottsággal animált rács-kapu kerül.
 */
export function drawDoors(
  ctx: CanvasRenderingContext2D,
  rc: Rect,
  cx: number,
  cy: number,
  doorT: number,
  th: Theme,
  hasNeighbor: (dir: Dir) => boolean,
): void {
  const doors: Array<[Dir, number, number, number]> = [
    ['N', cx, rc.y, 0],
    ['S', cx, rc.y + rc.h, Math.PI],
    ['W', rc.x, cy, -Math.PI / 2],
    ['E', rc.x + rc.w, cy, Math.PI / 2],
  ];
  for (const [dir, dx, dy, rot] of doors) {
    if (hasNeighbor(dir)) drawDoor(ctx, dx, dy, rot, doorT, th);
  }
}

/**
 * Ajtó kirajzolása. A `t` (0..1) a rács-kapu felhúzottsága: 0-nál a rács
 * teljesen zárja a nyílást, 1-nél felcsúszott a szemöldökkőbe (nyitva).
 * Köztes értékeknél a rács kifelé (a fal felé) csúszik fel, így animálódik.
 */
export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  t: number,
  th: Theme,
): void {
  const W = ROOM.WALL;
  const D = ROOM.DOOR;
  const e = t * t * (3 - 2 * t); // smoothstep easing
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // keret
  ctx.fillStyle = th.doorFrame;
  ctx.fillRect(-D, -W, D * 2, W * 2);
  // nyitott padló-átjáró (háttér; a rács felcsúszva ezt fedi fel)
  ctx.fillStyle = th.doorFloor;
  ctx.fillRect(-D + 6, -W, D * 2 - 12, W * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-D + 6, -4, D * 2 - 12, 8);

  if (e < 0.999) {
    // rács-kapu, a nyílásba vágva, kifelé (-y) felcsúszva e-vel arányosan
    ctx.save();
    ctx.beginPath();
    ctx.rect(-D + 6, -W, D * 2 - 12, W * 2);
    ctx.clip();
    ctx.translate(0, -W * 2 * e);
    ctx.fillStyle = th.doorBar;
    ctx.fillRect(-D + 6, -W + 4, D * 2 - 12, W * 2 - 8);
    ctx.strokeStyle = th.doorBarStroke;
    ctx.lineWidth = 4;
    for (let i = -D + 16; i < D; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, -W + 4);
      ctx.lineTo(i, W - 4);
      ctx.stroke();
    }
    // alsó zárógerenda, hogy a felcsúszás látványos legyen
    ctx.fillStyle = th.doorBarStroke;
    ctx.fillRect(-D + 6, W - 8, D * 2 - 12, 5);
    ctx.restore();
  }
  ctx.restore();
}

/** A következő szintre vezető csapóajtó (lila, lüktető örvény + nyíl). */
export function drawTrapdoor(
  ctx: CanvasRenderingContext2D,
  td: { x: number; y: number; bob: number },
): void {
  ctx.save();
  ctx.translate(td.x, td.y);
  ctx.fillStyle = '#0a0610';
  ctx.strokeStyle = '#3a2c20';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(160,120,255,${0.3 + 0.2 * Math.sin(td.bob)})`;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#cdaaff';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▼', 0, 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** A víz-cellák előre kiszámolt, gyorsítótárazható elrendezése (a World tárolja). */
export interface WaterLayout {
  set: Set<string>;
  rects: Array<{ o: { col: number; row: number }; r: Rect }>;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * A víz-cellákat EGY összefüggő folyótestként rajzolja: a cellák uniójára
 * vágva tölti ki a felületet (varratmentes), animált fénytörés-fodrokkal és
 * csillámokkal, majd a szabad széleken partvonalat húz. A `t` az animációs idő (mp).
 */
export function drawWaterBody(ctx: CanvasRenderingContext2D, layout: WaterLayout, t: number): void {
  const { set, rects, minX, minY, maxX, maxY } = layout;
  const has = (c: number, r: number): boolean => set.has(`${c},${r}`);
  const W = maxX - minX, H = maxY - minY;

  ctx.save();
  // vágás a víz-cellák uniójára → a folyó egységes felület lesz
  ctx.beginPath();
  for (const { r } of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  // mély-víz alapszín, finom függőleges mélységi árnyalással
  const bg = ctx.createLinearGradient(0, minY, 0, maxY);
  bg.addColorStop(0, '#34708f');
  bg.addColorStop(0.5, '#266079');
  bg.addColorStop(1, '#1b4a60');
  ctx.fillStyle = bg;
  ctx.fillRect(minX, minY, W, H);

  // mozgó fénytörés-fodrok (abszolút koordinátákból → cellák között folytonos)
  const wave = (y: number, amp: number, color: string, lw: number, ph: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = minX; x <= maxX; x += 9) {
      const yy = y + Math.sin(x * 0.045 + t * 1.1 + ph) * amp + Math.sin(x * 0.12 - t * 0.6 + ph) * amp * 0.4;
      if (x === minX) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  };
  for (let i = 0, y = minY + 12; y < maxY; y += 19, i++) {
    wave(y, 2.6, 'rgba(15,48,66,0.35)', 3, i * 0.8);          // árnyék-hullámvölgy
    wave(y - 3, 2.6, 'rgba(173,223,255,0.16)', 1.6, i * 0.8); // világos taraj
  }

  // csillámló napfény-foltok, lassan sodródva
  ctx.fillStyle = 'rgba(214,242,255,0.10)';
  for (let i = 0; i < 10; i++) {
    const gx = minX + (((i * 89.7) + t * 26) % (W + 40)) - 20;
    const gy = minY + ((i * 47.3) % H);
    ctx.beginPath();
    ctx.ellipse(gx, gy, 11, 2.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // ---- partvonal a szabad (víz nélküli szomszédú) éleken ----
  for (const { o, r } of rects) {
    const edge = (x1: number, y1: number, x2: number, y2: number, inset: number, nx: number, ny: number) => {
      // sötét partszél
      ctx.strokeStyle = 'rgba(10,28,40,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // vékony hab-vonal beljebb
      ctx.strokeStyle = 'rgba(200,236,255,0.28)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x1 + nx * inset, y1 + ny * inset);
      ctx.lineTo(x2 + nx * inset, y2 + ny * inset);
      ctx.stroke();
    };
    if (!has(o.col, o.row - 1)) edge(r.x, r.y, r.x + r.w, r.y, 3, 0, 1);
    if (!has(o.col, o.row + 1)) edge(r.x, r.y + r.h, r.x + r.w, r.y + r.h, 3, 0, -1);
    if (!has(o.col - 1, o.row)) edge(r.x, r.y, r.x, r.y + r.h, 3, 1, 0);
    if (!has(o.col + 1, o.row)) edge(r.x + r.w, r.y, r.x + r.w, r.y + r.h, 3, -1, 0);
  }
}
