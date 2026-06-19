import type { World } from '../World';
import type { Item } from '../content/items';
import type { Vec2 } from '../../engine/math';
import { normalize, clamp } from '../../engine/math';
import { Tear, type TearBehavior } from './Tear';
import { Ring } from './Ring';
import { PLAYER_BASE, ROOM, CHARGE, RING } from '../config';
import { drawPlayer, defaultBodyLook, type BodyLook } from './PlayerRenderer';

/** A játékos figura: mozgás, lövés, szobaváltás, kirajzolás. */
export class Player {
  x = 0;
  y = 0;
  r = PLAYER_BASE.r;
  vx = 0;
  vy = 0;

  // Statisztikák (tárgyak ezeket módosítják)
  speed = PLAYER_BASE.speed;
  accel = PLAYER_BASE.accel;
  friction = PLAYER_BASE.friction;
  dmg = PLAYER_BASE.dmg;
  fireRate = PLAYER_BASE.fireRate;
  shotSpeed = PLAYER_BASE.shotSpeed;
  range = PLAYER_BASE.range;
  doubleShot = false;
  /** Legyező-lövés: +N egyidejű lövedék (perkek növelik; az 1 alaphoz adódik). */
  shots = 0;
  /** A legyező teljes szórás-szöge radiánban. */
  spread = 0;
  /** Lőtáv-szorzó (×; <1 rövidít). */
  rangeMul = 1;
  /** Lövedék-viselkedés flagek (perkekből — lásd Tear.TearBehavior). */
  pierce = false;
  bounce = false;
  homing = false;
  spectral = false;
  split = false;
  /** Lökő lövedék flag — külön néven, mert a `knockback()` metódus már foglalt. */
  tearKnock = false;
  /** Elemi találat-státuszok (perkekből — lásd Tear): gyújtó/mérgező/fagyasztó/sokkoló. */
  burn = false;
  poison = false;
  freeze = false;
  shock = false;
  /** Kísérők (Wave 4): keringő sebző orbok száma + blokkoló légy. */
  orbitals = 0;
  shieldFly = false;
  /**
   * Kénkő-sugár lőmód (#1, relikvia): ha igaz, a sima könny-lövés helyett
   * FOLYAMATOS sugarat ad le (a `World` kezeli a sebzést/rajzot). A `beaming`
   * tranziens (csak abban a frame-ben igaz, amikor épp tüzel), a `beamTickAcc`
   * a sebzés-tick időzítője (a `World.updateBeam` lépteti). Lásd config BEAM.
   */
  beamMode = false;
  beaming = false;
  beamDir: Vec2 = { x: 0, y: 1 };
  beamTickAcc = 0;
  /**
   * Lángkúp lőmód (#4, relikvia): ha igaz, a sima lövés helyett FOLYAMATOS kúp-AoE
   * (lángszóró) megy. A `coning` tranziens (csak abban a frame-ben, amikor tüzel),
   * a `coneTickAcc` a sebzés-, a `coneFloorAcc` az égő-talaj-ütem időzítője. Ha a
   * sugár ÉS a kúp is megvan, a sugár nyer (lásd Player.update). Config FLAME.
   */
  flameMode = false;
  coning = false;
  coneDir: Vec2 = { x: 0, y: 1 };
  coneTickAcc = 0;
  coneFloorAcc = 0;
  /**
   * Felhúzott csapás lőmód (#5, relikvia): ha igaz, a rapid-fire helyett TÖLTÖTT
   * lövés megy - nyomva tartás tölt (`chargeT` nő), elengedés ad le EGY felskálázott
   * könnycseppet (lásd `releaseCharge`). A `charging` tranziens (csak abban a frame-ben
   * igaz, amikor épp húzol fel), HUD-jelzéshez. Config CHARGE.
   */
  chargeMode = false;
  charging = false;
  chargeT = 0;
  chargeDir: Vec2 = { x: 0, y: 1 };
  /**
   * Pecsétgyűrű lőmód (#2, relikvia): ha igaz, a sima lövés helyett utazó
   * sebző-KORONG (`Ring`) indul a célzásirányba (a `World.rings`-be). A `shootRing`
   * adja le, a `fireRate` üteme szerint. Config RING.
   */
  ringMode = false;
  /** Zavar-státusz (a Zavaró ellenfél): amíg >0, a mozgás-irány FORDÍTOTT. */
  confusedT = 0;

