import { TAU, shade, random } from '../../engine/math';
import { softGlow } from '../render/glow';

/**
 * Sorslap (kártya/rúna, #46/#47): egyszer-használatos fogyóeszköz, a Fiola (#44)
 * MELLETT egy MÁSODIK, külön zseb (G-gomb). Szemben a fiolával - ami ismeretlen
 * (szín→hatás), véletlen - a Sorslap ISMERT hatású, AZONNALI és EGYSZERI: taktikai
 * „mentőöv", nem szerencsejáték. A hatásokat a meglévő SKILL-könyvtárból (skills.ts)
 * merítjük (DÖNTVE, 0c) - az aktiválás-logika a `World.useCard` switchében él (a
 * `drinkFiola` mintájára), ez a fájl csak az ADATOT + a VIZUÁLT tartja.
 *
 *  - `card` (gyakori, taktikai): a skill-könyvtár 4 hatása egyszeri formában
 *    (Lökés/nova, Dér/slow, Gyógyír/heal, Ugrás/blink).
 *  - `rune` (ritka, erős, #47): Pusztítás (szoba-törlő) + Pajzs (sérthetetlenség,
 *    a shield-skill rokona) - a két „nagy" egyszeri effekt.
 */
export type CardEffect = 'nova' | 'slow' | 'heal' | 'blink' | 'purge' | 'ward';

export interface CardDef {
  id: CardEffect;
  /** Vizuál + ritkaság: `card` = tarot-lap (gyakori), `rune` = vésett kő (ritka, erős). */
  kind: 'card' | 'rune';
  /** i18n-kulcs a felvillanó névhez (HUD-floater) és a Kódexhez. */
  nameKey: string;
  /** i18n-kulcs a rövid leíráshoz. */
  descKey: string;
  /** A lap/kő + glyph + HUD-szám színe (a hatás karaktere). */
  col: string;
  /** Drop-súly a Sorslap-rétegen belül (a rúnák ritkábbak). */
  weight: number;
}

export const CARD_EFFECTS: readonly CardDef[] = [
  { id: 'nova',  kind: 'card', nameKey: 'card.nova.name',  descKey: 'card.nova.desc',  col: '#7fc4ff', weight: 1.0 },
  { id: 'slow',  kind: 'card', nameKey: 'card.slow.name',  descKey: 'card.slow.desc',  col: '#9b8cff', weight: 1.0 },
  { id: 'heal',  kind: 'card', nameKey: 'card.heal.name',  descKey: 'card.heal.desc',  col: '#5cff8f', weight: 0.7 },
  { id: 'blink', kind: 'card', nameKey: 'card.blink.name', descKey: 'card.blink.desc', col: '#ffd36a', weight: 1.0 },
  { id: 'purge', kind: 'rune', nameKey: 'card.purge.name', descKey: 'card.purge.desc', col: '#ff6a4a', weight: 0.4 },
  { id: 'ward',  kind: 'rune', nameKey: 'card.ward.name',  descKey: 'card.ward.desc',  col: '#3df0ff', weight: 0.4 },
];

export const CARD_BY_ID: Record<CardEffect, CardDef> =
  Object.fromEntries(CARD_EFFECTS.map((c) => [c.id, c])) as Record<CardEffect, CardDef>;

/**
 * A futásokon ÁT felfedett Sorslapok (a Kódex feloldás-kapuja). A lap hatása ISMERT
 * (nincs találgatás), ezért már a FELVÉTELKOR rögzül (lásd World pickup-ág).
 */
const CARD_SEEN_KEY = 'sentex_card_seen';

export function loadCardSeen(): Set<CardEffect> {
  try {
    const raw = localStorage.getItem(CARD_SEEN_KEY);
    if (raw) return new Set(JSON.parse(raw) as CardEffect[]);
  } catch { /* localStorage nem elérhető / sérült */ }
  return new Set();
}

