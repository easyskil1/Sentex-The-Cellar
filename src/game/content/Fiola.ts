import { TAU, shade } from '../../engine/math';

/**
 * Random-hatású fogyóeszköz: a „Fiola" (#44). A tabletta a `perk`-tárgyaké maradt
 * (lásd a kategória-szétválasztást, #33), ezért a fiola SAJÁT ampulla-vizuált kap.
 * A fiola SZÍNE az egyetlen támpont: a szín→hatás társítás futásonként véletlen, és
 * a hatás csak az ELSŐ kiivásnál fed fel (lásd Player.fiolaMap / World.drinkFiola).
 */
export type FiolaEffect = 'heal' | 'haste' | 'rage' | 'confuse' | 'burn' | 'slow';

export interface FiolaEffectDef {
  id: FiolaEffect;
  /** i18n-kulcs a felfedett névhez (HUD-floater). */
  nameKey: string;
  /** i18n-kulcs a rövid leíráshoz. */
  descKey: string;
  /** Jótékony (true) vagy ártalmas (false) - a floater színéhez/hangjához. */
  good: boolean;
}

/**
 * A hat-elemű hatás-paletta (vegyes/klasszikus: 3 jó + 3 rossz). MIND a MEGLÉVŐ
 * Sentex-státuszokra épül, új tartalom nélkül:
 *  - heal   : azonnali gyógyulás (HP.heart×2)
 *  - haste  : ideiglenes sebesség + tűzgyorsaság (Player.hasteT)
 *  - rage   : ideiglenes sebzés-bónusz, lejáratkor visszavonva (Player.rageT/rageBonus)
 *  - confuse: fordított irányítás (a Zavaró ellenfél `confusedT` mechanikája)
 *  - burn   : önsorsoló tűz-DoT pár másodpercig (World tick-eli, killhet - ez a tét)
 *  - slow   : lassulás (a Dermesztő `slowT`/`slowMul` mechanikája)
 */
export const FIOLA_EFFECTS: readonly FiolaEffectDef[] = [
  { id: 'heal',    nameKey: 'fiola.heal.name',    descKey: 'fiola.heal.desc',    good: true },
  { id: 'haste',   nameKey: 'fiola.haste.name',   descKey: 'fiola.haste.desc',   good: true },
  { id: 'rage',    nameKey: 'fiola.rage.name',    descKey: 'fiola.rage.desc',    good: true },
  { id: 'confuse', nameKey: 'fiola.confuse.name', descKey: 'fiola.confuse.desc', good: false },
  { id: 'burn',    nameKey: 'fiola.burn.name',    descKey: 'fiola.burn.desc',    good: false },
  { id: 'slow',    nameKey: 'fiola.slow.name',    descKey: 'fiola.slow.desc',    good: false },
];

export const FIOLA_EFFECT_BY_ID: Record<FiolaEffect, FiolaEffectDef> =
  Object.fromEntries(FIOLA_EFFECTS.map((e) => [e.id, e])) as Record<FiolaEffect, FiolaEffectDef>;

/**
 * A futásokon ÁT felfedett fiola-hatások (a Kódex feloldás-kapuja). A szín→hatás
 * társítás futásonként véletlen, ezért a felfedés a HATÁS-id-t rögzíti (nem a színt):
 * a Kódex „mit csinálhat egy fiola" referenciát ad, a per-futás találgatás megmarad.
 */
const FIOLA_SEEN_KEY = 'sentex_fiola_seen';

export function loadFiolaSeen(): Set<FiolaEffect> {
  try {
    const raw = localStorage.getItem(FIOLA_SEEN_KEY);
    if (raw) return new Set(JSON.parse(raw) as FiolaEffect[]);
  } catch { /* localStorage nem elérhető / sérült */ }
  return new Set();
}

