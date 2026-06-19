// ════════════════════════════════════════════════════════════════════════
//  Tárgy- és képesség-ikonok (procedurális, animált) - a Kódexhez + adminhoz
// ════════════════════════════════════════════════════════════════════════
//
// Tiszta canvas-rajzolók (ctx + pozíció + sugár + idő), pont mint a `drawEnemy`:
// nincs játék-függőség, így a játékos-facing Kódex és az admin-előnézet is hívja.
// Minden perknek és aktív skillnek SAJÁT, kódból rajzolt animált motívuma van
// (nem kép-asset). A `t` másodperc-alapú idő; a niche-rács t=0-val statikus pózt
// kér, a részletező-canvas folyamatosan animál.
//
// A motívumok a perk/skill TÉMÁJÁT idézik (Ember Tear = lángoló könnycsepp,
// Frost Shard = jégszilánk, Time Slow = óra...), nem csak a tabletta-formát.

import { shade } from '../../engine/math';

const TAU = Math.PI * 2;

// ──────────────────────────────────────────────────────────────────────
//  Közös primitívek
// ──────────────────────────────────────────────────────────────────────

/** Lágy radiális háttér-ragyogás (a motívum „kiemelése" a sötét fülkén). */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a = 0.5): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Klasszikus könnycsepp-alak (hegyes teteje fel), kitöltve + felfénnyel. */
function teardrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, col2: string): void {
  ctx.save();
  ctx.translate(x, y);
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, shade(col, 0.25));
  grad.addColorStop(1, col2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.78, r * 0.8, 0, r);
  ctx.bezierCurveTo(-r * 0.78, r * 0.8, -r * 0.9, -r * 0.2, 0, -r);
  ctx.fill();
  // felfény
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, r * 0.05, r * 0.18, r * 0.34, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Sokszög-drágakő (faceted gem): `sides` oldal, felső-alsó felfény-háromszögek. */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number, col: string, col2: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU - Math.PI / 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, shade(col, 0.3));
  grad.addColorStop(1, col2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = shade(col, 0.5);
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  // belső csillanás
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.65);
  ctx.lineTo(r * 0.32, 0);
  ctx.lineTo(0, r * 0.1);
  ctx.lineTo(-r * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Szem (mandulaforma + írisz + pupilla + csillanás). `look` a tekintet iránya. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, iris: string, look = 0): void {
  ctx.save();
  ctx.translate(x, y);
  // fehérje
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, TAU);
  ctx.fill();
  // írisz
  const ox = Math.cos(look) * r * 0.28, oy = Math.sin(look) * r * 0.18;
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(ox, oy, r * 0.42, 0, TAU);
  ctx.fill();
  // pupilla
  ctx.fillStyle = '#16121c';
  ctx.beginPath();
  ctx.arc(ox, oy, r * 0.2, 0, TAU);
  ctx.fill();
  // csillanás
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(ox - r * 0.12, oy - r * 0.12, r * 0.08, 0, TAU);
  ctx.fill();
  // körvonal
  ctx.strokeStyle = 'rgba(20,16,28,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Lobogó láng (alulról fel keskenyedő), `seed`+`t` adja a flickert. */
function flame(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, col: string, core: string, seed = 0): void {
  const fl = Math.sin(t * 9 + seed) * 0.12 + Math.sin(t * 17 + seed) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + fl, 1 - fl * 0.5);
  const grad = ctx.createLinearGradient(0, r * 0.8, 0, -r * 1.2);
  grad.addColorStop(0, shade(col, -0.2));
  grad.addColorStop(0.5, col);
  grad.addColorStop(1, core);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(r * 0.9, r * 0.4, r * 0.5, -r * 0.3, r * 0.18, -r * 0.7);
  ctx.bezierCurveTo(r * 0.05, -r * 1.05, -r * 0.05, -r * 1.05, -r * 0.05, -r * 1.2);
  ctx.bezierCurveTo(-r * 0.3, -r * 0.7, -r * 0.9, r * 0.3, 0, r * 0.9);
  ctx.fill();
  ctx.restore();
}

