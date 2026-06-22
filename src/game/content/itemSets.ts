/**
 * SZETT-BÓNUSZOK („Rendek") - tag-alapú, tematikus halmaz-jutalmak.
 *
 * Minden tárgy hordozhat egy vagy több `ItemTag`-et (lásd `items.ts`), és egy
 * `ItemTag` PONTOSAN egy `SetId`-nek felel meg. Ha a felvett tárgyak közt egy
 * címkéből összegyűlik egy KÜSZÖB (`SetTier.need`), a játékos egy tematikus
 * bónuszt kap. Ez egy ÚJ erő-tengely a meglévő, additív perk-rendszer fölött -
 * új tartalom nélkül, a már meglévő tárgyakból.
 *
 * MECHANIZMUS (inkrementális, dupla-alkalmazás nélkül): a felvétel-úton (lásd
 * `World.collectItem`) a frissen felvett tárgy minden címkéjére megnézzük az ÚJ
 * darabszámot; ha pont egy `tier.need`-et ér el, a `tier.apply(player)` egyszer
 * lefut. Mivel a számláló felvételenként +1-gyel nő, minden tier pontosan egyszer
 * sül el, amikor a küszöböt eléri. Új futásnál a `collected` üres → a bónuszok
 * maguktól nulláznak (nincs perzisztens állapot a Playeren).
 *
 * BALANSZ: minden elért tier `power`-pontja beleszámít a nehézségbe
 * (`difficulty.playerPower` += `setBonusPower`), hogy a szett-bónusz NE legyen
 * „láthatatlan" ingyen erő. A bónuszok additív/szorzó Player-statok (mind létezik
 * a Playeren), nem nyúlnak a DoT/lőmód-logikába → alacsony kockázat.
 *
 * ÖNAZONOSSÁG: saját, gótikus „Rend"-nevek (i18n), nem a forrás „tag"-jei.
 */
import type { Player } from '../entities/Player';
import { ITEMS, type ItemTag } from './items';

/** Egy szett azonosítója = egy tárgy-címke (`ItemTag`). */
export type SetId = ItemTag;

/** Egy szett egy KÜSZÖB-szintje (hány tag kell + a bónusz + erő-pont). */
export interface SetTier {
  /** Hány azonos címkéjű tárgy kell a bónusz aktiválásához. */
  need: number;
  /** A nehézséghez számító erő-pont (lásd `setBonusPower`). */
  power: number;
  /** i18n-kulcs a bónusz rövid leírásához (HUD/floater). */
  descKey: string;
  /** A bónusz alkalmazása a játékosra (additív/szorzó stat). */
  apply: (p: Player) => void;
}

/** Egy tematikus „Rend" (szett): név, szín és növekvő küszöb-szintek. */
export interface ItemSet {
  id: SetId;
  /** i18n-kulcs a szett nevéhez. */
  nameKey: string;
  /** A szett témaszíne (HUD-pont + aktiválás-floater). */
  color: string;
  /** Küszöb-szintek NÖVEKVŐ `need` szerint. */
  tiers: SetTier[];
}

/**
 * A négy harci „Rend" + a Kíséret. Mind a MEGLÉVŐ tárgyakból áll össze; a
 * relikviák (lőmód-váltók) szándékosan NEM tagjai egy szettnek sem (kölcsönösen
 * kizárók). A bónuszok mérete a Player-bázishoz igazítva (dmg 300, speed 230,
 * shotSpeed 320, fireRate 0.72), kissé szerényebben, mert a perk-hatás FÖLÉ jön.
 */