  hp = PLAYER_BASE.maxHp;
  maxHp = PLAYER_BASE.maxHp;
  invuln = 0;
  alive = true;
  // Lassítás (Dermesztő ellenfél / fagyos hatás): `slowT` mp-ig `slowMul` szorzó.
  slowT = 0;
  slowMul = 1;
  // Felmászott kullancsok: minden elem egy „rajtad töltött idő" (mp) számláló.
  // A játékoson marad szobák/szintek között is; 120 és 240 mp-nél harap egy fél szívet,
  // majd a 2. harapás után megsemmisül (lásd World.updateAttachedTicks).
  attachedTicks: number[] = [];
  coins = 0;
  /** Szerencse: növeli a tárgy-/pickup-esélyt. */
  luck = 0;
  /** Látótáv 0..1 (1 = teljes szoba látszik; ez alatt a szél besötétül). */
  sight = PLAYER_BASE.sight;

  // Lerakható robbanószerek
  tnt = 0;
  bombs = 0;

  // Aktív képesség (active item)
  activeSkillId: string | null = null;
  skillCharge = 0;

  /** Felvett tárgyak (tabletták) a felvétel sorrendjében — a HUD bal oldalán listázva. */
  collected: Item[] = [];
  /** A felvett tárgyakból számolt halmozott kinézet (a renderer ezt rajzolja). */
  bodyLook: BodyLook = defaultBodyLook();

  private fireCd = 0;
  lastShotDir: Vec2 = { x: 0, y: 1 };
  private walkPhase = 0;
  private headLean = 0;

  /** Teljes statisztika-visszaállítás (új játék). */
  reset(cx: number, cy: number): void {
    Object.assign(this, {
      vx: 0, vy: 0,
      speed: PLAYER_BASE.speed, dmg: PLAYER_BASE.dmg, fireRate: PLAYER_BASE.fireRate,
      shotSpeed: PLAYER_BASE.shotSpeed, range: PLAYER_BASE.range, doubleShot: false,
      shots: 0, spread: 0, rangeMul: 1,
      pierce: false, bounce: false, homing: false, spectral: false, split: false, tearKnock: false,
      burn: false, poison: false, freeze: false, shock: false,
      orbitals: 0, shieldFly: false, confusedT: 0,
      beamMode: false, beaming: false, beamTickAcc: 0,
      flameMode: false, coning: false, coneTickAcc: 0, coneFloorAcc: 0,
      chargeMode: false, charging: false, chargeT: 0,
      ringMode: false,
      hp: PLAYER_BASE.maxHp, maxHp: PLAYER_BASE.maxHp, invuln: 0, alive: true, coins: 0,
      slowT: 0, slowMul: 1, attachedTicks: [],
      luck: 0, sight: PLAYER_BASE.sight, fireCd: 0, lastShotDir: { x: 0, y: 1 },
      tnt: 1, bombs: 2,
      activeSkillId: 'nova', skillCharge: 0,
      collected: [],
    });
    this.refreshLook();
    this.x = cx;
    this.y = cy;
  }

  /** Újraszámolja a halmozott kinézetet a felvett tárgyakból (felvételkor/resetkor). */
  refreshLook(): void {
    const look = defaultBodyLook();
    for (const it of this.collected) it.mutateLook?.(look);
    this.bodyLook = look;
  }

  /** Új szint kezdete: pozíció reset, statisztikák megmaradnak. */
  placeAtCenter(cx: number, cy: number): void {
    this.x = cx;
    this.y = cy;
    this.vx = 0;
    this.vy = 0;
    this.invuln = 1;
  }

