import type { Engine, EngineCallbacks } from '../engine/Engine';
import type { AudioManager } from '../engine/Audio';
import type { Input } from '../engine/Input';
import type { Overlays, OverlayAction } from '../ui/Overlays';

import { World, type OfferView } from './World';
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
import { generateLabyrinth } from './level/labyrinth';
import { CHAPTERS, resolveLevel } from './level/levels';

type GameState = 'menu' | 'play' | 'pause' | 'over' | 'offer';

/**
 * A legfelső szintű játékvezérlő: állapotgép (menü / játék / szünet /
 * game over / ajánlat), amely az engine update–render hívásait a megfelelő
 * helyre irányítja, és kezeli a felületet.
 */
export class Game implements EngineCallbacks {
  private state: GameState = 'menu';
  readonly world: World;
  /** A legmélyebb elért szint (HUD-kijelzéshez); a progresszióból töltve. */
  private best: number;
  /** A helyi karakter-profil (név); `null`, amíg nincs megadva. */
  private profile: Profile | null;
  /** Melyik menü-képernyő aktív (a `menu` állapoton belül). */
  private menuScreen: 'main' | 'rank' | 'settings' = 'main';
  /** Megy-e épp a főmenü narrátora (a gomb szándék-állapota, nem a dekódolásé). */
  private narrationOn = false;

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
    // mentett hang-beállítás visszatöltése
    if (localStorage.getItem('sentex_muted') === '1') this.audio.setMuted(true);

    this.overlays.onAction = (a) => this.handleAction(a);
    this.overlays.onNameSubmit = (name) => this.handleNameSubmit(name);
    // A narrátor természetes végén a főmenü-gomb visszaáll „lejátszás" állapotba.
    this.audio.setVoiceEndedHandler((name) => {
      if (name !== 'narrator') return;
      this.narrationOn = false;
      this.overlays.setNarratorPlaying(false);
    });
    // World-beli KAPU: a játékos rálépett → a valódi karakterrel a labirintusba
    // (a world.startLabyrinth-en át), majd a kijáratnál vissza a kapuhoz.
    this.world.onEnterLabyrinth = () => this.enterLabyrinthFromWorld();

    // Háttérnek mindig legyen érvényes pálya a menü mögött is.
    this.world.newGame();
    this.showMenu();
  }

  update(dt: number): void {
    // Labirintus (a world belsejében fut): ESC = kilépés, egyébként a normál world-update.
    if (this.world.isLabyrinth) {
      if (this.input.consumePause()) { this.world.exitLabyrinth(); return; }
      this.world.update(dt);
      return;
    }

    if (this.input.consumePause()) {
      // a felugró ajánlat-ablak ESC-re (vagy P-re) bezárul = elutasítás
      if (this.state === 'offer') this.handleAction('offer-decline');
      else this.togglePause();
    }

    if (this.state === 'play') {
      this.world.update(dt);
    } else {
      // menü / szünet / game over: csak az effektek élnek
      this.world.updateAmbient(dt);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'menu') {
      this.drawMenuBackground(ctx);
    } else {
      this.world.render(ctx);
    }

    if (this.state === 'play' || this.state === 'pause' || this.state === 'offer') {
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
      case 'rank':
        this.showRank();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'narrator':
        this.toggleNarration();
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
          this.best = 0;
          this.refreshMenuScreen();
        }
        break;
      case 'edit-name':
        this.overlays.showNameModal(this.profile?.name ?? '');
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

  private startGame(): void {
    this.audio.resume();
    this.world.newGame();
    this.state = 'play';
    this.overlays.hideAll();
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
        return { floor, label: `${lvl.chapter.name} ${lvl.index}`, time: records.floorClear[floor]! };
      });
    // labirintus-rekordok fejezet-névvel
    const labRecords = Object.keys(records.labClear).map((id) => ({
      label: CHAPTERS.find((c) => c.id === id)?.name ?? id,
      time: records.labClear[id]!,
    }));
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

  /** BEÁLLÍTÁSOK lap (a menü-állapoton belül). */
  private showSettings(): void {
    this.menuScreen = 'settings';
    this.overlays.showSettings({ muted: this.audio.isMuted });
  }

  /** A jelenleg nyitott menü-képernyő újrarajzolása (név-szerkesztés/reset után). */
  private refreshMenuScreen(): void {
    if (this.menuScreen === 'rank') this.showRank();
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
