import { TAU, rand } from '../../engine/math';

export type PickupType = 'heart' | 'coin' | 'tnt' | 'bomb';

/** Felvehető tárgy a padlón (szív, érme vagy bomba). A felvételt a World kezeli. */
export class Pickup {
  bob = rand(0, TAU);
  dead = false;

  constructor(public x: number, public y: number, public readonly type: PickupType) {}

  update(dt: number): void {
    this.bob += dt * 4;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(this.bob) * 3);
    if (this.type === 'heart') {
      drawHeart(ctx, 0, 0, 9, '#ff5b6a', '#a02838');
    } else if (this.type === 'tnt' || this.type === 'bomb') {
      drawBombIcon(ctx, 0, 0, 9, this.type);
    } else {
      drawCoinIcon(ctx, 0, 0, 8);
    }
    ctx.restore();
  }
}

/** Robbanószer-ikon (pickuphoz és HUD-hoz). `variant`: 'tnt' | 'bomb'. */
export function drawBombIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, variant: 'tnt' | 'bomb',
): void {
  ctx.save();
  ctx.translate(x, y);
  if (variant === 'tnt') {
    // dinamit-rúd: hengeres test átmenettel, fémes szalagok, veszély-csík
    const w = r * 2;
    const h = r * 1.6;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#e0533c');
    g.addColorStop(0.5, '#c0392b');
    g.addColorStop(1, '#7a1f17');
    ctx.fillStyle = g;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 2.5);
    ctx.fill();
    // felső highlight
    ctx.fillStyle = 'rgba(255,210,190,0.35)';
    roundRectPath(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h * 0.22, 2);
    ctx.fill();
    // fémes szalagok
    ctx.fillStyle = 'rgba(40,16,10,0.85)';
    ctx.fillRect(-w / 2, -h * 0.28, w, 2.2);
    ctx.fillRect(-w / 2, h * 0.14, w, 2.2);
    ctx.strokeStyle = 'rgba(20,8,5,0.9)';
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 2.5);
    ctx.stroke();
  } else {
    // gömb-bomba: erős radiális gradiens + fény-folt + perem-fény
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, r * 0.1, r * 1.15);
    g.addColorStop(0, '#5a5a68');
    g.addColorStop(0.5, '#2c2c36');
    g.addColorStop(1, '#101016');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    // perem-fény alul (visszavert fény)
    ctx.beginPath();
    ctx.arc(0, 0, r, TAU * 0.1, TAU * 0.4);
    ctx.strokeStyle = 'rgba(120,130,160,0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // fő fény-folt
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.4, r * 0.32, r * 0.22, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }
  // kanóc
  ctx.strokeStyle = '#9c7a32';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.7, -r - r * 0.5, r * 0.32, -r - r);
  ctx.stroke();
  // szikra (kettős: külső lágy glow + belső éles)
  ctx.fillStyle = 'rgba(255,170,60,0.5)';
  ctx.beginPath();
  ctx.arc(r * 0.32, -r - r, r * 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff0b0';
  ctx.beginPath();
  ctx.arc(r * 0.32, -r - r, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Festett arany érme (HUD és pickup is használja): perem-gyűrű + fény + jel. */
export function drawCoinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  // külső perem-gyűrű (sötétebb arany)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#a8761f';
  ctx.fill();
  // belső korong radiális gradienssel (fény bal-felül)
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 0.95);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.55, '#f4c560');
  g.addColorStop(1, '#d39a32');
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  // fényes ív a bal-felső peremen
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 0.82, Math.PI * 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.lineCap = 'round';
  ctx.stroke();
  // ¢ jel (dombornyomott: sötét alá + jel)
  ctx.font = `700 ${Math.max(7, Math.round(r * 1.2))}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  ctx.fillText('¢', 0, r * 0.16);
  ctx.fillStyle = '#7a5212';
  ctx.fillText('¢', 0, r * 0.08);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

/**
 * Modern szív-ikon (HUD és pickup is használja): teltebb, lágyan lekerekített
 * forma, függőleges gradienssel és bal-felső csillanással — kevésbé „lapos".
 */
export function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number, fill: string, stroke: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);

  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, 4.6);
    ctx.bezierCurveTo(-1.8, 1.2, -9.4, -3, -9.4, -10);
    ctx.bezierCurveTo(-9.4, -15.8, -3.2, -17, 0, -12);
    ctx.bezierCurveTo(3.2, -17, 9.4, -15.8, 9.4, -10);
    ctx.bezierCurveTo(9.4, -3, 1.8, 1.2, 0, 4.6);
    ctx.closePath();
  };

  // test: függőleges 3-stop gradiens (fényes tető → mély alj)
  path();
  const g = ctx.createLinearGradient(0, -17, 0, 6);
  g.addColorStop(0, lighten(fill, 0.42));
  g.addColorStop(0.5, fill);
  g.addColorStop(1, darken(fill, 0.22));
  ctx.fillStyle = g;
  ctx.fill();

  // belső alsó árnyék — mélységérzet
  path();
  const sh = ctx.createRadialGradient(0, -10, 2, 0, -3, 17);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = sh;
  ctx.fill();

  // határozott kontúr (a fill sötét árnyalata, nem koromfekete)
  path();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // fő csillanás (nagy, lágy) + éles fénypont
  ctx.beginPath();
  ctx.ellipse(-4.2, -9.6, 3, 4.2, -0.5, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-5, -11.4, 1.1, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();

  ctx.restore();
}

/** Lekerekített téglalap útvonal (kitöltés/körvonal a hívó dolga). */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Egy #rrggbb színt világosít `amt` (0..1) arányban fehér felé. */
function lighten(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Egy #rrggbb színt sötétít `amt` (0..1) arányban fekete felé. */
function darken(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c * (1 - amt));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
