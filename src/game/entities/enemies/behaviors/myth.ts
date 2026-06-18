import type { Enemy } from '../Enemy';
import type { World } from '../../../World';
import { TAU, rand, clamp } from '../../../../engine/math';
import { HP } from '../../../config';

/**
 * Wave 6 — mitológiai szörnyek + a robbanó/csapó közelharcosok viselkedése.
 * A közös fizikát/státuszt/ütközést az `Enemy.update` végzi. `a` = szög a
 * játékos felé, `d` = távolság.
 */

/** Kamikaze: ráront, és közel érve felrobban (a robbanás sebzi a játékost). */
export function kamikaze(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.active = true;
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  if (d < e.r + world.player.r + 6) {
    world.damagePlayer(e.dmg * HP.half);
    world.addShake(8);
    world.particles.spawn(e.x, e.y, '#ff8a3a', 22, 280, 0.6);
    world.killEnemy(e);
  }
}

/** Földcsapó: közelít, és időnként a földre csap → körkörös golyó-gyűrű. */
export function slammer(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 200 ? -0.3 : 0.5;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(2.4, 3.4);
    e.active = true;
    const n = 12;
    for (let k = 0; k < n; k++) {
      const an = (k / n) * TAU;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, r: 6, life: 2.5, style: 'stone' });
    }
    world.addShake(5);
    world.audio.enemyShoot();
  }
}

/** Minotaurusz: telegrafál, majd hosszan ráront, és a roham végén földet renget (taszít). */
export function minotaur(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'idle') {
    e.x += Math.cos(a) * e.speed * 0.45 * dt;
    e.y += Math.sin(a) * e.speed * 0.45 * dt;
    if (e.chargeT <= 0 && d < 460) {
      e.chargeState = 'wind'; e.chargeT = 0.7;
      e.cvx = Math.cos(a); e.cvy = Math.sin(a); // a roham iránya rögzül (kitérhetsz)
    }
  } else if (e.chargeState === 'wind') {
    e.active = true; // dühös dobogás
    if (e.chargeT <= 0) { e.chargeState = 'dash'; e.chargeT = 0.7; world.audio.enemyShoot(); }
  } else {
    e.x += e.cvx * 520 * dt;
    e.y += e.cvy * 520 * dt;
    if (e.chargeT <= 0) {
      e.chargeState = 'idle'; e.chargeT = rand(1.4, 2.4);
      world.addShake(9); // becsapódás → földrengés
      if (d < 150) world.player.knockback(e.x, e.y, 380);
      world.particles.spawn(e.x, e.y + e.r * 0.6, '#caa078', 16, 220, 0.5);
    }
  }
}

/** Múmia: lassan vánszorog, lassú átok-pólyát lök; halálkor szétesik (lásd World.killEnemy). */
export function mummy(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  if (d < 160) world.player.applySlow(0.7, 0.2); // közeli átok: enyhén lassít
  e.shootCd -= dt;
  if (d < 320 && e.shootCd <= 0) {
    e.shootCd = rand(2.2, 3.2);
    e.active = true;
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 175, vy: Math.sin(a) * 175, r: 8, life: 3, slime: true });
    world.audio.enemyShoot();
  }
}

/** Skarabeusz: random szárny-nyitás (nyitva ELNYELI a lövedéket), gömbölyödve gurul a játékosra. */
export function scarab(e: Enemy, dt: number, world: World, a: number): void {
  e.actCd -= dt;
  if (e.actCd <= 0) {
    const opening = e.blockT <= 0; // zárt → nyit; nyitott → zár
    e.blockT = opening ? rand(0.7, 1.7) : 0;
    e.actCd = opening ? e.blockT : rand(1.4, 2.8);
    if (opening) world.particles.spawn(e.x, e.y, '#cfe7ff', 7, 110, 0.4);
  }
  const open = e.blockT > 0;
  e.active = open; // a rajzoló ebből rajzolja a felnyitott szárnyfedőt
  const sp = open ? e.speed * 0.4 : e.speed;
  const wig = Math.sin(e.wob * 6) * 0.3;
  e.x += Math.cos(a + wig) * sp * dt;
  e.y += Math.sin(a + wig) * sp * dt;
  e.face = a + wig;
}

