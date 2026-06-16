/**
 * BALANSZ-REGISZTER — minden játék-adat EGY helyen, számolható nézetekkel.
 *
 * Ez az "agy": ide fut be a pályák (MAPS), ellenfelek (ENEMY_STATS), itemek
 * (ITEMS + ITEM_POWER), fejezetek (CHAPTERS) és drop-esélyek minden adata, és
 * innen lehet kiszámolni / áttekinteni a nehézséget, esélyeket, fenyegetést.
 *
 * Használat (dev-konzol):  import('./game/balance/registry').then(m => console.log(m.balanceReport()))
 * vagy egyszerűen:         balanceReport()  egy jövőbeli admin-lapon.
 */

import { MAPS } from '../level/maps';
import { CHAPTERS } from '../level/levels';
import { ENEMY_STATS, type EnemyKind } from '../entities/enemies/enemyTypes';
import { ITEMS } from '../content/items';
import { dropConfig, netSum } from '../content/dropConfig';
import { ITEM_POWER, itemPower } from './itemPower';
import { enemyScaleFromPower, luckStandChance } from './difficulty';

// ---- Ellenfelek ----

/** Egy ellenfél nyers "fenyegetettsége" (durva összemérés): HP × sebzés × sebesség-faktor. */
export function enemyThreat(kind: EnemyKind): number {
  const s = ENEMY_STATS[kind];
  return Math.round(s.hp * Math.max(1, s.dmg) * (0.5 + s.speed / 160));
}

export function enemySummary() {
  return (Object.keys(ENEMY_STATS) as EnemyKind[])
    .map((k) => ({ kind: k, hp: ENEMY_STATS[k].hp, dmg: ENEMY_STATS[k].dmg, speed: ENEMY_STATS[k].speed, threat: enemyThreat(k) }))
    .sort((a, b) => a.threat - b.threat);
}

// ---- Itemek ----

/** Item-erő nézet + validáció: jelzi, ha egy itemnek nincs ITEM_POWER bejegyzése. */
export function itemSummary() {
  return ITEMS.map((it) => ({
    name: it.name,
    desc: it.desc,
    power: itemPower(it.name),
    hasPower: it.name in ITEM_POWER,
    isSkill: !!it.skill,
  })).sort((a, b) => b.power - a.power);
}

/** Azok az itemek, amiknek hiányzik az erő-pontja (DEFAULT_POWER számít rájuk). */
export function itemsMissingPower(): string[] {
  return ITEMS.filter((it) => !(it.name in ITEM_POWER)).map((it) => it.name);
}

/** Elméleti MAX játékos-erő N szint alatt (1 garantált item/pálya + szerencse-állvány). */
export function maxPlayerPower(floors: number, withLuckStand = true): number {
  const top = Math.max(...ITEMS.map((it) => itemPower(it.name)));
  const perFloor = withLuckStand ? 2 : 1; // pedesztál + (esélyes) állvány
  return top * perFloor * Math.max(0, floors);
}

// ---- Fejezetek ----

export function chapterSummary() {
  let start = 1;
  // Csak a kampány-világok kerülnek a balansz-létrába; a dungeon/különleges
  // pályák nincsenek a globális ívben.
  return CHAPTERS.filter((ch) => ch.category === 'fejezet').map((ch) => {
    const range = { start, end: start + ch.floors - 1 };
    start += ch.floors;
    return {
      name: ch.name,
      floors: ch.floors,
      range,
      enemies: ch.enemyKinds,
      normalTemplates: MAPS[ch.id]?.normal.length ?? 0,
      bossTemplates: MAPS[ch.id]?.boss.length ?? 0,
      boss: ch.bossName,
    };
  });
}

// ---- Nehézség-görbe ----

/** Szintenkénti ellenfél-szorzók egy adott (fix) játékos-erő mellett — előnézet. */
export function difficultyCurve(maxFloor: number, atPower = 0) {
  const rows = [];
  for (let f = 1; f <= maxFloor; f++) {
    const s = enemyScaleFromPower(f, atPower);
    rows.push({ floor: f, hpMul: +s.hp.toFixed(3), atkMul: +s.atk.toFixed(3) });
  }
  return rows;
}

// ---- Drop-esélyek ----

export function dropOdds() {
  const n = dropConfig.nets;
  const sum = netSum();
  const roomChance = Math.min(1, sum);
  const odds = sum > 0 ? { coin: n.coin / sum, bomb: n.bomb / sum, heart: n.heart / sum, tnt: n.tnt / sum } : { coin: 0, bomb: 0, heart: 0, tnt: 0 };
  return { roomChance, odds };
}

// ---- Összefoglaló riport (konzolra) ----

export function balanceReport(): string {
  const L: string[] = [];
  L.push('═══ BALANSZ-RIPORT ═══');

  L.push('\n• Fejezetek:');
  for (const c of chapterSummary()) {
    L.push(`   ${c.name}  (szint ${c.range.start}–${c.range.end})  ellenfelek: ${c.enemies.join(', ')}  boss: ${c.boss}  [${c.normalTemplates} pálya]`);
  }

  L.push('\n• Nehézség-görbe (üres build, power=0):');
  for (const r of difficultyCurve(8)) L.push(`   szint ${r.floor}:  HP ×${r.hpMul}   sebzés ×${r.atkMul}`);

  L.push('\n• Nehézség-görbe (erős build, power=60):');
  for (const r of difficultyCurve(8, 60)) L.push(`   szint ${r.floor}:  HP ×${r.hpMul}   sebzés ×${r.atkMul}`);

  L.push('\n• Itemek erő szerint:');
  for (const it of itemSummary()) L.push(`   ${String(it.power).padStart(3)}  ${it.name}${it.isSkill ? '  (skill)' : ''}${it.hasPower ? '' : '  ⚠ nincs pont'}`);

  const missing = itemsMissingPower();
  if (missing.length) L.push(`\n⚠ Itemek erő-pont nélkül: ${missing.join(', ')}`);

  L.push('\n• Szerencse-állvány esély: ' +
    [0, 2, 4, 6].map((lk) => `luck ${lk}→${Math.round(luckStandChance(lk) * 100)}%`).join('  '));

  const d = dropOdds();
  L.push(`\n• Szoba-drop: ${Math.round(d.roomChance * 100)}%  ` +
    `(coin ${Math.round(d.odds.coin * 100)}%, bomb ${Math.round(d.odds.bomb * 100)}%, heart ${Math.round(d.odds.heart * 100)}%, tnt ${Math.round(d.odds.tnt * 100)}%)`);

  L.push('\n• Boss skálázódik a mélységgel: NEM (fix statok)');

  return L.join('\n');
}
