/**
 * Map-méretű, „légköri" animációk (szél, eső, tűzeső, parázs, köd, …). A
 * Pálya-szerkesztő „ANIMÁCIÓ" legördülőjében nézhetők át: a kiválasztott effekt
 * élőben kitölti a teljes szoba-rácsot, a swatch pedig kicsiben mutatja.
 *
 * Minden rajzoló TISZTA és ÁLLAPOTMENTES: csak a cél-téglalapot és az időt (`t`,
 * mp) kapja, a részecskéket determinisztikusan az időből + indexből számolja, így
 * folytonosan, ugráLásmentesen animál bármekkora méretben. Magát a téglalapra
 * vágást is elvégzi.
 *
 * Egyelőre ELŐNÉZETEK (nincsenek élő pályára kötve) — a kiválasztottakat utólag
 * bekötjük a World rétegrendjébe.
 */
import type { Rect } from '../types';
import { TAU, hash2, clamp } from '../../engine/math';

/** Determinisztikus 0..1 ál-véletlen részecske-indexből + magból. */
function rnd(i: number, s: number): number { return hash2(i * 131 + s * 17, i * 977 + s * 53); }

/** Részecskeszám a terület arányában (azonos sűrűség kicsiben és nagyban is). */
function pcount(rect: Rect, perK: number, min: number, max: number): number {
  return clamp(Math.round((perK * rect.w * rect.h) / 10000), min, max);
}

/** Pozitív maradék (negatív sebességű sodródáshoz). */
function wrap(v: number, span: number): number { return ((v % span) + span) % span; }

function clip(ctx: CanvasRenderingContext2D, r: Rect, fn: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  fn();
  ctx.restore();
}

export type MapAnimDraw = (ctx: CanvasRenderingContext2D, rect: Rect, t: number) => void;

/* ---- SZÉL --------------------------------------------------------------- */

/** Szél: balról jobbra sodródó, ívelt légörvény-csíkok lüktető erősséggel és
 *  pár elfújt porszemmel/levéllel. */
const wind: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  const gust = 0.5 + 0.5 * Math.sin(t * 0.5);
  const speed = w * (0.22 + gust * 0.32);
  ctx.lineCap = 'round';
  const n = pcount(rect, 9, 6, 44);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2), r3 = rnd(i, 3);
    const len = w * (0.12 + 0.2 * r1);
    const span = w + len + w * 0.4;
    const px = x - len + wrap(t * speed * (0.6 + r2 * 0.8) + r3 * span, span);
    const py = y + h * (0.06 + 0.88 * r1) + Math.sin(t * 1.2 + i) * h * 0.02;
    const op = (0.10 + 0.22 * gust) * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.strokeStyle = `rgba(228,236,246,${op})`;
    ctx.lineWidth = 1 + r2 * 1.3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + len * 0.5, py - h * 0.035, px + len, py);
    ctx.stroke();
  }
  const m = pcount(rect, 2.4, 2, 14);
  for (let i = 0; i < m; i++) {
    const r1 = rnd(i, 5), r2 = rnd(i, 6);
    const span = w + 20;
    const px = x - 10 + wrap(t * speed * 1.5 + r1 * span, span);
    const py = y + h * (0.1 + 0.8 * r2) + Math.sin(t * 3 + i * 2) * h * 0.06;
    ctx.fillStyle = `rgba(205,194,150,${0.25 + 0.35 * gust})`;
    ctx.beginPath();
    ctx.arc(px, py, 1 + r2 * 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
});

/* ---- ESŐ ---------------------------------------------------------------- */

/** Eső: ferde, gyorsan hulló cseppcsíkok hűvös fátyollal és apró
 *  becsapódás-fröccsenésekkel az alján. */
