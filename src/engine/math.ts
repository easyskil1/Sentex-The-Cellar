/** Általános matematikai segédfüggvények. */

export const TAU = Math.PI * 2;

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export const randi = (a: number, b: number): number => Math.floor(rand(a, b + 1));

export const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

/** Négyzetes távolság (gyökvonás nélkül — gyors ütközésvizsgálathoz). */
export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by);

export const pick = <T>(arr: readonly T[]): T => arr[randi(0, arr.length - 1)]!;

/** Súlyozott véletlen választás: minden elem `weight`-je adja az esélyét. */
export const weightedPick = <T>(arr: readonly T[], weight: (item: T) => number): T => {
  let total = 0;
  for (const it of arr) total += Math.max(0, weight(it));
  if (total <= 0) return pick(arr);
  let r = Math.random() * total;
  for (const it of arr) {
    r -= Math.max(0, weight(it));
    if (r < 0) return it;
  }
  return arr[arr.length - 1]!;
};

/** Lineáris interpoláció. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Vec2 {
  x: number;
  y: number;
}

/** Egységvektorrá normál (0,0 esetén nullvektor). */
export function normalize(x: number, y: number): Vec2 {
  const m = Math.hypot(x, y);
  return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
}

/**
 * Hex szín világosítása/sötétítése. `amt` ∈ [-1, 1]: pozitív a fehér,
 * negatív a fekete felé kever. Visszaad egy `rgb(...)` stringet.
 */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return `rgb(${r},${g},${b})`;
}

/** Determinisztikus 0..1 ál-véletlen két egész koordinátából (stabil mintákhoz). */
export function hash2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 100000) / 100000;
}
