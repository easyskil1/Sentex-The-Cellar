import type { ChapterOverrides } from './levels';

/**
 * Szerkesztett fejezet-felülírások (a gyári `BASE_CHAPTERS`-tól eltérők) ÉS az
 * adminból létrehozott ÚJ fejezetek. Az Admin · MAP lap „Mentés fájlba" gombja
 * írja felül (dev Vite plugin, `/__save-levels`). Üres = minden a gyári szerint.
 */
export const CHAPTER_OVERRIDES: ChapterOverrides = {
  "edits": {
    "pince": {
      "description": "A ház alatti nyirkos pince, itt kezdődik a leereszkedés.",
      "story": "A padlódeszkák megnyíltak, és a hideg, dohos sötét magába szippantott. A pince falain régi karcolások: valaki, vagy valami már járt itt előtted."
    },
    "uj1": {
      "labyrinth": {
        "cols": 16,
        "rows": 10,
        "loop": 0.2,
        "enemyDensity": 0.02,
        "seed": 944992740
      }
    }
  },
  "created": [
    {
      "id": "uj1",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "labyrinth": {
        "cols": 13,
        "rows": 7,
        "loop": 0.18,
        "enemyDensity": 0.14,
        "seed": 992919083
      },
      "name": "A Labirintus",
      "floors": 1,
      "bossName": "Új boss",
      "enemyKinds": [
        "fly",
        "walker"
      ],
      "description": "",
      "story": "",
      "difficultyMul": 1
    }
  ]
};
