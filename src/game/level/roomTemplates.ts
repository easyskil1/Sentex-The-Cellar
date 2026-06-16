import type { EnemyKind } from '../entities/enemies/enemyTypes';
import type { BossTarget } from '../entities/enemies/bossRegistry';
import { GRID } from '../config';
import { OBSTACLES, type Obstacle, type ObstacleKind } from '../types';
import { MAP_ANIM_BY_CH, type MapAnimDraw } from './mapAnim';
import { ROW_LEN, tokenAt } from './cell';

/**
 * Szoba-sablon értelmező (Isaac-stílusú "map"-ek).
 *
 * A konkrét sablonok fejezetenként a `levels.ts`-ben élnek. Itt csak a közös
 * formátum és a kibontás van. A rács GRID.W × GRID.H cella (13×7).
 *
 * Jelmagyarázat:
 *   '.'  üres padló
 *   '#'  kő          — tömör akadály (bombával robbantható)
 *   'T'  fa          — tömör akadály (bombával robbantható)
 *   'X'  fa doboz    — tömör, de KÖNNYEKKEL SZÉTLŐHETŐ (eshet belőle zsákmány)
 *   '~'  folyó/víz   — NEM akadály: átjárható, a lövedékek átrepülnek felette
 *   'f'  légy        (fly)
 *   'w'  járőr       (walker)
 *   's'  lövész      (shooter)
 *   'c'  rohamozó    (charger)
 *   'r'  mételyező   (rotling)     — mérgező tócsát hagy
 *   'p'  köpködő     (spitter)     — közelről gyors savsorozat
 *   'i'  dermesztő   (chiller)     — lassítja a játékost
 *   'l'  lézervető   (lancer)      — átsöprő energiasugár
 *   'y'  tűzokádó    (pyro)        — lángcsóva + égő foltok
 *   'a'  aknász      (bombardier)  — ketyegő aknák
 *   'm'  ködszövő    (mistweaver)  — eloszló ködfelhők
 *   'k'  csótány-raj (roach)       — 20 db cikázó csótány, köztük 1 harapós
 *   'd'  pók         (spider)      — megöléskor 10 pók-fiókára robban (2 harapós)
 *   't'  kullancs    (tick)        — nem mozog, közelségre rád mászik (lelőhető előbb)
 *   'N'  mesterlövész (sniper)     — gyors, erős célzott lövés (telegrafál)
 *   'S'  mozsár       (mortar)     — becsapódó tűz-AoE a játékos helyére
 *   'J'  megidéző     (summoner)   — legyeket idéz (rajszám-korláttal)
 *   'e'  bármilyen ellenfél — a fejezet enemyKinds listájából véletlenül
 *   'B'  boss — klasszikus főellenség
 *   'L'  boss — Lidérc (a másik boss-típus)
 *
 * TEREPTÁR (hangulati tereptárgyak — a szerkesztő „Tereptár" palettája):
 *   tömör dísz: O kőtömb, V pala, b bokor, h tüskebozót, P fenyő, D száraz fa,
 *     U fatönk, G rönk, C kristály, Y holt fa, x kaktusz, A cseppkő, q fáklya,
 *     Z parázstartó, H sírkő, I oszlop, E láda, Q üst, F tábortűz, M kút
 *   törhető:    R hordó, W agyagedények
 *   átjárható (decal): u gomba, K csont, g fű, j nádas, n páfrány, o virág,
 *     z kavics, v indák
 *   GOTH (szimbólum-jelek): ! koporsó, + sírkereszt, = kelta kereszt, @ kőangyal,
 *     & vízköpő, % vaskerítés, ^ kandeláber, $ koponyahalom, ) urna, ? obeliszk,
 *     ( pókháló (decal), < rituálé-kör (decal)
 *
 * MAP-ANIMÁCIÓ (szoba-méretű légköri effekt, lásd mapAnim.ts): 1–9, 0, * — egy
 *   sablonban egy ilyen jel a teljes szobára tett animációt jelöli (nem akadály,
 *   a cella padló marad). Az első talált jel dönt.
 */

/** Egy spawn-slot: konkrét típus, vagy 'any' (a fejezet palettájából). */
export type SpawnSlot = EnemyKind | 'any';

/** A sablon-boss MOSTANTÓL a teljes boss-registry kulcsa (mind a 10 boss), nem
 *  csak a régi 'classic'/'liderc'. (A típus az alias, hogy a hívók ne törjenek.) */
export type BossKind = BossTarget;

/** EGYETLEN forrás a BOSS-tokenekhez (parse-leképezés + szerkesztő paletta/előnézet).
 *  A `BB`/`LL` MEGMARAD (a régi sablonok ezeket használják: A Fenevad / A Lidérc),
 *  a többi boss `b?` tokent kap. */
