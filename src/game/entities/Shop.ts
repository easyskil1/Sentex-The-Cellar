import { TAU, rand, pick, shade } from '../../engine/math';
import type { Item } from '../content/items';
import { rollItem, itemName, itemDesc } from '../content/items';
import { tc } from '../../i18n';
import { drawItemIcon } from '../content/itemIcon';
import { drawBombIcon, drawHeart } from './Pickup';
import { softGlow } from '../render/glow';
import { itemPrice, consumablePrice, rerollPrice, GAMBLE_COST, type ConsumableKind } from '../content/shopPricing';

/** Egy standon árult portéka: vagy egy tárgy, vagy egy fogyóeszköz. */
export type StallOffer =
  | { kind: 'item'; item: Item }
  | { kind: 'consumable'; cons: ConsumableKind };

/** Egy árusító-állvány a szerencse-szobában. */
export interface ShopStall {
  x: number;
  y: number;
  offer: StallOffer;
  price: number;
  sold: boolean;
  /** Igaz, ha a játékos most elutasította — amíg el nem sétál, nem kérdezünk újra. */
  declined: boolean;
  bob: number;
}

const CONS_COL: Record<ConsumableKind, string> = { bomb: '#cfcfd6', tnt: '#ff7b5a', heart: '#ff5b6a' };
const CONS_NAME: Record<ConsumableKind, string> = { bomb: 'Bomb', tnt: 'TNT', heart: 'Heart' };
const CONS_DESC: Record<ConsumableKind, string> = {
  bomb: 'Placeable bomb',
  tnt: 'Powerful TNT charge',
  heart: '+1 heart (heals instantly)',
};

/** Egy ajánlat neve/leírása/színe a felugró ablakhoz. */
export function offerView(offer: StallOffer): { name: string; desc: string; color: string } {
  if (offer.kind === 'item') {
    return { name: itemName(offer.item), desc: itemDesc(offer.item), color: offer.item.col };
  }
  const k = offer.cons;
  return {
    name: tc(CONS_NAME[k], `cons.${k}.name`),
    desc: tc(CONS_DESC[k], `cons.${k}.desc`),
    color: CONS_COL[k],
  };
}

/**
 * A szerencse-szoba berendezése: középen egy nagy oltár a SORSOLÓ-GOMBBAL
 * (rálépve E-vel pörgethető), körülötte árusító-állványok és egy reroll-rúna.
 * Csak adat + látvány; a vásárlás/sorsolás logikája (érme-levonás, jutalom)
 * a `World`-ben él, mert a játékosra és az effektekre hat.
 */
export class Shop {
  stalls: ShopStall[] = [];
  /** Oltár (sorsoló-gomb) interakciós középpontja. */
  readonly ax: number;
  readonly ay: number;
  /** Reroll-rúna pozíciója. */
  readonly rx: number;
  readonly ry: number;
  rerollUses = 0;

  // animáció
  t = 0;
  /** Sorsoló-pörgés visszaszámláló (1 → 0). */
  spin = 0;
  /** A nyeremény-felvillanás (1 → 0). */
  flash = 0;

  constructor(cx: number, cy: number) {
    // Az oltár (sorsoló-gomb) PONTOSAN középen; felül az ingyenes pedesztál,
    // alul a reroll-rúna — a négy stand a négy átlós pozícióban (kiegyensúlyozva).
    this.ax = cx;
    this.ay = cy;
    this.rx = cx;
    this.ry = cy + 188;
    const slots: Array<[number, number]> = [
      [cx - 235, cy - 110],
      [cx + 235, cy - 110],
      [cx - 235, cy + 110],
      [cx + 235, cy + 110],
    ];
    this.stalls = slots.map(([x, y]) => ({
      x, y, offer: { kind: 'consumable', cons: 'bomb' } as StallOffer,
      price: 0, sold: false, declined: false, bob: rand(0, TAU),
    }));
    this.generate(true);
  }

  /**
   * Új kínálat sorsolása: 2 egyedi tárgy + 2 KÜLÖNBÖZŐ fogyóeszköz (így a TNT is
   * vásárolható). Az első kínálatban garantáltan ott a bomba ÉS a TNT.
   */
  generate(firstGen = false): void {
    const usedItems = new Set<string>();
    const offers: StallOffer[] = [this.rollItemOffer(usedItems), this.rollItemOffer(usedItems)];
    const cons = firstGen ? (['bomb', 'tnt'] as ConsumableKind[]) : this.pickTwoConsumables();
    offers.push({ kind: 'consumable', cons: cons[0]! }, { kind: 'consumable', cons: cons[1]! });
    this.shuffle(offers);
    this.stalls.forEach((s, i) => {
      s.offer = offers[i]!;
      s.price = s.offer.kind === 'item' ? itemPrice(s.offer.item) : consumablePrice(s.offer.cons);
      s.sold = false;
      s.declined = false;
    });
  }

