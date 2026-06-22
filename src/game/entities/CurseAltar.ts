import { TAU, rand } from '../../engine/math';
import type { Item } from '../content/items';
import { rollItem } from '../content/items';
import { drawItemIcon } from '../content/itemIcon';
import { itemPower } from '../balance/itemPower';
import { drawHeart } from './Pickup';
import { softGlow } from '../render/glow';
import { HP, CURSE } from '../config';

/** Egy átok-reliquárium ajánlat: EGY ritka tárgy, FIX szív-árért (HP). */
export interface CurseStand {
  x: number;
  y: number;
  item: Item;
  /** Ár pontban (élet). */
  cost: number;
  sold: boolean;
  /** Igaz, ha most elutasította — amíg el nem sétál, nem kérdezünk újra. */
  declined: boolean;
  bob: number;
}

/**
 * Az Átokverem szoba berendezése (#38): egy tüskés, átokverte reliquárium egyetlen
 * ritka tárggyal. A vér-oltár (#35) pay-per-item piacával szemben ez EGY döntés:
 * fizess egyszer (fix 1 szív) és vidd a jutalmat. Csak adat + látvány; a fizetség
 * (HP-levonás, tárgy felvétele) a `World`-ben él, mert a játékosra hat. Lásd
 * `World.updateCurseAltar`. Téma: hideg lila/beteges zöld (nem a vér vörös tónusa).
 */
