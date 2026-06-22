import { TAU, shade } from '../../engine/math';
import type { Item } from './items';
import { pillLook } from './items';
import { drawPill, buildShape, type PillOpts } from './Pill';
import { softGlow } from '../render/glow';

/**
 * A tárgy JÁTÉKBELI ikonja a kategóriája szerint (HUD-lista, pedesztál, bolt).
 * A `perk` marad tabletta (`drawPill`); a `relic`/`skill`/`familiar` saját
 * vizuált kap, hogy a tabletta-forma a jövőbeli random fogyóé (#44) lehessen.
 * A szignatúra a `drawPill`-lel egyezik (`r` ~ félméret, `glow`/`rot` opció).
 */
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  item: Item,
  opts: PillOpts = {},
): void {
  const col = item.col;
  const col2 = item.col2 ?? shade(col, -0.38);
  switch (item.category) {
    case 'relic':
      drawRelic(ctx, cx, cy, r, col, col2, item.shape ?? 'diamond', opts);
      break;
    case 'skill':
      drawScroll(ctx, cx, cy, r, col, opts);
      break;
    case 'familiar':
      drawFamiliar(ctx, cx, cy, r, col, col2, opts);
      break;
    default:
      drawPill(ctx, cx, cy, r, pillLook(item), opts);
  }
}

/**
 * Relikvia: lógó, csiszolt ékkő-amulett arany foglalatban - tekintélyes,
 * „build-meghatározó" lelet. A kő alakja a tárgy `shape`-je (Pill `buildShape`),
 * a színe a tárgy `col`-ja.
 */
function drawRelic(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  col: string, col2: string, shape: Parameters<typeof buildShape>[2],
  opts: PillOpts,
): void {
  const { glow = false, rot = 0 } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);

  // arany lánc-fül a kő fölött
  ctx.strokeStyle = '#caa24a';
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.arc(0, -r * 0.92, r * 0.26, Math.PI * 0.1, Math.PI * 0.9, true);
  ctx.stroke();

  if (glow) softGlow(ctx, 0, 0, r * 1.7, col); // cache-elt fénykoszorú a shadowBlur helyett

  // arany foglalat (a kőnél kissé nagyobb sziluett)
  buildShape(ctx, r * 1.12, shape);
  ctx.fillStyle = '#b78a36';
  ctx.fill();

  // csiszolt ékkő: radiális gradiens (világos mag → szín → mély perem)
  buildShape(ctx, r * 0.82, shape);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.34, r * 0.1, 0, 0, r);
  g.addColorStop(0, shade(col, 0.5));
  g.addColorStop(0.55, col);
  g.addColorStop(1, shade(col2, -0.2));
  ctx.fillStyle = g;
  ctx.fill();

  // fazetta-él: a kőbe vágott világos háromszög (gyémánt-csiszolás jelzése)
  ctx.save();
  buildShape(ctx, r * 0.82, shape);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.7);
  ctx.lineTo(r * 0.34, r * 0.1);
  ctx.lineTo(-r * 0.34, r * 0.1);
  ctx.closePath();
  ctx.fill();
  // éles fénypont
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.34, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.restore();

  // foglalat-körvonal
  buildShape(ctx, r * 1.12, shape);
  ctx.strokeStyle = '#7a5a1e';
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.stroke();

  ctx.restore();
}

/**
 * Tekercs: vízszintes pergamen feltekeredő végekkel és a tárgy színében izzó
 * viaszpecséttel - aktív képességet adó „tekercs" lelet.
 */
function drawScroll(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  col: string,
  opts: PillOpts,
): void {
  const { glow = false, rot = 0 } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);

  const hw = r * 1.05;   // pergamen fél-szélesség (a tekercs-rudak közt)
  const hh = r * 0.74;   // pergamen fél-magasság
  const rodW = r * 0.34; // a két végén a tekercs-rúd fél-szélessége

  if (glow) softGlow(ctx, 0, 0, Math.max(hw, hh) * 1.7, col); // cache-elt fénykoszorú a shadowBlur helyett

  // pergamen-lap: krém gradiens
  const pg = ctx.createLinearGradient(0, -hh, 0, hh);
  pg.addColorStop(0, '#efe4c8');
  pg.addColorStop(1, '#cdb98c');
  ctx.fillStyle = pg;
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);

  // viaszpecsét középen (a tárgy színe, dombornyomott)
  const sg = ctx.createRadialGradient(-r * 0.12, -r * 0.14, r * 0.05, 0, 0, r * 0.42);
  sg.addColorStop(0, shade(col, 0.35));
  sg.addColorStop(1, shade(col, -0.3));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = shade(col, -0.45);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();

  // két végén feltekeredő rúd (sötétebb pergamen, ovális vég)
  for (const sx of [-1, 1]) {
    const x = sx * hw;
    const rg = ctx.createLinearGradient(x - rodW, 0, x + rodW, 0);
    rg.addColorStop(0, '#b59a63');
    rg.addColorStop(0.5, '#e3d4a8');
    rg.addColorStop(1, '#a88c55');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(x, 0, rodW, hh * 1.16, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#7a6336';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Kísérő: központi ragyogó orb + egy kisebb, körülötte keringő pötty - a
 * „familiáris" (Holdkő / Őrző Légy) játékbeli vizuálja az ikon-méretben.
 */
function drawFamiliar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  col: string, col2: string,
  opts: PillOpts,
): void {
  const { glow = false, rot = 0 } = opts;
  ctx.save();
  ctx.translate(cx, cy);

  if (glow) softGlow(ctx, 0, 0, r * 1.2, col); // cache-elt fénykoszorú a shadowBlur helyett

  // fő orb: radiális gradiens
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.1, 0, 0, r * 0.82);
  g.addColorStop(0, shade(col, 0.55));
  g.addColorStop(0.6, col);
  g.addColorStop(1, shade(col2, -0.15));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.fill();

  // csillanás
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.26, -r * 0.3, r * 0.22, r * 0.14, -0.5, 0, TAU);
  ctx.fill();

  // körvonal
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.strokeStyle = shade(col2, -0.3);
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();

  // keringő kis pötty (a kísérő-pálya utalása), a billegés-szöggel forgatva
  const a = rot * 3 - 0.7;
  const ox = Math.cos(a) * r * 0.96;
  const oy = Math.sin(a) * r * 0.96;
  ctx.fillStyle = shade(col, 0.4);
  ctx.beginPath();
  ctx.arc(ox, oy, r * 0.2, 0, TAU);
  ctx.fill();

  ctx.restore();
}
