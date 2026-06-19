/**
 * Egyszerű, függőség-mentes többnyelvűség (i18n) a JÁTÉK-felülethez.
 *
 * A motor szándékosan zéró-dependenciás, ezért nincs külső i18n-csomag: egy
 * `t(kulcs)` keresés egy beágyazott szótárból, localStorage-perzisztenciával és
 * egy `[data-i18n]` DOM-alkalmazóval. Nyelvek: angol (alap) és magyar.
 *
 * FONTOS hatókör:
 *  - Ez a JÁTÉK nyelvét váltja (főmenü, szünet, game over, modálok, …).
 *  - Az ADMIN felület MARAD magyar (a fejlesztőnek), ezt a modul NEM érinti.
 *
 * Migrációs állapot (lásd MECHANIKA_BACKLOG / külön egyeztetés):
 *  - 1A. FÁZIS (kész): a statikus DOM-menüréteg (`index.html` [data-i18n]) +
 *    a Beállítások nyelvváltója.
 *  - 1B. FÁZIS (kész): az Overlays által futásidőben renderelt DOM-szövegek
 *    (főmenü-üdvözlés, RANG-hub, BEÁLLÍTÁSOK, irányítás, KÖZREMŰKÖDŐK, név-modal,
 *    game over) - mind a `t()` keresésen át, paraméteres behelyettesítéssel.
 *  - 1C. FÁZIS (kész): a canvas-feliratok (HUD stat-panel/idő-órák/PILLS/BOSS,
 *    hub-kapuk, labirintus-nézet) + a lebegő visszajelzések (`addFloater`) és a
 *    bolti/sorsoló ajánlat-ablakok template-jei. A vászon képkockánként újrarajzol,
 *    így ezek nyelvváltáskor maguktól frissülnek.
 *  - 1D. FÁZIS (nevek kész): a tartalmi adat NEVEI + rövid leírásai (tárgy/skill/
 *    fogyóeszköz/fejezet/rang) a `tc(en, key)` helperen + `CONTENT_HU` szótáron át.
 *    Az angol a definícióban marad (forrás + perk-azonosító), a HU külön szótárban.
 *  - Hátra (1D story-k): a fejezet-story-k és hosszú leírások fordítása (külön
 *    menet). Ezek MÁR magyarul vannak a levels.ts-ben; az ANGOL verzió hiányzik,
 *    így EN nyelven a magyar story látszik.
 */

export type Lang = 'en' | 'hu';

const LANG_KEY = 'sentex_lang';
const LANGS: readonly Lang[] = ['en', 'hu'];

/** Egy nyelv kulcs→szöveg szótára. A kulcsok pontozott, beszédes nevek. */
type Dict = Record<string, string>;