  update(dt: number, world: World): void {
    if (!this.alive) return;
    this.beaming = false; // a sugár csak akkor él, ha ebben a frame-ben tüzelünk
    this.coning = false;  // a lángkúp ugyanígy tranziens
    this.charging = false; // a töltés-jelzés is tranziens (HUD)
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    const slow = this.slowT > 0 ? this.slowMul : 1;

    const input = world.input;

    // Zavar: a mozgás-irány FORDÍTOTT (a Zavaró ellenfél hatása)
    this.confusedT = Math.max(0, this.confusedT - dt);
    const raw = input.moveVector();
    // Mozgás (gyorsulás + súrlódás), fagyos hatás esetén lassabb
    const mv = this.confusedT > 0 ? { x: -raw.x, y: -raw.y } : raw;
    this.vx += mv.x * this.accel * slow * dt;
    this.vy += mv.y * this.accel * slow * dt;
    this.vx -= this.vx * this.friction * dt;
    this.vy -= this.vy * this.friction * dt;
    const maxSp = this.speed * slow;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSp) {
      this.vx = (this.vx / sp) * maxSp;
      this.vy = (this.vy / sp) * maxSp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.walkPhase += sp * dt * 0.05;
    // Fej-dőlés: gyorsabb interpoláció (8→14), hogy a vizuális reakció ne késsen.
    this.headLean += (mv.x * 4 - this.headLean) * dt * 14;

    // Kövek/akadályok: a resolveCircle KITOL a falból, de a sebesség marad — ettől
    // fal mellett csúszva mikro-jitter keletkezne (újra-behatol → újra-kitol). A
    // pozíció-deltából kiolvassuk a fal-normált, és a BEFELÉ tartó sebesség-
    // komponenst levesszük (sliding response), a tangenciálisat (csúszás) hagyjuk.
    const preX = this.x, preY = this.y;
    world.resolveCircle(this);
    const pushX = this.x - preX, pushY = this.y - preY;
    if (pushX !== 0 || pushY !== 0) {
      const pl = Math.hypot(pushX, pushY);
      const nx = pushX / pl, ny = pushY / pl;
      const vn = this.vx * nx + this.vy * ny;
      if (vn < 0) { this.vx -= vn * nx; this.vy -= vn * ny; }
    }
    if (this.clampAndDoors(world)) return; // szobaváltás történt

    // Lövésirány: nyilak / jobb stick, vagy egér célzás
    const sv = input.shootVector();
    let sx = sv.x;
    let sy = sv.y;
    if (input.mouse.down && sx === 0 && sy === 0) {
      sx = input.mouse.x - this.x;
      sy = input.mouse.y - this.y;
    }
    if (sx !== 0 || sy !== 0) {
      const dir = normalize(sx, sy);
      if (this.beamMode) {
        // Kénkő-sugár: nincs könny-lövés; jelezzük a World-nek, hogy ad le sugarat.
        this.beaming = true;
        this.beamDir = dir;
      } else if (this.flameMode) {
        // Lángkúp: a sima lövés helyett folyamatos kúp-AoE (a World kezeli).
        this.coning = true;
        this.coneDir = dir;
      } else if (this.chargeMode) {
        // Felhúzott csapás: nyomva tartás tölt; az elengedés (lentebb) ad le.
        this.charging = true;
        this.chargeT = Math.min(CHARGE.maxTime, this.chargeT + dt);
        this.chargeDir = dir;
      } else if (this.ringMode) {
        // Pecsétgyűrű: a sima lövés helyett utazó sebző-korong (a fireRate üteme szerint).
        this.shootRing(dir, world);
      } else {
        this.shoot(dir, world);
      }
      this.lastShotDir = dir;
    } else if (this.chargeMode && this.chargeT > 0) {
      // Felhúzott csapás: elengedéskor a felhúzott lövés leadása.
      this.releaseCharge(world);
    }
  }

  /** Falütközés + ajtón való átlépés. Igazat ad vissza, ha szobaváltás történt. */
  private clampAndDoors(world: World): boolean {
    // labirintus-módban nincs ajtó/szobaváltás — a fal-ütközést a resolveCircle adja
    if (world.isLabyrinth) return false;
    const rc = world.room;
    const r = this.r;
    const left = rc.x;
    const right = rc.x + rc.w;
    const top = rc.y;
    const bottom = rc.y + rc.h;
    const cx = world.cx;
    const cy = world.cy;
    const open = world.isCurrentRoomCleared();
    const D = ROOM.DOOR;

    if (this.x - r < left) {
      if (open && world.hasNeighbor('W') && Math.abs(this.y - cy) < D) {
        if (this.x < left - 20) { world.enterRoom('W'); return true; }
      } else { this.x = left + r; this.vx = 0; }
    }
    if (this.x + r > right) {
      if (open && world.hasNeighbor('E') && Math.abs(this.y - cy) < D) {
        if (this.x > right + 20) { world.enterRoom('E'); return true; }
      } else { this.x = right - r; this.vx = 0; }
    }
    if (this.y - r < top) {
      if (open && world.hasNeighbor('N') && Math.abs(this.x - cx) < D) {
        if (this.y < top - 20) { world.enterRoom('N'); return true; }
      } else { this.y = top + r; this.vy = 0; }
    }
    if (this.y + r > bottom) {
      if (open && world.hasNeighbor('S') && Math.abs(this.x - cx) < D) {
        if (this.y > bottom + 20) { world.enterRoom('S'); return true; }
      } else { this.y = bottom - r; this.vy = 0; }
    }
    return false;
  }

