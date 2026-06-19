import { t as tr } from '../i18n';
import { itemName, itemDesc } from './content/items';
import { skillName } from './content/skills';
import type { World } from './World';
import type { Player } from './entities/Player';
import { drawHeart, drawBombIcon, drawCoinIcon } from './entities/Pickup';
import { HP } from './config';
import { clamp } from '../engine/math';
import { SKILL_BY_ID } from './content/skills';
import { pillLook } from './content/items';
import { drawPill } from './content/Pill';
import { formatTime } from './stats';

const TAU = Math.PI * 2;

// Betűk: a főmenüvel egységes — Cinzel a hangsúlyos elemekre, tiszta sans a kis
// funkcionális szövegekre.
const SERIF = 'Cinzel, Georgia, serif';
const SANS = '"Segoe UI", system-ui, sans-serif';

// Arany/bronz/krém paletta (a főmenü színvilága).
const COL = {
  cream: '#f3e2bf',
  text: '#e8dcc8',
  gold: '#f0c878',
  bronze: '#b08a5a',
  muted: '#8a7256',
};

// A feliratok bal éle = a szívek bal széle (lásd lent: hx − sugár).
const LX = 15;
// A bal oldali blokkok közös szélessége (statok és tabletták egyforma szélesek).
const COLW = 224;
// A minimap felső éle (px). A pont/szint a jobb felső sarokban van; ez alá kerül
// a fölé igazított két idő-óra, majd alatta a minimap (lásd drawTimers/drawMinimap).
const MAP_TOP = 112;

/** Képkockák közti animáció-állapot (sebzés-villanás, érme-pop, skill-burst). */
const anim = {
  last: 0,
  prevHp: -1, hit: 0,
  prevCoins: -1, coin: 0,
  prevBombs: -1, bomb: 0,
  prevTnt: -1, tnt: 0,
  prevReady: false, burst: 0,
};

/**
 * Fejléc — a játéktérre lebegtetve (nincs doboz/panel/keret), a kontrasztot
 * finom árnyék adja. Élet, érme/bomba, passzív statok, tabletták, pont/szint,
 * középre igazított minimap, boss-csík és a radiális töltésű aktív skill.
 */
export function drawHUD(ctx: CanvasRenderingContext2D, world: World, best: number, w: number, h: number): void {
  // A játékos-központú elemek (élet, erőforrások, statok, tabletták, skill) — ezt
  // a labirintus-mód is rajzolja, ezért külön függvény (lásd drawPlayerHud).
  drawPlayerHud(ctx, world.player, w, h);

  const t = performance.now() / 1000;
  ctx.save();
  // közös, finom drop-shadow (kontraszt panel nélkül)
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  // ---- aktív csalások ----
  const cheats: string[] = [];
  if (world.cheats.invincible) cheats.push('INVINCIBLE');
  if (world.cheats.maxGold) cheats.push('MAX GOLD');
  if (world.cheats.execute) cheats.push('EXECUTE (SPACE)');
  if (cheats.length) {
    ctx.fillStyle = '#ffde1e';
    ctx.font = `600 12px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(cheats.join('  ·  '), LX, 84); // a szívek (hy=30) + erőforrás-sor alatt
  }

  // ---- pont + szint (jobb felül, Cinzel) ----
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COL.cream;
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText(world.score.toLocaleString('en-US'), w - 26, 42);
  ctx.fillStyle = COL.gold;
  ctx.font = `500 14px ${SERIF}`;
  ctx.fillText(world.floorName().toUpperCase(), w - 26, 62);
  ctx.textAlign = 'left';

  if (!world.isLabyrinth) drawMinimap(ctx, world, w, t); // labirintusban nincs szoba-térkép
  drawTimers(ctx, world, w); // idő-órák a minimap fölött (labirintusban: labirintus-óra)
  if (world.isSandbox) drawSandboxInfo(ctx, world); // teszt-aréna: szint · szorzó · valós sebzés

  // legmélyebb szint — jobb alsó sarok
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COL.muted;
  ctx.font = `500 12px ${SERIF}`;
  ctx.fillText(tr('hud.deepest', { n: best }), w - 26, h - 18);
  ctx.textAlign = 'left';

  // ---- boss életcsík ----
  const boss = world.currentRoom.enemies.find((e) => e.boss);
  if (boss) {
    const bw = Math.min(w * 0.7, 540);
    const bx = w / 2 - bw / 2;
    const by = h - 36;
    const frac = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, bx, by, bw, 10, 5);
    ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#8d2bd6');
    g.addColorStop(1, '#d14bff');
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, Math.max(5, bw * frac), 10, 5);
    ctx.fill();
    ctx.fillStyle = '#f0c6ff';
    ctx.font = `600 14px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(tr('hud.boss'), w / 2, by - 8);
    ctx.textAlign = 'left';
  }

  ctx.restore();

  drawBossIntro(ctx, world, w, h); // gótikus boss-névtábla (a HUD fölött, képernyő-térben)
}

