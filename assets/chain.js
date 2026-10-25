'use strict';
// =====================================================================
// Round 261 (owner request): ⛓ Chain. Every card you play by hand this turn adds a link (side cards,
// pitching and Suspend's automatic plays don't count, as with Follow-through). A card with
// "⛓ Chain N" gets its bonus when at least N cards were played before it this turn; it glows in
// hand when ready, and the battle screen shows the count as a chip. Small fixed thresholds in the
// manner of Slay the Spire's Shuriken / Follow-Up rather than an open-ended Storm count, so cheap cards
// help but cannot snowball. Tailwind (Gust Chain) and Cinder Lance's Daze keep their own rules.
// =====================================================================
// Bonuses per tier, written onto existing cards.
const CHAIN_CARDS = {
  chainLightning: [{ at: 3, hits: 1 }, { at: 3, hits: 1 }, { at: 3, hits: 1 }, { at: 3, hits: 1 }],
  clockworkVolley: [{ at: 3, damage: 2 }, { at: 3, damage: 2 }, { at: 3, damage: 3 }, { at: 3, damage: 3 }],
  spark: [{ at: 3, damage: 3 }, { at: 3, damage: 4 }, { at: 3, damage: 6 }, { at: 3, damage: 8 }],
  scarabSwarm: [{ at: 3, poison: 2 }, { at: 3, poison: 2 }, { at: 3, poison: 3 }, { at: 3, poison: 3 }],
  arcJab: [{ at: 2, aether: 1 }, { at: 2, aether: 1 }, { at: 2, aether: 1 }, { at: 2, aether: 1 }]
};
for (const [id, tiers] of Object.entries(CHAIN_CARDS)) if (defs[id]) defs[id].tiers.forEach((t, i) => { t.chain = tiers[i] || tiers[tiers.length - 1]; });

function chainLinks(b = state && state.battle) { return b && b.links && b.links.turn === b.turn ? b.links.n : 0; }
function chainReady(b, d) { return !!(b && d && d.chain && chainLinks(b) >= d.chain.at); }
function chainWords(ch, multi) {
  return Object.entries(ch).filter(([k]) => k !== 'at').map(([k, n]) => k === 'hits' ? '+' + n + ' hit' + (n > 1 ? 's' : '') : k === 'damage' ? '+' + n + ' damage' + (multi ? ' per hit' : '') : k === 'poison' ? '+' + n + ' Poison' : k === 'aether' ? '+' + n + ' Aether' : '+' + n + ' ' + k).join(', ');
}
let chainPlain = false;
const statBeforeChain = stat;
stat = function (c) {
  const d = statBeforeChain(c);
  if (!d || !d.chain || chainPlain) return d;
  const b = typeof state === 'object' && state && state.battle;
  if (!b || b.phase !== 'fight' || (typeof liveBattleCard === 'function' && !liveBattleCard(b, c)) || !chainReady(b, d)) return d;
  const out = { ...d };
  for (const [k, n] of Object.entries(d.chain)) if (k !== 'at') out[k] = (out[k] || 0) + n;
  return out;
};
const rulesBeforeChain = rules;
rules = function (c) {
  const def = defs[c && c.id], d = def && def.tiers[c.level || 0];
  if (!d || !d.chain) return rulesBeforeChain(c);
  chainPlain = true; let text; try { text = rulesBeforeChain(c); } finally { chainPlain = false; }
  return text + ' ⛓ Chain ' + d.chain.at + ': ' + chainWords(d.chain, (d.hits || 1) > 1) + ' if you already played ' + d.chain.at + ' cards this turn.';
};
// Count the links. A card that wasn't played (not enough energy) adds none.
const playCardBeforeChain = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand && b.hand[i];
  if (!b || b.phase !== 'fight' || !c) return playCardBeforeChain.apply(this, arguments);
  const auto = b.firingUid === c.uid, d = stat(c), ready = chainReady(b, d), turn = b.turn;
  const r = playCardBeforeChain.apply(this, arguments);
  if (state.battle === b && !b.hand.includes(c) && !auto) {
    if (ready && b.logs) b.logs.push('⛓ Chain ' + d.chain.at + ': ' + d.name + ' ' + chainWords(d.chain, (d.hits || 1) > 1) + '.');
    b.links = { turn, n: (b.links && b.links.turn === turn ? b.links.n : 0) + 1 };
    if (b.phase === 'fight') renderBattle();
  }
  return r;
};
// The count as a chip next to the turn badge (only for decks with Chain cards), and a glow on ready cards.
function deckHasChain(b) { return [...(b.hand || []), ...(b.draw || []), ...(b.discard || [])].some(c => defs[c.id] && defs[c.id].tiers.some(t => t.chain)); }
const renderBattleBeforeChain = renderBattle;
renderBattle = function () {
  renderBattleBeforeChain.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelector) return;
  const bar = document.querySelector('#battleModal .compact-bar');
  if (bar && bar.querySelector && deckHasChain(b) && !bar.querySelector('.chain-count')) {
    const n = chainLinks(b), chip = document.createElement('span');
    chip.className = 'fx-chip chain-count' + (n ? ' on' : ''); chip.tabIndex = 0; chip.textContent = '⛓ ' + n;
    chip.dataset.tip = 'Chain: ' + n + ' card' + (n === 1 ? '' : 's') + ' played this turn. Cards with ⛓ Chain get their bonus once enough cards were played before them this turn.';
    const turn = bar.querySelector('.badge'); if (turn && turn.after) turn.after(chip); else bar.append(chip);
  }
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const c = b.hand[i], d = c && stat(c); if (!d || !d.chain || !chainReady(b, d)) return;
    const card = wrap.querySelector && wrap.querySelector('.card'); if (card && card.classList) card.classList.add('chain-ready');
  });
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#hand .card.chain-ready{box-shadow:0 0 0 2px #9ad7ff,0 0 16px #6fc8ffaa}#battleModal .fx-chip.chain-count{color:#bfe6ff}#battleModal .fx-chip.chain-count.on{border-color:#9ad7ff;background:#6fc8ff22}';
  document.head.append(st);
}
