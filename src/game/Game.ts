import type { Engine, EngineCallbacks } from '../engine/Engine';
import type { AudioManager } from '../engine/Audio';
import type { Input } from '../engine/Input';
import type { Overlays, OverlayAction } from '../ui/Overlays';

import { World, type OfferView, type HubChoice } from './World';
import { drawHUD } from './HUD';
import {
  loadProfile,
  saveProfile,
  loadProgress,
  loadLeaderboard,
  resetAllProgress,
  rankInfo,
  finishRun,
  type Profile,
} from './progression';
import { loadStats, loadRecords, commitRun, resetAllStats } from './stats';
import { resetBestiary } from './bestiary';
import { loadMusicVolume, saveMusicVolume, loadSfxVolume, saveSfxVolume, loadBinds, saveBinds, loadFpsShown, saveFpsShown, loadRenderScale, saveRenderScale, saveFullscreenPref, loadGameFeel, saveGameFeel, loadHitStop, saveHitStop, loadThickTears, saveThickTears } from './settings';
import { DEFAULT_BINDS, type InputAction } from '../engine/Input';
import { generateLabyrinth } from './level/labyrinth';
import { CHAPTERS, resolveLevel, chapterName } from './level/levels';
import type { AdminController, AdminHost } from './adminHook';

type GameState = 'menu' | 'play' | 'pause' | 'over' | 'admin' | 'offer';

/**
 * A legfelső szintű játékvezérlő: állapotgép (menü / játék / szünet /
 * game over), amely az engine update–render hívásait a megfelelő helyre
 * irányítja, és kezeli a felületet.
 */
export class Game implements EngineCallbacks {
  private state: GameState = 'menu';
  readonly world: World;
  /** A legmélyebb elért szint (HUD-kijelzéshez); a progresszióból töltve. */
  private best: number;
  /** A helyi karakter-profil (név); `null`, amíg nincs megadva. */
  private profile: Profile | null;
  /** Melyik menü-képernyő aktív (a `menu` állapoton belül). */
  private menuScreen: 'main' | 'rank' | 'bestiary' | 'settings' | 'credits' = 'main';
  /** Megy-e épp a főmenü narrátora (a gomb szándék-állapota, nem a dekódolásé). */
  private narrationOn = false;
  /** Dev-only admin-vezérlő; a `main.ts` regisztrálja (production buildben null marad). */
  private admin: AdminController | null = null;

  constructor(
    private readonly engine: Engine,
    private readonly audio: AudioManager,
    private readonly input: Input,
    private readonly overlays: Overlays,
  ) {
    this.world = new World(engine, audio, input, {
      onGameOver: () => this.handleGameOver(),
      onOffer: (offer) => this.showOffer(offer),
    });
    this.best = loadProgress().bestFloor;
    this.profile = loadProfile();
    // mentett beállítások visszatöltése (hang, hangerő, billentyű-kiosztás;
    // az árnyék/rázás a World-ben töltődik). A némítás külön kulcsban él.
    if (localStorage.getItem('sentex_muted') === '1') this.audio.setMuted(true);
    this.audio.setMusicVolume(loadMusicVolume());
    this.audio.setSfxVolume(loadSfxVolume());
    this.input.setBinds(loadBinds());

    this.overlays.onAction = (a) => this.handleAction(a);
    this.overlays.onNameSubmit = (name) => this.handleNameSubmit(name);
    // Beállítás-csúszkák: azonnal alkalmaz + ment (újrarajzolás nélkül, hogy a
    // húzás folyamatos maradjon). A billentyű-átkötés viszont újrarajzol.
    this.overlays.onMusicVolume = (v) => { this.audio.setMusicVolume(v); saveMusicVolume(v); };
    this.overlays.onSfxVolume = (v) => { this.audio.setSfxVolume(v); saveSfxVolume(v); };
    this.overlays.onShake = (v) => this.world.setShakeScale(v);
    this.overlays.onRebind = (action: InputAction, key) => {
      this.input.setBind(action, key);
      saveBinds(this.input.bindings());
      this.showSettings();   // friss kiosztás kirajzolása (esetleges csere is látszik)
    };
    this.overlays.onResetBinds = () => {
      this.input.setBinds({ ...DEFAULT_BINDS });
      saveBinds(this.input.bindings());
      this.showSettings();
    };
    // A narrátor természetes végén a főmenü-gomb visszaáll „lejátszás" állapotba.
    this.audio.setVoiceEndedHandler((name) => {
      if (name !== 'narrator') return;
      this.narrationOn = false;
      this.overlays.setNarratorPlaying(false);
    });
    // World-beli KAPU: a játékos rálépett → a valódi karakterrel a labirintusba
    // (a world.startLabyrinth-en át), majd a kijáratnál vissza a kapuhoz.
    this.world.onEnterLabyrinth = () => this.enterLabyrinthFromWorld();
    // Hub-portál: a játékos egy NYITOTT portálra lépett → indítjuk a módot.
    this.world.onHubChoice = (id) => this.handleHubChoice(id);

    // Háttérnek mindig legyen érvényes pálya a menü mögött is.
    this.world.newGame();
    this.showMenu();
  }

