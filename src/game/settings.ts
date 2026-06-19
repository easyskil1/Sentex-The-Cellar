/**
 * Játék-beállítások perzisztenciája (localStorage). Egy helyen a grafikai,
 * hang- és irányítás-beállítások betöltő/mentő függvényei, hogy a Beállítások
 * lap és a motor ugyanazokat a kulcsokat használja.
 */

import { DEFAULT_BINDS, type InputAction } from '../engine/Input';

/* ----------------------------- Grafika ----------------------------- */

/**
 * Vetett árnyék minősége (teljesítmény ↔ látvány):
 *  - `off`  : nincs árnyékvetés, a fáklya egyszerű kör-fény (a legdrágább lépést,
 *             a láthatóság-számítást kihagyja) — gyenge gépen a legolcsóbb,
 *  - `hard` : kerek (idom-követő) árnyék, teljes felbontás, éles perem,
 *  - `soft` : ugyanaz lágy peremmel (penumbra) — kicsivel drágább kompozit.
 */
export type ShadowMode = 'off' | 'hard' | 'soft';

const SHADOW_KEY = 'sentex_shadows';
const SHADOW_MODES: readonly ShadowMode[] = ['off', 'hard', 'soft'];

/** A mentett árnyék-mód (alapértelmezés: `hard` - kerek árnyék, jó teljesítmény). */
export function loadShadowMode(): ShadowMode {
  const v = localStorage.getItem(SHADOW_KEY) ?? '';
  return (SHADOW_MODES as readonly string[]).includes(v) ? (v as ShadowMode) : 'hard';
}

export function saveShadowMode(mode: ShadowMode): void {
  localStorage.setItem(SHADOW_KEY, mode);
}

/** Képernyőrázás-erősség szorzója (0 = kikapcsolva, 1 = teljes). */
const SHAKE_KEY = 'sentex_shake';
export function loadShake(): number {
  return loadUnit(SHAKE_KEY, 1);
}
export function saveShake(v: number): void {
  saveUnit(SHAKE_KEY, v);
}

/** Valós FPS-számláló megjelenítése a jobb alsó sarokban. Alap: kikapcsolva. */
const FPS_KEY = 'sentex_fps';
export function loadFpsShown(): boolean {
  return localStorage.getItem(FPS_KEY) === '1';
}
export function saveFpsShown(v: boolean): void {
  localStorage.setItem(FPS_KEY, v ? '1' : '0');
}

/**
 * „Játékérzet"-effektek (csőtorkolat-villanás, lövés-visszarúgás, kamera-kick).
 * Tisztán vizuális/élmény-réteg, nincs teljesítmény-kockázat. Alap: BE.
 * (A hit-stop külön kapcsoló, mert az a `dt`-t érinti - lásd `loadHitStop`.)
 */
const GAMEFEEL_KEY = 'sentex_gamefeel';
export function loadGameFeel(): boolean {
  return localStorage.getItem(GAMEFEEL_KEY) !== '0';
}
export function saveGameFeel(v: boolean): void {
  localStorage.setItem(GAMEFEEL_KEY, v ? '1' : '0');
}

/**
 * Hit-stop („sleep"): pár frame megfagyasztás ütős pillanatban (ölés / sérülés).
 * KÜLÖN kapcsoló a game-feltől, mert a `dt`-t érinti (sokan zavarónak találják),
 * és a memória is óvatosságra int (mozgással tesztelni). Alap: BE.
 */
const HITSTOP_KEY = 'sentex_hitstop';
export function loadHitStop(): boolean {
  return localStorage.getItem(HITSTOP_KEY) !== '0';
}
export function saveHitStop(v: boolean): void {
  localStorage.setItem(HITSTOP_KEY, v ? '1' : '0');
}

/** Render-felbontás szorzó (teljesítmény ↔ élesség): 1 / 0.75 / 0.5. Alap: teljes. */
const RSCALE_KEY = 'sentex_rscale';
export function loadRenderScale(): number {
  const v = parseFloat(localStorage.getItem(RSCALE_KEY) ?? '');
  return v === 0.5 || v === 0.75 || v === 1 ? v : 1;
}
export function saveRenderScale(v: number): void {
  localStorage.setItem(RSCALE_KEY, String(v));
}