const rain: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  ctx.fillStyle = 'rgba(28,42,66,0.14)';
  ctx.fillRect(x, y, w, h);
  const slope = 0.24;
  const speed = h * 1.7;
  const n = pcount(rect, 30, 18, 180);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const len = h * (0.07 + 0.05 * r1);
    const span = h + len;
    const py = y - len + wrap(t * speed * (0.8 + r1 * 0.5) + r2 * span, span);
    const px = x + rnd(i, 3) * w;
    ctx.strokeStyle = `rgba(173,202,232,${0.22 + 0.28 * r1})`;
    ctx.lineWidth = 0.8 + r1 * 0.9;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - len * slope, py - len);
    ctx.stroke();
  }
  const sp = pcount(rect, 3, 3, 18);
  for (let i = 0; i < sp; i++) {
    const r1 = rnd(i, 7), r2 = rnd(i, 8);
    const ph = wrap(t * 1.8 + r1 * 3.1, 1);
    const sx = x + r1 * w;
    const sy = y + h * (0.9 + 0.08 * r2);
    ctx.strokeStyle = `rgba(186,214,238,${(1 - ph) * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, ph * 4 + 1, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
});

/* ---- TŰZESŐ -------------------------------------------------------------- */

/** Tűzeső: izzó, csóvás tűzgolyók hullanak fényes fejjel, narancs-vörös
 *  csóvával és fény-udvarral, meleg sötét fátyolban. */
const fireRain: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  ctx.fillStyle = 'rgba(38,8,2,0.2)';
  ctx.fillRect(x, y, w, h);
  const slope = 0.18;
  const speed = h * 1.25;
  const n = pcount(rect, 7, 6, 46);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const len = h * (0.12 + 0.12 * r1);
    const span = h + len;
    const py = y - len + wrap(t * speed * (0.7 + r1 * 0.6) + r2 * span, span);
    const px = x + rnd(i, 3) * w;
    const hx = px, hy = py;            // fej
    const tx = px + len * slope, ty = py - len; // csóva vége (fölfelé)
    // fény-udvar
    const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, len * 0.6);
    halo.addColorStop(0, 'rgba(255,170,60,0.5)');
    halo.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(hx, hy, len * 0.6, 0, TAU);
    ctx.fill();
    // csóva
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, 'rgba(255,244,200,0.95)');
    g.addColorStop(0.35, 'rgba(255,150,40,0.8)');
    g.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 + r1 * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // fej-mag
    ctx.fillStyle = 'rgba(255,250,225,0.95)';
    ctx.beginPath();
    ctx.arc(hx, hy, 1.4 + r1 * 1.4, 0, TAU);
    ctx.fill();
  }
  // pár leváló szikra
  const sp = pcount(rect, 3, 3, 18);
  for (let i = 0; i < sp; i++) {
    const r1 = rnd(i, 9);
    const ph = wrap(t * 0.9 + r1 * 2.3, 1);
    const sx = x + r1 * w + Math.sin(i) * 4;
    const sy = y + ph * h;
    ctx.fillStyle = `rgba(255,${140 + ((i * 30) % 90)},50,${(1 - ph) * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
});

/* ---- PARÁZS SZÁLLÁS ----------------------------------------------------- */

/** Parázs szállás: lustán fölfelé szálló, pislákoló parázsszemek meleg
 *  fénnyel; ahogy emelkednek, halványulnak és vörösebbé válnak. */
const embers: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  // halvány meleg fény az alján
  const glow = ctx.createLinearGradient(0, y + h, 0, y + h * 0.4);
  glow.addColorStop(0, 'rgba(120,40,10,0.18)');
  glow.addColorStop(1, 'rgba(120,40,10,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  const n = pcount(rect, 10, 8, 64);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const range = h * (0.7 + 0.3 * r1);
    const up = wrap(t * h * 0.16 * (0.5 + r1) + r2 * range, range);
    const py = y + h - up - h * 0.04;
    const f = up / range;                         // 0 alul → 1 fent
    const px = x + rnd(i, 3) * w + Math.sin(t * 1.4 + i * 1.3) * w * 0.05 * (0.4 + f);
    const flick = 0.5 + 0.5 * Math.sin(t * 7 + i * 3);
    const op = (1 - f) * (0.45 + 0.55 * flick);
    const size = 1 + r1 * 1.6;
    // fény-udvar
    const halo = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
    halo.addColorStop(0, `rgba(255,${130 - f * 60},40,${op * 0.5})`);
    halo.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, size * 3, 0, TAU);
    ctx.fill();
    // mag
    ctx.fillStyle = `rgba(255,${210 - f * 90},${120 - f * 90},${op})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
});

/* ---- KÖD ---------------------------------------------------------------- */

/** Köd: több rétegben, eltérő sebességgel sodródó lágy ködpamacsok és egy
 *  enyhe összfátyol — csökkenti a láthatóságot. */
const fog: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  for (let layer = 0; layer < 3; layer++) {
    const dir = layer % 2 === 0 ? 1 : -1;
    const speed = dir * w * (0.012 + layer * 0.01);
    const blobR = h * (0.42 + 0.16 * layer);
    const count = 4 + layer;
    const alpha = 0.12 - layer * 0.02;
    for (let j = 0; j < count; j++) {
      const span = w + blobR * 2;
      const px = x - blobR + wrap(t * speed + (j / count) * span + layer * 41, span);
      const py = y + h * (0.18 + 0.64 * rnd(j, layer + 1)) + Math.sin(t * 0.3 + j) * h * 0.04;
      const g = ctx.createRadialGradient(px, py, 0, px, py, blobR);
      g.addColorStop(0, `rgba(210,214,224,${alpha})`);
      g.addColorStop(1, 'rgba(210,214,224,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, blobR, blobR * 0.7, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(202,206,216,0.05)';
  ctx.fillRect(x, y, w, h);
});

/* ---- HÓESÉS -------------------------------------------------------------- */

/** Hóesés: lágyan aláhulló, oldalra ringó hópihék, eltérő mérettel és
 *  fátyolossággal. */
const snow: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  const n = pcount(rect, 22, 14, 130);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const range = h + 10;
    const py = y - 5 + wrap(t * h * 0.12 * (0.5 + r1) + r2 * range, range);
    const px = x + rnd(i, 3) * w + Math.sin(t * 0.8 + i * 1.7 + r1 * 6) * w * 0.05;
    const size = 0.8 + r1 * 1.8;
    ctx.fillStyle = `rgba(244,248,255,${0.45 + 0.45 * r1})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
});

