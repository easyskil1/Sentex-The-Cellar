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
import { drawEnemy } from '../game/entities/enemies/EnemyRenderer';
import { ENEMY_STATS, type EnemyKind } from '../game/entities/enemies/enemyTypes';
import { ENEMY_NAMES, loadBestiary, loadBossBestiary, loadPerksSeen, loadSkillsSeen, loadSetTiersSeen } from '../game/bestiary';
import { ITEMS, itemName, itemDesc, type Item } from '../game/content/items';
import { ITEM_SETS, SET_ORDER, type ItemSet, type SetId } from '../game/content/itemSets';
import { SKILLS, skillName, skillDesc, type Skill } from '../game/content/skills';
import { drawPerkIcon, drawSkillIcon } from '../game/content/itemArt';
import { CHARACTERS, isCharacterUnlocked, type CharacterDef } from '../game/content/characters';
import { CHALLENGES, loadClearedChallenges, type ChallengeDef } from '../game/content/challenges';
import { ACHIEVEMENTS, loadAchievements, type AchievementDef } from '../game/content/achievements';
import { FIOLA_EFFECTS, FIOLA_COLORS, drawFiola, loadFiolaSeen, type FiolaEffectDef } from '../game/content/Fiola';
import { CARD_EFFECTS, drawCard, loadCardSeen, type CardDef } from '../game/content/Card';
import { drawHoodedSigil } from '../game/level/characterSelectRender';
import { shade } from '../engine/math';
import { BOSS_ORDER, BOSS_REGISTRY, type BossTarget } from '../game/entities/enemies/bossRegistry';
import type { IEnemy } from '../game/entities/enemies/Enemy';
import { HP } from '../game/config';
import { BIND_META, keyLabel } from '../game/settings';
import { getLang, setLang, onLangChange, t, type Lang } from '../i18n';
import type { InputAction } from '../engine/Input';
import { el, pageHeader, panel, table, toggleField, button, select, slider } from './kit';

/** A Kódex fülei: a 3 eredeti (lény/boss/tárgy/rend/skill) + az 5 új tartalom-rendszer. */
type CodexTab =
  | 'creatures' | 'bosses' | 'perks' | 'sets' | 'skills'
  | 'wanderers' | 'challenges' | 'feats' | 'fiolas' | 'cards';

export type OverlayAction =
  | 'start' | 'resume' | 'menu' | 'admin' | 'rank' | 'bestiary' | 'settings' | 'credits' | 'edit-name'
  | 'toggle-audio' | 'reset-progress' | 'narrator' | 'toggle-fps' | 'toggle-fullscreen' | 'toggle-gamefeel' | 'toggle-hitstop' | 'toggle-thicktears'
  | 'rscale-auto' | 'rscale-100' | 'rscale-75' | 'rscale-50'
  | 'shadow-off' | 'shadow-hard' | 'shadow-soft'
  | 'admin-map' | 'admin-odds' | 'admin-enemy' | 'admin-boss' | 'admin-item' | 'admin-skill' | 'admin-balance' | 'admin-settings'
  | 'admin-vandor' | 'admin-proba' | 'admin-seed'
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
  /** teljesítmények (a Game id+tier+feloldottság; az Overlays fordítja a nevet/leírást). */
  achievements: Array<{ id: string; tier: string; unlocked: boolean }>;
}

