import { Boss } from './Boss';
import { drawEnemy } from './renderers';
import { clamp } from '../../../engine/math';

/**
 * A mérges Fenevad — a klasszikus Fenevad variánsa. Ugyanaz a viselkedés és
 * test, de fekete szem + fekete (morgó) száj és karok/öklök.
 * Most már a modern drawBossBeast renderelőt használja.
 */
export class Boss3 extends Boss {
  constructor(x: number, y: number, floor: number, color = '#ff3a3a') {
    // A mérges Fenevad saját, FIX statjai és mintái.
    super(x, y, floor, color, { hp: 30000, dmg: 1.5, attacks: ['circle', 'spread', 'dash'] });
  }

  protected override hasArms(): boolean {
    return true;
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    drawEnemy(ctx, {
      kind: 'boss3',
      x: this.x,
      y: this.y,
      r: this.r,
      col: this.col,
      col2: this.col2,
      flash: this.flash > 0,
      bob: this.bob,
      wob: this.wob,
      face: this.state === 'dash' ? Math.atan2(this.cvy, this.cvx) : 0,
      moving: this.state === 'dash' || !this.entering,
      charge: this.state === 'dash' ? 'dash' : 'idle',
      active: this.shootCd < 0.4,
      arms: true,
    });

    // HP-csík (Boss3 speciális szín)
    if (this.hp < this.maxHp) {
      const w = this.r * 2.2;
      const x = this.x - w / 2;
      const y = this.y - this.r - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#ff2a4a';
      ctx.fillRect(x, y, w * clamp(this.hp / this.maxHp, 0, 1), 5);
    }
  }
}
