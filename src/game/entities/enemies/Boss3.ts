import { Boss } from './Boss';
import { TAU } from '../../../engine/math';

/**
 * A mérges Fenevad — a klasszikus Fenevad variánsa. Ugyanaz a viselkedés és
 * test, de fekete szem + fekete (morgó) száj és karok/öklök. Csak a rajz
 * felülírt hook-jai különböznek (lásd `Boss.drawFace` / `Boss.drawArms`).
 */
export class Boss3 extends Boss {
  constructor(x: number, y: number, floor: number, color = '#9c4bd8') {
    // A mérges Fenevad saját, FIX statjai és mintái — független a klasszikus
    // Fenevad hangolásától (30000 HP, 750 sebzés, mindhárom támadás-minta).
    // dmg fél-szívben: 1.5 × HP.half(500) = 750 kijelzett pont.
    super(x, y, floor, color, { hp: 30000, dmg: 1.5, attacks: ['circle', 'spread', 'dash'] });
  }

  /** Fekete szem (dühös szemöldökkel) + tömör fekete száj — izzás nélkül. */
  protected override drawFace(ctx: CanvasRenderingContext2D, flash: boolean): void {
    // Szemek — tömör fekete (nincs piros izzás)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-16, -6, 10, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, -6, 10, 0, TAU);
    ctx.fill();

    // Találat-villanáskor apró fehér csillanás, hogy a sebzés látsszon
    if (flash) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-16, -6, 4, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, -6, 4, 0, TAU);
      ctx.fill();
    }

    // Dühös szemöldök (fekete, befelé-lefelé dőlő) — a „mérges" kifejezés
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.lineTo(-6, -12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28, -22);
    ctx.lineTo(6, -12);
    ctx.stroke();

    // Száj — tömör fekete, morgó (széles nyitott)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 16, 17, 11, 0, 0, TAU);
    ctx.fill();

    // Két alsó agyar a fekete szájból
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 9, 22);
      ctx.lineTo(s * 6, 14);
      ctx.lineTo(s * 12, 14);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Két kar a test két oldalán, a végükön ököl. */
  protected override drawArms(ctx: CanvasRenderingContext2D, flash: boolean): void {
    const armCol = flash ? '#ffdede' : '#7a1422';
    const fistCol = flash ? '#ffffff' : '#4a0c16';
    for (const s of [-1, 1]) {
      // felkar: a test oldaláról kifelé-lefelé
      ctx.strokeStyle = armCol;
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * (this.r * 0.6), 8);
      ctx.lineTo(s * (this.r * 1.25), 30);
      ctx.stroke();

      // ököl a kar végén
      ctx.fillStyle = fistCol;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s * (this.r * 1.25), 30, 12, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // két bütyök az öklön
      ctx.fillStyle = '#000';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * (this.r * 1.25) + k * 4, 26, 1.6, 0, TAU);
        ctx.fill();
      }
    }
  }
}