  private shoot(dir: Vec2, world: World): void {
    if (this.fireCd > 0) return;
    this.fireCd = this.fireRate;
    const ss = this.shotSpeed;
    const range = this.range * this.rangeMul;
    const behavior = this.tearBehavior();
    const tearCol = this.bodyLook.tearColor; // tárgy adta könny-szín (undefined → alap kék)
    const tearSquash = this.bodyLook.tearSquashY; // tárgy adta lapítás (undefined → kör)
    const count = Math.max(1, 1 + Math.round(this.shots));
    const baseA = Math.atan2(dir.y, dir.x);
    const spread = this.spread;
    // egy irány kibocsátása (dupla-lövésnél párhuzamos párként)
    const fire = (a: number): void => {
      const dx = Math.cos(a), dy = Math.sin(a);
      const vx = dx * ss + this.vx * 0.3;
      const vy = dy * ss + this.vy * 0.3;
      if (this.doubleShot) {
        const px = -dy * 7, py = dx * 7;
        world.tears.push(new Tear(this.x + dx * 14 + px, this.y + dy * 14 + py, vx, vy, this.dmg, range, behavior, tearCol, tearSquash));
        world.tears.push(new Tear(this.x + dx * 14 - px, this.y + dy * 14 - py, vx, vy, this.dmg, range, behavior, tearCol, tearSquash));
      } else {
        world.tears.push(new Tear(this.x + dx * 14, this.y + dy * 14, vx, vy, this.dmg, range, behavior, tearCol, tearSquash));
      }
    };
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? baseA : baseA - spread / 2 + (spread * i) / (count - 1);
      fire(a);
    }
    world.audio.shoot();

