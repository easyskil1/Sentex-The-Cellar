/**
 * A szoba TALAJ-RÉTEGÉNEK procedurális rajzolói — leválasztva a World-ről
 * (ahogy az obstacleRender és a mapAnim is), hogy a World a koordinátor maradjon.
 *
 * Tiszta függvények: a szoba-téglalapot / témát / a Room adatát és (ahol kell)
 * egy `isBlocked` lekérdezést kapnak; állapotot nem tartanak. A determinisztikus
 * variáció a cella-koordinátákból / seedből stabil, így nem villog képkockánként.
 */
import { TAU, shade, hash2, clamp } from '../../engine/math';
import { ROOM } from '../config';
import type { Rect } from '../types';
import type { Theme } from './theme';
import type { Room } from './Room';

/** Ütközés-lekérdezés (a pocsolyák/dekorációk a tömör cellákat kihagyják). */
type Blocked = (x: number, y: number) => boolean;

// ── Padló-csempék ────────────────────────────────────────────────────────────

/** A procedurális kőpadló csempéi (a szoba-téglalapra vágva). */
export function drawFloorTiles(ctx: CanvasRenderingContext2D, rc: Rect, theme: Theme): void {
  const TS = ROOM.TILE;
  const grout = shade(theme.floor, -0.3);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rc.x, rc.y, rc.w, rc.h);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let col = 0;
  for (let px = rc.x; px < rc.x + rc.w; px += TS, col++) {
    let row = 0;
    for (let py = rc.y; py < rc.y + rc.h; py += TS, row++) {
      drawTile(ctx, px, py, TS, col, row, grout, theme);
    }
  }
  ctx.restore();
}

/**
 * Egy padlócsempe egyedi, antikolt kinézettel: kövenkénti tónus, sötét foltok,
 * a csempék egy részén repedés, ritkán kitört darab (sötét mélyedés). Minden
 * variáció a (col,row) hashből stabil, így nem villog képkockánként.
 */
