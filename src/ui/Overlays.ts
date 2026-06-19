/** Menü / szünet / game over / név / rang / beállítások DOM-overlay-ek kezelése. */

import {
  bandForRank,
  bandInfo,
  MAX_RANK,
  randomGuestName,
  stripName,
  type Band,
  type RankInfo,
  type RunResult,
} from '../game/progression';
import { formatTime, type LifetimeStats, type TimeRecords } from '../game/stats';
import { drawMedal } from '../game/medal';
import { BIND_META, keyLabel } from '../game/settings';
import { getLang, setLang, onLangChange, t, type Lang } from '../i18n';
import type { InputAction } from '../engine/Input';
import { el, pageHeader, panel, table, toggleField, button, select, slider } from './kit';

export type OverlayAction =
  | 'start' | 'resume' | 'menu' | 'admin' | 'rank' | 'settings' | 'credits' | 'edit-name'
  | 'toggle-audio' | 'reset-progress' | 'narrator' | 'toggle-fps' | 'toggle-fullscreen' | 'toggle-gamefeel' | 'toggle-hitstop'
  | 'rscale-100' | 'rscale-75' | 'rscale-50'
  | 'shadow-off' | 'shadow-hard' | 'shadow-soft'
  | 'admin-map' | 'admin-odds' | 'admin-enemy' | 'admin-boss' | 'admin-item' | 'admin-skill' | 'admin-balance' | 'admin-settings'
  | 'offer-accept' | 'offer-decline';

/** Egy felugró ajánlat-ablak (bolti vásárlás / értesítés) tartalma. */
export interface OfferView {
  badge: string;
  title: string;
  desc: string;
  sub: string;
  color: string;
  acceptLabel: string;
  /** Igaz: csak értesítés (egy „RENDBEN" gomb, nincs „Mégsem"). */
  hideDecline?: boolean;
}

/** A főmenü fejléc-adatai (üdvözlés + rang). */
export interface MenuView {
  profile: { name: string } | null;
  rank: RankInfo;
}

/** A RANG lap adatai (profil + rekordok + statisztika + helyi ranglista). */
export interface RankView {
  profile: { name: string } | null;
  rank: RankInfo;
  totalScore: number;
  bestFloor: number;
  leaderboard: RunResult[];
  stats: LifetimeStats;
  records: TimeRecords;
  /** szint-rekordok rendezve, fejezet-névvel (a Game állítja össze). */
  floorRecords: Array<{ floor: number; label: string; time: number }>;
  /** labirintus-rekordok fejezet-névvel. */
  labRecords: Array<{ label: string; time: number }>;
}

/** A RANG hub almenüi. */
type RankTab = 'profile' | 'records' | 'stats' | 'board';

/** A BEÁLLÍTÁSOK lap adatai (a Game állítja össze minden megnyitáskor). */
export interface SettingsView {
  muted: boolean;
  /** Vetett árnyék minősége: 'off' | 'hard' | 'soft'. */
  shadowMode: string;
  /** Képernyőrázás-szorzó (0..1). */
  shake: number;
  /** Zene-hangerő (0..1). */
  musicVolume: number;
  /** Hangeffekt-hangerő (0..1). */
  sfxVolume: number;
  /** Aktuális billentyű-kiosztás (akció → kisbetűs `e.key`). */
  binds: Record<InputAction, string>;
  /** Valós FPS-számláló megjelenítése (Grafika lap kapcsolója). */
  fpsShown: boolean;
  /** Render-felbontás szorzó (1 / 0.75 / 0.5). */
  renderScale: number;
  /** Teljes képernyő aktív-e (a böngésző Fullscreen API állapota). */
  fullscreen: boolean;
  /** „Játékérzet"-effektek (csőtorkolat-villanás, visszarúgás, kamera-kick) BE-e. */
  gameFeel: boolean;
  /** Hit-stop (ütős fagyasztás ölés/sérülés pillanatában) BE-e. */
  hitStop: boolean;
}

/** A BEÁLLÍTÁSOK hub almenüi. */
type SettingsTab = 'graphics' | 'audio' | 'controls' | 'general';

export interface GameOverData {
  won: boolean;
  floorName: string;
  score: number;
  coins: number;
  bestFloor: number;
  isBestFloor: boolean;
  rank: RankInfo;
  totalScore: number;
  rankedUp: boolean;
  place: number; // ranglista-helyezés (0 = nem fért be)
}

export class Overlays {
  /** A Game állítja be; a gombokra kattintva hívódik. */
  onAction: (action: OverlayAction) => void = () => {};
  /** A név-modal „MEHET" gombja / Enter; a Game menti a nevet. */
  onNameSubmit: (name: string) => void = () => {};

