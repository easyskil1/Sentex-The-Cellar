import { Enemy } from '../Enemy'; // ÉRTÉK-import: az instanceof-hoz kell (körkörös, de csak futásidőben hivatkozott → biztonságos)
import type { World } from '../../../World';
import { rand, dist2 } from '../../../../engine/math';

/**
 * Támogató / kontroll viselkedések: a társ-ellenfeleket erősítik (gyógyítás,
 * gyorsítás), idéznek, ködöt/pajzsot adnak. A `world.enemies` iterálásánál a
 * ciklusváltozó `other` (nem `e`, az a self). `a` = szög a játékos felé, `d` = táv.
 */

/** Ködszövő: kísértetként sodródik, és 2–10 mp-ig élő ködfelhőket hagy. */
export function mistweaver(e: Enemy, dt: number, world: World, a: number): void {
  const drift = a + Math.sin(e.wob * 0.7) * 0.9; // lassú, hullámzó sodródás
  e.x += Math.cos(drift) * e.speed * dt;
  e.y += Math.sin(drift) * e.speed * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(1.0, 1.5);
    e.active = true;
    world.addHazard('fog', e.x, e.y, e.r * 11, rand(4, 20));
  }
}

/** Megidéző: középtávon lebeg, és időnként egy legyet idéz (rajszám-korláttal). */
export function summoner(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 240 ? -0.4 : 0.3;
  e.x += Math.cos(a) * e.speed * want * dt;
  e.y += Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = rand(3.6, 5.2);
    if (world.enemies.length < 36) {
      e.active = true;
      world.spawnAdd('fly', e.x + rand(-20, 20), e.y + rand(-20, 20));
      world.particles.spawn(e.x, e.y, '#9fc0ff', 10, 120, 0.5);
    }
  }
}

/** Blokkoló: közelít, majd 2 mp-re pajzsot húz (a lövéseket elnyeli — lásd Tear). */
export function blocker(e: Enemy, dt: number, world: World, a: number): void {
  if (e.blockT > 0) {
    e.blockT -= dt;
    e.active = true;
  } else {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    e.actCd -= dt;
    if (e.actCd <= 0) {
      e.actCd = rand(3, 4.5);
      e.blockT = 2;
      world.particles.spawn(e.x, e.y, '#cfe0ff', 8, 100, 0.4);
    }
  }
}

/** Gyógyító: távolságot tart, és periodikusan gyógyítja a sérült közeli ellenfeleket. */
export function healer(e: Enemy, dt: number, world: World, a: number, d: number): void {
  const want = d < 240 ? 1 : -0.4; // távol marad a játékostól
  e.x -= Math.cos(a) * e.speed * want * dt;
  e.y -= Math.sin(a) * e.speed * want * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = 1.2;
    let healed = false;
    for (const other of world.enemies) {
      if (other === e || !(other instanceof Enemy)) continue;
      if (other.hp < other.maxHp && dist2(e.x, e.y, other.x, other.y) < 150 * 150) { other.hp = Math.min(other.maxHp, other.hp + 400); healed = true; }
    }
    if (healed) { e.active = true; world.particles.spawn(e.x, e.y, '#5cff8f', 8, 120, 0.5); }
  }
}

/** Feldühítő: a közeli ellenfeleket felgyorsítja. */
export function enrager(e: Enemy, dt: number, world: World, a: number): void {
  e.x += Math.cos(a) * e.speed * 0.4 * dt;
  e.y += Math.sin(a) * e.speed * 0.4 * dt;
  e.actCd -= dt;
  if (e.actCd <= 0) {
    e.actCd = 1.5;
    e.active = true;
    for (const other of world.enemies) {
      if (other === e || !(other instanceof Enemy)) continue;
      if (dist2(e.x, e.y, other.x, other.y) < 160 * 160) other.applyHaste(2);
    }
    world.particles.spawn(e.x, e.y, '#ff5a5a', 8, 120, 0.5);
  }
}
