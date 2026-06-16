/**
 * Labirintus-kapu (portál) rajzolása. Közös a JÁTÉK (World) és a szerkesztő-
 * előnézet közt, hogy a kinézet egységes legyen.
 *
 * Kinézet: élő ARCANE-PORTÁL — sötét energia-kút, örvénylő fénypászták (bloom),
 * lüktető fény-mag, körülötte keringő szikrák, és egy rúna-tárcsa perem (kettős
 * gyűrű + rovátkák) a fejezet kiemelő-színében. Alatta a cél felirata.
 */
export function drawGate(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, accent: string, t: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  ctx.save();

  // 1) külső ragyogás (lüktet)
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.6);
  glow.addColorStop(0, withAlpha(accent, 0.45 * (0.7 + 0.3 * pulse)));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // 2) energia-kút: befelé sötétülő mélység, a szélen a kiemelő-szín dereng
  const well = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  well.addColorStop(0, '#000000');
  well.addColorStop(0.55, '#0b0716');
  well.addColorStop(1, withAlpha(accent, 0.35));
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 3) örvény: több finom spirál-pászta, a kút körére vágva, befelé halványuló
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(accent, 0.5);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.shadowColor = accent;
  ctx.shadowBlur = r * 0.25;
  const arms = 5;
  for (let s = 0; s < arms; s++) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const f = i / 40;
      const ang = -t * 1.6 + s * ((Math.PI * 2) / arms) + f * Math.PI * 3;
      const rad = r * 0.92 * (1 - f);
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 4) izzó energia-mag (lüktet, bloom-mal)
  const coreR = r * 0.22 * (0.85 + 0.15 * pulse);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
  core.addColorStop(0, '#fff7e0');
  core.addColorStop(0.4, accent);
  core.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  // 5) keringő szikrák (determinisztikus t-ből, glow-val)
  ctx.shadowColor = accent;
  ctx.shadowBlur = r * 0.3;
  ctx.fillStyle = '#fff3d0';
  const sparks = 6;
  for (let i = 0; i < sparks; i++) {
    const sp = i / sparks;
    const ang = t * (1.0 + sp * 0.8) + i * 2.3;
    const orbit = r * (0.45 + 0.4 * (Math.sin(t * 1.3 + i) * 0.5 + 0.5));
    const x = cx + Math.cos(ang) * orbit;
    const y = cy + Math.sin(ang) * orbit;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r * 0.045), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 6) rúna-tárcsa perem: kettős gyűrű + apró rovátkák
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, r * 0.04);
  const ticks = 12;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
    ctx.lineTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 7) felirat a kapu alatt — a játék serif betűjével, sötét árnyékkal a padlón
  ctx.font = `700 ${Math.round(r * 0.34)}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = accent;
  ctx.fillText('LABYRINTH', cx, cy + r * 1.35);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
}

/**
 * Dungeon-kapu rajzolása — kő-medál egy boltíves VASRÁCS-kapuval (portcullis),
 * két oldalt pislákoló fáklyával. Szándékosan más karakter, mint a labirintus
 * arcane-portálja, hogy ránézésre megkülönböztethető legyen. Alatta a felirat.
 */
export function drawDungeonGate(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, _accent: string, t: number,
): void {
  ctx.save();

  // 1) talaj-árnyék
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.08, r * 1.12, r * 1.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2) kő perem-gyűrű (függőleges kő-gradiens, felül világos rézsű)
  const rim = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  rim.addColorStop(0, '#5a564e');
  rim.addColorStop(0.5, '#36322c');
  rim.addColorStop(1, '#1c1a16');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.97, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.97, 0, Math.PI);
  ctx.stroke();

  // 3) sötét kapualj + boltíves vasrács, a perem-körre vágva
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#0a0908';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  const aw = r * 0.6;          // boltív fél-szélesség
  const archY = cy - r * 0.12; // a félköríves boltív középpontja

  // kő boltív-keret
  ctx.strokeStyle = '#46413a';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - aw, cy + r * 0.72);
  ctx.lineTo(cx - aw, archY);
  ctx.arc(cx, archY, aw, Math.PI, 0);
  ctx.lineTo(cx + aw, cy + r * 0.72);
  ctx.stroke();

  // függőleges vasrudak (a boltív ívéhez igazított tetővel)
  const bars = 4;
  for (let i = 0; i < bars; i++) {
    const bx = cx - aw * 0.66 + (i / (bars - 1)) * aw * 1.32;
    const topY = archY - Math.sqrt(Math.max(0, aw * aw - (bx - cx) * (bx - cx)));
    ctx.strokeStyle = '#2c2d33';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(bx, topY);
    ctx.lineTo(bx, cy + r * 0.55);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,150,160,0.35)'; // fém-csúcsfény
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.02, topY);
    ctx.lineTo(bx - r * 0.02, cy + r * 0.55);
    ctx.stroke();
  }
  // vízszintes pántok
  ctx.strokeStyle = '#2c2d33';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  for (const hy of [cy - r * 0.04, cy + r * 0.28]) {
    ctx.beginPath();
    ctx.moveTo(cx - aw * 0.8, hy);
    ctx.lineTo(cx + aw * 0.8, hy);
    ctx.stroke();
  }
  ctx.restore();

  // 4) két pislákoló fáklya a felső sarkokban (meleg fény)
  const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 9) * Math.sin(t * 5.3));
  for (const sx of [-1, 1]) {
    const fx = cx + sx * r * 0.66;
    const fy = cy - r * 0.52;
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 0.42);
    fg.addColorStop(0, `rgba(255,178,90,${0.85 * flick})`);
    fg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd28a';
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5) felirat a kapu alatt — a játék serif betűjével
  ctx.font = `700 ${Math.round(r * 0.34)}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#d8c8a8';
  ctx.fillText('DUNGEON', cx, cy + r * 1.35);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
}

/** `#rrggbb` → `rgba(...)` a megadott áttetszőséggel (gyors, csak hex-bemenetre). */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
