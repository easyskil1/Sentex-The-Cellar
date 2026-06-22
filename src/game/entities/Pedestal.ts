import { TAU } from '../../engine/math';
import type { Item } from '../content/items';
import { drawItemIcon } from '../content/itemIcon';

/** Tárgypedesztál a tárgyszobában: rálépve a játékos megkapja a tárgyat. */
export class Pedestal {
  bob = 0;
  taken = false;
  /** Igaz, ha a játékos most utasította el az ajánlatot — amíg el nem sétál, nem kérdezünk újra. */
  declined = false;
  /** Felirat a talapzat alatt (pl. „INGYEN · <név>"). Üresnél nincs felirat. */
  label = '';

  constructor(public x: number, public y: number, public readonly item: Item) {}

  update(dt: number): void {
    this.bob += dt * 3;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 11, 16 * 0.9, 16 * 0.4, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);

    // kő talapzat
    ctx.fillStyle = '#4a4452';
    ctx.strokeStyle = '#2a2630';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 12, 18, 8, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-12, 2, 24, 12);

    // lebegő tabletta
    const it = this.item;
    const yo = -18 + Math.sin(this.bob) * 4;
    drawItemIcon(ctx, 0, yo, 12, it, { glow: true, rot: Math.sin(this.bob) * 0.16 });

    // fénysugár
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = it.col;
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.lineTo(10, 2);
    ctx.lineTo(20, yo);
    ctx.lineTo(-20, yo);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    // felirat a talapzat alatt (pl. INGYEN)
    if (this.label) {
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(this.label, this.x, this.y + 31);
      ctx.fillStyle = '#9bffb0';
      ctx.fillText(this.label, this.x, this.y + 30);
      ctx.textAlign = 'left';
    }
  }
}
