import { TAU } from '../../engine/math';
import { t as tr } from '../../i18n';
import { BOSS_RUSH, DUNGEON_RUN } from '../config';
import type { HubChoice, HubStationId } from '../World';
import {
  drawGate,
  drawDungeonGate,
  drawStoryPortal,
  drawBossPortal,
  drawPortalLock,
} from './gateRender';

/**
 * Hub-terem (mód-választó) levél-rajzolói — szabad függvények, állapot nélkül.
 * A jelenet-orchesztrálás (padló, falak, részecskék, játékos) a `World`
 * `renderHub`-jában marad; itt a glyph, a portálok és a címsor élnek.
 */

/** Egy portál: a mód szerinti rajzoló + zárt esetben lakat-fátyol. */
export function drawHubPortal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  accent: string,
  id: HubChoice,
  locked: boolean,
  t: number,
): void {
  const r = 30;
  switch (id) {
    case 'story':     drawStoryPortal(ctx, cx, cy, r, accent, t); break;
    case 'labyrinth': drawGate(ctx, cx, cy, r, accent, t); break;
    case 'dungeon':   drawDungeonGate(ctx, cx, cy, r, accent, t); break;
    case 'boss':      drawBossPortal(ctx, cx, cy, r, t); break;
  }
  // a boss-portál zárolva a FELOLDÁS-FELTÉTELT mutatja (a sablon „SOON" helyett),
  // hogy a játékos lássa, mivel nyílik meg (#52); a dungeon marad a „SOON".
  if (locked) {
    const lockLabel =
      id === 'boss' ? tr('gate.bossLocked', { n: BOSS_RUSH.unlockFloor })
      : id === 'dungeon' ? tr('gate.dungeonLocked', { n: DUNGEON_RUN.unlockFloor })
      : undefined;
    drawPortalLock(ctx, cx, cy, r, lockLabel);
  }
}

/** Lüktető rúna-glyph a terem közepén (a játékos alatt). */
export function drawHubGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: string): void {
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
  const R = 48;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.45 + 0.3 * pulse;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.35 + 0.3 * pulse;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  ctx.restore();
}

