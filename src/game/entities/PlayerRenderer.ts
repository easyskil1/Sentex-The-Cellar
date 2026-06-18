import { TAU, shade } from '../../engine/math';

/**
 * A játékos kinézetének önálló renderelője — leválasztva a Player logikájáról.
 *
 * Réteges/forma-alapú jelmez-rendszer: a `cosmetics` lista
 * dönti el, mit rajzolunk. Alapból a barátságos, fehér ruhás akolitus; bizonyos
 * tárgyak más formát/réteget kapcsolnak be (pl. 'wraith' → sötét csuklyás).
 *
 * A felvett tárgyak (tabletták) ezen felül **mutálják** a megjelenést a
 * `BodyLook`-on keresztül: a szín-mezők felülírják az alapot (a legutóbb felvett
 * nyer), a számláló-mezők (szarv, tüske, plusz szem…) pedig **halmozódnak**,
 * így több tabletta látványosan egymásra épül a karakteren.
 */
export interface PlayerVisual {
  x: number;
  y: number;
  r: number;
  dirX: number;
  dirY: number;
  walk: number;
  lean: number;
  invuln: number;
  moving: boolean;
  /** Aktív jelmez-rétegek/formák (tárgyak adják hozzá). */
  cosmetics?: string[];
  /** A felvett tárgyak halmozott kinézet-módosítása. */
  look?: BodyLook;
}

/**
 * A karakter mutálható kinézete. A szín-mezők hiányában az alap-paletta marad;
 * a számlálók a felvett tárgyak során összeadódnak (lásd `Player.refreshLook`).
 */
export interface BodyLook {
  /** Bőrszín (hex). */
  skin?: string;
  /** Hajszín (hex). */
  hair?: string;
  /** Szemszín (hex) — felülírja az alap zöld íriszt (a világosabb ragyogás ebből számít). */
  eye?: string;
  /** Lövedék-szín (hex) — a könnycsepp színe; ha nincs, az alap kék marad. */
  tearColor?: string;
  /** Lövedék függőleges összenyomása (1 = kör; <1 = lapított korong, pl. Lendkerék). */
  tearSquashY?: number;
  /** Lábacskák színe (hex) — felülírja az alap bundát a lábakon (pl. Pók-láb → zöld). */
  legColor?: string;
  /** Mancsok/kezek színe (hex) — felülírja az alap bundát a karokon (pl. Záporkő → kék). */
  handColor?: string;
  /** Szemüveg: kerek, arany keretes pápaszem a szemek köré (pl. Messzelátó). */
  glasses?: boolean;
  /** Fej-dudorok színe (hex); ha nincs, a világos bunda. */
  bumpColor?: string;
  /** Piros, lüktető szív a mellkason/pocakon (pl. Vér-szív). */
  chestHeart?: boolean;
  /** Szerencse-patkó a jobb mancsban (pl. Patkó). */
  horseshoe?: boolean;
  /** Az egyik szem terminátoros, izzó vörös robot-távcső (pl. Lámpás). */
  scopeEye?: boolean;
  /** Enyhén áttetsző, sötét fátyol a fejre borítva (pl. Sötét fátyol). */
  veil?: boolean;
  /** A fej JOBB felét beborító festés színe (hex), pl. Harci jel → sötétzöld. */
  halfHeadColor?: string;
  /** A fej BAL felét beborító festés színe (hex), pl. Hármas könny → kék. */
  halfHeadColorLeft?: string;
  /** Kis szárnyak színe a lábakon (hex) — szárnyas saru (pl. Szárnyas saru → zöld). */
  footWingColor?: string;
  /** Három fülbevaló egy sorban a jobb fülön (pl. Sörét-szem). */
  earrings?: boolean;
  /** Punk taréj (mohawk) a fej tetején (pl. Tűhegy). */
  punkHair?: boolean;
  /** Rugós, gombvégű antenna a fejen (pl. Gumifal). */
  springAntenna?: boolean;
  /** Célkereszt-jel a homlokon (pl. Vadász-szem). */
  foreheadCrosshair?: boolean;
  /** Könnycsepp-medálos fülbevaló a jobb fülön (pl. Szellem-könny). */
  teardropEarring?: boolean;
  /** A bal fül feketére festve (pl. Repesz-csepp). */
  leftEarBlack?: boolean;
  /** Nagy piros bokszkesztyűk a mancsokon (pl. Lökő-könny). */
  boxingGloves?: boolean;
  /** Hold-sarló jel a homlokon (pl. Holdkő). */
  crescentMark?: boolean;
  /** Lebegő arany „mindent látó" szem a karakter fölött (csak dísz, pl. Villám-szem). */
  floatingEye?: boolean;
  /** A talaj-árnyék helyett fagyos jég-folt a karakter alatt (pl. Fagy-szilánk). */
  iceShadow?: boolean;
  /** Zöld, csöpögő méreg-rövidnadrág a csípőn (pl. Méreg-csepp). */
  poisonShorts?: boolean;
  /** A fej körvonalának színe (hex) — felülírja az alap barnát (pl. Parázs-könny → izzó vörös). */
  headOutline?: string;
  /** Köntös fő színe (hex). */
  robe?: string;
  /** Szegély/öv színe (hex). */
  trim?: string;
  /** Aura/ragyogás színe a karakter mögött (hex). */
  glow?: string;
  /** Dudorok a fejen. */
  bumps: number;
  /** Szarvak a fej tetején. */
  horns: number;
  /** Tüskék a háton/vállon. */
  spikes: number;
  /** Plusz szemek a homlokon. */
  extraEyes: number;
  /** Csápok a fej tetején. */
  antennae: number;
  /** Farok hátul. */
  tail: boolean;
}

/** Friss, módosítatlan alap-kinézet (innen indul a tárgyak halmozása). */
export function defaultBodyLook(): BodyLook {
  return { bumps: 0, horns: 0, spikes: 0, extraEyes: 0, antennae: 0, tail: false };
}

