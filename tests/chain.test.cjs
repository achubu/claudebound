'use strict';
// Round 261: ⛓ Chain. Cards played by hand this turn count as links; a "⛓ Chain N" card gets its bonus
// once N cards were played before it this turn. Side cards and Suspend's automatic plays don't count.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const setup = hand => { newGame(); state.room = '1,5'; startBattle(roomSpawns('1,5').find(s => !s.boss).uid); const b = state.battle;
  b.enemy = { ...b.enemy, hp: 999, maxHp: 999, armor: 0, guard: 0 }; b.hand = hand.map(id => make(id)); b.energy = 9; return b; };
const o = {}; let b = setup(['spark', 'strike', 'strike', 'spark']); const hp = () => b.enemy.hp; let h;
h = hp(); playCard(0); o.first = h - hp(); playCard(0); playCard(0); o.links = chainLinks(b);
o.ready = chainReady(b, stat(b.hand[0])); h = hp(); playCard(0); o.third = h - hp();
// Chain Lightning: a 4th hit.
b = setup(['strike', 'strike', 'strike', 'chainLightning']); playCard(0); playCard(0); playCard(0); o.hits = stat(b.hand[0]).hits;
// The count resets next turn.
b.hand = []; endTurn(); o.reset = chainLinks(b);
// Not in the fight: the printed text, no bonus.
o.offline = stat(make('chainLightning')).hits; o.text = rules(make('scarabSwarm'));
// A card that couldn't be played adds no link.
b = setup(['temporalBarrage']); b.energy = 0; playCard(0); o.unplayed = chainLinks(b);
return JSON.stringify(o); })()`));
assert.strictEqual(r.first, 3, 'Spark alone deals 3');
assert.strictEqual(r.links, 3, 'each card played adds a link');
assert(r.ready && r.third === 6, 'with 3 links, Spark deals double (+3)');
assert.strictEqual(r.hits, 4, 'Chain Lightning gains a hit at Chain 3');
assert.strictEqual(r.reset, 0, 'links reset each turn');
assert.strictEqual(r.offline, 3, 'outside a fight the card shows its printed numbers');
assert(/⛓ Chain 3: \+2 Poison/.test(r.text), 'the rules text names the Chain bonus (' + r.text + ')');
assert.strictEqual(r.unplayed, 0, 'an unplayed card adds no link');
console.log('chain ok');