/**
 * Boss-intro: gótikus, animált NÉVTÁBLA a szoba-belépéskor (#60/Ú4). Nincs doboz/
 * kártya - a hangulatot arany filigrán vonalak + rombusz-flourish + lágy sötét
 * derengés adja. Animáció: fölfelé settling + fade-in (0.35s), tartás, majd
 * fade-out (0.6s); a betűk enyhén kifutó betűközzel jelennek meg.
 */
function drawBossIntro(ctx: CanvasRenderingContext2D, world: World, w: number, h: number): void {
  const intro = world.bossIntroView;
  if (!intro) return;

  const DUR = 2.4, FADE_IN = 0.35, FADE_OUT = 0.6;
  const age = DUR - intro.t;                       // 0 → DUR
  const inA = clamp(age / FADE_IN, 0, 1);          // megjelenés
  const outA = clamp(intro.t / FADE_OUT, 0, 1);    // eltűnés
  const alpha = Math.min(inA, outA);
  if (alpha <= 0) return;

  const ease = 1 - Math.pow(1 - inA, 3);           // ease-out a settlinghez
  const cx = w / 2;
  const cy = h * 0.30 + (1 - ease) * 18;           // kissé fentről „leül"
  const name = intro.name.toUpperCase();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ---- lágy, vízszintes sötét derengés (NEM doboz - alul-felül elhalványul) ----
  const band = ctx.createLinearGradient(0, cy - 64, 0, cy + 64);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, `rgba(8,4,10,${0.5 * alpha})`);
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, cy - 64, w, 128);

  // ---- kicker: apró, ritkított felirat a név fölött ----
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#b08850';
  ctx.font = `600 13px ${SERIF}`;
  drawSpacedText(ctx, tr('hud.bossIntroKicker'), cx, cy - 30, 5);

  // ---- a NÉV: arany színátmenet, sötét kontúr, finom ragyogás ----
  const fs = 44;
  ctx.font = `700 ${fs}px ${SERIF}`;
  const half = ctx.measureText(name).width / 2;
  const grad = ctx.createLinearGradient(0, cy - fs * 0.5, 0, cy + fs * 0.5);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(0.55, '#e8b85a');
  grad.addColorStop(1, '#9c6b28');
  ctx.globalAlpha = alpha;
  ctx.shadowColor = `rgba(255,180,90,${0.5 * alpha})`;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(0,0,0,${0.7 * alpha})`;
  ctx.strokeText(name, cx, cy);
  ctx.shadowBlur = 0;
  ctx.fillStyle = grad;
  ctx.fillText(name, cx, cy);

  // ---- arany filigrán: két vízszintes vonal a név alatt, középen rombusz ----
  const lineY = cy + fs * 0.62;
  const reach = (half + 26) * ease;                // a vonalak kifelé „nyúlnak"
  const gap = 16;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#c89a4a';
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    const x0 = cx + s * gap, x1 = cx + s * reach;
    const lg = ctx.createLinearGradient(x0, 0, x1, 0);
    lg.addColorStop(0, '#e8c878');
    lg.addColorStop(1, 'rgba(200,154,74,0)');
    ctx.strokeStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x0, lineY);
    ctx.lineTo(x1, lineY);
    ctx.stroke();
  }
  // középső rombusz-flourish
  const ds = 4.5;
  ctx.fillStyle = '#e8c878';
  ctx.beginPath();
  ctx.moveTo(cx, lineY - ds);
  ctx.lineTo(cx + ds, lineY);
  ctx.lineTo(cx, lineY + ds);
  ctx.lineTo(cx - ds, lineY);
  ctx.closePath();
  ctx.fill();

  // ---- latin alcím a vonal alatt: halvány, dőlt, kissé késleltetve jelenik meg ----
  if (intro.quote) {
    const subA = alpha * clamp((age - FADE_IN) / 0.4, 0, 1); // a név után úszik be
    ctx.globalAlpha = subA * 0.8;
    ctx.fillStyle = '#9c814e';
    ctx.font = `italic 500 15px ${SERIF}`;
    drawSpacedText(ctx, intro.quote, cx, lineY + 20, 2);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Ritkított (letter-spaced) középre igazított szöveg rajzolása. */
function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number): void {
  const chars = [...text];
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  total -= spacing;
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const c of chars) {
    const cw = ctx.measureText(c).width;
    ctx.fillText(c, x, y);
    x += cw + spacing;
  }
  ctx.textAlign = prevAlign;
}

/**
 * A HUD játékos-központú magja: élet (szívek), érme/bomba/TNT, passzív statok,
 * felvett tabletták és az aktív skill. Minden adata a `Player`-ből jön (nem kell
 * `World`), így a normál játék (drawHUD) és a KÜLÖN labirintus-mód is használja.
 */
export function drawPlayerHud(ctx: CanvasRenderingContext2D, p: Player, w: number, h: number): void {
  // --- idő + animáció-állapot frissítés ---
  const now = performance.now();
  let dt = anim.last ? (now - anim.last) / 1000 : 0;
  anim.last = now;
  dt = Math.min(dt, 0.1);
  const t = now / 1000;

  if (anim.prevHp >= 0 && p.hp < anim.prevHp) anim.hit = 1;
  anim.prevHp = p.hp;
  if (anim.prevCoins >= 0 && p.coins > anim.prevCoins) anim.coin = 1;
  anim.prevCoins = p.coins;
  if (anim.prevBombs >= 0 && p.bombs > anim.prevBombs) anim.bomb = 1;
  anim.prevBombs = p.bombs;
  if (anim.prevTnt >= 0 && p.tnt > anim.prevTnt) anim.tnt = 1;
  anim.prevTnt = p.tnt;
  const skill = p.activeSkillId ? SKILL_BY_ID[p.activeSkillId] : undefined;
  const ready = !!skill && p.skillCharge >= skill.chargeMax;
  if (ready && !anim.prevReady) anim.burst = 1;
  anim.prevReady = ready;
  anim.hit = Math.max(0, anim.hit - dt * 3);
  anim.coin = Math.max(0, anim.coin - dt * 4);
  anim.bomb = Math.max(0, anim.bomb - dt * 4);
  anim.tnt = Math.max(0, anim.tnt - dt * 4);
  anim.burst = Math.max(0, anim.burst - dt * 1.6);

  ctx.save();

  // --- kritikus életnél finom, lüktető vörös képernyőszél ---
  if (p.hp > 0 && p.hp <= HP.heart) {
    const a = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 4));
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62);
    vg.addColorStop(0, 'rgba(180,20,30,0)');
    vg.addColorStop(1, `rgba(180,20,30,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // közös, finom drop-shadow (kontraszt panel nélkül)
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  // ---- szívek ----
  // A HP pont-skálán él; itt fél-szívekre váltjuk a kijelzéshez. Amíg él a
  // játékos, sosem mutatunk teljesen üreset (legalább egy fél-szív látszik).
  const totalSlots = Math.round(p.maxHp / HP.half);
  let filled = Math.round(p.hp / HP.half);
  if (p.hp > 0) filled = Math.max(1, filled);
  filled = Math.min(filled, totalSlots);
  const full = Math.floor(filled / 2);
  const half = filled % 2;
  const containers = Math.ceil(totalSlots / 2);
  const hx = 26;       // bal él ≈ hx − 11 = LX
  const hy = 30;
  const dx = 25;
  for (let i = 0; i < containers; i++) {
    const x = hx + i * dx;
    drawHeart(ctx, x, hy, 11, '#3a1820', '#1a0c10'); // üres tartó
    if (i < full) {
      drawHeart(ctx, x, hy, 11, '#ff4d63', '#8e1f2e');
    } else if (i === full && half) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 14, hy - 18, 14, 36);
      ctx.clip();
      drawHeart(ctx, x, hy, 11, '#ff4d63', '#8e1f2e');
      ctx.restore();
    }
  }
  // sebzés-villanás a teli szívekre
  if (anim.hit > 0.01) {
    ctx.save();
    ctx.globalAlpha = anim.hit * 0.6;
    for (let i = 0; i < full; i++) drawHeart(ctx, hx + i * dx, hy, 11, '#ffffff', '#ffffff');
    ctx.restore();
  }

  // ---- erőforrás-sor: érme · bomba · TNT ----
  const ry = hy + 30;
  drawCounter(ctx, drawCoinIcon, LX + 7, ry, 7, p.coins, COL.gold, anim.coin);
  drawCounter(ctx, (c, ix, iy, ir) => drawBombIcon(c, ix, iy, ir, 'bomb'), LX + 78, ry, 7, p.bombs, COL.text, anim.bomb);
  drawCounter(ctx, (c, ix, iy, ir) => drawBombIcon(c, ix, iy, ir, 'tnt'), LX + 128, ry, 7, p.tnt, '#ff9a7a', anim.tnt);

  drawStats(ctx, p);
  drawCollected(ctx, p, h);
  drawSkill(ctx, p, h, t);

  ctx.restore();
}