  private readonly menu = byId('menu');
  private readonly menuGreet = byId('menuGreet');
  private readonly pause = byId('pause');
  private readonly gameover = byId('gameover');
  private readonly admin = byId('admin');
  private readonly adminBody = byId('adminBody');
  private readonly goTitle = byId('goTitle');
  private readonly finalScore = byId('finalScore');
  private readonly finalRank = byId('finalRank');
  private readonly finalBest = byId('finalBest');
  private readonly goMedal = byId('goMedal') as HTMLCanvasElement;
  private readonly itemoffer = byId('itemoffer');
  private readonly offerCard = byId('offerCard');
  private readonly offerBadge = byId('offerBadge');
  private readonly offerTitle = byId('offerTitle');
  private readonly offerDesc = byId('offerDesc');
  private readonly offerSub = byId('offerSub');
  private readonly offerAccept = byId('offerAccept');
  private readonly offerDecline = byId('offerDecline');
  // név-modal
  private readonly nameModal = byId('nameModal');
  private readonly nameModalTitle = byId('nameModalTitle');
  private readonly nameInput = byId('nameInput') as HTMLInputElement;
  private readonly nameSave = byId('nameSave');
  private readonly nameCancel = byId('nameCancel');
  private nameCancelable = false;
  private nameFirstRun = false;
  // RANG / BEÁLLÍTÁSOK lapok (admin-kinézetű, dinamikusan épített törzzsel)
  private readonly rank = byId('rank');
  private readonly rankBody = byId('rankBody');
  /** A RANG fejléc-fülsora (admin-mintára a admin-bar-ban él, nem a törzsben). */
  private readonly rankTabs = byId('rankTabs');
  /** Az aktív RANG-almenü + a hozzá tartozó adat (a fülek belül váltanak). */
  private rankTab: RankTab = 'profile';
  private rankViewData: RankView | null = null;
  private readonly settings = byId('settings');
  private readonly settingsBody = byId('settingsBody');
  /** A BEÁLLÍTÁSOK fejléc-fülsora (admin-mintára a admin-bar-ban él). */
  private readonly settingsTabs = byId('settingsTabs');
  /** Az aktív BEÁLLÍTÁSOK-almenü (a fülek belül váltanak, megnyitáskor megmarad). */
  private settingsTab: SettingsTab = 'graphics';
  /** A Vezérlés-lap al-füle: billentyűzet / PlayStation / Xbox. */
  private controlsSubTab: 'keyboard' | 'ps' | 'xbox' = 'keyboard';
  private settingsViewData: SettingsView | null = null;
  /** Igaz, ha a nyelvváltás-feliratkozás már megtörtént (egyszer iratkozunk fel). */
  private langSubscribed = false;
  /** Folyamatban lévő billentyű-rögzítés leszerelője (egyszerre csak egy aktív). */
  private cancelCapture: (() => void) | null = null;
  private readonly credits = byId('credits');
  private readonly creditsBody = byId('creditsBody');

  /** Folyamatos beállítás-callbackek (a Game köti be); a csúszka húzás közben hív. */
  onMusicVolume: (v: number) => void = () => {};
  onSfxVolume: (v: number) => void = () => {};
  onShake: (v: number) => void = () => {};
  /** Egy akció átkötése egy billentyűre (a Game menti + újrarajzol). */
  onRebind: (action: InputAction, key: string) => void = () => {};
  /** Billentyű-kiosztás visszaállítása a gyári értékekre. */
  onResetBinds: () => void = () => {};

