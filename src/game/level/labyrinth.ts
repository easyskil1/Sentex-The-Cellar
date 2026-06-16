/**
 * Labirintus-generátor a „Különleges pályák" számára.
 *
 * Egy nehéz, a normál szobánál ~4× nagyobb útvesztő. A normál harci szoba
 * 13×7 cella; a labirintus 13×7 MAZE-cellából áll, ami (2·13+1)×(2·7+1) =
 * 27×15 tile-ra bomlik — így ~4.5× akkora bejárható terület.
 *
 * A modul determinisztikus (a `seed` adott): ugyanaz a config mindig ugyanazt a
 * labirintust adja, így szerkeszthető/menthető marad. A megjelenítés a játékban
 * (kamera-követés, NEM összenyomás) külön lépés — ez a modul csak a TARTALMAT
 * állítja elő: a fal-rácsot, a start/exit pozíciót és az ellenfél-helyeket.
 */

/** Egy labirintus-pálya hangolható paraméterei (chapter-en tárolva, menthető). */
export interface LabyrinthConfig {
  /** Maze-cellák vízszintesen (a tile-szélesség 2·cols+1). */
  cols: number;
  /** Maze-cellák függőlegesen (a tile-magasság 2·rows+1). */
  rows: number;
  /**
   * Rövidítő hurkok aránya (braiding) 0..1 — KÖNNYÍTÉS, nem nehezítés!
   * 0 = tökéletes labirintus: PONTOSAN EGY megoldás, minden rossz forduló
   * hosszú zsákutca (ez a legnehezebb). Nagyobb érték felnyitja a zsákutcákat
   * hurkokká → több út vezet a kijárathoz, a rossz irány is célhoz érhet
   * (megbocsátóbb, könnyebb). Nehéz pályához tartsd 0-n.
   */
  loop: number;
  /** Ellenfél-sűrűség 0..1 a bejárható tile-okon. */
  enemyDensity: number;
  /** Seed a determinisztikus generáláshoz. */
  seed: number;
}

/**
 * Alapértelmezett NEHÉZ labirintus (~4.5× a normál szoba). `loop: 0` =
 * tökéletes labirintus: egyetlen megoldás, hosszú zsákutcák — a rossz forduló
 * büntet (nem vezet a kijárathoz).
 */
export const HARD_LABYRINTH: LabyrinthConfig = {
  cols: 13, rows: 7, loop: 0, enemyDensity: 0.14, seed: 1,
};

/** Egy config másolata (szerkesztéskor ne osszuk meg a referenciát). */
export function cloneLabyrinthConfig(c: LabyrinthConfig): LabyrinthConfig {
  return { ...c };
}

export interface LabPos { col: number; row: number; }

/** Egy ellenfél-hely a labirintusban + a cella jellege (a súlyozáshoz/kijelzéshez). */
export interface LabSpawn extends LabPos { kind: 'deadend' | 'junction' | 'corridor'; }

export interface Labyrinth {
  cfg: LabyrinthConfig;
  /** Maze-cella méret. */
  cols: number;
  rows: number;
  /** Tile-méret (2·cols+1 × 2·rows+1). */
  W: number;
  H: number;
  /** W·H hosszú; true = tömör fal, false = bejárható padló. */
  wall: boolean[];
  /** Belépő (tile-koordináta). */
  start: LabPos;
  /** Kijárat / csapóajtó (tile-koordináta) — a starttól legtávolabbi padló. */
  exit: LabPos;
  /** Ellenfél-helyek (tile-koordináta). */
  spawns: LabSpawn[];
  /** A start→exit legrövidebb út hossza (nehézség-mérőszám). */
  pathLen: number;
  /** Zsákutcák száma (nehézség-mérőszám). */
  deadEnds: number;
}