/* ---- LEHULLÓ LEVELEK ---------------------------------------------------- */

/** Lehulló levelek: őszi színű levelek pörögve-ringva hullanak alá. */
const leaves: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  const pal = ['#b5611d', '#c98a2e', '#9a3b16', '#caa24a', '#7a3b14'];
  const n = pcount(rect, 4, 4, 26);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const range = h + 20;
    const py = y - 10 + wrap(t * h * 0.1 * (0.5 + r1) + r2 * range, range);
    const px = x + rnd(i, 3) * w + Math.sin(t * 1.1 + i * 2 + r1 * 6) * w * 0.12;
    const rot = t * (0.6 + r1) + i;
    const lw = 4 + r1 * 5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = pal[i % pal.length]!;
    ctx.beginPath();
    ctx.ellipse(0, 0, lw, lw * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,12,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-lw, 0);
    ctx.lineTo(lw, 0);
    ctx.stroke();
    ctx.restore();
  }
});

/* ---- SZENTJÁNOSBOGARAK -------------------------------------------------- */

/** Szentjánosbogarak: lágyan kóborló, fel-felvillanó zöldessárga fénypontok
 *  puha fény-udvarral. */
const fireflies: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  const n = pcount(rect, 5, 5, 30);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const px = x + w * (0.1 + 0.8 * r1) + Math.sin(t * (0.4 + r2 * 0.4) + i * 2) * w * 0.13;
    const py = y + h * (0.1 + 0.8 * r2) + Math.cos(t * (0.3 + r1 * 0.4) + i * 3) * h * 0.13;
    const blink = Math.sin(t * 1.6 + i * 2.3);
    const op = Math.max(0, blink);
    if (op <= 0.02) continue;
    const halo = ctx.createRadialGradient(px, py, 0, px, py, 7);
    halo.addColorStop(0, `rgba(200,255,120,${op * 0.5})`);
    halo.addColorStop(1, 'rgba(160,230,80,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(240,255,200,${op})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.4, 0, TAU);
    ctx.fill();
  }
});

/* ---- VILLÁMLÁS ---------------------------------------------------------- */

/** Villámlás: viharos sötét fátyol, időnként fénylő felvillanással és elágazó
 *  villámmal (perióduson belül stabil alakkal). */