  constructor() {
    document.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.dataset.action as OverlayAction;
        this.onAction(action);
      });
    });

    // Név-modal: MEHET / Enter beküld; KIHAGYOM(MÉGSEM) / Esc / háttér-kattintás bezár.
    // Első indításkor a kihagyás egy generált vendég-névvel hoz létre profilt,
    // hogy ne ragadjon be a modál (a menü másképp újra feldobná).
    const submit = () => {
      this.nameModal.classList.add('hidden');
      this.onNameSubmit(this.nameInput.value);
    };
    const cancel = () => {
      if (!this.nameCancelable) return;
      this.nameModal.classList.add('hidden');
      if (this.nameFirstRun) this.onNameSubmit(randomGuestName()); // kihagyás → generált vendég-név
    };
    this.nameSave.addEventListener('click', submit);
    this.nameCancel.addEventListener('click', cancel);
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    // Élő szűrés gépelés közben: csak angol betű + szám, max hossz (a közös
    // szabály a stripName-ben; ez azonnali vizuális visszajelzés gépelés közben).
    this.nameInput.addEventListener('input', () => {
      const cleaned = stripName(this.nameInput.value);
      if (cleaned !== this.nameInput.value) this.nameInput.value = cleaned;
    });
    this.nameModal.addEventListener('click', (e) => { if (e.target === this.nameModal) cancel(); });
  }

  hideAll(): void {
    this.cancelCapture?.();   // billentyű-rögzítés megszakítása lapváltáskor
    this.menu.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.gameover.classList.add('hidden');
    this.admin.classList.add('hidden');
    this.adminBody.classList.add('hidden');
    this.itemoffer.classList.add('hidden');
    this.nameModal.classList.add('hidden');
    this.rank.classList.add('hidden');
    this.settings.classList.add('hidden');
    this.credits.classList.add('hidden');
  }

  /** Vásárlás-megerősítő ablak: jelvény + cím + leírás + ár + döntés. */
  showOffer(v: OfferView): void {
    this.offerBadge.textContent = v.badge;
    this.offerTitle.textContent = v.title;
    this.offerTitle.style.color = v.color;
    this.offerDesc.textContent = v.desc;
    this.offerSub.textContent = v.sub;
    this.offerAccept.textContent = v.acceptLabel;
    this.offerDecline.classList.toggle('hidden', !!v.hideDecline);
    this.offerCard.style.setProperty('--offer-col', v.color);
    this.itemoffer.classList.remove('hidden');
  }

  hideItemOffer(): void {
    this.itemoffer.classList.add('hidden');
  }

  showAdmin(): void {
    this.hideAll();
    this.admin.classList.remove('hidden');
  }

  /** Az admin-keret (fül-sor + Vissza) elrejtése — pl. a labirintus játék-nézetéhez. */
  hideAdminChrome(): void {
    this.admin.classList.add('hidden');
    this.adminBody.classList.add('hidden');
  }

  /** A fül-sor alatti DOM-konténer megjelenítése (DOM-alapú admin lapokhoz). */
  showAdminBody(): HTMLElement {
    this.adminBody.classList.remove('hidden');
    return this.adminBody;
  }

  /** A DOM-konténer elrejtése (canvas-alapú lapoknál a canvas látszik mögötte). */
  hideAdminBody(): void {
    this.adminBody.classList.add('hidden');
  }

  /** Aktív admin-almenü fül kiemelése. */
  setAdminTab(tab: 'map' | 'odds' | 'enemy' | 'boss' | 'item' | 'skill' | 'balance' | 'settings'): void {
    document.getElementById('adminTabMap')?.classList.toggle('active', tab === 'map');
    document.getElementById('adminTabEnemy')?.classList.toggle('active', tab === 'enemy');
    document.getElementById('adminTabBoss')?.classList.toggle('active', tab === 'boss');
    document.getElementById('adminTabItem')?.classList.toggle('active', tab === 'item');
    document.getElementById('adminTabSkill')?.classList.toggle('active', tab === 'skill');
    document.getElementById('adminTabOdds')?.classList.toggle('active', tab === 'odds');
    document.getElementById('adminTabBalance')?.classList.toggle('active', tab === 'balance');
    document.getElementById('adminTabSettings')?.classList.toggle('active', tab === 'settings');
  }

  showMenu(view: MenuView): void {
    this.hideAll();
    if (view.profile) {
      const ri = view.rank;
      const bi = bandInfo(ri.band);
      this.menuGreet.textContent = ri.rank > 0
        ? t('menu.greet.ranked', { name: view.profile.name, icon: bi.icon, rank: ri.name, n: ri.rank })
        : t('menu.greet.plain', { name: view.profile.name });
    } else {
      this.menuGreet.textContent = '';
    }
    this.menu.classList.remove('hidden');
    this.setNarratorPlaying(false);   // a narrátor-gomb alaphelyzetbe
  }

  /** A főmenü narrátor-gombjának vizuális állapota (lejátszás közben ■ + gyorsabb gyűrű). */
  setNarratorPlaying(playing: boolean): void {
    const box = document.getElementById('menuNarration');
    const hint = document.getElementById('narrationHint');
    if (box) box.classList.toggle('playing', playing);
    if (hint) hint.textContent = playing ? t('narration.playing') : t('narration.listen');
  }

  /** RANG hub: profil / rekordok / statisztika / ranglista almenük (belül váltanak). */
  showRank(view: RankView): void {
    this.hideAll();
    this.rankViewData = view;
    this.rankTab = 'profile';
    this.renderRank();
    this.rank.classList.remove('hidden');
  }

  /** Az aktív RANG-almenü kirajzolása (a fülek erre váltanak, újraindítás nélkül). */
  private renderRank(): void {
    const view = this.rankViewData;
    if (!view) return;

    // fülsor a fejlécbe (admin-mintára), nem a törzsbe
    this.rankTabs.replaceChildren(
      this.rankTabBtn('profile', t('rank.tab.profile')),
      this.rankTabBtn('records', t('rank.tab.records')),
      this.rankTabBtn('stats', t('rank.tab.stats')),
      this.rankTabBtn('board', t('rank.tab.board')),
    );

    // minden fülnek saját fejléc (cím + egymondatos magyarázat) + tartalom
    const [title, sub, body] =
      this.rankTab === 'profile' ? [t('rank.profile.title'), t('rank.profile.sub'), this.rankProfile(view)]
      : this.rankTab === 'records' ? [t('rank.records.title'), t('rank.records.sub'), this.rankRecords(view)]
      : this.rankTab === 'stats' ? [t('rank.stats.title'), t('rank.stats.sub'), this.rankStats(view)]
      : [t('rank.board.title'), t('rank.board.sub'), this.rankBoard(view)] as [string, string, HTMLElement];

    this.rankBody.replaceChildren(el('div', { class: 'adm-page' }, [
      pageHeader(title as string, sub as string),
      body as HTMLElement,
    ]));
  }

  private rankTabBtn(tab: RankTab, label: string): HTMLElement {
    const b = el('button', { class: `btn small${this.rankTab === tab ? ' active' : ''}`, text: label });
    b.addEventListener('click', () => { this.rankTab = tab; this.renderRank(); });
    return b;
  }

  /** Profil-almenü: érem + név + rang + haladás-csík a következő rangig. */
  private rankProfile(view: RankView): HTMLElement {
    const ri = view.rank;
    const bi = bandInfo(ri.band);
    const medal = document.createElement('canvas');
    medal.width = 108; medal.height = 108; medal.className = 'page-medal';
    paintMedal(medal, ri.rank, ri.band);

    const nextText = ri.rank >= MAX_RANK
      ? t('rank.topReached')
      : t('rank.pointsToNext', { n: fmt(ri.nextThreshold - view.totalScore), r: ri.rank + 1 });

    return panel(t('rank.profile.title'), [
      el('div', { class: 'rank-row' }, [
        medal,
        el('div', { class: 'rank-meta' }, [
          el('div', { class: 'profile-name', text: view.profile?.name ?? t('rank.unnamed') }),
          el('div', { class: 'profile-rank', text: ri.rank > 0 ? t('rank.rankLine', { icon: bi.icon, name: ri.name, n: ri.rank }) : t('rank.noRankYet', { name: ri.name }) }),
          el('div', { class: 'profile-bar' }, [el('div', { class: 'profile-bar-fill', style: `width:${Math.round(ri.progress * 100)}%` })]),
          el('div', { class: 'profile-next', text: nextText }),
          el('div', { class: 'profile-next', text: t('rank.totalDeepest', { score: fmt(view.totalScore), floor: view.bestFloor }) }),
        ]),
      ]),
    ]);
  }

  /** Rekord-almenü: csúcs-mutatók + szintenkénti és labirintus-leggyorsabb idők. */
  private rankRecords(view: RankView): HTMLElement {
    const rec = view.records;
    const highlights = statGrid([
      [t('rank.best.score'), fmt(rec.bestScore)],
      [t('rank.best.survival'), formatTime(rec.longestRun)],
      [t('rank.best.deepest'), `⬇ ${view.bestFloor}`],
      [t('rank.best.floorsTimed'), `${view.floorRecords.length}`],
    ]);

    const floorPanel = view.floorRecords.length
      ? table([t('rank.tbl.floor'), t('rank.tbl.level'), t('rank.tbl.bestTime')],
          view.floorRecords.map((r) => [`⬇ ${r.floor}`, r.label, formatTime(r.time, true)]))
      : el('p', { class: 'adm-sub', text: t('rank.noFloor') });

    const labPanel = view.labRecords.length
      ? table([t('rank.tbl.labyrinth'), t('rank.tbl.bestTime')],
          view.labRecords.map((r) => [r.label, formatTime(r.time, true)]))
      : el('p', { class: 'adm-sub', text: t('rank.noLab') });

    return el('div', {}, [
      panel(t('rank.panel.highlights'), [highlights]),
      panel(t('rank.panel.floorClears'), [floorPanel]),
      panel(t('rank.panel.labs'), [labPanel]),
    ]);
  }

  /** Statisztika-almenü: élethosszig összesítők + származtatott mutatók. */
  private rankStats(view: RankView): HTMLElement {
    const s = view.stats;
    const per = (n: number, d: number): string => (d > 0 ? (n / d).toFixed(1) : '–');
    const totals = statGrid([
      [t('stat.playTime'), formatTime(s.playTime)],
      [t('stat.runs'), `${s.runs}`],
      [t('stat.deaths'), `${s.deaths}`],
      [t('stat.kills'), fmt(s.kills)],
      [t('stat.bossKills'), `${s.bossKills}`],
      [t('stat.floorsCleared'), `${s.floorsCleared}`],
      [t('stat.roomsCleared'), `${s.roomsCleared}`],
      [t('stat.labs'), `${s.labsCleared}`],
      [t('stat.coins'), fmt(s.coins)],
    ]);
    const derived = statGrid([
      [t('stat.killsPerRun'), per(s.kills, s.runs)],
      [t('stat.avgScore'), s.runs > 0 ? fmt(view.totalScore / s.runs) : '–'],
      [t('stat.killsPerDeath'), per(s.kills, s.deaths)],
      [t('stat.roomsPerRun'), per(s.roomsCleared, s.runs)],
    ]);
    return el('div', {}, [
      panel(t('rank.panel.totals'), [totals]),
      panel(t('rank.panel.averages'), [derived]),
    ]);
  }

  /** Ranglista-almenü: a legjobb helyi futások (idő-oszloppal). */
  private rankBoard(view: RankView): HTMLElement {
    const rows = view.leaderboard.map((r, i) => [
      `${i + 1}.`,
      r.name,
      r.rank > 0 ? `${bandInfo(bandForRank(r.rank)).icon} ${r.rank}` : '–',
      fmt(r.score),
      `⬇ ${r.floor}`,
      r.time ? formatTime(r.time) : '–',
      new Date(r.date).toLocaleDateString(getLang() === 'hu' ? 'hu-HU' : 'en-GB'),
    ]);
    return panel(t('board.panel'), [
      view.leaderboard.length
        ? table([t('board.col.num'), t('board.col.name'), t('board.col.rank'), t('board.col.score'), t('board.col.floor'), t('board.col.time'), t('board.col.date')], rows)
        : el('p', { class: 'adm-sub', text: t('board.empty') }),
    ]);
  }

  /** BEÁLLÍTÁSOK hub: grafika / hang / irányítás / általános almenük (belül váltanak). */
  showSettings(view: SettingsView): void {
    this.hideAll();
    // Nyelvváltáskor (a lap nyitva léte mellett) újrarajzoljuk, hogy a választó és
    // a fordított címkék azonnal frissüljenek. Egyszer iratkozunk fel.
    if (!this.langSubscribed) {
      this.langSubscribed = true;
      onLangChange(() => { if (!this.settings.classList.contains('hidden')) this.renderSettings(); });
    }
    this.settingsViewData = view;
    this.renderSettings();
    this.settings.classList.remove('hidden');
  }

  /** Az aktív BEÁLLÍTÁSOK-almenü kirajzolása (a fülek erre váltanak, újraindítás nélkül). */
  private renderSettings(): void {
    const view = this.settingsViewData;
    if (!view) return;
    this.cancelCapture?.();   // fülváltás/újrarajzolás közben ne maradjon élő figyelő

    this.settingsTabs.replaceChildren(
      this.settingsTabBtn('graphics', t('set.tab.graphics')),
      this.settingsTabBtn('audio', t('set.tab.audio')),
      this.settingsTabBtn('controls', t('set.tab.controls')),
      this.settingsTabBtn('general', t('set.tab.general')),
    );

    const [title, sub, body] =
      this.settingsTab === 'graphics' ? [t('set.graphics.title'), t('set.graphics.sub'), this.settingsGraphics(view)]
      : this.settingsTab === 'audio' ? [t('set.audio.title'), t('set.audio.sub'), this.settingsAudio(view)]
      : this.settingsTab === 'controls' ? [t('set.controls.title'), t('set.controls.sub'), this.settingsControls(view)]
      : [t('set.general.title'), t('set.general.sub'), this.settingsGeneral()] as [string, string, HTMLElement];

    this.settingsBody.replaceChildren(el('div', { class: 'adm-page' }, [
      pageHeader(title as string, sub as string),
      body as HTMLElement,
    ]));
  }

  private settingsTabBtn(tab: SettingsTab, label: string): HTMLElement {
    const b = el('button', { class: `btn small${this.settingsTab === tab ? ' active' : ''}`, text: label });
    b.addEventListener('click', () => { this.settingsTab = tab; this.renderSettings(); });
    return b;
  }

  /** Grafika-almenü: árnyék-minőség + képernyőrázás-erősség. */
  private settingsGraphics(view: SettingsView): HTMLElement {
    const shadowRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label' }, [
        t('set.shadows'),
        el('small', { class: 'adm-field-help', text: t('set.shadows.help') }),
      ]),
      select({
        value: view.shadowMode,
        options: [
          { value: 'off', label: t('set.shadow.off') },
          { value: 'hard', label: t('set.shadow.hard') },
          { value: 'soft', label: t('set.shadow.soft') },
        ],
        onChange: (v) => this.onAction(`shadow-${v}` as OverlayAction),
      }),
    ]);
    const scaleRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label' }, [
        t('set.resolution'),
        el('small', { class: 'adm-field-help', text: t('set.resolution.help') }),
      ]),
      select({
        value: String(Math.round(view.renderScale * 100)),
        options: [
          { value: '100', label: '100%' },
          { value: '75', label: '75%' },
          { value: '50', label: '50%' },
        ],
        onChange: (v) => this.onAction(`rscale-${v}` as OverlayAction),
      }),
    ]);
    return panel(t('set.panel.display'), [
      shadowRow,
      scaleRow,
      toggleField({ label: t('set.fullscreen'), value: view.fullscreen, onChange: () => this.onAction('toggle-fullscreen'), onLabel: t('common.on'), offLabel: t('common.off') }),
      slider({ label: t('set.shake'), value: view.shake, format: pct, onChange: (v) => this.onShake(v) }),
      toggleField({ label: t('set.fps'), value: view.fpsShown, onChange: () => this.onAction('toggle-fps'), onLabel: t('common.on'), offLabel: t('common.off') }),
      toggleField({ label: t('set.gamefeel'), value: view.gameFeel, onChange: () => this.onAction('toggle-gamefeel'), onLabel: t('common.on'), offLabel: t('common.off') }),
      toggleField({ label: t('set.hitstop'), value: view.hitStop, onChange: () => this.onAction('toggle-hitstop'), onLabel: t('common.on'), offLabel: t('common.off') }),
    ]);
  }

  /** Hang-almenü: némítás + zene/effekt hangerő-csúszkák. */
  private settingsAudio(view: SettingsView): HTMLElement {
    return panel(t('set.panel.volume'), [
      toggleField({ label: t('set.audio.label'), value: !view.muted, onChange: () => this.onAction('toggle-audio'), onLabel: t('common.on'), offLabel: t('common.off') }),
      slider({ label: t('set.music'), value: view.musicVolume, format: pct, onChange: (v) => this.onMusicVolume(v) }),
      slider({ label: t('set.sfx'), value: view.sfxVolume, format: pct, onChange: (v) => this.onSfxVolume(v) }),
    ]);
  }

  /** Irányítás-almenü: átköthető billentyűk csoportonként + nem köthető segédek. */
  private settingsControls(view: SettingsView): HTMLElement {
    // Al-fülek: billentyűzet (átköthető) · PlayStation · Xbox (fix kontroller-kiosztás).
    const subTabs = el('div', { class: 'admin-tabs' }, [
      this.controlsSubBtn('keyboard', t('set.ctrlsub.keyboard')),
      this.controlsSubBtn('ps', t('set.ctrlsub.ps')),
      this.controlsSubBtn('xbox', t('set.ctrlsub.xbox')),
    ]);
    const body = this.controlsSubTab === 'keyboard'
      ? this.controlsKeyboard(view)
      : this.controlsGamepad(this.controlsSubTab);
    return el('div', {}, [subTabs, body]);
  }

  /** Egy Vezérlés-al-fül gombja (billentyűzet / PlayStation / Xbox). */
  private controlsSubBtn(tab: 'keyboard' | 'ps' | 'xbox', label: string): HTMLElement {
    const b = el('button', { class: `btn small${this.controlsSubTab === tab ? ' active' : ''}`, text: label });
    b.addEventListener('click', () => { this.controlsSubTab = tab; this.renderSettings(); });
    return b;
  }

  /** Billentyűzet-nézet: átköthető csoportok + mindig-aktív sor + gyári visszaállítás. */
  private controlsKeyboard(view: SettingsView): HTMLElement {
    const groupLabel = { move: t('set.group.move'), shoot: t('set.group.shoot'), action: t('set.group.action') } as const;
    const groups = (['move', 'shoot', 'action'] as const).map((g) =>
      panel(groupLabel[g], BIND_META.filter((m) => m.group === g).map((m) =>
        this.keybindRow(m.action, t(`bind.${m.action}`), view.binds[m.action]),
      )),
    );
    const fixed = panel(t('set.panel.alwaysOn'), [
      this.fixedRow(t('set.aimFire'), t('set.key.mouse')),
      this.fixedRow(t('set.quitPause'), 'Esc'),
      this.fixedRow(t('set.mute'), 'M'),
    ]);
    const resetBtn = el('div', { class: 'adm-savebar' }, [
      button(t('set.resetBinds'), () => this.onResetBinds(), 'ghost'),
    ]);
    return el('div', {}, [...groups, fixed, resetBtn]);
  }

  /**
   * Kontroller-nézet (PlayStation / Xbox): fix kiosztás, platform-specifikus
   * gombjelölésekkel. Csak tájékoztató (a Gamepad API standard mapping-jét
   * használjuk, lásd Input.pollGamepad). PS: ✕/○/△/Options, Xbox: A/B/Y/Menu.
   */
  private controlsGamepad(platform: 'ps' | 'xbox'): HTMLElement {
    const ps = platform === 'ps';
    return panel(t('set.panel.gamepad'), [
      el('p', { class: 'adm-hint', text: t('set.gp.note') }),
      this.fixedRow(t('set.group.move'), t('set.gp.leftStick')),
      this.fixedRow(t('set.group.shoot'), t('set.gp.rightStick')),
      this.fixedRow(t('bind.skill'), ps ? '✕' : 'A'),
      this.fixedRow(t('bind.bomb'), ps ? '○' : 'B'),
      this.fixedRow(t('bind.tnt'), ps ? '△' : 'Y'),
      this.fixedRow(t('set.quitPause'), ps ? 'Options' : 'Menu'),
    ]);
  }

  /** Egy átköthető billentyű sora: címke + kattintható billentyű-cella (capture). */
  private keybindRow(action: InputAction, label: string, key: string): HTMLElement {
    const cap = el('button', { class: 'adm-keycap', text: keyLabel(key) });
    cap.addEventListener('click', () => this.captureKey(action, cap));
    return el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label', text: label }),
      cap,
    ]);
  }

  /** Egy nem-átköthető sor (csak tájékoztat): címke + fix billentyű-jelölés. */
  private fixedRow(label: string, key: string): HTMLElement {
    return el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label', text: label }),
      el('span', { class: 'adm-keycap fixed', text: key }),
    ]);
  }

  /**
   * Billentyű-rögzítés: a cella „Press a key…"-re vált, és a következő billentyű-
   * lenyomást elkapja. Escape = mégsem. Sikeres rögzítéskor az `onRebind` fut
   * (a Game menti + frissíti a nézetet); a Game újrahívja a showSettings-t.
   */
  private captureKey(action: InputAction, cap: HTMLElement): void {
    this.cancelCapture?.();   // egy korábbi, lenyomás nélkül hagyott rögzítés lezárása
    cap.classList.add('listening');
    cap.textContent = t('set.capture');
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault();
      this.cancelCapture?.();
      const k = e.key.toLowerCase();
      if (k === 'escape') { this.renderSettings(); return; }   // mégsem
      this.onRebind(action, k);
    };
    window.addEventListener('keydown', onKey, true);
    this.cancelCapture = () => {
      window.removeEventListener('keydown', onKey, true);
      this.cancelCapture = null;
    };
  }

  /** Általános-almenü: karakternév szerkesztése + haladás-törlés. */
  private settingsGeneral(): HTMLElement {
    const nameRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label', text: t('set.charName') }),
      button(t('set.edit'), () => this.onAction('edit-name'), 'ghost'),
    ]);
    const resetRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label' }, [
        t('set.resetProgress'),
        el('small', { class: 'adm-field-help', text: t('set.resetProgress.help') }),
      ]),
      button(t('set.reset'), () => this.onAction('reset-progress'), 'danger'),
    ]);
    // Nyelvválasztó (a JÁTÉK nyelve; az admin felület magyar marad). A választó
    // közvetlenül az i18n-t hívja - nem kell a Game-action lánc.
    const langRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label', text: t('lang.label') }),
      select({
        value: getLang(),
        options: [{ value: 'en', label: 'English' }, { value: 'hu', label: 'Magyar' }],
        onChange: (v) => setLang(v as Lang),
      }),
    ]);
    return panel(t('set.panel.profile'), [langRow, nameRow, resetRow]);
  }

  /** KÖZREMŰKÖDŐK lap: a zene forrása/szerzője/licence + a játék készítője.
   *  A FŐMENÜ hangulatában (Cinzel, arany, atmoszférikus háttér), nem admin-lap. */
  showCredits(): void {
    this.hideAll();
    const link = (text: string, href: string): HTMLAnchorElement => {
      const a = el('a', { class: 'credit-link', text });
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      return a;
    };
    const trackRow = (name: string, where: string): HTMLElement =>
      el('div', { class: 'credit-track' }, [
        el('span', { class: 'credit-track-name', text: name }),
        el('span', { class: 'credit-track-where', text: where }),
      ]);
    const section = (heading: string, body: HTMLElement[]): HTMLElement =>
      el('div', { class: 'credit-section' }, [el('h2', { class: 'credit-heading', text: heading }), ...body]);

    const back = el('button', { class: 'menu-link credit-back', text: t('credits.back') });
    back.addEventListener('click', () => this.onAction('menu'));

    this.creditsBody.replaceChildren(
      el('h1', { class: 'credit-title', text: t('credits.title') }),
      section(t('credits.music'), [
        el('p', { class: 'credit-by', text: 'Kevin MacLeod' }),
        el('p', { class: 'credit-sub' }, [link('incompetech.com', 'https://incompetech.com'), ' · ', link('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/')]),
        el('div', { class: 'credit-tracks' }, [
          trackRow('Echoes of Time v2', t('credits.where.menu')),
          trackRow('Hush', t('credits.where.cellar')),
          trackRow('Long Note Four', t('credits.where.hollow')),
          trackRow('Anguish', t('credits.where.depths')),
          trackRow('Ossuary 1, A Beginning', t('credits.where.necropolis')),
          trackRow('Darkling', t('credits.where.dragon')),
          trackRow('Crypto', t('credits.where.combat')),
          trackRow('Heavy Interlude', t('credits.where.combat')),
        ]),
      ]),
      section(t('credits.game'), [
        el('p', { class: 'credit-by', text: t('credits.gameName') }),
        el('p', { class: 'credit-sub', text: t('credits.team') }),
        el('p', { class: 'credit-tech', text: t('credits.tech') }),
      ]),
      back,
    );
    this.credits.classList.remove('hidden');
  }

  /**
   * Karakternév bekérő modal. `current` megadva = szerkesztés (MÉGSEM = bezár,
   * marad a régi név). `current` nélkül = első indítás (KIHAGYOM = alapnévvel
   * indít). Mindkét esetben BEZÁRHATÓ — nem ragad be.
   */
  showNameModal(current?: string): void {
    this.nameFirstRun = current === undefined;
    this.nameCancelable = true;
    this.nameModalTitle.textContent = this.nameFirstRun ? t('name.modal.new') : t('name.modal.edit');
    this.nameInput.value = current ?? '';
    this.nameCancel.textContent = this.nameFirstRun ? t('name.skip') : t('common.cancel');
    this.nameCancel.classList.remove('hidden');
    this.nameModal.classList.remove('hidden');
    this.nameInput.focus();
    this.nameInput.select();
  }

  showPause(): void {
    this.pause.classList.remove('hidden');
  }

  hidePause(): void {
    this.pause.classList.add('hidden');
  }

  showGameOver(d: GameOverData): void {
    this.goTitle.textContent = d.won ? t('go.won') : t('go.died');
    this.finalScore.textContent = t('go.scoreLine', { floor: d.floorName, score: fmt(d.score), coins: d.coins });

    const bi = bandInfo(d.rank.band);
    const rankLine = d.rank.rank > 0 ? t('rank.rankLine', { icon: bi.icon, name: d.rank.name, n: d.rank.rank }) : d.rank.name;
    const totalLine = `<span class="go-total">${t('go.total', { score: fmt(d.totalScore) })}</span>`;
    this.finalRank.innerHTML = d.rankedUp
      ? `<span class="newbest">${t('go.newRank', { line: rankLine })}</span><br>${totalLine}`
      : `${rankLine}<br>${totalLine}`;
    if (d.rank.rank > 0) {
      paintMedal(this.goMedal, d.rank.rank, d.rank.band);
      this.goMedal.classList.remove('hidden');
    } else {
      this.goMedal.classList.add('hidden');
    }

    const bestPart = d.isBestFloor
      ? `<span class="newbest">${t('go.deepest')}</span>`
      : t('go.deepestSoFar', { floor: d.bestFloor });
    const placePart = d.place > 0 ? t('go.place', { n: d.place }) : '';
    this.finalBest.innerHTML = bestPart + placePart;
    this.gameover.classList.remove('hidden');
  }
}

/** Érem festése egy DOM-canvasra (a sugár a kisebb oldal alapján). */
function paintMedal(canvas: HTMLCanvasElement, rank: number, band: Band): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = Math.min(canvas.width, canvas.height) * 0.36;
  drawMedal(ctx, canvas.width / 2, canvas.height / 2, r, band, rank);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 0..1 érték százalékos kijelzése a hangerő/rázás csúszkákhoz. */
function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Stat-csempék rácsa: nagy érték + alatta kis címke (a RANG · Rekord/Stat lapokhoz). */
function statGrid(items: Array<[string, string]>): HTMLElement {
  return el('div', { class: 'stat-grid' }, items.map(([label, value]) =>
    el('div', { class: 'stat-tile' }, [
      el('div', { class: 'stat-value', text: value }),
      el('div', { class: 'stat-label', text: label }),
    ]),
  ));
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Hiányzó DOM-elem: #${id}`);
  return el;
}
