import { TAU, shade } from '../../engine/math';
import { softGlow } from '../render/glow';

/** Tabletta-sziluett: a tárgyak ilyen alakú „gyógyszerként" jelennek meg. */
export type PillShape = 'round' | 'oval' | 'capsule' | 'diamond' | 'hexagon' | 'triangle';

/** A tabletta felületi mintája (a szín mellett ez különbözteti meg a tárgyakat). */
export type PillPattern = 'plain' | 'split' | 'dot' | 'ring' | 'cross' | 'bars';

/** Egy tabletta teljes kinézete (a tárgyból az `items.pillLook` állítja elő). */
export interface PillLook {
  col: string;
  col2: string;
  shape: PillShape;
  pattern: PillPattern;
}

export interface PillOpts {
  /** Ragyogás a tabletta körül (a pedesztálon lebegő tárgyhoz). */
  glow?: boolean;
  /** Elforgatás radiánban (lebegő billegéshez). */
  rot?: number;
}

/**
 * Egy tabletta kirajzolása az `(cx, cy)` középpont köré, `r` ~ félmérettel.
 * Ugyanezt használja a pedesztál (nagy, ragyogó) és a HUD lista (apró ikon),
 * így a felvett tárgy ugyanúgy néz ki a listában, mint a földön.
 */
export function drawPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  look: PillLook,
  opts: PillOpts = {},
): void {
  const { glow = false, rot = 0 } = opts;
  const col = look.col;
  const col2 = look.col2 || shade(col, -0.38);

  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);

  if (glow) softGlow(ctx, 0, 0, r * 1.7, col); // cache-elt fénykoszorú a shadowBlur helyett

  // alaptest — függőleges gradiens a domború, 3D hatásért
  buildShape(ctx, r, look.shape);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, -0.24));
  ctx.fillStyle = g;
  ctx.fill();

  // minta + csillanás a sziluetten belülre vágva
  ctx.save();
  buildShape(ctx, r, look.shape);
  ctx.clip();

  if (look.shape === 'capsule') {
    // kapszula: a jobb fele a másodlagos szín, középen varratvonal
    ctx.fillStyle = col2;
    ctx.fillRect(0, -r * 1.3, r * 2, r * 2.6);
    const g2 = ctx.createLinearGradient(0, -r, 0, r);
    g2.addColorStop(0, 'rgba(255,255,255,0.3)');
    g2.addColorStop(0.5, 'rgba(255,255,255,0)');
    g2.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, -r * 1.3, r * 2, r * 2.6);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
  } else {
    drawPattern(ctx, r, look.pattern, col2);
  }

  // fényes csillanás bal-felül
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.4, r * 0.42, r * 0.24, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();

  // körvonal
  buildShape(ctx, r, look.shape);
  ctx.strokeStyle = shade(col, -0.46);
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();

  ctx.restore();
}

/** A tabletta sziluett-path-ja az origó köré (kitöltéshez és vágáshoz egyaránt).
 *  Exportált: a relikvia-ikon (`itemIcon.ts`) ugyanezt használja az ékkő alakjához. */
export function buildShape(ctx: CanvasRenderingContext2D, r: number, shape: PillShape): void {
  ctx.beginPath();
  switch (shape) {
    case 'round':
      ctx.arc(0, 0, r, 0, TAU);
      break;
    case 'oval':
      ctx.ellipse(0, 0, r * 1.2, r * 0.82, 0, 0, TAU);
      break;
    case 'capsule': {
      const hw = r * 1.5;
      const hh = r * 0.8;
      roundRectPath(ctx, -hw, -hh, hw * 2, hh * 2, hh);
      break;
    }
    case 'diamond':
      ctx.moveTo(0, -r * 1.22);
      ctx.lineTo(r * 1.06, 0);
      ctx.lineTo(0, r * 1.22);
      ctx.lineTo(-r * 1.06, 0);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const x = Math.cos(a) * r * 1.08;
        const y = Math.sin(a) * r * 1.08;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      break;
    case 'triangle': {
      const R = r * 1.3;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU - Math.PI / 2;
        const x = Math.cos(a) * R;
        const y = Math.sin(a) * R + r * 0.16;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      break;
    }
  }
}

/** A tabletta felületi jele (a `col2` másodlagos színnel). */
function drawPattern(ctx: CanvasRenderingContext2D, r: number, pattern: PillPattern, col2: string): void {
  ctx.fillStyle = col2;
  ctx.strokeStyle = col2;
  ctx.lineCap = 'round';
  switch (pattern) {
    case 'plain':
      break;
    case 'split':
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 1.4, 0);
      ctx.lineTo(r * 1.4, 0);
      ctx.stroke();
      break;
    case 'dot':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, TAU);
      ctx.fill();
      break;
    case 'ring':
      ctx.lineWidth = Math.max(1.2, r * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, TAU);
      ctx.stroke();
      break;
    case 'cross':
      ctx.lineWidth = Math.max(1.4, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(0, r * 0.55);
      ctx.moveTo(-r * 0.55, 0);
      ctx.lineTo(r * 0.55, 0);
      ctx.stroke();
      break;
    case 'bars':
      ctx.lineWidth = Math.max(1, r * 0.16);
      for (const ox of [-r * 0.45, 0, r * 0.45]) {
        ctx.beginPath();
        ctx.moveTo(ox, -r * 0.5);
        ctx.lineTo(ox, r * 0.5);
        ctx.stroke();
      }
      break;
  }
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
