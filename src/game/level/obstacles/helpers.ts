import { TAU } from '../../../engine/math';

/* Megosztott pálya-tárgy al-rajzolók (talaj-árnyék, fenyő-szint, láng, lekerekített téglalap). */

/** Lágy talp-árnyék minden álló tárgy alá. */
export function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.3): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** Segéd: egy fenyő-emelet (lekerekített aljú háromszög). `pathOnly` esetén
 *  csak útvonalat épít (cliphez), egyébként kitölt. */
export function drawConiferTier(ctx: CanvasRenderingContext2D, cx: number, topY: number, botY: number, halfW: number, pathOnly = false): void {
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx + halfW, botY);
  ctx.quadraticCurveTo(cx + halfW * 0.4, botY + halfW * 0.16, cx, botY + halfW * 0.05);
  ctx.quadraticCurveTo(cx - halfW * 0.4, botY + halfW * 0.16, cx - halfW, botY);
  ctx.closePath();
  if (!pathOnly) ctx.fill();
}

/** Lobogó láng-csóva fény-udvarral és szikrákkal — fáklya/parázstartó/tábortűz
 *  közös rajzolója. (cx, baseY = a láng töve; w/h = méret; t = idő.) */
export function drawFlame(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number, t: number, seed: number, embers = true): void {
  const fl = Math.sin(t * 9 + seed * 7) * 0.12 + Math.sin(t * 17 + seed) * 0.06; // pislákolás
  const hh = h * (1 + fl);
  const sway = Math.sin(t * 6 + seed * 4) * w * 0.18;

  // fény-udvar
  const halo = ctx.createRadialGradient(cx, baseY - hh * 0.4, 0, cx, baseY - hh * 0.4, hh * 1.4);
  halo.addColorStop(0, 'rgba(255,180,70,0.4)');
  halo.addColorStop(0.5, 'rgba(255,120,40,0.14)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, baseY - hh * 0.4, hh * 1.4, 0, TAU);
  ctx.fill();

  const flame = (scale: number, color: string, topSway: number) => {
    const top = baseY - hh * scale;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5 * scale, baseY);
    ctx.quadraticCurveTo(cx - w * 0.55 * scale, baseY - hh * 0.4 * scale, cx - w * 0.18 * scale, baseY - hh * 0.62 * scale);
    ctx.quadraticCurveTo(cx + topSway - w * 0.12 * scale, top + hh * 0.18 * scale, cx + topSway, top);
    ctx.quadraticCurveTo(cx + topSway + w * 0.12 * scale, top + hh * 0.18 * scale, cx + w * 0.18 * scale, baseY - hh * 0.62 * scale);
    ctx.quadraticCurveTo(cx + w * 0.55 * scale, baseY - hh * 0.4 * scale, cx + w * 0.5 * scale, baseY);
    ctx.closePath();
    ctx.fill();
  };
  flame(1.0, '#d8431a', sway);          // külső, sötét-narancs
  flame(0.74, '#ff8a2a', sway * 1.2);   // közép, narancs
  flame(0.46, '#ffd24a', sway * 1.4);   // belső, sárga
  flame(0.22, '#fff3c0', sway * 1.5);   // mag, fehér-sárga

  if (embers) {
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.6 + i * 0.2 + seed) % 1;
      const ex = cx + Math.sin(i * 2 + seed * 3) * w * 0.6 + sway;
      const ey = baseY - p * hh * 1.5;
      ctx.fillStyle = `rgba(255,${160 + ((i * 30) % 80)},60,${(1 - p) * 0.8})`;
      ctx.beginPath();
      ctx.arc(ex, ey, (1.4 - p) + 0.4, 0, TAU);
      ctx.fill();
    }
  }
}

/** Lekerekített téglalap útvonal (segéd a fenti rajzolókhoz). */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
