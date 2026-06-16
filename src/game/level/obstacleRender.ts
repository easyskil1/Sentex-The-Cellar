// Vékony újraexport: a pálya-tárgy rajzolók a ./obstacles mappában élnek,
// típusonként egy fájlban (lásd obstacles/index.ts). Az importálók változatlanok.
export {
  drawRock, drawTree, drawCrate, drawWaterTile, drawLuckRock,
  drawTerrainObstacle, obstacleShardColor,
} from './obstacles';
