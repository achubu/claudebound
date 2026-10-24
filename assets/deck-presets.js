'use strict';
// =====================================================================
// Round 256 (owner request): three favorite decks. The Deck Workshop has three named slots; each
// keeps a main deck and a side deck. "Save current" stores what you are playing now, "Use" switches
// to a saved deck in one click, and ✎ renames a slot. Loading leaves out cards that are no longer in
// your collection, keeps the copy limit and trims to today's deck sizes (both grow with bosses). Not
// during a fight. Stored in the save as state.deckPresets.
// =====================================================================
const DECK_PRESETS = 3, DECK_PRESET_NAME_MAX = 18;
function deckPresets(s = state) {
  if (!s) return [];
  if (!Array.isArray(s.deckPresets)) s.deckPresets = [];
  while (s.deckPresets.length < DECK_PRESETS) s.deckPresets.push({ name: 'Deck ' + (s.deckPresets.length + 1), deck: null, side: null });
  return s.deckPresets;
}
function presetSaveCurrent(i) {
  const p = deckPresets()[i]; if (!p) return false;
  p.deck = [...state.deck]; p.side = state.side && Array.isArray(state.side.deck) ? [...state.side.deck] : [];
  save(); return true;
}
function presetRename(i, name) {
  const p = deckPresets()[i], n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, DECK_PRESET_NAME_MAX).trim();
  if (!p || !n) return false; p.name = n; save(); return true;
}
const presetSame = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(u => b.includes(u));
function presetInUse(i) {
  const p = deckPresets()[i]; if (!p || !p.deck) return false;
  return presetSame(p.deck, state.deck) && presetSame(p.side || [], state.side ? state.side.deck : []);
}
// Switch to slot i. Returns { ok, missing, trimmed } or { ok:false, why }.
function presetUse(i) {
  const p = deckPresets()[i];
  if (!p || !p.deck) return { ok: false, why: 'empty' };
  if (state.battle && state.battle.phase === 'fight') return { ok: false, why: 'fight' };
  const byUid = new Map(state.pool.map(c => [c.uid, c])), counts = {};
  let deck = p.deck.filter(u => byUid.has(u)), missing = p.deck.length - deck.length;
  deck = deck.filter(u => { const id = byUid.get(u).id; counts[id] = (counts[id] || 0) + 1; return counts[id] <= maxCopies(); });
  const trimmed = Math.max(0, deck.length - maxDeckSize()); deck = deck.slice(0, maxDeckSize());
  if (deck.length < MIN_DECK) return { ok: false, why: 'small', missing };
  state.deck = deck;
  if (state.side && Array.isArray(p.side)) {
    const sideOwned = new Set((state.side.pool || []).map(c => c.uid)), side = p.side.filter(u => sideOwned.has(u));
    missing += p.side.length - side.length;
    state.side.deck = side.slice(0, typeof sideDeckMax === 'function' ? sideDeckMax() : side.length);
  }
  save(); return { ok: true, missing, trimmed };
}
function deckPresetsHTML() {
  const fight = !!(state.battle && state.battle.phase === 'fight');
  return '<div class="eyebrow">FAVORITE DECKS</div><div class="preset-row">' + deckPresets().map((p, i) => {
    const used = presetInUse(i), info = p.deck ? p.deck.length + ' cards' + (p.side && p.side.length ? ' · ' + p.side.length + ' side' : '') : 'Empty';
    return '<div class="preset' + (used ? ' in-use' : '') + (p.deck ? '' : ' empty') + '" data-preset="' + i + '">'
      + '<div class="preset-head"><b class="preset-name">' + fxSafe(p.name) + '</b><button class="ability small preset-rename" data-rename="' + i + '" aria-label="Rename ' + fxSafe(p.name) + '">✎</button></div>'
      + '<small>' + (used ? '✓ In use · ' : '') + info + '</small>'
      + '<div class="preset-actions"><button class="primary small" data-use="' + i + '"' + (!p.deck || used || fight ? ' disabled' : '') + '>Use</button>'
      + '<button class="ability small" data-save="' + i + '">' + (p.deck ? 'Save current' : 'Save here') + '</button></div></div>';
  }).join('') + '</div>';
}
function fxSafe(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const showDeckBeforePresets = showDeck;
showDeck = function () {
  const out = showDeckBeforePresets.apply(this, arguments);
  const work = typeof document !== 'undefined' && document.querySelector && document.querySelector('#menuModal .workshop');
  if (!work || !work.before) return out;
  const panel = document.createElement('div'); panel.className = 'panel deck-presets'; panel.innerHTML = deckPresetsHTML();
  work.before(panel);
  panel.querySelectorAll('[data-use]').forEach(b => b.onclick = () => {
    const r = presetUse(+b.dataset.use), name = deckPresets()[+b.dataset.use].name;
    if (r.ok) toast('Now playing ' + name + '.' + (r.missing ? ' ' + r.missing + ' card' + (r.missing > 1 ? 's are' : ' is') + ' no longer in your collection.' : '') + (r.trimmed ? ' ' + r.trimmed + ' left out: the deck holds ' + maxDeckSize() + '.' : ''));
    else toast(r.why === 'small' ? name + ' has fewer than ' + MIN_DECK + ' cards left in your collection.' : r.why === 'fight' ? 'Finish the fight first.' : name + ' is empty.');
    showDeck();
  });
  panel.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { const i = +b.dataset.save; presetSaveCurrent(i); toast('Saved your deck as ' + deckPresets()[i].name + '.'); showDeck(); });
  panel.querySelectorAll('[data-rename]').forEach(b => b.onclick = () => {
    const i = +b.dataset.rename, head = b.parentNode, input = document.createElement('input');
    input.className = 'preset-input'; input.maxLength = DECK_PRESET_NAME_MAX; input.value = deckPresets()[i].name; input.setAttribute('aria-label', 'Deck name');
    head.replaceChildren(input); input.focus(); input.select();
    let done = false; const finish = keep => { if (done) return; done = true; if (keep) presetRename(i, input.value); showDeck(); };
    input.onkeydown = e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); };
    input.onblur = () => finish(true);
  });
  return out;
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.deck-presets{margin-bottom:10px}.deck-presets .preset-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px}'
    + '.deck-presets .preset{border:1px solid #3d7f93;border-radius:10px;padding:8px;background:#0b1a2a99;display:flex;flex-direction:column;gap:4px;min-width:0}'
    + '.deck-presets .preset.in-use{border-color:#7fe3c4;box-shadow:0 0 0 1px #7fe3c455,0 0 14px #7fe3c433}.deck-presets .preset.empty{opacity:.8;border-style:dashed}'
    + '.deck-presets .preset-head{display:flex;align-items:center;gap:6px;min-width:0}.deck-presets .preset-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.deck-presets .preset-rename{padding:0 6px;min-width:0}.deck-presets .preset-input{flex:1;min-width:0;font:inherit;padding:2px 6px;border-radius:6px;border:1px solid #6fd3e0;background:#08131f;color:#e8f6ff}'
    + '.deck-presets small{color:#9fc3cf}.deck-presets .preset-actions{display:flex;gap:6px;flex-wrap:wrap}.deck-presets .preset-actions button{flex:1;min-width:0;padding:4px 6px}'
    + '@media (max-width:520px){.deck-presets .preset-row{grid-template-columns:1fr}}';
  document.head.append(st);
}
