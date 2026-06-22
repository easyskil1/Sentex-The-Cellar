/**
 * Seed-rendszer mag (#49). Determinisztikus PRNG + seed-deriváció a megosztható
 * futásokhoz: ugyanaz a seed = ugyanaz a pálya, tárgyak ÉS dropok.
 *
 * Filozófia (a kódbeli precedens): csak a GENERÁLÁS seedelt (layout, ellenfél-típus
 * + pozíció, champion, tárgy-sorsolás, szoba-drop); a FUTÁSIDEJŰ harc (AI, célzás,
 * részecske, hang) ÉLŐ marad. A scope-olást az `engine/math` `withRng` adja.
 *
 * Deriváció: runSeed → floorSeed(floor) → roomSeed(gx,gy). Mivel a szoba-drop EGY
 * esemény (a szoba kipucolásakor), a roomSeedből táplálva ölés-sorrendtől FÜGGETLEN.
 */

/** Kis determinisztikus PRNG (mulberry32): adott seedhez MINDIG ugyanaz a sorozat. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seedelt elem-választás egy tömbből (a `pick` determinisztikus párja). */
export function spick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/**
 * Két 32-bites egész stabil keverése egy újabb 32-bites seeddé (seed-deriváció).
 * Megfelelő szóródás, hogy a szomszédos szobák seedjei NE legyenek korreláltak.
 */
export function mix(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x85ebca6b) ^ Math.imul(b | 0, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h >>> 0;
}

/** Tetszőleges seed-STRING → 32-bites szám (FNV-1a). Üres/whitespace → 1. */
export function hashStr(s: string): number {
  const t = s.trim();
  if (!t) return 1;
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0) || 1;
}

/** Új véletlen, megosztható seed-KÓD (rövid base36 string, pl. „k3f9zq1"). */
export function randomSeedStr(): string {
  const n = (Math.random() * 0xffffffff) >>> 0;
  return n.toString(36);
}