export const ITEM_SETS: Record<SetId, ItemSet> = {
  war: {
    id: 'war', nameKey: 'itemset.war.name', color: '#ff6a5a',
    tiers: [
      { need: 2, power: 5, descKey: 'itemset.war.b1', apply: (p) => { p.dmg += 120; } },
      { need: 3, power: 6, descKey: 'itemset.war.b2', apply: (p) => { p.dmg += 200; } },
    ],
  },
  elemental: {
    id: 'elemental', nameKey: 'itemset.elemental.name', color: '#ffb24a',
    tiers: [
      { need: 2, power: 5, descKey: 'itemset.elemental.b1', apply: (p) => { p.shotSpeed += 80; p.range += 0.25; } },
      { need: 3, power: 5, descKey: 'itemset.elemental.b2', apply: (p) => { p.dmg += 150; } },
      { need: 4, power: 5, descKey: 'itemset.elemental.b3', apply: (p) => { p.fireRate *= 0.92; } },
    ],
  },
  barrage: {
    id: 'barrage', nameKey: 'itemset.barrage.name', color: '#7fc4ff',
    tiers: [
      { need: 3, power: 5, descKey: 'itemset.barrage.b1', apply: (p) => { p.fireRate *= 0.9; } },
      { need: 5, power: 7, descKey: 'itemset.barrage.b2', apply: (p) => { p.shots += 1; p.spread += 0.2; } },
    ],
  },
  swift: {
    id: 'swift', nameKey: 'itemset.swift.name', color: '#9ad88f',
    tiers: [
      { need: 2, power: 4, descKey: 'itemset.swift.b1', apply: (p) => { p.speed += 36; } },
      { need: 4, power: 5, descKey: 'itemset.swift.b2', apply: (p) => { p.speed += 36; p.shotSpeed += 100; } },
    ],
  },
  familiar: {
    id: 'familiar', nameKey: 'itemset.familiar.name', color: '#aef3ff',
    tiers: [
      { need: 2, power: 6, descKey: 'itemset.familiar.b1', apply: (p) => { p.orbitals += 1; } },
    ],
  },
};

/** Stabil rendezett szett-lista (HUD-sorrend). */
export const SET_ORDER: readonly SetId[] = ['war', 'elemental', 'barrage', 'swift', 'familiar'];

/** Név → szett-címkék térkép (az `ITEMS`-ből, egyszer). A nehézség is ezt használja. */
const TAGS_BY_NAME = new Map<string, readonly SetId[]>();
for (const it of ITEMS) if (it.tags && it.tags.length) TAGS_BY_NAME.set(it.name, it.tags);

/** Egy felvett tárgy szett-címkéi (névről; ismeretlenre üres). */
export function tagsOf(name: string): readonly SetId[] {
  return TAGS_BY_NAME.get(name) ?? [];
}

/** Hány felvett tárgy hordozza az adott szett-címkét. */
export function setCount(collected: ReadonlyArray<{ name: string }>, id: SetId): number {
  let n = 0;
  for (const it of collected) if (tagsOf(it.name).includes(id)) n++;
  return n;
}

/** Az adott darabszámnál ELÉRT legmagasabb tier (vagy null, ha egy sincs). */
export function reachedTier(set: ItemSet, count: number): SetTier | null {
  let best: SetTier | null = null;
  for (const t of set.tiers) if (count >= t.need) best = t;
  return best;
}

/** A PONTOSAN ennél a darabszámnál aktiválódó tier (küszöb-átlépéskor; vagy null). */
export function tierAtExactly(set: ItemSet, count: number): SetTier | null {
  return set.tiers.find((t) => t.need === count) ?? null;
}

/**
 * A felvett tárgyakból aktív szett-bónuszok ÖSSZESÍTETT erő-pontja (a nehézség
 * ezt adja a build-erőhöz, hogy a szett ne legyen ingyen power-spike).
 */
export function setBonusPower(collected: ReadonlyArray<{ name: string }>): number {
  let sum = 0;
  for (const id of SET_ORDER) {
    const t = reachedTier(ITEM_SETS[id], setCount(collected, id));
    if (t) {
      // az ELÉRT tier ÉS minden alatta lévő (alacsonyabb need) power-ja összeadódik
      for (const tier of ITEM_SETS[id].tiers) if (tier.need <= t.need) sum += tier.power;
    }
  }
  return sum;
}

/** A HUD-hoz: minden szett pillanatnyi állapota (csak amiből van legalább 1 db). */
export interface SetProgress {
  set: ItemSet;
  count: number;
  /** Az elért legmagasabb tier (vagy null). */
  active: SetTier | null;
  /** A következő, még el nem ért tier `need`-je (vagy null, ha maxon van). */
  nextNeed: number | null;
}

export function setProgress(collected: ReadonlyArray<{ name: string }>): SetProgress[] {
  const out: SetProgress[] = [];
  for (const id of SET_ORDER) {
    const set = ITEM_SETS[id];
    const count = setCount(collected, id);
    if (count === 0) continue;
    const active = reachedTier(set, count);
    const next = set.tiers.find((t) => t.need > count);
    out.push({ set, count, active, nextNeed: next ? next.need : null });
  }
  return out;
}
