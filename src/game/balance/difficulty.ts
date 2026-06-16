/**
 * NEHÉZSÉG-SZÁMÍTÁS
 *
 * Egyetlen helyről adja meg, milyen erősek az ellenfelek egy adott szinten,
 * az adott játékos-erő mellett. Minden ADDITÍV (lásd tuning.ts):
 *
 *   szorzó = 1 + (szint-1) * floorSlope + jatekosEro * powerFactor
 *
 * - HP-szorzó: tört érték (az ellenfél életereje folytonos).
 * - Sebzés-szorzó: a sebzés fél-szívekben EGÉSZ, ezért egészre kerekítjük,
 *   és sosem engedjük a bázis sebzés alá (csak nőhet).
 *
 * A BOSSOK NEM skálázódnak (TUNING.boss.scalesWithDepth=false) — őket ez a
 * modul nem érinti, fix statjaik vannak (lásd Boss.ts / Boss2.ts / tuning.ts).
 */

import { TUNING } from './tuning';
import { itemPower } from './itemPower';
import { chapterDifficultyMul } from '../level/levels';

/** A minimum, amit egy játékostól tudnunk kell az erő-számításhoz. */
export interface PowerSource {
  collected: ReadonlyArray<{ name: string }>;
}

/** A felvett itemek erő-pontjainak összege (additív build-erő). */
export function playerPower(p: PowerSource | null | undefined): number {
  if (!p) return 0;
  let sum = 0;
  for (const it of p.collected) sum += itemPower(it.name);
  return sum;
}

export interface EnemyScale {
  /** Életerő-szorzó (tört). */
  hp: number;
  /** Sebzés-szorzó (tört; az Enemy egészre kerekíti, bázis alá nem mehet). */
  atk: number;
}

export const NO_SCALE: EnemyScale = { hp: 1, atk: 1 };

/** Ellenfél-erő egy adott szinten + NYERS játékos-erő (pont) mellett. */
export function enemyScaleFromPower(floor: number, power: number): EnemyScale {
  const f = Math.max(0, Math.floor(floor) - 1);
  const p = Math.max(0, power);
  return {
    // a globális alap-szorzó az egész görbét a játékos kimenő sebzéséhez igazítja,
    // a fejezet-szintű difficultyMul pedig opcionális világonkénti finomhangolás
    hp: TUNING.enemyHpBase * (1 + f * TUNING.hpFloorSlope + p * TUNING.hpPowerFactor) * chapterDifficultyMul(floor),
    // a SEBZÉS csak a mélységtől függ (nem a build erejétől) — lásd enemyDamageMul
    atk: enemyDamageMul(floor),
  };
}

/**
 * GLOBÁLIS bejövő-sebzés szorzó a MÉLYSÉG alapján (Binding of Isaac-minta: a
 * fél-szív találatok a mély szinteken teljes szívvé válnak). Egyetlen helyen
 * dől el, és MINDEN nem-boss ellenfél sebzésére hat — lövedék, érintés ÉS
 * talaj-veszély egyaránt —, mert a World.damagePlayer alkalmazza. A plafon
 * (enemyDmgMaxMul) gondoskodik róla, hogy a mély szinteken se szálljon el.
 *
 * Szándékosan NEM függ a játékos erejétől: a saját buildünk ne tegye keményebbé
 * a bejövő sebzést (ez igazságtalannak hatna; lásd a műfaji best-practice-t).
 */
export function enemyDamageMul(floor: number): number {
  const f = Math.max(0, Math.floor(floor) - 1);
  return Math.min(TUNING.enemyDmgMaxMul, 1 + f * TUNING.atkFloorSlope);
}

/**
 * Egy bejövő nyers sebzés-érték a mélységgel skálázva, fél-szív egészre
 * kerekítve (de sosem kevesebb, mint 1 fél-szív). A bossok és a játékos saját
 * robbanása ezt KIKERÜLI (raw), mert azok szándékosan fix sebzésűek.
 */
export function scaleIncomingDamage(amount: number, floor: number): number {
  return Math.max(1, Math.round(amount * enemyDamageMul(floor)));
}

/** Ellenfél-erő egy adott szinten + a játékos tényleges buildje mellett. */
export function enemyScale(floor: number, source: PowerSource | null): EnemyScale {
  return enemyScaleFromPower(floor, playerPower(source));
}

/** Szerencse-állvány esélye, hogy EXTRA itemet ad (a játékos luck-ja alapján). */
export function luckStandChance(luck: number): number {
  const c = TUNING.luckBase + Math.max(0, luck) * TUNING.luckPerLuck;
  return Math.min(TUNING.luckMax, c);
}
