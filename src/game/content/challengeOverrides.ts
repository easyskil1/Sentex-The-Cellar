import type { ChalEdit } from './challenges';

/**
 * Szerkesztett kihívás-stat felülírások (CSAK a gyári `DEFAULT_CHALLENGES`-tól eltérők).
 * Az Admin · PRÓBA lap „Mentés fájlba" gombja írja felül (dev Vite plugin,
 * `/__save-challenges`). Üres objektum = minden a gyári érték szerint.
 */
export const CHALLENGE_OVERRIDES: Record<string, Partial<ChalEdit>> = {};
