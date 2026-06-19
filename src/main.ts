import './style.css';
import { Engine } from './engine/Engine';
import { Input } from './engine/Input';
import { AudioManager } from './engine/Audio';
import { Game } from './game/Game';
import { Overlays } from './ui/Overlays';
import { dropConfig } from './game/content/dropConfig';
import { drawPlayer } from './game/entities/PlayerRenderer';
import { FpsMeter } from './ui/FpsMeter';
import { loadRenderScale, loadFullscreenPref } from './game/settings';
import { initI18n } from './i18n';
// Side-effect: a böngészőbe mentett pályákat betölti (helyben felülírja a MAPS-ot),
// hogy a szerkesztett pályák a játékban is érvényesüljenek, ne csak az editorban.
import './game/level/mapStore';
// A verzió kanonikus helye a package.json — futásidőben olvassuk, így a lábléc
// (és bárhol máshol) elég itt egy helyen módosítani; dev-ben azonnal frissül.
import { version as APP_VERSION } from '../package.json';

function init() {
  // A mentett JÁTÉK-nyelv alkalmazása a statikus menü-DOM-ra (az admin magyar marad).
  initI18n();

  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game canvas nem található');
  }

  // A grafika teljesen procedurális (kódból rajzolt), nincs előtöltendő asset.
  const engine = new Engine(canvas);
  const input = new Input();
  const audio = new AudioManager();
  const overlays = new Overlays();

  // Sample-alapú narráció (a public/voice mappából szolgálva, lusta betöltéssel).
  // A narrátor a főmenüben GOMBRA indul (nem automatikusan); a nim/sentex a játék
  // közben szólal meg, amikor az audio-context már fel van oldva.
  // BASE_URL-relatív útvonalak, hogy GitHub Pages-en (alkönyvtárból) is betöltsenek.
  const voiceBase = import.meta.env.BASE_URL;
  audio.registerVoice('narrator', `${voiceBase}voice/narrator.mp3`);
  audio.registerVoice('nim', `${voiceBase}voice/nim.mp3`);
  audio.registerVoice('sentex', `${voiceBase}voice/sentex.mp3`);

  // Sample-alapú háttérzene (Kevin MacLeod / incompetech.com, CC-BY 4.0 — lásd
  // public/music/CREDITS.md). Fejezetenként más „calm" hangulat + közös harci
  // (combat) track-ek → a zene nem egyhangú. Lustán töltődik első használatkor.
  const musicBase = `${voiceBase}music/`;
  audio.registerMusic('menu', `${musicBase}Echoes_of_Time_v2.mp3`);   // főmenü
  audio.registerMusic('pince', `${musicBase}Hush.mp3`);               // Pince
  audio.registerMusic('ureg', `${musicBase}Long_Note_Four.mp3`);      // Üreg
  audio.registerMusic('melyseg', `${musicBase}Anguish.mp3`);          // Mélység
  audio.registerMusic('necropolis', `${musicBase}Ossuary_1_-_A_Beginning.mp3`); // Necropolis
  audio.registerMusic('dragonlair', `${musicBase}Darkling.mp3`);      // Dragon's Lair
  audio.registerMusic('combat1', `${musicBase}Crypto.mp3`);           // harc A
  audio.registerMusic('combat2', `${musicBase}Heavy_Interlude.mp3`);  // harc B

  const game = new Game(engine, audio, input, overlays);

  // Fejlesztői debug-hozzáférés + dev-only UI (Admin menü) csak dev buildben.
  if (import.meta.env.DEV) {
    document.body.classList.add('dev');
    (window as unknown as { __sentex: unknown }).__sentex = { engine, game, world: game.world, dropConfig };
    // Admin-felület LAZÁN, dev-only: production buildben (import.meta.env.DEV=false)
    // ez az ág halott kód → a dinamikus import és vele a teljes `src/admin` kiesik a
    // bundle-ből (tree-shake), és a publikus tükörből a mappa egyben kihagyható.
    import('./admin/AdminController').then(({ AdminControllerImpl }) => {
      game.registerAdmin(new AdminControllerImpl(game.adminHost()));
    });
  }

  // Némítás kapcsoló (M)
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') audio.toggleMute();
  });

  // Lábléc (minden lapon lent középen): cím · verzió · csapat.
  const hint = document.querySelector('.hint');
  if (hint) hint.textContent = `Sentex: The Cellar · v${APP_VERSION} · © Easyskill Team`;

  // A főmenü jobb oldalán a karakter; a szeme az egeret követi.
  let eyeX = 0, eyeY = 1;
  drawMenuCharacter(eyeX, eyeY);
  addEventListener('resize', () => drawMenuCharacter(eyeX, eyeY));
  addEventListener('mousemove', (e) => {
    const menu = document.getElementById('menu');
    if (!menu || menu.classList.contains('hidden')) return;
    const cv = document.getElementById('menuChar');
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    if (rect.width === 0) return;          // rejtett (kis képernyő)
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.4;
    eyeX = Math.max(-1, Math.min(1, (e.clientX - cx) / 200));
    eyeY = Math.max(-1, Math.min(1, (e.clientY - cy) / 200));
    drawMenuCharacter(eyeX, eyeY);
  });

  engine.setRenderScale(loadRenderScale());   // mentett render-felbontás alkalmazása
  new FpsMeter(engine);   // valós FPS-kijelző (jobb lent), a Beállítások kapcsolja

  // Alapból teljes képernyő: a böngésző csak felhasználói gesztusból enged
  // fullscreent, ezért az ELSŐ kattintásra/billentyűre lépünk be (ha a beállítás
  // engedi). Egyszeri: a listener saját magát távolítja el.
  const goFullscreenOnce = (): void => {
    removeEventListener('pointerdown', goFullscreenOnce);
    removeEventListener('keydown', goFullscreenOnce);
    if (loadFullscreenPref() && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };
  addEventListener('pointerdown', goFullscreenOnce);
  addEventListener('keydown', goFullscreenOnce);

  engine.start(game);
}

/**
 * A főmenü dekoratív karakterét rajzolja a saját kis canvasára. A `dirX/dirY` a
 * tekintet iránya (a szem pupillája arra néz) — az egérkövetés ezt állítja.
 */
function drawMenuCharacter(dirX = 0, dirY = 1): void {
  const cv = document.getElementById('menuChar');
  if (!(cv instanceof HTMLCanvasElement)) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  const W = 360, H = 480, r = 110;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(W * dpr);
  if (cv.width !== cw) {           // méretezés csak init/resize-kor (nem minden egérmozgásnál)
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    cv.width = cw;
    cv.height = Math.round(H * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawPlayer(ctx, {
    x: W / 2, y: H / 2 - r * 0.2, r,
    dirX, dirY, walk: 0, lean: 0, invuln: 0, moving: false,
  });
}

// PWA: a service worker csak PRODUCTION buildben regisztrálódik (a dev HMR-t és a
// __save-* mentő-végpontokat ne zavarja). Relatív path → a GitHub Pages
// alkönyvtárban is helyes a scope. A PWA opcionális: hiba esetén csendben elmarad.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* PWA opcionális */ });
  });
}

init();