/** Ikon + szám egy sorban; a szám felpattan friss szerzéskor (`pop` 0..1). */
function drawCounter(
  ctx: CanvasRenderingContext2D,
  icon: (c: CanvasRenderingContext2D, x: number, y: number, r: number) => void,
  ix: number, iy: number, r: number, value: number, col: string, pop: number,
): void {
  icon(ctx, ix, iy, r);
  ctx.save();
  ctx.translate(ix + r + 6, iy);
  const s = 1 + 0.2 * pop;
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.font = `600 16px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${value}`, 0, 0.5);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/** Passzív statok bal oldalt — csak igazított szöveg, tompított színkóddal. */
function drawStats(ctx: CanvasRenderingContext2D, p: Player): void {
  const rows: Array<[string, string, string]> = [
    [tr('hud.stat.damage'), p.dmg.toFixed(1), '#e87a6a'], // a harci gazdaság ×100-on él — a valós sebzés-pontot mutatjuk (alap 300,0)
    [tr('hud.stat.fireRate'), `${(1 / p.fireRate).toFixed(1)}/s`, '#9ab4d8'],
    [tr('hud.stat.range'), (p.range * p.rangeMul * 10).toFixed(0), '#e8c878'],
    [tr('hud.stat.shotSpeed'), p.shotSpeed.toFixed(0), '#bca4d8'],
    [tr('hud.stat.speed'), p.speed.toFixed(0), '#9ac8a0'],
    [tr('hud.stat.luck'), p.luck.toFixed(0), '#9ad0c0'],
    [tr('hud.stat.sight'), `${Math.round(p.sight * 100)}%`, '#bcc6d8'],
  ];
  const valX = LX + COLW;
  const rh = 18;
  ctx.textBaseline = 'middle';
  let y = 102 + rh / 2;
  for (const [label, val, col] of rows) {
    ctx.textAlign = 'left';
    ctx.font = `400 13px ${SERIF}`;
    ctx.fillStyle = COL.bronze;
    ctx.fillText(label, LX, y);
    ctx.textAlign = 'right';
    ctx.font = `600 13px ${SERIF}`;
    ctx.fillStyle = col;
    ctx.fillText(val, valX, y);
    y += rh;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Felvett tabletták a statok alatt — ikon + név + leírás, garantált réssel. */
function drawCollected(ctx: CanvasRenderingContext2D, p: Player, h: number): void {
  const items = p.collected;
  if (items.length === 0) return;

  const headTop = 250;
  const rowW = COLW;
  const rowH = 19;
  const listTop = headTop + 14;
  const bottomLimit = (p.activeSkillId ? h - 64 : h) - 16;
  const maxRows = Math.max(1, Math.floor((bottomLimit - listTop) / rowH));

  const hidden = Math.max(0, items.length - maxRows);
  const shown = items.slice(hidden);

  // fix szélességek → a név és a leírás között garantált rés, sosem csúszik szét
  const ICON = 20;
  const GAP = 12;
  const NAME_MAX = 92;
  const DESC_MAX = rowW - ICON - NAME_MAX - GAP;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 11px ${SERIF}`;
  ctx.fillStyle = COL.muted;
  ctx.fillText(hidden > 0 ? tr('hud.pillsMore', { n: hidden }) : tr('hud.pills'), LX, headTop);

  let y = listTop + 4;
  for (const it of shown) {
    drawPill(ctx, LX + 6, y - 4, 6, pillLook(it));
    ctx.textAlign = 'left';
    ctx.font = `600 12px ${SERIF}`;
    ctx.fillStyle = COL.text;
    ctx.fillText(fit(ctx, itemName(it), NAME_MAX), LX + ICON, y);
    ctx.textAlign = 'right';
    ctx.font = `400 12px ${SERIF}`;
    ctx.fillStyle = it.col;
    ctx.fillText(fit(ctx, itemDesc(it), DESC_MAX), LX + rowW, y);
    ctx.textAlign = 'left';
    y += rowH;
  }
}

/** Szöveg levágása ellipszissel, hogy beférjen `maxW` szélességbe. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

/** Aktív skill bal alul — festett kör + radiális töltés-ív + név (semmi doboz). */
function drawSkill(ctx: CanvasRenderingContext2D, p: Player, h: number, t: number): void {
  if (!p.activeSkillId) return;
  const skill = SKILL_BY_ID[p.activeSkillId];
  if (!skill) return;

  const r = 17;
  const cx = LX + r;
  const cy = h - 40;
  const ready = p.skillCharge >= skill.chargeMax;
  const frac = clamp(p.skillCharge / Math.max(1, skill.chargeMax), 0, 1);

  // töltés-gyűrű háttere
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // töltés-ív
  if (frac > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
    ctx.strokeStyle = skill.col;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ikon-kör (festett, készenlétkor lüktető glow)
  ctx.save();
  if (ready) {
    ctx.shadowColor = skill.col;
    ctx.shadowBlur = 8 + 8 * (0.5 + 0.5 * Math.sin(t * 3));
  }
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.2, cx, cy, r);
  g.addColorStop(0, lighten(skill.col, 0.3));
  g.addColorStop(1, skill.col);
  ctx.globalAlpha = ready ? 1 : 0.5;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ikon-betű
  ctx.fillStyle = 'rgba(10,8,14,0.9)';
  ctx.font = `600 18px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(skillName(skill).charAt(0).toUpperCase(), cx, cy + 1);
  ctx.textBaseline = 'alphabetic';

  // készenléti szikra-pukkanás
  if (anim.burst > 0.01) {
    ctx.save();
    const spread = (1 - anim.burst) * 14;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.globalAlpha = anim.burst;
      ctx.fillStyle = lighten(skill.col, 0.3);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r + 4 + spread), cy + Math.sin(a) * (r + 4 + spread), 1 + 2 * anim.burst, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // név + állapot
  const tx = cx + r + 14;
  ctx.textAlign = 'left';
  ctx.fillStyle = ready ? COL.cream : COL.muted;
  ctx.font = `600 14px ${SERIF}`;
  ctx.fillText(fit(ctx, skillName(skill), 130), tx, cy - 2);
  ctx.fillStyle = ready ? skill.col : COL.muted;
  ctx.font = `600 11px ${SERIF}`;
  ctx.fillText(ready ? tr('hud.skillReady') : tr('hud.skillCharging'), tx, cy + 13);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** #rrggbb világosítása `amt` (0..1) arányban fehér felé. */
function lighten(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/**
 * Idő-órák a minimap fölött, középre igazítva. Normál játékban KÉT óra: a
 * SZOBA ideje (tizedmásodperccel, mert rövid) és a MAP — az aktuális szint —
 * ideje. Labirintusban (nincs minimap) egyetlen LABYRINTH-óra ugyanitt. A
 * címkék fix oszlophoz igazítva (jobbról a középvonalig, balról onnan) → a
 * változó számjegyek NEM ugrálnak.
 */
function drawTimers(ctx: CanvasRenderingContext2D, world: World, w: number): void {
  const rs = world.runStats;
  // a minimap középvonala (lásd drawMinimap: ugyanez a számítás)
  const cell = 18, step = 23, RADIUS = 3;
  const cx = w - 26 - RADIUS * step - cell / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.textBaseline = 'alphabetic';

  if (world.isLabyrinth) {
    // visszaszámláló: a kijáratig kell érni, mielőtt lejár. Vész alatt sárgára,
    // majd 10 mp alatt lüktető pirosra vált, és tizedmásodpercet is mutat.
    const left = world.labTimeRemaining;
    const urgent = left < 10;
    let col = COL.gold;
    if (left < 20) col = '#f0a050';
    if (urgent) {
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 110);
      col = `rgba(255,${Math.round(70 + 40 * pulse)},${Math.round(60 + 30 * pulse)},1)`;
    }
    drawTimerLine(ctx, cx, MAP_TOP - 26, tr('hud.timer.labyrinth'), formatTime(left, urgent), col);
  } else {
    drawTimerLine(ctx, cx, MAP_TOP - 30, tr('hud.timer.room'), formatTime(rs.room, true), COL.cream);
    drawTimerLine(ctx, cx, MAP_TOP - 12, tr('hud.timer.map'), formatTime(rs.floor), COL.gold);
  }
  ctx.restore();
}

/**
 * Teszt-aréna readout a képernyő bal felső sarkában (a szívek fölött): aktuális
 * SZINT, a mélység-alapú sebzés-SZORZÓ, és a reprezentatív ellenfél TÉNYLEGES
 * (skálázott) sebzése. Csak az admin teszt-arénában látszik (world.isSandbox).
 */
function drawSandboxInfo(ctx: CanvasRenderingContext2D, world: World): void {
  const { floor, mul, actual } = world.sandboxInfo();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 12px ${SERIF}`;
  ctx.fillStyle = COL.gold;
  const dmgPart = actual > 0 ? ` · ${actual.toLocaleString('en-US')} dmg` : '';
  ctx.fillText(`TESZT · Szint ${floor} · sebzés ×${mul.toFixed(2)}${dmgPart}`, LX, 13);
  ctx.restore();
}

/** Egy óra-sor: muted címke a középvonalig jobbra, kiemelt érték onnan balra. */
function drawTimerLine(
  ctx: CanvasRenderingContext2D, cx: number, y: number, label: string, value: string, col: string,
): void {
  ctx.textAlign = 'right';
  ctx.font = `600 11px ${SERIF}`;
  ctx.fillStyle = COL.muted;
  ctx.fillText(label, cx - 5, y);
  ctx.textAlign = 'left';
  ctx.font = `700 15px ${SERIF}`;
  ctx.fillStyle = col;
  ctx.fillText(value, cx + 5, y);
  ctx.textAlign = 'left';
}

/**
 * Minimap jobb felül — az AKTUÁLIS szoba mindig középen, körülötte fix (±RADIUS)
 * ablak. A felfedezés-logika marad (látogatott + 1 szomszéd látszik halványan).
 * Beleolvadó, áttetsző szobák; az aktuális finoman pulzál, a boss „fenyeget".
 */
function drawMinimap(ctx: CanvasRenderingContext2D, world: World, w: number, t: number): void {
  const cell = 18;
  const step = 23;     // cell + gap
  const RADIUS = 3;    // hány kocka látszik az aktuális körül
  const dungeon = world.dungeon;
  const cur = dungeon.current;
  if (!cur) return;

  // az aktuális szoba cellaközéppontja fix a képernyőn; a teteje (MAP_TOP) alá
  // fér a fölé igazított két idő-óra (lásd drawTimers)
  const mcx = w - 26 - RADIUS * step - cell / 2;
  const mcy = MAP_TOP + RADIUS * step + cell / 2;

  for (const r of dungeon.all()) {
    const isCurrent = r.key === dungeon.currentKey;
    if (!r.visited && !isCurrent) {
      const adj =
        dungeon.get(r.gx - 1, r.gy)?.visited ||
        dungeon.get(r.gx + 1, r.gy)?.visited ||
        dungeon.get(r.gx, r.gy - 1)?.visited ||
        dungeon.get(r.gx, r.gy + 1)?.visited;
      if (!adj) continue;
    }
    const ddx = r.gx - cur.gx;
    const ddy = r.gy - cur.gy;
    if (Math.abs(ddx) > RADIUS || Math.abs(ddy) > RADIUS) continue;

    const px = mcx + ddx * step - cell / 2;
    const py = mcy + ddy * step - cell / 2;

    let col = r.visited ? 'rgba(190,170,140,0.6)' : 'rgba(170,150,120,0.22)';
    if (r.type === 'boss') col = r.visited ? 'rgba(255,91,106,0.78)' : 'rgba(255,91,106,0.3)';
    if (r.type === 'item') col = r.visited ? 'rgba(127,196,255,0.78)' : 'rgba(127,196,255,0.3)';

    // boss „fenyeget": halk vörös lüktetés
    if (r.type === 'boss' && !isCurrent) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.5);
      ctx.save();
      ctx.shadowColor = `rgba(255,70,90,${0.5 * pulse})`;
      ctx.shadowBlur = 6 * pulse;
    }

    if (isCurrent) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      col = `rgba(240,200,120,${0.85 + 0.15 * pulse})`;
    }

    ctx.fillStyle = col;
    roundRect(ctx, px, py, cell, cell, 5);
    ctx.fill();
    if (r.type === 'boss' && !isCurrent) ctx.restore();

    if (isCurrent) {
      ctx.strokeStyle = 'rgba(255,247,230,0.9)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, px + 0.75, py + 0.75, cell - 1.5, cell - 1.5, 4);
      ctx.stroke();
    }

    if (r.type === 'boss' || r.type === 'item') {
      ctx.fillStyle = r.visited || isCurrent ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)';
      ctx.font = `600 12px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.type === 'boss' ? '☠' : '★', px + cell / 2, py + cell / 2 + 0.5);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  }
}