/** A RANG hub almenüi. */
type RankTab = 'profile' | 'records' | 'stats' | 'board' | 'achievements';

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
  /** Automatikus minőség (adaptív render-skála) BE-e. */
  autoQuality: boolean;
  /** Teljes képernyő aktív-e (a böngésző Fullscreen API állapota). */
  fullscreen: boolean;
  /** „Játékérzet"-effektek (csőtorkolat-villanás, visszarúgás, kamera-kick) BE-e. */
  gameFeel: boolean;
  /** Hit-stop (ütős fagyasztás ölés/sérülés pillanatában) BE-e. */
  hitStop: boolean;
  /** Vastagabb játékos-lövedék (láthatóság/hozzáférhetőség) BE-e. */
  thickTears: boolean;
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
  /** A futás végén MOST feloldott teljesítmények id-jei (értesítéshez). */
  newAchievements?: string[];
  /** A futás seed-kódja (#49) - csak normál kampánynál; kattintásra másolható. */
  seed?: string;
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

  // Seed-kapu modal (#49): a HUB seed-állomása nyitja; a beírt kód a következő
  // story-futás seedje. A callbackeket a `showSeedGate` állítja be hívásonként.
  private readonly seedModal = byId('seedModal');
  private readonly seedInput = byId('seedInput') as HTMLInputElement;
  private readonly seedSet = byId('seedSet');
  private readonly seedRandom = byId('seedRandom');
  private seedOnSubmit: (seed: string) => void = () => {};
  private seedOnClose: () => void = () => {};
  // RANG / BEÁLLÍTÁSOK lapok (admin-kinézetű, dinamikusan épített törzzsel)
  private readonly rank = byId('rank');
  private readonly rankBody = byId('rankBody');
  /** A RANG fejléc-fülsora (admin-mintára a admin-bar-ban él, nem a törzsben). */
  private readonly rankTabs = byId('rankTabs');
  /** Az aktív RANG-almenü + a hozzá tartozó adat (a fülek belül váltanak). */
  private rankTab: RankTab = 'profile';
  private rankViewData: RankView | null = null;
  /** BESTIÁRIUM: katakomba-fal + a kijelölt lény animált renderének RAF-ja. */
  private readonly bestiary = byId('bestiary');
  private bestiaryRaf = 0;
  /** A Kódex aktív füle. */
  private codexTab: CodexTab = 'creatures';
  /** Boss-előnézet példányok cache-e (a draw-hoz; nem frissül, statikus póz). */
  private readonly bossPreviews = new Map<BossTarget, IEnemy>();
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

    // Seed-kapu modal (#49): BEÁLLÍT a beírt seedet rögzíti, VÉLETLEN ürre állít
    // (friss random futás), Esc/MÉGSEM/háttér-kattintás változatlanul zár.
    const seedClose = () => { this.seedModal.classList.add('hidden'); this.seedOnClose(); };
    const seedSubmit = (value: string) => { this.seedOnSubmit(value); seedClose(); };
    this.seedSet.addEventListener('click', () => seedSubmit(this.seedInput.value));
    this.seedRandom.addEventListener('click', () => seedSubmit(''));
    this.seedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); seedSubmit(this.seedInput.value); }
      else if (e.key === 'Escape') { e.preventDefault(); seedClose(); }
    });
    // élő szűrés: csak betű/szám/kötőjel, kisbetűsítve, ésszerű hossz (megosztható kód)
    this.seedInput.addEventListener('input', () => {
      const cleaned = this.seedInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16);
      if (cleaned !== this.seedInput.value) this.seedInput.value = cleaned;
    });
    this.seedModal.addEventListener('click', (e) => { if (e.target === this.seedModal) seedClose(); });
  }

  /**
   * HUB seed-kapu (#49): modal a KÖVETKEZŐ story-futás seedjének megadásához.
   * `current` az előtöltött kód (üres = random). `onSubmit` a kiválasztott kódot
   * adja (üres string = random), `onClose` MINDEN záráskor fut (a hub feloldásához).
   */
  showSeedGate(current: string, onSubmit: (seed: string) => void, onClose: () => void): void {
    this.seedOnSubmit = onSubmit;
    this.seedOnClose = onClose;
    this.seedInput.value = current;
    this.seedModal.classList.remove('hidden');
    setTimeout(() => this.seedInput.focus(), 0);
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
    this.seedModal.classList.add('hidden');
    this.rank.classList.add('hidden');
    this.bestiary.classList.add('hidden');
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
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
  setAdminTab(tab: 'map' | 'odds' | 'enemy' | 'boss' | 'item' | 'skill' | 'balance' | 'settings' | 'vandor' | 'proba' | 'seed'): void {
    document.getElementById('adminTabMap')?.classList.toggle('active', tab === 'map');
    document.getElementById('adminTabEnemy')?.classList.toggle('active', tab === 'enemy');
    document.getElementById('adminTabBoss')?.classList.toggle('active', tab === 'boss');
    document.getElementById('adminTabItem')?.classList.toggle('active', tab === 'item');
    document.getElementById('adminTabSkill')?.classList.toggle('active', tab === 'skill');
    document.getElementById('adminTabOdds')?.classList.toggle('active', tab === 'odds');
    document.getElementById('adminTabBalance')?.classList.toggle('active', tab === 'balance');
    document.getElementById('adminTabVandor')?.classList.toggle('active', tab === 'vandor');
    document.getElementById('adminTabProba')?.classList.toggle('active', tab === 'proba');
    document.getElementById('adminTabSeed')?.classList.toggle('active', tab === 'seed');
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
  /** Felszálló parázs-hangulat (mint a főmenün) egy teljes-képernyős lapra; egyszer szúrjuk be. */
  private ensureAtmos(page: HTMLElement): void {
    if (page.querySelector('.menu-atmos')) return;
    const atmos = el('div', { class: 'menu-atmos' });
    atmos.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 12; i++) atmos.append(el('span', { class: 'ember' }));
    page.prepend(atmos);
  }

  showRank(view: RankView): void {
    this.hideAll();
    this.ensureAtmos(this.rank);
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
      this.rankTabBtn('achievements', t('rank.tab.achievements')),
      this.rankTabBtn('board', t('rank.tab.board')),
    );

    // minden fülnek saját fejléc (cím + egymondatos magyarázat) + tartalom
    const [title, sub, body] =
      this.rankTab === 'profile' ? [t('rank.profile.title'), t('rank.profile.sub'), this.rankProfile(view)]
      : this.rankTab === 'records' ? [t('rank.records.title'), t('rank.records.sub'), this.rankRecords(view)]
      : this.rankTab === 'stats' ? [t('rank.stats.title'), t('rank.stats.sub'), this.rankStats(view)]
      : this.rankTab === 'achievements' ? [t('rank.ach.title'), t('rank.ach.sub'), this.rankAchievements(view)]
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

  /** Teljesítmény-almenü: a feloldott/zárt teljesítmények rácsa (tier-színnel). */
  private rankAchievements(view: RankView): HTMLElement {
    const done = view.achievements.filter((a) => a.unlocked).length;
    const total = view.achievements.length;
    const tiles = view.achievements.map((a) => {
      const cls = `ach-tile ach-${a.tier}${a.unlocked ? '' : ' locked'}`;
      return el('div', { class: cls }, [
        el('div', { class: 'ach-mark', text: a.unlocked ? '★' : '🔒' }),
        el('div', { class: 'ach-text' }, [
          el('div', { class: 'ach-name', text: a.unlocked ? t(`ach.${a.id}.name`) : '???' }),
          el('div', { class: 'ach-desc', text: t(`ach.${a.id}.desc`) }),
        ]),
      ]);
    });
    return panel(t('rank.ach.count', { done, total }), [el('div', { class: 'ach-grid' }, tiles)]);
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

  /**
   * KÓDEX: fülezett gyűjtemény (Lények / Bossok / Tárgyak / Képességek). A
   * feloldatlanok sötét sziluettek; a feloldás kulcsai külön rendszerekből jönnek
   * (ellenfél/boss = megölés, perk = felvétel, skill = felszerelés). A lény/boss
   * a `drawEnemy`-vel, a perk/skill a `drawPerkIcon`/`drawSkillIcon`-nal rajzol.
   */
  showBestiary(): void {
    this.hideAll();
    this.ensureAtmos(this.bestiary);
    this.renderCodex();
    this.bestiary.classList.remove('hidden');
  }

  /** Az aktív Kódex-fül teljes újraépítése (fül-sor + fal-rács + részletező). */
  private renderCodex(): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    const body = byId('bestiaryBody');
    const tab = this.codexTab;

    // Fül-sor a FELSŐ admin-bar-ba (mint a Rang/Beállítások füleı), nem a törzsbe
    const tabDefs: Array<{ id: CodexTab; label: string }> = [
      { id: 'creatures', label: t('best.creatures') },
      { id: 'bosses', label: t('best.bosses') },
      { id: 'perks', label: t('codex.perks') },
      { id: 'sets', label: t('codex.sets') },
      { id: 'skills', label: t('codex.skills') },
      { id: 'wanderers', label: t('codex.wanderers') },
      { id: 'challenges', label: t('codex.challenges') },
      { id: 'feats', label: t('codex.feats') },
      { id: 'fiolas', label: t('codex.fiolas') },
      { id: 'cards', label: t('codex.cards') },
    ];
    const tabBar = byId('codexTabs');
    tabBar.replaceChildren(...tabDefs.map((d) => {
      const b = el('button', { class: d.id === tab ? 'btn small active' : 'btn small', text: d.label });
      b.addEventListener('click', () => { this.codexTab = d.id; this.renderCodex(); });
      return b;
    }));

    // Részletező-tábla (a kijelölt bejegyzés): nagy animált canvas + név + leírás
    const detailCanvas = document.createElement('canvas');
    detailCanvas.className = 'best-detail-canvas';
    detailCanvas.width = 200; detailCanvas.height = 180;
    const detailName = el('div', { class: 'best-detail-name' });
    const detailStats = el('div', { class: 'best-detail-stats' });
    const detailHint = el('div', { class: 'best-detail-hint', text: t('best.pick') });
    const detail = el('div', { class: 'best-detail' }, [detailCanvas, detailName, detailStats, detailHint]);

    const wall = el('div', { class: 'best-wall' });
    const clearActive = (): void => Array.from(wall.querySelectorAll('.active')).forEach((n) => n.classList.remove('active'));

    let unlockedN = 0, totalN = 0;

    if (tab === 'creatures') {
      // a pókfióka nem önálló bejegyzés (a nagy pók szétrobbanása), kihagyjuk
      const kinds = (Object.keys(ENEMY_NAMES) as EnemyKind[]).filter((k) => k !== 'spiderling');
      const unlocked = loadBestiary();
      unlockedN = kinds.filter((k) => unlocked.has(k)).length; totalN = kinds.length;
      for (const kind of kinds) {
        const open = unlocked.has(kind);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawBestiaryFigure(c, kind, open, 18, 0, 0);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? ENEMY_NAMES[kind] : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectBestiary(kind, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'bosses') {
      const bossUnlocked = loadBossBestiary();
      unlockedN = BOSS_ORDER.filter((b) => bossUnlocked.has(b)).length; totalN = BOSS_ORDER.length;
      for (const target of BOSS_ORDER) {
        const open = bossUnlocked.has(target);
        const niche = el('button', { class: open ? 'best-niche best-boss' : 'best-niche best-boss locked' });
        const c = this.nicheCanvas();
        this.drawBossFigure(c, target, open);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? BOSS_REGISTRY[target].name : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectBossBestiary(target, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'perks') {
      const seen = loadPerksSeen();
      const perks = ITEMS.filter((it) => !it.skill); // a skillt adó tárgyak a Képességek fülön
      unlockedN = perks.filter((it) => seen.has(it.name)).length; totalN = perks.length;
      for (const item of perks) {
        const open = seen.has(item.name);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawPerkFigure(c, item, open, 22, 0);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? itemName(item) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectPerk(item, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'sets') {
      // RENDEK: a szett akkor „felfedezett", ha legalább 1 tagját (tárgyát) ismered.
      const seen = loadPerksSeen();
      const tiersSeen = loadSetTiersSeen();
      const setList = SET_ORDER.map((id) => ITEM_SETS[id]);
      const discovered = (s: ItemSet): boolean => this.setMembers(s.id).some((it) => seen.has(it.name));
      unlockedN = setList.filter(discovered).length; totalN = setList.length;
      for (const s of setList) {
        const open = discovered(s);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawSetEmblem(c, s, open, 22);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? t(s.nameKey) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectSet(s, open, seen, tiersSeen, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'skills') {
      const seen = loadSkillsSeen();
      unlockedN = SKILLS.filter((s) => seen.has(s.id)).length; totalN = SKILLS.length;
      for (const skill of SKILLS) {
        const open = seen.has(skill.id);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawSkillFigure(c, skill, open, 22, 0);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? skillName(skill) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectSkill(skill, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'wanderers') {
      // VÁNDOROK (#53): feloldás = nincs feltétel, vagy a feltétel-érdem megvan
      unlockedN = CHARACTERS.filter(isCharacterUnlocked).length; totalN = CHARACTERS.length;
      for (const ch of CHARACTERS) {
        const open = isCharacterUnlocked(ch);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawWandererFigure(c, ch, open);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? t(`char.${ch.id}.name`) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectWanderer(ch, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'challenges') {
      // PRÓBÁK (#51): mind látható; a „felfedett" = teljesített (✓), a count is azt méri
      const cleared = loadClearedChallenges();
      unlockedN = CHALLENGES.filter((c) => cleared.has(c.id)).length; totalN = CHALLENGES.length;
      for (const ch of CHALLENGES) {
        const done = cleared.has(ch.id);
        const niche = el('button', { class: 'best-niche' });
        const c = this.nicheCanvas();
        this.drawChallengeFigure(c, ch, done);
        const label = t(`challenge.${ch.id}.name`) + (done ? ' ✓' : '');
        niche.append(c, el('span', { class: 'best-niche-name', text: label }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectChallenge(ch, done, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'feats') {
      // ÉRDEMEK (Ú3): a zárt bejegyzés a NEVÉT rejti, de a feltételt (leírást) mutatja
      const earned = loadAchievements();
      unlockedN = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length; totalN = ACHIEVEMENTS.length;
      for (const a of ACHIEVEMENTS) {
        const open = earned.has(a.id);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawFeatFigure(c, a, open, 26);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? t(`ach.${a.id}.name`) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectFeat(a, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    } else if (tab === 'fiolas') {
      // FIOLÁK (#44): a hatás futásonként random szín mögött; a Kódex a HATÁST tárja
      // fel (futásokon át, az első kiivás után), a per-futás találgatás megmarad
      const seen = loadFiolaSeen();
      unlockedN = FIOLA_EFFECTS.filter((f) => seen.has(f.id)).length; totalN = FIOLA_EFFECTS.length;
      FIOLA_EFFECTS.forEach((f, i) => {
        const open = seen.has(f.id);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawFiolaFigure(c, i, open);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? t(f.nameKey) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectFiola(f, i, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      });
    } else if (tab === 'cards') {
      // SORSLAPOK (#46/#47): ismert hatású, felvételkor felfedve
      const seen = loadCardSeen();
      unlockedN = CARD_EFFECTS.filter((c) => seen.has(c.id)).length; totalN = CARD_EFFECTS.length;
      for (const cd of CARD_EFFECTS) {
        const open = seen.has(cd.id);
        const niche = el('button', { class: open ? 'best-niche' : 'best-niche locked' });
        const c = this.nicheCanvas();
        this.drawCardFigure(c, cd, open, 26);
        niche.append(c, el('span', { class: 'best-niche-name', text: open ? t(cd.nameKey) : '???' }));
        niche.addEventListener('click', () => {
          clearActive(); niche.classList.add('active');
          this.selectCard(cd, open, detailCanvas, detailName, detailStats, detailHint);
        });
        wall.append(niche);
      }
    }

    byId('bestiaryCount').textContent = t('best.count', { n: unlockedN, total: totalN });
    body.replaceChildren(el('div', { class: 'best-layout' }, [wall, detail]));
  }

  /** Egy egységes fülke-canvas (76×76) a rácshoz. */
  private nicheCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.className = 'best-niche-canvas';
    c.width = 76; c.height = 76;
    return c;
  }

  /**
   * Felfedezetlen bejegyzés: SEMLEGES, kitakart „?" (sem a forma, sem animáció
   * nem árul el semmit) - minden fülön (lény/boss/tárgy/skill) ugyanaz.
   */
  private drawLocked(c: HTMLCanvasElement): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const s = Math.min(c.width, c.height);
    ctx.save();
    ctx.font = `bold ${Math.round(s * 0.52)}px Georgia, "Cinzel", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(176, 138, 90, 0.32)';
    ctx.fillText('?', c.width / 2, c.height / 2 + s * 0.04);
    ctx.restore();
  }

  /** Egy boss-példány (cache-elt) lekérése az előnézethez. */
  private bossPreview(target: BossTarget): IEnemy {
    let b = this.bossPreviews.get(target);
    if (!b) { b = BOSS_REGISTRY[target].make(0, 0, 1, '#9c4bd8'); this.bossPreviews.set(target, b); }
    return b;
  }

  /** Egy boss a megadott canvasra (feloldva színes + skálázva, zárva sötét sziluett). */
  private drawBossFigure(c: HTMLCanvasElement, target: BossTarget, open: boolean): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    const b = this.bossPreview(target);
    b.x = c.width / 2; b.y = c.height / 2 + 2;
    const k = Math.min(0.5, 22 / b.r); // a nagy bossok kisebb skálán férnek a fülkébe
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(k, k);
    ctx.translate(-b.x, -b.y);
    b.draw(ctx);
    ctx.restore();
  }

  /** A kijelölt boss részletezése (nagy statikus render + név + statok). */
  private selectBossBestiary(target: BossTarget, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('best.lockedHint');
      this.drawLocked(canvas);
      return;
    }
    const ctx = canvas.getContext('2d');
    const b = this.bossPreview(target);
    nameEl.textContent = BOSS_REGISTRY[target].name;
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: `${t('best.hp')} ${Math.round(b.maxHp)}` }),
    );
    hintEl.textContent = '';
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      b.x = canvas.width / 2; b.y = canvas.height / 2 + 4;
      const k = Math.min(0.7, 40 / b.r);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(k, k);
      ctx.translate(-b.x, -b.y);
      b.draw(ctx);
      ctx.restore();
    }
  }

  /** Egy ellenfél a megadott canvasra (feloldva színes, zárva sötét sziluett). */
  private drawBestiaryFigure(c: HTMLCanvasElement, kind: EnemyKind, open: boolean, r: number, bob: number, wob: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    const s = ENEMY_STATS[kind];
    ctx.clearRect(0, 0, c.width, c.height);
    drawEnemy(ctx, {
      kind, x: c.width / 2, y: c.height / 2 + 4, r,
      col: s.col, col2: s.col2,
      flash: false, bob, wob, face: 0, moving: false,
    });
  }

  /** A kijelölt fülke részletezése + a nagy render folyamatos animálása (idle-mozgás). */
  private selectBestiary(kind: EnemyKind, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('best.lockedHint');
      this.drawLocked(canvas);
      return;
    }
    const s = ENEMY_STATS[kind];
    nameEl.textContent = ENEMY_NAMES[kind];
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: `${t('best.hp')} ${Math.round(s.hp)}` }),
      el('span', { class: 'best-stat', text: `${t('best.dmg')} ${Math.round(s.dmg * HP.half)}` }),
    );
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      this.drawBestiaryFigure(canvas, kind, true, 40, Math.sin(ts * 5) * 1.2, ts * 3);
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  /** Egy perk animált ikonja a megadott canvasra (zárva sötét sziluett). */
  private drawPerkFigure(c: HTMLCanvasElement, item: Item, open: boolean, r: number, t: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    drawPerkIcon(ctx, item.name, c.width / 2, c.height / 2 + 2, r, t, item.col, item.col2 ?? shade(item.col, -0.38));
  }

  /** A kijelölt perk részletezése (név + hatás-leírás) + folyamatos animáció. */
  private selectPerk(item: Item, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('codex.perkHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = itemName(item);
    const stats: HTMLElement[] = [el('span', { class: 'best-stat', text: itemDesc(item) })];
    // kereszt-hivatkozás: melyik Rend(ek)be tartozik a tárgy (a RENDEK fülre mutat)
    for (const id of item.tags ?? []) {
      const s = ITEM_SETS[id];
      stats.push(el('span', { class: 'best-stat set-ref', text: `${t('codex.setBelongs')}: ${t(s.nameKey)}`, style: `color:${s.color}` }));
    }
    statsEl.replaceChildren(...stats);
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      this.drawPerkFigure(canvas, item, true, 46, (now - start) / 1000);
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  /** Egy szett (Rend) tag-tárgyai (a `tags` alapján), Kódex-sorrendben. */
  private setMembers(id: SetId): Item[] {
    return ITEMS.filter((it) => it.tags?.includes(id));
  }

  /**
   * Egy szett-címer a megadott canvasra: gótikus pecsét a Rend színében (külső
   * ragyogás + sötét korong + színes gyűrű + belső rombusz-rúna). Zárva: „?".
   */
  private drawSetEmblem(c: HTMLCanvasElement, set: ItemSet, open: boolean, r: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    // külső ragyogás
    const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.25);
    glow.addColorStop(0, set.color + '55');
    glow.addColorStop(1, set.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2); ctx.fill();
    // sötét korong
    ctx.fillStyle = shade(set.color, -0.66);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
    // színes gyűrű
    ctx.strokeStyle = set.color;
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
    // belső rombusz-rúna
    ctx.fillStyle = set.color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.42); ctx.lineTo(r * 0.34, 0); ctx.lineTo(0, r * 0.42); ctx.lineTo(-r * 0.34, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(set.color, 0.5);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /**
   * A kijelölt Rend részletezése: címer + tag-tárgyak (felfedezés-kapu a felvett
   * tárgyak alapján) + a tier-bónuszok (a hatás CSAK az első aktiválás után tárul
   * fel, addig „???"). A `seen` = felvett tárgyak, a `tiersSeen` = aktivált tierek.
   */
  private selectSet(
    set: ItemSet, open: boolean, seen: Set<string>, tiersSeen: Set<string>,
    canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement,
  ): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('codex.setHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = t(set.nameKey);
    hintEl.textContent = '';
    this.drawSetEmblem(canvas, set, true, 56);
    // Tagok: minden tag-tárgy ikonja (zárva sötét, ha még nem vetted fel)
    const memberEls = this.setMembers(set.id).map((it) => {
      const mseen = seen.has(it.name);
      const mc = document.createElement('canvas');
      mc.className = 'set-member-canvas';
      mc.width = 48; mc.height = 48;
      this.drawPerkFigure(mc, it, mseen, 17, 0);
      return el('div', { class: mseen ? 'set-member' : 'set-member locked', title: mseen ? itemName(it) : '???' }, [mc]);
    });
    // Bónuszok: tier-soronként küszöb → hatás (a hatás csak aktiválás után)
    const tierEls = set.tiers.map((tier) => {
      const known = tiersSeen.has(`${set.id}:${tier.need}`);
      return el('div', { class: known ? 'set-tier' : 'set-tier locked' }, [
        el('span', { class: 'set-tier-need', text: t('codex.setTierNeed', { n: tier.need }), style: `color:${set.color}` }),
        el('span', { class: 'set-tier-arrow', text: '→' }),
        el('span', { class: 'set-tier-bonus', text: known ? t(tier.descKey) : `??? · ${t('codex.setLockedBonus')}` }),
      ]);
    });
    statsEl.replaceChildren(el('div', { class: 'set-detail' }, [
      el('div', { class: 'set-sub', text: t('codex.setMembers') }),
      el('div', { class: 'set-members' }, memberEls),
      el('div', { class: 'set-sub', text: t('codex.setBonuses') }),
      el('div', { class: 'set-tiers' }, tierEls),
    ]));
  }

  /** Egy skill animált ikonja a megadott canvasra (zárva sötét sziluett). */
  private drawSkillFigure(c: HTMLCanvasElement, skill: Skill, open: boolean, r: number, t: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    drawSkillIcon(ctx, skill.id, c.width / 2, c.height / 2 + 2, r, t, skill.col, shade(skill.col, -0.4));
  }

  /** A kijelölt skill részletezése (név + leírás) + folyamatos animáció. */
  private selectSkill(skill: Skill, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('codex.skillHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = skillName(skill);
    statsEl.replaceChildren(el('span', { class: 'best-stat', text: skillDesc(skill) }));
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      this.drawSkillFigure(canvas, skill, true, 46, (now - start) / 1000);
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  // ---- Kódex: Vándorok (#53) ----

  /** Egy vándor csuklyás avatárja a fülkébe (zárva sötét „?"). */
  private drawWandererFigure(c: HTMLCanvasElement, ch: CharacterDef, open: boolean): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    drawHoodedSigil(ctx, c.width / 2, c.height / 2 + 4, ch.accent, ch.tearColor, 0.5);
  }

  /** A kijelölt vándor részletezése: avatár (pulzáló halo) + leírás + stat-irányok + skill. */
  private selectWanderer(ch: CharacterDef, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren(el('span', { class: 'best-stat', text: t('char.locked') }));
      hintEl.textContent = t('codex.wandererHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = t(`char.${ch.id}.name`);
    // stat-irány: ▲ jobb / ▼ rosszabb / = alap. A tűzgyorsaságnál a >1 szorzó RITKÁBB
    // tűz (rosszabb), ezért az irányt ott megfordítjuk.
    const dirSpan = (label: string, dir: number): HTMLElement =>
      el('span', { class: 'best-stat', text: `${label}: ${dir > 0 ? '▲' : dir < 0 ? '▼' : '='}`,
        style: `color:${dir > 0 ? '#9ad88a' : dir < 0 ? '#e08a6a' : 'rgba(220,205,170,0.72)'}` });
    const sk = SKILLS.find((s) => s.id === (ch.skillId ?? ''));
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: t(`char.${ch.id}.desc`) }),
      dirSpan(t('char.stat.dmg'), Math.sign((ch.dmgMul ?? 1) - 1)),
      dirSpan(t('char.stat.spd'), Math.sign((ch.speedMul ?? 1) - 1)),
      dirSpan(t('char.stat.rate'), -Math.sign((ch.fireRateMul ?? 1) - 1)),
      dirSpan(t('char.stat.hp'), Math.sign((ch.maxHpHearts ?? 3) - 3)),
      el('span', { class: 'best-stat', text: t('char.skillLabel', { skill: sk ? skillName(sk) : t('codex.skillNone') }) }),
    );
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2 + 12);
        ctx.scale(2, 2);
        drawHoodedSigil(ctx, 0, 0, ch.accent, ch.tearColor, 0.5 + 0.5 * Math.sin(ts * 2.2));
        ctx.restore();
      }
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  // ---- Kódex: Próbák (#51) ----

  /** Kihívás-gyémánt (accent-színű, fazettás): teljesítve fényesebb, egyébként tompa. */
  private drawChallengeGem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, accent: string, done: boolean): void {
    ctx.save();
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.4);
    glow.addColorStop(0, accent + (done ? '88' : '40'));
    glow.addColorStop(1, accent + '00');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
    // gyémánt-sziluett
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, -r * 0.18); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, -r * 0.18);
    ctx.closePath();
    if (done) {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, shade(accent, 0.45));
      g.addColorStop(1, shade(accent, -0.4));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = shade(accent, -0.55);
    }
    ctx.fill();
    ctx.strokeStyle = done ? accent : shade(accent, -0.1);
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.stroke();
    // fazetta-vonalak
    ctx.strokeStyle = accent + '99';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, -r * 0.18); ctx.lineTo(r * 0.72, -r * 0.18);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  }

  private drawChallengeFigure(c: HTMLCanvasElement, ch: ChallengeDef, done: boolean): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    this.drawChallengeGem(ctx, c.width / 2, c.height / 2, 21, ch.accent, done);
  }

  /** A kijelölt próba részletezése: leírás + pont-szorzó + teljesítve-állapot. */
  private selectChallenge(ch: ChallengeDef, done: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    nameEl.textContent = t(`challenge.${ch.id}.name`);
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: t(`challenge.${ch.id}.desc`) }),
      el('span', { class: 'best-stat', text: t('codex.scoreMul', { mul: ch.scoreMul }), style: `color:${ch.accent}` }),
      el('span', { class: 'best-stat', text: done ? t('codex.cleared') : t('codex.notCleared'),
        style: `color:${done ? '#9ad88a' : 'rgba(220,205,170,0.72)'}` }),
    );
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawChallengeGem(ctx, canvas.width / 2, canvas.height / 2, 48 + Math.sin(ts * 2) * 2, ch.accent, done);
      }
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  // ---- Kódex: Érdemek (Ú3) ----

  private featTierColor(tier: string): string {
    return tier === 'gold' ? '#ecc94b' : tier === 'silver' ? '#cdd3dc' : '#c0814a';
  }

  /** Tier-medál: feloldva színes ragyogó ★, zárva tompa korong „?"-lel. */
  private drawMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, open: boolean): void {
    ctx.save();
    ctx.translate(cx, cy);
    if (open) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, open ? shade(col, 0.4) : '#3a3630');
    g.addColorStop(1, open ? shade(col, -0.42) : '#23201c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = open ? col : 'rgba(160,150,130,0.4)';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = open ? shade(col, 0.55) : 'rgba(200,190,170,0.5)';
    ctx.font = `bold ${Math.round(r * 0.92)}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(open ? '★' : '?', 0, r * 0.06);
    ctx.restore();
  }

  private drawFeatFigure(c: HTMLCanvasElement, a: AchievementDef, open: boolean, r: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    this.drawMedallion(ctx, c.width / 2, c.height / 2, r, this.featTierColor(a.tier), open);
  }

  /** A kijelölt érdem részletezése: a feltétel (leírás) MINDIG látszik (a név csak feloldva). */
  private selectFeat(a: AchievementDef, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    nameEl.textContent = open ? t(`ach.${a.id}.name`) : t('best.locked');
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: t(`ach.${a.id}.desc`) }),
      el('span', { class: 'best-stat', text: t(`codex.tier.${a.tier}`), style: `color:${this.featTierColor(a.tier)}` }),
      el('span', { class: 'best-stat', text: open ? t('codex.unlocked') : t('codex.lockedShort'),
        style: `color:${open ? '#9ad88a' : 'rgba(220,205,170,0.72)'}` }),
    );
    hintEl.textContent = open ? '' : t('codex.featHint');
    const col = this.featTierColor(a.tier);
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawMedallion(ctx, canvas.width / 2, canvas.height / 2, 54 + (open ? Math.sin(ts * 2) * 2 : 0), col, open);
      }
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  // ---- Kódex: Fiolák (#44) ----

  /** A Kódex display-színe egy fiola-hatáshoz (STABIL, NEM a per-futás szín→hatás
   *  társítás - csak a bejegyzés-ikon színe; a játékbeli találgatást nem szivárogtatja). */
  private drawFiolaFigure(c: HTMLCanvasElement, idx: number, open: boolean): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    drawFiola(ctx, c.width / 2, c.height / 2 - 2, 19, FIOLA_COLORS[idx % FIOLA_COLORS.length]!, { glow: true });
  }

  /** A kijelölt fiola-hatás részletezése: leírás + jótékony/ártalmas jelzés. */
  private selectFiola(f: FiolaEffectDef, idx: number, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('codex.fiolaHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = t(f.nameKey);
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: t(f.descKey) }),
      el('span', { class: 'best-stat', text: f.good ? t('codex.good') : t('codex.bad'),
        style: `color:${f.good ? '#9ad88a' : '#e08a6a'}` }),
    );
    hintEl.textContent = '';
    const col = FIOLA_COLORS[idx % FIOLA_COLORS.length]!;
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawFiola(ctx, canvas.width / 2, canvas.height / 2 + 8, 44, col, { glow: true, rot: Math.sin(ts * 1.5) * 0.08 });
      }
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  // ---- Kódex: Sorslapok (#46/#47) ----

  private drawCardFigure(c: HTMLCanvasElement, def: CardDef, open: boolean, r: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!open) { this.drawLocked(c); return; }
    ctx.clearRect(0, 0, c.width, c.height);
    drawCard(ctx, c.width / 2, c.height / 2, r, def, { glow: true });
  }

  /** A kijelölt sorslap részletezése: leírás + lap/rúna típus. */
  private selectCard(def: CardDef, open: boolean, canvas: HTMLCanvasElement, nameEl: HTMLElement, statsEl: HTMLElement, hintEl: HTMLElement): void {
    if (this.bestiaryRaf) { cancelAnimationFrame(this.bestiaryRaf); this.bestiaryRaf = 0; }
    if (!open) {
      nameEl.textContent = t('best.locked');
      statsEl.replaceChildren();
      hintEl.textContent = t('codex.cardHint');
      this.drawLocked(canvas);
      return;
    }
    nameEl.textContent = t(def.nameKey);
    statsEl.replaceChildren(
      el('span', { class: 'best-stat', text: t(def.descKey) }),
      el('span', { class: 'best-stat', text: def.kind === 'rune' ? t('codex.kindRune') : t('codex.kindCard'),
        style: `color:${def.col}` }),
    );
    hintEl.textContent = '';
    const start = performance.now();
    const tick = (now: number): void => {
      const ts = (now - start) / 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCard(ctx, canvas.width / 2, canvas.height / 2, 56, def, { glow: true, rot: Math.sin(ts * 1.2) * 0.06 });
      }
      this.bestiaryRaf = requestAnimationFrame(tick);
    };
    this.bestiaryRaf = requestAnimationFrame(tick);
  }

  /** BEÁLLÍTÁSOK hub: grafika / hang / irányítás / általános almenük (belül váltanak). */
  showSettings(view: SettingsView): void {
    this.hideAll();
    this.ensureAtmos(this.settings);
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
        value: view.autoQuality ? 'auto' : String(Math.round(view.renderScale * 100)),
        options: [
          { value: 'auto', label: t('set.resolution.auto') },
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
      toggleField({ label: t('set.fps'), value: view.fpsShown, onChange: () => this.onAction('toggle-fps'), onLabel: t('common.on'), offLabel: t('common.off'), hint: t('set.fps.help') }),
      toggleField({ label: t('set.gamefeel'), value: view.gameFeel, onChange: () => this.onAction('toggle-gamefeel'), onLabel: t('common.on'), offLabel: t('common.off'), hint: t('set.gamefeel.help') }),
      toggleField({ label: t('set.hitstop'), value: view.hitStop, onChange: () => this.onAction('toggle-hitstop'), onLabel: t('common.on'), offLabel: t('common.off'), hint: t('set.hitstop.help') }),
      toggleField({ label: t('set.thicktears'), value: view.thickTears, onChange: () => this.onAction('toggle-thicktears'), onLabel: t('common.on'), offLabel: t('common.off'), hint: t('set.thicktearsHint') }),
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
    // MOST feloldott teljesítmények (a Game az id-ket küldi, itt fordítjuk)
    const ach = d.newAchievements ?? [];
    const achPart = ach.length
      ? `<br><span class="newbest">${t('go.newAch', { names: ach.map((id) => t(`ach.${id}.name`)).join(', ') })}</span>`
      : '';
    // Seed-kód (#49): kattintásra a vágólapra másol, hogy a futás megosztható/újrajátszható.
    const seedPart = d.seed
      ? `<br><span class="go-seed" role="button" tabindex="0" title="${t('go.seed', { seed: d.seed })}">${t('go.seed', { seed: d.seed })}</span>`
      : '';
    this.finalBest.innerHTML = bestPart + placePart + achPart + seedPart;
    if (d.seed) {
      const el = this.finalBest.querySelector<HTMLElement>('.go-seed');
      el?.addEventListener('click', () => {
        navigator.clipboard?.writeText(d.seed!).catch(() => {});
        el.textContent = t('go.seedCopied');
      });
    }
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