  update(dt: number): void {
    this.input.pollGamepad();   // gamepad-állapot frissítése a getterek olvasása előtt
    this.updateMusic();
    // Hub (mód-választó, a world belsejében fut): ESC = vissza a főmenübe.
    if (this.world.isHub) {
      if (this.input.consumePause()) { this.showMenu(); return; }
      this.world.update(dt);
      return;
    }

    // Labirintus (a world belsejében fut): ESC = kilépés, egyébként a normál world-update.
    if (this.world.isLabyrinth) {
      if (this.input.consumePause()) { this.world.exitLabyrinth(); return; }
      this.world.update(dt);
      return;
    }

    if (this.input.consumePause()) {
      if (this.state === 'admin') this.showMenu();
      // a felugró ajánlat-ablak ESC-re (vagy P-re) bezárul = elutasítás
      else if (this.state === 'offer') this.handleAction('offer-decline');
      else this.togglePause();
    }

    if (this.state === 'play') {
      this.world.update(dt);
    } else if (this.state === 'admin') {
      this.admin?.update();
    } else {
      // menü / szünet / game over: csak az effektek élnek
      this.world.updateAmbient(dt);
    }
  }

  /** Fejezet-id → (calm, combat) zene-track. A calm a fejezet saját hangulata
   *  (ismeretlennél a Mélység), a combat fejezetenként váltakozik (A/B) a változatosságért. */
  private musicForChapter(id: string): { calm: string; combat: string } {
    const calmKnown = ['pince', 'ureg', 'melyseg', 'necropolis', 'dragonlair'];
    const calm = calmKnown.includes(id) ? id : 'melyseg';
    const combatB = id === 'ureg' || id === 'necropolis';
    return { calm, combat: combatB ? 'combat2' : 'combat1' };
  }

  /**
   * A zenei TÉMA vezérlése a játékállapotból (minden képkockában; a setMusicTheme
   * csak váltáskor cserél decket). Főmenü/hub/game-over → nyugodt menü-zene; harci
   * szoba/labirintus → a fejezet calm+combat párja. Szünet/ajánlat/admin alatt a
   * futó témát nem szakítjuk meg. Az intenzitás-crossfade-et a World adja (setMusicScene).
   */
  private updateMusic(): void {
    const s = this.state;
    if (s === 'pause' || s === 'offer' || s === 'admin') return;
    if (this.world.isHub) { this.audio.setMusicTheme('menu', null); return; }
    if (s === 'play') {
      const { calm, combat } = this.musicForChapter(this.world.chapterId);
      this.audio.setMusicTheme(calm, combat);
      return;
    }
    this.audio.setMusicTheme('menu', null);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'admin') {
      this.admin?.render(ctx, this.engine.width, this.engine.height);
      return;
    }

    if (this.state === 'menu') {
      this.drawMenuBackground(ctx);
    } else {
      this.world.render(ctx);
    }

