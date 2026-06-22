import type { CharEdit } from './characters';

/**
 * Szerkesztett vándor-stat felülírások (CSAK a gyári `DEFAULT_CHARACTERS`-tól eltérők).
 * Az Admin · VÁNDOR lap „Mentés fájlba" gombja írja felül (dev Vite plugin,
 * `/__save-characters`). Üres objektum = minden a gyári érték szerint.
 */
export const CHARACTER_OVERRIDES: Record<string, Partial<CharEdit>> = {};
