import { BossDragon, type DragonPalette } from './BossDragon';

/** Sötét bíbor, fenyegető palettájú „Kétfejű sárkány". */
const TWIN_PALETTE: DragonPalette = {
  scaleTop: '#8a2a6a',
  scaleMid: '#5a164a',
  scaleLow: '#220420',
  belly: '#d89a4a',
  stroke: '#120210',
  wing: '#4a1240',
  wingEdge: '#1a0418',
  spine: '#ff7a3a',
  eye: '#ff4a6a',
  eyeGlow: '#ff1e4a',
  horn: '#e0c0c8',
  aura: 'rgba(200,40,120,0.14)',
};

/**
 * „Kétfejű sárkány" — a Sárkány nagyobb, sötét bíbor, KÉTFEJŰ variánsa. A két
 * nyak enyhén széttart, és mindkét fej külön a játékos felé fordul.
 */
export class BossDragonTwin extends BossDragon {
  constructor(x: number, y: number, floor: number, color = '#5a164a') {
    super(x, y, floor, color, {
      hp: 60000,
      dmg: 2.5, // 1250 kijelzett pont
      speed: 80,
      score: 3600 + floor * 800,
      pal: TWIN_PALETTE,
    });
    this.r = 56; // nagyobb test
  }

  /** Két nyak + fej, enyhén széttartva. */
  protected override drawHeads(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const r = this.r;
    // bal fej (kissé balra néz), majd jobb fej (kissé jobbra néz)
    this.drawOneHead(ctx, -r * 0.34, -r * 0.52, -r * 0.86, this.faceAng - 0.32, flash);
    this.drawOneHead(ctx, r * 0.34, r * 0.52, -r * 0.86, this.faceAng + 0.32, flash);
  }
}