const lightning: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  ctx.fillStyle = 'rgba(18,20,34,0.28)';
  ctx.fillRect(x, y, w, h);
  const period = 3.2;
  const idx = Math.floor(t / period);
  const ph = t - idx * period;
  let flash = 0;
  if (ph < 0.07) flash = 1 - ph / 0.07;
  else if (ph > 0.13 && ph < 0.24) flash = ((0.24 - ph) / 0.11) * 0.7;
  if (flash <= 0) return;
  ctx.fillStyle = `rgba(220,230,255,${flash * 0.5})`;
  ctx.fillRect(x, y, w, h);
  // villám
  const bx0 = x + w * (0.2 + 0.6 * rnd(idx, 1));
  ctx.strokeStyle = `rgba(235,242,255,${0.7 + 0.3 * flash})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(180,200,255,0.9)';
  ctx.shadowBlur = 8;
  const segs = 7;
  let px = bx0, py = y;
  const pts: Array<[number, number]> = [[px, py]];
  for (let s = 1; s <= segs; s++) {
    px += (rnd(idx, s + 3) - 0.5) * w * 0.22;
    py += (h / segs) * (0.7 + rnd(idx, s + 20) * 0.6);
    pts.push([px, py]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  // egy elágazás
  const bi = 3;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(pts[bi]![0], pts[bi]![1]);
  ctx.lineTo(pts[bi]![0] + (rnd(idx, 7) - 0.5) * w * 0.3, pts[bi]![1] + h * 0.22);
  ctx.lineTo(pts[bi]![0] + (rnd(idx, 8) - 0.5) * w * 0.4, pts[bi]![1] + h * 0.4);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineCap = 'butt';
});

/* ---- HAMUESŐ ------------------------------------------------------------ */

/** Hamueső: lassan szállingózó, oldalra sodródó szürke hamupelyhek, néhány még
 *  izzó parázzsal — vulkáni, fojtott hangulat. */
const ash: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  ctx.fillStyle = 'rgba(32,27,24,0.16)';
  ctx.fillRect(x, y, w, h);
  const n = pcount(rect, 12, 10, 80);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const range = h + 10;
    const py = y - 5 + wrap(t * h * 0.07 * (0.5 + r1) + r2 * range, range);
    const px = x + rnd(i, 3) * w + Math.sin(t * 0.6 + i * 1.3) * w * 0.06;
    const size = 0.8 + r1 * 1.4;
    if (rnd(i, 9) > 0.84) {
      const glow = 0.5 + 0.5 * Math.sin(t * 4 + i);
      ctx.fillStyle = `rgba(255,${110 + glow * 80},40,${0.5 + glow * 0.4})`;
    } else {
      ctx.fillStyle = `rgba(${120 + r1 * 50},${116 + r1 * 46},${110 + r1 * 40},${0.4 + 0.4 * r1})`;
    }
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
});

/* ---- MÉRGEZŐ SPÓRÁK ----------------------------------------------------- */

/** Mérgező spórák: lassan, kanyarogva fölfelé lebegő, pislákoló zöldes
 *  spórák halvány mérgező fátyolban. */
const spores: MapAnimDraw = (ctx, rect, t) => clip(ctx, rect, () => {
  const { x, y, w, h } = rect;
  ctx.fillStyle = 'rgba(22,42,16,0.12)';
  ctx.fillRect(x, y, w, h);
  const n = pcount(rect, 7, 6, 44);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i, 1), r2 = rnd(i, 2);
    const range = h * 1.1;
    const up = wrap(t * h * 0.05 * (0.4 + r1) + r2 * range, range);
    const py = y + h - up;
    const f = up / range;
    const px = x + rnd(i, 3) * w + Math.sin(t * 0.7 + i * 2) * w * 0.08;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    const op = (1 - f * 0.7) * (0.4 + 0.5 * pulse);
    const size = 1.2 + r1 * 1.8;
    const halo = ctx.createRadialGradient(px, py, 0, px, py, size * 2.6);
    halo.addColorStop(0, `rgba(150,230,90,${op * 0.4})`);
    halo.addColorStop(1, 'rgba(120,200,60,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, size * 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(200,245,150,${op})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }
});

/* ---- REGISZTER ---------------------------------------------------------- */

export interface MapAnim { ch: string; label: string; draw: MapAnimDraw; }

/** A választható map-animációk. A `ch` egyedi azonosító a paletta-swatchhoz
 *  (nem cella-festék — soha nem kerül a sablon-rácsba). */
export const MAP_ANIMS: MapAnim[] = [
  { ch: '11', label: 'Szél', draw: wind },
  { ch: '22', label: 'Eső', draw: rain },
  { ch: '33', label: 'Tűzeső', draw: fireRain },
  { ch: '44', label: 'Parázs szállás', draw: embers },
  { ch: '55', label: 'Köd', draw: fog },
  { ch: '66', label: 'Hóesés', draw: snow },
  { ch: '77', label: 'Lehulló levelek', draw: leaves },
  { ch: '88', label: 'Szentjánosbogarak', draw: fireflies },
  { ch: '99', label: 'Villámlás', draw: lightning },
  { ch: '00', label: 'Hamueső', draw: ash },
  { ch: '**', label: 'Mérgező spórák', draw: spores },
];

export const MAP_ANIM_BY_CH: Record<string, MapAnimDraw | undefined> =
  Object.fromEntries(MAP_ANIMS.map((a) => [a.ch, a.draw]));