/** Egy fiola-hatás felfedésének rögzítése (az első kiivásnál - lásd World.drinkFiola). */
export function markFiolaSeen(id: FiolaEffect): void {
  try {
    if (!FIOLA_EFFECT_BY_ID[id]) return;
    const set = loadFiolaSeen();
    if (set.has(id)) return;
    set.add(id);
    localStorage.setItem(FIOLA_SEEN_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/**
 * Hat megkülönböztethető üvegszín. Számuk = a hatások száma, így futásonként
 * 1:1 (bijektív) a véletlen társítás (lásd Player.rollFiolaMap). A szín NEM árulja
 * el a hatást - csak a vizuális azonosításra szolgál a felfedésig.
 */
export const FIOLA_COLORS: readonly string[] = [
  '#e0566a', // vörös
  '#5ac46a', // zöld
  '#5a9ce0', // kék
  '#e0b24a', // borostyán
  '#b06ad8', // ibolya
  '#46c8c0', // türkiz
];

export interface FiolaDrawOpts {
  /** Ragyogás az üveg körül (a padlón lebegő pickuphoz). */
  glow?: boolean;
  /** Elforgatás radiánban (lebegő billegéshez). */
  rot?: number;
  /** Üres tartó (HUD: 0 darab) - halvány, folyadék nélkül. */
  empty?: boolean;
}

/**
 * Egy fiola (üvegampulla) kirajzolása az `(cx, cy)` középpont köré, `r` ~ félmérettel.
 * A pickup (nagyobb, ragyogó) és a HUD-számláló (apró ikon) ugyanezt használja, így
 * a felvett fiola ugyanúgy néz ki a HUD-on, mint a földön. A `color` az üveg-folyadék
 * színe (a hatás-azonosító - lásd FIOLA_COLORS).
 */
export function drawFiola(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  opts: FiolaDrawOpts = {},
): void {
  const { glow = false, rot = 0, empty = false } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate(rot);

  // arányok (egy ~1.4r × 2.8r dobozban): dugó · nyak · öblös test lekerekített aljjal
  const bw = r * 0.74;          // test fél-szélessége
  const bodyTop = -r * 0.35;    // a test teteje (a vállnál)
  const bodyBot = r * 1.32;     // a lekerekített alj
  const neckW = r * 0.42;       // nyak fél-szélessége
  const neckTop = -r * 1.12;    // a nyak teteje (a dugó alatt)

  // --- üveg-test sziluett (nyak + öblös test) path ---
  const bodyPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(-neckW, neckTop);
    ctx.lineTo(-neckW, bodyTop - r * 0.18);
    // bal váll a testbe
    ctx.quadraticCurveTo(-bw, bodyTop - r * 0.05, -bw, bodyTop + r * 0.3);
    ctx.lineTo(-bw, bodyBot - r * 0.4);
    // lekerekített alj
    ctx.quadraticCurveTo(-bw, bodyBot, 0, bodyBot);
    ctx.quadraticCurveTo(bw, bodyBot, bw, bodyBot - r * 0.4);
    ctx.lineTo(bw, bodyTop + r * 0.3);
    // jobb váll vissza a nyakhoz
    ctx.quadraticCurveTo(bw, bodyTop - r * 0.05, neckW, bodyTop - r * 0.18);
    ctx.lineTo(neckW, neckTop);
    ctx.closePath();
  };

  if (glow && !empty) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }

  // üveg-háttér (halvány, áttetsző)
  bodyPath();
  ctx.fillStyle = empty ? 'rgba(120,128,150,0.16)' : 'rgba(200,220,240,0.16)';
  ctx.fill();
  ctx.shadowBlur = 0;

  // --- folyadék: az alsó ~70%-ot tölti, vágva a test sziluettjére ---
  if (!empty) {
    ctx.save();
    bodyPath();
    ctx.clip();
    const liqTop = bodyTop + r * 0.42; // a folyadék felszíne
    const g = ctx.createLinearGradient(0, liqTop, 0, bodyBot);
    g.addColorStop(0, shade(color, 0.28));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.32));
    ctx.fillStyle = g;
    ctx.fillRect(-bw, liqTop, bw * 2, bodyBot - liqTop + 1);
    // meniszkusz-csillanás a felszínen
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-bw, liqTop, bw * 2, Math.max(1, r * 0.12));
    ctx.restore();
  }

  // --- üveg-csillanás (bal oldali fény-sáv) ---
  ctx.save();
  bodyPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(-bw * 0.42, bodyBot * 0.35, r * 0.16, r * 0.7, -0.12, 0, TAU);
  ctx.fill();
  ctx.restore();

  // üveg-körvonal
  bodyPath();
  ctx.strokeStyle = empty ? 'rgba(150,160,185,0.4)' : 'rgba(225,238,250,0.65)';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // --- dugó (parafa) a nyak tetején ---
  const corkW = neckW + r * 0.16;
  const corkTop = neckTop - r * 0.42;
  const cg = ctx.createLinearGradient(0, corkTop, 0, neckTop);
  cg.addColorStop(0, empty ? '#5a5048' : '#b9895a');
  cg.addColorStop(1, empty ? '#3a342e' : '#7d5a38');
  ctx.fillStyle = cg;
  roundRectPath(ctx, -corkW, corkTop, corkW * 2, neckTop - corkTop + r * 0.12, r * 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,28,18,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();

  ctx.restore();
}

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
