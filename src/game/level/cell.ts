/**
 * Cella-token kezelés. Egy szoba-sablon sora rögzített szélességű:
 * minden cella PONTOSAN `CELL` karakter (token). Így a tokenek (pl. `g1`, `b3`)
 * SOSEM fogynak el — a betűkészlettel ellentétben (95 jel) itt 95×95 ≈ 9000
 * kombináció van, és bővíthető.
 *
 * A padló a `..` token. A régi, 1-karakteres sablonokat egy egyszeri szkript
 * már átírta 2-karakteresre (minden jel duplázva: `#`→`##`), így itt már csak a
 * 2-karakteres formával kell számolni.
 */
import { GRID } from '../config';

/** Egy cella karakterhossza (token-szélesség). */
export const CELL = 2;
/** Padló-token. */
export const FLOOR = '.'.repeat(CELL);
/** Egy sablon-sor teljes karakterhossza (GRID.W cella × CELL). */
export const ROW_LEN = GRID.W * CELL;

/** A `col`. cella tokenje egy sorban. */
export function tokenAt(row: string, col: number): string {
  return row.slice(col * CELL, col * CELL + CELL);
}

/** Új sor, amelyben a `col`. cella tokenje `token`-re cserélődik. */
export function withToken(row: string, col: number, token: string): string {
  return row.slice(0, col * CELL) + token + row.slice(col * CELL + CELL);
}

/** Csupa padló sor. */
export function blankRow(): string {
  return FLOOR.repeat(GRID.W);
}

/** Egy sor pontos hosszúságúra igazítása (padlóval töltve / vágva). */
export function normalizeRow(row: string): string {
  if (row.length < ROW_LEN) return row + '.'.repeat(ROW_LEN - row.length);
  if (row.length > ROW_LEN) return row.slice(0, ROW_LEN);
  return row;
}
