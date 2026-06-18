import type { Enemy } from '../Enemy';
import type { World } from '../../../World';
import { rand, clamp } from '../../../../engine/math';
import { HP } from '../../../config';

/**
 * Távharci viselkedések: lövedék / talaj-veszély kibocsátása távolból. A közös
 * fizikát/státuszt/ütközést az `Enemy.update` végzi. `a` = szög a játékos felé,
 * `d` = távolság.
 */

/** Gázzsák: lassan kúszik, és időnként lassító gáz-lövedéket lő. */
export function gasbag(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += Math.cos(a) * e.speed * dt;
  e.y += Math.sin(a) * e.speed * dt;
  e.actCd -= dt;
  if (d < 380 && e.actCd <= 0) {
    e.actCd = rand(2.2, 3.4);
    e.active = true;
    const sp = 300; // x2 sebesség
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, life: 2.6, style: 'gas', slow: true });
    world.audio.enemyShoot();
  }
}

/** Lövő: távolságot tart és energia-lövedéket lő. */
export function shooter(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 220 ? -1 : d > 300 ? 1 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = rand(1.4, 2.4);
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, life: 4, style: 'energy' });
    world.audio.enemyShoot();
  }
}

/** Köpködő: gyorsan üldöz, és közelről gyors savsorozatot lő. */
export function spitter(e: Enemy, dt: number, world: World, a: number, d: number): void {
  if (d > 230) {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
  } else {
    e.shootCd -= dt;
    e.active = true;
    if (e.shootCd <= 0) {
      e.shootCd = 0.28;
      const sp = a + rand(-0.08, 0.08);
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(sp) * 300, vy: Math.sin(sp) * 300, r: 6, life: 3, slime: true });
      world.audio.enemyShoot();
    }
  }
}

/** Lézervető: megcéloz (telegrafál), majd átsöprő energiasugarat lő. */
export function lancer(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const rc = world.room;
  e.laserT -= dt;
  if (e.laserState === 'idle') {
    const want = d < 240 ? -0.6 : d > 360 ? 0.8 : 0;
    e.x += Math.cos(a) * e.speed * want * dt;
    e.y += Math.sin(a) * e.speed * want * dt;
    if (e.laserT <= 0) { e.laserState = 'aim'; e.laserT = 0.85; e.laserAng = a; }
  } else if (e.laserState === 'aim') {
    e.laserAng += clamp(a - e.laserAng, -1.2 * dt, 1.2 * dt);
    e.laserLen = world.rayObstacleDistance(e.x, e.y, e.laserAng, rayToWall(e, e.laserAng, rc));
    if (e.laserT <= 0) { e.laserState = 'fire'; e.laserT = 0.45; world.audio.enemyShoot(); world.addShake(4); }
  } else {
    e.laserLen = world.rayObstacleDistance(e.x, e.y, e.laserAng, rayToWall(e, e.laserAng, rc));
    damageAlongLaser(e, world);
    if (e.laserT <= 0) { e.laserState = 'idle'; e.laserT = rand(2, 3.4); }
  }
}

/** A sugár hossza a szoba faláig az adott szögben (lézervető segéd). */
function rayToWall(e: Enemy, ang: number, rc: { x: number; y: number; w: number; h: number }): number {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let len = Math.hypot(rc.w, rc.h);
  if (dx > 1e-4) len = Math.min(len, (rc.x + rc.w - e.x) / dx);
  if (dx < -1e-4) len = Math.min(len, (rc.x - e.x) / dx);
  if (dy > 1e-4) len = Math.min(len, (rc.y + rc.h - e.y) / dy);
  if (dy < -1e-4) len = Math.min(len, (rc.y - e.y) / dy);
  return Math.max(0, len);
}

/** A kilőtt lézersugár sebzi a vonalban álló játékost (lézervető segéd). */
function damageAlongLaser(e: Enemy, world: World): void {
  const p = world.player;
  if (!p.alive) return;
  const dx = Math.cos(e.laserAng), dy = Math.sin(e.laserAng);
  const rx = p.x - e.x, ry = p.y - e.y;
  const proj = rx * dx + ry * dy; // vetület a sugár mentén
  if (proj < 0 || proj > e.laserLen) return;
  const perp = Math.abs(rx * -dy + ry * dx); // merőleges távolság a sugártól
  if (perp < p.r + 7) {
    world.damagePlayer(e.dmg * HP.half, 'zap');
    world.particles.spawn(p.x, p.y, '#ff7be0', 4, 120, 0.3);
  }
}

/** Tűzokádó: közel rohan, és lángcsóvát okád (okádás közben is nyomul). */
export function pyro(e: Enemy, dt: number, world: World, a: number, d: number): void {
  if (d > 150) {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
  } else {
    e.breathing = true;
    const standoff = world.player.r + e.r + 20;
    if (d > standoff) {
      e.x += Math.cos(a) * e.speed * 0.45 * dt;
      e.y += Math.sin(a) * e.speed * 0.45 * dt;
    }
    e.actCd -= dt;
    if (e.actCd <= 0) {
      e.actCd = 0.06;
      const spread = a + rand(-0.38, 0.38);
      const reach = rand(28, Math.min(d + 34, 160));
      const fx = e.x + Math.cos(spread) * reach;
      const fy = e.y + Math.sin(spread) * reach;
      world.addHazard('fire', fx, fy, 22, rand(0.7, 1.3));
      world.particles.spawn(fx, fy, Math.random() < 0.5 ? '#ffb13a' : '#ff5a1e', 2, 110, 0.4);
    }
  }
}

