/**
 * Ellenséges lövedékek kirajzolása. Minden {@link BulletStyle}-nak külön
 * sziluettje, palettája és effektje van, így a játékos ránézésre meg tudja
 * különböztetni a fenyegetéseket (gyors energialövedék vs. lomha kőtömb stb.).
 *
 * Két közös elv minden stílusra:
 *   1) A test a HALADÁS IRÁNYÁBA fordul, és a SEBESSÉG nyújtja: a gyorsabb
 *      lövedék hosszúkásabb ÉS keskenyebb (csóva-érzet), a lassú gömbölyűbb.
 *   2) Az időfüggő effektek (vibrálás, lobogás, gyűrű-tágulás) egy lövedékenként
 *      stabil fázismagból dolgoznak (a kezdősebességből), hogy ne ugráljanak.
 *
 * Teljesítmény: a lövedékek NEM használnak `shadowBlur`-t (a 2D-canvas
 * legdrágább művelete). A lágy glow-halót a már gyorsítótárazott, additív
 * `drawProjectileGlow` réteg adja (stílus-szerinti színnel, lásd glowColorOf); a
 * test-gradiensek pedig memoizáltak (lásd bulletGfx).
 */

import { clamp, TAU, hash2 } from '../../engine/math';
import { lin3, lin4 } from './bulletGfx';
import type { EnemyBullet, BulletStyle } from '../types';

/** A sebesség → nyúlás leképezés: ~150 px/s alatt gömb, fölötte egyre hosszabb. */
function speedStretch(speed: number, max = 0.85): number {
  return 1 + clamp((speed - 150) / 320, 0, 1) * max;
}

/** Lövedékenként stabil fázis (a kezdősebesség-vektorból), 0..TAU. */
function phaseOf(b: EnemyBullet): number {
  return (Math.abs(b.vx) * 0.013 + Math.abs(b.vy) * 0.017) % TAU;
}

/** A tényleges stílus: explicit `style`, vagy a régi bool-kapcsolók, vagy `ember`. */
export function styleOf(b: EnemyBullet): BulletStyle {
  return b.style ?? (b.slime ? 'slime' : b.poison ? 'poison' : 'ember');
}

export function drawBullet(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  switch (styleOf(b)) {
    case 'slime': return drawSlime(ctx, b);
    case 'poison': return drawPoison(ctx, b, t);
    case 'energy': return drawEnergy(ctx, b, t);
    case 'bone': return drawBone(ctx, b, t);
    case 'stone': return drawStone(ctx, b, t);
    case 'arcane': return drawArcane(ctx, b, t);
    case 'sonic': return drawSonic(ctx, b, t);
    case 'fire': return drawFire(ctx, b, t);
    case 'pellet': return drawPellet(ctx, b);
    case 'heavy': return drawHeavy(ctx, b, t);
    case 'gas': return drawGas(ctx, b, t);
    default: return drawEmber(ctx, b);
  }
}

/** Közös: a lövedék rendszerébe lépés (eltolás + a haladás irányába forgatás). */
function enter(ctx: CanvasRenderingContext2D, b: EnemyBullet): number {
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);
  return Math.hypot(b.vx, b.vy);
}

/* --------------------------------------------------------------------------- */
/*  Stílusok                                                                   */
/* --------------------------------------------------------------------------- */

