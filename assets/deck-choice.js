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
showDeck = function () { if (state) markCardsSeen(); const out = showDeckBeforeDeckChoice.apply(this, arguments); updateDeckBadge(); return out; };
// The button was bound before later files wrapped showDeck; bind it to the whole chain.
if (typeof $ === 'function' && $('deckBtn')) $('deckBtn').onclick = () => showDeck();
// A new journey's cards, and those of a save from before this round, count as seen.
const newGameBeforeDeckChoice = newGame;
newGame = function () { const out = newGameBeforeDeckChoice.apply(this, arguments); markCardsSeen(); updateDeckBadge(); return out; };
const restoreGameBeforeDeckChoice = restoreGame;
restoreGame = function (s) { if (s && !Array.isArray(s.seenCards)) markCardsSeen(s); const out = restoreGameBeforeDeckChoice.apply(this, arguments); updateDeckBadge(); return out; };
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#deckBtn.has-new{border-color:#f5c86a;color:#ffe3a3;box-shadow:0 0 0 1px #f5c86a55,0 0 12px #f5c86a44}';
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
