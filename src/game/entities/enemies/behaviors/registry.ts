import type { Enemy } from '../Enemy';
import type { World } from '../../../World';
import type { EnemyKind } from '../enemyTypes';
import * as melee from './melee';
import * as ranged from './ranged';
import * as support from './support';
import * as special from './special';
import * as myth from './myth';

/**
 * Egy ellenfél-fajta képkockánkénti viselkedése. A közös fizikát/státuszt/
 * játékos-ütközést az `Enemy.update` végzi; ez csak a kind-specifikus mozgás/lövés.
 * `a` = szög a játékos felé, `d` = távolság. (Az egységes szignatúra miatt egyes
 * függvények nem használnak minden paramétert — `_` előtaggal jelölve.)
 */
export type BehaviorFn = (e: Enemy, dt: number, world: World, a: number, d: number) => void;

/** kind → viselkedés. A teljes diszpécser-tábla; ami nincs benne, az a `chaser` defaultot kapja (lásd {@link dispatch}). */
export const BEHAVIORS: Partial<Record<EnemyKind, BehaviorFn>> = {
  // alap üldözők (default is ez)
  fly: melee.chaser,
  walker: melee.chaser,
  spider: melee.chaser,

  charger: melee.charger,
  roach: melee.roach,
  spiderling: melee.spiderling,
  striker: melee.striker,
  leaper: melee.leaper,
  flanker: melee.flanker,

  gasbag: ranged.gasbag,
  shooter: ranged.shooter,
  spitter: ranged.spitter,
  lancer: ranged.lancer,
  pyro: ranged.pyro,
  bombardier: ranged.bombardier,
  sniper: ranged.sniper,
  mortar: ranged.mortar,
  shotgunner: ranged.shotgunner,
  gunner: ranged.gunner,
  turret: ranged.turret,
  bombthrower: ranged.bombthrower,

  mistweaver: support.mistweaver,
  summoner: support.summoner,
  blocker: support.blocker,
  healer: support.healer,
  enrager: support.enrager,

  rotling: special.rotling,
  chiller: special.chiller,
  tick: special.tick,
  worm: special.worm,
  blinker: special.blinker,
  confuser: special.confuser,
  puller: special.puller,

  kamikaze: myth.kamikaze,
  slammer: myth.slammer,
  minotaur: myth.minotaur,
  mummy: myth.mummy,
  scarab: myth.scarab,
  vampire: myth.vampire,
  bat: myth.bat,
  leech: myth.leech,
  serpent: myth.serpent,
  medusa: myth.medusa,
  skeleton: myth.skeleton,
  wraith: myth.wraith,
  gargoyle: myth.gargoyle,
  harpy: myth.harpy,
  cyclops: myth.cyclops,
  golem: myth.golem,
  scorpion: myth.scorpion,
  wisp: myth.wisp,
  banshee: myth.banshee,
  imp: myth.imp,
  hydra: myth.hydra,
  werewolf: myth.werewolf,
};

/**
 * Az ellenfél képkockánkénti viselkedése: a `kind`-hoz tartozó függvény, vagy ha
 * nincs ilyen, a `chaser` default (egyenes üldözés). Az `Enemy.update` ezt hívja.
 */
export function dispatch(e: Enemy, dt: number, world: World, a: number, d: number): void {
  (BEHAVIORS[e.kind] ?? melee.chaser)(e, dt, world, a, d);
}
