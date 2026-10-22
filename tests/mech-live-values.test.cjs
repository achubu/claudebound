'use strict';
// Round 241: Tailwind (and Growth, Discharge) change a card's numbers only during a fight and only for
// that fight's own cards. Reward offers, shown while the finished battle is still loaded, keep the
// printed numbers.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ newGame(); state.region='sky'; configureRegion('sky'); state.talents={};
const k=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>spawnAvailable(s)&&!s.boss)); state.room=k; startBattle(roomSpawns(k).find(s=>spawnAvailable(s)&&!s.boss).uid);
const b=state.battle; b.enemy.hp=b.enemy.maxHp=999; b.enemy.armor=0; b.enemy.guard=0; b.enemy.barrier=0; b.energy=9;
const printed=stat(make('gustChain')).damage, per=defs.gustChain.tiers[0].tailwind.damage;
b.hand=[make('strike'),make('strike'),make('gustChain')]; playCard(0); playCard(0);
const shown=stat(b.hand[0]).damage, offerDuring=stat(make('gustChain')).damage;
const hp=b.enemy.hp; playCard(0); const dealt=hp-b.enemy.hp;
b.phase='reward'; const offerAfter=stat(make('gustChain')).damage, text=rules(make('gustChain'));
return JSON.stringify({printed, per, shown, offerDuring, dealt, offerAfter, text}) })()`));
assert.strictEqual(r.shown, r.printed + 2 * r.per, 'in hand, after two cards, Gust Chain shows its Tailwind');
assert.strictEqual(r.dealt, r.shown, 'and deals what it shows');
assert.strictEqual(r.offerDuring, r.printed, 'a card that is not in the fight keeps its printed numbers');
assert.strictEqual(r.offerAfter, r.printed, 'reward offers after the fight keep the printed numbers');
assert(r.text.startsWith('Deal ' + r.printed + ' damage.'), 'and their text says so: ' + r.text);
console.log('mech-live-values ok');
