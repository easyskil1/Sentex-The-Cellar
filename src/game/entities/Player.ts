import type { World } from '../World';
import type { Item } from '../content/items';
import type { Vec2 } from '../../engine/math';
import { normalize } from '../../engine/math';
import { Tear } from './Tear';
import { PLAYER_BASE, ROOM } from '../config';
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

  // Lerakható robbanószerek (Isaac-stílus)
  tnt = 0;
  bombs = 0;

  // Aktív képesség (Isaac „active item")
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
    this.headLean += (mv.x * 4 - this.headLean) * dt * 8;

    world.resolveCircle(this); // kövek/akadályok
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
      this.shoot(dir, world);
      this.lastShotDir = dir;
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
    const behavior = {
      pierce: this.pierce, bounce: this.bounce, homing: this.homing,
      spectral: this.spectral, split: this.split, knockback: this.tearKnock,
      burn: this.burn, poison: this.poison, freeze: this.freeze, shock: this.shock,
    };
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
