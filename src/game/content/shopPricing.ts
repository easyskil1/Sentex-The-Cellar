/**
 * SZERENCSE-BOLT ÁRAZÁS
 *
 * A boltban minden ár ÉRMÉBEN (¢) van, és a „mennyit ér" logikából származik —
 * azaz a kiszámítható drop-esélyekhez és az item-erőhöz kötött:
 *
 *   - Itemek / skillek:  az item-erő pontból (itemPower). Erősebb build-elem =
 *     drágább. Lineáris leképezés (gyenge ~10¢ … legerősebb ~22¢).
 *   - Fogyóeszközök (bomba / tnt / szív):  egy bázis-ár, amelyet a SZABAD-DROP
 *     ritkasága told. Ha az Admin · Esély lapon ritkábbra állítjuk a típust,
 *     drágább lesz (nehezebb ingyen szerezni). Alapbeállításnál a bázis-árat adja.
 *     A bomba a legolcsóbb.
 *
 * A sorsoló-gép és az újrasorsolás árai is innen jönnek, hogy egy helyen
 * legyen hangolható a bolt-ökonómia.
 */
import type { Item } from './items';
import { itemPower } from '../balance/itemPower';
import { dropConfig, DEFAULT_NETS } from './dropConfig';

export type ConsumableKind = 'bomb' | 'tnt' | 'heart';

/** Fogyóeszköz bázis-árak (alap drop-esélynél). Bomba a legolcsóbb. */
const CONSUMABLE_BASE: Record<ConsumableKind, number> = { bomb: 3, tnt: 6, heart: 7 };

/** Egy item (vagy skill-item) ára: az erő-pontból lineárisan, alsó korláttal. */
export function itemPrice(item: Item): number {
  return Math.max(3, Math.round(9 + itemPower(item.name) * 0.72));
}

/** Egy fogyóeszköz ára: bázis × ritkasági szorzó (ritkább a szabad dropban → drágább). */
export function consumablePrice(kind: ConsumableKind): number {
  const ref = DEFAULT_NETS[kind];
  const cur = dropConfig.nets[kind];
  const rarity = cur > 0 ? ref / cur : 1;
  return Math.max(1, Math.round(CONSUMABLE_BASE[kind] * rarity));
}

/** A sorsoló-gép egy húzásának ára. */
export const GAMBLE_COST = 5;

/** Az újrasorsolás (reroll) ára: minden használattal nő (a kísértés ára). */
export function rerollPrice(timesUsed: number): number {
  return 6 + timesUsed * 4;
}

/** A sorsoló-gép egy húzásának lehetséges kimenetelei. */
export type GambleOutcome =
  | { kind: 'nothing' }
  | { kind: 'coins'; amount: number }
  | { kind: 'bomb' }
  | { kind: 'tnt' }
  | { kind: 'heart' }
  | { kind: 'item' };

/**
 * Súlyozott sorsolás. A játékos SZERENCSÉJE (luck) a rossz kimenetelt a jó felé
 * tolja: kevesebb „semmi", több nyeremény és nagyobb jackpot-esély. A költséget
 * (GAMBLE_COST) a hívó vonja le; ez csak a nyereményt dönti el.
 *
 * Nyeremények: pénz (1–6 érme, max 6), bomba (1 db), TNT (1 db), szív, vagy
 * ritka jackpot-tárgy. Nyeremény nélkül: `nothing`.
 */
export function rollGamble(luck: number): GambleOutcome {
  const l = Math.max(0, luck);
  const coinWin = 1 + Math.floor(Math.random() * 6); // 1..6 érme (6 a maximum)
  const weights: Array<[GambleOutcome, number]> = [
    [{ kind: 'nothing' }, Math.max(6, 28 - l * 3)],
    [{ kind: 'coins', amount: coinWin }, 30],
    [{ kind: 'bomb' }, 13], // max 1 db
    [{ kind: 'tnt' }, 9],   // max 1 db
    [{ kind: 'heart' }, 8],
    [{ kind: 'item' }, 4 + l * 1.5], // jackpot
  ];
  let total = 0;
  for (const [, w] of weights) total += w;
  let r = Math.random() * total;
  for (const [out, w] of weights) {
    if ((r -= w) < 0) return out;
  }
  return { kind: 'nothing' };
}