/** Angol (alap nyelv): minden kulcsnak ITT kell lennie - ez a fallback. */
const EN: Dict = {
  'nav.play': 'Play',
  'nav.rank': 'Rank',
  'nav.bestiary': 'Codex',
  'nav.settings': 'Settings',
  'nav.credits': 'Credits',
  'narration.label': "Nim's Story",
  'narration.playing': 'playing… (click to stop)',
  'narration.listen': 'click to listen',
  'pause.title': 'PAUSED',
  'pause.resume': 'RESUME',
  'pause.quit': 'QUIT',
  'common.cancel': 'CANCEL',
  'common.back': '← BACK',
  'common.go': 'GO',
  'common.on': 'ON',
  'common.off': 'OFF',
  'gameover.retry': 'RETRY',
  'gameover.mainMenu': 'MAIN MENU',
  'name.badge': '🧑 CHARACTER',
  'name.desc': "You'll appear on the leaderboard under this name.",
  'name.placeholder': 'Character name',
  'name.rule': 'Letters and numbers only · max 12 · no spaces',
  'header.rank': 'RANK',
  'header.bestiary': 'CODEX',
  'best.count': '{n} / {total} discovered',
  'best.locked': 'Undiscovered',
  'best.lockedHint': 'Defeat this creature to reveal its entry.',
  'best.pick': 'Select a niche to inspect the entry.',
  'best.hp': 'HP',
  'best.dmg': 'DMG',
  'best.tier': 'Tier',
  'best.creatures': 'Creatures',
  'best.bosses': 'Bosses',
  'codex.perks': 'Items',
  'codex.skills': 'Abilities',
  'codex.perkHint': 'Pick up this item to reveal its entry.',
  'codex.skillHint': 'Equip this ability to reveal its entry.',
  'header.settings': 'SETTINGS',
  'lang.label': 'Language',

  // Főmenü-üdvözlés
  'menu.greet.ranked': 'Welcome, {name}!  {icon} {rank} · Rank {n}',
  'menu.greet.plain': 'Welcome, {name}!',

  // RANG-hub: fülek
  'rank.tab.profile': 'Profile',
  'rank.tab.records': 'Records',
  'rank.tab.stats': 'Stats',
  'rank.tab.board': 'Leaderboard',
  // RANG-hub: lap-fejlécek
  'rank.profile.title': 'Profile',
  'rank.profile.sub': 'Your character rank, driven by total lifetime score.',
  'rank.records.title': 'Records',
  'rank.records.sub': 'Your fastest clears and personal bests.',
  'rank.stats.title': 'Lifetime stats',
  'rank.stats.sub': 'Everything you have done across all runs.',
  'rank.board.title': 'Leaderboard',
  'rank.board.sub': 'Your best local runs, ranked by score.',
  // Profil-almenü
  'rank.topReached': 'Top rank reached! 🏆',
  'rank.pointsToNext': '{n} points to rank {r}',
  'rank.unnamed': 'Unnamed',
  'rank.rankLine': '{icon} {name} · Rank {n}',
  'rank.noRankYet': '{name} - no rank yet',
  'rank.totalDeepest': 'Total score: {score}  ·  Deepest floor: {floor}',
  // Rekord-almenü
  'rank.best.score': 'Best score',
  'rank.best.survival': 'Longest survival',
  'rank.best.deepest': 'Deepest floor',
  'rank.best.floorsTimed': 'Floors timed',
  'rank.tbl.floor': 'Floor',
  'rank.tbl.level': 'Level',
  'rank.tbl.bestTime': 'Best time',
  'rank.tbl.labyrinth': 'Labyrinth',
  'rank.noFloor': 'No floor cleared yet - beat a boss and step on the trapdoor to set a time.',
  'rank.noLab': 'No labyrinth completed yet.',
  'rank.panel.highlights': 'Highlights',
  'rank.panel.floorClears': 'Fastest floor clears',
  'rank.panel.labs': 'Fastest labyrinths',
  // Statisztika-almenü
  'stat.playTime': 'Play time',
  'stat.runs': 'Runs',
  'stat.deaths': 'Deaths',
  'stat.kills': 'Kills',
  'stat.bossKills': 'Boss kills',
  'stat.floorsCleared': 'Floors cleared',
  'stat.roomsCleared': 'Rooms cleared',
  'stat.labs': 'Labyrinths',
  'stat.coins': 'Coins collected',
  'stat.killsPerRun': 'Kills / run',
  'stat.avgScore': 'Avg score / run',
  'stat.killsPerDeath': 'Kills / death',
  'stat.roomsPerRun': 'Rooms / run',
  'rank.panel.totals': 'Lifetime totals',
  'rank.panel.averages': 'Averages',
  // Ranglista-almenü
  'board.col.num': '#',
  'board.col.name': 'Name',
  'board.col.rank': 'Rank',
  'board.col.score': 'Score',
  'board.col.floor': 'Floor',
  'board.col.time': 'Time',
  'board.col.date': 'Date',
  'board.empty': 'No results yet - start a run!',
  'board.panel': 'Local leaderboard - best runs',

  // BEÁLLÍTÁSOK: fülek
  'set.tab.graphics': 'Graphics',
  'set.tab.audio': 'Audio',
  'set.tab.controls': 'Controls',
  'set.tab.general': 'General',
  // BEÁLLÍTÁSOK: lap-fejlécek
  'set.graphics.title': 'Graphics',
  'set.graphics.sub': 'Visual quality and performance.',
  'set.audio.title': 'Audio',
  'set.audio.sub': 'Music and sound effect volume.',
  'set.controls.title': 'Controls',
  'set.controls.sub': 'Click a key to rebind it. Mouse aims and fires.',
  'set.general.title': 'General',
  'set.general.sub': 'Character and saved progress.',
  // Grafika
  'set.shadows': 'Shadows',
  'set.shadows.help': 'lower this if the game stutters',
  'set.shadow.off': 'Off',
  'set.shadow.hard': 'Sharp',
  'set.shadow.soft': 'Soft',
  'set.resolution': 'Resolution',
  'set.resolution.help': 'lower this for more FPS',
  'set.resolution.auto': 'Auto (60 FPS)',
  'set.panel.display': 'Display',
  'set.fullscreen': 'Fullscreen',
  'set.shake': 'Screen shake',
  'set.fps': 'FPS counter',
  'set.fps.help': 'shows real frames per second in the corner',
  'set.gamefeel': 'Game feel',
  'set.gamefeel.help': 'muzzle flash, impact sparks, recoil and camera kick + drift - purely visual',
  'set.hitstop': 'Hit-stop',
  'set.hitstop.help': 'brief freeze on a hit for extra punch (some find it jittery)',
  'set.thicktears': 'Thick shots',
  'set.thicktearsHint': 'Visual only - does not make hitting enemies easier.',
  // Hang
  'set.panel.volume': 'Volume',
  'set.audio.label': 'Audio',
  'set.music': 'Music',
  'set.sfx': 'Sound effects',
  // Irányítás
  'set.group.move': 'Movement',
  'set.group.shoot': 'Shooting',
  'set.group.action': 'Actions',
  'set.panel.alwaysOn': 'Always on',
  'set.aimFire': 'Aim & fire',
  'set.key.mouse': '🖱 Mouse',
  'set.quitPause': 'Quit / pause',
  'set.mute': 'Mute',
  'set.resetBinds': '↺ Reset to defaults',
  'set.panel.gamepad': '🎮 Controller',
  'set.gp.note': 'Auto-detected, fixed layout. Press any button to wake the controller.',
  'set.gp.leftStick': 'Left stick',
  'set.gp.rightStick': 'Right stick',
  'set.ctrlsub.keyboard': 'Keyboard',
  'set.ctrlsub.ps': 'PlayStation',
  'set.ctrlsub.xbox': 'Xbox',
  'set.capture': 'Press a key…',
  'bind.up': 'Move up',
  'bind.down': 'Move down',
  'bind.left': 'Move left',
  'bind.right': 'Move right',
  'bind.shoot-up': 'Shoot up',
  'bind.shoot-down': 'Shoot down',
  'bind.shoot-left': 'Shoot left',
  'bind.shoot-right': 'Shoot right',
  'bind.skill': 'Active skill',
  'bind.bomb': 'Drop bomb',
  'bind.tnt': 'Throw TNT',
  'bind.pause': 'Pause',
  // Általános
  'set.charName': 'Character name',
  'set.edit': '✎ Edit',
  'set.resetProgress': 'Reset progress',
  'set.resetProgress.help': 'total score, rank, leaderboard, records and stats (name is kept)',
  'set.reset': '🗑 Reset',
  'set.panel.profile': 'Profile',

  // KÖZREMŰKÖDŐK
  'credits.title': 'Credits',
  'credits.back': '← Back',
  'credits.music': 'Music',
  'credits.game': 'Game',
  'credits.where.menu': 'Main menu',
  'credits.where.cellar': 'The Cellar',
  'credits.where.hollow': 'Hollow',
  'credits.where.depths': 'Depths',
  'credits.where.necropolis': 'Necropolis',
  'credits.where.dragon': "Dragon's Lair",
  'credits.where.combat': 'Combat',
  'credits.gameName': 'Sentex: The Cellar',
  'credits.team': '© Easyskil Team',
  'credits.tech': 'Procedural Canvas engine. TypeScript, Vite. No game-engine dependencies.',

  // Név-modal
  'name.modal.new': "What's your name, adventurer?",
  'name.modal.edit': 'Edit character name',
  'name.skip': 'SKIP',

  // Game over
  'go.won': 'YOU WON!',
  'go.died': 'YOU DIED',
  'go.scoreLine': 'Floor: {floor}  •  Score: {score}  •  {coins}¢',
  'go.total': 'Total score: {score}',
  'go.newRank': 'NEW RANK! {line} 🏅',
  'go.deepest': 'DEEPEST FLOOR! 🏆',
  'go.deepestSoFar': 'Deepest floor so far: {floor}',
  'go.place': ' · Leaderboard #{n}',

  // ---- Canvas-feliratok (1C) ----
  // HUD
  'hud.deepest': 'DEEPEST: {n}',
  'hud.boss': 'BOSS',
  'hud.bossIntroKicker': 'A PRESENCE STIRS',
  'hud.pills': 'PILLS',
  'hud.pillsMore': 'PILLS  ·  +{n}',
  'hud.skillReady': 'READY - E',
  'hud.skillCharging': 'charging…',
  'hud.stat.damage': 'Damage',
  'hud.stat.fireRate': 'Fire rate',
  'hud.stat.range': 'Range',
  'hud.stat.shotSpeed': 'Shot speed',
  'hud.stat.speed': 'Speed',
  'hud.stat.luck': 'Luck',
  'hud.stat.sight': 'Sight',
  'hud.timer.labyrinth': 'LABYRINTH',
  'hud.timer.room': 'ROOM',
  'hud.timer.map': 'MAP',
  // Hub-kapuk
  'gate.labyrinth': 'LABYRINTH',
  'gate.dungeon': 'DUNGEON',
  'gate.story': 'STORY',
  'gate.boss': 'BOSS',
  'gate.soon': 'SOON',
  'hub.choose': 'CHOOSE YOUR PATH',
  // Labirintus-nézet
  'lab.controls': 'WASD: move · shoot · ESC: back · find the ▼ exit',
  'lab.complete': 'LABYRINTH COMPLETE!',
  'lab.reward.badge': '🏆 LABYRINTH CLEARED',
  'lab.reward.sub': 'Reward kept by your character  ·  +{coins}¢',
  // Lebegő visszajelzések
  'fx.noCoins': 'Not enough coins!',
  'fx.skipped': 'Skipped: {name}',
  'fx.pickup': '{name} - {desc}',
  'fx.jackpot': 'JACKPOT! {name}',
  'fx.plusBomb': '+Bomb',
  'fx.plusHeart': '+Heart',
  'fx.rerollPoor': 'Reroll: {price}¢ - not enough',
  'fx.rerollOk': 'New offer! (-{price}¢)',
  'fx.tickLatch': 'a tick latched on!',
  'fx.tickMinus': 'tick -1',
  'fx.slow': 'SLOW -50%',
  'fx.bossDefeated': 'BOSS DEFEATED!',
  'fx.comingSoon': 'COMING SOON',
  'fx.free': 'FREE · {name}',
  // Ajánlat-ablak (bolt / sorsolás / pedesztál)
  'offer.gamble.badge': '🎰 GAMBLE',
  'offer.gamble.noWinTitle': 'No win',
  'offer.gamble.noWinDesc': "Luck wasn't on your side this time.",
  'offer.gamble.noWinSub': 'Try again, or reroll the offer!',
  'offer.ok': 'OK',
  'offer.skillWon.badge': '✨ SKILL WON',
  'offer.freeSkill.badge': '✨ FREE SKILL',
  'offer.take': 'TAKE',
  'offer.activeSkill': 'Active skill · charges over {n} rooms',
  'offer.activeSkillE': 'Active skill · press E · charges over {n} rooms',
  'offer.replaces': '  ·  replaces: {name}',
  'offer.purchase.badge': '🛒 PURCHASE',
  'offer.consumable.badge': '🛒 CONSUMABLE',
  'offer.priceHave': 'Price: {price}¢  ·  you have: {coins}¢',
  'offer.buy': 'BUY ({price}¢)',
};