/** Egy Sorslap felfedésének rögzítése (felvételkor - lásd World pickup-ág). */
export function markCardSeen(id: CardEffect): void {
  try {
    if (!CARD_BY_ID[id]) return;
    const set = loadCardSeen();
    if (set.has(id)) return;
    set.add(id);
    localStorage.setItem(CARD_SEEN_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/**
 * Súlyozott sorsolás a Sorslap-rétegen belül (a rúnák ritkábbak). A közös `random()`
 * forráson át (seed-rendszer, #49): drop-scope-ban determinisztikus, egyébként élő.
 */
export function rollCardEffect(): CardEffect {
  let total = 0;
  for (const c of CARD_EFFECTS) total += c.weight;
  let r = random() * total;
  for (const c of CARD_EFFECTS) {
    if ((r -= c.weight) < 0) return c.id;
  }
  return CARD_EFFECTS[0]!.id;
}

export interface CardDrawOpts {
  /** Ragyogás a lap/kő körül (a padlón lebegő pickuphoz). */
  glow?: boolean;
  /** Elforgatás radiánban (lebegő billegéshez). */
  rot?: number;
  /** Üres tartó (HUD: 0 darab) - halvány, glyph nélkül. */
  empty?: boolean;
}

/**
 * Egy Sorslap kirajzolása az `(cx, cy)` középpont köré, `r` ~ félmérettel. A pickup
 * (nagyobb, ragyogó) és a HUD-számláló (apró ikon) ugyanezt használja, így a felvett
 * lap a HUD-on ugyanúgy néz ki, mint a földön. A `kind` dönt a sziluettről (tarot-lap
 * vs vésett rúnakő), a `col` a glyph/keret színe.
 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  def: CardDef,
  opts: CardDrawOpts = {},
): void {
  const { glow = false, rot = 0, empty = false } = opts;
  const col = def.col;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);

  if (glow && !empty) softGlow(ctx, 0, 0, r * 1.9, col); // cache-elt fénykoszorú a shadowBlur helyett

  if (def.kind === 'rune') drawRuneStone(ctx, r, col, empty);
  else drawTarotCard(ctx, r, col, empty);

  if (!empty) drawGlyph(ctx, def.id, r * 0.6, col);

  ctx.restore();
}

/** Tarot-lap sziluett: álló, lekerekített pergamen sötét háttérrel + színes kerettel. */
function drawTarotCard(ctx: CanvasRenderingContext2D, r: number, col: string, empty: boolean): void {
  const w = r * 1.3;   // fél-szélesség
  const h = r * 1.85;  // fél-magasság
  roundRectPath(ctx, -w, -h, w * 2, h * 2, r * 0.28);
  // pergamen-háttér (sötét, hogy a glyph kontrasztos legyen)
  const g = ctx.createLinearGradient(0, -h, 0, h);
  g.addColorStop(0, empty ? '#26262e' : '#2c2a36');
  g.addColorStop(1, empty ? '#16161c' : '#1a1822');
  ctx.fillStyle = g;
  ctx.fill();
  // színes kettős keret
  ctx.strokeStyle = empty ? 'rgba(140,150,170,0.35)' : shade(col, -0.1);
  ctx.lineWidth = Math.max(1.4, r * 0.16);
  ctx.lineJoin = 'round';
  roundRectPath(ctx, -w, -h, w * 2, h * 2, r * 0.28);
  ctx.stroke();
  if (!empty) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    roundRectPath(ctx, -w * 0.72, -h * 0.78, w * 1.44, h * 1.56, r * 0.2);
    ctx.stroke();
  }
}

/** Vésett rúnakő sziluett: szögletes, bemetszett hatszög-tömb kő-árnyalattal. */
function drawRuneStone(ctx: CanvasRenderingContext2D, r: number, col: string, empty: boolean): void {
  const w = r * 1.42;
  const h = r * 1.62;
  const c = r * 0.4; // levágott sarok
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(-w + c, -h);
    ctx.lineTo(w - c, -h);
    ctx.lineTo(w, -h + c);
    ctx.lineTo(w, h - c);
    ctx.lineTo(w - c, h);
    ctx.lineTo(-w + c, h);
    ctx.lineTo(-w, h - c);
    ctx.lineTo(-w, -h + c);
    ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(-w, -h, w, h);
  g.addColorStop(0, empty ? '#3a3a44' : '#4a4753');
  g.addColorStop(0.5, empty ? '#2a2a32' : '#33313c');
  g.addColorStop(1, empty ? '#1a1a20' : '#211f28');
  ctx.fillStyle = g;
  ctx.fill();
  // bemetszés-perem (felül világos, alul sötét: faragott kő érzet)
  path();
  ctx.strokeStyle = empty ? 'rgba(150,150,165,0.3)' : shade(col, 0.15);
  ctx.lineWidth = Math.max(1.4, r * 0.16);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A hatás-specifikus, izzó glyph (vonalrajz a lap/kő közepén). */
function drawGlyph(ctx: CanvasRenderingContext2D, id: CardEffect, s: number, col: string): void {
  ctx.save();
  softGlow(ctx, 0, 0, s * 1.15, col); // izzás a glyph mögé (a shadowBlur kiváltása)
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = Math.max(1.2, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (id) {
    case 'nova': // koncentrikus lökéshullám-ívek
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.32 * i, -TAU * 0.18, TAU * 0.18);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(-s * 0.55, 0, s * 0.12, 0, TAU); ctx.fill();
      break;
    case 'slow': { // homokóra (idő-lassítás)
      const w = s * 0.5, h = s * 0.62;
      ctx.beginPath();
      ctx.moveTo(-w, -h); ctx.lineTo(w, -h); ctx.lineTo(-w, h); ctx.lineTo(w, h); ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'heal': // gyógyír-kereszt
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62); ctx.lineTo(0, s * 0.62);
      ctx.moveTo(-s * 0.62, 0); ctx.lineTo(s * 0.62, 0);
      ctx.stroke();
      break;
    case 'blink': { // kettős nyíl (ugrás)
      for (const ox of [-s * 0.18, s * 0.32]) {
        ctx.beginPath();
        ctx.moveTo(ox - s * 0.3, -s * 0.4);
        ctx.lineTo(ox + s * 0.1, 0);
        ctx.lineTo(ox - s * 0.3, s * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'purge': // robbanó csillagszórás (szoba-törlő)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const inner = i % 2 === 0 ? s * 0.62 : s * 0.34;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.stroke();
      }
      break;
    case 'ward': // pajzs-kör (sérthetetlenség)
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62);
      ctx.lineTo(s * 0.5, -s * 0.32);
      ctx.lineTo(s * 0.5, s * 0.18);
      ctx.quadraticCurveTo(s * 0.5, s * 0.56, 0, s * 0.66);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.56, -s * 0.5, s * 0.18);
      ctx.lineTo(-s * 0.5, -s * 0.32);
      ctx.closePath();
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