/** Aknász: távolságot tart, felváltva maga elé rak / a játékos felé dob ketyegő aknát. */
export function bombardier(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 220 ? -1 : d > 320 ? 0.6 : 0.2;
  e.x += (Math.cos(a) * want + Math.cos(a + Math.PI / 2) * Math.sin(e.wob) * 0.5) * e.speed * dt;
  e.y += (Math.sin(a) * want + Math.sin(a + Math.PI / 2) * Math.sin(e.wob) * 0.5) * e.speed * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(1.8, 2.6);
    e.active = true;
    if (e.bombToss) {
      const reach = Math.min(d, 280);
      const tx = e.x + Math.cos(a) * reach + rand(-28, 28);
      const ty = e.y + Math.sin(a) * reach + rand(-28, 28);
      world.addHazard('mine', tx, ty, 72, 1.7);
      for (let k = 1; k <= 6; k++) { // röpke dobás-csík a célig
        const f = k / 6;
        world.particles.spawn(e.x + (tx - e.x) * f, e.y + (ty - e.y) * f, '#c8b48a', 1, 60, 0.25);
      }
    } else {
      world.addHazard('mine', e.x, e.y + e.r * 0.3, 72, 1.7);
    }
    world.audio.bombDrop();
    e.bombToss = !e.bombToss;
  }
}

/** Mesterlövész: távolságot tart, telegrafál, majd gyors, erős lövedéket lő. */
export function sniper(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 300 ? -0.6 : d > 440 ? 0.5 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd < 0.55) e.active = true; // telegraf a lövés előtt
  if (e.shootCd <= 0) {
    e.shootCd = rand(2.2, 3.4);
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 800, vy: Math.sin(a) * 800, r: 9, life: 2.5, style: 'heavy' });
    world.audio.enemyShoot();
  }
}

/** Mozsár: hátul áll, és a játékos helyére becsapódó, telegrafált tűz-AoE-t lő. */
export function mortar(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 260 ? -0.5 : d > 460 ? 0.4 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(2.2, 3.2);
    e.active = true;
    const p = world.player;
    const tx = p.x + rand(-22, 22), ty = p.y + rand(-22, 22);
    world.particles.spawn(tx, ty, '#ff9a3a', 8, 70, 0.6); // becsapódás-jelző
    const arm = 0.55; // telegraf: a tűz előbb csak látszik, így kikerülhető
    world.addHazard('fire', tx, ty, 30, arm + rand(1.0, 1.7), arm);
    world.audio.bombDrop();
  }
}

/** Sörétes: 5 ágú legyezőt lő szünetekkel. */
export function shotgunner(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 240 ? -0.4 : d > 380 ? 0.5 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = rand(1.6, 2.4);
    e.active = true;
    for (let k = -2; k <= 2; k++) {
      const an = a + k * 0.16;
      world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 280, vy: Math.sin(an) * 280, r: 6, life: 2.5, style: 'pellet' });
    }
    world.audio.enemyShoot();
  }
}

/** Gyorslövő: gyors sorozatban pötyög a játékosra. */
export function gunner(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 220 ? -0.5 : d > 360 ? 0.5 : 0;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = 0.22;
    e.active = true;
    const an = a + rand(-0.08, 0.08);
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 320, vy: Math.sin(an) * 320, r: 5, life: 2.2, style: 'energy' });
    world.audio.enemyShoot();
  }
}

/** Torony: nem mozog, lassan forgó golyó-spirált lő. */
export function turret(e: Enemy, dt: number, world: World): void {
  e.shootCd -= dt;
  if (e.shootCd <= 0) {
    e.shootCd = 0.16;
    e.active = true;
    const an = e.wob * 2;
    world.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(an) * 180, vy: Math.sin(an) * 180, r: 6, life: 3, style: 'arcane' });
    world.audio.enemyShoot();
  }
}

/** Bombázó: hullámzón átrepül, és időnként a játékos felé ketyegő aknát dob. */
export function bombthrower(e: Enemy, dt: number, world: World, a: number, d: number): void {
  e.x += (Math.cos(a) * 0.3 + Math.cos(a + Math.PI / 2) * Math.sin(e.wob) * 0.6) * e.speed * dt;
  e.y += (Math.sin(a) * 0.3 + Math.sin(a + Math.PI / 2) * Math.sin(e.wob) * 0.6) * e.speed * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(1.8, 2.8);
    e.active = true;
    const reach = Math.min(d, 260);
    const tx = e.x + Math.cos(a) * reach, ty = e.y + Math.sin(a) * reach;
    world.addHazard('mine', tx, ty, 70, 1.6);
    world.audio.bombDrop();
  }
}