  /** Reroll: növeli a használat-számlálót és új (random) kínálatot sorsol. */
  reroll(): void {
    this.rerollUses++;
    this.generate(false);
    this.flash = 0.6;
  }

  private rollItemOffer(used: Set<string>): StallOffer {
    // a bolt ITEM-központú: a közös rollItem dönt (stat-perk vs. skill, súlyozva)
    let item = rollItem();
    let guard = 0;
    while (used.has(item.name) && guard++ < 24) item = rollItem();
    used.add(item.name);
    return { kind: 'item', item };
  }

  /** Két KÜLÖNBÖZŐ fogyóeszköz-típus. */
  private pickTwoConsumables(): ConsumableKind[] {
    const all: ConsumableKind[] = ['bomb', 'tnt', 'heart'];
    const a = pick(all);
    let b = pick(all);
    let guard = 0;
    while (b === a && guard++ < 10) b = pick(all);
    return [a, b];
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  }

  update(dt: number): void {
    this.t += dt;
    for (const s of this.stalls) s.bob += dt * 2.4;
    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.8);
  }

  /** Sorsoló-pörgés indítása (a látványhoz; a jutalmat a World dönti el). */
  startSpin(): void {
    this.spin = 0.9;
    this.flash = 0;
  }

  /** Nyeremény-felvillanás (a World hívja a kimenetel ismeretében). */
  winFlash(): void {
    this.flash = 0.8;
  }

  // ---- Kirajzolás ----
  draw(ctx: CanvasRenderingContext2D): void {
    this.drawRerollRune(ctx);
    for (const s of this.stalls) this.drawStall(ctx, s);
    this.drawAltar(ctx);
  }

  /** Lapos kő/márvány korong (alátét és párkány) — két végén ellipszis. */
  private disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, top: string, side: string, h: number): void {
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.ellipse(x, y + h, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(x - rx, y);
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - rx, y, rx * 2, h);
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  private drawAltar(ctx: CanvasRenderingContext2D): void {
    const x = this.ax;
    const y = this.ay;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 52, 78, 26, 0, 0, TAU);
    ctx.fill();

    // alsó lépcső (márvány)
    this.disc(ctx, x, y + 34, 70, 24, '#ece5d4', '#a99c7e', 14);
    // arany futószőnyeg a párkányon
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 34, 70, 24, 0, 0, TAU);
    ctx.stroke();

    // törzs (sokszögű oszlop)
    const colW = 40;
    const colTop = y - 18;
    const colBot = y + 30;
    const g = ctx.createLinearGradient(x - colW, 0, x + colW, 0);
    g.addColorStop(0, '#8d8166');
    g.addColorStop(0.5, '#ded6c0');
    g.addColorStop(1, '#8d8166');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - colW, colBot);
    ctx.lineTo(x - colW + 6, colTop);
    ctx.lineTo(x + colW - 6, colTop);
    ctx.lineTo(x + colW, colBot);
    ctx.closePath();
    ctx.fill();
    // arany vésetek a törzsön
    ctx.strokeStyle = 'rgba(217,178,90,0.7)';
    ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 16, colTop + 4);
      ctx.lineTo(x + i * 18, colBot - 4);
      ctx.stroke();
    }

    // felső párkány
    this.disc(ctx, x, y - 18, 50, 17, '#e7dfca', '#b3a684', 9);
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(x, y - 18, 50, 17, 0, 0, TAU);
    ctx.stroke();

    // ---- a SORSOLÓ-GOMB: izzó gömb az oltár tetején ----
    const oy = y - 40;
    const pulse = 0.5 + Math.sin(this.t * 3) * 0.5;
    const spinning = this.spin > 0;
    const hue = (this.t * 760) % 360;
    const orbCol = spinning ? `hsl(${hue},92%,62%)` : '#ffd86a';
    const glowCol = this.flash > 0 ? '#fff1b0' : orbCol;

    // dicsfény - cache-elt lágy fénykoszorú (a shadowBlur kiváltása, lásd render/glow)
    ctx.save();
    ctx.globalAlpha = 0.5 + this.flash * 0.45;
    softGlow(ctx, x, oy, 46 + pulse * 12 + this.flash * 22, glowCol);
    ctx.restore();

    // arany foglalat
    ctx.fillStyle = '#caa24a';
    ctx.strokeStyle = '#8a6e2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, oy + 14, 22, 9, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // a gömb
    const og = ctx.createRadialGradient(x - 6, oy - 7, 2, x, oy, 20);
    og.addColorStop(0, spinning ? '#ffffff' : '#fff4cf');
    og.addColorStop(0.5, orbCol);
    og.addColorStop(1, shade(spinning ? '#a05a20' : '#b8862a', spinning ? 0.1 : 0));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(x, oy, 19, 0, TAU);
    ctx.fill();
    // csillanás
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x - 6, oy - 7, 5, 3, -0.5, 0, TAU);
    ctx.fill();

    // a gömbön ✦ szimbólum
    ctx.save();
    ctx.translate(x, oy);
    ctx.rotate(this.t * (spinning ? 8 : 0.6));
    ctx.fillStyle = 'rgba(120,80,20,0.8)';
    this.star(ctx, 0, 0, 8.5, 3.5, 4);
    ctx.fill();
    ctx.restore();

    // felirat — a sorsolás ára is kiírva
    this.label(ctx, x, y + 82, `SZERENCSE  ·  ${GAMBLE_COST}¢  ·  E`, '#ffe9a8');
  }

  private drawRerollRune(ctx: CanvasRenderingContext2D): void {
    const x = this.rx;
    const y = this.ry;
    const pulse = 0.5 + Math.sin(this.t * 2.2 + 1) * 0.5;

    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y + 22, 26, 9, 0, 0, TAU);
    ctx.fill();

    // alacsony kő-talp
    this.disc(ctx, x, y + 14, 24, 9, '#cfc6ad', '#8d8166', 7);

    // lebegő rúna-korong
    const ry2 = y - 6 + Math.sin(this.t * 2) * 2;
    ctx.save();
    softGlow(ctx, x, ry2, 24 + pulse * 8, '#7fe0c4'); // cache-elt fénykoszorú a shadowBlur helyett
    ctx.strokeStyle = '#7fe0c4';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, ry2, 14, 0, TAU);
    ctx.stroke();
    // két forgó nyíl (újra-kavarás)
    ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) {
      const a0 = this.t * 2 + k * Math.PI;
      ctx.beginPath();
      ctx.arc(x, ry2, 9, a0, a0 + 2.2);
      ctx.stroke();
      const ax = x + Math.cos(a0 + 2.2) * 9;
      const ay = ry2 + Math.sin(a0 + 2.2) * 9;
      const ad = a0 + 2.2 + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(ad - 0.5) * 4, ay + Math.sin(ad - 0.5) * 4);
      ctx.lineTo(ax + Math.cos(ad + 0.5) * 4, ay + Math.sin(ad + 0.5) * 4);
      ctx.closePath();
      ctx.fillStyle = '#7fe0c4';
      ctx.fill();
    }
    ctx.restore();

    this.label(ctx, x, y + 30, `NEW OFFER  ·  ${rerollPrice(this.rerollUses)}¢  ·  E`, '#bdeedd');
  }

  private drawStall(ctx: CanvasRenderingContext2D, s: ShopStall): void {
    const { x, y } = s;

    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 20, 8, 0, 0, TAU);
    ctx.fill();

    // kő talapzat (kicsi oltár)
    this.disc(ctx, x, y + 8, 20, 8, s.sold ? '#6a6258' : '#cdbf9f', s.sold ? '#3f3a34' : '#7d7158', 11);
    ctx.strokeStyle = s.sold ? '#4a443c' : '#d9b25a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 20, 8, 0, 0, TAU);
    ctx.stroke();

    if (s.sold) {
      this.label(ctx, x, y + 26, 'ELKELT', '#8a8278');
      return;
    }

    // lebegő portéka
    const yo = -22 + Math.sin(s.bob) * 4;
    const view = offerView(s.offer);

    // fénysugár a talapzatról
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = view.color;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 4);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 22, y + yo);
    ctx.lineTo(x - 22, y + yo);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (s.offer.kind === 'item') {
      drawItemIcon(ctx, x, y + yo, 13, s.offer.item, { glow: true, rot: Math.sin(s.bob) * 0.16 });
    } else {
      ctx.save();
      ctx.translate(x, y + yo);
      softGlow(ctx, 0, 0, 20, view.color); // cache-elt fénykoszorú a shadowBlur helyett
      if (s.offer.cons === 'heart') drawHeart(ctx, 0, 0, 13, '#ff5b6a', '#a02838');
      else drawBombIcon(ctx, 0, 0, 12, s.offer.cons === 'tnt' ? 'tnt' : 'bomb');
      ctx.restore();
    }

    // ár-tábla
    this.priceTag(ctx, x, y + 28, s.price);
  }

  /** Aranykeretes ár-címke érme-ikonnal. */
  private priceTag(ctx: CanvasRenderingContext2D, x: number, y: number, price: number): void {
    const txt = String(price);
    ctx.font = 'bold 13px system-ui';
    const w = ctx.measureText(txt).width + 26;
    ctx.fillStyle = 'rgba(20,14,6,0.82)';
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.fill();
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.stroke();
    // érme
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath();
    ctx.arc(x - w / 2 + 11, y, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b8902a';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¢', x - w / 2 + 11, y + 0.5);
    // ár
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(txt, x + 6, y + 0.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private label(ctx: CanvasRenderingContext2D, x: number, y: number, txt: string, col: string): void {
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(txt, x, y + 1);
    ctx.fillStyle = col;
    ctx.fillText(txt, x, y);
    ctx.textAlign = 'left';
  }

  private star(ctx: CanvasRenderingContext2D, cx: number, cy: number, ro: number, ri: number, points: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a = (i / (points * 2)) * TAU - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
