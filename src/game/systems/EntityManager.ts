import type { Tear } from '../entities/Tear';
import type { Ring } from '../entities/Ring';
import type { Bomb } from '../entities/Bomb';
import type { EnemyBullet } from '../types';

/**
 * A futás „röpke" entitásainak birtokosa: játékos-könnyek (`tears`),
 * Pecsétgyűrűk (`rings`), ellenfél-lövedékek (`ebullets`) és lerakott bombák
 * (`bombs`). A `World` vékony gettereken át delegál ide (`world.tears` /
 * `world.ebullets` stb.), így az entitások hívási helyei VÁLTOZATLANOK.
 * Szoba-/szintváltáskor a `clear()` üríti mindet — a tömböket újrahasználjuk
 * (nincs realloc, GC-barát).
 */
export class EntityManager {
  readonly tears: Tear[] = [];
  readonly rings: Ring[] = [];
  readonly ebullets: EnemyBullet[] = [];
  readonly bombs: Bomb[] = [];

  /** Szoba-/szintváltás: minden röpke entitás törlése (a tömbök megmaradnak). */
  clear(): void {
    this.tears.length = 0;
    this.rings.length = 0;
    this.ebullets.length = 0;
    this.bombs.length = 0;
  }
}
