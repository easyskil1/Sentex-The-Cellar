import { TAU, rand } from '../../engine/math';
import type { Item } from '../content/items';
import { rollItem } from '../content/items';
import { drawItemIcon } from '../content/itemIcon';
import { drawHeart } from './Pickup';
import { softGlow } from '../render/glow';
import { HP, BLOOD } from '../config';

/** Egy vér-oltár-állvány: egy tárgy, FIX szív-árért (HP). */
export interface BloodStand {
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
 * A vér-oltár szoba berendezése (#35): középen egy izzó vér-medence, körülötte
 * tárgy-állványok. A bolttal szemben itt NEM érme, hanem ÉLETPONT (vér) a fizetség
 * (fix ár / tárgy). Csak adat + látvány; a vásárlás logikája (HP-levonás, tárgy
 * felvétele) a `World`-ben él, mert a játékosra hat. Lásd `World.updateBloodAltar`.
 */
export class BloodAltar {
  stands: BloodStand[] = [];
  /** A vér-medence interakciós középpontja (csak látvány). */
  readonly cx: number;
  readonly cy: number;
  t = 0;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    const n = Math.max(1, BLOOD.stands);
    const span = 200;
    const x0 = cx - (span * (n - 1)) / 2;
    const used = new Set<string>();
    for (let i = 0; i < n; i++) {
      this.stands.push({
        x: x0 + i * span,
        y: cy + 150,
        item: this.rollNonSkill(used),
        cost: BLOOD.cost,
        sold: false,
        declined: false,
        bob: rand(0, TAU),
      });
    }
  }

  /** Vér-oltár: stat-perk/relikvia (NEM skill-tárgy, hogy ne kelljen csere-ablak). */
  private rollNonSkill(used: Set<string>): Item {
    let item = rollItem();
    let guard = 0;
    while ((item.skill || used.has(item.name)) && guard++ < 32) item = rollItem();
    used.add(item.name);
    return item;
  }

  update(dt: number): void {
    this.t += dt;
    for (const s of this.stands) s.bob += dt * 2.2;
  }

  // ---- Kirajzolás ----
  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBasin(ctx);
    for (const s of this.stands) this.drawStand(ctx, s);
  }

  /** Gótikus vér-medence: sötét kő-talp + izzó, lüktető vér-tükör. */
  private drawBasin(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const y = this.cy - 18;
    const pulse = 0.5 + Math.sin(this.t * 2.4) * 0.5;

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 52, 84, 28, 0, 0, TAU);
    ctx.fill();

    // alsó lépcső (sötét kő)
    this.disc(ctx, x, y + 34, 76, 26, '#3a2228', '#1f1216', 15);
    ctx.strokeStyle = '#5a2a30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 34, 76, 26, 0, 0, TAU);
    ctx.stroke();

    // kehely-törzs
    const colW = 30;
    const g = ctx.createLinearGradient(x - colW, 0, x + colW, 0);
    g.addColorStop(0, '#241419');
    g.addColorStop(0.5, '#47282f');
    g.addColorStop(1, '#241419');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - colW, y + 32);
    ctx.lineTo(x - 22, y - 6);
    ctx.lineTo(x + 22, y - 6);
    ctx.lineTo(x + colW, y + 32);
    ctx.closePath();
    ctx.fill();

    // a kelyhet tartó perem
    this.disc(ctx, x, y - 8, 50, 17, '#3a2228', '#1f1216', 8);

    // ---- a VÉR-TÜKÖR a kehely tetején ----
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    softGlow(ctx, x, y - 12, 38 + pulse * 12, '#c81f2e');
    ctx.restore();

    // a vér felülete
    const bg = ctx.createRadialGradient(x - 8, y - 16, 3, x, y - 12, 46);
    bg.addColorStop(0, '#ff5a52');
    bg.addColorStop(0.45, '#c01828');
    bg.addColorStop(1, '#5e0c14');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 46, 16, 0, 0, TAU);
    ctx.fill();

    // lassú fodrozódás (két koncentrikus gyűrű)
    ctx.strokeStyle = 'rgba(255,120,110,0.5)';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 2; k++) {
      const rr = ((this.t * 14 + k * 22) % 44);
      ctx.globalAlpha = Math.max(0, 1 - rr / 44);
      ctx.beginPath();
      ctx.ellipse(x, y - 12, 6 + rr * 0.9, 2 + rr * 0.32, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // csordogáló csepp a peremen
    const dy = (this.t * 30) % 26;
    ctx.fillStyle = 'rgba(170,18,30,0.85)';
    ctx.beginPath();
    ctx.ellipse(x - 40, y - 6 + dy, 2.2, 3.4, 0, 0, TAU);
    ctx.fill();
  }

  private drawStand(ctx: CanvasRenderingContext2D, s: BloodStand): void {
    const { x, y } = s;

    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 20, 8, 0, 0, TAU);
    ctx.fill();

    // sötét kő talapzat
    this.disc(ctx, x, y + 8, 20, 8, s.sold ? '#241418' : '#4a2a30', s.sold ? '#140b0e' : '#26161a', 11);
    ctx.strokeStyle = s.sold ? '#2a181c' : '#7a2a32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 20, 8, 0, 0, TAU);
    ctx.stroke();

    if (s.sold) {
      this.label(ctx, x, y + 26, 'ÁLDOZVA', '#8a6a6e');
      return;
    }

    // lebegő tárgy
    const yo = -22 + Math.sin(s.bob) * 4;

    // vörös fénysugár a talapzatról
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#d83040';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 4);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 22, y + yo);
    ctx.lineTo(x - 22, y + yo);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawItemIcon(ctx, x, y + yo, 13, s.item, { glow: true, rot: Math.sin(s.bob) * 0.16 });

    // vér-ár címke (szív-ikon + szám)
    this.priceTag(ctx, x, y + 28, s.cost);
  }

  /** Vér-árcímke: sötét keret + szív-ikon + szív-darabszám. */
  private priceTag(ctx: CanvasRenderingContext2D, x: number, y: number, cost: number): void {
    const hearts = cost / HP.heart;
    const txt = hearts % 1 === 0 ? String(hearts) : hearts.toFixed(1);
    ctx.font = 'bold 13px system-ui';
    const w = ctx.measureText(txt).width + 30;
    ctx.fillStyle = 'rgba(24,6,8,0.85)';
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.fill();
    ctx.strokeStyle = '#a02838';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, x - w / 2, y - 10, w, 20, 7);
    ctx.stroke();
    // szív-ikon
    drawHeart(ctx, x - w / 2 + 12, y, 7, '#ff5b6a', '#a02838');
    // ár
    ctx.fillStyle = '#ffd0d4';
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