function drawTile(
  ctx: CanvasRenderingContext2D, px: number, py: number, TS: number,
  col: number, row: number, grout: string, theme: Theme,
): void {
  const base = theme.floor;
  const h1 = hash2(col, row);
  const h2 = hash2(col * 3 + 1, row * 5 + 2);
  const h3 = hash2(col * 7 + 3, row * 11 + 4);
  const h4 = hash2(col * 13 + 5, row * 17 + 6);

  // egyedi alaptónus: enyhe sakktábla + kövenkénti szórás
  const checker = (col + row) % 2 === 0 ? 0.05 : -0.05;
  ctx.fillStyle = shade(base, checker + (h1 - 0.5) * 0.16);
  ctx.fillRect(px, py, TS, TS);

  // fuga (alul + jobbra) és élfény (felül + balra)
  ctx.fillStyle = grout;
  ctx.fillRect(px, py + TS - 2, TS, 2);
  ctx.fillRect(px + TS - 2, py, 2, TS);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(px, py, TS, 1.5);
  ctx.fillRect(px, py, 1.5, TS);

  // antikolás: sötét foltok/pecsétek a csempék ~55%-án
  if (h2 < 0.55) {
    const blots = 1 + Math.floor(h3 * 3);
    for (let i = 0; i < blots; i++) {
      const bx = px + 5 + hash2(col + i * 2, row * 3 + 9) * (TS - 10);
      const by = py + 5 + hash2(col * 3 + 9, row + i * 2) * (TS - 10);
      const br = 2.5 + hash2(col + i * 5, row + i * 7) * 7;
      ctx.fillStyle = `rgba(0,0,0,${0.05 + hash2(col + i, row + i) * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(bx, by, br, br * 0.78, 0, 0, TAU);
      ctx.fill();
    }
  }

  // repedés a csempék ~30%-án (egyedi, csempén belül)
  if (h3 > 0.76) drawTileCrack(ctx, px, py, TS, col, row);

  // kitört csempe ~4%: sarokból hiányzó darab → sötét mélyedés
  if (h4 > 0.955) drawBrokenTile(ctx, px, py, TS, col, row, theme);
}

/** Valódibb repedés: elvékonyodó (orsó alakú), szabálytalan, esetenként
 *  elágazó — a (col,row) hashből stabil, nem villog. */
function drawTileCrack(
  ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, col: number, row: number,
): void {
  // fő repedés középvonala: belép fent, lefelé sodródik
  const n = 5;
  const main: Array<{ x: number; y: number }> = [{ x: px + (0.15 + hash2(col, row) * 0.7) * TS, y: py + 1 }];
  for (let i = 1; i <= n; i++) {
    const prev = main[i - 1]!;
    main.push({
      x: clamp(prev.x + (hash2(col + i, row * 2 + i) - 0.5) * TS * 0.5, px + 2, px + TS - 2),
      y: py + (TS / n) * i,
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  crackPoly(ctx, main, 1.3);

  // ~fele esetben rövid elágazás egy belső csomópontból
  if (hash2(col * 5 + 2, row * 5 + 3) > 0.5) {
    const j = 1 + Math.floor(hash2(col, row * 3) * (main.length - 2));
    const bp = main[j]!;
    const ang = (hash2(col * 7, row * 7) - 0.5) * 1.6 + Math.PI / 2;
    const blen = TS * (0.18 + hash2(col, row) * 0.18);
    const branch: Array<{ x: number; y: number }> = [{ x: bp.x, y: bp.y }];
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      branch.push({
        x: clamp(bp.x + Math.cos(ang) * blen * t + (hash2(col + i, row + i) - 0.5) * 3, px + 2, px + TS - 2),
        y: clamp(bp.y + Math.sin(ang) * blen * t + (hash2(col - i, row - i) - 0.5) * 3, py + 2, py + TS - 2),
      });
    }
    crackPoly(ctx, branch, 0.8);
  }

  // a repedés egyik szélén megcsillanó él (vésett mélység)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(main[0]!.x + 0.6, main[0]!.y);
  for (let i = 1; i < main.length; i++) ctx.lineTo(main[i]!.x + 0.6, main[i]!.y);
  ctx.stroke();
}

/** Orsó alakú (két végén elvékonyodó) sáv egy középvonal mentén, kitöltve. */
function crackPoly(
  ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>, maxW: number,
): void {
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const w = Math.sin(t * Math.PI) * maxW + 0.15; // a végeken ~0, középen max
    const a = pts[Math.min(i + 1, pts.length - 1)]!;
    const b = pts[Math.max(i - 1, 0)]!;
    const tx = a.x - b.x, ty = a.y - b.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    left.push({ x: pts[i]!.x + nx * w, y: pts[i]!.y + ny * w });
    right.push({ x: pts[i]!.x - nx * w, y: pts[i]!.y - ny * w });
  }
  ctx.beginPath();
  ctx.moveTo(left[0]!.x, left[0]!.y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();
  ctx.fill();
}

/** Kitört csempe: a csempe egyik SARKÁBÓL hiányzó darab — két éle a csempe
 *  szélén fut, a befelé eső határ szabálytalan; sötét mélyedés, megcsillanó
 *  törött peremmel. */
function drawBrokenTile(
  ctx: CanvasRenderingContext2D, px: number, py: number, TS: number, col: number, row: number, theme: Theme,
): void {
  const corner = Math.floor(hash2(col, row) * 4); // 0:BF 1:JF 2:JA 3:BA
  const ox = corner === 1 || corner === 2 ? px + TS : px;
  const oy = corner >= 2 ? py + TS : py;
  const sx = ox === px ? 1 : -1; // befelé x
  const sy = oy === py ? 1 : -1; // befelé y
  const size = TS * (0.28 + hash2(col * 2, row * 2) * 0.2);

  ctx.beginPath();
  ctx.moveTo(ox + sx * size, oy);
  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const jit = (hash2(col * 3 + i, row * 3 + i) - 0.5) * size * 0.4;
    ctx.lineTo(ox + sx * size * (1 - t) + jit, oy + sy * size * t + jit);
  }
  ctx.lineTo(ox, oy + sy * size);
  ctx.lineTo(ox, oy);
  ctx.closePath();

  ctx.fillStyle = shade(theme.floor, -0.4);
  ctx.fill();
  // a befelé eső törött él megcsillan (mélységérzet)
  ctx.strokeStyle = 'rgba(255,250,235,0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ── Pocsolyák ────────────────────────────────────────────────────────────────

/** Halvány, átlátszó pocsolyák a padlón (szobánként stabil a gx/gy seedből). */
export function drawPuddles(ctx: CanvasRenderingContext2D, rc: Rect, room: Room, isBlocked: Blocked): void {
  const seed = room.gx * 131 + room.gy * 57;
  const count = Math.floor(hash2(seed, 1) * 3); // 0..2 pocsolya
  if (count === 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rc.x, rc.y, rc.w, rc.h);
  ctx.clip();
  for (let i = 0; i < count; i++) {
    const cx = rc.x + 70 + hash2(seed + i, 3) * (rc.w - 140);
    const cy = rc.y + 70 + hash2(seed, i + 7) * (rc.h - 140);
    if (isBlocked(cx, cy)) continue;
    const w = 28 + hash2(seed + i, 11) * 42;
    const h = w * (0.5 + hash2(seed + i, 13) * 0.22);
    const ps = seed + i * 17;
    // mélyebb, sötét közép — szabálytalan paca
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    blobPath(ctx, cx, cy, w, h, ps);
    ctx.fill();
    // hideg, halvány víztükör (ugyanaz a forma, kicsit beljebb)
    ctx.fillStyle = 'rgba(120,150,180,0.07)';
    blobPath(ctx, cx, cy, w * 0.84, h * 0.84, ps);
    ctx.fill();
    // halvány csúcsfény (tükröződés, bal-felül)
    ctx.fillStyle = 'rgba(210,225,245,0.06)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.26, cy - h * 0.26, w * 0.26, h * 0.15, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Szabálytalan, lágy zárt görbe (paca/blob) cx,cy körül, a seedből stabil. */
function blobPath(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number,
): void {
  const n = 9;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = 0.55 + hash2(seed + i * 3, seed * 2 + i) * 0.6; // 0.55×–1.15× sugár
    pts.push({ x: cx + Math.cos(a) * rx * rr, y: cy + Math.sin(a) * ry * rr });
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const curr = pts[i % n]!;
    const next = pts[(i + 1) % n]!;
    const mx = (curr.x + next.x) / 2, my = (curr.y + next.y) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
  }
  ctx.closePath();
}

// ── Vérfoltok ────────────────────────────────────────────────────────────────

/**
 * Gore-paletta egy ellenfél színéből: hue-azonos, de sötétebb, kissé
 * telítetlen (`sat`: 1 = eredeti, 0 = szürke) és enyhén vér (vörös) felé
 * tolt — így az élénk ellenfél-színek is hihető zsigeri pacává válnak.
 * `darken` > 1 világosít (a nedves csúcsfényhez).
 */
function goreColor(hex: string, darken: number, sat: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = 0.299 * r + 0.587 * g + 0.114 * b; // luminancia a telítetlenítéshez
  r += (l - r) * (1 - sat);
  g += (l - g) * (1 - sat);
  b += (l - b) * (1 - sat);
  r = Math.min(255, r * darken + 16); // enyhe vér-árnyalat
  g = Math.min(255, g * darken);
  b = Math.min(255, b * darken);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Maradandó vérfoltok a padlón (ellenfél-halálnál keletkeznek). */
export function drawSplats(ctx: CanvasRenderingContext2D, room: Room): void {
  ctx.save();
  for (const s of room.splats) {
    const seed = Math.round(s.x) * 13 + Math.round(s.y) * 7;
    // gore-paletta az ellenfél színéből: hue-azonos, de sötétebb, kissé
    // telítetlen és vér felé tolt — így zsigeri, nem festék-szerű.
    const edge = goreColor(s.color, 0.4, 0.68);
    const body = goreColor(s.color, 0.55, 0.74);
    const core = goreColor(s.color, 0.72, 0.84);
    const sheen = goreColor(s.color, 1.3, 0.45);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);

    // 1) szórt cseppek a tócsa körül (fröccs)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = edge;
    const drops = 6 + Math.floor(hash2(seed, 1) * 6);
    for (let i = 0; i < drops; i++) {
      const a = hash2(seed + i, 2) * TAU;
      const d = s.size * (1.0 + hash2(seed + i, 3) * 1.3);
      const dr = s.size * (0.06 + hash2(seed + i, 4) * 0.14);
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.8, dr, dr * (0.6 + hash2(seed + i, 5) * 0.5), a, 0, TAU);
      ctx.fill();
    }
    // irányított fröccs-csíkok (vastag a tócsánál, hegyes a végén, végén pöttyel)
    const streaks = 2 + Math.floor(hash2(seed, 6) * 3);
    for (let i = 0; i < streaks; i++) {
      const len = s.size * (1.1 + hash2(seed + i, 8) * 1.1);
      ctx.save();
      ctx.rotate(hash2(seed + i, 7) * TAU);
      ctx.beginPath();
      ctx.moveTo(s.size * 0.5, -s.size * 0.08);
      ctx.quadraticCurveTo(len * 0.6, -s.size * 0.03, len, 0);
      ctx.quadraticCurveTo(len * 0.6, s.size * 0.03, s.size * 0.5, s.size * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(len, 0, s.size * 0.05, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 2) fő tócsa — szabálytalan paca, sötét perem
    ctx.globalAlpha = 0.44;
    ctx.fillStyle = body;
    blobPath(ctx, 0, 0, s.size, s.size * 0.78, seed);
    ctx.fill();
    // nedves, kicsit gazdagabb belső mag
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = core;
    blobPath(ctx, 0, 0, s.size * 0.66, s.size * 0.52, seed + 99);
    ctx.fill();

    // 3) cafatok: 2–3 leszakadt kisebb paca a fő tócsa körül
    const lobes = 2 + Math.floor(hash2(seed, 9) * 2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = edge;
    for (let i = 0; i < lobes; i++) {
      const a = hash2(seed + i, 10) * TAU;
      const d = s.size * (0.7 + hash2(seed + i, 11) * 0.6);
      const lr = s.size * (0.16 + hash2(seed + i, 12) * 0.22);
      blobPath(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.8, lr, lr * 0.85, seed + i * 7 + 3);
      ctx.fill();
    }

    // 4) nedves csúcsfény a fő tócsán
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.ellipse(-s.size * 0.2, -s.size * 0.18, s.size * 0.26, s.size * 0.14, -0.5, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
}

// ── Dekorációk ───────────────────────────────────────────────────────────────

/** Téma-függő, átjárható apró dekoráció (fűcsomó / pókháló / kavics / kristály). */
export function drawDecorations(ctx: CanvasRenderingContext2D, room: Room, theme: Theme, isBlocked: Blocked): void {
  const th = theme;
  const time = performance.now() / 1000;

  ctx.save();
  for (const d of room.decorations) {
    if (isBlocked(d.x, d.y)) continue;

    ctx.save();
    ctx.translate(d.x, d.y);

    if (th.floor === '#1b2a24') {
      // ÜREG — hajladozó fűcsomó
      ctx.rotate(Math.sin(time * 1.6 + d.x * 0.05) * 0.14);
      ctx.strokeStyle = shade(th.floor, 0.24);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * d.size * 0.3, 0);
        ctx.quadraticCurveTo(i * d.size * 0.45, -d.size * 0.6, i * d.size * 0.6 + d.size * 0.12, -d.size);
        ctx.stroke();
      }
    } else if (th.floor === '#241d2a') {
      // PINCE — pókháló vagy apró kavicsok
      ctx.rotate(d.rot);
      if (d.type === 0) {
        // többféle pókháló: változó méret, küllő-/gyűrűszám, néha szakadt szektor
        const hx = Math.round(d.x), hy = Math.round(d.y);
        const ws = d.size * (0.5 + hash2(hx, hy) * 2.4);       // ~0.5×–2.9×
        const spokes = 5 + Math.floor(hash2(hx + 1, hy) * 3);  // 5..7
        const rings = 2 + Math.floor(hash2(hx, hy + 1) * 2);   // 2..3
        const tear = hash2(hx + 2, hy + 2) > 0.55 ? Math.floor(hash2(hx, hy + 3) * spokes) : -1;
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        // küllők
        ctx.beginPath();
        for (let i = 0; i < spokes; i++) {
          if (i === tear) continue;
          const a = (i / spokes) * TAU;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * ws, Math.sin(a) * ws);
        }
        ctx.stroke();
        // gyűrűk: a küllők közt megereszkedett (belógó) selyemívek
        ctx.beginPath();
        for (let r = 1; r <= rings; r++) {
          const rr = (r / rings) * ws;
          for (let i = 0; i < spokes; i++) {
            if (i === tear || (i + 1) % spokes === tear) continue;
            const a0 = (i / spokes) * TAU, a1 = ((i + 1) / spokes) * TAU, am = (a0 + a1) / 2;
            ctx.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
            ctx.quadraticCurveTo(Math.cos(am) * rr * 0.78, Math.sin(am) * rr * 0.78, Math.cos(a1) * rr, Math.sin(a1) * rr);
          }
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(th.floor, 0.14);
        ctx.strokeStyle = shade(th.floor, -0.22);
        ctx.lineWidth = 1;
        const pebbles: Array<[number, number, number]> = [[-d.size * 0.3, 0, 0.5], [d.size * 0.25, d.size * 0.15, 0.4], [0, -d.size * 0.2, 0.32]];
        for (const [ox, oy, s] of pebbles) {
          ctx.beginPath();
          ctx.ellipse(ox, oy, d.size * s, d.size * s * 0.7, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else {
      // MÉLYSÉG — izzó kristály
      ctx.rotate(d.rot);
      ctx.shadowColor = th.bossColor;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = shade(th.bossColor, -0.1);
      ctx.beginPath();
      ctx.moveTo(0, -d.size); ctx.lineTo(d.size * 0.42, 0); ctx.lineTo(0, d.size); ctx.lineTo(-d.size * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(0, -d.size); ctx.lineTo(d.size * 0.2, -d.size * 0.2); ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ── Szerencse-szoba padlója ──────────────────────────────────────────────────

/**
 * SZERENCSE-SZOBA padlója: csiszolt sötét-indigó márvány meleg arany
 * szerencse-kerék mandalával a közép alatt. Tiszta (nincs kosz/repedés),
 * a fény középre húz — érződik, hogy itt a szerencse a főszereplő.
 */
/**
 * A szerencse-padló STATIKUS rétege (márvány + csempe + fuga + mandala + fény).
 * Nem függ az időtől → a `FloorCache` egyszer off-screen canvasra süti, majd
 * frame-enként csak egy `drawImage`. A lassan forgó belső csillag a `drawLuckSpinner`.
 */
export function drawLuckFloor(ctx: CanvasRenderingContext2D, rc: Rect, cx: number, cy: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rc.x, rc.y, rc.w, rc.h);
  ctx.clip();

  // 1) csiszolt márvány alap — középen melegebb, a szélek felé mélyül
  const base = ctx.createRadialGradient(cx, cy, 24, cx, cy, Math.max(rc.w, rc.h) * 0.72);
  base.addColorStop(0, '#2c2e4c');
  base.addColorStop(0.55, '#202239');
  base.addColorStop(1, '#141527');
  ctx.fillStyle = base;
  ctx.fillRect(rc.x, rc.y, rc.w, rc.h);

  // 2) nagy márványcsempék vékony arany fugával (tiszta, repedés nélkül)
  const TS = 72;
  let c0 = 0;
  for (let px = rc.x; px < rc.x + rc.w; px += TS, c0++) {
    let r0 = 0;
    for (let py = rc.y; py < rc.y + rc.h; py += TS, r0++) {
      const h = hash2(c0, r0);
      const checker = (c0 + r0) % 2 === 0 ? 0.05 : -0.035;
      ctx.fillStyle = shade('#232540', checker + (h - 0.5) * 0.05);
      ctx.fillRect(px, py, TS, TS);
      // finom diagonális erezet
      ctx.strokeStyle = `rgba(255,255,255,${0.015 + h * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + TS * 0.2, py + TS);
      ctx.lineTo(px + TS, py + TS * 0.2);
      ctx.stroke();
    }
  }
  // arany fuga
  ctx.strokeStyle = 'rgba(214,176,92,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let px = rc.x; px <= rc.x + rc.w; px += TS) { ctx.moveTo(px, rc.y); ctx.lineTo(px, rc.y + rc.h); }
  for (let py = rc.y; py <= rc.y + rc.h; py += TS) { ctx.moveTo(rc.x, py); ctx.lineTo(rc.x + rc.w, py); }
  ctx.stroke();

  // 3) szerencse-kerék mandala (statikus rész)
  drawFortuneMandala(ctx, cx, cy, Math.min(rc.w, rc.h) * 0.46);

  // 4) meleg arany fény a közép felett + lágy szél-elsötétülés
  const warm = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(rc.w, rc.h) * 0.5);
  warm.addColorStop(0, 'rgba(255,214,120,0.10)');
  warm.addColorStop(0.6, 'rgba(255,214,120,0.03)');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(rc.x, rc.y, rc.w, rc.h);

  const edge = ctx.createRadialGradient(cx, cy, rc.h * 0.28, cx, cy, rc.w * 0.72);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = edge;
  ctx.fillRect(rc.x, rc.y, rc.w, rc.h);

  ctx.restore();
}

