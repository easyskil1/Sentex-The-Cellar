/**
 * Az admin-felület SEMLEGES csatolófelülete a játék felé.
 *
 * A `Game` csak ezeket az interfészeket ismeri - nincs egyetlen `src/admin`
 * import sem benne. A tényleges admin-vezérlő (`src/admin/AdminController.ts`)
 * dev-only, és a `main.ts` `import.meta.env.DEV` ága dinamikus `import()`-tal
 * tölti be + regisztrálja. Így production buildből tree-shakinggel kiesik, és a
 * publikus tükörből a teljes `src/admin` mappa kihagyható (a Game ettől fordul).
 */
import type { World } from './World';
import type { Input } from '../engine/Input';
import type { AudioManager } from '../engine/Audio';
import type { Overlays, OverlayAction } from '../ui/Overlays';

/** A `Game` által az adminnak nyújtott szolgáltatások. */
export interface AdminHost {
  readonly world: World;
  readonly audio: AudioManager;
  readonly input: Input;
  readonly overlays: Overlays;
  /** Admin -> friss játékba lépés (state='play' + overlay-k elrejtése). */
  enterPlay(): void;
  /** Az 'admin' állapot beállítása a Game állapotgépében. */
  setAdminState(): void;
}

/** Az admin-vezérlő felülete; az impl a `src/admin`-ban él (dev-only). */
export interface AdminController {
  /** Belépés az admin nézetbe (főmenü ADMIN gomb). */
  open(): void;
  /** Kilépés + takarítás (pl. főmenübe vagy játékba lépéskor). */
  close(): void;
  /** Képkockánkénti bemenet-poll az 'admin' állapotban (canvas csempe-szerkesztő). */
  update(): void;
  /** Canvas-rajz az 'admin' állapotban (szerkesztő, vagy eszköz-háttér törlése). */
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  /** admin-* overlay-akciók (fülváltás). */
  action(a: OverlayAction): void;
}
