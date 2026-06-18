import type { World } from '../World';
import type { IEnemy } from '../entities/enemies/Enemy';
import type { Obstacle, ObstacleKind } from '../types';
import { OBSTACLES } from '../types';
import { obstacleShardColor } from '../level/obstacleRender';
import { ROOM, GRID } from '../config';
import { clamp, randi } from '../../engine/math';
import { CRATE_DROP_CHANCE } from '../content/dropConfig';

/** Kő alatt OLYKOR arany lapul — bombázásra LEGFELJEBB 1 érme esik. */
const ROCK_COIN_CHANCE = 0.25;

/**
 * Ütközés- és geometria-rendszer: tömör-tárgy lekérdezések, kör–AABB feloldás,
 * sugár–akadály távolság, valamint láda-/akadály-rombolás. A `World` vékony
 * facade-on át delegál ide (`isBlocked`/`resolveCircle`/`rayObstacleDistance`/
 * `shotHitObstacle`), így az entitások hívási helyei VÁLTOZATLANOK. A
 * geometriát (`room` rect, `cellRect`/`cellCenter`, aktív labirintus) a
 * `World` koordinátorból olvassa — a viselkedés azonos a korábbi inline
 * implementációval.
 */
export class CollisionSystem {
  constructor(private readonly w: World) {}

  // --- Ellenfél-térrács (broad-phase) -------------------------------------
  // Képkockánként egyszer felépített uniform grid: a lövedék–ellenfél keresés
  // így O(lövedék × szomszéd-cella), nem O(lövedék × összes ellenfél) — sok
  // lövedéknél (pl. sörétes perk) ez a fő nyereség. A bucket-tömböket
  // ÚJRAHASZNÁLJUK (length=0), nincs képkockánkénti allokáció (GC-barát).
  private static readonly CELL = 72;
  private readonly grid = new Map<number, IEnemy[]>();
  /** Cellánál nagyobb ellenfelek (pl. bossok): mindig ellenőrizzük (loose-grid trükk). */
  private readonly oversized: IEnemy[] = [];

  /** Negatív-biztos egész cella-kulcs (a koordináták a labirintusban is beférnek). */
  private cellKey(cx: number, cy: number): number {
    return ((cx + 2048) << 16) | (cy + 2048);
  }

