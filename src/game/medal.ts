/**
 * Procedurális érem-rajzoló: sáv-szín szerinti fém-korong a rang-számmal rávésve.
 * Nincs asset — minden a canvasra rajzolódik (lásd CLAUDE.md). A 100. rang egyedi,
 * ragyogó „legendás" érem. Az `Band`-et a `progression.ts` adja.
 */
import type { Band } from './progression';

interface MedalStyle {
  rim: string; // külső gyűrű
  face: string; // korong felülete (fő szín)
  faceDark: string; // árnyékoldal a gradienshez
  text: string; // rávésett szám színe
  glow: string; // ragyogás (legendásnál erős)
}

const STYLES: Record<Band, MedalStyle> = {
  bronze: { rim: '#7a4a24', face: '#c87a3c', faceDark: '#8a4e22', text: '#3a1e0c', glow: 'rgba(220,140,70,0.35)' },
  silver: { rim: '#8a8a96', face: '#d8dce6', faceDark: '#9aa0ac', text: '#3a3e48', glow: 'rgba(220,228,240,0.4)' },
  gold: { rim: '#b8901e', face: '#ffd25a', faceDark: '#c79420', text: '#5a4208', glow: 'rgba(255,210,90,0.5)' },
  platinum: { rim: '#5a8aa0', face: '#cfeaf4', faceDark: '#8fb6c6', text: '#244450', glow: 'rgba(180,230,250,0.5)' },
  diamond: { rim: '#5a6ad0', face: '#bfe0ff', faceDark: '#7f9ae0', text: '#1e2a60', glow: 'rgba(150,200,255,0.6)' },
  legend: { rim: '#b8431e', face: '#ffe08a', faceDark: '#e08a2a', text: '#5a1e08', glow: 'rgba(255,180,80,0.85)' },
};

/**
 * Érmet rajzol `(cx, cy)` középpontba, `r` sugárral, az adott `band`/`rank`-hez.
 * A `t` (opcionális, másodperc) a legendás érem animációjához kell.
 */
export function drawMedal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  band: Band,
  rank: number,
  t = 0,
): void {
  const s = STYLES[band];
  const legendary = band === 'legend';
  ctx.save();

  // ragyogás (legendásnál pulzál)
  const glowR = legendary ? r * (1.5 + 0.12 * Math.sin(t * 3)) : r * 1.18;
  const g = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, glowR);
  g.addColorStop(0, s.glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  // külső gyűrű
  ctx.fillStyle = s.rim;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // korong-felület (felülről megvilágított fém-gradiens)
  const face = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  face.addColorStop(0, s.face);
  face.addColorStop(1, s.faceDark);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.fill();

  // bordázott perem (kis rovátkák a gyűrűn)
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  const notches = 24;
  for (let i = 0; i < notches; i++) {
    const a = (i / notches) * Math.PI * 2 + (legendary ? t * 0.4 : 0);
    const r0 = r * 0.84;
    const r1 = r * 0.97;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  // csillám-csík (a fém fénye)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.5, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // rang-szám rávésve
  ctx.fillStyle = s.text;
  ctx.font = `bold ${Math.round(r * (rank >= 100 ? 0.7 : 0.92))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rank > 0 ? String(rank) : '–', cx, cy + r * 0.04);

  // legendás: forgó csillag-szikrák a perem körül
  if (legendary) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 1.2;
      const sx = cx + Math.cos(a) * r * 1.15;
      const sy = cy + Math.sin(a) * r * 1.15;
      ctx.fillStyle = `rgba(255,230,150,${0.5 + 0.5 * Math.sin(t * 4 + i)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
