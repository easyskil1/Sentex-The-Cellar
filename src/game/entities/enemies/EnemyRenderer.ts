// Vékony újraexport: a renderelő a ./renderers mappában él, típusonként
// egy fájlban (lásd renderers/index.ts). A korábbi importálók változatlanok.
export { drawEnemy } from './renderers';
export type { EnemyVisual } from './renderers';
