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
import { el, pageHeader, panel, table, toggleField, button } from './kit';

export type OverlayAction =
  | 'start' | 'resume' | 'menu' | 'rank' | 'settings' | 'edit-name'
  | 'toggle-audio' | 'reset-progress' | 'narrator'
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

/** A BEÁLLÍTÁSOK lap adatai. */
export interface SettingsView {
  muted: boolean;
}

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
    this.menu.classList.add('hidden');
    this.pause.classList.add('hidden');
    this.gameover.classList.add('hidden');
    this.itemoffer.classList.add('hidden');
    this.nameModal.classList.add('hidden');
    this.rank.classList.add('hidden');
    this.settings.classList.add('hidden');
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

  showMenu(view: MenuView): void {
    this.hideAll();
    if (view.profile) {
      const ri = view.rank;
      const bi = bandInfo(ri.band);
      this.menuGreet.textContent = ri.rank > 0
        ? `Welcome, ${view.profile.name}!  ${bi.icon} ${ri.name} · Rank ${ri.rank}`
        : `Welcome, ${view.profile.name}!`;
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
    if (hint) hint.textContent = playing ? 'playing… (click to stop)' : 'click to listen';
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
      this.rankTabBtn('profile', '🎖 Profile'),
      this.rankTabBtn('records', '⏱ Records'),
      this.rankTabBtn('stats', '📊 Stats'),
      this.rankTabBtn('board', '🏆 Leaderboard'),
    );

    // minden fülnek saját fejléc (cím + egymondatos magyarázat) + tartalom
    const [title, sub, body] =
      this.rankTab === 'profile' ? ['Profile', 'Your character rank, driven by total lifetime score.', this.rankProfile(view)]
      : this.rankTab === 'records' ? ['Records', 'Your fastest clears and personal bests.', this.rankRecords(view)]
      : this.rankTab === 'stats' ? ['Lifetime stats', 'Everything you have done across all runs.', this.rankStats(view)]
      : ['Leaderboard', 'Your best local runs, ranked by score.', this.rankBoard(view)] as [string, string, HTMLElement];

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
      ? 'Top rank reached! 🏆'
      : `${fmt(ri.nextThreshold - view.totalScore)} points to rank ${ri.rank + 1}`;

    return panel('Profile', [
      el('div', { class: 'rank-row' }, [
        medal,
        el('div', { class: 'rank-meta' }, [
          el('div', { class: 'profile-name', text: view.profile?.name ?? 'Unnamed' }),
          el('div', { class: 'profile-rank', text: ri.rank > 0 ? `${bi.icon} ${ri.name} · Rank ${ri.rank}` : `${ri.name} — no rank yet` }),
          el('div', { class: 'profile-bar' }, [el('div', { class: 'profile-bar-fill', style: `width:${Math.round(ri.progress * 100)}%` })]),
          el('div', { class: 'profile-next', text: nextText }),
          el('div', { class: 'profile-next', text: `Total score: ${fmt(view.totalScore)}  ·  Deepest floor: ${view.bestFloor}` }),
        ]),
      ]),
    ]);
  }

  /** Rekord-almenü: csúcs-mutatók + szintenkénti és labirintus-leggyorsabb idők. */
  private rankRecords(view: RankView): HTMLElement {
    const rec = view.records;
    const highlights = statGrid([
      ['Best score', fmt(rec.bestScore)],
      ['Longest survival', formatTime(rec.longestRun)],
      ['Deepest floor', `⬇ ${view.bestFloor}`],
      ['Floors timed', `${view.floorRecords.length}`],
    ]);

    const floorPanel = view.floorRecords.length
      ? table(['Floor', 'Level', 'Best time'],
          view.floorRecords.map((r) => [`⬇ ${r.floor}`, r.label, formatTime(r.time, true)]))
      : el('p', { class: 'adm-sub', text: 'No floor cleared yet — beat a boss and step on the trapdoor to set a time.' });

    const labPanel = view.labRecords.length
      ? table(['Labyrinth', 'Best time'],
          view.labRecords.map((r) => [r.label, formatTime(r.time, true)]))
      : el('p', { class: 'adm-sub', text: 'No labyrinth completed yet.' });

    return el('div', {}, [
      panel('Highlights', [highlights]),
      panel('Fastest floor clears', [floorPanel]),
      panel('Fastest labyrinths', [labPanel]),
    ]);
  }

  /** Statisztika-almenü: élethosszig összesítők + származtatott mutatók. */
  private rankStats(view: RankView): HTMLElement {
    const s = view.stats;
    const per = (n: number, d: number): string => (d > 0 ? (n / d).toFixed(1) : '–');
    const totals = statGrid([
      ['Play time', formatTime(s.playTime)],
      ['Runs', `${s.runs}`],
      ['Deaths', `${s.deaths}`],
      ['Kills', fmt(s.kills)],
      ['Boss kills', `${s.bossKills}`],
      ['Floors cleared', `${s.floorsCleared}`],
      ['Rooms cleared', `${s.roomsCleared}`],
      ['Labyrinths', `${s.labsCleared}`],
      ['Coins collected', fmt(s.coins)],
    ]);
    const derived = statGrid([
      ['Kills / run', per(s.kills, s.runs)],
      ['Avg score / run', s.runs > 0 ? fmt(view.totalScore / s.runs) : '–'],
      ['Kills / death', per(s.kills, s.deaths)],
      ['Rooms / run', per(s.roomsCleared, s.runs)],
    ]);
    return el('div', {}, [
      panel('Lifetime totals', [totals]),
      panel('Averages', [derived]),
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
      new Date(r.date).toLocaleDateString('en-GB'),
    ]);
    return panel('Local leaderboard — best runs', [
      view.leaderboard.length
        ? table(['#', 'Name', 'Rank', 'Score', 'Floor', 'Time', 'Date'], rows)
        : el('p', { class: 'adm-sub', text: 'No results yet — start a run!' }),
    ]);
  }

  /** BEÁLLÍTÁSOK lap (admin-kinézet): hang, név, haladás-törlés + irányítás. */
  showSettings(view: SettingsView): void {
    this.hideAll();

    const nameRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label', text: 'Character name' }),
      button('✎ Edit', () => this.onAction('edit-name'), 'ghost'),
    ]);
    const resetRow = el('label', { class: 'adm-field' }, [
      el('span', { class: 'adm-field-label' }, [
        'Reset progress',
        el('small', { class: 'adm-field-help', text: 'total score, rank and leaderboard (name is kept)' }),
      ]),
      button('🗑 Reset', () => this.onAction('reset-progress'), 'danger'),
    ]);

    const controls = table(['Key', 'Action'], [
      ['W A S D', 'move'],
      ['↑ ↓ ← →', 'tear shooting'],
      ['🖱 mouse', 'aimed shooting'],
      ['P / Esc', 'pause'],
      ['E', 'active skill'],
      ['B', 'drop bomb'],
    ]);

    this.settingsBody.replaceChildren(el('div', { class: 'adm-page' }, [
      pageHeader('Settings', 'Audio, character name and progress. Controls below.'),
      panel('General', [
        toggleField({ label: 'Audio', value: !view.muted, onChange: () => this.onAction('toggle-audio'), onLabel: 'ON', offLabel: 'OFF' }),
        nameRow,
        resetRow,
      ]),
      panel('Controls', [controls]),
    ]));
    this.settings.classList.remove('hidden');
  }

  /**
   * Karakternév bekérő modal. `current` megadva = szerkesztés (MÉGSEM = bezár,
   * marad a régi név). `current` nélkül = első indítás (KIHAGYOM = alapnévvel
   * indít). Mindkét esetben BEZÁRHATÓ — nem ragad be.
   */
  showNameModal(current?: string): void {
    this.nameFirstRun = current === undefined;
    this.nameCancelable = true;
    this.nameModalTitle.textContent = this.nameFirstRun ? "What's your name, adventurer?" : 'Edit character name';
    this.nameInput.value = current ?? '';
    this.nameCancel.textContent = this.nameFirstRun ? 'SKIP' : 'CANCEL';
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
    this.goTitle.textContent = d.won ? 'YOU WON!' : 'YOU DIED';
    this.finalScore.textContent = `Floor: ${d.floorName}  •  Score: ${fmt(d.score)}  •  ${d.coins}¢`;

    const bi = bandInfo(d.rank.band);
    const rankLine = d.rank.rank > 0 ? `${bi.icon} ${d.rank.name} · Rank ${d.rank.rank}` : d.rank.name;
    const totalLine = `<span class="go-total">Total score: ${fmt(d.totalScore)}</span>`;
    this.finalRank.innerHTML = d.rankedUp
      ? `<span class="newbest">NEW RANK! ${rankLine} 🏅</span><br>${totalLine}`
      : `${rankLine}<br>${totalLine}`;
    if (d.rank.rank > 0) {
      paintMedal(this.goMedal, d.rank.rank, d.rank.band);
      this.goMedal.classList.remove('hidden');
    } else {
      this.goMedal.classList.add('hidden');
    }

    const bestPart = d.isBestFloor
      ? '<span class="newbest">DEEPEST FLOOR! 🏆</span>'
      : `Deepest floor so far: ${d.bestFloor}`;
    const placePart = d.place > 0 ? ` · Leaderboard #${d.place}` : '';
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
