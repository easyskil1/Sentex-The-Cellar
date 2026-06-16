import { BossSatan, type SatanPalette } from './BossSatan';
import { TAU } from '../../../engine/math';

/** Obszidián-lila, hamvadó palettájú „Sátán keze". */
const HAND_PALETTE: SatanPalette = {
  bodyTop: '#7e2a86',
  bodyMid: '#46124e',
  bodyLow: '#1a061e',
  stroke: '#0c020e',
  horn: '#1c1020',
  hornTip: '#050207',
  wing: '#3a1142',
  wingEdge: '#140418',
  eye: '#b6ff5a',
  eyeGlow: '#86ff20',
  aura: 'rgba(150,40,200,0.18)',
  flameA: 'rgba(180,90,255,0.9)',
  flameB: 'rgba(120,20,200,0)',
  metal: '#c9a6e8',
};

/**
 * „Sátán keze" — a Sátán sötét, démonibb variánsa: obszidián-lila bőr, mérgező-
 * zöld szem, kísérteties lila láng, és két ÓRIÁSI karmos kéz, amely a test két
 * oldalán fenyegetően nyúlik ki.
 */
export class BossSatanHand extends BossSatan {
  constructor(x: number, y: number, floor: number, color = '#46124e') {
    super(x, y, floor, color, {
      hp: 48000,
      dmg: 2.5, // 1250 kijelzett pont
      speed: 86,
      score: 3000 + floor * 700,
      pal: HAND_PALETTE,
    });
  }

  /** Két óriási karmos kéz a test mellett (a lángkoszorú alá, a test fölé). */
  protected override drawAccents(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const r = this.r;
    const reach = r * (1.0 + 0.07 * Math.sin(this.bob)); // finom ki-be légzés
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * reach, r * 0.5);
      ctx.scale(s, 1);

      // alkar
      ctx.strokeStyle = flash ? '#ffffff' : HAND_PALETTE.bodyMid;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.45);
      ctx.lineTo(0, 0);
      ctx.stroke();

      // tenyér
      ctx.fillStyle = flash ? '#fff' : '#3a1240';
      ctx.strokeStyle = HAND_PALETTE.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.24, r * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // négy ívelt csontkarom, finom markoló mozgással
      for (let i = 0; i < 4; i++) {
        const spread = 0.5 + i * 0.36;
        const curl = 0.12 * Math.sin(this.wing + i);
        const baseA = -0.7 + spread;
        const len = r * (0.42 - i * 0.03);
        const bx = Math.cos(baseA) * r * 0.2;
        const by = Math.sin(baseA) * r * 0.18;
        const tipA = baseA + 0.5 + curl;
        const tx = bx + Math.cos(tipA) * len;
        const ty = by + Math.sin(tipA) * len;
        const mx = bx + Math.cos(baseA + 0.2) * len * 0.6;
        const my = by + Math.sin(baseA + 0.2) * len * 0.6;
        ctx.fillStyle = flash ? '#fff' : '#e6d6dc';
        ctx.strokeStyle = HAND_PALETTE.stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - 3, by - 3);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.quadraticCurveTo(mx + 3, my + 3, bx + 3, by + 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
