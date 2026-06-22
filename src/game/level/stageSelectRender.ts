import { TAU } from '../../engine/math';
import type { Rect } from '../types';

/**
 * Szakasz-választó képernyő (HUB-módok belépő oldala) - szabad függvények,
 * állapot nélkül. A három kihívás-mód (boss-roham / kazamata / labirintus) a
 * portálba lépve NEM indul azonnal: előbb ez a „kígyózó ösvény" jelenik meg,
 * ahol bármelyik szakasz közvetlenül indítható (nem kell végigjátszani az
 * előzőeket). A `World` tartja az állapotot (mód, kurzor, egér-él) és hívja a
 * `layout`-ot (találat-teszthez) + a `draw`-t.
 */

export type SelectMode = 'boss' | 'dungeon' | 'labyrinth';

/** Egy szakasz-csomópont a kígyózó ösvényen (a `boss` a mérföldkő/boss-jelölés). */
export interface SelectNode {
  i: number;       // 0-alapú szakasz-index
  x: number;
  y: number;
  r: number;
  boss: boolean;
}

export interface SelectLayout {
  nodes: SelectNode[];
  /** Hány csomópont fér egy sorba (a billentyűs fel/le navigációhoz). */
  perRow: number;
  /** „Vissza" gomb találati téglalapja a bal felső sarokban. */
  back: Rect;
}

/**
 * Kígyózó (boustrophedon) ösvény-elrendezés a szobán belül: a páros sorok
 * balról jobbra, a páratlanok jobbról balra futnak, így a szomszédos indexek
 * mindig egymás mellé esnek (folytonos ösvény-vonal rajzolható közéjük).
 */
export function layoutStageSelect(rc: Rect, count: number, bossFlags: boolean[]): SelectLayout {
  const padX = rc.w * 0.1;
  const usableW = rc.w - 2 * padX;
  const perRow = Math.min(count, Math.ceil(count / Math.max(1, Math.ceil(count / 5))));
  const rows = Math.ceil(count / perRow);

  const topY = rc.y + rc.h * 0.34; // a cím + alcím alatt kezdünk
  const botY = rc.y + rc.h * 0.84;
  const rowGap = rows > 1 ? (botY - topY) / (rows - 1) : 0;
  const colGap = perRow > 1 ? usableW / (perRow - 1) : 0;
  const r = Math.max(15, Math.min(28, Math.min(colGap || 9e9, rowGap || 9e9) * 0.34));

  const nodes: SelectNode[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const posInRow = i - row * perRow;
    const col = row % 2 === 0 ? posInRow : perRow - 1 - posInRow;
    const x = rc.x + padX + (perRow > 1 ? col * colGap : usableW / 2);
    const y = rows > 1 ? topY + row * rowGap : (topY + botY) / 2;
    nodes.push({ i, x, y, r, boss: bossFlags[i] ?? false });
  }

  const back: Rect = { x: rc.x + 14, y: rc.y + 12, w: 116, h: 34 };
  return { nodes, perRow, back };
}

interface DrawOpts {
  mode: SelectMode;
  title: string;
  sub: string;
  backLabel: string;
  hint: string;
  /** A kiemelt (hover/kurzor) csomópont alá írt leíró felirat. */
  caption: string;
  /** Csomópontonkénti legjobb idő (formázva), vagy null ha nincs rekord. */
  times: (string | null)[];
  hover: number;       // a kiemelt csomópont indexe (-1 = nincs)
  backHover: boolean;
  accent: string;
  t: number;
}

export function drawStageSelect(
  ctx: CanvasRenderingContext2D,
  rc: Rect,
  layout: SelectLayout,
  opts: DrawOpts,
): void {
  const { nodes } = layout;
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

  // --- ösvény-vonal a csomópontok közt (a kígyózó út) ---
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (i === 0) ctx.moveTo(n.x, n.y);
    else ctx.lineTo(n.x, n.y);
  }
  ctx.stroke();
  ctx.restore();

  // --- csomópontok ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of nodes) {
    const hot = n.i === opts.hover;
    const rr = n.r * (hot ? 1.14 + 0.05 * pulse : 1);

    if (hot) {
      ctx.save();
      ctx.strokeStyle = opts.accent;
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr + 6 + 3 * pulse, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (n.boss) {
      // boss / mérföldkő: gyémánt-alak, vörös-arany izzással
      const g = ctx.createRadialGradient(n.x, n.y, 1, n.x, n.y, rr);
      g.addColorStop(0, hot ? '#ffd98a' : '#e8b96a');
      g.addColorStop(1, '#7a1f1f');
      ctx.fillStyle = g;
      ctx.strokeStyle = hot ? '#ffe9b0' : 'rgba(255,210,150,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y - rr);
      ctx.lineTo(n.x + rr, n.y);
      ctx.lineTo(n.x, n.y + rr);
      ctx.lineTo(n.x - rr, n.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(n.x, n.y - rr * 0.3, 1, n.x, n.y, rr);
      g.addColorStop(0, hot ? '#3b3450' : '#2a2438');
      g.addColorStop(1, '#15111f');
      ctx.fillStyle = g;
      ctx.strokeStyle = hot ? opts.accent : 'rgba(220,210,180,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // sorszám
    ctx.fillStyle = n.boss ? '#2a0f0f' : hot ? '#fff4d8' : '#d8cca6';
    ctx.font = `700 ${Math.round(rr * 0.95)}px Cinzel, Georgia, serif`;
    ctx.fillText(String(n.i + 1), n.x, n.y + 1);
    ctx.restore();

    // legjobb idő a csomópont alatt (rekord hiányában halvány „- - -")
    const time = opts.times[n.i];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (time) {
      ctx.fillStyle = hot ? '#9fe6b0' : 'rgba(150,200,160,0.7)'; // best-time zöldes árnyalat
      ctx.font = '600 12px Georgia, serif';
      ctx.fillText(time, n.x, n.y + n.r + 7);
    } else {
      ctx.fillStyle = 'rgba(180,170,150,0.35)';
      ctx.font = '500 11px Georgia, serif';
      ctx.fillText('- - -', n.x, n.y + n.r + 8);
    }
    ctx.restore();
  }

  // --- kiemelt szakasz leírása az ösvény alatt ---
  if (opts.caption) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = opts.accent;
    ctx.font = '600 18px Georgia, serif';
    ctx.fillText(opts.caption, cx, rc.y + rc.h * 0.92);
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

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