    // A hubban (mód-választó) nincs harci HUD — a saját címsora/portáljai jelzik.
    if (!this.world.isHub && (this.state === 'play' || this.state === 'pause' || this.state === 'offer')) {
      drawHUD(ctx, this.world, this.best, this.engine.width, this.engine.height);
    }
  }

  private drawMenuBackground(ctx: CanvasRenderingContext2D): void {
    const w = this.engine.width;
    const h = this.engine.height;

    // Sötét, mély lila-fekete gradiens
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.8);
    g.addColorStop(0, '#1a1225');
    g.addColorStop(1, '#05040a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Finom atmoszférikus köd/részecskék
    this.world.particles.draw(ctx);
    
    // Egy kis díszítő keret vagy fénycsík az alján
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, h - 100, w, 100);
  }

  private handleAction(action: OverlayAction): void {
    switch (action) {
      case 'start':
        this.startGame();
        break;
      case 'resume':
        if (this.state === 'pause') this.togglePause();
        break;
      case 'menu':
        this.showMenu();
        break;
      case 'admin':
        this.showAdmin();
        break;
      case 'rank':
        this.showRank();
        break;
      case 'bestiary':
        this.showBestiary();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'credits':
        this.showCredits();
        break;
      case 'narrator':
        this.toggleNarration();
        break;
      case 'shadow-off':
        this.world.setShadowMode('off');
        break;
      case 'shadow-hard':
        this.world.setShadowMode('hard');
        break;
      case 'shadow-soft':
        this.world.setShadowMode('soft');
        break;
      case 'rscale-100':
        this.engine.setRenderScale(1); saveRenderScale(1);
        break;
      case 'rscale-75':
        this.engine.setRenderScale(0.75); saveRenderScale(0.75);
        break;
      case 'rscale-50':
        this.engine.setRenderScale(0.5); saveRenderScale(0.5);
        break;
      case 'toggle-fullscreen':
        this.toggleFullscreen();
        break;
      case 'toggle-fps':
        saveFpsShown(!loadFpsShown());
        this.showSettings();   // a kapcsoló-állás azonnal frissül a lapon
        break;
      case 'toggle-gamefeel': {
        const on = !loadGameFeel();
        saveGameFeel(on);
        this.world.setGameFeel(on);   // élő frissítés (a kick azonnal lecseng kikapcsoláskor)
        this.showSettings();
        break;
      }
      case 'toggle-hitstop': {
        const on = !loadHitStop();
        saveHitStop(on);
        this.world.setHitStop(on);    // élő frissítés (futó fagyasztás feloldódik)
        this.showSettings();
        break;
      }
      case 'toggle-thicktears':
        saveThickTears(!loadThickTears());   // a következő lövésektől nagyobb sugár
        this.showSettings();
        break;
      case 'toggle-audio': {
        const muted = this.audio.toggleMute();
        localStorage.setItem('sentex_muted', muted ? '1' : '0');
        break;
      }
      case 'reset-progress':
        if (confirm('Really reset your total score, rank, leaderboard, records and stats? Your character name is kept.')) {
          resetAllProgress();
          resetAllStats();
          resetBestiary();
          this.best = 0;
          this.refreshMenuScreen();
        }
        break;
      case 'edit-name':
        this.overlays.showNameModal(this.profile?.name ?? '');
        break;
      case 'admin-map':
      case 'admin-enemy':
      case 'admin-boss':
      case 'admin-item':
      case 'admin-skill':
      case 'admin-odds':
      case 'admin-balance':
      case 'admin-settings':
        this.admin?.action(action);
        break;
      case 'offer-accept':
        this.world.acceptOffer();
        this.resumeFromOffer();
        break;
      case 'offer-decline':
        this.world.declineOffer();
        this.resumeFromOffer();
        break;
    }
  }

  /** A boltban vásárolni készül a játékos: megerősítő ablak (döntésig szünet). */
  private showOffer(offer: OfferView): void {
    this.state = 'offer';
    this.audio.pickup();
    this.overlays.showOffer(offer);
  }

  private resumeFromOffer(): void {
    this.overlays.hideItemOffer();
    this.state = 'play';
    this.engine.resetClock();
  }

  /** A dev-only admin-vezérlő regisztrálása (a `main.ts` dev-ága hívja, lazán betöltve). */
  registerAdmin(controller: AdminController): void {
    this.admin = controller;
  }

  /** Az adminnak nyújtott szolgáltatások (a controller a host-on át éri el a játékot). */
  adminHost(): AdminHost {
    return {
      world: this.world,
      audio: this.audio,
      input: this.input,
      overlays: this.overlays,
      enterPlay: () => { this.state = 'play'; this.overlays.hideAll(); },
      setAdminState: () => { this.state = 'admin'; },
    };
  }

  private showAdmin(): void {
    // Production buildben nincs admin (a controller null) → nincs belépés.
    this.admin?.open();
  }

  /** A world-beli kapu indítja: a VALÓDI karaktert a labirintusba dobja, majd vissza a kapuhoz. */
  private enterLabyrinthFromWorld(): void {
    const ch = CHAPTERS.find((c) => c.labyrinth);
    if (!ch?.labyrinth) return;
    const p = this.world.player;
    const savedX = p.x;
    const savedY = p.y;
    this.audio.resume();
    this.world.onLabyrinthExit = () => {
      // vissza a kapuhoz (a build/HP/pont végig a játékossal volt); a 'play' folytatódik
      p.x = savedX;
      p.y = savedY;
      p.vx = 0;
      p.vy = 0;
    };
    // a valódi karakterrel, az AKTUÁLIS szint nehézségén (a dungeon sértetlen marad)
    this.world.startLabyrinth(generateLabyrinth(ch.labyrinth), ch.theme, ch.enemyKinds, ch.id);
  }


  /** Főmenü „Start": a HUB-terembe lépünk (mód-választó), nem egyből a történetbe. */
  private startGame(): void {
    this.audio.resume();
    this.admin?.close();
    this.enterHub();
    // Nim narrációja kikapcsolva (kérésre).
  }

  /** Belépés a hub-terembe (a play-állapoton belül fut, mint a labirintus). */
  private enterHub(): void {
    this.world.startHub();
    this.state = 'play';
    this.overlays.hideAll();
  }

  /**
   * Egy hub-portál választása. Csak NYITOTT portálra hívódik (a zárt Dungeon/Boss
   * „hamarosan" jelzését a World maga adja). A Labirintus a hubból FRISS
   * karakterrel indul, és a kijáratnál visszatér a hubba.
   */
  private handleHubChoice(id: HubChoice): void {
    this.audio.resume();
    if (id === 'story') {
      this.world.newGame();
      this.state = 'play';
      this.overlays.hideAll();
    } else if (id === 'labyrinth') {
      const ch = CHAPTERS.find((c) => c.labyrinth);
      if (!ch?.labyrinth) return;
      this.world.newGame();                       // friss karakter a hub-futáshoz
      this.world.onLabyrinthExit = () => this.enterHub(); // kijáratnál vissza a hubba
      this.world.startLabyrinth(generateLabyrinth(ch.labyrinth), ch.theme, ch.enemyKinds, ch.id);
      this.state = 'play';
      this.overlays.hideAll();
    }
    // 'dungeon' / 'boss': zárt — a World már jelezte; itt nincs teendő.
  }

  /** Főmenü narrátor-gomb: lejátszás indítása, ill. ha már szól, leállítása. */
  private toggleNarration(): void {
    this.audio.resume();   // a kattintás a gesztus, ami feloldja az audio-contextet
    this.narrationOn = !this.narrationOn;
    if (this.narrationOn) this.audio.playVoice('narrator');
    else this.audio.stopVoice();
    this.overlays.setNarratorPlaying(this.narrationOn);
  }

  private showMenu(): void {
    this.admin?.close();
    this.world.exitHub();        // ha a hubból léptünk ki, a háttér visszaáll normál szobára
    this.audio.stopVoice();      // menübe lépve ne szóljon tovább a narráció
    this.narrationOn = false;
    this.state = 'menu';
    this.menuScreen = 'main';
    const progress = loadProgress();
    this.best = progress.bestFloor;
    this.overlays.showMenu({
      profile: this.profile,
      rank: rankInfo(progress.totalScore),
    });
    // Első indítás: ha még nincs karakternév, kérjük be a menü fölött.
    if (!this.profile) this.overlays.showNameModal();
  }

  /** RANG lap: profil + rekordok + statisztika + helyi ranglista (almenükkel). */
  private showRank(): void {
    this.menuScreen = 'rank';
    const progress = loadProgress();
    const records = loadRecords();
    // szint-rekordok rendezve, fejezet-névvel felcímkézve (a szám stabil → versenyezhető)
    const floorRecords = Object.keys(records.floorClear)
      .map((k) => Number(k))
      .filter((f) => Number.isFinite(f))
      .sort((a, b) => a - b)
      .map((floor) => {
        const lvl = resolveLevel(floor);
        return { floor, label: `${chapterName(lvl.chapter)} ${lvl.index}`, time: records.floorClear[floor]! };
      });
    // labirintus-rekordok fejezet-névvel
    const labRecords = Object.keys(records.labClear).map((id) => {
      const ch = CHAPTERS.find((c) => c.id === id);
      return { label: ch ? chapterName(ch) : id, time: records.labClear[id]! };
    });
    this.overlays.showRank({
      profile: this.profile,
      rank: rankInfo(progress.totalScore),
      totalScore: progress.totalScore,
      bestFloor: progress.bestFloor,
      leaderboard: loadLeaderboard(),
      stats: loadStats(),
      records,
      floorRecords,
      labRecords,
    });
  }

  /** BESTIÁRIUM lap: feloldható ellenfél-gyűjtemény (a menü-állapoton belül). */
  private showBestiary(): void {
    this.menuScreen = 'bestiary';
    this.overlays.showBestiary();
  }

  /** BEÁLLÍTÁSOK lap (a menü-állapoton belül). */
  private showSettings(): void {
    this.menuScreen = 'settings';
    this.overlays.showSettings({
      muted: this.audio.isMuted,
      shadowMode: this.world.shadowMode,
      shake: this.world.shakeScale,
      musicVolume: this.audio.musicVolume,
      sfxVolume: this.audio.sfxVolume,
      binds: this.input.bindings(),
      fpsShown: loadFpsShown(),
      renderScale: loadRenderScale(),
      fullscreen: !!document.fullscreenElement,
      gameFeel: loadGameFeel(),
      hitStop: loadHitStop(),
      thickTears: loadThickTears(),
    });
  }

  /** Teljes képernyő be/ki (böngésző Fullscreen API); a kapcsoló-állás a lapon frissül. */
  private toggleFullscreen(): void {
    const want = !document.fullscreenElement;
    saveFullscreenPref(want);   // a választás megmarad a következő indításra is
    const p = want ? document.documentElement.requestFullscreen() : document.exitFullscreen();
    p?.then(() => { if (this.menuScreen === 'settings') this.showSettings(); }).catch(() => {});
  }

  /** KÖZREMŰKÖDŐK lap (zene/kód forrásai + licenc). */
  private showCredits(): void {
    this.menuScreen = 'credits';
    this.overlays.showCredits();
  }

  /** A jelenleg nyitott menü-képernyő újrarajzolása (név-szerkesztés/reset után). */
  private refreshMenuScreen(): void {
    if (this.menuScreen === 'rank') this.showRank();
    else if (this.menuScreen === 'bestiary') this.showBestiary();
    else if (this.menuScreen === 'settings') this.showSettings();
    else this.showMenu();
  }

  /** A név-modal beküldésekor: profil mentése + a nyitott képernyő frissítése. */
  private handleNameSubmit(name: string): void {
    this.profile = saveProfile(name);
    this.refreshMenuScreen();
  }

  private togglePause(): void {
    if (this.state === 'play') {
      this.state = 'pause';
      this.overlays.showPause();
    } else if (this.state === 'pause') {
      this.state = 'play';
      this.overlays.hidePause();
      this.engine.resetClock();
    }
  }

  private handleGameOver(): void {
    this.state = 'over';
    const floor = this.world.floor;
    const score = this.world.score;
    const coins = this.world.player.coins;
    const floorName = this.world.floorName();
    const isBestFloor = floor > this.best;

    // Futás lezárása: pont az összesítetthez, rang újraszámítás, ranglista (idővel),
    // majd az élethosszig statisztika + csúcs-rekordok összesítése.
    const name = this.profile?.name ?? 'Unnamed';
    const rs = this.world.runStats;
    const time = rs.run;
    const outcome = finishRun(name, score, floor, time);
    if (!rs.flushed) {
      commitRun({
        time, score, coins, died: true,
        kills: rs.kills, bossKills: rs.bossKills,
        roomsCleared: rs.roomsCleared, floorsCleared: rs.floorsCleared, labsCleared: rs.labsCleared,
      });
      rs.flushed = true;
    }
    this.best = outcome.progress.bestFloor;

    setTimeout(() => {
      this.overlays.showGameOver({
        won: false,
        floorName,
        score,
        coins,
        bestFloor: outcome.progress.bestFloor,
        isBestFloor,
        rank: rankInfo(outcome.progress.totalScore),
        totalScore: outcome.progress.totalScore,
        rankedUp: outcome.rankedUp,
        place: outcome.place,
      });
    }, 700);
  }
}
