import { Room } from './Room';
import { randi, pick, random, withRng } from '../../engine/math';
import { mulberry32 } from '../rng';
import { DUNGEON, BLOOD, CURSE, SECRET } from '../config';
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

  /**
   * `seed` megadva (seed-rendszer, #49): a layout-generálás DETERMINISZTIKUS
   * (ugyanaz a seed = ugyanaz a szobatérkép). Megadás nélkül élő `Math.random`
   * (pl. a HUB háttér-konténerei, ahol a layout nem számít).
   */
  constructor(public readonly level: number, seed?: number) {
    if (seed !== undefined) withRng(mulberry32(seed), () => this.generate(level));
    else this.generate(level);
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
      const pool = arr.filter((c) => c.nb <= minNb + (random() < 0.3 ? 1 : 0));
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
    let itemKey: string | null = null;
    if (deadEnds.length) {
      itemKey = pick(deadEnds);
      this.rooms.get(itemKey)!.type = 'item';
    } else {
      const norms = [...this.rooms.values()].filter((r) => r.type === 'normal');
      if (norms.length) pick(norms).type = 'item';
    }

    // vér-oltár szoba (#35): egy MÁSIK szabad zsákutcára, esélyfüggően. Külön
    // szobatípus; kockázat/jutalom (élet→tárgy). Csak ha maradt zsákutca a
    // tárgyszobán túl, hogy a normál harci szobákat ne fogyasszuk el.
    const bloodPool = deadEnds.filter((k) => k !== itemKey);
    let bloodKey: string | null = null;
    if (bloodPool.length && random() < BLOOD.chance) {
      bloodKey = pick(bloodPool);
      this.rooms.get(bloodKey)!.type = 'blood';
    }

    // átokverem szoba (#38): MÉG egy szabad zsákutcára (a tárgy ÉS a vér után),
    // esélyfüggően. Külön szobatípus; kockázat/jutalom: fix 1 szív EGYSZER → egy
    // ingyen ritka tárgy. Csak ha maradt zsákutca, hogy ne fogyasszuk el a harci
    // szobákat - így nagy térképen ritka, hogy mindhárom különleges szoba meglegyen.
    const cursePool = deadEnds.filter((k) => k !== itemKey && k !== bloodKey);
    if (cursePool.length && random() < CURSE.chance) {
      this.rooms.get(pick(cursePool))!.type = 'curse';
    }

    // titkos szoba (#37): egy ÜRES (rácson nem létező) cellára, ami legalább egy
    // meglévő szobával szomszédos - preferáljuk a TÖBB szomszéddal bírót („beékelt"
    // érzet). REJTETT (discovered=false): nincs nyitott ajtó és a minimapon sem
    // látszik, amíg egy szomszédos szobából a megfelelő falat fel nem robbantod.
    if (random() < SECRET.chance) {
      const empty = new Map<string, { x: number; y: number; nb: number }>();
      for (const r of this.rooms.values()) {
        for (const [dx, dy] of dirs) {
          const nx = r.gx + dx;
          const ny = r.gy + dy;
          const k = key(nx, ny);
          if (this.rooms.has(k) || empty.has(k)) continue;
          let nb = 0;
          for (const [ax, ay] of dirs) if (this.rooms.has(key(nx + ax, ny + ay))) nb++;
          empty.set(k, { x: nx, y: ny, nb });
        }
      }
      if (empty.size) {
        const arr = [...empty.values()];
        const maxNb = Math.max(...arr.map((c) => c.nb));
        const chosen = pick(arr.filter((c) => c.nb === maxNb));
        this.rooms.set(key(chosen.x, chosen.y), new Room(chosen.x, chosen.y, 'secret'));
      }
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

  /**
   * Van-e (ELÉRHETŐ) szomszéd a megadott irányban az aktuális szobához képest?
   * A FEL NEM TÁRT titkos szoba nem számít szomszédnak (nincs ajtó, tömör fal),
   * amíg fel nem robbantod - lásd revealSecret.
   */
  hasNeighbor(dir: Dir): boolean {
    const c = this.current;
    const d = DIR_DELTA[dir];
    const n = this.get(c.gx + d.dx, c.gy + d.dy);
    if (!n) return false;
    if (n.type === 'secret' && !n.discovered) return false;
    return true;
  }

  /**
   * Titkos szoba feltárása az aktuális szobából a megadott irányban (bombázáskor).
   * Igazat ad vissza, ha tényleg volt fel-nem-tárt titkos szomszéd (és most feltárta).
   */
  revealSecret(dir: Dir): boolean {
    const c = this.current;
    const d = DIR_DELTA[dir];
    const n = this.get(c.gx + d.dx, c.gy + d.dy);
    if (n && n.type === 'secret' && !n.discovered) {
      n.discovered = true;
      return true;
    }
    return false;
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
