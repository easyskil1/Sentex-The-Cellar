import { BossMummy, type MummyPalette } from './BossMummy';
import { TAU } from '../../../engine/math';

/** Lángoló, vérvörös palettájú „Múmia haragja". */
const RAGE_PALETTE: MummyPalette = {
  wrapLight: '#d8b496',
  wrapMid: '#9c6346',
  wrapDark: '#3a1c12',
  voidCol: '#1a0805',
  eye: '#fff0a0',
  eyeGlow: '#ff5a1e',
  bullet: '#ffb060',
};

/**
 * „Múmia haragja" — a Múmia feldühödött, lángoló variánsa: parázsló kötések,
 * tűzcsapdák (homok helyett), gyorsabb tempó és erősebb sebzés.
 */
export class BossMummyRage extends BossMummy {
  constructor(x: number, y: number, floor: number, color = '#9c6a4e') {
    super(x, y, floor, color, {
      hp: 38000,
      dmg: 2, // 1000 kijelzett pont
      speed: 92,
      score: 2400 + floor * 600,
      pal: RAGE_PALETTE,
      ground: 'fire',
    });
  }

  /** Parázsló lángnyelvek a kötések közül (a test előtt). */
  protected override drawAccents(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const r = this.r;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const bx = (-1 + (i / (n - 1)) * 2) * r * 0.5;
      const base = r * (0.1 + (i % 3) * 0.18);
      // a láng magassága lüktet
      const h = r * (0.34 + 0.22 * (0.5 + 0.5 * Math.sin(this.wob * 3 + i * 1.3)));
      const flick = Math.sin(this.wob * 5 + i) * r * 0.05;
      const g = ctx.createLinearGradient(bx, base, bx, base - h);
      g.addColorStop(0, flash ? 'rgba(255,255,255,0.9)' : 'rgba(255,120,30,0.85)');
      g.addColorStop(0.6, 'rgba(255,60,10,0.45)');
      g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.1, base);
      ctx.quadraticCurveTo(bx - r * 0.06 + flick, base - h * 0.6, bx + flick, base - h);
      ctx.quadraticCurveTo(bx + r * 0.06 + flick, base - h * 0.6, bx + r * 0.1, base);
      ctx.closePath();
      ctx.fill();
    }
    // a fej fölött parázs-szikrák
    for (let i = 0; i < 5; i++) {
      const a = this.wob * 1.6 + (i / 5) * TAU;
      const sx = Math.cos(a) * r * 0.5;
      const sy = -r * 0.7 + Math.sin(a) * r * 0.2 - (this.wob * 20 % (r * 0.5));
      ctx.fillStyle = 'rgba(255,160,60,0.7)';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