  /** Egy frame-re felépíti az ellenfél-rácsot a `world.enemies`-ből (a World.update hívja egyszer). */
  indexEnemies(): void {
    const C = CollisionSystem.CELL;
    for (const b of this.grid.values()) b.length = 0; // bucketek ürítése (a tömbök megmaradnak)
    this.oversized.length = 0;
    const es = this.w.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i]!;
      if (e.r * 2 >= C) { this.oversized.push(e); continue; } // nagy ellenfél → mindig nézzük
      const k = this.cellKey(Math.floor(e.x / C), Math.floor(e.y / C));
      let b = this.grid.get(k);
      if (!b) { b = []; this.grid.set(k, b); }
      b.push(e);
    }
  }

  /**
   * Az (x,y) köré `r` sugárban ESHETŐ, ÉLŐ (hp>0) ellenfeleket a hívó által adott
   * `out` pufferbe gyűjti (újrahasznosítható tömb → nincs allokáció). Broad-phase:
   * a pontos átfedés-tesztet a hívó végzi. A `hp<=0` (ebben a frame-ben már megölt)
   * ellenfeleket kihagyja, így nincs kísértet-találat.
   */
  enemiesNear(x: number, y: number, r: number, out: IEnemy[]): IEnemy[] {
    out.length = 0;
    const C = CollisionSystem.CELL;
    // Fél-cellás padding: a normál ellenfelek sugara < C/2 (a nagyobbak az
    // oversized listában vannak), így a szomszéd cellába lógó test se marad ki.
    const pad = r + C / 2;
    const minCx = Math.floor((x - pad) / C), maxCx = Math.floor((x + pad) / C);
    const minCy = Math.floor((y - pad) / C), maxCy = Math.floor((y + pad) / C);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const b = this.grid.get(this.cellKey(cx, cy));
        if (!b) continue;
        for (let i = 0; i < b.length; i++) { const e = b[i]!; if (e.hp > 0) out.push(e); }
      }
    }
    for (let i = 0; i < this.oversized.length; i++) { const e = this.oversized[i]!; if (e.hp > 0) out.push(e); }
    return out;
  }

  /** A legközelebbi élő ellenfél (homing-könnyhez). Teljes pásztázás — ritka, ezért egyszerű. */
  nearestEnemy(x: number, y: number): IEnemy | null {
    let best: IEnemy | null = null, bd = Infinity;
    const es = this.w.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i]!;
      if (e.hp <= 0) continue;
      const dx = x - e.x, dy = y - e.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /**
   * Egy sugár hossza a forrástól adott szögben az ELSŐ akadályig (kő), vagy
   * `maxLen`-ig, ha nincs útban semmi. Lézerekhez: így a kövek mögé el lehet bújni.
   */
  rayObstacleDistance(x: number, y: number, ang: number, maxLen: number): number {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const step = 7;
    for (let s = step; s < maxLen; s += step) {
      if (this.isBlocked(x + dx * s, y + dy * s)) return Math.max(0, s - step);
    }
    return maxLen;
  }

  /** A pontban lévő TÖMÖR tárgy (mozgást/lövést blokkol), vagy null. A víz nem az. */
  private solidObstacleAt(x: number, y: number): Obstacle | null {
    for (const o of this.w.currentRoom.obstacles) {
      if (!OBSTACLES[o.kind].solid) continue;
      const r = this.w.cellRect(o.col, o.row);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return o;
    }
    return null;
  }

  /** Igaz, ha a pont tömör tárgyon van (könny/lövedék-vágáshoz, látáshoz). */
  isBlocked(x: number, y: number): boolean {
    if (this.w.lab) {
      const TILE = ROOM.TILE;
      return this.labWallCell(Math.floor(x / TILE), Math.floor(y / TILE));
    }
    return this.solidObstacleAt(x, y) !== null;
  }

  /**
   * Könnycsepp becsapódott: ha tömör tárgyba ütközött, igaz (a könny elhal).
   * A törhető ládát közben sebzi, és szétlöveti, ha elfogyott az életereje.
   */
  shotHitObstacle(x: number, y: number, dmg: number): boolean {
    if (this.w.lab) return this.isBlocked(x, y); // maze-fal: a lövedék elhal (nem repül át)
    const o = this.solidObstacleAt(x, y);
    if (!o) return false;
    if (OBSTACLES[o.kind].breakable) {
      o.hp = (o.hp ?? OBSTACLES[o.kind].hp) - dmg;
      const c = this.w.cellCenter(o.col, o.row);
      if (o.hp <= 0) this.breakCrate(o, c.x, c.y);
      else {
        this.w.particles.spawn(x, y, '#c89a5a', 5, 130, 0.3);
        this.w.audio.hitEnemy();
      }
    }
    return true;
  }

  /** Láda szétlövése: eltávolítás, szilánkok, és esély zsákmányra. */
  private breakCrate(o: Obstacle, x: number, y: number): void {
    this.w.currentRoom.obstacles = this.w.currentRoom.obstacles.filter((it) => it !== o);
    this.w.particles.spawn(x, y, '#a9743a', 12, 200, 0.5);
    this.w.particles.spawn(x, y, '#6e4a22', 8, 150, 0.45);
    this.w.audio.splat();
    if (Math.random() < CRATE_DROP_CHANCE) this.w.dropPickup(x, y);
  }

  /** Kör alakú entitás kitolása a tömör tárgyakból (kör–AABB feloldás). */
  resolveCircle(o: { x: number; y: number; r: number }): void {
    if (this.w.lab) { this.resolveLabWalls(o); return; }
    for (const ob of this.w.currentRoom.obstacles) {
      if (!OBSTACLES[ob.kind].solid) continue;
      const cr = this.w.cellRect(ob.col, ob.row);
      const px = clamp(o.x, cr.x, cr.x + cr.w);
      const py = clamp(o.y, cr.y, cr.y + cr.h);
      const dx = o.x - px;
      const dy = o.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= o.r * o.r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = o.r - d;
        o.x += (dx / d) * push;
        o.y += (dy / d) * push;
      } else {
        // a középpont a cellán belül: kitolás a legkisebb behatolás felé
        const left = o.x - cr.x;
        const right = cr.x + cr.w - o.x;
        const top = o.y - cr.y;
        const bottom = cr.y + cr.h - o.y;
        const minX = Math.min(left, right);
        const minY = Math.min(top, bottom);
        if (minX < minY) o.x += left < right ? -(left + o.r) : right + o.r;
        else o.y += top < bottom ? -(top + o.r) : bottom + o.r;
      }
    }
  }

  /** Kör alakú entitás kitolása a labirintus fal-tile-jaiból (kör–AABB, a szomszéd cellákra). */
  private resolveLabWalls(o: { x: number; y: number; r: number }): void {
    const TILE = ROOM.TILE;
    const r = o.r;
    const minC = Math.floor((o.x - r) / TILE);
    const maxC = Math.floor((o.x + r) / TILE);
    const minR = Math.floor((o.y - r) / TILE);
    const maxR = Math.floor((o.y + r) / TILE);
    for (let row = minR; row <= maxR; row++) {
      for (let col = minC; col <= maxC; col++) {
        if (!this.labWallCell(col, row)) continue;
        const cx = col * TILE;
        const cy = row * TILE;
        const px = clamp(o.x, cx, cx + TILE);
        const py = clamp(o.y, cy, cy + TILE);
        const dx = o.x - px;
        const dy = o.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = r - d;
          o.x += (dx / d) * push;
          o.y += (dy / d) * push;
        } else {
          // a középpont a fal-cellán belül: kitolás a legkisebb behatolás felé
          const left = o.x - cx;
          const right = cx + TILE - o.x;
          const top = o.y - cy;
          const bottom = cy + TILE - o.y;
          if (Math.min(left, right) < Math.min(top, bottom)) o.x += left < right ? -(left + r) : right + r;
          else o.y += top < bottom ? -(top + r) : bottom + r;
        }
      }
    }
  }

  /** Igaz, ha a labirintus adott cellája fal (a pályán kívül is fal). */
  labWallCell(col: number, row: number): boolean {
    const lab = this.w.lab!;
    if (col < 0 || row < 0 || col >= lab.W || row >= lab.H) return true;
    return lab.wall[row * lab.W + col]!;
  }

  /** Robbanás: a középpont körüli (cellában mért) sugáron belüli tárgyak rombolása + zsákmány. */
  destroyObstaclesAround(x: number, y: number, reach: number): void {
    const rc = this.w.room;
    const ecol = Math.floor((x - rc.x) / (rc.w / GRID.W));
    const erow = Math.floor((y - rc.y) / (rc.h / GRID.H));
    const reach2 = reach * reach;
    this.w.currentRoom.obstacles = this.w.currentRoom.obstacles.filter((o) => {
      const def = OBSTACLES[o.kind];
      if (!def.solid || def.bombProof) return true; // víz nem robban
      const dc = o.col - ecol;
      const dr = o.row - erow;
      if (dc * dc + dr * dr <= reach2) {
        const c = this.w.cellCenter(o.col, o.row);
        this.w.particles.spawn(c.x, c.y, this.obstacleColor(o.kind), 8, 180, 0.45);
        if (o.kind === 'crate' && Math.random() < CRATE_DROP_CHANCE) this.w.dropPickup(c.x, c.y);
        else if (o.kind === 'luckrock') {
          // szerencse-kő: garantált érme-zsákmány + arany szikrák
          this.w.particles.spawn(c.x, c.y, '#ffd36a', 16, 220, 0.6);
          this.w.dropCoins(c.x, c.y, randi(3, 5));
        } else if (o.kind === 'rock' && Math.random() < ROCK_COIN_CHANCE) {
          // kő alatt OLYKOR arany lapul — bombázásra LEGFELJEBB 1 érme esik
          this.w.particles.spawn(c.x, c.y, '#ffd36a', 10, 200, 0.5);
          this.w.dropCoins(c.x, c.y, 1);
        }
        return false;
      }
      return true;
    });
  }

  /** Egy tárgytípus alap-színe (szilánkokhoz; a kő a fejezet témáját követi). */
  private obstacleColor(kind: ObstacleKind): string {
    return obstacleShardColor(kind, this.w.theme);
  }
}