/** A hub címsora a felső fal fölött. */
export function drawHubTitle(ctx: CanvasRenderingContext2D, centerX: number, topY: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#e8d8b0';
  ctx.font = '700 26px Cinzel, Georgia, serif';
  ctx.fillText(tr('hub.choose'), centerX, topY);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// ---- Bázis-berendezés (Ú3): meta-állomások, NPC, hangulat -------------------

/**
 * Egy meta-állomás a HUB-ban (rálépve a Game a megfelelő nézetet nyitja): a
 * `bestiary` egy pulpitus nyitott, izzó kódexszel, a `rank` egy karcsú obeliszk
 * dicsőség-jellel. Stílus a portálokhoz illik (Cinzel-felirat alul).
 */
export function drawHubStation(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  accent: string,
  id: HubStationId,
  near: boolean,
  t: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
  const r = 22;
  ctx.save();

  // talapzat-ragyogás (közeledéskor erősebb)
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.4);
  glow.addColorStop(0, `rgba(240,200,120,${(near ? 0.3 : 0.14) + 0.08 * pulse})`);
  glow.addColorStop(1, 'rgba(240,200,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);

  if (id === 'bestiary') {
    // kőpulpitus (lefelé szélesedő láb) + ferde olvasólap
    ctx.fillStyle = '#3a3344';
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 4); ctx.lineTo(cx + 9, cy + 4);
    ctx.lineTo(cx + 14, cy + 24); ctx.lineTo(cx - 14, cy + 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#221d2c'; ctx.lineWidth = 2; ctx.stroke();
    // nyitott kódex (két lap V-alakban) izzó oldalakkal
    ctx.save();
    ctx.translate(cx, cy - 6);
    ctx.fillStyle = '#5a2a22';
    ctx.beginPath();
    ctx.moveTo(-20, -2); ctx.lineTo(0, -8); ctx.lineTo(20, -2);
    ctx.lineTo(20, 8); ctx.lineTo(0, 2); ctx.lineTo(-20, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(245,225,170,${0.8 + 0.15 * pulse})`;
    ctx.beginPath(); ctx.moveTo(-18, -1); ctx.lineTo(-1, -6); ctx.lineTo(-1, 1); ctx.lineTo(-18, 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -1); ctx.lineTo(1, -6); ctx.lineTo(1, 1); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill();
    // sor-rovátkák
    ctx.strokeStyle = 'rgba(90,60,40,0.5)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-15, i * 2); ctx.lineTo(-3, i * 2 - 2.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, i * 2); ctx.lineTo(3, i * 2 - 2.5); ctx.stroke();
    }
    ctx.restore();
  } else if (id === 'seed') {
    // sorsvető rúnakő (seed-kapu, #49): zömök kőtömb + izzó hexagram-pecsét
    ctx.fillStyle = '#34303f';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 22); ctx.lineTo(cx - 13, cy - 12);
    ctx.lineTo(cx, cy - 18); ctx.lineTo(cx + 13, cy - 12);
    ctx.lineTo(cx + 16, cy + 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#221e2b'; ctx.lineWidth = 2; ctx.stroke();
    // hexagram-pecsét (két átlapoló háromszög) izzva
    ctx.save();
    ctx.translate(cx, cy + 2);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55 + 0.4 * pulse;
    ctx.lineWidth = 1.7;
    for (let tri = 0; tri < 2; tri++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + (tri ? Math.PI / 3 : -Math.PI / 2);
        const px = Math.cos(a) * 10, py = Math.sin(a) * 10;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(245,225,170,${0.7 + 0.2 * pulse})`;
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    // karcsú, csúcsos obeliszk
    ctx.fillStyle = '#3d3550';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26); ctx.lineTo(cx + 9, cy - 8);
    ctx.lineTo(cx + 7, cy + 22); ctx.lineTo(cx - 7, cy + 22);
    ctx.lineTo(cx - 9, cy - 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#241f33'; ctx.lineWidth = 2; ctx.stroke();
    // él-fény bal oldalon
    ctx.strokeStyle = 'rgba(200,185,150,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 1, cy - 24); ctx.lineTo(cx - 1, cy + 20); ctx.stroke();
    // dicsőség-jel (sugaras csillag) izzva
    ctx.save();
    ctx.translate(cx, cy - 2);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.6 + 0.35 * pulse;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const r0 = i % 2 === 0 ? 8 : 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(245,225,170,${0.7 + 0.2 * pulse})`;
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // felirat (a portál-stílushoz illik)
  ctx.font = '700 13px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = near ? '#ffe6ad' : '#f0c878';
  ctx.fillText(tr(`hub.station.${id}`), cx, cy + 30);
  ctx.restore();
}

/**
 * A Krónikás (NPC) - csuklyás, álló alak halvány lámpás-fénnyel. Tisztán
 * hangulat + felfedés-szöveg (rálépve a World floatert dob); nem interaktív
 * overlay. Lassú idle-ringás a `t`-ből.
 */
export function drawHubNpc(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const sway = Math.sin(t * 1.1) * 1.5;
  ctx.save();
  ctx.translate(cx + sway, cy);

  // lámpás-fény a lábánál
  const glow = ctx.createRadialGradient(0, 6, 2, 0, 6, 30);
  glow.addColorStop(0, 'rgba(240,200,130,0.22)');
  glow.addColorStop(1, 'rgba(240,200,130,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-30, -24, 60, 60);

  // köpeny (harang-alak)
  ctx.fillStyle = '#2c2740';
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(-15, -10, -14, 20);
  ctx.lineTo(14, 20);
  ctx.quadraticCurveTo(15, -10, 0, -26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1c1830'; ctx.lineWidth = 2; ctx.stroke();
  // köpeny-redő
  ctx.strokeStyle = 'rgba(120,110,150,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-2, 18); ctx.stroke();

  // csuklya + árnyékos arc
  ctx.fillStyle = '#241f36';
  ctx.beginPath(); ctx.arc(0, -24, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d0a16';
  ctx.beginPath(); ctx.ellipse(0, -22, 5, 6, 0, 0, TAU); ctx.fill();
  // két halvány szem-fény
  ctx.fillStyle = `rgba(220,200,150,${0.55 + 0.25 * Math.sin(t * 2.3)})`;
  ctx.beginPath(); ctx.arc(-2, -22, 1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -22, 1, 0, TAU); ctx.fill();

  // lámpás a kézben (apró izzó gömb)
  ctx.fillStyle = 'rgba(245,210,140,0.9)';
  ctx.beginPath(); ctx.arc(13, 2, 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(13, -1); ctx.lineTo(11, -8); ctx.stroke();
  ctx.restore();
}

/**
 * Vándor-szobor (#53): kőtalapzaton álló csuklyás hős-alak, a jelenleg választott
 * vándor accent-színére hangolva. Rálépve a karakterválasztó nyílik (a feliratot
 * a közelség kiemeli). Asset-mentes, procedurális.
 */
export function drawHubCharStatue(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  accent: string,
  label: string,
  near: boolean,
  t: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
  ctx.save();

  // talapzat-ragyogás
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 52);
  glow.addColorStop(0, hexAlpha(accent, (near ? 0.34 : 0.16) + 0.08 * pulse));
  glow.addColorStop(1, hexAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 54, cy - 54, 108, 108);

  // kő-talapzat
  ctx.fillStyle = '#332d42';
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 20); ctx.lineTo(cx + 18, cy + 20);
  ctx.lineTo(cx + 14, cy + 30); ctx.lineTo(cx - 14, cy + 30);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d3650';
  ctx.fillRect(cx - 14, cy + 14, 28, 7);
  ctx.strokeStyle = '#221d2c'; ctx.lineWidth = 2; ctx.stroke();

  // csuklyás hős-alak (kőszobor, accent-él-fény)
  ctx.fillStyle = '#4a4360';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 28);
  ctx.quadraticCurveTo(cx - 15, cy - 6, cx - 12, cy + 14);
  ctx.lineTo(cx + 12, cy + 14);
  ctx.quadraticCurveTo(cx + 15, cy - 6, cx, cy - 28);
  ctx.closePath(); ctx.fill();
  // accent él-fény a bal oldalon
  ctx.strokeStyle = hexAlpha(accent, 0.7); ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy - 26);
  ctx.quadraticCurveTo(cx - 13, cy - 6, cx - 11, cy + 13);
  ctx.stroke();
  // csuklya-fej + árnyékos arc
  ctx.fillStyle = '#3f3955';
  ctx.beginPath(); ctx.arc(cx, cy - 26, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1a1626';
  ctx.beginPath(); ctx.ellipse(cx, cy - 24, 4.5, 5.5, 0, 0, TAU); ctx.fill();
  // izzó accent-szem
  ctx.fillStyle = hexAlpha(accent, 0.75 + 0.2 * pulse);
  ctx.beginPath(); ctx.arc(cx, cy - 24, 1.6, 0, TAU); ctx.fill();

  // felirat
  ctx.font = '700 13px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = near ? '#ffe6ad' : '#f0c878';
  ctx.fillText(label, cx, cy + 36);
  ctx.restore();
}

/**
 * Kihívás-obeliszk (#51): sötét, repedt kőoszlop vörös veszély-jellel (keresztezett
 * pengék). Rálépve a kihívás-választó nyílik. Asset-mentes, procedurális.
 */
export function drawHubChalObelisk(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  accent: string,
  label: string,
  near: boolean,
  t: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
  ctx.save();

  // baljós vörös ragyogás
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 50);
  glow.addColorStop(0, hexAlpha(accent, (near ? 0.32 : 0.16) + 0.08 * pulse));
  glow.addColorStop(1, hexAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 52, cy - 52, 104, 104);

  // repedt kőoszlop (csúcsos)
  ctx.fillStyle = '#332b3a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 28); ctx.lineTo(cx + 10, cy - 6);
  ctx.lineTo(cx + 8, cy + 24); ctx.lineTo(cx - 8, cy + 24);
  ctx.lineTo(cx - 10, cy - 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1f1a28'; ctx.lineWidth = 2; ctx.stroke();
  // repedés
  ctx.strokeStyle = 'rgba(20,15,24,0.8)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx + 2, cy - 22); ctx.lineTo(cx - 2, cy - 6); ctx.lineTo(cx + 3, cy + 10); ctx.stroke();

  // vörös veszély-jel: keresztezett pengék
  ctx.save();
  ctx.translate(cx, cy - 2);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * -6, 7); ctx.lineTo(s * 6, -7); // penge
    ctx.stroke();
    // markolat
    ctx.beginPath(); ctx.moveTo(s * -6, 7); ctx.lineTo(s * -8, 10); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // felirat
  ctx.font = '700 13px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = near ? '#ffc0a8' : '#e6a07a';
  ctx.fillText(label, cx, cy + 32);
  ctx.restore();
}

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Hangulat-parázstartó: tál + lobogó láng + meleg fény (egyetlen olcsó draw). */
export function drawHubBrazier(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const flick = 0.5 + 0.5 * Math.sin(t * 9 + cx);
  const flick2 = 0.5 + 0.5 * Math.sin(t * 13 + cy);
  ctx.save();

  // meleg fény-aura
  const glow = ctx.createRadialGradient(cx, cy - 8, 3, cx, cy - 8, 46);
  glow.addColorStop(0, `rgba(255,160,70,${0.26 + 0.08 * flick})`);
  glow.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 48, cy - 56, 96, 96);

  // állvány-láb
  ctx.strokeStyle = '#2a2436'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 8, cy + 22); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + 8, cy + 22); ctx.stroke();
  // tál
  ctx.fillStyle = '#3a3040';
  ctx.beginPath(); ctx.ellipse(cx, cy + 2, 13, 5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#221d2c'; ctx.lineWidth = 2; ctx.stroke();

  // láng (három átfedő nyelv)
  const flame = (dx: number, h: number, w: number, a: number, col: string) => {
    ctx.fillStyle = col;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(cx + dx - w, cy);
    ctx.quadraticCurveTo(cx + dx - w * 0.4, cy - h * 0.6, cx + dx, cy - h);
    ctx.quadraticCurveTo(cx + dx + w * 0.4, cy - h * 0.6, cx + dx + w, cy);
    ctx.closePath(); ctx.fill();
  };
  flame(0, 26 + 6 * flick, 10, 0.85, '#b8341a');
  flame(-2 + 3 * flick2, 20 + 5 * flick, 6, 0.9, '#f0822a');
  flame(2 - 2 * flick, 13 + 4 * flick2, 3.5, 0.95, '#ffd86a');
  ctx.globalAlpha = 1;
  ctx.restore();
}
