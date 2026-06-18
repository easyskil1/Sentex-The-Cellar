import type { Enemy } from '../Enemy';
import type { World } from '../../../World';
import { TAU, rand } from '../../../../engine/math';

/**
 * Közelharci / mozgás-alapú viselkedések (nincs lövedék). A közös fizikát,
 * státuszt és a játékos-ütközést az `Enemy.update` végzi; ezek csak a
 * kind-specifikus mozgást. `a` = szög a játékos felé, `d` = távolság.
 * (A `world` paraméter egységesség miatt szerepel, néhol nincs használva.)
 */

/** fly / walker / spider: egyenes üldözés (a légy enyhén kacskaringózik). Ez a default. */
export function chaser(e: Enemy, dt: number, _world: World, a: number): void {
  const wobble = e.kind === 'fly' ? Math.sin(e.wob) * 0.5 : 0;
  e.x += Math.cos(a + wobble) * e.speed * dt;
  e.y += Math.sin(a + wobble) * e.speed * dt;
}

/** Rohamozó: lassan közelít, feltöltődik (wind), majd kilő egy gyors dash-t. */
export function charger(e: Enemy, dt: number, _world: World, a: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'idle') {
    if (e.chargeT <= 0) { e.chargeState = 'wind'; e.chargeT = 0.5; }
    e.x += Math.cos(a) * e.speed * 0.4 * dt;
    e.y += Math.sin(a) * e.speed * 0.4 * dt;
  } else if (e.chargeState === 'wind') {
    if (e.chargeT <= 0) {
      e.chargeState = 'dash';
      e.chargeT = 0.45;
      e.cvx = Math.cos(a) * 360;
      e.cvy = Math.sin(a) * 360;
    }
  } else {
    e.x += e.cvx * dt;
    e.y += e.cvy * dt;
    if (e.chargeT <= 0) { e.chargeState = 'idle'; e.chargeT = rand(1.2, 2.2); }
  }
}

/** Csótány: a harapós egyenest ront, a többi a játékostól elfelé cikázik. */
export function roach(e: Enemy, dt: number, _world: World, a: number): void {
  if (e.biter) {
    e.active = true; // a renderelő ettől tesz rá vészjósló pírt
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    e.face = a;
  } else {
    e.roachT -= dt;
    if (e.roachT <= 0) { e.roachT = rand(0.3, 0.8); e.roachDir = rand(0, TAU); }
    const flee = a + Math.PI; // enyhén a játékostól elfelé szóródik
    const wig = e.roachDir + Math.sin(e.wob * 5) * 0.6;
    const mx = Math.cos(wig) * 0.75 + Math.cos(flee) * 0.25;
    const my = Math.sin(wig) * 0.75 + Math.sin(flee) * 0.25;
    e.x += mx * e.speed * dt;
    e.y += my * e.speed * dt;
    e.face = Math.atan2(my, mx);
  }
}

/** Pók-fióka: kikelés után pánikban szaladgál, majd nagyon gyorsan ráront. */
export function spiderling(e: Enemy, dt: number, _world: World, a: number): void {
  if (e.scatterT > 0) {
    e.scatterT -= dt;
    e.roachT -= dt;
    if (e.roachT <= 0) { e.roachT = rand(0.18, 0.45); e.roachDir = rand(0, TAU); }
    const dir = e.roachDir + Math.sin(e.wob * 9) * 0.5;
    e.x += Math.cos(dir) * e.speed * dt;
    e.y += Math.sin(dir) * e.speed * dt;
    e.face = dir;
  } else {
    if (e.biter) e.active = true;
    const wig = Math.sin(e.wob * 8) * 0.4;
    e.x += Math.cos(a + wig) * e.speed * dt;
    e.y += Math.sin(a + wig) * e.speed * dt;
    e.face = a + wig;
  }
}

/** Verő: rövid pihenő után gyors, ismétlődő dash-rohamokat indít. */
export function striker(e: Enemy, dt: number, _world: World, a: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'dash') {
    e.active = true;
    e.x += Math.cos(a) * e.speed * 2.4 * dt;
    e.y += Math.sin(a) * e.speed * 2.4 * dt;
    if (e.chargeT <= 0) { e.chargeState = 'idle'; e.chargeT = rand(0.8, 1.6); }
  } else if (e.chargeT <= 0) {
    e.chargeState = 'dash';
    e.chargeT = 0.6;
  }
}

/** Ugró: feltöltődik, majd a játékos felé egy nagy ugrást vet (a távolsággal arányos). */
export function leaper(e: Enemy, dt: number, _world: World, a: number, d: number): void {
  e.chargeT -= dt;
  if (e.chargeState === 'idle') {
    if (e.chargeT <= 0) { e.chargeState = 'wind'; e.chargeT = 0.45; }
  } else if (e.chargeState === 'wind') {
    e.active = true;
    if (e.chargeT <= 0) {
      e.chargeState = 'dash';
      e.chargeT = 0.4;
      const reach = Math.min(d, 320);
      e.cvx = (Math.cos(a) * reach) / 0.4;
      e.cvy = (Math.sin(a) * reach) / 0.4;
    }
  } else {
    e.x += e.cvx * dt;
    e.y += e.cvy * dt;
    if (e.chargeT <= 0) { e.chargeState = 'idle'; e.chargeT = rand(1, 2); }
  }
}

/** Bekerítő: távol oldalról ível be, közel egyenesen ráront. */
export function flanker(e: Enemy, dt: number, _world: World, a: number, d: number): void {
  const dir = a + (d > 160 ? 1.0 : 0);
  e.x += Math.cos(dir) * e.speed * dt;
  e.y += Math.sin(dir) * e.speed * dt;
}
