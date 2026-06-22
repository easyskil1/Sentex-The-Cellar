import { TAU } from '../../engine/math';

/**
 * A játékos kinézetének önálló renderelője — leválasztva a Player logikájáról.
 *
 * Forma-alapú: alapból „Nim" (csuklyás, egyszemű); a `cosmetics` lista
 * kapcsolhat be más formát (pl. 'wraith' → sötét csuklyás). A felvett tárgyak
 * csak a LÖVEDÉK kinézetét állítják (`BodyLook`), a karakter testét nem.
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
  /** A mozgás-vektor (sebesség); a karakter szeme efelé néz, ha mozog. */
  moveX?: number;
  moveY?: number;
  /** Aktív jelmez-rétegek/formák (tárgyak adják hozzá). */
  cosmetics?: string[];
  /** A felvett tárgyak lövedék-kinézet módosítása. */
  look?: BodyLook;
}

/**
 * A felvett tárgyak hatása a LÖVEDÉKRE (a karakter testét nem érinti).
 * A mezők hiányában az alap lövedék (kék kör) marad; a legutóbb felvett nyer.
 */
export interface BodyLook {
  /** Lövedék-szín (hex) — a könnycsepp színe; ha nincs, az alap kék marad. */
  tearColor?: string;
  /** Lövedék függőleges összenyomása (1 = kör; <1 = lapított korong, pl. Lendkerék). */
  tearSquashY?: number;
}

/** Friss, módosítatlan alap-lövedék-kinézet (innen indul a tárgyak halmozása). */
export function defaultBodyLook(): BodyLook {
  return {};
}

export function drawPlayer(ctx: CanvasRenderingContext2D, v: PlayerVisual): void {
  if (v.cosmetics?.includes('wraith')) drawWraithForm(ctx, v);
  else drawNim(ctx, v);                         // ALAP karakter: „Nim"
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

/* ===================================================================== *
 *  ALAP KARAKTER — „Nim"
 *  Csuklyás, egyetlen nagy szemű kis lény: sötét, rongyos köpeny, vékony
 *  lábak, kéztőr. A Mireveil (Hollow Knight-esztétika) HANGULATÁRA hangolva,
 *  de PROCEDURÁLISAN (asset nélkül) - a festett textúrát nem éri el, a sziluett
 *  és a hangulat igen.
 * ===================================================================== */
const SH = {
  cloak: '#3c4047',
  cloakLight: '#565b65',
  cloakDark: '#252830',
  cloakDarkest: '#15171c',
  cave: '#070809',
  eyeWhite: '#efe9da',
  eyeShade: '#c9c2af',
  pupil: '#16110e',
  leg: '#1a1a1f',
  blade: '#ced3da',
  bladeDark: '#7f858e',
  hilt: '#3a2b1d',
  outline: '#121318',
  rim: 'rgba(150,162,186,0.22)',
};

/** Aranyos, mutató fehér kézfej (cx,cy) köré, `ang` szögben, `r` mérettel.
 *  A bal féltekében függőlegesen tükröz (`flip`), hogy a mutatóujj mindig fent legyen. */
function drawPointingHand(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, ang: number,
): void {
  const cL = [0.04, 0.045, 0.05];   // behajlított ujjak (rövid)
  const cY = [0.11, 0.04, -0.03];
  const cX = [0.08, 0.10, 0.11];
  const flip = Math.abs(ang) > Math.PI / 2;   // bal félteke → ne álljon fejre
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);                             // a mutatóujj +x (előre)
  if (flip) ctx.scale(1, -1);

  // 1. a teljes forma egyben, fehérrel
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.02, r * 0.11, r * 0.06, r * 0.045, 0.4, 0, TAU);   // hüvelyk
  ctx.fill();
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.ellipse(r * cX[k]!, r * cY[k]!, r * cL[k]!, r * 0.04, 0, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(r * 0.21, -r * 0.08, r * 0.13, r * 0.043, -0.05, 0, TAU); // mutatóujj (összeér a tenyérrel)
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.14, r * 0.17, 0, 0, TAU);                      // tenyér
  ctx.fill();

  // 2. körvonalak
  ctx.strokeStyle = 'rgba(100,95,110,0.4)';
  ctx.lineWidth = r * 0.014;
  const ds = (b: () => void): void => { ctx.beginPath(); b(); ctx.stroke(); };
  for (let k = 0; k < 3; k++) {
    ds(() => ctx.ellipse(r * cX[k]!, r * cY[k]!, r * cL[k]!, r * 0.04, 0, 0, TAU));
  }
  ds(() => ctx.ellipse(-r * 0.02, r * 0.11, r * 0.06, r * 0.045, 0.4, 0, TAU));
  ds(() => ctx.ellipse(r * 0.21, -r * 0.08, r * 0.13, r * 0.043, -0.05, 0, TAU));
  ds(() => ctx.ellipse(0, 0, r * 0.14, r * 0.17, 0, 0, TAU));

  // 3. belső pír + csillanás
  const pg = ctx.createRadialGradient(-r * 0.02, 0, r * 0.01, 0, 0, r * 0.13);
  pg.addColorStop(0, '#fff6f2');
  pg.addColorStop(1, '#e8e2d5');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(-r * 0.01, 0, r * 0.10, r * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, -r * 0.05, r * 0.035, r * 0.02, -0.4, 0, TAU);
  ctx.fill();

  ctx.restore();
}