/** Magyar fordítás. Hiányzó kulcsra az angol érték a fallback. */
const HU: Dict = {
  'nav.play': 'Játék',
  'nav.rank': 'Rang',
  'nav.bestiary': 'Kódex',
  'nav.settings': 'Beállítások',
  'nav.credits': 'Közreműködők',
  'narration.label': 'Nim története',
  'narration.playing': 'lejátszás… (kattints a leállításhoz)',
  'narration.listen': 'kattints a meghallgatáshoz',
  'pause.title': 'SZÜNET',
  'pause.resume': 'FOLYTATÁS',
  'pause.quit': 'KILÉPÉS',
  'common.cancel': 'MÉGSEM',
  'common.back': '← VISSZA',
  'common.go': 'MEHET',
  'common.on': 'BE',
  'common.off': 'KI',
  'gameover.retry': 'ÚJRA',
  'gameover.mainMenu': 'FŐMENÜ',
  'name.badge': '🧑 KARAKTER',
  'name.desc': 'Ezen a néven kerülsz fel a ranglistára.',
  'name.placeholder': 'Karakternév',
  'name.rule': 'Csak betű és szám · max 12 · szóköz nélkül',
  'header.rank': 'RANG',
  'header.bestiary': 'KÓDEX',
  'best.count': '{n} / {total} felfedezve',
  'best.locked': 'Felfedezetlen',
  'best.lockedHint': 'Győzd le ezt a lényt a bejegyzés feloldásához.',
  'best.pick': 'Válassz egy fülkét a bejegyzés megtekintéséhez.',
  'best.hp': 'ÉP',
  'best.dmg': 'SEB',
  'best.tier': 'Szint',
  'best.creatures': 'Lények',
  'best.bosses': 'Bossok',
  'codex.perks': 'Tárgyak',
  'codex.skills': 'Képességek',
  'codex.perkHint': 'Vedd fel ezt a tárgyat a bejegyzés feloldásához.',
  'codex.skillHint': 'Szereld fel ezt a képességet a bejegyzés feloldásához.',
  'header.settings': 'BEÁLLÍTÁSOK',
  'lang.label': 'Nyelv',

  // Főmenü-üdvözlés
  'menu.greet.ranked': 'Üdv, {name}!  {icon} {rank} · {n}. rang',
  'menu.greet.plain': 'Üdv, {name}!',

  // RANG-hub: fülek
  'rank.tab.profile': 'Profil',
  'rank.tab.records': 'Rekordok',
  'rank.tab.stats': 'Statisztika',
  'rank.tab.board': 'Ranglista',
  // RANG-hub: lap-fejlécek
  'rank.profile.title': 'Profil',
  'rank.profile.sub': 'A karaktered rangja, az élethosszig gyűjtött összpontszám alapján.',
  'rank.records.title': 'Rekordok',
  'rank.records.sub': 'A leggyorsabb teljesítéseid és egyéni csúcsaid.',
  'rank.stats.title': 'Élethosszig statisztika',
  'rank.stats.sub': 'Minden, amit az összes futásod során elértél.',
  'rank.board.title': 'Ranglista',
  'rank.board.sub': 'A legjobb helyi futásaid pontszám szerint rangsorolva.',
  // Profil-almenü
  'rank.topReached': 'Elérted a legmagasabb rangot! 🏆',
  'rank.pointsToNext': '{n} pont a(z) {r}. rangig',
  'rank.unnamed': 'Névtelen',
  'rank.rankLine': '{icon} {name} · {n}. rang',
  'rank.noRankYet': '{name} - még nincs rang',
  'rank.totalDeepest': 'Összpontszám: {score}  ·  Legmélyebb szint: {floor}',
  // Rekord-almenü
  'rank.best.score': 'Legjobb pontszám',
  'rank.best.survival': 'Leghosszabb túlélés',
  'rank.best.deepest': 'Legmélyebb szint',
  'rank.best.floorsTimed': 'Mért szintek',
  'rank.tbl.floor': 'Szint',
  'rank.tbl.level': 'Pálya',
  'rank.tbl.bestTime': 'Legjobb idő',
  'rank.tbl.labyrinth': 'Labirintus',
  'rank.noFloor': 'Még nincs teljesített szint - győzd le egy boss-t és lépj a csapóajtóra egy idő rögzítéséhez.',
  'rank.noLab': 'Még nincs teljesített labirintus.',
  'rank.panel.highlights': 'Kiemelt mutatók',
  'rank.panel.floorClears': 'Leggyorsabb szint-teljesítések',
  'rank.panel.labs': 'Leggyorsabb labirintusok',
  // Statisztika-almenü
  'stat.playTime': 'Játékidő',
  'stat.runs': 'Futások',
  'stat.deaths': 'Halálok',
  'stat.kills': 'Ölések',
  'stat.bossKills': 'Boss-ölések',
  'stat.floorsCleared': 'Teljesített szintek',
  'stat.roomsCleared': 'Kipucolt szobák',
  'stat.labs': 'Labirintusok',
  'stat.coins': 'Begyűjtött érmék',
  'stat.killsPerRun': 'Ölés / futás',
  'stat.avgScore': 'Átlagpont / futás',
  'stat.killsPerDeath': 'Ölés / halál',
  'stat.roomsPerRun': 'Szoba / futás',
  'rank.panel.totals': 'Élethosszig összesítők',
  'rank.panel.averages': 'Átlagok',
  // Ranglista-almenü
  'board.col.num': '#',
  'board.col.name': 'Név',
  'board.col.rank': 'Rang',
  'board.col.score': 'Pont',
  'board.col.floor': 'Szint',
  'board.col.time': 'Idő',
  'board.col.date': 'Dátum',
  'board.empty': 'Még nincs eredmény - indíts egy futást!',
  'board.panel': 'Helyi ranglista - legjobb futások',

  // BEÁLLÍTÁSOK: fülek
  'set.tab.graphics': 'Grafika',
  'set.tab.audio': 'Hang',
  'set.tab.controls': 'Irányítás',
  'set.tab.general': 'Általános',
  // BEÁLLÍTÁSOK: lap-fejlécek
  'set.graphics.title': 'Grafika',
  'set.graphics.sub': 'Vizuális minőség és teljesítmény.',
  'set.audio.title': 'Hang',
  'set.audio.sub': 'Zene és hangeffekt hangereje.',
  'set.controls.title': 'Irányítás',
  'set.controls.sub': 'Kattints egy billentyűre az átkötéshez. Az egér céloz és lő.',
  'set.general.title': 'Általános',
  'set.general.sub': 'Karakter és mentett haladás.',
  // Grafika
  'set.shadows': 'Árnyékok',
  'set.shadows.help': 'csökkentsd, ha akadozik a játék',
  'set.shadow.off': 'Ki',
  'set.shadow.hard': 'Éles',
  'set.shadow.soft': 'Lágy',
  'set.resolution': 'Felbontás',
  'set.resolution.help': 'csökkentsd a nagyobb FPS-ért',
  'set.resolution.auto': 'Auto (60 FPS)',
  'set.panel.display': 'Megjelenítés',
  'set.fullscreen': 'Teljes képernyő',
  'set.shake': 'Képernyőrázás',
  'set.fps': 'FPS-számláló',
  'set.fps.help': 'valós képkocka/másodperc a sarokban',
  'set.gamefeel': 'Játékérzet',
  'set.gamefeel.help': 'csőtorkolat-villanás, becsapódás-szikra, visszarúgás, kamera-kick + sodródás - tisztán vizuális',
  'set.hitstop': 'Hit-stop',
  'set.hitstop.help': 'rövid kimerevítés találatkor az ütősebb érzetért (egyeseknek zavaró)',
  'set.thicktears': 'Vastag lövedék',
  'set.thicktearsHint': 'Csak vizuális - nem találja el könnyebben az ellenfelet.',
  // Hang
  'set.panel.volume': 'Hangerő',
  'set.audio.label': 'Hang',
  'set.music': 'Zene',
  'set.sfx': 'Hangeffektek',
  // Irányítás
  'set.group.move': 'Mozgás',
  'set.group.shoot': 'Lövés',
  'set.group.action': 'Műveletek',
  'set.panel.alwaysOn': 'Mindig aktív',
  'set.aimFire': 'Célzás és lövés',
  'set.key.mouse': '🖱 Egér',
  'set.quitPause': 'Kilépés / szünet',
  'set.mute': 'Némítás',
  'set.resetBinds': '↺ Gyári visszaállítás',
  'set.panel.gamepad': '🎮 Kontroller',
  'set.gp.note': 'Automatikus felismerés, fix kiosztás. Egy gombnyomás ébreszti a kontrollert.',
  'set.gp.leftStick': 'Bal stick',
  'set.gp.rightStick': 'Jobb stick',
  'set.ctrlsub.keyboard': 'Billentyűzet',
  'set.ctrlsub.ps': 'PlayStation',
  'set.ctrlsub.xbox': 'Xbox',
  'set.capture': 'Nyomj egy billentyűt…',
  'bind.up': 'Mozgás fel',
  'bind.down': 'Mozgás le',
  'bind.left': 'Mozgás balra',
  'bind.right': 'Mozgás jobbra',
  'bind.shoot-up': 'Lövés fel',
  'bind.shoot-down': 'Lövés le',
  'bind.shoot-left': 'Lövés balra',
  'bind.shoot-right': 'Lövés jobbra',
  'bind.skill': 'Aktív képesség',
  'bind.bomb': 'Bomba lerakása',
  'bind.tnt': 'TNT dobása',
  'bind.pause': 'Szünet',
  // Általános
  'set.charName': 'Karakternév',
  'set.edit': '✎ Szerkeszt',
  'set.resetProgress': 'Haladás törlése',
  'set.resetProgress.help': 'összpontszám, rang, ranglista, rekordok és statisztika (a név megmarad)',
  'set.reset': '🗑 Törlés',
  'set.panel.profile': 'Profil',

  // KÖZREMŰKÖDŐK
  'credits.title': 'Közreműködők',
  'credits.back': '← Vissza',
  'credits.music': 'Zene',
  'credits.game': 'Játék',
  'credits.where.menu': 'Főmenü',
  'credits.where.cellar': 'A Pince',
  'credits.where.hollow': 'Üreg',
  'credits.where.depths': 'Mélység',
  'credits.where.necropolis': 'Nekropolisz',
  'credits.where.dragon': 'Sárkány barlangja',
  'credits.where.combat': 'Harc',
  'credits.gameName': 'Sentex: A Pince',
  'credits.team': '© Easyskil Team',
  'credits.tech': 'Procedurális Canvas-motor. TypeScript, Vite. Nincs játékmotor-függőség.',

  // Név-modal
  'name.modal.new': 'Mi a neved, kalandor?',
  'name.modal.edit': 'Karakternév szerkesztése',
  'name.skip': 'KIHAGYOM',

  // Game over
  'go.won': 'GYŐZTÉL!',
  'go.died': 'MEGHALTÁL',
  'go.scoreLine': 'Szint: {floor}  •  Pont: {score}  •  {coins}¢',
  'go.total': 'Összpontszám: {score}',
  'go.newRank': 'ÚJ RANG! {line} 🏅',
  'go.deepest': 'LEGMÉLYEBB SZINT! 🏆',
  'go.deepestSoFar': 'Eddigi legmélyebb szint: {floor}',
  'go.place': ' · Ranglista #{n}',

  // ---- Canvas-feliratok (1C) ----
  // HUD
  'hud.deepest': 'LEGMÉLYEBB: {n}',
  'hud.boss': 'BOSS',
  'hud.bossIntroKicker': 'VALAMI ÉBREDEZIK',
  'hud.pills': 'TABLETTÁK',
  'hud.pillsMore': 'TABLETTÁK  ·  +{n}',
  'hud.skillReady': 'KÉSZ - E',
  'hud.skillCharging': 'töltés…',
  'hud.stat.damage': 'Sebzés',
  'hud.stat.fireRate': 'Tűzgyorsaság',
  'hud.stat.range': 'Hatótáv',
  'hud.stat.shotSpeed': 'Lövedéksebesség',
  'hud.stat.speed': 'Sebesség',
  'hud.stat.luck': 'Szerencse',
  'hud.stat.sight': 'Látótáv',
  'hud.timer.labyrinth': 'LABIRINTUS',
  'hud.timer.room': 'SZOBA',
  'hud.timer.map': 'PÁLYA',
  // Hub-kapuk
  'gate.labyrinth': 'LABIRINTUS',
  'gate.dungeon': 'KAZAMATA',
  'gate.story': 'TÖRTÉNET',
  'gate.boss': 'BOSS',
  'gate.soon': 'HAMAROSAN',
  'hub.choose': 'VÁLASZD AZ UTAD',
  // Labirintus-nézet
  'lab.controls': 'WASD: mozgás · lövés · ESC: vissza · keresd a ▼ kijáratot',
  'lab.complete': 'LABIRINTUS TELJESÍTVE!',
  'lab.reward.badge': '🏆 LABIRINTUS TELJESÍTVE',
  'lab.reward.sub': 'A jutalom a karaktereden marad  ·  +{coins}¢',
  // Lebegő visszajelzések
  'fx.noCoins': 'Nincs elég érme!',
  'fx.skipped': 'Kihagyva: {name}',
  'fx.pickup': '{name} - {desc}',
  'fx.jackpot': 'FŐNYEREMÉNY! {name}',
  'fx.plusBomb': '+Bomba',
  'fx.plusHeart': '+Szív',
  'fx.rerollPoor': 'Újrasorsolás: {price}¢ - nincs elég',
  'fx.rerollOk': 'Új ajánlat! (-{price}¢)',
  'fx.tickLatch': 'egy kullancs rád tapadt!',
  'fx.tickMinus': 'kullancs -1',
  'fx.slow': 'LASSÍTÁS -50%',
  'fx.bossDefeated': 'BOSS LEGYŐZVE!',
  'fx.comingSoon': 'HAMAROSAN',
  'fx.free': 'INGYEN · {name}',
  // Ajánlat-ablak (bolt / sorsolás / pedesztál)
  'offer.gamble.badge': '🎰 SZERENCSEJÁTÉK',
  'offer.gamble.noWinTitle': 'Nincs nyeremény',
  'offer.gamble.noWinDesc': 'A szerencse most nem állt melléd.',
  'offer.gamble.noWinSub': 'Próbáld újra, vagy sorsold újra az ajánlatot!',
  'offer.ok': 'RENDBEN',
  'offer.skillWon.badge': '✨ SKILL NYERVE',
  'offer.freeSkill.badge': '✨ INGYEN SKILL',
  'offer.take': 'ELVISZEM',
  'offer.activeSkill': 'Aktív képesség · {n} szoba alatt tölt fel',
  'offer.activeSkillE': 'Aktív képesség · E gomb · {n} szoba alatt tölt fel',
  'offer.replaces': '  ·  lecseréli: {name}',
  'offer.purchase.badge': '🛒 VÁSÁRLÁS',
  'offer.consumable.badge': '🛒 FOGYÓESZKÖZ',
  'offer.priceHave': 'Ár: {price}¢  ·  nálad: {coins}¢',
  'offer.buy': 'VÉTEL ({price}¢)',
};