export interface BossTokenDef { token: string; target: BossTarget; label: string; }
export const BOSS_TOKENS: readonly BossTokenDef[] = [
  { token: 'BB', target: 'boss', label: 'A Fenevad' },
  { token: 'LL', target: 'boss2', label: 'A Lidérc' },
  { token: 'b1', target: 'boss3', label: 'A mérges Fenevad' },
  { token: 'b2', target: 'boss4', label: 'A lidérc mérge' },
  { token: 'b3', target: 'mummy', label: 'Múmia' },
  { token: 'b4', target: 'mummyrage', label: 'Múmia haragja' },
  { token: 'b5', target: 'satan', label: 'Sátán' },
  { token: 'b6', target: 'satanhand', label: 'Sátán keze' },
  { token: 'b7', target: 'dragon', label: 'Sárkány' },
  { token: 'b8', target: 'twindragon', label: 'Kétfejű sárkány' },
];

// Minden token PONTOSAN 2 karakter (lásd cell.ts). A meglévő jelek a régi
// 1-karakteres jel duplázásai (`f`→`ff`); az új ellenfelek az `e?`/`z?` szabad
// névtérből kapnak tokent (a digit-párokat a MAP-animációk, a `g?`-t a goth
// tereptár foglalja). EGYETLEN forrás az ELLENFÉL-tokenekhez: `ENEMY_TOKENS` —
// ebből épül a parse-leképezés (`TOKEN_TO_SLOT`) ÉS a szerkesztő palettája +
// előnézete is (lásd MapEditor), így minden ellenfél elérhető és nem csúszhat szét.
export interface EnemyToken { token: string; kind: EnemyKind; label: string; }
export const ENEMY_TOKENS: readonly EnemyToken[] = [
  // Alap + Wave 5 — MEGLÉVŐ tokenek (NE változzanak: a sablonok ezeket használják)
  { token: 'ff', kind: 'fly', label: 'Légy' },
  { token: 'ww', kind: 'walker', label: 'Járőr' },
  { token: 'ss', kind: 'shooter', label: 'Lövész' },
  { token: 'cc', kind: 'charger', label: 'Rohamozó' },
  { token: 'rr', kind: 'rotling', label: 'Mételyező' },
  { token: 'pp', kind: 'spitter', label: 'Köpködő' },
  { token: 'ii', kind: 'chiller', label: 'Dermesztő' },
  { token: 'll', kind: 'lancer', label: 'Lézervető' },
  { token: 'yy', kind: 'pyro', label: 'Tűzokádó' },
  { token: 'aa', kind: 'bombardier', label: 'Aknász' },
  { token: 'mm', kind: 'mistweaver', label: 'Ködszövő' },
  { token: 'kk', kind: 'roach', label: 'Csótány-raj' },
  { token: 'dd', kind: 'spider', label: 'Pók' },
  { token: 'tt', kind: 'tick', label: 'Kullancs' },
  { token: 'NN', kind: 'sniper', label: 'Mesterlövész' },
  { token: 'SS', kind: 'mortar', label: 'Mozsár' },
  { token: 'JJ', kind: 'summoner', label: 'Megidéző' },
  // Wave 5b — eddig token nélkül (csak teszt-arénából); ÚJ `e?` tokenek
  { token: 'e1', kind: 'striker', label: 'Csapó' },
  { token: 'e2', kind: 'worm', label: 'Gilista' },
  { token: 'e3', kind: 'shotgunner', label: 'Sörétes' },
  { token: 'e4', kind: 'gunner', label: 'Gyorslövő' },
  { token: 'e5', kind: 'blinker', label: 'Villanó' },
  { token: 'e6', kind: 'confuser', label: 'Zavaró' },
  { token: 'e7', kind: 'blocker', label: 'Blokkoló' },
  { token: 'e8', kind: 'leaper', label: 'Ugró' },
  { token: 'e9', kind: 'flanker', label: 'Bekerítő' },
  { token: 'ea', kind: 'healer', label: 'Gyógyító' },
  { token: 'eb', kind: 'enrager', label: 'Feldühítő' },
  { token: 'ec', kind: 'kamikaze', label: 'Kamikaze' },
  { token: 'ed', kind: 'slammer', label: 'Földcsapó' },
  { token: 'ef', kind: 'turret', label: 'Torony' },
  { token: 'eg', kind: 'gasbag', label: 'Gázzsák' },
  { token: 'eh', kind: 'puller', label: 'Húzó' },
  { token: 'ei', kind: 'bombthrower', label: 'Bombázó' },
  // Wave 6 — mitológiai szörnyek; ÚJ `z?` tokenek
  { token: 'z1', kind: 'minotaur', label: 'Minotaurusz' },
  { token: 'z2', kind: 'mummy', label: 'Múmia' },
  { token: 'z3', kind: 'scarab', label: 'Skarabeusz' },
  { token: 'z4', kind: 'vampire', label: 'Vámpír' },
  { token: 'z5', kind: 'bat', label: 'Óriásdenevér' },
  { token: 'z6', kind: 'leech', label: 'Pióca' },
  { token: 'z7', kind: 'serpent', label: 'Kígyó' },
  { token: 'z8', kind: 'medusa', label: 'Medúza' },
  { token: 'z9', kind: 'skeleton', label: 'Csontváz' },
  { token: 'za', kind: 'wraith', label: 'Lidérc' },
  { token: 'zb', kind: 'gargoyle', label: 'Vízköpő' },
  { token: 'zc', kind: 'harpy', label: 'Hárpia' },
  { token: 'zd', kind: 'cyclops', label: 'Küklopsz' },
  { token: 'ze', kind: 'golem', label: 'Gólem' },
  { token: 'zf', kind: 'scorpion', label: 'Skorpió' },
  { token: 'zg', kind: 'wisp', label: 'Lidércfény' },
  { token: 'zh', kind: 'banshee', label: 'Banshee' },
  { token: 'zi', kind: 'imp', label: 'Ördögfióka' },
  { token: 'zj', kind: 'hydra', label: 'Hidra' },
  { token: 'zk', kind: 'werewolf', label: 'Vérfarkas' },
];

