import type { Enemy } from '../Enemy';
import type { World } from '../../../World';
import { TAU, rand, clamp } from '../../../../engine/math';

/**
 * Különleges / kontroll viselkedések: tócsanyom, lassítás, teleport, zavarás,
 * behúzás, felbukkanás, rákapaszkodás. A közös fizikát/státuszt/ütközést az
 * `Enemy.update` végzi. `a` = szög a játékos felé, `d` = távolság.
 */

/** Mételyező: lassan kúszik, összefüggő mérgező tócsanyomot hagy, közelről mérget köp. */
export function rotling(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;

  // folytonos nyom: sűrűn, egymást átfedve csöpög; hosszú életű tócsák
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = 0.22;
    world.addHazard('poison', e.x, e.y + e.r * 0.4, e.r * 1.7, rand(9, 13));
    if (Math.random() < 0.35) world.particles.spawn(e.x, e.y + e.r * 0.4, '#8fbf4a', 3, 70, 0.5);
    e.active = true;
  }

  // közelről mérget köp a játékos felé — a köpés becsapódáskor tócsát hagy
  if (d < 200) {
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      e.shootCd = rand(1.1, 1.7);
      e.active = true;
      const sp = 200;
      world.ebullets.push({
        x: e.x, y: e.y - e.r * 0.2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 7, life: Math.min(1.0, d / sp + 0.12), poison: true,
      });
      world.particles.spawn(e.x, e.y - e.r * 0.2, '#bfff6a', 6, 150, 0.4);
      world.audio.enemyShoot();
    }
  } else if (e.shootCd < 0.4) {
    e.shootCd = 0.4; // ne köpjön azonnal, amint újra közel ér
  }
}

/** Dermesztő: egészen közel megy (nem sebez), és lefagyasztja a játékos mozgását. */
export function chiller(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 34 ? 0 : 1; // odamegy egészen közel, majd ott lebeg
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  if (d < 160) {
    e.active = true;
    world.player.applySlow(0.42, 0.2);
    if (Math.random() < 0.3) {
      world.particles.spawn(world.player.x + rand(-14, 14), world.player.y + rand(-14, 14), '#cdeefa', 1, 40, 0.6);
    }
  }
}

/** Kullancs: egy helyben ül; ha a játékos elég közel ér, felmászik rá (a World leveszi). */
export function tick(e: Enemy, _dt: number, world: World): void {
  if (e.tickAttached) return;
  const p = world.player;
  const rr = e.r + p.r + 10;
  if (p.alive && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) {
    e.tickAttached = true;
  }
}

/** Gilista: a föld alatt mozog (sebezhetetlen), majd a játékos mellett bukkan fel. */
export function worm(e: Enemy, dt: number, world: World, a: number): void {
  e.actCd -= dt;
  if (e.buried) {
    if (e.actCd <= 0) {
      const rc = world.room, p = world.player;
      e.x = clamp(p.x + rand(-60, 60), rc.x + e.r, rc.x + rc.w - e.r);
      e.y = clamp(p.y + rand(-60, 60), rc.y + e.r, rc.y + rc.h - e.r);
      e.buried = false;
      e.actCd = rand(1.2, 2.0);
      e.active = true;
      world.particles.spawn(e.x, e.y, '#8a5a3a', 12, 140, 0.5);
    }
  } else {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    if (e.actCd <= 0) {
      e.buried = true;
      e.actCd = rand(1.5, 2.6);
      world.particles.spawn(e.x, e.y, '#8a5a3a', 10, 120, 0.5);
    }
  }
}

/** Villanó: eltűnik, a játékos közelében újra megjelenik, majd lő. */
export function blinker(e: Enemy, dt: number, world: World, a: number): void {
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(1.6, 2.6);
    e.hideT = 0.4;
    world.particles.spawn(e.x, e.y, '#b08aff', 12, 160, 0.5);
    const rc = world.room, p = world.player;
    const ang = rand(0, TAU), rad = rand(120, 220);
    e.x = clamp(p.x + Math.cos(ang) * rad, rc.x + e.r, rc.x + rc.w - e.r);
    e.y = clamp(p.y + Math.sin(ang) * rad, rc.y + e.r, rc.y + rc.h - e.r);
  }
  if (e.hideT <= 0) {
    e.shootCd -= dt;
    if (e.shootCd <= 0) {
      e.shootCd = rand(0.8, 1.4);
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 6, life: 2.5, style: 'arcane' });
      world.audio.enemyShoot();
    }
  }
}

/** Zavaró: lassan közelít, és a közelében MINDEN irányítást megfordít. */
export function confuser(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * 0.6 * dt;
  e.y += Math.sin(a) * e.speed * 0.6 * dt;
  if (d < 170) {
    e.active = true;
    world.player.applyConfuse(1.5);
    if (Math.random() < 0.3) world.particles.spawn(world.player.x + rand(-16, 16), world.player.y + rand(-16, 16), '#d86aff', 1, 40, 0.6);
  }
}

/** Húzó: lebeg, és a hatósugarában maga felé húzza a játékost. */
export function puller(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * 0.3 * dt;
  e.y += Math.sin(a) * e.speed * 0.3 * dt;
  if (d < 360 && d > 1) {
    e.active = true;
    const p = world.player;
    const nx = (e.x - p.x) / d, ny = (e.y - p.y) / d;
    const strength = 1 - d / 360; // közelség: 0 a peremen → 1 közel
    const pull = 500 + 600 * strength; // sebesség-szívás (escapable)
    p.vx += nx * pull * dt;
    p.vy += ny * pull * dt;
    const drag = (15 + 55 * strength) * dt; // enyhe közvetlen behúzás (nem fojt)
    p.x += nx * drag;
    p.y += ny * drag;
  }
}
