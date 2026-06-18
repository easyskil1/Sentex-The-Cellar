import { TAU } from '../../engine/math';

export type BombType = 'tnt' | 'bomb';

/**
 * Lerakható robbanószer. A játékos lerakja, X mp múlva felrobban,
 * és sebzi a robbanási sugarában lévő ellenfeleket, köveket — és a játékost is.
 *  - tnt: nagyobb hatókör, nagyobb sebzés (piros dinamit)
 *  - bomb: kisebb hatókör, kisebb sebzés (klasszikus kerek bomba)
 */
export class Bomb {
  fuse: number;
  readonly r: number; // robbanási sugár
  readonly dmg: number; // ellenfél-sebzés

  constructor(public x: number, public y: number, public readonly type: BombType) {
    if (type === 'tnt') {
      this.fuse = 1.6;
      this.r = 120;
      this.dmg = 8000;
    } else {
      this.fuse = 1.4;
      this.r = 64;
      this.dmg = 4000;
    }
  }

  update(dt: number): void {
    this.fuse -= dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const flash = this.fuse < 0.7 && Math.floor(this.fuse * 14) % 2 === 0;
    if (this.type === 'tnt') this.drawTnt(ctx, flash);
    else this.drawBomb(ctx, flash);
    this.drawFuse(ctx);
  }

  private drawBomb(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const r = 11;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.8, r, r * 0.45, 0, 0, TAU);
    ctx.fill();

    const g = ctx.createRadialGradient(this.x - 3, this.y - 4, 2, this.x, this.y, r);
    g.addColorStop(0, flash ? '#ffd0b0' : '#3a3a46');
    g.addColorStop(1, flash ? '#ff7a4a' : '#17171d');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#08080c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(this.x - r * 0.3, this.y - r * 0.35, r * 0.28, r * 0.18, -0.5, 0, TAU);
    ctx.fill();
  }

  private drawTnt(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const w = 24;
    const h = 18;
    const x = this.x - w / 2;
    const y = this.y - h / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + h * 0.55, w * 0.55, h * 0.3, 0, 0, TAU);
    ctx.fill();

    // dinamitrudak (piros, hengeres árnyalással)
    const stickW = w / 3;
    for (let i = 0; i < 3; i++) {
      const sx = x + i * stickW;
      const g = ctx.createLinearGradient(sx, 0, sx + stickW, 0);
      g.addColorStop(0, flash ? '#ff9a6a' : '#7a1f17');
      g.addColorStop(0.5, flash ? '#ffd0a0' : '#c0392b');
      g.addColorStop(1, flash ? '#ff9a6a' : '#7a1f17');
      ctx.fillStyle = g;
      ctx.fillRect(sx, y, stickW - 0.5, h);
    }
    // körvonal + középső sötét szalag + felirat-csík
    ctx.strokeStyle = '#3a0e08';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#4a140c';
    ctx.fillRect(x, this.y - 3, w, 6);
    ctx.fillStyle = '#ffd36a';
    ctx.font = 'bold 6px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', this.x, this.y + 0.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawFuse(ctx: CanvasRenderingContext2D): void {
    const topY = this.y - (this.type === 'tnt' ? 11 : 11);
    ctx.strokeStyle = '#b8923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, topY);
    ctx.quadraticCurveTo(this.x + 7, topY - 7, this.x + 3, topY - 13);
    ctx.stroke();
    ctx.fillStyle = Math.random() < 0.6 ? '#ffd36a' : '#ff6a3a';
    ctx.shadowColor = '#ff9a3a';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x + 3, topY - 14, 2.5 + Math.random() * 1.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
