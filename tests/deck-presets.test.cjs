'use strict';
// Round 256: three favorite decks in the Deck Workshop. Save the current deck (main and side) to a
// slot, switch with one click, rename; cards no longer owned are left out and today's limits apply.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
newGame(); ensureSide(); const o = {};
o.slots = deckPresets().map(p => [p.name, p.deck]);
for (const id of ['cleave', 'shatter', 'mend', 'riposte']) state.pool.push(make(id));
const first = [...state.deck], firstSide = [...state.side.deck];
presetSaveCurrent(0); o.inUse0 = presetInUse(0);
// A second deck: swap two cards for new ones.
const extra = state.pool.filter(c => !state.deck.includes(c.uid)).map(c => c.uid);
state.deck = state.deck.slice(0, state.deck.length - 2).concat(extra.slice(0, 2)); const second = [...state.deck];
presetSaveCurrent(1); o.inUse = [presetInUse(0), presetInUse(1)];
o.use0 = presetUse(0); o.back = JSON.stringify(state.deck) === JSON.stringify(first) && JSON.stringify(state.side.deck) === JSON.stringify(firstSide);
o.use1 = presetUse(1); o.second = JSON.stringify(state.deck) === JSON.stringify(second);
o.empty = presetUse(2);
o.rename = presetRename(1, '  Glass   cannon  deck that is too long  ') && deckPresets()[1].name;
// A card that is gone is left out; the rest still loads.
const gone = second[second.length - 1]; state.pool = state.pool.filter(c => c.uid !== gone);
presetUse(0); o.missing = presetUse(1); o.withoutGone = !state.deck.includes(gone) && state.deck.length === second.length - 1;
// Deck size and fights.
deckPresets()[2].deck = state.pool.map(c => c.uid); o.trim = presetUse(2); o.size = state.deck.length <= maxDeckSize();
state.battle = { phase: 'fight' }; o.fight = presetUse(0); state.battle = null;
deckPresets()[2].deck = second.slice(0, 2); o.small = presetUse(2);
o.saved = JSON.parse(JSON.stringify(state)).deckPresets.length;
return JSON.stringify(o); })()`));
assert.deepStrictEqual(r.slots, [['Deck 1', null], ['Deck 2', null], ['Deck 3', null]], 'three empty slots to start');
assert(r.inUse0 && r.inUse[1] && !r.inUse[0], 'the slot matching the current deck is in use');
assert(r.use0.ok && r.back, 'one click switches back to the first deck, side deck included');
assert(r.use1.ok && r.second, 'and to the second');
assert(!r.empty.ok && r.empty.why === 'empty', 'an empty slot does nothing');
assert.strictEqual(r.rename, 'Glass cannon deck', 'names are tidied and kept short');
assert(r.missing.ok && r.missing.missing === 1 && r.withoutGone, 'cards no longer owned are left out');
assert(r.trim.ok && r.size, 'a saved deck is trimmed to today\'s deck size (' + JSON.stringify(r.trim) + ')');
assert(!r.fight.ok && r.fight.why === 'fight', 'not during a fight');
assert(!r.small.ok && r.small.why === 'small', 'a deck below the minimum is refused');
assert.strictEqual(r.saved, 3, 'presets are part of the save');
console.log('deck-presets ok');
