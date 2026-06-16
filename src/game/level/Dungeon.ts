import { Room } from './Room';
import { randi, pick } from '../../engine/math';
import { DUNGEON } from '../config';
import { DIR_DELTA, type Dir } from '../types';

const key = (x: number, y: number): string => `${x},${y}`;

/**
 * Egy szint szobatérképe. Random-walk alapú generálás:
 * a start szobából kiindulva szomszédokat növesztünk, majd kijelöljük
 * a boss- és a tárgyszobát.
 */
export class Dungeon {
  private rooms = new Map<string, Room>();
  currentKey = '0,0';

  constructor(public readonly level: number) {
    this.generate(level);
  }

  private generate(level: number): void {
    this.rooms.clear();
    const raw = DUNGEON.BASE_ROOMS + level * DUNGEON.PER_LEVEL + randi(0, 2);
    const target = Math.min(DUNGEON.MAX_ROOMS, Math.max(DUNGEON.MIN_ROOMS, raw));
    this.rooms.set(key(0, 0), new Room(0, 0, 'start'));

    const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // Növesztés: minden lépésben pontosan egy szobát adunk hozzá, amíg el nem
    // érjük a célt — így garantáltan meglesz a kívánt (min. 10) szobaszám.
    // A kevés szomszéddal rendelkező cellákat preferáljuk, hogy a pálya ne
    // legyen túl tömör (inkább elágazó/folyosós).
    while (this.rooms.size < target) {
      const cands = new Map<string, { x: number; y: number; nb: number }>();
      for (const r of this.rooms.values()) {
        for (const [dx, dy] of dirs) {
          const nx = r.gx + dx;
          const ny = r.gy + dy;
          const k = key(nx, ny);
          if (this.rooms.has(k) || cands.has(k)) continue;
          let nb = 0;
          for (const [ax, ay] of dirs) if (this.rooms.has(key(nx + ax, ny + ay))) nb++;
          cands.set(k, { x: nx, y: ny, nb });
        }
      }
      if (cands.size === 0) break; // végtelen rácson elvileg sosem fordul elő
      const arr = [...cands.values()];
      const minNb = Math.min(...arr.map((c) => c.nb));
      // a legkevésbé tömör jelöltek közül választunk (néha megengedünk eggyel többet)
      const pool = arr.filter((c) => c.nb <= minNb + (Math.random() < 0.3 ? 1 : 0));
      const chosen = pick(pool);
      this.rooms.set(key(chosen.x, chosen.y), new Room(chosen.x, chosen.y, 'normal'));
    }

    // boss = legtávolabbi szoba a starttól (Manhattan)
    let bossKey: string | null = null;
    let bestD = -1;
    for (const [k, r] of this.rooms) {
      if (k === '0,0') continue;
      const d = Math.abs(r.gx) + Math.abs(r.gy);
      if (d > bestD) { bestD = d; bossKey = k; }
    }
    if (bossKey) this.rooms.get(bossKey)!.type = 'boss';

    // tárgyszoba = zsákutca (1 szomszéd), ami nem start/boss
    const deadEnds: string[] = [];
    for (const [k, r] of this.rooms) {
      if (k === '0,0' || k === bossKey) continue;
      let nb = 0;
      for (const [ax, ay] of dirs) if (this.rooms.has(key(r.gx + ax, r.gy + ay))) nb++;
      if (nb === 1) deadEnds.push(k);
    }
    if (deadEnds.length) {
      this.rooms.get(pick(deadEnds))!.type = 'item';
    } else {
      const norms = [...this.rooms.values()].filter((r) => r.type === 'normal');
      if (norms.length) pick(norms).type = 'item';
    }

    this.currentKey = '0,0';
  }

  get current(): Room {
    return this.rooms.get(this.currentKey)!;
  }

  has(gx: number, gy: number): boolean {
    return this.rooms.has(key(gx, gy));
  }

  get(gx: number, gy: number): Room | undefined {
    return this.rooms.get(key(gx, gy));
  }

  /** Van-e szomszéd a megadott irányban az aktuális szobához képest? */
  hasNeighbor(dir: Dir): boolean {
    const c = this.current;
    const d = DIR_DELTA[dir];
    return this.has(c.gx + d.dx, c.gy + d.dy);
  }

  /** Belépés a szomszédos szobába; visszaadja az új aktuális szobát. */
  move(dir: Dir): Room {
    const c = this.current;
    const d = DIR_DELTA[dir];
    const next = this.get(c.gx + d.dx, c.gy + d.dy)!;
    this.currentKey = next.key;
    next.visited = true;
    return next;
  }

  all(): IterableIterator<Room> {
    return this.rooms.values();
  }
}
