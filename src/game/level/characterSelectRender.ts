import { TAU } from '../../engine/math';
import type { Rect } from '../types';

/**
 * Vándor-választó képernyő (#53) - állapotmentes szabad függvények, a HUB-on
 * belül fut (mint a szakasz-választó). A `World` tartja az állapotot (kurzor,
 * egér-él) és hívja a `layout`-ot (találat-teszt) + a `draw`-t. A kártyák a
 * MEGLÉVŐ tárgyak/skillek nélkül, tisztán a vándor-statokból épülnek.
 */

/** Egy stat-sor a kártyán: címke + irány (1 = jobb mint az alap, -1 = rosszabb). */
export interface CharStat { label: string; dir: -1 | 0 | 1; }

export interface CharCardView {
  name: string;
  skill: string;
  desc: string;
  accent: string;
  tearColor?: string;
  stats: CharStat[];
  /** Zárt (feloldatlan) kártya: elhalványítva, lakat-jellel, nem választható. */
  locked?: boolean;
}

export interface CharCard { i: number; x: number; y: number; w: number; h: number; }
export interface CharLayout { cards: CharCard[]; back: Rect; }

/** Vízszintes kártya-sor a szoba közepén, a cím alatt. */
export function layoutCharacterSelect(rc: Rect, count: number): CharLayout {
  const padX = rc.w * 0.06;
  const gap = 16;
  const usableW = rc.w - 2 * padX;
  const w = Math.min(190, (usableW - gap * (count - 1)) / count);
  const h = Math.min(248, rc.h * 0.56);
  const totalW = w * count + gap * (count - 1);
  const x0 = rc.x + (rc.w - totalW) / 2;
  const y = rc.y + rc.h * 0.32;

  const cards: CharCard[] = [];
  for (let i = 0; i < count; i++) cards.push({ i, x: x0 + i * (w + gap), y, w, h });

  const back: Rect = { x: rc.x + 14, y: rc.y + 12, w: 116, h: 34 };
  return { cards, back };
}

interface DrawOpts {
  title: string;
  sub: string;
  hint: string;
  backLabel: string;
  cards: CharCardView[];
  selected: number;
  backHover: boolean;
  accent: string;
  t: number;
}

