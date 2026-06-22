import type { ChapterOverrides } from './levels';

/**
 * Szerkesztett fejezet-felülírások (a gyári `BASE_CHAPTERS`-tól eltérők) ÉS az
 * adminból létrehozott ÚJ fejezetek. Az Admin · MAP lap „Mentés fájlba" gombja
 * írja felül (dev Vite plugin, `/__save-levels`). A HUB Dungeon (`kazamata`) +
 * Labirintus-gauntlet (`labirintus1..15`) pályák ADATKÉNT itt élnek (a játék
 * ezekből olvas, az admin ezeket szerkeszti) - a `kazamata` szoba-sablonjai a
 * `maps.ts`-ben (MAPS.kazamata). Determinisztikus baseline (`scripts/gen-hub-stages.mjs`).
 */
export const CHAPTER_OVERRIDES: ChapterOverrides = {
  "edits": {
    "pince": {
      "description": "A ház alatti nyirkos pince, itt kezdődik a leereszkedés.",
      "story": "A padlódeszkák megnyíltak, és a hideg, dohos sötét magába szippantott. A pince falain régi karcolások: valaki, vagy valami már járt itt előtted."
    }
  },
  "created": [
    {
      "id": "kazamata",
      "themeBase": "melyseg",
      "category": "dungeon",
      "name": "Kazamata",
      "floors": 1,
      "bossName": "Kazamata-úr",
      "enemyKinds": [
        "walker",
        "shooter",
        "charger",
        "lancer",
        "pyro",
        "sniper"
      ],
      "description": "Sűrített mélyfúrás: 15 terem, a végén a fenevad.",
      "story": "",
      "difficultyMul": 1
    },
    {
      "id": "labirintus1",
      "themeBase": "pince",
      "category": "kulonleges",
      "name": "Labirintus 1",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "shooter"
      ],
      "description": "A labirintus 1. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 8,
        "rows": 5,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 107922
      }
    },
    {
      "id": "labirintus2",
      "themeBase": "ureg",
      "category": "kulonleges",
      "name": "Labirintus 2",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "shooter"
      ],
      "description": "A labirintus 2. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 9,
        "rows": 5,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 115841
      }
    },
    {
      "id": "labirintus3",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "name": "Labirintus 3",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "shooter"
      ],
      "description": "A labirintus 3. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 9,
        "rows": 6,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 123760
      }
    },
    {
      "id": "labirintus4",
      "themeBase": "pince",
      "category": "kulonleges",
      "name": "Labirintus 4",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "shooter"
      ],
      "description": "A labirintus 4. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 10,
        "rows": 6,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 131679
      }
    },
    {
      "id": "labirintus5",
      "themeBase": "ureg",
      "category": "kulonleges",
      "name": "Labirintus 5",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "charger",
        "spitter"
      ],
      "description": "A labirintus 5. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 10,
        "rows": 7,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 139598
      }
    },
    {
      "id": "labirintus6",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "name": "Labirintus 6",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "charger",
        "spitter"
      ],
      "description": "A labirintus 6. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 11,
        "rows": 7,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 147517
      }
    },
    {
      "id": "labirintus7",
      "themeBase": "pince",
      "category": "kulonleges",
      "name": "Labirintus 7",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "charger",
        "spitter"
      ],
      "description": "A labirintus 7. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 12,
        "rows": 7,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 155436
      }
    },
    {
      "id": "labirintus8",
      "themeBase": "ureg",
      "category": "kulonleges",
      "name": "Labirintus 8",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "walker",
        "charger",
        "spitter"
      ],
      "description": "A labirintus 8. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 12,
        "rows": 8,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 163355
      }
    },
    {
      "id": "labirintus9",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "name": "Labirintus 9",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "charger",
        "lancer",
        "pyro",
        "gunner"
      ],
      "description": "A labirintus 9. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 13,
        "rows": 8,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 171274
      }
    },
    {
      "id": "labirintus10",
      "themeBase": "pince",
      "category": "kulonleges",
      "name": "Labirintus 10",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "charger",
        "lancer",
        "pyro",
        "gunner"
      ],
      "description": "A labirintus 10. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 13,
        "rows": 9,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 179193
      }
    },
    {
      "id": "labirintus11",
      "themeBase": "ureg",
      "category": "kulonleges",
      "name": "Labirintus 11",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "charger",
        "lancer",
        "pyro",
        "gunner"
      ],
      "description": "A labirintus 11. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 14,
        "rows": 9,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 187112
      }
    },
    {
      "id": "labirintus12",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "name": "Labirintus 12",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "charger",
        "lancer",
        "pyro",
        "gunner"
      ],
      "description": "A labirintus 12. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 15,
        "rows": 9,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 195031
      }
    },
    {
      "id": "labirintus13",
      "themeBase": "pince",
      "category": "kulonleges",
      "name": "Labirintus 13",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "lancer",
        "sniper",
        "mortar",
        "blocker"
      ],
      "description": "A labirintus 13. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 15,
        "rows": 10,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 202950
      }
    },
    {
      "id": "labirintus14",
      "themeBase": "ureg",
      "category": "kulonleges",
      "name": "Labirintus 14",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "lancer",
        "sniper",
        "mortar",
        "blocker"
      ],
      "description": "A labirintus 14. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 16,
        "rows": 10,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 210869
      }
    },
    {
      "id": "labirintus15",
      "themeBase": "melyseg",
      "category": "kulonleges",
      "name": "Labirintus 15",
      "floors": 1,
      "bossName": "-",
      "enemyKinds": [
        "lancer",
        "sniper",
        "mortar",
        "blocker"
      ],
      "description": "A labirintus 15. pályája.",
      "story": "",
      "difficultyMul": 1,
      "labyrinth": {
        "cols": 16,
        "rows": 11,
        "loop": 0.12,
        "enemyDensity": 0.25,
        "seed": 218788
      }
    }
  ]
};