/** Vámpír: vér-aura (DoT a körében), lassú közelítés + gyors denevér-csapások. */
export function vampire(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.actCd -= dt;
  if (d < e.r * 13 && e.actCd <= 0) {
    e.actCd = 0.2;
    world.damagePlayer(50, 'acid', false, true); // DoT: i-frame nélkül
    world.particles.spawn(world.player.x, world.player.y, '#d23a5a', 6, 120, 0.3);
  }
  e.chargeT -= dt;
  if (e.chargeState === 'dash') {
    e.active = true;
    e.x += Math.cos(a) * e.speed * 2.1 * dt;
    e.y += Math.sin(a) * e.speed * 2.1 * dt;
    if (e.chargeT <= 0) { e.chargeState = 'idle'; e.chargeT = rand(1.6, 2.6); }
  } else {
    e.x += Math.cos(a) * e.speed * 0.7 * dt;
    e.y += Math.sin(a) * e.speed * 0.7 * dt;
    if (e.chargeT <= 0 && d < 300) {
      e.chargeState = 'dash'; e.chargeT = 0.5;
      world.particles.spawn(e.x, e.y, '#7a2a3a', 8, 130, 0.4);
    }
  }
}

/** Óriásdenevér: kaotikusan cikázik a játékos felé, időnként körkörös hangrobbanást lő. */
export function bat(e: Enemy, dt: number, world: World, a: number): void {
  const wig = Math.sin(e.wob * 4) * 1.1 + Math.sin(e.wob * 7.3) * 0.5;
  e.x += Math.cos(a + wig) * e.speed * dt;
  e.y += Math.sin(a + wig) * e.speed * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(2.4, 3.6);
    e.active = true;
    const n = 8;
    for (let k = 0; k < n; k++) {
      const an = (k / n) * TAU + e.wob;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 150, vy: Math.sin(an) * 150, r: 5, life: 2, style: 'sonic' });
    }
    world.audio.enemyShoot();
  }
}

/** Pióca: lassan kúszik; közelről rátapad — lassít, és a kontaktból életet szív (lásd Enemy.lifesteal). */
export function leech(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  if (d < e.r + world.player.r + 18) {
    e.active = true;
    world.player.applySlow(0.72, 0.15); // tapadás: enyhe lassítás
  }
}

/** Kígyó: gyorsan, cikkcakkban csúszik; közelről mérgező harapást lő. */
export function serpent(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const wig = Math.sin(e.wob * 5) * 0.7;
  e.x += Math.cos(a + wig) * e.speed * dt;
  e.y += Math.sin(a + wig) * e.speed * dt;
  e.face = a + wig;
  e.shootCd -= dt;
  if (d < 190 && e.shootCd <= 0) {
    e.shootCd = rand(1.2, 2.0);
    e.active = true;
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, r: 6, life: 1.2, poison: true });
    world.audio.enemyShoot();
  }
}

/** Medúza: a tekintetével MEGKÖVÍTI (erős, rövid dermesztés) a közeli játékost, és kő-lövedéket lő. */
export function medusa(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 200 ? -0.3 : d > 360 ? 0.5 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  if (d < 250) { // megkövítő tekintet
    e.active = true;
    world.player.applySlow(0.2, 0.3);
    if (Math.random() < 0.22) {
      world.particles.spawn(world.player.x + rand(-14, 14), world.player.y + rand(-14, 14), '#bfe8cf', 1, 30, 0.6);
    }
  }
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = rand(1.6, 2.4);
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 215, vy: Math.sin(a) * 215, r: 7, life: 3, style: 'stone' });
    world.audio.enemyShoot();
  }
}

/** Csontváz: távolságot tartva csontnyilat lő; halálkor egyszer feltámad (lásd Enemy.tryRevive). */
export function skeleton(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 200 ? -0.5 : d > 340 ? 0.6 : 0.1;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = rand(1.4, 2.2);
    e.active = true;
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 6, life: 2.5, style: 'bone' });
    world.audio.enemyShoot();
  }
}