const TOKEN_TO_SLOT: Record<string, SpawnSlot> = {
  ...Object.fromEntries(ENEMY_TOKENS.map((e) => [e.token, e.kind])),
  ee: 'any', // a fejezet palettájából sorsol
};

export const TOKEN_TO_OBSTACLE: Record<string, ObstacleKind> = {
  '##': 'rock',
  TT: 'tree',
  XX: 'crate',
  '~~': 'water',
  // TEREPTÁR — tömör dísz
  OO: 'boulder', VV: 'slate', bb: 'bush', hh: 'thornbush', PP: 'pine', DD: 'drytree',
  UU: 'stump', GG: 'log', CC: 'crystals', YY: 'deadtree', xx: 'cactus', AA: 'stalagmites',
  qq: 'torch', ZZ: 'brazier', HH: 'tombstone', II: 'pillar', EE: 'chest', QQ: 'cauldron',
  FF: 'campfire', MM: 'well',
  // TEREPTÁR — törhető
  RR: 'barrel', WW: 'pots',
  // TEREPTÁR — átjárható dísz (decal)
  uu: 'mushrooms', KK: 'bones', gg: 'grass', jj: 'reeds', nn: 'fern', oo: 'flowers',
  zz: 'pebbles', vv: 'vines',
  // GOTH TEREPTÁR — szabad névtér (g-csoport). Tömör dísz:
  g1: 'coffin', g2: 'gravecross', g3: 'celticcross', g4: 'angelstatue',
  g5: 'gargoyle', g6: 'ironfence', g7: 'candelabra', g8: 'skullpile',
  g9: 'urn', ga: 'obelisk',
  // GOTH TEREPTÁR — átjárható dísz (decal)
  gb: 'cobweb', gc: 'ritualcircle',
};

/** A boss-token → registry-cél leképezés (a BOSS_TOKENS-ből építve). */
const TOKEN_TO_BOSS: Record<string, BossKind> =
  Object.fromEntries(BOSS_TOKENS.map((b) => [b.token, b.target]));

/** A labirintus-KAPU cella-tokenje (a szerkesztő „Kapu" ecsete ezt rakja le). */
export const GATE_TOKEN = '>>';

export interface ParsedTemplate {
  obstacles: Obstacle[];
  spawns: Array<{ slot: SpawnSlot; col: number; row: number }>;
  boss: { col: number; row: number; kind: BossKind } | null;
  /** Szoba-méretű animáció (az első talált anim-jelből), vagy `null`. */
  anim: MapAnimDraw | null;
  /** Labirintus-kapu pozíciója (ide lépve a labirintusba kerülsz), vagy `null`. */
  gate: { col: number; row: number } | null;
}

function validate(tpl: string[]): void {
  if (tpl.length !== GRID.H) throw new Error(`Sablon magassága ${tpl.length}, kellene ${GRID.H}`);
  for (const row of tpl) {
    if (row.length !== ROW_LEN) throw new Error(`Sablon sora "${row}" hossza ${row.length}, kellene ${ROW_LEN}`);
  }
}

export function parseTemplate(tpl: string[]): ParsedTemplate {
  validate(tpl);
  const out: ParsedTemplate = { obstacles: [], spawns: [], boss: null, anim: null, gate: null };
  for (let row = 0; row < tpl.length; row++) {
    const line = tpl[row]!;
    for (let col = 0; col < GRID.W; col++) {
      const tok = tokenAt(line, col);
      const okind = TOKEN_TO_OBSTACLE[tok];
      if (okind) {
        const hp = OBSTACLES[okind].hp;
        out.obstacles.push(hp > 0 ? { col, row, kind: okind, hp } : { col, row, kind: okind });
      } else if (TOKEN_TO_BOSS[tok]) {
        out.boss = { col, row, kind: TOKEN_TO_BOSS[tok]! };
      } else if (tok === GATE_TOKEN) {
        out.gate = { col, row };
      } else {
        const slot = TOKEN_TO_SLOT[tok];
        if (slot) out.spawns.push({ slot, col, row });
        // szoba-méretű animáció-jel (az első talált dönt; a cella padló marad)
        else if (!out.anim && MAP_ANIM_BY_CH[tok]) out.anim = MAP_ANIM_BY_CH[tok]!;
      }
    }
  }
  return out;
}