export function drawNim(ctx: CanvasRenderingContext2D, v: PlayerVisual): void {
  const { x, y, r } = v;
  const t = performance.now() / 1000;
  const bounce = Math.abs(Math.sin(v.walk)) * 2.0;
  const step = v.moving ? Math.sin(v.walk) * 2.6 : 0;
  const breathe = Math.sin(t * 2) * 0.5;
  const floatY = Math.sin(t * 1.6) * r * 0.05;            // finom lebegés
  // mozgás-erősség (0..1) és -irány: ettől leng a csuklya és lobog a köpeny menés közben
  const mvLen = Math.hypot(v.moveX ?? 0, v.moveY ?? 0);
  const moveAmt = Math.min(1, mvLen / 120);
  const mvx = mvLen > 1 ? (v.moveX ?? 0) / mvLen : 0;
  const mvy = mvLen > 1 ? (v.moveY ?? 0) / mvLen : 0;
  const flap = Math.sin(t * 9 + v.walk);                  // gyors lobogás-fázis
  // a csuklya-hegy a mozgással SZEMBE dől + leng (mint szélben)
  const hoodSway = Math.sin(t * 1.1) * 0.05 + flap * moveAmt * 0.1 - mvx * moveAmt * 0.22;
  const dl = Math.hypot(v.dirX, v.dirY) || 1;
  const ax = v.dirX / dl, ay = v.dirY / dl;       // célzás-irány (a szem ÉS a kéz efelé néz)
  const rnd = (n: number): number => { const s = Math.sin(n * 127.1 + 17.3) * 43758.5453; return s - Math.floor(s); };

  // ===== TALAJ-ÁRNYÉK (puha) =====
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.68, r * 0.74, r * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  // a teszt-karakter VIZUÁLISAN nagyobb (az ütközés-sugár marad `r`); a talajhoz
  // rögzítve nagyobbodik felfelé, ezért a translate-et `(S-1)*r`-rel feljebb visszük
  const S = 0.9;   // a régi karakter magasságára hangolva (mért egyezés)
  ctx.translate(x, y - bounce + floatY - (S - 1) * r);
  ctx.scale(S, S);
  if (v.invuln > 0 && Math.floor(v.invuln * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const gy = r * 1.0;
  // a fej/test a MOZGÁS felé dől („belehajol"), míg a szem a lövésre néz
  const hx = v.lean * 0.34 + mvx * moveAmt * r * 0.24;
  const hy = -r * 0.66 + breathe + mvy * moveAmt * r * 0.12;
  const hr = r * 0.86;               // a fej DOMINÁL (sokkal nagyobb a vékony testnél)

  // ===== LÁBAK (Nim-szerű pufi praclik: kerek tető, lapos alj) =====
  for (const sgn of [-1, 1]) {
    const sstep = sgn < 0 ? step : -step;
    const footY = gy * 0.64 + sstep * 0.5;
    const lg = ctx.createLinearGradient(0, footY - r * 0.2, 0, footY);
    lg.addColorStop(0, SH.cloak);
    lg.addColorStop(1, SH.cloakDarkest);
    ctx.fillStyle = lg;
    ctx.strokeStyle = SH.outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(sgn * r * 0.17, footY, r * 0.16, r * 0.21, 0, Math.PI, 2 * Math.PI); // felső dóm
    ctx.closePath(); // egyenes alsó él
    ctx.fill();
    ctx.stroke();
  }

  // ===== KÖPENY-TEST (sötét, rongyos szegéllyel) =====
  const cloakGrad = ctx.createLinearGradient(0, hy, 0, gy * 1.1);
  cloakGrad.addColorStop(0, SH.cloakLight);
  cloakGrad.addColorStop(0.45, SH.cloak);
  cloakGrad.addColorStop(1, SH.cloakDarkest);
  ctx.fillStyle = cloakGrad;
  ctx.strokeStyle = SH.outline;
  ctx.lineWidth = 2;
  const tatters = 6;
  const hemY = gy * 0.6;             // rövidebb (függőlegesen kisebb) test
  const neckY = hy + hr * 0.66;      // a vékony köpeny a NAGY fej alá csatlakozik
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, neckY);
  ctx.bezierCurveTo(-r * 0.46, r * 0.16, -r * 0.5, r * 0.38, -r * 0.44 + step * 0.4, hemY);
  // tépett alsó szegély (változó mélységű csúcsok)
  for (let i = 0; i <= tatters; i++) {
    const f = -0.44 + (0.88 * i) / tatters;
    const wave = Math.sin(t * 9 + i * 0.9) * r * 0.07 * moveAmt;   // a szegély hullámzik menés közben
    const px = r * f + step * (f * 0.5) + mvx * moveAmt * r * 0.08; // + a mozgás mögé lobog
    const deep = (i % 2 === 0 ? hemY + r * (0.05 + rnd(i + 3) * 0.13) : hemY - r * 0.04) + wave;
    ctx.lineTo(px, deep);
  }
  ctx.bezierCurveTo(r * 0.5, r * 0.38, r * 0.46, r * 0.16, r * 0.3, neckY);
  // vékony nyak-ív a fej alatt
  ctx.quadraticCurveTo(0, neckY - hr * 0.06, -r * 0.3, neckY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // köpeny-redők (sötét függőleges görbék)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.3;
  for (const fx of [-0.2, 0.02, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(r * fx, hy + hr * 0.66 + breathe);
    ctx.quadraticCurveTo(r * fx * 1.4, r * 0.6, r * fx * 1.5, hemY - r * 0.06);
    ctx.stroke();
  }
  // kopott foltok (szabálytalan, halvány sötét pacák a festett-kopott hatáshoz)
  for (let i = 0; i < 4; i++) {
    const bx = (rnd(i * 2 + 1) - 0.5) * r * 0.66;
    const by = hy + hr * 0.78 + rnd(i * 2 + 5) * r * 0.7;
    ctx.fillStyle = `rgba(10,11,14,${0.18 + rnd(i + 9) * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(bx, by, r * (0.06 + rnd(i + 2) * 0.06), r * (0.05 + rnd(i + 4) * 0.05), rnd(i) * TAU, 0, TAU);
    ctx.fill();
  }
  // hideg perem-fény a köpeny bal-felső szélén (hangulat)
  ctx.strokeStyle = SH.rim;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.46, r * 0.32);
  ctx.bezierCurveTo(-r * 0.52, r * 0.0, -r * 0.42, hy + hr * 0.6, -r * 0.26, hy + hr * 0.62);
  ctx.stroke();

  // a teljes fej (csuklya + arc-üreg + szem) kissé szélesebb vízszintesen
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(1.14, 1);
  ctx.translate(-hx, -hy);

  // ===== CSUKLYA (NAGYOBB keret a fej körül; a szem/arc mérete változatlan) =====
  ctx.save();
  const hd = hr * 0.98;                       // a csuklya csak keret (a fej/szem dominál)
  const hoodGrad = ctx.createLinearGradient(0, hy - hd * 1.5, 0, hy + hd * 0.6);
  hoodGrad.addColorStop(0, SH.cloakLight);
  hoodGrad.addColorStop(0.55, SH.cloak);
  hoodGrad.addColorStop(1, SH.cloakDark);
  ctx.fillStyle = hoodGrad;
  ctx.strokeStyle = SH.outline;
  ctx.lineWidth = 2;
  const tipX = hx + hd * (0.5 + hoodSway);    // a csuklya-hegy oldalra hajlik
  const tipY = hy - hd * 1.62;                // MAGASABB szürke csuklya-szövet (függőlegesen nagyobb)
  ctx.beginPath();
  ctx.moveTo(hx - hd * 0.92, hy + hd * 0.45);
  ctx.bezierCurveTo(hx - hd * 1.04, hy - hd * 0.78, hx - hd * 0.5, hy - hd * 1.36, hx - hd * 0.06, hy - hd * 1.28);
  ctx.quadraticCurveTo(tipX - hd * 0.1, tipY + hd * 0.22, tipX, tipY);            // fel a hegyig
  ctx.quadraticCurveTo(tipX + hd * 0.16, tipY + hd * 0.42, hx + hd * 0.5, hy - hd * 0.88); // a hegy vissza-görbül
  ctx.bezierCurveTo(hx + hd * 1.02, hy - hd * 0.56, hx + hd * 0.96, hy + hd * 0.2, hx + hd * 0.92, hy + hd * 0.45);
  ctx.quadraticCurveTo(hx, hy + hd * 0.86, hx - hd * 0.92, hy + hd * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // csuklya perem-fény (bal-felső)
  ctx.strokeStyle = SH.rim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx - hd * 0.86, hy + hd * 0.2);
  ctx.bezierCurveTo(hx - hd * 0.96, hy - hd * 0.78, hx - hd * 0.5, hy - hd * 1.3, hx - hd * 0.08, hy - hd * 1.22);
  ctx.stroke();
  ctx.restore();

  // ===== ARC-ÜREG (mély fekete a csuklya alatt) =====
  const caveG = ctx.createRadialGradient(hx, hy + hr * 0.12, hr * 0.08, hx, hy + hr * 0.1, hr * 0.9);
  caveG.addColorStop(0, '#000000');
  caveG.addColorStop(0.7, SH.cave);
  caveG.addColorStop(1, SH.cloakDarkest);
  ctx.fillStyle = caveG;
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.12, hr * 0.84, hr * 0.8, 0, 0, TAU);
  ctx.fill();

  // ===== A NAGY FÉLSZEM (a fej domináns eleme; a CÉLZÁS/lövés irányába néz) =====
  const eX = hx + ax * hr * 0.16;
  const eY = hy + hr * 0.12 + ay * hr * 0.1;
  const eRx = hr * 0.6, eRy = hr * 0.6;     // NAGY szem, kissé szélesebb (a fej-skála tovább szélesíti)
  // szemfehér (lágy gradiens, alul árnyékos)
  const eg = ctx.createLinearGradient(eX, eY - eRy, eX, eY + eRy);
  eg.addColorStop(0, '#ffffff');
  eg.addColorStop(0.6, SH.eyeWhite);
  eg.addColorStop(1, SH.eyeShade);
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(eX, eY, eRx, eRy, 0, 0, TAU);
  ctx.fill();
  // nagy pupilla (a célzás felé tolva)
  const pX = eX + ax * eRx * 0.32, pY = eY + ay * eRy * 0.3;
  ctx.fillStyle = SH.pupil;
  ctx.beginPath();
  ctx.ellipse(pX, pY, eRx * 0.5, eRy * 0.52, 0, 0, TAU);
  ctx.fill();
  // mély-fény a pupillában + éles csillanás
  ctx.fillStyle = 'rgba(80,90,120,0.5)';
  ctx.beginPath();
  ctx.ellipse(pX, pY + eRy * 0.12, eRx * 0.34, eRy * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(pX - eRx * 0.18, pY - eRy * 0.24, eRx * 0.16, eRy * 0.18, -0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(pX + eRx * 0.2, pY + eRy * 0.2, eRx * 0.08, 0, TAU);
  ctx.fill();
  // szem-perem árnyék (a szemgödör mélysége)
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(eX, eY, eRx, eRy, 0, Math.PI * 0.85, Math.PI * 2.15);
  ctx.stroke();

  ctx.restore();   // a fej-szélesítés vége

  // ===== ARANYOS PICI FEHÉR TENYÉR (a köpeny alól a célzásirányba) =====
  ctx.save();
  const handX = hx + ax * r * 0.6 - ay * r * 0.22;
  const handY = gy * 0.26 + ay * r * 0.44 + ax * r * 0.12 + Math.sin(t * 3) * r * 0.02;
  // árny-karocska a köpenytől a tenyérig
  ctx.strokeStyle = SH.cloakDark;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.moveTo(hx + ax * r * 0.16, gy * 0.12);
  ctx.lineTo(handX - ax * r * 0.12, handY - ay * r * 0.12);
  ctx.stroke();
  // a mutató kéz a célzás felé (az ujj arra mutat, ahova lő); fele méret
  drawPointingHand(ctx, handX, handY, r * 0.46, Math.atan2(ay, ax));
  ctx.restore();

  ctx.restore();
  ctx.globalAlpha = 1;
}
