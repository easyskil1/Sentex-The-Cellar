/** Egy fejezet vizuális témája (szobaszínek, falak, kövek, ajtók, boss). */
export interface Theme {
  floor: string;
  grid: string;
  vignette: number; // 0..1 — a szél sötétítésének erőssége
  wall: string;
  wallEdge: string;
  wallTop: string;
  doorFrame: string;
  doorFloor: string;
  doorBar: string;
  doorBarStroke: string;
  rock: string;
  rockStroke: string;
  bossColor: string;
  accent: string;
  decorations?: string[]; // Választható színek a fűnek, virágoknak stb.
}
