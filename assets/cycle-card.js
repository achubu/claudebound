'use strict';
// =====================================================================
// Round 236: SIFT, a deck-cycling card found in every world (0 energy: draw 1, then discard a card
// of your choice from your hand, not the card just drawn). Upgrades: +1 Aether at level 1, draw 2 at level 2, both at level 3.
// After it resolves the hand waits for the choice: clicking a card discards it instead of playing it,
// other cards can't be played until then, and ending the turn ends the choice (the hand is discarded
// anyway). Discarding never counts as playing a card (no recap line, no Follow-through, no Pressure).
// Loaded after touch-controls and layout-polish, so the choice owns the hand's clicks on every screen.
// =====================================================================
tieredCard('sift', 'Sift', 0, 'Skill', '⇄', [{ draw: 1, siftDiscard: 1 }, { draw: 1, siftDiscard: 1, aether: 1 }, { draw: 2, siftDiscard: 1 }, { draw: 2, siftDiscard: 1, aether: 1 }]);
// Like the Prismatic Counter, it drops in every world's card rewards.
for (const pool of Object.values(VARIETY_POOLS)) if (!pool.includes('sift')) pool.push('sift');
NEW_CARD_WORLD.sift = 'city';

const rulesBeforeSift = rules;
rules = function (c) {
  const d = defs[c && c.id] && defs[c.id].tiers[c.level || 0];
  const text = rulesBeforeSift(c);
  if (!d || !d.siftDiscard) return text;
  return text.replace(/Draw (\d+)\./, (m, n) => 'Draw ' + n + ' card' + (n > 1 ? 's' : '') + ', then discard ' + d.siftDiscard + ' card you already held (your choice).');
};
// The cards that may be discarded: the hand, less what Sift just drew (the owner's rule).
function siftChoices(b = state && state.battle) { return b && b.hand ? b.hand.map((c, i) => i).filter(i => !(b.siftDrawn || []).includes(b.hand[i].uid)) : []; }
function siftPending(b = state && state.battle) { return !!(b && b.phase === 'fight' && b.siftPick > 0 && siftChoices(b).length); }

const playCardBeforeSift = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i];
  if (siftPending(b)) { toast((b.siftReason === 'swipe' ? 'Swipe' : 'Sift') + ': choose a card to discard first.'); return; }
  const held = b ? b.hand.map(x => x.uid) : [];
  const r = playCardBeforeSift.apply(this, arguments);
  if (b && c && c.id === 'sift' && !b.hand.includes(c) && b.phase === 'fight') {
    b.siftPick = stat(c).siftDiscard || 1; b.siftReason = 'sift'; b.siftDrawn = b.hand.filter(x => !held.includes(x.uid)).map(x => x.uid);
    if (siftPending(b)) { b.logs.push('⇄ Sift: choose a card to discard.'); save(); renderBattle(); } else { b.siftPick = 0; b.siftDrawn = []; }
  }
  return r;
};
function siftDiscard(i) {
  const b = state && state.battle; if (!siftPending(b)) return false;
  const c = b.hand[i]; if (!c || !siftChoices(b).includes(i)) return false;
  b.hand.splice(i, 1); b.discard.push(c);
  if (Array.isArray(b.pitch)) b.pitch = b.pitch.filter(u => u !== c.uid);
  if (b.savedUid === c.uid) b.savedUid = null;
  const why = b.siftReason === 'swipe' ? '🗡 Swipe' : '⇄ Sift';
  b.siftPick--; if (!b.siftPick) { b.siftDrawn = []; b.siftReason = null; }
  b.logs.push(why + ': discarded ' + stat(c).name + '.');
  save(); renderBattle(); return true;
}
// The card the simulator (and nobody's hand) would miss least: a junk card, else the weakest.
function siftDefaultIndex(b = state.battle) {
  const choices = siftChoices(b);
  const junk = choices.find(i => typeof isJunk === 'function' && isJunk(b.hand[i])); if (junk !== undefined) return junk;
  const worth = c => { const d = stat(c); return (d.damage || 0) + (d.block || 0) + (d.heal || 0) + (d.counter ? 50 : 0) + (d.cost === 0 ? 3 : 0); };
  return choices.reduce((best, i) => worth(b.hand[i]) < worth(b.hand[best]) ? i : best, choices[0]);
}
const endTurnBeforeSift = endTurn;
endTurn = function () { const b = state && state.battle; if (b) { b.siftPick = 0; b.siftDrawn = []; b.siftReason = null; } return endTurnBeforeSift.apply(this, arguments); };

const renderBattleBeforeSift = renderBattle;
renderBattle = function () {
  renderBattleBeforeSift.apply(this, arguments);
  const b = state && state.battle, modal = typeof document !== 'undefined' && document.getElementById ? document.getElementById('battleModal') : null;
  if (modal && modal.classList) modal.classList.toggle('sift-picking', siftPending(b));
  if (!siftPending(b) || !document.querySelectorAll) return;
  const title = modal.querySelector('.hand-title .muted') || modal.querySelector('.hand-title');
  const note = document.createElement('div'); note.className = 'sift-note';
  note.textContent = (b.siftReason === 'swipe' ? '🗡 Swipe: choose a card to discard' : '⇄ Sift: choose a card you already held to discard') + (b.siftPick > 1 ? ' (' + b.siftPick + ' left)' : '') + '.'; // Round 242: an enemy's Swipe uses this screen too
  if (title && title.after) title.after(note); else if (title && title.append) title.append(note);
  const choices = siftChoices(b);
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const card = wrap.querySelector('.card'); if (!card) return;
    wrap.querySelectorAll('.ability').forEach(btn => { btn.disabled = true; });
    if (!choices.includes(i)) { card.disabled = true; card.classList.add('sift-drawn'); card.title = 'Just drawn: it stays in your hand'; card.onclick = null; return; }
    card.disabled = false; card.classList.add('sift-target'); card.title = 'Discard this card';
    card.onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); siftDiscard(i); };
  });
  modal.querySelectorAll('.touch-card-action').forEach(el => el.remove());
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.sift-note{margin:4px 0 6px;padding:6px 10px;border:1px solid #f5c86a;border-radius:8px;background:#2a2110;color:#ffe3a3;font-weight:700}'
    + '#battleModal.sift-picking #hand .card.sift-target{cursor:pointer;outline:2px dashed #f5c86a;outline-offset:2px}'
    + '#battleModal.sift-picking #hand .card.sift-target:hover{filter:brightness(.75) sepia(.4)}'
    + '#battleModal.sift-picking #hand .card.sift-drawn{opacity:.55;cursor:not-allowed;position:relative}'
    + '#battleModal.sift-picking #hand .card.sift-drawn:after{content:"JUST DRAWN";position:absolute;z-index:3;inset:44% 8% auto;padding:4px 0;text-align:center;font:700 12px system-ui;letter-spacing:.08em;color:#ffe3a3;background:#2a2110e6;border:1px solid #f5c86a;border-radius:6px}';
  document.head.append(st);
}
