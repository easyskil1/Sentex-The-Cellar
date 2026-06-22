import type { IEnemy } from '../entities/enemies/Enemy';
import type { Pickup } from '../entities/Pickup';
import type { Pedestal } from '../entities/Pedestal';
import type { Shop } from '../entities/Shop';
import type { BloodAltar } from '../entities/BloodAltar';
import type { CurseAltar } from '../entities/CurseAltar';
import type { Decoration, Obstacle, Splat } from '../types';
import type { MapAnimDraw } from './mapAnim';

export type RoomType = 'start' | 'normal' | 'boss' | 'item' | 'blood' | 'curse' | 'secret';

/** Egy dungeon-szoba: rácspozíció, típus, állapot és tartalom. */
export class Room {
  cleared: boolean;
  visited: boolean;
  /** Igaz, ha az ellenfeleket már legeneráltuk (visszatéréskor nem ismételjük). */
  spawned: boolean;
  /**
   * Titkos szoba (#37) felfedezett-e: amíg hamis, NINCS hozzá nyitott ajtó és a
   * minimapon sem látszik (bombázással tárul fel). Minden más szobánál mindig igaz.
   */
  discovered: boolean;

  enemies: IEnemy[] = [];
  pickups: Pickup[] = [];
  pedestal: Pedestal | null = null;
  /** Szerencse-szoba berendezése (csak `item` típusú szobákban). */
  shop: Shop | null = null;
  /** Vér-oltár berendezése (csak `blood` típusú szobákban). */
  bloodAltar: BloodAltar | null = null;
  /** Átok-reliquárium berendezése (csak `curse` típusú szobákban). */
  curseAltar: CurseAltar | null = null;
  /** Pálya-tárgyak (kő/fa/láda/víz) rács-cellákon — a sablonból. */
  obstacles: Obstacle[] = [];
  decorations: Decoration[] = [];
  splats: Splat[] = [];
  /** Szoba-méretű, „légköri" animáció (eső, köd, szél…) — a sablonból. `null` = nincs. */
  anim: MapAnimDraw | null = null;
  /** Labirintus-kapu rács-pozíciója (a sablonból); ide lépve a labirintusba kerülsz. */
  gate: { col: number; row: number } | null = null;
  /** Dungeon-kapu rács-pozíciója (a kezdőszobában); ide lépve a dungeonba kerülsz. */
  dungeonGate: { col: number; row: number } | null = null;

  constructor(public readonly gx: number, public readonly gy: number, public type: RoomType) {
    const isSafe = type === 'start';
    this.cleared = isSafe;
    this.visited = isSafe;
    this.spawned = isSafe;
    this.discovered = type !== 'secret'; // a titkos szoba bombázásig rejtett
  }

  get key(): string {
    return `${this.gx},${this.gy}`;
  }
}