/** Lidérc: átúszik a köveken, és a hideg aurájával lassítja + sebzi a közeli játékost. */
export function wraith(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  if (d < 130) {
    e.active = true;
    world.player.applySlow(0.55, 0.2);
    e.actCd -= dt;
    if (e.actCd <= 0) {
      e.actCd = 0.6;
      world.damagePlayer(HP.half, 'zap');
      world.particles.spawn(world.player.x, world.player.y, '#aac6e0', 4, 90, 0.4);
    }
  }
}

/** Vízköpő: kőként vár (sebezhetetlen), életre kel és ráront, majd visszadermed. */
export function gargoyle(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.chargeT -= dt;
  if (e.petrified) {
    if (e.chargeT <= 0 || d < 175) { // a játékos közeledtére / idő múltán életre kel
      e.petrified = false;
      e.chargeT = rand(3, 4.5);
      e.active = true;
      world.particles.spawn(e.x, e.y, '#9a9a8a', 14, 150, 0.5);
      world.audio.enemyShoot();
    }
  } else {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    if (e.chargeT <= 0) {
      e.petrified = true;
      e.chargeT = rand(2.5, 4);
      world.particles.spawn(e.x, e.y, '#9a9a8a', 10, 120, 0.4);
    }
  }
}

/** Hárpia: a játékos körül köröz, majd lecsap és egy erős szél-lökéssel eltaszítja. */
export function harpy(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'dash') {
    e.active = true;
    e.x += e.cvx * dt;
    e.y += e.cvy * dt;
    if (d < e.r + world.player.r + 22) { // becsapódás → eltaszítás, majd visszavonul
      world.player.knockback(e.x, e.y, 430);
      world.addShake(4);
      e.chargeState = 'idle'; e.chargeT = rand(1.6, 2.6);
    } else if (e.chargeT <= 0) {
      e.chargeState = 'idle'; e.chargeT = rand(1.6, 2.6);
    }
  } else {
    const orbit = a + (Math.PI / 2) * Math.sin(e.wob * 0.8);
    e.x += Math.cos(orbit) * e.speed * 0.5 * dt;
    e.y += Math.sin(orbit) * e.speed * 0.5 * dt;
    if (e.chargeT <= 0) {
      e.chargeState = 'dash'; e.chargeT = 0.55;
      e.cvx = Math.cos(a) * 470; e.cvy = Math.sin(a) * 470;
    }
  }
}

/** Küklopsz: lassú óriás; nagy sziklát vet a játékos helyére (telegrafált becsapódó zóna). */
export function cyclops(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 240 ? -0.3 : d > 440 ? 0.4 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(2.6, 3.8);
    e.active = true;
    const p = world.player;
    const tx = p.x + rand(-30, 30), ty = p.y + rand(-30, 30);
    world.particles.spawn(tx, ty, '#b07a5a', 10, 80, 0.7); // becsapódás-előjelző
    const arm = 0.7; // telegraf → ki lehet lépni, mielőtt sebez; AoE-sugár 84
    world.addHazard('fire', tx, ty, 84, arm + rand(0.8, 1.3), arm);
    world.addShake(6);
    world.audio.bombDrop();
  }
}

/** Gólem: nagyon lassú, szívós; a földre csap → terjedő lökéshullám-gyűrű (golyók). */
export function golem(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  e.actCd -= dt;
  if (d < 280 && e.actCd <= 0) {
    e.actCd = rand(3, 4.2);
    e.active = true;
    const n = 14;
    for (let k = 0; k < n; k++) {
      const an = (k / n) * TAU;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 170, vy: Math.sin(an) * 170, r: 7, life: 2.6, style: 'stone' });
    }
    world.addShake(8);
    world.audio.enemyShoot();
  }
}

/** Skorpió: gyorsan közelít, és ívben mérget lő a fullánkjából. */
export function scorpion(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 150 ? -0.3 : 0.7;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (d < 300 && e.shootCd <= 0) {
    e.shootCd = rand(1.8, 2.6);
    e.active = true;
    for (let k = -1; k <= 1; k++) {
      const an = a + k * 0.2;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 240, vy: Math.sin(an) * 240, r: 6, life: 1.6, poison: true });
    }
    world.audio.enemyShoot();
  }
}

