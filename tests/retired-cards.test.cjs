// Round 188: the four single-element Reversal cards were removed. An old save that still holds
// one (in the collection, the deck or a battle in progress) loads it as a Prismatic Counter.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
run(`{
for (const e of ELEMENTS) assert(!defs['counter_' + e], 'counter_' + e + ' is gone');
assert(defs.counter && defs.counter.tiers[0].counter === true, 'the Prismatic Counter stays');
newGame();
const old = JSON.parse(JSON.stringify(state));
old.pool.push({ uid: 900, id: 'counter_fire', level: 1, uses: 3, soulbound: false }, { uid: 901, id: 'counter_water', level: 0, uses: 0, soulbound: false });
old.deck = [...old.deck.slice(0, 5), 900];
old.battle = null;
validateImport(old); // used to throw: unknown card id
assert(!old.pool.some(c => /^counter_/.test(c.id)), 'converted before the id check');
assert.equal(old.pool.filter(c => c.id === 'counter').length, 1, 'one Prismatic Counter kept');
assert(old.deck.includes(900) && old.pool.find(c => c.uid === 900).id === 'counter', 'the copy in the deck is the one kept');
restoreGame(old);
assert(state.pool.some(c => c.id === 'counter'));
assert.equal(JSON.stringify(state).includes('_countersMigrated'), false, 'the migration flag is not saved');
// A battle in progress holding one also converts.
const fight = JSON.parse(JSON.stringify(state)); fight.pool.push({ uid: 950, id: 'counter_air', level: 0, uses: 0, soulbound: false });
fight.battle = { hand: [{ uid: 950, id: 'counter_air', level: 0 }], draw: [], discard: [], exhaust: [] };
normalizeElementalCards(fight); assert.equal(fight.battle.hand[0].id, 'counter');
}`);
console.log('PASS: the Reversal cards are gone, and old saves holding them load with a Prismatic Counter.');
