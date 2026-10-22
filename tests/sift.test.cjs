'use strict';
// Round 236: Sift (0 energy: draw 1, discard a card of your choice, not the one drawn) drops in every world.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = { pools: Object.fromEntries(WORLD_ORDER.map(w => [w, VARIETY_POOLS[w].includes('sift')])), rules: [0, 1, 2, 3].map(l => rules({ id: 'sift', level: l })) };
newGame(); state.region = 'city'; configureRegion('city'); state.playerLevel = 8; syncTalentVitals(false);
const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && !s.boss)); state.room = k;
startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.boss).uid);
const b = state.battle; b.enemy.hp = b.enemy.maxHp = 999;
b.hand = [make('sift'), make('strike'), make('guard')]; b.draw = [make('cleave')]; b.discard = []; b.energy = 3;
const hp = b.enemy.hp; playCard(0);
o.after = { energy: b.energy, hand: b.hand.map(c => c.id), pending: siftPending(b), pick: b.siftPick };
const blocked = (playCard(0), b.hand.length); o.drawnRefused = !siftDiscard(b.hand.findIndex(c => c.id === 'cleave')) && siftPending(b); o.choices = siftChoices(b).map(i => b.hand[i].id); o.blocked = { hand: blocked, enemyHp: b.enemy.hp === hp };
siftDiscard(b.hand.findIndex(c => c.id === 'guard'));
o.done = { hand: b.hand.map(c => c.id), discard: b.discard.map(c => c.id), pending: siftPending(b) };
const strike = b.hand.findIndex(c => c.id === 'strike'); playCard(strike); o.playsAgain = b.enemy.hp < hp;
// Ending the turn ends a choice still open.
b.hand = [make('sift'), make('strike')]; b.draw = [make('cleave')]; b.energy = 3; playCard(0); const open = siftPending(b); endTurn(); o.endTurn = { open, after: !!state.battle.siftPick };
// An empty draw pile and discard: nothing to draw, nothing to choose.
b.hand = [make('sift')]; b.draw = []; b.discard = []; b.energy = 3; playCard(0); o.empty = siftPending(b);
// Sift alone in hand: the drawn card is all there is, so there is nothing to choose.
b.hand = [make('sift')]; b.draw = [make('cleave')]; b.energy = 3; playCard(0); o.onlyDrawn = { pending: siftPending(b), hand: b.hand.map(c => c.id) };
// The simulator's default discard is a junk card, else the weakest.
b.hand = [make('prismLance'), make('strike'), make('guard')]; b.siftDrawn = [b.hand[2].uid]; o.def = b.hand[siftDefaultIndex(b)].id; b.siftDrawn = [];
return JSON.stringify(o); })()`));
for (const [w, has] of Object.entries(r.pools)) assert(has, w + ' offers Sift');
assert(/^Draw 1 card, then discard 1 card you already held \(your choice\)\.$/.test(r.rules[0]), r.rules[0]);
assert(r.rules[1].includes('Gain 1 Aether') && r.rules[2].startsWith('Draw 2 cards') && r.rules[3].includes('Gain 1 Aether'), 'upgrades: +1 Aether, draw 2, both');
assert.strictEqual(r.after.energy, 3, 'Sift costs 0');
assert.deepStrictEqual(r.after.hand, ['strike', 'guard', 'cleave'], 'it draws a card');
assert(r.after.pending && r.after.pick === 1, 'then waits for a discard');
assert(r.blocked.enemyHp && r.blocked.hand === 3, 'no card can be played while choosing');
assert(r.drawnRefused && JSON.stringify(r.choices) === '["strike","guard"]', 'the card just drawn is not a choice (owner rule)');
assert(!r.onlyDrawn.pending && JSON.stringify(r.onlyDrawn.hand) === '["cleave"]', 'with only the drawn card in hand there is nothing to discard');
assert.deepStrictEqual(r.done.hand, ['strike', 'cleave'], 'the chosen card leaves the hand');
assert(r.done.discard.includes('guard') && r.done.discard.includes('sift') && !r.done.pending, 'into the discard pile, and the choice is over');
assert(r.playsAgain, 'cards play again afterwards');
assert(r.endTurn.open && !r.endTurn.after, 'ending the turn ends the choice');
assert(!r.empty, 'with nothing drawn and an empty hand there is no choice');
assert.strictEqual(r.def, 'strike', 'the simulator discards the weakest card it may (never the one just drawn)');
console.log('sift ok');
