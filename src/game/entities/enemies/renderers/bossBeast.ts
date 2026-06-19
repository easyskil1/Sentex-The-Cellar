import type { EnemyVisual } from './types';
import { TAU } from '../../../../engine/math';
import { lighten, darken, shadow, glow, radial2, radial4 } from './helpers';

/**
 * BOSS 1: A Fenevad — Az alap boss modernizált, rétegzelt renderelője.
 * 
 * Vizuális újítások:
 * 1. Többrétegű, lüktető sötét test élfénnyel.
 * 2. Dinamikusabb tüskék (shards), amik reagálnak a boss mozgására.
 * 3. „A mélység szeme": Izzó pupilla, flickering írisz és satellite szemek.
 * 4. Páncél-szerű szarvak és részletesebb száj fehér agyarakkal.
 * 5. Aura-effekt: Sötét köd és vörös izzás a boss körül.
 */
export function drawBossBeast(ctx: CanvasRenderingContext2D, v: EnemyVisual): void {
  const { r } = v;
  const dash = v.charge === 'dash';
  const time = performance.now() / 1000;
  const pulse = 1 + Math.sin(v.bob) * 0.04;
  const angry = dash || v.active;

  const bodyBase = v.flash ? '#fff' : v.col;
  const bodyDark = v.flash ? '#000' : v.col2;
  const bodyLight = v.flash ? '#fff' : lighten(v.col, 0.35);

  // 1. ÁRNYÉK ÉS AURA
  shadow(ctx, v, 1.3, 0.95);
  
  ctx.save();
  ctx.translate(v.x, v.y);
  
  // Lüktető vörös köd a boss körül
  const auraRad = r * (1.8 + Math.sin(time * 2) * 0.15);
  const aura = radial2(ctx, 0, 0, r * 0.5, 0, 0, auraRad, angry ? 'rgba(255,30,30,0.25)' : 'rgba(180,40,120,0.15)', 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, auraRad, 0, TAU);
  ctx.fill();

  // 2. HÁTSÓ RÉTEG (Karok / Tüskék)
  if (v.arms) drawBeastArms(ctx, v, bodyDark);

  // Tüskék (Jagged obsidian shards)
  const spikeCount = 14;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i / spikeCount) * TAU + v.wob * 0.15;
    const len = r * (1.25 + Math.sin(time * 4 + i) * 0.1);
    const x1 = Math.cos(a) * r * 0.8;
    const y1 = Math.sin(a) * r * 0.8;
    const x2 = Math.cos(a) * len;
    const y2 = Math.sin(a) * len;
    const x3 = Math.cos(a + 0.12) * r * 0.95;
    const y3 = Math.sin(a + 0.12) * r * 0.95;

    ctx.fillStyle = darken(bodyDark, 0.2);
    ctx.strokeStyle = bodyDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 3. MAG (Body Core)
  const bodyGrad = radial4(ctx, -r * 0.2, -r * 0.25, r * 0.1, 0, 0, r, 0.4, 0.8, bodyLight, bodyBase, bodyDark, darken(bodyDark, 0.5));

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  
  if (!v.flash) {
    ctx.shadowColor = angry ? '#ff0000' : '#ff4422';
    ctx.shadowBlur = angry ? 35 : 20;
  }
  
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * pulse, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Élfény (Rim light)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, -2.5, -0.5);
  ctx.stroke();

  // 4. SZARVAK
  ctx.fillStyle = darken(bodyDark, 0.4);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * r * 0.35, -r * 0.85);
    ctx.quadraticCurveTo(sgn * r * 0.8, -r * 1.5, sgn * r * 0.2, -r * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 5. ARC (Szemek + Száj)
  drawBeastFace(ctx, v, bodyDark);

  ctx.restore();
}

function drawBeastFace(ctx: CanvasRenderingContext2D, v: EnemyVisual, _dark: string): void {
  const { face } = v;
  const angry = v.charge === 'dash' || v.active;
  const look = face;
  const dx = Math.cos(look) * 6;
  const dy = Math.sin(look) * 4;

  // Fő szemek
  for (const sgn of [-1, 1]) {
    const ex = sgn * 18 + dx;
    const ey = -8 + dy;
    
    // Szemüreg
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(ex, ey, 11, 0, TAU);
    ctx.fill();

    // Izzó írisz
    const irisCol = v.flash ? '#fff' : (angry ? '#ff0000' : '#ff3366');
    glow(ctx, ex, ey, 6, irisCol, angry ? 20 : 12);
    
    ctx.fillStyle = irisCol;
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, TAU);
    ctx.fill();
    
    // Pupilla (függőleges hasíték)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 2, 5, 0, 0, TAU);
    ctx.fill();
  }

  // Satellite szemek (kisebb, pislogó szemek a testen)
  const time = performance.now() / 1000;
  const sats = [[-30, 15], [30, 15], [0, -35]];
  for (let i = 0; i < sats.length; i++) {
    const [sx, sy] = sats[i]!;
    const blink = Math.sin(time * 2 + i) > 0.85;
    if (blink) continue;
    
    ctx.fillStyle = '#200';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, TAU);
    ctx.fill();
    
    ctx.fillStyle = angry ? '#ff0000' : '#aa0000';
    ctx.beginPath();
    ctx.arc(sx + dx * 0.2, sy + dy * 0.2, 1.5, 0, TAU);
    ctx.fill();
  }

  // Száj
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  const mouthOpen = angry ? 1.4 : 1.0;
  
  ctx.beginPath();
  ctx.arc(0, 14, 18 * mouthOpen, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Fogak (élesebb, szabálytalanabb)
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) {
    const tx = i * 7;
    const ty = 24 + Math.abs(i) * 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 4, ty - 10);
    ctx.lineTo(tx + 4, ty - 10);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBeastArms(ctx: CanvasRenderingContext2D, v: EnemyVisual, _dark: string): void {
  const { r, bob } = v;
  const armCol = v.flash ? '#ffdede' : '#7a1422';
  const fistCol = v.flash ? '#ffffff' : '#4a0c16';
  const step = Math.sin(bob * 1.5);

  for (const s of [-1, 1]) {
    ctx.save();
    // Felkar
    ctx.strokeStyle = armCol;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    const fx = s * (r * 1.25);
    const fy = 30 + step * 5;
    
    ctx.beginPath();
    ctx.moveTo(s * (r * 0.6), 8);
    ctx.quadraticCurveTo(s * r * 1.1, 15, fx, fy);
    ctx.stroke();

    // Ököl
    ctx.fillStyle = fistCol;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, fy, 14, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Karmok az öklön
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    for (const k of [-1, 0, 1]) {
      const kx = fx + k * 6;
      const ky = fy + 8;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx + s * 4, ky + 6);
      ctx.stroke();
    }
    ctx.restore();
  }
}
