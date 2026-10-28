'use strict';
// =====================================================================
// Round 226: a tutorial for every new journey. A few short pages go over what Neon Aftermath
// teaches (exploring, battles, Block and ⚔ Pressure, Aether and the side deck, ⌁ Hack, Soulbound
// and Impermanent cards), then you pick the 6 cards your journey starts with. The first copy of
// each card you pick is Soulbound, as in the old fixed starter set.
// It opens from the start screen's "Begin new journey" and the main menu's "New journey"
// (newGame() itself stays plain, so tests and the Difficulty lab are unaffected). Until the pick
// is made the journey keeps the old starter deck, and a reload reopens the pick.
// =====================================================================
const TUTORIAL_OFFER = ['strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'riposte', 'focus', 'mend', 'nanoMend'];
const TUTORIAL_PICK = 6;
let tutorialOpen = false;

function tutorialPages() {
  const hack = typeof WORLD_MECHANICS === 'object' && WORLD_MECHANICS.city;
  const per = typeof PRESSURE_PER_BY_WORLD === 'object' ? PRESSURE_PER_BY_WORLD.city : 3;
  return [
    { title: 'Welcome to Neon Aftermath', body: '<p>A ruined city still running on broken code. Walk its streets (tap or click a path, or use WASD / the arrow keys) and press <b>M</b> for the map.</p>'
      + '<ul><li><b>Patrols</b> stand on the streets: walk into one to fight it.</li><li><b>Chests, relics and points of interest</b> sit beside the streets. <b>⟁ Nexus Waypoints</b> let you travel back to places you have been.</li>'
      + '<li>Two <b>mini-bosses</b> each guard a piece of gear. Wear both to open the final boss\'s room; beat the <b>Thorn Warden</b> there and a portal opens to the next world.</li></ul>' },
    { title: 'Battles', body: '<ul><li>You get <b>3 energy</b> each turn and draw a hand. A card\'s cost is the number in its top corner.</li>'
      + '<li>The enemy shows its move for <b>this turn</b> and <b>the turn after</b>. When you press <b>End turn</b>, it makes this turn\'s move.</li>'
      + '<li>Some moves carry an <b>affliction</b> (a debuff on you or a buff on the enemy), shown a turn ahead so you can prepare.</li></ul>' },
    { title: 'Defend or press', body: '<p>Enemy hits are big, so every turn ask: defend, or press?</p>'
      + '<ul><li><b>◈ Block</b> soaks up the enemy\'s attack this turn, then it is gone.</li>'
      + '<li><b>⚔ Pressure</b>: on a turn where you gain <b>no</b> Block, every ' + per + ' damage you deal takes 1 off the enemy\'s attack that turn, up to ' + Math.round(PRESSURE_CAP * 100) + '%. The enemy\'s move shows the lower number as you play.</li>'
      + '<li><b>Healing</b> cards (Bloom of Life, Nano Mend) restore HP, and HP carries over between fights.</li></ul>' },
    { title: 'Aether and the side deck', body: '<ul><li>Energy you don\'t spend becomes <b>✦ Aether</b> at the end of your turn. You can also <b>pitch</b> a card from your hand: it burns away for the rest of the fight and gives its cost + 1 Aether.</li>'
      + '<li>Aether pays for your <b>side deck</b>: answers to afflictions such as Purifying Light (cleanses debuffs), Aegis Ward (shields a big hit) and Dispel Lance (breaks enemy buffs).</li></ul>' },
    { title: (hack ? hack.icon + ' ' : '') + 'Hack, Neon Aftermath\'s own trick', body: '<p>After your first win here you get two <b>Hack</b> cards.</p>'
      + (hack ? '<ul>' + hack.steps.map(s => '<li>' + s + '</li>').join('') + '</ul><p class="muted">' + hack.tip + '</p>' : '')
      + '<p class="muted">Every world has its own mechanic like this, with a short guide in battle.</p>' },
    { title: 'Your cards', body: '<ul><li><b>◆ Soulbound</b> cards are yours for good: they are never lost and level up with Card Mastery.</li>'
      + '<li><b>◇ Impermanent</b> cards level up as you use them, but <b>losing a fight</b> destroys one Impermanent card in your deck at random.</li>'
      + '<li>After each win you choose a new card. Build your deck from your collection in the <b>Deck</b> screen; it holds ' + TUTORIAL_PICK + ' cards to start, one more for every boss you beat, and more from talents. New cards wait in your collection until you put them in.</li>'
      + '<li>Levelling up gives <b>talent points</b> (Surge, Disruption, Resolve).</li></ul>' }
  ];
}

function tutorialPickHTML(picked) {
  return '<p>Pick the <b>' + TUTORIAL_PICK + ' cards</b> your journey starts with. The first copy of each card you pick is ◆ Soulbound.</p>'
    + '<p class="tutorial-count"><b>' + picked.size + ' / ' + TUTORIAL_PICK + '</b> picked</p><div class="tutorial-cards" id="tutorialCards"></div>';
}

function showTutorial(page = 0) {
  if (!state) return;
  tutorialOpen = true; state.tutorialPending = true;
  const pages = tutorialPages(), last = pages.length;
  if (page < last) {
    const p = pages[page];
    openMenu('<div class="tutorial"><div class="eyebrow">NEW JOURNEY · ' + (page + 1) + ' / ' + (last + 1) + '</div><h2>' + p.title + '</h2>' + p.body
      + '<div class="tutorial-nav">' + (page ? '<button id="tutBack">Back</button>' : '') + '<button id="tutSkip">Skip to picking cards</button><button id="tutNext" class="primary">Next</button></div></div>');
    if ($('tutBack')) $('tutBack').onclick = () => showTutorial(page - 1);
    $('tutSkip').onclick = () => showTutorial(last);
    $('tutNext').onclick = () => showTutorial(page + 1);
    return;
  }
  // The pick: the offer is made fresh each time the page opens.
  const offer = TUTORIAL_OFFER.map(id => make(id, 0, false)), picked = new Set();
  const draw = () => {
    // Show what you'll get: the first picked copy of each card is Soulbound.
    // Round 279: an unpicked card shows what picking it gives: Soulbound while no copy of it is picked yet
    // (playtest: every card read "AT RISK" under a line saying the first copy is Soulbound).
    const first = new Map(); for (const c of offer) if (picked.has(c.uid) && !first.has(c.id)) first.set(c.id, c.uid);
    for (const c of offer) c.soulbound = picked.has(c.uid) ? first.get(c.id) === c.uid : !first.has(c.id);
    openMenu('<div class="tutorial"><div class="eyebrow">NEW JOURNEY · ' + (last + 1) + ' / ' + (last + 1) + '</div><h2>Choose your starting deck</h2>' + tutorialPickHTML(picked)
      + '<div class="tutorial-nav"><button id="tutBack">Back</button><button id="tutStart" class="primary"' + (picked.size === TUTORIAL_PICK ? '' : ' disabled') + '>Start the journey</button></div></div>');
    const grid = $('tutorialCards');
    offer.forEach(c => {
      const el = cardElement(c, () => { if (picked.has(c.uid)) picked.delete(c.uid); else if (picked.size < TUTORIAL_PICK) picked.add(c.uid); draw(); }, !picked.has(c.uid) && picked.size >= TUTORIAL_PICK);
      if (picked.has(c.uid)) el.classList.add('tutorial-picked');
      grid.append(el);
    });
    $('tutBack').onclick = () => showTutorial(last - 1);
    $('tutStart').onclick = () => tutorialFinish(offer.filter(c => picked.has(c.uid)));
  };
  draw();
}

function tutorialFinish(cards) {
  if (cards.length !== TUTORIAL_PICK) return;
  const seen = new Set();
  for (const c of cards) { c.soulbound = !seen.has(c.id); seen.add(c.id); }
  state.pool = cards; state.deck = cards.map(c => c.uid);
  delete state.tutorialPending; state.tutorialDone = true; tutorialOpen = false;
  closeMenu();
  toast('Your journey begins in Neon Aftermath. Walk into a patrol to fight it.');
}

// While the tutorial is open, Escape and stray closes don't skip it.
const closeMenuBeforeTutorial = closeMenu;
closeMenu = function () { if (tutorialOpen && state && state.tutorialPending) return; return closeMenuBeforeTutorial.apply(this, arguments); };

function beginJourney() { newGame(); showTutorial(0); }
if (typeof document !== 'undefined' && typeof $ === 'function' && $('newBtn')) $('newBtn').onclick = () => beginJourney();
if (typeof showMainMenu === 'function') {
  const showMainMenuBeforeTutorial = showMainMenu;
  showMainMenu = function () {
    showMainMenuBeforeTutorial.apply(this, arguments);
    const b = $('restartJourney'); if (b) b.onclick = () => { if (confirm('Start a new journey? Export your current save first if you want to keep it.')) { tutorialOpen = false; beginJourney(); } };
  };
}
// A reload in the middle of the tutorial goes back to the pick.
if (typeof load === 'function') {
  const loadBeforeTutorial = load;
  load = function () { const r = loadBeforeTutorial.apply(this, arguments); if (state && state.tutorialPending) showTutorial(tutorialPages().length); return r; };
  if (typeof $ === 'function' && $('resumeBtn')) $('resumeBtn').onclick = () => load();
}

if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.tutorial ul{padding-left:20px;line-height:1.5}.tutorial li{margin:6px 0}.tutorial-nav{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}'
    + '.tutorial-count{margin:4px 0 10px}.tutorial-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}'
    + '.tutorial-cards .card-wrap .card{width:100%}.tutorial-cards .card-wrap.tutorial-picked .card{outline:3px solid #ffd36a;box-shadow:0 0 18px #ffd36a88}'
    + '.tutorial-cards .card-wrap .card:disabled{opacity:.45}';
  document.head.append(st);
}