const DICT: Record<Lang, Dict> = { en: EN, hu: HU };

/**
 * Tartalmi (adatvezérelt) szövegek magyar fordítása (1D fázis): tárgy/skill/
 * fogyóeszköz/fejezet/rang NEVEK és rövid leírások. A kulcs az angol definícióból
 * képzett stabil azonosító (lásd `tc`). Az ANGOL itt szándékosan NINCS jelen: az
 * angol a definíció (forrás), ezt a `tc` adja vissza fallbackként - így nincs
 * duplikáció. A story-k/fejezet-leírások NEM ide tartoznak (külön menet).
 */
const CONTENT_HU: Dict = {
  // Tárgyak (a kulcs az angol név; az angol marad a perk-azonosító)
  'item.Sharp Tear.name': 'Éles Könny',
  'item.Sharp Tear.desc': '+sebzés',
  'item.Spider Leg.name': 'Pókláb',
  'item.Spider Leg.desc': '+sebesség',
  'item.Rainstone.name': 'Esőkő',
  'item.Rainstone.desc': 'gyorsabb tűz',
  'item.Spyglass.name': 'Távcső',
  'item.Spyglass.desc': '+hatótáv',
  'item.Flywheel.name': 'Lendkerék',
  'item.Flywheel.desc': '+lövedéksebesség',
  'item.Twin Drop.name': 'Iker Csepp',
  'item.Twin Drop.desc': 'dupla lövés',
  'item.Blood Heart.name': 'Vérszív',
  'item.Blood Heart.desc': '+1 szív, gyógyít',
  'item.Horseshoe.name': 'Patkó',
  'item.Horseshoe.desc': '+szerencse',
  'item.Lantern.name': 'Lámpás',
  'item.Lantern.desc': '+látótáv',
  'item.Dark Veil.name': 'Sötét Fátyol',
  'item.Dark Veil.desc': '−látótáv, ++sebzés',
  'item.War Mark.name': 'Háborús Jel',
  'item.War Mark.desc': '++sebzés',
  'item.Winged Sandal.name': 'Szárnyas Saru',
  'item.Winged Sandal.desc': '++sebesség',
  'item.Triple Tear.name': 'Hármas Könny',
  'item.Triple Tear.desc': '3 lövés, rövidebb táv',
  'item.Buckshot Eye.name': 'Sörétes Szem',
  'item.Buckshot Eye.desc': 'sok lövés, közeli táv',
  'item.Needle Point.name': 'Tűhegy',
  'item.Needle Point.desc': 'átütő lövés',
  'item.Rubber Wall.name': 'Gumifal',
  'item.Rubber Wall.desc': 'falról pattan',
  "item.Hunter's Eye.name": 'Vadász Szeme',
  "item.Hunter's Eye.desc": 'célkövető lövés',
  'item.Ghost Tear.name': 'Szellem Könny',
  'item.Ghost Tear.desc': 'átrepül a sziklákon',
  'item.Shrapnel Drop.name': 'Repesz Csepp',
  'item.Shrapnel Drop.desc': 'találatkor szétválik',
  'item.Knockback Tear.name': 'Lökő Könny',
  'item.Knockback Tear.desc': 'hátralöki az ellenfelet',
  'item.Ember Tear.name': 'Parázs Könny',
  'item.Ember Tear.desc': 'égő sebzés (DoT)',
  'item.Venom Drop.name': 'Méreg Csepp',
  'item.Venom Drop.desc': 'mérgező sebzés (DoT)',
  'item.Frost Shard.name': 'Fagyszilánk',
  'item.Frost Shard.desc': 'megfagyasztja a célt',
  'item.Lightning Eye.name': 'Villám Szem',
  'item.Lightning Eye.desc': 'láncvillám a közelben',
  'item.Sulfur Beam.name': 'Kénkő-sugár',
  'item.Sulfur Beam.desc': 'folyamatos sugár (a lövést váltja)',
  'item.Hellfire Breath.name': 'Pokoltüzes lehelet',
  'item.Hellfire Breath.desc': 'lángkúp (a lövést váltja)',
  'item.Charged Shot.name': 'Felhúzott csapás',
  'item.Charged Shot.desc': 'töltött lövés (a lövést váltja)',
  'item.Signet Ring.name': 'Pecsétgyűrű',
  'item.Signet Ring.desc': 'utazó sebző-korong (a lövést váltja)',
  'item.Moonstone.name': 'Holdkő',
  'item.Moonstone.desc': 'keringő sebző gömb',
  'item.Guardian Fly.name': 'Őrző Légy',
  'item.Guardian Fly.desc': 'lövedékeket blokkol',
  'item.Shockwave Scroll.name': 'Lökéshullám Tekercs',
  'item.Shockwave Scroll.desc': 'képesség: Lökéshullám',
  'item.Time Vial.name': 'Idő Fiola',
  'item.Time Vial.desc': 'képesség: Időlassítás',
  'item.Teleport Stone.name': 'Teleport Kő',
  'item.Teleport Stone.desc': 'képesség: Teleport',
  'item.Shield Amulet.name': 'Pajzs Amulett',
  'item.Shield Amulet.desc': 'képesség: Pajzs',
  'item.Blessing.name': 'Áldás',
  'item.Blessing.desc': 'képesség: Gyógyítás',

  // Aktív képességek (kulcs a skill id)
  'skill.nova.name': 'Lökéshullám',
  'skill.nova.desc': 'közeli ellenfeleket eltol (kis sebzés)',
  'skill.slow.name': 'Időlassítás',
  'skill.slow.desc': 'lelassítja az ellenfeleket',
  'skill.shield.name': 'Pajzs',
  'skill.shield.desc': '5mp sebezhetetlenség',
  'skill.heal.name': 'Gyógyítás',
  'skill.heal.desc': '+1 szív',
  'skill.blink.name': 'Teleport',
  'skill.blink.desc': 'a célzás felé ugrik',

  // Fogyóeszközök (kulcs a fajta)
  'cons.bomb.name': 'Bomba',
  'cons.bomb.desc': 'Lerakható bomba',
  'cons.tnt.name': 'TNT',
  'cons.tnt.desc': 'Erős TNT-töltet',
  'cons.heart.name': 'Szív',
  'cons.heart.desc': '+1 szív (azonnal gyógyít)',

  // Fejezetek (kulcs a fejezet id; a story-k/leírások NEM itt vannak)
  'chapter.pince.name': 'A Pince',
  'chapter.ureg.name': 'Üreg',
  'chapter.melyseg.name': 'Mélység',
  'chapter.necropolis.name': 'Nekropolisz',
  'chapter.dragonlair.name': 'Sárkány Barlangja',
  // Boss-nevek (a boss-introhoz)
  'chapter.pince.boss': 'A Lárva',
  'chapter.ureg.boss': 'A Kőfaló',
  'chapter.melyseg.boss': 'A Mélység Ura',
  'chapter.necropolis.boss': 'Sátán',
  'chapter.dragonlair.boss': 'A Sárkány',

  // Rang-nevek (kulcs az angol név)
  'rank.name.Rookie': 'Újonc',
  'rank.name.Cellar Dweller': 'Pincelakó',
  'rank.name.Rat Slayer': 'Patkányölő',
  'rank.name.Hollow Delver': 'Üreg Kutató',
  'rank.name.Deepwalker': 'Mélyjáró',
  'rank.name.Shadow Hunter': 'Árnyvadász',
  'rank.name.Bone Collector': 'Csontgyűjtő',
  'rank.name.Dread Hunter': 'Rémvadász',
  'rank.name.Hellwalker': 'Pokoljáró',
  'rank.name.Lord of the Depths': 'Mélység Ura',
  'rank.name.Legend of the Cellar': 'A Pince Legendája',
};

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY) ?? '';
    if ((LANGS as readonly string[]).includes(v)) return v as Lang;
  } catch {
    /* localStorage nem elérhető - alap nyelv */
  }
  return 'en';
}

