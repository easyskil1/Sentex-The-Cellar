import { Boss2, type Boss2Palette } from './Boss2';

/** A lidérc mérge mérgező, savzöld palettája (a lila Lidérc helyett). */
const POISON_PALETTE: Boss2Palette = {
  aura: 'rgba(120,220,70,0.20)',
  orb: '#b6ff5a',
  glow: '#6ad84a',
  robeTop: '#2c4a18',
  robeMid: '#173310',
  robeBottom: 'rgba(8,20,5,0)',
  robeStroke: '#0a1806',
  hood: '#06120a',
  skull: '#e0f0c4',
  jaw: '#b6cc94',
  socket: '#0d1a08',
  eye: '#9aff42',
  thirdEye: '#e6ff2a',
  thirdEyeGlow: '#b6ff20',
  laserCore: '#9aff5a',
  laserHalo: 'rgba(150,255,90,0.3)',
};

/**
 * „A lidérc mérge" — a Lidérc mérgező variánsa. Azonos mechanika és test, de
 * savzöld színvilág és a lepléről folyamatosan csöpögő méreg-cseppek.
 */
export class Boss4 extends Boss2 {
  constructor(x: number, y: number, floor: number, color = '#6ad84a') {
    // Saját, FIX statok és fázisok — független a Lidérc hangolásától.
    // Aknázás (nova) levéve: marad lézer + méreg-kert + spirál.
    super(x, y, floor, color, POISON_PALETTE, {
      hp: 35000,
      dmg: 1.5, // 750 kijelzett pont
      phases: ['sweep', 'garden', 'spiral'],
    });
  }

  /** Csöpögő méreg-cseppek a lepel alja körül (ciklikusan lehullnak). */
  protected override drawAccents(ctx: CanvasRenderingContext2D, flash: boolean): void {
    ctx.save();
    ctx.fillStyle = flash ? '#ffffff' : POISON_PALETTE.orb;
    ctx.shadowColor = POISON_PALETTE.glow;
    ctx.shadowBlur = 8;
    const n = 6;
    const fall = 70; // a csepp esési útja, mielőtt eltűnik
    for (let i = 0; i < n; i++) {
      const bx = (-1 + (i / (n - 1)) * 2) * this.r * 0.85;
      const drip = (this.wob * 26 + i * 41) % fall; // 0..fall ciklikus esés
      const dy = this.r * 0.45 + drip;
      ctx.globalAlpha = Math.max(0, 1 - drip / fall);
      // könnycsepp-alak: körív + felfelé futó hegy
      ctx.beginPath();
      ctx.moveTo(bx, dy - 7);
      ctx.quadraticCurveTo(bx + 4, dy, bx, dy + 4);
      ctx.quadraticCurveTo(bx - 4, dy, bx, dy - 7);
      ctx.fill();
    }
    ctx.restore();
  }
}
