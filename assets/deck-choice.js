'use strict';
// =====================================================================
// Round 233: newly gained cards never go into the deck on their own (battle rewards, chests, card
// bundles, the worlds' arrival gifts, side cards). They wait in the collection and the player
// chooses what to play. Max deck size grows by 1 for every boss beaten, mini-bosses included
// (worldDeckBonus in index.html), and new slots are left empty for the player to fill.
// The Deck button counts the cards gained since the Deck screen was last opened.
// =====================================================================
function sidePoolOf(s) { return s && s.side && Array.isArray(s.side.pool) ? s.side.pool : []; }
function newCardCount(s = state) {
  if (!s || !Array.isArray(s.pool)) return 0;
  const seen = new Set(s.seenCards || []);
  return s.pool.filter(c => !seen.has(c.uid) && !s.deck.includes(c.uid)).length
    + sidePoolOf(s).filter(c => !seen.has(c.uid) && !s.side.deck.includes(c.uid)).length;
}
function markCardsSeen(s = state) { if (s && Array.isArray(s.pool)) s.seenCards = s.pool.map(c => c.uid).concat(sidePoolOf(s).map(c => c.uid)); }
function updateDeckBadge() {
  const btn = typeof document !== 'undefined' && document.getElementById ? document.getElementById('deckBtn') : null; if (!btn) return;
  const n = state ? newCardCount() : 0;
  btn.textContent = n ? 'Deck · ' + n + ' new' : 'Deck';
  if (btn.classList) btn.classList.toggle('has-new', n > 0);
  btn.title = n ? n + ' new card' + (n > 1 ? 's' : '') + ' in your collection: choose what goes in your deck' : '';
}
const saveBeforeDeckChoice = save;
save = function () { const out = saveBeforeDeckChoice.apply(this, arguments); updateDeckBadge(); return out; };
const showDeckBeforeDeckChoice = showDeck;
// Round 279: the cards that were new when the Deck screen opened come first, with a NEW ribbon, and the
// screen scrolls to them (playtest: they sat at the very bottom, about 1400px down, unmarked). They stay
// marked while the screen is open (filters redraw it) and clear when it closes.
let deckNewUids = new Set();
function newCardUids(s = state) {
  if (!s || !Array.isArray(s.pool)) return [];
  const seen = new Set(s.seenCards || []);
  return s.pool.filter(c => !seen.has(c.uid) && !s.deck.includes(c.uid)).map(c => c.uid);
}
showDeck = function () {
  const fresh = state ? newCardUids() : [], opening = typeof $ !== 'function' || !$('menuOverlay') || $('menuOverlay').classList.contains('hidden') || !$('poolCards');
  if (opening) deckNewUids = new Set(fresh); else fresh.forEach(u => deckNewUids.add(u));
  if (state) markCardsSeen();
  const out = showDeckBeforeDeckChoice.apply(this, arguments); updateDeckBadge();
  markNewInDeck(opening);
  return out;
};
function markNewInDeck(scroll) {
  const grid = typeof $ === 'function' && $('poolCards'); if (!grid || !deckNewUids.size || !grid.querySelectorAll) return;
  const fresh = state.pool.filter(c => deckNewUids.has(c.uid)), key = (name, soul) => name + '|' + (soul ? 1 : 0);
  const want = new Set(fresh.map(c => key(stat(c).name, c.soulbound)));
  const marked = [];
  for (const wrap of grid.querySelectorAll('.card-wrap')) {
    const card = wrap.querySelector('.card'), name = wrap.querySelector('.card-name');
    if (!card || !name || !want.has(key(name.textContent, card.classList.contains('soulbound')))) continue;
    wrap.classList.add('deck-new'); const tag = document.createElement('span'); tag.className = 'deck-new-tag'; tag.textContent = 'NEW'; wrap.prepend(tag); marked.push(wrap);
  }
  for (const w of marked.reverse()) grid.prepend(w);
  if (scroll && marked.length && marked[marked.length - 1].scrollIntoView) marked[marked.length - 1].scrollIntoView({ block: 'center' });
}
const closeMenuBeforeDeckNew = closeMenu;
closeMenu = function () { deckNewUids = new Set(); return closeMenuBeforeDeckNew.apply(this, arguments); };
// The button was bound before later files wrapped showDeck; bind it to the whole chain.
if (typeof $ === 'function' && $('deckBtn')) $('deckBtn').onclick = () => showDeck();
// A new journey's cards, and those of a save from before this round, count as seen.
const newGameBeforeDeckChoice = newGame;
newGame = function () { const out = newGameBeforeDeckChoice.apply(this, arguments); markCardsSeen(); updateDeckBadge(); return out; };
const restoreGameBeforeDeckChoice = restoreGame;
restoreGame = function (s) { if (s && !Array.isArray(s.seenCards)) markCardsSeen(s); const out = restoreGameBeforeDeckChoice.apply(this, arguments); updateDeckBadge(); return out; };
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#deckBtn.has-new{border-color:#f5c86a;color:#ffe3a3;box-shadow:0 0 0 1px #f5c86a55,0 0 12px #f5c86a44}'
    + '.card-wrap.deck-new{position:relative}.card-wrap.deck-new .card{box-shadow:0 0 0 2px #f5c86a,0 0 18px #f5c86a88!important}'
    + '.deck-new-tag{position:absolute;z-index:3;left:50%;top:-9px;transform:translateX(-50%);padding:1px 10px;border-radius:999px;background:#f5c86a;color:#1a1206;font:900 11px/1.5 system-ui;letter-spacing:.12em;box-shadow:0 0 10px #f5c86a99}';
  document.head.append(st);
}
// Beating a boss opens a deck slot: say so on the victory screen, as a side deck slot is.
const winBattleBeforeDeckChoice = winBattle;
winBattle = function () {
  const b = state && state.battle, before = maxDeckSize();
  const out = winBattleBeforeDeckChoice.apply(this, arguments);
  const after = maxDeckSize();
  if (after > before && b && Array.isArray(b.special)) { b.special.push('▥ Deck expanded: room for ' + after + ' cards.'); save(); }
  return out;
};
if (typeof lootTileFor === 'function') {
  const lootTileForBeforeDeckChoice = lootTileFor;
  lootTileFor = function (line) {
    const m = /^▥ Deck expanded: room for (\d+) cards/.exec(line);
    return m ? lootTileHTML('slot', 'Deck slot', 'room for ' + m[1] + ' cards') : lootTileForBeforeDeckChoice.apply(this, arguments);
  };
}