let current: Lang = readLang();
const listeners = new Set<(l: Lang) => void>();

/** A jelenlegi nyelv. */
export function getLang(): Lang {
  return current;
}

/**
 * Egy kulcs fordítása a jelenlegi nyelvre (ismeretlenre az angol, végül a kulcs).
 * A `params` megadásakor a szövegben lévő `{név}` helyőrzők behelyettesítődnek,
 * pl. `t('go.total', { score: '1 200' })`.
 */
/**
 * Tartalmi szöveg fordítása: az `en` a definícióbeli kanonikus angol (FORRÁS), a
 * `key` a `CONTENT_HU` kulcsa. Angol nyelven az `en`-t adja vissza; magyaron a
 * `CONTENT_HU[key]`-t, ha van, különben az angolt (fallback). Így a definíció
 * marad az angol forrás, és nincs EN-duplikáció.
 */
export function tc(en: string, key: string): string {
  if (current === 'en') return en;
  return CONTENT_HU[key] ?? en;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICT[current][key] ?? EN[key] ?? key;
  if (params) {
    for (const k in params) s = s.replaceAll(`{${k}}`, String(params[k]));
  }
  return s;
}

/** Feliratkozás a nyelvváltásra (a UI újrarajzolásához). */
export function onLangChange(cb: (l: Lang) => void): void {
  listeners.add(cb);
}

/**
 * A `[data-i18n]` (textContent) és `[data-i18n-ph]` (input placeholder) jelölésű
 * DOM-elemek lefordítása a jelenlegi nyelvre. Idempotens - bármikor újrahívható.
 */
export function applyDomI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-ph]').forEach((node) => {
    const key = node.dataset.i18nPh;
    if (key) node.placeholder = t(key);
  });
}

/** Nyelvváltás: perzisztálás + a DOM újrafordítása + a feliratkozók értesítése. */
export function setLang(l: Lang): void {
  if (!(LANGS as readonly string[]).includes(l) || l === current) return;
  current = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* nem elérhető - csak memóriában */ }
  document.documentElement.lang = l;
  applyDomI18n();
  listeners.forEach((cb) => cb(l));
}

/** Indításkor (a DOM kész állapotában) a mentett nyelv alkalmazása. A main.ts hívja. */
export function initI18n(): void {
  document.documentElement.lang = current;
  applyDomI18n();
}