/** A padló közepére rajzolt arany szerencse-kerék (gyűrűk, küllők, szektorok, csillagok). Statikus. */
function drawFortuneMandala(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.save();
  ctx.translate(cx, cy);

  const gold = 'rgba(214,176,92,';

  // váltakozó szerencse-kerék szektorok (belső korong)
  const sectors = 12;
  const r0 = R * 0.2;
  const r1 = R * 0.52;
  for (let i = 0; i < sectors; i++) {
    const a0 = (i / sectors) * TAU - Math.PI / 2;
    const a1 = ((i + 1) / sectors) * TAU - Math.PI / 2;
    ctx.fillStyle = i % 2 === 0 ? `${gold}0.10)` : 'rgba(90,200,180,0.06)';
    ctx.beginPath();
    ctx.arc(0, 0, r1, a0, a1);
    ctx.arc(0, 0, r0, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  }

  // koncentrikus arany gyűrűk
  for (const [rr, w, a] of [[r0, 2, 0.55], [r1, 2.5, 0.5], [R * 0.74, 1.6, 0.4], [R, 2.2, 0.34]] as Array<[number, number, number]>) {
    ctx.strokeStyle = `${gold}${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, TAU);
    ctx.stroke();
  }

  // küllők (a kerék osztásai) — kifelé a külső gyűrűig
  ctx.strokeStyle = `${gold}0.22)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < sectors; i++) {
    const a = (i / sectors) * TAU - Math.PI / 2;
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  ctx.stroke();

  // csillag-berakások a 0.74R gyűrű mentén
  const stars = 12;
  ctx.fillStyle = `${gold}0.5)`;
  for (let i = 0; i < stars; i++) {
    const a = (i / stars) * TAU - Math.PI / 2 + Math.PI / stars;
    const sx = Math.cos(a) * R * 0.74;
    const sy = Math.sin(a) * R * 0.74;
    diamond(ctx, sx, sy, 5, 8);
  }

  ctx.restore();
}

/**
 * A szerencse-kerék közepén lassan forgó csillám-csillag - az EGYETLEN animált
 * elem a szerencse-padlón, ezért ezt rajzoljuk élőben (a többi cache-ből jön).
 */
export function drawLuckSpinner(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number): void {
  const r0 = R * 0.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.06);
  ctx.strokeStyle = 'rgba(214,176,92,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r0 * 0.8, Math.sin(a) * r0 * 0.8);
  }
  ctx.stroke();
  ctx.restore();
}

/** Kis tömör arany rombusz (mandala-berakáshoz). */
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w, y);
  ctx.closePath();
  ctx.fill();
}