/** ember — alap narancs-vörös plazmagömb, sebesség szerint nyúlva. */
function drawEmber(ctx: CanvasRenderingContext2D, b: EnemyBullet): void {
  const sp = enter(ctx, b);
  const st = speedStretch(sp, 0.7);
  const rx = b.r * st;
  const ry = b.r / Math.sqrt(st); // gyorsabb → keskenyebb
  ctx.fillStyle = lin3(ctx, -rx, 0, rx, 0, 0.55, '#c0341a', '#ff6a4d', '#ffd0a0');
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  // forró mag-csillanás elöl
  ctx.fillStyle = 'rgba(255,236,200,0.8)';
  ctx.beginPath();
  ctx.ellipse(rx * 0.35, 0, ry * 0.4, ry * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** energy — kékes energialövedék: fehér mag, erősen nyúlt, enyhén vibrál. */
function drawEnergy(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  const sp = enter(ctx, b);
  const st = speedStretch(sp, 1.1);
  const rx = b.r * st;
  const ry = (b.r / Math.sqrt(st)) * (1 + Math.sin(t * 30 + phaseOf(b)) * 0.08);
  ctx.fillStyle = lin4(ctx, -rx, 0, rx, 0, 0.4, 0.8, 'rgba(40,120,200,0)', '#3aa0e6', '#9fe8ff', '#ffffff');
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  // izzó fehér mag a fejen
  ctx.fillStyle = 'rgba(240,252,255,0.95)';
  ctx.beginPath();
  ctx.arc(rx * 0.45, 0, ry * 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** poison — savzöld méreggömb, buborékos csillanással, lassú pulzálással. */
function drawPoison(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  const sp = enter(ctx, b);
  const pulse = 1 + Math.sin(t * 8 + phaseOf(b)) * 0.07;
  const st = speedStretch(sp, 0.45);
  const rx = b.r * st * pulse;
  const ry = (b.r / Math.sqrt(st)) * pulse;
  ctx.fillStyle = '#a6e84a';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  // savzöld csillanás + két apró buborék
  ctx.fillStyle = 'rgba(230,255,160,0.75)';
  ctx.beginPath();
  ctx.arc(-rx * 0.25, -ry * 0.3, ry * 0.35, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,130,30,0.6)';
  ctx.beginPath();
  ctx.arc(rx * 0.3, ry * 0.25, ry * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** slime — hosszúkás, zöldes nyálcsepp a haladás irányába (bulbusos fej + farok). */
function drawSlime(ctx: CanvasRenderingContext2D, b: EnemyBullet): void {
  enter(ctx, b);
  const R = b.r;
  const head = b.r * 0.55;
  const tail = -b.r * 2.4;

  // hátul lecsöppenő apró nyálcseppek
  ctx.fillStyle = 'rgba(143,191,74,0.45)';
  for (const [ox, oy, s] of [[tail * 1.15, 0, 0.32], [tail * 0.85, R * 0.3, 0.22]] as const) {
    ctx.beginPath();
    ctx.arc(ox, oy, R * s, 0, TAU);
    ctx.fill();
  }

  // fő nyálcsepp
  ctx.fillStyle = lin3(ctx, tail, 0, head + R, 0, 0.55, '#5f8f24', '#b6e04a', '#dcff7a');
  ctx.beginPath();
  ctx.arc(head, 0, R, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.quadraticCurveTo(tail * 0.45, R * 0.55, tail, 0);
  ctx.quadraticCurveTo(tail * 0.45, -R * 0.55, head, -R);
  ctx.closePath();
  ctx.fill();

  // fényes csillanás a fejen
  ctx.fillStyle = 'rgba(235,255,170,0.75)';
  ctx.beginPath();
  ctx.ellipse(head + R * 0.1, -R * 0.3, R * 0.42, R * 0.22, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** bone — csontfehér szilánk: hegyes, megnyúlt lencse, lassan pörögve. */
function drawBone(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  const sp = enter(ctx, b);
  // a szilánk a haladás körül enyhén pörög
  ctx.rotate(Math.sin(t * 6 + phaseOf(b)) * 0.25);
  const st = speedStretch(sp, 1.3);
  const len = b.r * st * 1.25;
  const wid = b.r * 0.62;
  ctx.fillStyle = '#efe9da';
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.quadraticCurveTo(0, wid, -len * 0.85, 0);
  ctx.quadraticCurveTo(0, -wid, len, 0);
  ctx.closePath();
  ctx.fill();
  // árnyékos gerinc
  ctx.strokeStyle = 'rgba(150,140,120,0.7)';
  ctx.lineWidth = Math.max(1, b.r * 0.16);
  ctx.beginPath();
  ctx.moveTo(len * 0.7, 0);
  ctx.lineTo(-len * 0.6, 0);
  ctx.stroke();
  ctx.restore();
}

/** stone — szürke, szabálytalan kőtömb, lassan forogva (kövület-lövedék). */
function drawStone(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  enter(ctx, b);
  ctx.rotate(t * 1.1 + phaseOf(b)); // lomhán pörög
  const seed = Math.floor(b.r * 7 + Math.abs(b.vx));
  ctx.fillStyle = '#8d877d';
  ctx.beginPath();
  const verts = 7;
  for (let i = 0; i <= verts; i++) {
    const a = (i / verts) * TAU;
    const rr = b.r * (0.78 + hash2(seed, i) * 0.4);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // felső megvilágítás + repedés
  ctx.fillStyle = 'rgba(200,194,184,0.5)';
  ctx.beginPath();
  ctx.arc(-b.r * 0.25, -b.r * 0.3, b.r * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,46,42,0.6)';
  ctx.lineWidth = Math.max(1, b.r * 0.12);
  ctx.beginPath();
  ctx.moveTo(-b.r * 0.4, b.r * 0.1);
  ctx.lineTo(b.r * 0.1, -b.r * 0.2);
  ctx.lineTo(b.r * 0.5, b.r * 0.3);
  ctx.stroke();
  ctx.restore();
}

/** arcane — lila bűbáj-orb: lüktető külső gyűrű + forgó szikrakereszt, vibrál. */
function drawArcane(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  const ph = phaseOf(b);
  const pulse = 1 + Math.sin(t * 9 + ph) * 0.12;
  // mag (a sugár lüktet → élő gradiens, de shadowBlur nélkül)
  const g = ctx.createRadialGradient(0, 0, b.r * 0.1, 0, 0, b.r * pulse);
  g.addColorStop(0, '#f0e0ff');
  g.addColorStop(0.5, '#c08aff');
  g.addColorStop(1, '#6a2ad0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, b.r * pulse, 0, TAU);
  ctx.fill();
  // lüktető külső gyűrű
  ctx.strokeStyle = `rgba(200,150,255,${0.5 + Math.sin(t * 9 + ph) * 0.25})`;
  ctx.lineWidth = Math.max(1, b.r * 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, b.r * (1.35 + Math.sin(t * 9 + ph) * 0.12), 0, TAU);
  ctx.stroke();
  // forgó szikrakereszt
  ctx.rotate(t * 4 + ph);
  ctx.strokeStyle = 'rgba(245,235,255,0.9)';
  ctx.lineWidth = Math.max(1, b.r * 0.18);
  const arm = b.r * 1.5;
  ctx.beginPath();
  ctx.moveTo(-arm, 0); ctx.lineTo(arm, 0);
  ctx.moveTo(0, -arm); ctx.lineTo(0, arm);
  ctx.stroke();
  ctx.restore();
}

/** sonic — halvány, táguló hanghullám-gyűrű (csak körvonal, lüktet). */
function drawSonic(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  const ph = phaseOf(b);
  for (let i = 0; i < 3; i++) {
    const k = (Math.sin(t * 12 + ph + i * 1.4) + 1) * 0.5; // 0..1 lüktetés
    const rr = b.r * (0.6 + i * 0.45 + k * 0.25);
    ctx.strokeStyle = `rgba(210,225,255,${0.5 - i * 0.13})`;
    ctx.lineWidth = Math.max(1, b.r * (0.22 - i * 0.05));
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, TAU);
    ctx.stroke();
  }
  // halvány mag
  ctx.fillStyle = 'rgba(225,235,255,0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, b.r * 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** fire — lobogó tűzgolyó: vörös-narancs-fehér rétegek + libegő lángnyelvek. */
function drawFire(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  const sp = enter(ctx, b);
  const ph = phaseOf(b);
  const flick = 1 + Math.sin(t * 22 + ph) * 0.12;
  const st = speedStretch(sp, 0.6);
  // hátranyúló lángcsóva
  const tail = -b.r * (2.0 + st);
  ctx.fillStyle = lin3(ctx, tail, 0, b.r, 0, 0.5, 'rgba(200,40,10,0)', 'rgba(255,120,30,0.55)', 'rgba(255,200,80,0.8)');
  ctx.beginPath();
  ctx.moveTo(b.r * 0.6, 0);
  ctx.quadraticCurveTo(tail * 0.4, b.r * 0.85, tail, 0);
  ctx.quadraticCurveTo(tail * 0.4, -b.r * 0.85, b.r * 0.6, 0);
  ctx.closePath();
  ctx.fill();
  // magrétegek
  ctx.fillStyle = '#d83a14';
  ctx.beginPath(); ctx.arc(0, 0, b.r * flick, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath(); ctx.arc(b.r * 0.12, 0, b.r * 0.68 * flick, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath(); ctx.arc(b.r * 0.2, 0, b.r * 0.34 * flick, 0, TAU); ctx.fill();
  ctx.restore();
}

/** pellet — apró, sötét-arany sörét, enyhén nyújtva. Olcsó (sok belőle). */
function drawPellet(ctx: CanvasRenderingContext2D, b: EnemyBullet): void {
  const sp = enter(ctx, b);
  const st = speedStretch(sp, 0.5);
  ctx.fillStyle = '#e0a838';
  ctx.beginPath();
  ctx.ellipse(0, 0, b.r * st, b.r / Math.sqrt(st), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.8)';
  ctx.beginPath();
  ctx.arc(-b.r * 0.2, -b.r * 0.2, b.r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** heavy — nagy, izzó nehéz-lövedék hosszú fénycsóvával (mesterlövész). */
function drawHeavy(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  const sp = enter(ctx, b);
  const ph = phaseOf(b);
  const st = speedStretch(sp, 1.6);
  const tail = -b.r * (3.2 + st * 1.5);
  // hosszú fénycsóva
  ctx.fillStyle = lin3(ctx, tail, 0, b.r, 0, 0.7, 'rgba(255,80,30,0)', 'rgba(255,120,40,0.6)', 'rgba(255,220,150,0.9)');
  ctx.beginPath();
  ctx.moveTo(b.r * 0.7, 0);
  ctx.quadraticCurveTo(tail * 0.4, b.r * 0.55, tail, 0);
  ctx.quadraticCurveTo(tail * 0.4, -b.r * 0.55, b.r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  // izzó fej (pulzáló forró mag → élő gradiens, shadowBlur nélkül)
  const flick = 1 + Math.sin(t * 18 + ph) * 0.08;
  const g = ctx.createRadialGradient(b.r * 0.15, 0, b.r * 0.1, b.r * 0.15, 0, b.r * flick);
  g.addColorStop(0, '#fff4d8');
  g.addColorStop(0.5, '#ff9a3a');
  g.addColorStop(1, '#d8341a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, b.r * flick, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** gas — gomolygó méreggáz-felhő (gázzsák lövedéke): több, lassan kavargó lebernyeg
 *  + sötét mag → jellegzetes, NEM gömbölyű alak. Lassítja a játékost (lásd slow). */
function drawGas(ctx: CanvasRenderingContext2D, b: EnemyBullet, t: number): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  const ph = phaseOf(b);
  // több, kavargó lebernyeg a középpont körül → lüktető, lumpos felhő-sziluett.
  // A lebernyegek pozíciója/sugara folyamatosan animál → élő gradiens (de a drága
  // shadowBlur itt is kiesett; a glow-halót a drawProjectileGlow adja).
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const a = ph + t * 1.6 + (i / lobes) * TAU;
    const rr = b.r * (0.6 + 0.2 * Math.sin(t * 4 + i * 1.7 + ph));
    const ox = Math.cos(a) * b.r * 0.55;
    const oy = Math.sin(a) * b.r * 0.55;
    const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, rr);
    g.addColorStop(0, 'rgba(214,255,150,0.85)');
    g.addColorStop(0.6, 'rgba(150,200,70,0.55)');
    g.addColorStop(1, 'rgba(110,150,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, rr, 0, TAU);
    ctx.fill();
  }
  // sötét, beteges mag
  ctx.fillStyle = 'rgba(86,116,40,0.55)';
  ctx.beginPath();
  ctx.arc(0, 0, b.r * 0.42, 0, TAU);
  ctx.fill();
  ctx.restore();
}