export function drawCharacterSelect(
  ctx: CanvasRenderingContext2D,
  rc: Rect,
  layout: CharLayout,
  opts: DrawOpts,
): void {
  const cx = rc.x + rc.w / 2;
  const pulse = 0.5 + 0.5 * Math.sin(opts.t * 2.2);

  // --- cím + alcím ---
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#f0e2bd';
  ctx.font = '700 30px Cinzel, Georgia, serif';
  ctx.fillText(opts.title, cx, rc.y + rc.h * 0.1);
  ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(220,205,170,0.78)';
  ctx.font = '500 15px Georgia, serif';
  ctx.fillText(opts.sub, cx, rc.y + rc.h * 0.1 + 40);
  ctx.restore();

  // --- kártyák ---
  for (const card of layout.cards) {
    const v = opts.cards[card.i]!;
    const sel = card.i === opts.selected;
    const lift = sel ? 6 + 2 * pulse : 0;
    const x = card.x, y = card.y - lift, w = card.w, h = card.h;

    ctx.save();
    // panel
    ctx.fillStyle = sel ? 'rgba(34,29,48,0.96)' : 'rgba(22,19,32,0.9)';
    roundRectPath(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.strokeStyle = sel ? v.accent : 'rgba(200,190,160,0.3)';
    if (sel) { ctx.shadowColor = v.accent; ctx.shadowBlur = 14 * (0.6 + 0.4 * pulse); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // accent fejléc-sáv
    ctx.fillStyle = v.accent;
    ctx.globalAlpha = sel ? 1 : 0.7;
    roundRectPath(ctx, x, y, w, 5, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // procedurális csuklyás sziluett (accentre színezve)
    drawHoodedSigil(ctx, x + w / 2, y + 56, v.accent, v.tearColor, sel ? pulse : 0);

    // név
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = sel ? '#fff4d8' : '#e0d4ad';
    ctx.font = '700 17px Cinzel, Georgia, serif';
    ctx.fillText(v.name, x + w / 2, y + 92);

    // skill-sor
    ctx.fillStyle = 'rgba(200,190,160,0.7)';
    ctx.font = 'italic 500 12px Georgia, serif';
    ctx.fillText(v.skill, x + w / 2, y + 116);

    // stat-nyilak
    let sy = y + 140;
    ctx.font = '600 12px Georgia, serif';
    for (const s of v.stats) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(210,200,170,0.75)';
      ctx.fillText(s.label, x + 16, sy);
      ctx.textAlign = 'right';
      const arrow = s.dir > 0 ? '▲' : s.dir < 0 ? '▼' : '—';
      ctx.fillStyle = s.dir > 0 ? '#8fe6a0' : s.dir < 0 ? '#e88a7a' : 'rgba(180,170,150,0.5)';
      ctx.fillText(arrow, x + w - 16, sy);
      sy += 17;
    }

    // leírás (tördelt)
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,190,165,0.62)';
    ctx.font = '500 11px Georgia, serif';
    wrapText(ctx, v.desc, x + w / 2, sy + 6, w - 22, 14);

    // zárt kártya: sötét fátyol + lakat a sziluett fölött
    if (v.locked) {
      ctx.fillStyle = 'rgba(10,8,16,0.62)';
      roundRectPath(ctx, x, y, w, h, 10);
      ctx.fill();
      drawPadlock(ctx, x + w / 2, y + 52);
    }

    ctx.restore();
  }

  // --- alsó segéd-sor ---
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(200,190,160,0.55)';
  ctx.font = '500 13px Georgia, serif';
  ctx.fillText(opts.hint, cx, rc.y + rc.h - 8);
  ctx.restore();

  // --- „Vissza" gomb ---
  const b = layout.back;
  ctx.save();
  ctx.fillStyle = opts.backHover ? 'rgba(60,52,80,0.9)' : 'rgba(30,26,42,0.8)';
  ctx.strokeStyle = opts.backHover ? opts.accent : 'rgba(220,210,180,0.4)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, b.x, b.y, b.w, b.h, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = opts.backHover ? '#fff4d8' : '#d8cca6';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '600 14px Georgia, serif';
  ctx.fillText('‹  ' + opts.backLabel, b.x + 14, b.y + b.h / 2 + 1);
  ctx.restore();
}

/** Apró csuklyás alak a kártya tetején, a vándor accent-színére hangolva.
 *  Exportált: a Kódex Vándorok-fülke is ezt rajzolja (egységes vizuál). */
export function drawHoodedSigil(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, accent: string, tear: string | undefined, glow: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  // halo
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  g.addColorStop(0, hexA(accent, 0.22 + 0.12 * glow));
  g.addColorStop(1, hexA(accent, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-34, -34, 68, 68);
  // köpeny
  ctx.fillStyle = '#2a2540';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(-16, -4, -13, 22);
  ctx.lineTo(13, 22);
  ctx.quadraticCurveTo(16, -4, 0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = 1;
  // csuklya-árnyék
  ctx.fillStyle = '#241f36';
  ctx.beginPath(); ctx.arc(0, -20, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0c0a16';
  ctx.beginPath(); ctx.ellipse(0, -18, 4.5, 5.5, 0, 0, TAU); ctx.fill();
  // signature könny-szín-pötty (a vándor lövedék-színe)
  if (tear) {
    ctx.fillStyle = tear;
    ctx.beginPath(); ctx.arc(0, 6, 3.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** Egyszerű lakat-glyph (zárt kártyához). */
function drawPadlock(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(230,220,190,0.85)';
  ctx.lineWidth = 2.5;
  // kengyel
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 7, Math.PI, 0);
  ctx.stroke();
  // test
  ctx.fillStyle = 'rgba(230,220,190,0.9)';
  roundRectPath(ctx, cx - 10, cy - 4, 20, 16, 3);
  ctx.fill();
  // kulcslyuk
  ctx.fillStyle = 'rgba(20,16,28,0.9)';
  ctx.beginPath(); ctx.arc(cx, cy + 2, 2.2, 0, TAU); ctx.fill();
  ctx.fillRect(cx - 1, cy + 2, 2, 5);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number,
): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word; yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