/** Lidércfény: gyorsan cikázik, és sűrűn égő nyomot hagy maga után. */
export function wisp(e: Enemy, dt: number, world: World, a: number): void {
  const wig = Math.sin(e.wob * 8) * 0.8;
  e.x += Math.cos(a + wig) * e.speed * dt;
  e.y += Math.sin(a + wig) * e.speed * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = 0.18;
    e.active = true;
    world.addHazard('fire', e.x, e.y, 16, rand(0.5, 1.0));
    if (Math.random() < 0.4) world.particles.spawn(e.x, e.y, '#ffb84a', 2, 60, 0.4);
  }
}

/** Banshee: távot tart, és időnként SIKOLLYAL eltaszítja ÉS megzavarja a játékost. */
export function banshee(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 220 ? -0.4 : d > 360 ? 0.4 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (d < 340 && e.actCd <= 0) {
    e.actCd = rand(2.8, 4);
    e.active = true;
    world.player.applyConfuse(1.6);
    world.player.knockback(e.x, e.y, 300);
    world.addShake(4);
    world.particles.spawn(e.x, e.y, '#cfe0ec', 14, 200, 0.5);
    world.audio.enemyShoot();
  }
}

/** Ördögfióka: a játékos közelébe teleportál, és tűzgolyót dob; fürge, kaján. */
export function imp(e: Enemy, dt: number, world: World, a: number): void {
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(3.5, 4.5); // ritkábban teleportál → marad idő meglőni
    e.hideT = 0.35;
    world.particles.spawn(e.x, e.y, '#ff6a3a', 12, 150, 0.5);
    const rc = world.room, p = world.player;
    const ang = rand(0, TAU), rad = rand(140, 240);
    e.x = clamp(p.x + Math.cos(ang) * rad, rc.x + e.r, rc.x + rc.w - e.r);
    e.y = clamp(p.y + Math.sin(ang) * rad, rc.y + e.r, rc.y + rc.h - e.r);
  }
  if (e.hideT <= 0) {
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      e.shootCd = rand(1.0, 1.6);
      e.active = true;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 7, life: 2.5, style: 'fire' });
      world.audio.enemyShoot();
    }
  }
}

/** Hidra: legyezőben lő — minél kevesebb a HP-ja, annál több fejjel (több lövedék). */
export function hydra(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 240 ? -0.3 : d > 400 ? 0.4 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = rand(1.8, 2.6);
    e.active = true;
    const heads = 3 + Math.round((1 - e.hp / e.maxHp) * 2); // 3 → 5 fej sérülten
    const spread = 0.55;
    for (let k = 0; k < heads; k++) {
      const an = a - spread + (heads > 1 ? (spread * 2 * k) / (heads - 1) : 0);
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 230, vy: Math.sin(an) * 230, r: 6, life: 2.6, poison: true });
    }
    world.audio.enemyShoot();
  }
}

/** Vérfarkas: üvöltésre önmagát felgyorsítja, majd a játékosra ugrik. */
export function werewolf(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'dash') {
    e.active = true;
    e.x += e.cvx * dt;
    e.y += e.cvy * dt;
    if (e.chargeT <= 0) { e.chargeState = 'idle'; e.chargeT = rand(1.2, 2); }
  } else if (e.chargeState === 'wind') {
    e.active = true; // üvöltő feszülés
    if (e.chargeT <= 0) {
      e.chargeState = 'dash'; e.chargeT = 0.4;
      const reach = Math.min(d, 300);
      e.cvx = (Math.cos(a) * reach) / 0.4;
      e.cvy = (Math.sin(a) * reach) / 0.4;
      e.applyHaste(2); // az üvöltés felgyorsítja
      world.particles.spawn(e.x, e.y, '#8a7a6a', 10, 140, 0.5);
    }
  } else {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    if (e.chargeT <= 0 && d < 360) { e.chargeState = 'wind'; e.chargeT = 0.5; }
  }
}