    // ---- Játékérzet (Fázis A): csőtorkolat-villanás + visszarúgás + kamera-kick ----
    // Tisztán élmény-réteg, kapcsolható (Beállítások · Grafika). A `dt`-t NEM
    // érinti, így nincs teljesítmény-kockázat (szemben a hit-stoppal).
    if (world.gameFeel) {
      const mx = this.x + dir.x * 16, my = this.y + dir.y * 16;
      world.particles.spawn(mx, my, tearCol ?? '#ffe9b0', 4, 90, 0.16); // #67 villanás
      this.vx -= dir.x * 26;                  // #66 enyhe visszarúgás
      this.vy -= dir.y * 26;
      world.addKick(-dir.x, -dir.y, 1.8);     // #70 kamera-kick (a lövés ellen)
      world.setCamLook(dir.x, dir.y);         // #70 kamera-LERP (a lövésirányba simul)
    }
  }

  /** A jelenlegi flagekből összeállított könny-viselkedés (shoot + töltött lövés közös). */
  private tearBehavior(): TearBehavior {
    return {
      pierce: this.pierce, bounce: this.bounce, homing: this.homing,
      spectral: this.spectral, split: this.split, knockback: this.tearKnock,
      burn: this.burn, poison: this.poison, freeze: this.freeze, shock: this.shock,
    };
  }

  /** Töltöttség 0..1 (HUD + lövés-skálázás). */
  chargeFraction(): number {
    return clamp(this.chargeT / CHARGE.maxTime, 0, 1);
  }

  /**
   * A jelenlegi töltöttséghez tartozó sebzés-szorzó. Anti-OP: a full-szorzó
   * NET-DPS-PARITÁSRA van állítva (a töltés-idő + a rákövetkező fireCd ELLEN a
   * sima lövés DPS-ével), `dpsMul` enyhe burst-prémiummal. Így a koncentrált
   * egy-lövéses sebzés az előny, nem a net-DPS.
   */
  private chargeMul(): number {
    const fr = Math.max(0.001, this.fireRate);
    const maxMul = CHARGE.dpsMul * (CHARGE.maxTime + fr) / fr;
    return 1 + (maxMul - 1) * this.chargeFraction();
  }

  /** A MOST leadható töltött lövés sebzése (HUD-előnézethez is). */
  chargedDamage(): number {
    return this.dmg * this.chargeMul();
  }

  /** Felhúzott csapás: az elengedéskor leadott, töltöttség-arányos lövés. */
  private releaseCharge(world: World): void {
    const t = this.chargeT;
    const f = this.chargeFraction();
    const mul = this.chargeMul();
    this.chargeT = 0;
    if (t < CHARGE.minTime || this.fireCd > 0) return; // túl rövid / még töltődik a ráta
    this.fireCd = this.fireRate; // a tap-spam ellen (a sima lövéssel közös ráta)
    const dir = this.chargeDir;
    const dx = dir.x, dy = dir.y;
    const ss = this.shotSpeed * CHARGE.speedMul;
    const range = this.range * this.rangeMul;
    const vx = dx * ss + this.vx * 0.3;
    const vy = dy * ss + this.vy * 0.3;
    const tearCol = this.bodyLook.tearColor;
    const tearSquash = this.bodyLook.tearSquashY;
    // a töltött lövés EGY koncentrált, nagyobb test-sugarú csepp (nincs legyező/dupla)
    const tear = new Tear(this.x + dx * 14, this.y + dy * 14, vx, vy, this.dmg * mul, range, this.tearBehavior(), tearCol, tearSquash);
    tear.r *= 1 + (CHARGE.sizeMul - 1) * f; // töltöttség-arányos méret (vizuál + hitbox)
    world.tears.push(tear);
    world.audio.shoot();

    // Játékérzet: a torkolat-villanás/visszarúgás/kick töltöttség szerint erősödik.
    if (world.gameFeel) {
      const mx = this.x + dx * 16, my = this.y + dy * 16;
      world.particles.spawn(mx, my, tearCol ?? '#ffe9b0', 5 + Math.round(9 * f), 130, 0.22);
      this.vx -= dx * (26 + 46 * f);
      this.vy -= dy * (26 + 46 * f);
      world.addKick(-dx, -dy, 1.8 + 2.8 * f);
      world.setCamLook(dx, dy);
    }
  }

  /** Pecsétgyűrű (#2): utazó sebző-korong leadása a célzásirányba (a fireRate üteme szerint). */
  private shootRing(dir: Vec2, world: World): void {
    if (this.fireCd > 0) return;
    this.fireCd = this.fireRate;
    const dx = dir.x, dy = dir.y;
    const ss = this.shotSpeed * RING.speedMul;
    const life = this.range * this.rangeMul; // a hatótáv mint élettartam (mint a könnynél)
    const vx = dx * ss + this.vx * 0.3;
    const vy = dy * ss + this.vy * 0.3;
    // a korong a játékos elé indul; öröklődő elemi flagek (burn/poison/freeze)
    world.rings.push(new Ring(
      this.x + dx * 18, this.y + dy * 18, vx, vy, this.dmg, life,
      { burn: this.burn, poison: this.poison, freeze: this.freeze },
      this.bodyLook.tearColor ?? RING.core,
    ));
    world.audio.shoot();

    // Játékérzet: torkolat-villanás + visszarúgás + kamera-kick (mint a sima lövésnél).
    if (world.gameFeel) {
      const mx = this.x + dx * 16, my = this.y + dy * 16;
      world.particles.spawn(mx, my, RING.glow, 4, 90, 0.16);
      this.vx -= dx * 26;
      this.vy -= dy * 26;
      world.addKick(-dx, -dy, 1.8);
      world.setCamLook(dx, dy);
    }
  }

  /** Irányítás-zavar bekapcsolása (a Zavaró ellenfél hívja). */
  applyConfuse(dur: number): void {
    this.confusedT = Math.max(this.confusedT, dur);
  }

  /** Fagyos lassítás bekapcsolása (a Dermesztő ellenfél / fagy-hatás hívja). */
  applySlow(mul: number, dur: number): void {
    this.slowMul = mul;
    this.slowT = Math.max(this.slowT, dur);
  }

  /** Lökés a sérülés irányából (a World hívja). */
  knockback(fromX: number, fromY: number, force: number): void {
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.vx += Math.cos(a) * force;
    this.vy += Math.sin(a) * force;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPlayer(ctx, {
      x: this.x,
      y: this.y,
      r: this.r,
      dirX: this.lastShotDir.x,
      dirY: this.lastShotDir.y,
      walk: this.walkPhase,
      lean: this.headLean,
      invuln: this.invuln,
      moving: Math.hypot(this.vx, this.vy) > 20,
      look: this.bodyLook,
    });
  }
}