export function drawPlayer(ctx: CanvasRenderingContext2D, v: PlayerVisual): void {
  if (v.cosmetics?.includes('wraith')) drawWraithForm(ctx, v);
  else drawCuteCreature(ctx, v);
}

// Az aranyos kis lény színpalettája a kép alapján
const CREATURE_PALETTE = {
  fur: '#f6d5b3',          // Alap krémszínű bunda
  furLight: '#fbe9d5',     // Világosabb részek (has, pofi)
  furShadow: '#e3b892',    // Árnyékok a bundán
  innerEar: '#f0beaa',     // Fül belső, rózsaszínes része
  eye: '#1c8c53',          // Nagy zöld írisz
  eyeLight: '#3cd084',     // Világosabb zöld csillogás a szemben
  outline: '#3a2a26',      // Puha barna körvonal (fekete helyett barátságosabb)
  blush: 'rgba(240,150,140,0.4)',
};

function drawCuteCreature(ctx: CanvasRenderingContext2D, v: PlayerVisual): void {
  const { x, y, r } = v;
  const t = performance.now() / 1000;

  // Animációs változók a meglévő logikád alapján
  const bounce = Math.abs(Math.sin(v.walk)) * 3;
  const breathe = Math.sin(t * 2.5) * 0.5;
  const step = v.moving ? Math.sin(v.walk) * 3 : 0;
  const gy = r * 1.0;
  const TAU = Math.PI * 2;

  // 1. TALAJ-ÁRNYÉK (Fagy-szilánk: jég-folt a sima árnyék helyett)
  ctx.save();
  if (v.look?.iceShadow) {
    const sx = x, sy = y + r * 1.02, srx = r * 0.95, sry = r * 0.36;
    const g = ctx.createRadialGradient(sx, sy - sry * 0.2, 2, sx, sy, srx);
    g.addColorStop(0, 'rgba(225,247,255,0.6)');
    g.addColorStop(0.65, 'rgba(150,212,240,0.42)');
    g.addColorStop(1, 'rgba(105,165,205,0.12)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sx, sy, srx, sry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(205,238,255,0.65)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx, sy, srx, sry, 0, 0, TAU); ctx.stroke();
    // kristály-szilánkok a középből kifelé
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * srx * 0.8, sy + Math.sin(a) * sry * 0.8);
      ctx.stroke();
    }
    // csillanás
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(sx - srx * 0.3, sy - sry * 0.3, srx * 0.16, sry * 0.22, -0.4, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; // Lágyabb árnyék
    ctx.beginPath();
    ctx.ellipse(x, y + r * 1.02, r * 0.85, r * 0.32, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Karakter transzformáció (ugrálás + alapbeállítások)
  ctx.save();
  ctx.translate(x, y - bounce);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Fej pozíció kiszámítása (kicsit nagyobb súlyt adunk a fejnek)
  const hx = v.lean * 0.4;
  const hy = -r * 0.55 + breathe;
  const hr = r * 0.85; // Extra nagy fej!

  // ==================== LÁBACSKÁK ====================
  // A láb-szín tárgyból felülírható (Pók-láb → zöld); alapból a bunda.
  const legCol = v.look?.legColor ?? CREATURE_PALETTE.fur;
  for (const sgn of [-1, 1]) {
    const sx = sgn * r * 0.3;
    const sstep = sgn < 0 ? step : -step;

    ctx.fillStyle = legCol;
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 1.2;
    // Pufi kis praclik: kerek tető, lapos alj (D betű 90°-kal elforgatva)
    const footY = gy + r * 0.02 + sstep;
    ctx.beginPath();
    ctx.ellipse(sx, footY, r * 0.18, r * 0.24, 0, Math.PI, 2 * Math.PI); // felső dóm (magasabb, felfelé)
    ctx.closePath(); // egyenes alsó él
    ctx.fill(); ctx.stroke();
  }

  // ==================== SZÁRNYAS SARU (Szárnyas saru) ====================
  // Kis tollas szárny mindkét láb külső oldalán, kifelé-fel mutatva.
  if (v.look?.footWingColor) {
    const wc = v.look.footWingColor;
    for (const sgn of [-1, 1]) {
      const sstep = sgn < 0 ? step : -step;
      const footY = gy + r * 0.02 + sstep;
      ctx.save();
      ctx.translate(sgn * r * 0.44, footY - r * 0.16); // a láb külső-felső szélénél
      ctx.scale(sgn, 1); // tükrözés a jobb lábra → +x mindig „kifelé"
      ctx.fillStyle = wc;
      ctx.strokeStyle = shade(wc, -0.45);
      ctx.lineWidth = 1;
      // 4 toll legyezőben (kifelé söpörve, felfelé nyílva)
      for (let i = 0; i < 4; i++) {
        const ang = 0.05 - i * 0.33;          // a legalsó majdnem vízszintes, fölfelé nyílik
        const len = r * (0.42 - i * 0.05);
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -r * 0.08, len, 0);
        ctx.quadraticCurveTo(len * 0.5, r * 0.06, 0, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }


  // ==================== PUFI TEST (RUHA HELYETT) ====================
  const bodyGrad = ctx.createLinearGradient(0, -r * 0.2, 0, gy);
  bodyGrad.addColorStop(0, CREATURE_PALETTE.furLight);
  bodyGrad.addColorStop(0.6, CREATURE_PALETTE.fur);
  bodyGrad.addColorStop(1, CREATURE_PALETTE.furShadow);

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = CREATURE_PALETTE.outline;
  ctx.lineWidth = 1.5;

  // Kerekded, pufók törzs
  ctx.beginPath();
  ctx.ellipse(0, r * 0.3, r * 0.55, r * 0.45, 0, 0, TAU);
  ctx.fill(); ctx.stroke();

  // Világosabb pocak-folt (mint a képen)
  ctx.fillStyle = CREATURE_PALETTE.furLight;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.35, r * 0.28, 0, 0, TAU);
  ctx.fill();

  // ==================== MÉREG-RÖVIDNADRÁG (Méreg-csepp) ====================
  // Zöld, nyálkás rövidnadrág a csípőn, a szegélyéről csöpögő méreggel.
  if (v.look?.poisonShorts) {
    const top = r * 0.46, bot = r * 0.82, hw = r * 0.52;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#84d23f');
    g.addColorStop(1, '#3f7d1e');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#2c5a14';
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    // nadrág-test két szárral (alul középen láb-kivágás)
    ctx.beginPath();
    ctx.moveTo(-hw, top);
    ctx.quadraticCurveTo(0, top - r * 0.05, hw, top); // enyhén ívelt derék
    ctx.lineTo(hw, bot);
    ctx.lineTo(r * 0.14, bot);
    ctx.lineTo(0, bot - r * 0.2);                      // középső csúcs → két szár
    ctx.lineTo(-r * 0.14, bot);
    ctx.lineTo(-hw, bot);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // derékpánt (sötétebb sáv)
    ctx.fillStyle = '#2c5a14';
    ctx.beginPath();
    ctx.moveTo(-hw, top);
    ctx.quadraticCurveTo(0, top - r * 0.05, hw, top);
    ctx.quadraticCurveTo(0, top + r * 0.04, -hw, top);
    ctx.closePath();
    ctx.fill();
    // nyálkás csillanás
    ctx.fillStyle = 'rgba(220,255,170,0.4)';
    ctx.beginPath();
    ctx.ellipse(-hw * 0.45, top + r * 0.14, r * 0.1, r * 0.05, -0.5, 0, TAU);
    ctx.fill();
    // megülő méreg-cseppek a szegélyen (statikus, rövid — nem lóg le, nem takar)
    ctx.fillStyle = '#9ce64a';
    for (const [dx, dl] of [[-hw * 0.7, r * 0.05], [-hw * 0.25, r * 0.09], [hw * 0.28, r * 0.04], [hw * 0.7, r * 0.08]] as const) {
      const by = bot + dl; // a csepp gömbjének teteje
      ctx.beginPath();
      ctx.moveTo(dx - 2.2, bot - 1);
      ctx.lineTo(dx + 2.2, bot - 1);
      ctx.lineTo(dx + 1.6, by);
      ctx.quadraticCurveTo(dx + 3.4, by + 3.5, dx, by + 4.5); // gömb-vég
      ctx.quadraticCurveTo(dx - 3.4, by + 3.5, dx - 1.6, by);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ==================== MELLKAS-SZÍV (Vér-szív) ====================
  // Apró, lüktető piros szív a pocak közepén.
  if (v.look?.chestHeart) {
    const s = r * 0.16;                       // szív-méret
    const pulse = 1 + Math.sin(t * 4) * 0.07; // finom lüktetés
    ctx.save();
    ctx.translate(0, r * 0.34);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.95);
    ctx.bezierCurveTo(-s * 1.3, s * 0.1, -s * 0.95, -s * 0.95, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.95, -s * 0.95, s * 1.3, s * 0.1, 0, s * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#ff3b4e';
    ctx.strokeStyle = '#9c1f2e';
    ctx.lineWidth = 1.4;
    ctx.fill(); ctx.stroke();
    // fény-csillanás bal felül
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.4, -s * 0.32, s * 0.22, s * 0.14, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }


  // ==================== MANCSOK / KAROK ====================
  // A kéz-szín tárgyból felülírható (Záporkő → kék); alapból a bunda.
  const handCol = v.look?.handColor ?? CREATURE_PALETTE.fur;
  for (const sgn of [-1, 1]) {
    const swing = (sgn < 0 ? step : -step) * 0.4;
    ctx.fillStyle = handCol;
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 1.2;

    ctx.save();
    ctx.translate(sgn * r * 0.5, r * 0.25 + swing);
    ctx.rotate(sgn * 0.2);
    ctx.beginPath();
    // Kis pihe-puha oldalsó mancsok
    ctx.ellipse(0, 0, r * 0.14, r * 0.22, sgn * 0.1, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ==================== BOKSZKESZTYŰK (Lökő-könny) ====================
  // Nagy, kerek piros kesztyűk a mancsok fölött, fehér csuklópánttal — ütős.
  if (v.look?.boxingGloves) {
    for (const sgn of [-1, 1]) {
      const swing = (sgn < 0 ? step : -step) * 0.4;
      ctx.save();
      ctx.translate(sgn * r * 0.52, r * 0.28 + swing);
      ctx.rotate(sgn * 0.2);
      // csuklópánt
      ctx.fillStyle = '#f0ece4';
      ctx.strokeStyle = CREATURE_PALETTE.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.16, r * 0.16, r * 0.08, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      // kesztyű-test
      ctx.fillStyle = '#e23a2e';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.2, r * 0.22, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      // hüvelykujj
      ctx.beginPath();
      ctx.ellipse(sgn * r * 0.14, r * 0.04, r * 0.08, r * 0.1, sgn * 0.5, 0, TAU);
      ctx.fill(); ctx.stroke();
      // fény-csillanás
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.06, -r * 0.08, r * 0.07, r * 0.05, -0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }


  // ==================== SZERENCSE-PATKÓ (Patkó) ====================
  // A jobb mancs fölött tartott, felfelé nyíló vas patkó (U), szegfejekkel.
  if (v.look?.horseshoe) {
    const swingR = -step * 0.4;                 // a jobb mancs lengése (sgn=+1)
    ctx.save();
    ctx.translate(r * 0.66 + swingR * 0.5, r * 0.0); // a jobb kéz fölé/elé, feljebb emelve
    ctx.rotate(0.18);                           // enyhe megdöntés (a nyílás közel felfelé)
    const R = r * 0.21;                         // patkó közép-sugár (nagyobb, jól látszik)
    const th = r * 0.1;                         // sávvastagság
    const gap = 0.62;                           // a felső nyílás fél-szöge (rad)
    const a0 = -Math.PI / 2 + gap;              // a tetőn lévő rés körül indul
    const a1 = Math.PI * 1.5 - gap;             // …és ér körbe alulról
    ctx.lineCap = 'butt';
    // sötét vas-kontúr
    ctx.strokeStyle = '#3c4450'; ctx.lineWidth = th + 3;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();
    // fémes test
    ctx.strokeStyle = '#aab4c0'; ctx.lineWidth = th;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();
    // felső csillanás a sáv külső peremén
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = th * 0.28;
    ctx.beginPath(); ctx.arc(0, 0, R + th * 0.28, a0 + 0.2, a1 - 0.5); ctx.stroke();
    // szegfejek (sötét pöttyök a sáv közepén)
    ctx.fillStyle = '#2c333d';
    for (let k = 0; k < 6; k++) {
      const a = a0 + ((a1 - a0) * (k + 0.5)) / 6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R, Math.sin(a) * R, th * 0.16, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }


  // ==================== NAGY PUHA FÜLEK (FEJ MÖGÖTT) ====================
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.translate(hx, hy + hr * 0.1);
    ctx.scale(sgn, 1);

    // Fülek finom mozgása a lépéseknél
    ctx.rotate(0.1 + Math.sin(t * 3) * 0.03 + (step * 0.02));

    // Külső fül (bunda) — a BAL fül (sgn=−1) feketére festhető (Repesz-csepp)
    const earBlack = v.look?.leftEarBlack && sgn === -1;
    ctx.fillStyle = earBlack ? '#1a1614' : CREATURE_PALETTE.fur;
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(hr * 0.5, -hr * 0.2);
    ctx.quadraticCurveTo(hr * 1.4, -hr * 0.1, hr * 1.3, hr * 0.4);
    ctx.quadraticCurveTo(hr * 1.0, hr * 0.7, hr * 0.4, hr * 0.3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Belső fül (rózsaszínes rész; fekete fülnél sötét)
    ctx.fillStyle = earBlack ? '#2e2826' : CREATURE_PALETTE.innerEar;
    ctx.beginPath();
    ctx.moveTo(hr * 0.6, -hr * 0.05);
    ctx.quadraticCurveTo(hr * 1.25, 0, hr * 1.15, hr * 0.3);
    ctx.quadraticCurveTo(hr * 0.9, hr * 0.5, hr * 0.5, hr * 0.2);
    ctx.closePath();
    ctx.fill();

    // Fülbevalók a JOBB fül (sgn=1) külső peremén — három egy sorban
    if (sgn === 1 && v.look?.earrings) {
      const studs = [[1.16, 0.32], [1.28, 0.42], [1.36, 0.54]];
      for (const [sx2, sy2] of studs) {
        ctx.fillStyle = '#ffd45a';
        ctx.strokeStyle = '#9c7a1a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hr * sx2!, hr * sy2!, hr * 0.052, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(hr * sx2! - hr * 0.016, hr * sy2! - hr * 0.016, hr * 0.018, 0, TAU); ctx.fill();
      }
    }

    // Könnycsepp-medálos fülbevaló a JOBB fülön (sgn=1)
    if (sgn === 1 && v.look?.teardropEarring) {
      const ax = hr * 1.28, ay = hr * 0.42;
      ctx.strokeStyle = '#cfd6e0';
      ctx.lineWidth = hr * 0.022;
      ctx.beginPath(); ctx.arc(ax, ay, hr * 0.045, 0, TAU); ctx.stroke(); // akasztó-gyűrű
      const ty = ay + hr * 0.17; // a csepp gömbjének közepe
      ctx.fillStyle = '#bfe6ff';
      ctx.strokeStyle = '#6f9fc8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay + hr * 0.07);                              // hegy fent (a gyűrű alatt)
      ctx.quadraticCurveTo(ax + hr * 0.1, ty - hr * 0.02, ax, ty + hr * 0.07); // jobb ív a gömbhöz
      ctx.quadraticCurveTo(ax - hr * 0.1, ty - hr * 0.02, ax, ay + hr * 0.07); // bal ív vissza
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(ax - hr * 0.03, ty, hr * 0.022, hr * 0.03, 0, 0, TAU); ctx.fill();
    }

    ctx.restore();
  }


  // ==================== FEJ-DUDOROK (Iker-csepp) ====================
  // Alacsony, kerek dudorok a fej tetején — szándékosan RENDEZETLENÜL (eltolt
  // hely, eltérő méret, enyhe döntés), hogy ne tűnjön gépiesen szimmetrikusnak.
  // A fejet utánuk rajzoljuk, így csak a kupolájuk búvik elő (mint a fülek).
  const nBumps = v.look?.bumps ?? 0;
  if (nBumps > 0) {
    const bRx = hr * 0.28, bRy = hr * 0.20; // szélesebb, mint magas → „dudor", nem szarv
    const hRx = hr * 1.05, hRy = hr * 0.95; // a fej ellipszisének tengelyei
    const rnd = (n: number): number => { const s = Math.sin(n * 127.1 + 17.3) * 43758.5453; return s - Math.floor(s); }; // stabil 0..1
    ctx.fillStyle = v.look?.bumpColor ?? CREATURE_PALETTE.furLight;
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < nBumps; i++) {
      const spread = nBumps === 1 ? 0 : (i / (nBumps - 1)) * 2 - 1;       // −1..1 alapelosztás
      const dx = spread * hr * 0.32 + (rnd(i + 1) - 0.5) * hr * 0.12 + hr * 0.05; // széthúzott alap + kis jitter + jobbra-dőlés
      const sz = 0.78 + rnd(i + 8) * 0.5;                                 // 0.78..1.28 méret-variáció
      const rot = (rnd(i + 20) - 0.5) * 0.6;                              // enyhe döntés
      const lift = rnd(i + 31) * bRy * 0.85;                              // egyik feljebb búvik ki, mint a másik
      const surfaceY = hy - hRy * Math.sqrt(Math.max(0, 1 - (dx / hRx) ** 2));
      ctx.save();
      ctx.translate(hx + dx, surfaceY - bRy * 0.1 - lift);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, bRx * sz, bRy * sz, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // ==================== PUNK TARÉJ / MOHAWK (Tűhegy) ====================
  // Hegyes tüske-sor a fej középvonalán, elöl→hátul, középen a legmagasabb.
  // A fejet utána rajzoljuk, így a tövük a koronába simul.
  if (v.look?.punkHair) {
    const spikeCol = '#d83a6a';        // punk-rózsaszín
    const n = 5;
    const baseY = hy - hr * 0.86;      // a koronán
    ctx.save();
    ctx.fillStyle = spikeCol;
    ctx.strokeStyle = shade(spikeCol, -0.45);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const tnorm = i / (n - 1);                 // 0..1 (bal→jobb)
      const sx = hx + (tnorm - 0.5) * hr * 0.7;  // szélesség a koronán
      const peak = Math.sin(tnorm * Math.PI);    // középen magasabb
      const h = hr * (0.32 + peak * 0.36);       // tüske-magasság
      const w = hr * 0.12;
      ctx.beginPath();
      ctx.moveTo(sx - w, baseY + hr * 0.05);
      ctx.lineTo(sx + (tnorm - 0.5) * hr * 0.18, baseY - h); // hegy enyhén hátradől
      ctx.lineTo(sx + w, baseY + hr * 0.05);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }


  // ==================== HATALMAS KEREK FEJ ====================
  const faceGrad = ctx.createLinearGradient(0, hy - hr, 0, hy + hr);
  faceGrad.addColorStop(0, CREATURE_PALETTE.furLight);
  faceGrad.addColorStop(0.7, CREATURE_PALETTE.fur);
  faceGrad.addColorStop(1, CREATURE_PALETTE.furShadow);

  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  // Kissé szélesített ellipszis a cuki, pufi pofikért
  ctx.ellipse(hx, hy, hr * 1.05, hr * 0.95, 0, 0, TAU);
  ctx.fill();
  // Körvonal — tárgy felülírhatja (pl. Parázs-könny → izzó vörös perem)
  if (v.look?.headOutline) {
    ctx.save();
    ctx.strokeStyle = v.look.headOutline;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = v.look.headOutline;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // ==================== FÉL-FEJ FESTÉS (Harci jel / Hármas könny) ====================
  // A fej egyik felét beborító festés, a fej alakjára vágva, enyhén hullámos
  // középvonallal (kézzel festett hatás). JOBB = halfHeadColor, BAL =
  // halfHeadColorLeft (side: +1 jobb, −1 bal — a koordináták tükröződnek).
  // A szemek/arc utána rajzolódnak rá.
  if (v.look?.halfHeadColor || v.look?.halfHeadColorLeft) {
    const paintHalf = (color: string, side: number): void => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(hx, hy, hr * 1.05, hr * 0.95, 0, 0, TAU);
      ctx.clip();
      const midX = hx + hr * 0.02 * side;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(midX, hy - hr * 1.1);
      ctx.bezierCurveTo(midX - hr * 0.12 * side, hy - hr * 0.35, midX + hr * 0.14 * side, hy + hr * 0.35, midX - hr * 0.04 * side, hy + hr * 1.1);
      ctx.lineTo(hx + hr * 1.3 * side, hy + hr * 1.1);
      ctx.lineTo(hx + hr * 1.3 * side, hy - hr * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    if (v.look.halfHeadColor) paintHalf(v.look.halfHeadColor, 1);
    if (v.look.halfHeadColorLeft) paintHalf(v.look.halfHeadColorLeft, -1);
  }


  // ==================== HATALMAS ANIME SZEMEK ====================
  const eyeScale = 1.5;        // 50%-kal nagyobb szemek
  const es = hr * eyeScale;    // skálázott szem-egység
  const ex = hx + v.dirX * hr * 0.12;
  const ey = hy - hr * 0.05 + v.dirY * hr * 0.1;
  const eyeDX = es * 0.3; // Távolság a két szem között (kicsit közelebb)

  // Írisz-szín: a tárgyak felülírhatják a zöldet (pl. Hegyes Köny → piros).
  // Csak a zöld részek cserélődnek; a sötét keret/pupilla/csillanás marad.
  const iris = v.look?.eye ?? CREATURE_PALETTE.eye;
  const irisLight = v.look?.eye ? shade(v.look.eye, 0.5) : CREATURE_PALETTE.eyeLight;

  for (const sgn of [-1, 1]) {
    // 1. Szem alapja (Sötétbarna/Fekete keret)
    ctx.fillStyle = '#1a1412';
    ctx.beginPath();
    ctx.ellipse(hx + sgn * eyeDX, ey, es * 0.26, es * 0.28, 0, 0, TAU);
    ctx.fill();

    // ROBOT-TÁVCSŐ SZEM (Lámpás): a jobb szem helyén izzó vörös szkenner-lencse
    if (v.look?.scopeEye && sgn === 1) {
      const cx = hx + eyeDX, cy = ey;
      const lr = es * 0.27;
      const pulse = 0.82 + Math.sin(t * 5) * 0.18; // a vörös mag lüktet
      // fémes lencse-ház + sötét lencse
      ctx.fillStyle = '#474d57';
      ctx.beginPath(); ctx.arc(cx, cy, lr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0e0f12';
      ctx.beginPath(); ctx.arc(cx, cy, lr * 0.84, 0, TAU); ctx.fill();
      // vörös izzás (radiális)
      const rg = ctx.createRadialGradient(cx, cy, lr * 0.05, cx, cy, lr * 0.84);
      rg.addColorStop(0, `rgba(255,180,130,${pulse})`);
      rg.addColorStop(0.38, `rgba(240,32,20,${0.9 * pulse})`);
      rg.addColorStop(1, 'rgba(110,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx, cy, lr * 0.84, 0, TAU); ctx.fill();
      // célkereszt + belső gyűrű (a lencsére vágva)
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, lr * 0.84, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(255,150,120,0.6)'; ctx.lineWidth = es * 0.014;
      ctx.beginPath();
      ctx.moveTo(cx - lr, cy); ctx.lineTo(cx + lr, cy);
      ctx.moveTo(cx, cy - lr); ctx.lineTo(cx, cy + lr);
      ctx.arc(cx, cy, lr * 0.5, 0, TAU);
      ctx.stroke();
      ctx.restore();
      // forró fehér mag
      ctx.fillStyle = '#fff0d8';
      ctx.beginPath(); ctx.arc(cx, cy, lr * 0.12 * pulse, 0, TAU); ctx.fill();
      // fémes perem-csillanás a ház tetején
      ctx.strokeStyle = '#aab2bc'; ctx.lineWidth = es * 0.026;
      ctx.beginPath(); ctx.arc(cx, cy, lr * 0.92, -2.2, -0.5); ctx.stroke();
      continue;
    }

    // 2. Nagy írisz (alap zöld; tárgy felülírhatja, pl. piros)
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(ex + sgn * eyeDX, ey + es * 0.04, es * 0.22, es * 0.23, 0, 0, TAU);
    ctx.fill();

    // 3. Világosabb alsó ragyogás (Gradient hatás)
    ctx.fillStyle = irisLight;
    ctx.beginPath();
    ctx.ellipse(ex + sgn * eyeDX, ey + es * 0.1, es * 0.16, es * 0.12, 0, 0, TAU);
    ctx.fill();

    // Pupilla visszaállítása a ragyogás fölé
    ctx.fillStyle = '#1a1412';
    ctx.beginPath();
    ctx.ellipse(ex + sgn * eyeDX, ey + es * 0.02, es * 0.14, es * 0.16, 0, 0, TAU);
    ctx.fill();

    // 4. Nagy fehér főcsillanás (Fent-balra)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + sgn * eyeDX - es * 0.07, ey - es * 0.07, es * 0.07, 0, TAU);
    ctx.fill();

    // 5. Kisebb másodlagos csillanás (Lent-jobbra)
    ctx.beginPath();
    ctx.arc(ex + sgn * eyeDX + es * 0.06, ey + es * 0.1, es * 0.03, 0, TAU);
    ctx.fill();
  }


  // ==================== SZEMÜVEG (Messzelátó) ====================
  // Kerek, arany keretes pápaszem a szemek köré — a lencse alatt átlátszik a szem.
  if (v.look?.glasses) {
    const lrx = es * 0.285;  // lencse fél-szélesség
    const lry = es * 0.32;   // lencse fél-magasság
    const frame = '#16120f';   // fekete keret
    const frameHi = '#3c332e'; // halk perem-csillanás (felső réteg)
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      const cx = hx + sgn * eyeDX;
      // halvány üveg-sheen
      ctx.fillStyle = 'rgba(180,220,255,0.12)';
      ctx.beginPath(); ctx.ellipse(cx, ey, lrx, lry, 0, 0, TAU); ctx.fill();
      // keret: vastag fekete alsó réteg + vékony perem-csillanás (3D hatás)
      ctx.strokeStyle = frame; ctx.lineWidth = es * 0.06;
      ctx.beginPath(); ctx.ellipse(cx, ey, lrx, lry, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = frameHi; ctx.lineWidth = es * 0.03;
      ctx.beginPath(); ctx.ellipse(cx, ey, lrx, lry, 0, 0, TAU); ctx.stroke();
      // ferde üveg-csillanás
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = es * 0.028;
      ctx.beginPath();
      ctx.moveTo(cx - lrx * 0.45, ey - lry * 0.4);
      ctx.lineTo(cx - lrx * 0.05, ey + lry * 0.15);
      ctx.stroke();
      // szár a fül felé
      ctx.strokeStyle = frame; ctx.lineWidth = es * 0.045;
      ctx.beginPath();
      ctx.moveTo(cx + sgn * lrx * 0.98, ey - lry * 0.08);
      ctx.lineTo(cx + sgn * lrx * 1.7, ey - lry * 0.3);
      ctx.stroke();
    }
    // orr-híd a két lencse között
    ctx.strokeStyle = frame; ctx.lineWidth = es * 0.045;
    ctx.beginPath();
    ctx.moveTo(hx - eyeDX + lrx * 0.85, ey - lry * 0.12);
    ctx.quadraticCurveTo(hx, ey - lry * 0.34, hx + eyeDX - lrx * 0.85, ey - lry * 0.12);
    ctx.stroke();
    ctx.restore();
  }


  // ==================== CUKI ARCBERENDEZÉS ====================
  // Apró barna nózi
  ctx.fillStyle = CREATURE_PALETTE.outline;
  ctx.beginPath();
  ctx.ellipse(hx, ey + hr * 0.18, hr * 0.05, hr * 0.035, 0, 0, TAU);
  ctx.fill();

  // Halvány pofi pír (Blush)
  ctx.fillStyle = CREATURE_PALETTE.blush;
  ctx.beginPath(); ctx.ellipse(hx - hr * 0.5, ey + hr * 0.24, hr * 0.15, hr * 0.09, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + hr * 0.5, ey + hr * 0.24, hr * 0.15, hr * 0.09, 0, 0, TAU); ctx.fill();

  // Apró szemöldökök a szemek felett
  ctx.fillStyle = CREATURE_PALETTE.outline;
  ctx.beginPath(); ctx.ellipse(hx - hr * 0.32, ey - hr * 0.32, hr * 0.04, hr * 0.02, 0.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + hr * 0.32, ey - hr * 0.32, hr * 0.04, hr * 0.02, -0.2, 0, TAU); ctx.fill();

  // ==================== CÉLKERESZT-JEL (Vadász-szem) ====================
  if (v.look?.foreheadCrosshair) {
    const cx = hx, cy = ey - hr * 0.5, rr = hr * 0.12;
    ctx.strokeStyle = '#d83a6a';
    ctx.lineWidth = hr * 0.028;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - rr * 1.5, cy); ctx.lineTo(cx + rr * 1.5, cy);
    ctx.moveTo(cx, cy - rr * 1.5); ctx.lineTo(cx, cy + rr * 1.5);
    ctx.stroke();
  }

  // ==================== HOLD-SARLÓ JEL (Holdkő) ====================
  if (v.look?.crescentMark) {
    const cx = hx, cy = ey - hr * 0.5, rr = hr * 0.14;
    ctx.fillStyle = '#cfe8ff';
    ctx.strokeStyle = '#7fa8d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, Math.PI * 0.35, Math.PI * 1.65, false);
    ctx.arc(cx + rr * 0.5, cy, rr * 0.9, Math.PI * 1.55, Math.PI * 0.45, true);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // ==================== LEBEGŐ ARANY SZEM (Villám-szem) ====================
  // Tisztán dísz: egy „mindent látó" arany szem lebeg a fej fölött, finoman.
  if (v.look?.floatingEye) {
    const cx = hx, cy = hy - hr * 1.7 + Math.sin(t * 2) * hr * 0.06; // lágy lebegés
    const ew = hr * 0.55, eh = hr * 0.36;
    ctx.save();
    ctx.translate(cx, cy);
    const eyePath = (): void => {
      ctx.beginPath();
      ctx.moveTo(-ew, 0);
      ctx.quadraticCurveTo(0, -eh, ew, 0);
      ctx.quadraticCurveTo(0, eh, -ew, 0);
      ctx.closePath();
    };
    // szemfehér + arany ragyogás
    ctx.shadowColor = 'rgba(255,200,80,0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fff4d0';
    eyePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // arany írisz + pupilla, a szem alakjára vágva
    ctx.save();
    eyePath(); ctx.clip();
    const ig = ctx.createRadialGradient(0, 0, 1, 0, 0, eh * 1.3);
    ig.addColorStop(0, '#ffe79a');
    ig.addColorStop(0.55, '#ffc22a');
    ig.addColorStop(1, '#c8860f');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(0, 0, eh * 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#241a08';
    ctx.beginPath(); ctx.arc(0, 0, eh * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-eh * 0.28, -eh * 0.28, eh * 0.18, 0, TAU); ctx.fill();
    ctx.restore();
    // körvonal felülre
    ctx.strokeStyle = '#a8791f';
    ctx.lineWidth = 1.6;
    eyePath(); ctx.stroke();
    ctx.restore();
  }

  // ==================== RUGÓS ANTENNA (Gumifal) ====================
  if (v.look?.springAntenna) {
    const baseY = hy - hr * 0.9;
    const topY = baseY - hr * 0.55;
    ctx.save();
    ctx.strokeStyle = '#3fa03f';
    ctx.lineWidth = hr * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const tt = i / 24;
      const yy = baseY + (topY - baseY) * tt;
      const xx = hx + Math.sin(tt * 3 * TAU) * hr * 0.09;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#7fe07f';
    ctx.strokeStyle = CREATURE_PALETTE.outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx, topY - hr * 0.07, hr * 0.1, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }


  // ==================== SÖTÉT FÁTYOL ====================
  // Enyhén áttetsző, sötét lepel a fejre borítva, hullámos szegéllyel — az arc
  // halványan átdereng (a perk csökkenti a látótávot, ez vizuálisan is rímel rá).
  if (v.look?.veil) {
    const topY = hy - hr * 1.2;     // a korona fölött
    const vW = hr * 1.34;           // fél-szélesség (a fejen kívülre lóg)
    const hemY = hy + hr * 0.95;    // a szegély a testre lóg
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(hx - vW, hemY);
    ctx.quadraticCurveTo(hx - vW * 1.05, hy - hr * 0.5, hx - hr * 0.5, topY); // bal oldal fel a koronáig
    ctx.quadraticCurveTo(hx, topY - hr * 0.22, hx + hr * 0.5, topY);          // ív a korona fölött
    ctx.quadraticCurveTo(hx + vW * 1.05, hy - hr * 0.5, hx + vW, hemY);       // jobb oldal le
    const n = 4; // hullámos szegély jobbról balra
    for (let i = 1; i <= n; i++) {
      const cxw = hx + vW - 2 * vW * ((i - 0.5) / n);
      const nxw = hx + vW - 2 * vW * (i / n);
      ctx.quadraticCurveTo(cxw, hemY + hr * 0.12, nxw, hemY);
    }
    ctx.closePath();
    const vg = ctx.createLinearGradient(0, topY, 0, hemY);
    vg.addColorStop(0, 'rgba(16,9,26,0.52)');
    vg.addColorStop(0.6, 'rgba(26,15,40,0.42)');
    vg.addColorStop(1, 'rgba(34,20,52,0.30)');
    ctx.fillStyle = vg;
    ctx.fill();
    // halk korona-csillanás (a lepel teteje)
    ctx.strokeStyle = 'rgba(150,140,185,0.25)';
    ctx.lineWidth = hr * 0.03;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.5, topY + hr * 0.02);
    ctx.quadraticCurveTo(hx, topY - hr * 0.2, hx + hr * 0.5, topY + hr * 0.02);
    ctx.stroke();
    // finom függőleges redők
    ctx.strokeStyle = 'rgba(8,5,14,0.22)';
    ctx.lineWidth = hr * 0.02;
    for (const fx of [-0.55, 0.05, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(hx + fx * hr * 0.5, topY + hr * 0.12);
      ctx.quadraticCurveTo(hx + fx * hr, hy, hx + fx * hr * 1.2, hemY - hr * 0.08);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/* ===================================================================== *
 *  ITEM-FORMA — sötét csuklyás "wraith" (későbbi tárgyhoz)
 * ===================================================================== */
const WR = {
  cloak: '#3a3666',
  cloakLight: '#5b5494',
  cloakDark: '#1c1838',
  mantle: '#2a2750',
  mantleDark: '#16132c',
  faceShadow: '#08060f',
  eye: '#ffd96a',
  eyeCore: '#fff3c8',
  eyeGlow: '#ff9e3d',
  gem: '#ffce5a',
  gemGlow: '#ff8a3d',
  outline: '#090713',
  rim: 'rgba(180,200,255,0.22)',
};

export function drawWraithForm(ctx: CanvasRenderingContext2D, v: PlayerVisual): void {
  const { x, y, r } = v;
  const t = performance.now() / 1000;
  const bounce = Math.abs(Math.sin(v.walk)) * 3;
  const breathe = Math.sin(t * 2) * 0.6;
  const gy = r * 1.0;
  const step = v.moving ? Math.sin(v.walk) * 3 : 0;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.02, r * 1.0, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y - bounce);
  if (v.invuln > 0 && Math.floor(v.invuln * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = WR.cloakDark;
  ctx.beginPath(); ctx.ellipse(-r * 0.32, gy - 2 + step, r * 0.24, r * 0.16, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.32, gy - 2 - step, r * 0.24, r * 0.16, 0, 0, TAU); ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r * 0.5, 0, gy);
  bodyGrad.addColorStop(0, WR.cloakLight);
  bodyGrad.addColorStop(0.5, WR.cloak);
  bodyGrad.addColorStop(1, WR.cloakDark);
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = WR.outline;
  ctx.lineWidth = 2.4;
  const tatters = 5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, -r * 0.35);
  ctx.bezierCurveTo(-r * 1.02, r * 0.1, -r * 1.12, r * 0.7, -r * 1.05, gy);
  for (let i = 0; i <= tatters; i++) {
    const fx = -1.05 + (2.1 * i) / tatters;
    const px = r * fx;
    const py = gy + (i % 2 === 0 ? r * 0.22 : -r * 0.02);
    ctx.lineTo(px, py);
  }
  ctx.bezierCurveTo(r * 1.12, r * 0.7, r * 1.02, r * 0.1, r * 0.72, -r * 0.35);
  ctx.quadraticCurveTo(0, -r * 0.66, -r * 0.72, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.3;
  for (const fx of [-0.34, 0.34]) {
    ctx.beginPath();
    ctx.moveTo(r * fx, r * 0.05 + breathe);
    ctx.lineTo(r * fx * 1.25, gy * 0.9);
    ctx.stroke();
  }

  const mantleGrad = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.2);
  mantleGrad.addColorStop(0, WR.mantle);
  mantleGrad.addColorStop(1, WR.mantleDark);
  ctx.fillStyle = mantleGrad;
  ctx.strokeStyle = WR.outline;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -r * 0.18);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.28, 0, r * 0.22);
  ctx.quadraticCurveTo(r * 0.5, r * 0.28, r * 0.92, -r * 0.18);
  ctx.quadraticCurveTo(r * 0.5, -r * 0.5, 0, -r * 0.52);
  ctx.quadraticCurveTo(-r * 0.5, -r * 0.5, -r * 0.92, -r * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = WR.gemGlow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = WR.gem;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.06);
  ctx.lineTo(r * 0.1, r * 0.04);
  ctx.lineTo(0, r * 0.16);
  ctx.lineTo(-r * 0.1, r * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  const hx = v.lean * 0.6;
  const hy = -r * 0.62 + breathe;
  const hr = r * 0.72;
  const hoodGrad = ctx.createLinearGradient(0, hy - hr * 1.3, 0, hy + hr);
  hoodGrad.addColorStop(0, WR.cloakLight);
  hoodGrad.addColorStop(0.6, WR.cloak);
  hoodGrad.addColorStop(1, WR.cloakDark);
  ctx.fillStyle = hoodGrad;
  ctx.strokeStyle = WR.outline;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.95, hy + hr * 0.42);
  ctx.bezierCurveTo(hx - hr * 1.0, hy - hr * 0.7, hx - hr * 0.35, hy - hr * 1.35, hx, hy - hr * 1.2);
  ctx.bezierCurveTo(hx + hr * 0.35, hy - hr * 1.35, hx + hr * 1.0, hy - hr * 0.7, hx + hr * 0.95, hy + hr * 0.42);
  ctx.quadraticCurveTo(hx, hy + hr * 0.95, hx - hr * 0.95, hy + hr * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const caveGrad = ctx.createRadialGradient(hx, hy + hr * 0.22, hr * 0.05, hx, hy + hr * 0.18, hr * 0.64);
  caveGrad.addColorStop(0, '#000000');
  caveGrad.addColorStop(1, WR.faceShadow);
  ctx.fillStyle = caveGrad;
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.18, hr * 0.56, hr * 0.62, 0, 0, TAU);
  ctx.fill();

  const ex = hx + v.dirX * hr * 0.18;
  const ey = hy + hr * 0.2 + v.dirY * hr * 0.14;
  ctx.shadowColor = WR.eyeGlow;
  ctx.shadowBlur = 10;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = WR.eye;
    ctx.beginPath();
    ctx.ellipse(ex + sgn * hr * 0.24, ey, hr * 0.12, hr * 0.17, sgn * 0.25, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = WR.eyeCore;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(ex + sgn * hr * 0.24, ey - hr * 0.03, hr * 0.05, hr * 0.07, 0, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = WR.rim;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.78, hy + hr * 0.1);
  ctx.bezierCurveTo(hx - hr * 0.85, hy - hr * 0.6, hx - hr * 0.3, hy - hr * 1.12, hx + hr * 0.05, hy - hr * 1.05);
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}