/** Négyágú szikra-csillag (sparkle), `s` a fél-méret. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
  ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
  ctx.fill();
  ctx.restore();
}

/** Cikcakk villám-ív két pont közt (n szegmens), enyhe oldal-jitterrel. */
function bolt(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, col: string, jitter: number, seed: number): void {
  const n = 5;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.shadowColor = col;
  ctx.shadowBlur = w * 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const mx = x0 + (x1 - x0) * f, my = y0 + (y1 - y0) * f;
    const off = (i === n) ? 0 : Math.sin(seed + i * 2.3) * jitter;
    ctx.lineTo(mx + off, my - off * 0.4);
  }
  ctx.stroke();
  ctx.restore();
}

// ──────────────────────────────────────────────────────────────────────
//  PERK-ikonok (név szerint). Mind középre, (x,y) köré, r sugárra rajzol.
// ──────────────────────────────────────────────────────────────────────

type IconFn = (ctx: CanvasRenderingContext2D, r: number, t: number, col: string, col2: string) => void;

const PERK_ICONS: Record<string, IconFn> = {
  // ── Alap statok ──────────────────────────────────────────────
  'Sharp Tear': (ctx, r, t, col, col2) => {
    teardrop(ctx, 0, r * 0.05, r * 0.78, col, col2);
    // sweeppelő penge-csillanás
    const sw = (Math.sin(t * 2) * 0.5 + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.6 + sw * 0.4;
    sparkle(ctx, -r * 0.2 + sw * r * 0.4, -r * 0.3, r * 0.22, '#fff');
    ctx.restore();
  },
  'Spider Leg': (ctx, r, t, col, col2) => {
    const fl = Math.sin(t * 3) * 0.3;
    ctx.save();
    ctx.strokeStyle = col2;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.6);
      ctx.lineTo(dir * r * 0.4, r * 0.1 + fl * r);
      ctx.lineTo(dir * r * 0.78, -r * 0.5 - fl * r * 0.5);
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, r * 0.6, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
  'Rainstone': (ctx, r, t, col, col2) => {
    gem(ctx, 0, 0, r * 0.6, 6, 0, col, col2);
    ctx.save();
    ctx.strokeStyle = 'rgba(180,220,255,0.8)';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.6 + i * 0.25) % 1;
      const rx = -r * 0.7 + i * r * 0.46;
      const ry = -r + ph * r * 2;
      ctx.globalAlpha = 0.8 - ph * 0.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx, ry + r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  },
  'Spyglass': (ctx, r, t, col, col2) => {
    ctx.save();
    ctx.rotate(-0.5 + Math.sin(t * 1.5) * 0.05);
    // cső
    ctx.fillStyle = col2;
    ctx.fillRect(-r * 0.9, -r * 0.22, r * 1.5, r * 0.44);
    ctx.fillStyle = col;
    ctx.fillRect(r * 0.55, -r * 0.3, r * 0.32, r * 0.6);
    // lencse-csillanás
    ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(t * 3) * 0.3})`;
    ctx.beginPath();
    ctx.arc(r * 0.71, 0, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
  'Flywheel': (ctx, r, t, col, col2) => {
    ctx.save();
    ctx.rotate(t * 2.2);
    ctx.fillStyle = col;
    const teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU;
      const rr = i % 2 === 0 ? r * 0.78 : r * 0.55;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1620';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
  'Twin Drop': (ctx, r, t, col, col2) => {
    teardrop(ctx, -r * 0.36, Math.sin(t * 3) * r * 0.08, r * 0.5, col, col2);
    teardrop(ctx, r * 0.36, Math.sin(t * 3 + Math.PI) * r * 0.08, r * 0.5, col, col2);
  },
  'Blood Heart': (ctx, r, t, col, col2) => {
    const beat = 1 + Math.max(0, Math.sin(t * 4)) * 0.12;
    ctx.save();
    ctx.scale(beat, beat);
    heart(ctx, r * 0.78, col, col2);
    ctx.restore();
  },
  'Horseshoe': (ctx, r, t, col, col2) => {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.stroke();
    ctx.strokeStyle = col2;
    ctx.lineWidth = r * 0.1;
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * (TAU / 3);
      sparkle(ctx, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75 - r * 0.2, r * 0.12, '#eaffe0');
    }
  },
  'Lantern': (ctx, r, t, col, col2) => {
    const fk = 0.7 + Math.sin(t * 11) * 0.1 + Math.sin(t * 23) * 0.06;
    glow(ctx, 0, 0, r * 1.1, col, fk * 0.6);
    ctx.save();
    // keret
    ctx.fillStyle = col2;
    ctx.fillRect(-r * 0.45, -r * 0.7, r * 0.9, r * 1.4);
    // ablak
    ctx.fillStyle = `rgba(255,230,150,${fk})`;
    ctx.fillRect(-r * 0.3, -r * 0.5, r * 0.6, r * 1.0);
    // fogó
    ctx.strokeStyle = col2;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.3, Math.PI, TAU);
    ctx.stroke();
    ctx.restore();
  },
  'Dark Veil': (ctx, r, t, _col, col2) => {
    const sway = Math.sin(t * 1.5) * 0.06;
    ctx.save();
    ctx.rotate(sway);
    // csuklya
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.bezierCurveTo(r * 0.9, -r * 0.6, r * 0.7, r * 0.8, 0, r * 0.85);
    ctx.bezierCurveTo(-r * 0.7, r * 0.8, -r * 0.9, -r * 0.6, 0, -r * 0.85);
    ctx.fill();
    // belső árnyék
    ctx.fillStyle = '#0c0a12';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.42, r * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // izzó szem
    const eg = 0.6 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = `rgba(255,217,106,${eg})`;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.16, r * 0.09, 0, 0, TAU);
    ctx.fill();
  },
  'War Mark': (ctx, r, t, col, col2) => {
    glow(ctx, 0, 0, r, col, 0.4 + Math.sin(t * 4) * 0.2);
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(0, r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = shade(col2, 0.3);
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(0, r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  'Winged Sandal': (ctx, r, t, col, col2) => {
    const flap = Math.sin(t * 8) * 0.4;
    wing(ctx, -r * 0.1, -r * 0.1, r * 0.7, -1, flap, col);
    wing(ctx, r * 0.1, -r * 0.1, r * 0.7, 1, flap, col);
    // talp/szandál
    ctx.save();
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.4);
    ctx.lineTo(r * 0.55, r * 0.4);
    ctx.quadraticCurveTo(r * 0.7, r * 0.4, r * 0.6, r * 0.62);
    ctx.lineTo(-r * 0.45, r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // ── Lövés-perkek ─────────────────────────────────────────────
  'Triple Tear': (ctx, r, t, col, col2) => {
    const b = Math.sin(t * 3) * r * 0.06;
    teardrop(ctx, -r * 0.45, b + r * 0.12, r * 0.4, col, col2);
    teardrop(ctx, 0, -b, r * 0.46, col, col2);
    teardrop(ctx, r * 0.45, b + r * 0.12, r * 0.4, col, col2);
  },
  'Buckshot Eye': (ctx, r, t, col, col2) => {
    eye(ctx, 0, -r * 0.1, r * 0.55, col2, Math.sin(t) * 0.5);
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.32;
      const d = r * 0.5 + ((t * 1.3 + i * 0.2) % 1) * r * 0.6;
      ctx.globalAlpha = 1 - ((t * 1.3 + i * 0.2) % 1);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d + r * 0.3, r * 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  'Needle Point': (ctx, r, t, col, col2) => {
    const thrust = Math.sin(t * 4) * r * 0.12;
    ctx.save();
    ctx.translate(thrust, -thrust);
    ctx.rotate(-Math.PI / 4);
    // tű
    ctx.fillStyle = col2;
    ctx.fillRect(-r * 0.08, -r * 0.1, r * 0.16, r * 1.1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.1);
    ctx.lineTo(r * 0.12, -r * 0.1);
    ctx.lineTo(0, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    // fok
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85, r * 0.13, r * 0.2, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    sparkle(ctx, r * 0.5 + thrust, -r * 0.5 - thrust, r * 0.14, '#fff');
  },
  'Rubber Wall': (ctx, r, t, col, col2) => {
    const sq = Math.abs(Math.sin(t * 4));
    const sx = 1 + sq * 0.22, sy = 1 - sq * 0.22;
    const drop = (1 - sy) * r * 0.5;
    ctx.save();
    ctx.translate(0, drop);
    ctx.scale(sx, sy);
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 0.7);
    grad.addColorStop(0, shade(col, 0.3));
    grad.addColorStop(1, col2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
  "Hunter's Eye": (ctx, r, t, col, col2) => {
    eye(ctx, 0, 0, r * 0.5, col2, t * 2);
    // forgó célkereszt
    ctx.save();
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(0, -r * 0.95);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  'Ghost Tear': (ctx, r, t, col, col2) => {
    const fade = 0.55 + Math.sin(t * 2) * 0.25;
    const fl = Math.sin(t * 3) * r * 0.08;
    ctx.save();
    ctx.globalAlpha = fade;
    teardrop(ctx, fl, -r * 0.05, r * 0.66, col, col2);
    // hullámzó alsó köd-fonál
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.5);
    ctx.quadraticCurveTo(fl, r * 0.9, r * 0.3, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.7, -r * 0.3, r * 0.5);
    ctx.fill();
    ctx.restore();
  },
  'Shrapnel Drop': (ctx, r, t, col, col2) => {
    const ph = (t * 1.2) % 1;
    if (ph < 0.6) {
      teardrop(ctx, 0, 0, r * 0.66, col, col2);
    } else {
      const e = (ph - 0.6) / 0.4;
      ctx.save();
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const d = e * r * 0.8;
        ctx.globalAlpha = 1 - e;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        ctx.lineTo(Math.cos(a) * d + r * 0.12, Math.sin(a) * d - r * 0.16);
        ctx.lineTo(Math.cos(a) * d - r * 0.1, Math.sin(a) * d - r * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },
  'Knockback Tear': (ctx, r, t, col, col2) => {
    // lökéshullám-gyűrűk
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.5 + i / 3) % 1;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.8 * (1 - ph);
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, ph * r * 0.9, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    teardrop(ctx, 0, 0, r * 0.4, shade(col, 0.2), col2);
  },

  // ── Elemi könnyek ────────────────────────────────────────────
  'Ember Tear': (ctx, r, t, col, col2) => {
    flame(ctx, 0, r * 0.2, r * 0.62, t, '#ff7a2a', '#ffd24a', 0.6);
    teardrop(ctx, 0, r * 0.05, r * 0.42, col, col2);
  },
  'Venom Drop': (ctx, r, t, col, col2) => {
    teardrop(ctx, 0, -r * 0.1, r * 0.6, col, col2);
    // csöpögő bead
    const ph = (t * 1.1) % 1;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, r * 0.45 + ph * r * 0.5, r * 0.13 * (1 - ph * 0.4), 0, TAU);
    ctx.fill();
  },
  'Frost Shard': (ctx, r, t, col) => {
    ctx.save();
    ctx.rotate(Math.sin(t * 1.2) * 0.15);
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(0, r * 0.8);
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(r * 0.22, -r * 0.7);
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(-r * 0.22, -r * 0.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    const tw = 0.5 + Math.sin(t * 5) * 0.5;
    sparkle(ctx, r * 0.3, -r * 0.3, r * 0.12 * tw, '#eaffff');
  },
  'Lightning Eye': (ctx, r, t, col) => {
    eye(ctx, 0, -r * 0.15, r * 0.5, col, Math.sin(t * 2) * 0.4);
    if (Math.sin(t * 6) > 0.3) {
      bolt(ctx, 0, r * 0.2, r * 0.1, r * 0.9, r * 0.1, col, r * 0.18, t * 10);
    }
  },

  // ── Alternatív lőmódok ───────────────────────────────────────
  'Sulfur Beam': (ctx, r, t, col, col2) => {
    gem(ctx, 0, r * 0.4, r * 0.42, 6, 0, col, col2);
    const len = 0.7 + Math.sin(t * 14) * 0.12;
    const grad = ctx.createLinearGradient(0, r * 0.3, 0, -r * len * 1.4);
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(255,90,42,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-r * 0.18, -r * len * 1.4, r * 0.36, r * len * 1.7);
    ctx.fillStyle = `rgba(255,240,180,${0.6 + Math.sin(t * 20) * 0.3})`;
    ctx.fillRect(-r * 0.07, -r * len * 1.4, r * 0.14, r * len * 1.7);
  },
  'Hellfire Breath': (ctx, r, t, col) => {
    ctx.save();
    ctx.translate(0, r * 0.55);
    for (let i = -2; i <= 2; i++) {
      flame(ctx, i * r * 0.22, -Math.abs(i) * r * 0.12, r * 0.34, t, col, '#ffe08a', i + 1);
    }
    ctx.restore();
  },
  'Charged Shot': (ctx, r, t, col) => {
    const pulse = (t * 0.8) % 1;
    for (let i = 0; i < 2; i++) {
      const ph = (pulse + i / 2) % 1;
      ctx.strokeStyle = col;
      ctx.globalAlpha = ph;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, (1 - ph) * r * 0.9, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const cr = r * (0.32 + Math.sin(t * 6) * 0.05);
    glow(ctx, 0, 0, cr * 1.8, col, 0.7);
    ctx.fillStyle = '#fff7d8';
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.fill();
  },
  'Signet Ring': (ctx, r, t, col, col2) => {
    ctx.save();
    ctx.rotate(t * 1.2);
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.55, 0, TAU);
    ctx.stroke();
    // pecsétkő
    gem(ctx, 0, -r * 0.5, r * 0.3, 4, 0, shade(col, 0.3), col2);
    ctx.restore();
  },

  // ── Kísérők ──────────────────────────────────────────────────
  'Moonstone': (ctx, r, t, col) => {
    // hold-sarló
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(r * 0.28, -r * 0.12, r * 0.52, 0, TAU);
    ctx.fill();
    ctx.restore();
    // keringő orb
    const a = t * 2.2;
    glow(ctx, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.4, '#dffaff', 0.8);
    ctx.fillStyle = '#eaffff';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.12, 0, TAU);
    ctx.fill();
  },
  'Guardian Fly': (ctx, r, t, col, col2) => {
    // pajzs
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(r * 0.5, -r * 0.35);
    ctx.lineTo(r * 0.5, r * 0.2);
    ctx.quadraticCurveTo(r * 0.25, r * 0.7, 0, r * 0.8);
    ctx.quadraticCurveTo(-r * 0.25, r * 0.7, -r * 0.5, r * 0.2);
    ctx.lineTo(-r * 0.5, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(col, 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, TAU);
    ctx.fill();
    // körberepülő légy
    const a = t * 4;
    const fx = Math.cos(a) * r * 0.75, fy = Math.sin(a) * r * 0.55 - r * 0.1;
    ctx.fillStyle = '#16121c';
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    const wf = Math.sin(t * 30) * r * 0.08;
    ctx.beginPath();
    ctx.ellipse(fx - r * 0.08, fy - r * 0.05, r * 0.1, r * 0.05 + Math.abs(wf), 0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + r * 0.08, fy - r * 0.05, r * 0.1, r * 0.05 + Math.abs(wf), -0.5, 0, TAU);
    ctx.fill();
  },
};

/** Szív-alak (Blood Heart / Heal). */
function heart(ctx: CanvasRenderingContext2D, r: number, col: string, col2: string): void {
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, shade(col, 0.25));
  grad.addColorStop(1, col2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.7);
  ctx.bezierCurveTo(-r * 1.1, -r * 0.1, -r * 0.5, -r * 0.85, 0, -r * 0.3);
  ctx.bezierCurveTo(r * 0.5, -r * 0.85, r * 1.1, -r * 0.1, 0, r * 0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.3, r * 0.16, r * 0.24, -0.4, 0, TAU);
  ctx.fill();
}

/** Szárny (Winged Sandal): `dir` ±1 oldal, `flap` a csapkodás. */
function wing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, flap: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(-flap);
  ctx.fillStyle = col;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(r * (0.2 + i * 0.22), -r * (0.1 + i * 0.18), r * 0.3, r * 0.12, -0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ──────────────────────────────────────────────────────────────────────
//  SKILL-ikonok (id szerint)
// ──────────────────────────────────────────────────────────────────────

const SKILL_ICONS: Record<string, IconFn> = {
  nova: (ctx, r, t, col) => {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.4 + i / 3) % 1;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.9 * (1 - ph);
      ctx.lineWidth = r * 0.12 * (1 - ph * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, ph * r * 0.95, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    glow(ctx, 0, 0, r * 0.5, col, 0.8);
    ctx.fillStyle = '#eaf6ff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.16, 0, TAU);
    ctx.fill();
  },
  slow: (ctx, r, t, col, col2) => {
    // óralap
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade(col, 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      ctx.lineTo(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56);
      ctx.stroke();
    }
    // lassan forgó mutató
    ctx.strokeStyle = '#1a1620';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a = t * 0.6;
    ctx.lineTo(Math.cos(a - Math.PI / 2) * r * 0.42, Math.sin(a - Math.PI / 2) * r * 0.42);
    ctx.stroke();
  },
  shield: (ctx, r, t, _col, col2) => {
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.75);
    ctx.lineTo(r * 0.62, -r * 0.42);
    ctx.lineTo(r * 0.62, r * 0.18);
    ctx.quadraticCurveTo(r * 0.3, r * 0.78, 0, r * 0.9);
    ctx.quadraticCurveTo(-r * 0.3, r * 0.78, -r * 0.62, r * 0.18);
    ctx.lineTo(-r * 0.62, -r * 0.42);
    ctx.closePath();
    ctx.fill();
    // csillámló buborék-felület
    const sh = 0.4 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = `rgba(220,250,255,${sh})`;
    ctx.beginPath();
    ctx.ellipse(-r * 0.18, -r * 0.18, r * 0.2, r * 0.3, -0.4, 0, TAU);
    ctx.fill();
  },
  heal: (ctx, r, t, col, col2) => {
    const beat = 1 + Math.max(0, Math.sin(t * 4)) * 0.1;
    ctx.save();
    ctx.scale(beat, beat);
    heart(ctx, r * 0.6, col, col2);
    ctx.restore();
    // felszálló plusz-jelek
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i / 3) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.strokeStyle = '#eaffe8';
      ctx.lineWidth = r * 0.08;
      const px = (i - 1) * r * 0.5, py = r * 0.3 - ph * r * 1.1, s = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(px - s, py); ctx.lineTo(px + s, py);
      ctx.moveTo(px, py - s); ctx.lineTo(px, py + s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  blink: (ctx, r, t, col) => {
    const ph = (t * 1.6) % 1;
    // utánkép-nyilak
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.3 + i * 0.3;
      const dx = -r * 0.5 + i * r * 0.45 + ph * r * 0.3;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(dx - r * 0.2, -r * 0.45);
      ctx.lineTo(dx + r * 0.25, 0);
      ctx.lineTo(dx - r * 0.2, r * 0.45);
      ctx.lineTo(dx - r * 0.02, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    sparkle(ctx, r * 0.55, 0, r * 0.18 * (0.5 + Math.sin(t * 8) * 0.5), '#fff');
  },
};

// ──────────────────────────────────────────────────────────────────────
//  Publikus belépők
// ──────────────────────────────────────────────────────────────────────

/** Van-e dedikált ikon ehhez a perkhez (különben a hívó tabletta-fallbacket rajzol). */
export function hasPerkIcon(name: string): boolean {
  return name in PERK_ICONS;
}

/**
 * Egy perk animált ikonja a (cx,cy) középre, `r` sugárra, `t` másodperc-idővel.
 * A `col`/`col2` a perk tabletta-színe (items.ts). Ismeretlen névre semleges gem.
 */
export function drawPerkIcon(
  ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, r: number, t: number, col: string, col2: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  const fn = PERK_ICONS[name];
  if (fn) fn(ctx, r, t, col, col2);
  else gem(ctx, 0, 0, r * 0.7, 6, t * 0.5, col, col2);
  ctx.restore();
}

/** Egy aktív skill animált ikonja (id: nova/slow/shield/heal/blink). */
export function drawSkillIcon(
  ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, r: number, t: number, col: string, col2: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  const fn = SKILL_ICONS[id];
  if (fn) fn(ctx, r, t, col, col2);
  else gem(ctx, 0, 0, r * 0.7, 5, t * 0.5, col, col2);
  ctx.restore();
}
