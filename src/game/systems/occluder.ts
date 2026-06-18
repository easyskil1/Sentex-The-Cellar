/**
 * Tömör akadályok TAKARÓ-SZILUETTJE az árnyékvetéshez.
 *
 * A fény-poligon (lásd visibility.ts) korábban minden tömör tárgyhoz a teljes
 * NÉGYZET-cellát kapta takaróként, ezért a kerek kő / fa / hordó mögött a fény
 * négyzet-élben vágódott el (csúnya „dobozos" árnyék, ami nem a belérajzolt
 * idomot követte). Itt minden fajtához egy a tényleges sziluetthez közelítő
 * nyolcszög-talp tartozik, így a vetett árnyék az idom formáját veszi fel.
 *
 * A talp a cella `min(szélesség, magasság)`-ának arányában méreteződik - a
 * tárgy-rajzolók is így méreteznek (`Math.min(cell.w, cell.h) * …`).
 *
 * TÁRGYANKÉNT KÜLÖN állítható: minden tömör fajtának SAJÁT bejegyzése van.
 * ÚJ tárgynál vegyél fel ide egy sort (különben a {@link DEFAULT} talpat kapja):
 *   rx = vízszintes fél-szélesség, ry = függőleges fél-magasság (a min-oldal
 *   arányában), cy = a talp függőleges eltolása lefelé (0 = cella-közép).
 */
import { TAU } from '../../engine/math';
import type { Seg } from './visibility';
import type { ObstacleKind } from '../types';

export interface Footprint {
  /** Vízszintes fél-szélesség a cella min-oldalának arányában. */
  rx: number;
  /** Függőleges fél-magasság a cella min-oldalának arányában. */
  ry: number;
  /** A talp-közép lefelé tolása a cella magasságának arányában (alacsony talpú,
   *  magas tárgyaknál - fa, szobor - a tövéhez igazít). */
  cy?: number;
}

/** Fallback ismeretlen/új fajtához (kerekded, közepes talp). */
const DEFAULT: Footprint = { rx: 0.46, ry: 0.44, cy: 0.04 };

/** A vetett sziluett oldalszáma (8 = nyolcszög: kerek, de olcsó). */
const SIDES = 8;

/**
 * Talp-formák FAJTÁNKÉNT. Csak a tömör (`solid`) tárgyak vetnek árnyékot, így
 * csak azoknak kell ide bejegyzés. Aki nincs itt, a {@link DEFAULT}-ot kapja.
 */
const FOOTPRINT: Partial<Record<ObstacleKind, Footprint>> = {
  // alap szilárd tárgyak
  rock:        { rx: 0.50, ry: 0.46 },
  tree:        { rx: 0.34, ry: 0.36, cy: 0.10 },
  crate:       { rx: 0.44, ry: 0.44 },
  luckrock:    { rx: 0.48, ry: 0.44 },
  // TEREPTÁR — tömör dísz
  boulder:     { rx: 0.50, ry: 0.46 },
  slate:       { rx: 0.48, ry: 0.44 },
  bush:        { rx: 0.44, ry: 0.40 },
  thornbush:   { rx: 0.44, ry: 0.40 },
  pine:        { rx: 0.34, ry: 0.38, cy: 0.10 },
  drytree:     { rx: 0.32, ry: 0.36, cy: 0.10 },
  stump:       { rx: 0.40, ry: 0.40 },
  log:         { rx: 0.50, ry: 0.30 },
  crystals:    { rx: 0.38, ry: 0.42 },
  deadtree:    { rx: 0.30, ry: 0.36, cy: 0.10 },
  cactus:      { rx: 0.24, ry: 0.42 },
  stalagmites: { rx: 0.42, ry: 0.44 },
  torch:       { rx: 0.16, ry: 0.30, cy: 0.06 },
  brazier:     { rx: 0.34, ry: 0.36 },
  tombstone:   { rx: 0.34, ry: 0.40 },
  pillar:      { rx: 0.28, ry: 0.42 },
  chest:       { rx: 0.44, ry: 0.40 },
  cauldron:    { rx: 0.44, ry: 0.40 },
  campfire:    { rx: 0.40, ry: 0.38 },
  well:        { rx: 0.46, ry: 0.42 },
  barrel:      { rx: 0.36, ry: 0.42 },
  pots:        { rx: 0.40, ry: 0.40 },
  // GOTH TEREPTÁR — tömör dísz
  coffin:      { rx: 0.44, ry: 0.46 },
  gravecross:  { rx: 0.22, ry: 0.42 },
  celticcross: { rx: 0.24, ry: 0.42 },
  angelstatue: { rx: 0.30, ry: 0.44, cy: 0.06 },
  gargoyle:    { rx: 0.34, ry: 0.40 },
  ironfence:   { rx: 0.48, ry: 0.32 },
  candelabra:  { rx: 0.20, ry: 0.34 },
  skullpile:   { rx: 0.42, ry: 0.38 },
  urn:         { rx: 0.30, ry: 0.40 },
  obelisk:     { rx: 0.26, ry: 0.44 },
};

/** Egy fajta talp-formája (a hiányzó `cy`-t a DEFAULT-ból pótolja). */
export function footprintFor(kind: ObstacleKind): Required<Footprint> {
  const f = FOOTPRINT[kind] ?? DEFAULT;
  return { rx: f.rx, ry: f.ry, cy: f.cy ?? DEFAULT.cy! };
}

/** Egy tárgy árnyékvető sziluettje: a takaró-élek + a kör-burok (kiszűréshez). */
export interface OccluderShape {
  /** Talp-közép (a kör-burok középpontja). */
  cx: number;
  cy: number;
  /** Kör-burok sugara: a fáklya hatósugarán kívüli alakzat kihagyható. */
  rad: number;
  /** A sziluett élei (zárt nyolcszög). */
  segs: Seg[];
}

/**
 * Egy tömör tárgy takaró-sziluettje: ellipszisbe írt, lapos tetejű/aljú
 * nyolcszög (a szögeltolás π/n lapos tetőt ad, természetesebb a talajon álló
 * tárgyaknál). A `rad` a kör-burok, amivel a World képkockánként kiszűri a
 * fáklya hatósugarán kívüli tárgyakat (azok árnyéka úgyis sötétbe esne).
 */
export function buildOccluder(
  cell: { x: number; y: number; w: number; h: number }, kind: ObstacleKind,
): OccluderShape {
  const fp = footprintFor(kind);
  const base = Math.min(cell.w, cell.h);
  const cx = cell.x + cell.w / 2;
  const cy = cell.y + cell.h * (0.5 + fp.cy);
  const rx = base * fp.rx;
  const ry = base * fp.ry;

  const segs: Seg[] = [];
  const off = Math.PI / SIDES;
  let px = cx + Math.cos(off) * rx;
  let py = cy + Math.sin(off) * ry;
  for (let i = 1; i <= SIDES; i++) {
    const a = off + (i / SIDES) * TAU;
    const nx = cx + Math.cos(a) * rx;
    const ny = cy + Math.sin(a) * ry;
    segs.push({ ax: px, ay: py, bx: nx, by: ny });
    px = nx; py = ny;
  }
  return { cx, cy, rad: Math.max(rx, ry), segs };
}