export class CurseAltar {
  /** Az egyetlen ajánlat (tömb a vér-oltár offer-folyamatának mintájára). */
  stands: CurseStand[] = [];
  /** A reliquárium interakciós középpontja (csak látvány). */
  readonly cx: number;
  readonly cy: number;
  t = 0;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.stands.push({
      x: cx,
      y: cy + 150,
      item: this.rollRare(),
      cost: CURSE.cost,
      sold: false,
      declined: false,
      bob: rand(0, TAU),
    });
  }

  /**
   * RITKA jutalom: több nem-skill jelöltből a legmagasabb erő-pontú. Nincs új
   * tartalom — csak kedvezőbb eloszlás (a skill-tárgyat kihagyjuk, hogy ne kelljen
   * csere-ablak, akár a vér-oltárnál).
   */
  private rollRare(): Item {
    let best: Item | null = null;
    for (let i = 0; i < Math.max(1, CURSE.rollBest); i++) {
      let it = rollItem();
      let guard = 0;
      while (it.skill && guard++ < 16) it = rollItem();
      if (it.skill) continue;
      if (!best || itemPower(it.name) > itemPower(best.name)) best = it;
    }
    return best ?? rollItem();
  }

  update(dt: number): void {
    this.t += dt;
    for (const s of this.stands) s.bob += dt * 2.2;
  }

  // ---- Kirajzolás ----
  draw(ctx: CanvasRenderingContext2D): void {
    this.drawObelisk(ctx);
    for (const s of this.stands) this.drawStand(ctx, s);
  }

  /** Gótikus átok-obeliszk: sötét kő-talp + tüske-koszorú + beteges lila izzás. */
  private drawObelisk(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const y = this.cy - 18;
    const pulse = 0.5 + Math.sin(this.t * 2.0) * 0.5;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.44)';
    ctx.beginPath();
    ctx.ellipse(x, y + 52, 80, 26, 0, 0, TAU);
    ctx.fill();

    // alsó lépcső (sötét kő)
    this.disc(ctx, x, y + 34, 72, 25, '#2a2238', '#15101f', 15);
    ctx.strokeStyle = '#4a3a66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 34, 72, 25, 0, 0, TAU);
    ctx.stroke();

    // beteges-lila izzás a kő körül
    ctx.save();
    ctx.globalAlpha = 0.4 + pulse * 0.3;
    softGlow(ctx, x, y - 10, 40 + pulse * 14, '#7b3fd0');
    ctx.restore();

    // obeliszk-törzs (vésett kő-tömb, felfelé keskenyedik)
    const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
    g.addColorStop(0, '#1c1630');
    g.addColorStop(0.5, '#3a2c58');
    g.addColorStop(1, '#1c1630');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 32);
    ctx.lineTo(x - 15, y - 40);
    ctx.lineTo(x + 15, y - 40);
    ctx.lineTo(x + 24, y + 32);
    ctx.closePath();
    ctx.fill();

    // izzó átok-rúna az obeliszk testén (lüktet)
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.4;
    ctx.strokeStyle = '#b06aff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x - 7, y - 8);
    ctx.lineTo(x + 7, y - 2);
    ctx.lineTo(x - 7, y + 6);
    ctx.lineTo(x, y + 22);
    ctx.stroke();
    ctx.restore();

    // tüske-koszorú a talp körül (befelé/kifelé álló tövisek)
    this.drawThorns(ctx, x, y + 28, 60, 22);
  }

  /** Tüske-koszorú: ovális mentén kifelé álló, görbülő tövisek. */
  private drawThorns(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    const n = 14;
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const bx = cx + Math.cos(a) * rx;
      const by = cy + Math.sin(a) * ry;
      const len = 9 + (i % 3) * 3;
      // kifelé+felfelé görbülő tövis
      const tx = bx + Math.cos(a) * len;
      const ty = by + Math.sin(a) * len * 0.6 - len * 0.5;
      ctx.strokeStyle = i % 2 === 0 ? '#2a1f3a' : '#3a2c54';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, by - len * 0.3, tx, ty);
      ctx.stroke();
    }
  }

  private drawStand(ctx: CanvasRenderingContext2D, s: CurseStand): void {
    const { x, y } = s;

    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 20, 8, 0, 0, TAU);
    ctx.fill();

    // sötét kő talapzat
    this.disc(ctx, x, y + 8, 20, 8, s.sold ? '#1a1424' : '#332646', s.sold ? '#0e0a16' : '#1c1530', 11);
    ctx.strokeStyle = s.sold ? '#241a34' : '#6a4aa0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 20, 8, 0, 0, TAU);
    ctx.stroke();

    if (s.sold) {
      this.label(ctx, x, y + 26, 'AZ ÁTOK MEGTÖRT', '#9a7ec0');
      return;
    }

    // lebegő tárgy
    const yo = -22 + Math.sin(s.bob) * 4;

    // lila fénysugár a talapzatról
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#9b5fe0';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 4);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 22, y + yo);
    ctx.lineTo(x - 22, y + yo);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawItemIcon(ctx, x, y + yo, 13, s.item, { glow: true, rot: Math.sin(s.bob) * 0.16 });

    // átok-ár címke (szív-ikon + szív-darabszám)
    this.priceTag(ctx, x, y + 28, s.cost);
  }

  /** Átok-árcímke: sötét keret + szív-ikon + szív-darabszám (lila tónus). */
  private priceTag(ctx: CanvasRenderingContext2D, x: number, y: number, cost: number): void {
    const hearts = cost / HP.heart;
    const txt = hearts % 1 === 0 ? String(hearts) : hearts.toFixed(1);
    ctx.font = 'bold 13px system-ui';
    const w = ctx.measureText(txt).width + 30;
    ctx.fillStyle = 'rgba(14,8,24,0.85)';
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.fill();
    ctx.strokeStyle = '#7b4ac0';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.stroke();
    // szív-ikon (a fizetség: élet)
    drawHeart(ctx, x - w / 2 + 12, y, 7, '#ff5b6a', '#a02838');
    // ár
    ctx.fillStyle = '#e6d4ff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x + 7, y + 0.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Lapos kő-korong (alátét és párkány). */
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

  private label(ctx: CanvasRenderingContext2D, x: number, y: number, txt: string, col: string): void {
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(txt, x, y + 1);
    ctx.fillStyle = col;
    ctx.fillText(txt, x, y);
    ctx.textAlign = 'left';
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