/**
 * Teljes képernyő preferencia. Alapértelmezetten BE: a böngésző csak felhasználói
 * gesztusból enged fullscreent, ezért ezt az első kattintásnál/billentyűnél
 * alkalmazzuk (lásd main.ts). A Beállítások kapcsolója felülírja és megőrzi.
 */
const FS_KEY = 'sentex_fullscreen';
export function loadFullscreenPref(): boolean {
  const v = localStorage.getItem(FS_KEY);
  return v === null ? true : v === '1';
}
export function saveFullscreenPref(v: boolean): void {
  localStorage.setItem(FS_KEY, v ? '1' : '0');
}

/* ------------------------------- Hang ------------------------------ */

const MUSIC_VOL_KEY = 'sentex_music_vol';
const SFX_VOL_KEY = 'sentex_sfx_vol';

/** Zene-hangerő (0..1). Alap: 0.55 - a hangeffektekhez kiegyensúlyozva. */
export function loadMusicVolume(): number {
  return loadUnit(MUSIC_VOL_KEY, 0.55);
}
export function saveMusicVolume(v: number): void {
  saveUnit(MUSIC_VOL_KEY, v);
}

/** Hangeffekt-hangerő (0..1). Alap: 1 (a belső alap-szint fölött szoroz). */
export function loadSfxVolume(): number {
  return loadUnit(SFX_VOL_KEY, 1);
}
export function saveSfxVolume(v: number): void {
  saveUnit(SFX_VOL_KEY, v);
}

/* ----------------------------- Irányítás --------------------------- */

const KEYS_KEY = 'sentex_keys';

/** A mentett kiosztás a gyári fölött (érvénytelen kulcsokat eldobja). */
export function loadBinds(): Record<InputAction, string> {
  const out: Record<InputAction, string> = { ...DEFAULT_BINDS };
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS_KEY) ?? '{}') as Record<string, unknown>;
    for (const a of Object.keys(DEFAULT_BINDS) as InputAction[]) {
      const v = raw[a];
      if (typeof v === 'string' && v.length > 0) out[a] = v;
    }
  } catch {
    /* hibás mentés → gyári */
  }
  return out;
}

export function saveBinds(binds: Record<InputAction, string>): void {
  localStorage.setItem(KEYS_KEY, JSON.stringify(binds));
}

/** Egy átköthető akció UI-adata: címke + a csoport (a Beállítások lap rendezéséhez). */
export interface BindMeta {
  action: InputAction;
  label: string;
  group: 'move' | 'shoot' | 'action';
}

/** A Beállítások · Irányítás lap sorai (sorrend + angol címke, a játék-UI nyelvén). */
export const BIND_META: readonly BindMeta[] = [
  { action: 'up', label: 'Move up', group: 'move' },
  { action: 'down', label: 'Move down', group: 'move' },
  { action: 'left', label: 'Move left', group: 'move' },
  { action: 'right', label: 'Move right', group: 'move' },
  { action: 'shoot-up', label: 'Shoot up', group: 'shoot' },
  { action: 'shoot-down', label: 'Shoot down', group: 'shoot' },
  { action: 'shoot-left', label: 'Shoot left', group: 'shoot' },
  { action: 'shoot-right', label: 'Shoot right', group: 'shoot' },
  { action: 'skill', label: 'Active skill', group: 'action' },
  { action: 'bomb', label: 'Drop bomb', group: 'action' },
  { action: 'tnt', label: 'Throw TNT', group: 'action' },
  { action: 'pause', label: 'Pause', group: 'action' },
];

/** A nyers `e.key` érték olvasható címkéje a billentyű-cellához (pl. `arrowup` → `↑`). */
export function keyLabel(key: string): string {
  if (!key) return '—';
  const map: Record<string, string> = {
    arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
    ' ': 'Space', escape: 'Esc', enter: 'Enter', tab: 'Tab',
    control: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Meta', backspace: '⌫',
  };
  return map[key] ?? key.toUpperCase();
}

/* ------------------------------ közös ------------------------------ */

/** 0..1 közé szorított érték betöltése (érvénytelen/hiányzó → alap). */
function loadUnit(key: string, def: number): number {
  const v = parseFloat(localStorage.getItem(key) ?? '');
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : def;
}

function saveUnit(key: string, v: number): void {
  localStorage.setItem(key, String(Math.max(0, Math.min(1, v))));
}