// Kis determinisztikus PRNG (mulberry32) — a seedből reprodukálható maze.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Generál egy labirintust a megadott configból (determinisztikus). */
export function generateLabyrinth(cfg: LabyrinthConfig): Labyrinth {
  const cols = Math.max(2, Math.round(cfg.cols));
  const rows = Math.max(2, Math.round(cfg.rows));
  const W = cols * 2 + 1;
  const H = rows * 2 + 1;
  const rng = mulberry32(cfg.seed || 1);

  const wall = new Array<boolean>(W * H).fill(true);
  const tile = (x: number, y: number): number => y * W + x;
  const cellTile = (c: number, r: number): number => tile(c * 2 + 1, r * 2 + 1);

  // --- 1) Recursive backtracker: tökéletes maze a cella-gráfon ---
  const visited = new Array<boolean>(cols * rows).fill(false);
  const stack: LabPos[] = [{ col: 0, row: 0 }];
  visited[0] = true;
  wall[cellTile(0, 0)] = false;

  while (stack.length) {
    const cur = stack[stack.length - 1]!;
    const opts: Array<{ c: number; r: number; wx: number; wy: number }> = [];
    for (const [dc, dr] of DIRS) {
      const c = cur.col + dc;
      const r = cur.row + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      if (visited[r * cols + c]) continue;
      // a két cella közti fal-tile (a tile-rácson középen)
      opts.push({ c, r, wx: cur.col * 2 + 1 + dc, wy: cur.row * 2 + 1 + dr });
    }
    if (!opts.length) { stack.pop(); continue; }
    const n = opts[Math.floor(rng() * opts.length)]!;
    wall[tile(n.wx, n.wy)] = false; // fal kibontása a szomszéd felé
    wall[cellTile(n.c, n.r)] = false;
    visited[n.r * cols + n.c] = true;
    stack.push({ col: n.c, row: n.r });
  }

  // --- 2) Braiding: rövidítő hurkok (KÖNNYÍTÉS; alapból loop=0 → kihagyva) ---
  // A zsákutcáknál (1 kijárat) `loop` eséllyel kibontunk egy plusz falat → hurok
  // keletkezik, így több út vezet a kijárathoz. Nehéz pályához loop=0 (egy megoldás).
  const cellOpenings = (c: number, r: number): number => {
    let n = 0;
    for (const [dc, dr] of DIRS) {
      const wx = c * 2 + 1 + dc;
      const wy = r * 2 + 1 + dr;
      if (wx <= 0 || wy <= 0 || wx >= W - 1 || wy >= H - 1) continue;
      if (!wall[tile(wx, wy)]) n++;
    }
    return n;
  };
  if (cfg.loop > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cellOpenings(c, r) !== 1) continue; // csak zsákutcákat oldunk
        if (rng() >= cfg.loop) continue;
        // gyűjtsük a még zárt, érvényes irányokat, és bontsunk ki egyet
        const closed: Array<[number, number]> = [];
        for (const [dc, dr] of DIRS) {
          const wx = c * 2 + 1 + dc;
          const wy = r * 2 + 1 + dr;
          if (wx <= 0 || wy <= 0 || wx >= W - 1 || wy >= H - 1) continue;
          if (wall[tile(wx, wy)]) closed.push([wx, wy]);
        }
        if (closed.length) {
          const [wx, wy] = closed[Math.floor(rng() * closed.length)]!;
          wall[tile(wx, wy)] = false;
        }
      }
    }
  }

  // --- 3) BFS a starttól: legtávolabbi padló = exit + pathLen ---
  const startT: LabPos = { col: 1, row: 1 };
  const dStart = bfs(wall, W, H, startT);
  let exit = startT;
  let pathLen = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = dStart[tile(x, y)];
      if (d > pathLen) { pathLen = d; exit = { col: x, row: y }; }
    }
  }

  // --- 4) Ellenfél-helyek: padló-tile-ok jelleg szerint súlyozva ---
  const floorTiles: LabSpawn[] = [];
  const floorOpen = (x: number, y: number): number => {
    let n = 0;
    for (const [dc, dr] of DIRS) {
      const nx = x + dc; const ny = y + dr;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!wall[tile(nx, ny)]) n++;
    }
    return n;
  };
  let deadEnds = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (wall[tile(x, y)]) continue;
      const open = floorOpen(x, y);
      const kind = open <= 1 ? 'deadend' : open >= 3 ? 'junction' : 'corridor';
      if (kind === 'deadend') deadEnds++;
      // ne tegyünk ellenfelet a start/exit közvetlen közelébe
      const nearStart = Math.abs(x - startT.col) + Math.abs(y - startT.row) < 4;
      const isExit = x === exit.col && y === exit.row;
      if (!nearStart && !isExit) floorTiles.push({ col: x, row: y, kind });
    }
  }
  // súly: zsákutca és elágazás veszélyesebb (oda kerül szívesebben ellenfél)
  const weightOf = (k: LabSpawn['kind']): number => (k === 'deadend' ? 3 : k === 'junction' ? 2 : 1);
  const targetCount = Math.round(floorTiles.length * clamp01(cfg.enemyDensity));
  const spawns = weightedSample(floorTiles, targetCount, weightOf, rng);

  return { cfg, cols, rows, W, H, wall, start: startT, exit, spawns, pathLen, deadEnds };
}

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** BFS a bejárható tile-okon; visszaadja a távolság-tömböt (fal = -1). */
function bfs(wall: boolean[], W: number, H: number, from: LabPos): number[] {
  const dist = new Array<number>(W * H).fill(-1);
  const q: number[] = [];
  const s = from.row * W + from.col;
  dist[s] = 0;
  q.push(s);
  for (let head = 0; head < q.length; head++) {
    const cur = q[head]!;
    const x = cur % W;
    const y = (cur - x) / W;
    const d = dist[cur]!;
    for (const [dc, dr] of DIRS) {
      const nx = x + dc; const ny = y + dr;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (wall[ni] || dist[ni] !== -1) continue;
      dist[ni] = d + 1;
      q.push(ni);
    }
  }
  return dist;
}

/** Súlyozott, ismétlés nélküli mintavétel `count` elemre (determinisztikus). */
function weightedSample(
  items: LabSpawn[], count: number, weight: (k: LabSpawn['kind']) => number, rng: () => number,
): LabSpawn[] {
  const pool = items.slice();
  const out: LabSpawn[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    let total = 0;
    for (const it of pool) total += weight(it.kind);
    let t = rng() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      t -= weight(pool[j]!.kind);
      if (t <= 0) { idx = j; break; }
    }
    out.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return out;
}
