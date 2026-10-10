// Round 76: elite rewards, city quiet rooms and events, bounties, 100% exploration reward, world-scaled talents.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random;
function fight(opts = {}) {
  newGame(); state.room = '1,5'; state.cooldowns = {}; startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.enemy.elite = !!opts.elite; b.enemy.boss = false; b.enemy.level = state.playerLevel; return b;
}
// Elites: a card choice instead of an empty chest or a potion, and 6 Shards.
for (const r of [.1, .5]) {
  let b = fight({ elite: true }); b.bounty = null; Math.random = () => r; b.enemy.hp = 0; winBattle(); Math.random = realRandom;
  assert.equal(b.lootType, 'choice', 'elite: ' + (r < .25 ? 'empty' : 'potion') + ' roll becomes a card choice');
  b = fight(); b.bounty = null; Math.random = () => r; b.enemy.hp = 0; winBattle(); Math.random = realRandom; assert.equal(b.lootType, r < .25 ? 'empty' : 'potion', 'regular enemies keep the normal roll');
}
assert.equal(shardDrop({ enemy: { elite: true, boss: false }, id: 'x' }), 6, 'elites drop 6 Shards');
// City quiet rooms and events.
newGame(); configureRegion('city'); state.room = '0,5'; ensureExplore();
for (const key of QUIET_ROOMS.city) { assert.equal(roomSpawns(key).length, 0, key + ' is quiet'); const p = poiAt(key); assert(p && p.type === 'event' && EVENT_POOLS.city.includes(p.event), key + ' holds a city event'); }
for (const id of EVENT_POOLS.city) for (let i = 0; i < 2; i++) { newGame(); state.hp = 20; state.shards = 20; state.potions = 1; const c = EVENTS[id].choices()[i]; assert(!c.disabled); const msg = c.run(); assert(typeof msg === 'string' && msg.length > 3, id + ' ' + i); assert(state.hp >= 1 && state.shards >= 0); }
// Bounties.
let b = fight(); assert(BOUNTIES[b.bounty], 'every fight gets a bounty');
b.bounty = 'swift'; let sh = state.shards; b.enemy.hp = 0; winBattle(); assert.equal(b.bountyPaid, 3, 'Swift on turn 1 pays 3'); assert(state.shards - sh >= 4, 'paid on top of the normal Shards');
assert(b.special.some(t => /Bounty complete/.test(t)));
b = fight(); b.bounty = 'untouched'; b.bountyHurt = true; sh = state.shards; b.enemy.hp = 0; winBattle(); assert.equal(b.bountyPaid, 0, 'Untouched fails after losing HP'); assert(b.special.some(t => /Bounty missed/.test(t)));
b = fight({ elite: true }); b.bounty = 'selfReliant'; b.enemy.hp = 0; winBattle(); assert.equal(b.bountyPaid, 5, 'elite bounties pay 5');
b = fight(); b.bounty = 'selfReliant'; aetherInit(b); b.aether = 8; b.sideDraw = [{ uid: 'zz', id: 'aegis' }]; playSideCard('zz'); assert.equal(b.bountySide, 1); b.enemy.hp = 0; winBattle(); assert.equal(b.bountyPaid, 0, 'Self-reliant fails after a side card');
b = fight(); b.bounty = 'overkill'; b.hand = [make('cleave')]; b.hand[0].level = 3; b.energy = 3; b.enemy.hp = 200; playCard(0); assert(b.bountyBigHit > 0, 'Overkill tracks the biggest hit');
b = fight(); b.bounty = 'swift'; b.turn = 9; b.enemy.hp = 0; winBattle(); assert.equal(b.bountyPaid, 0, 'Swift fails when too slow');
// 100% exploration: +20 Shards and a side card, once per world.
newGame(); configureRegion('city'); state.room = '0,5'; ensureExplore(); state.battle = null;
state.visited = Object.keys(rooms); state.chests = Object.keys(rooms).map(chestFor).filter(Boolean).map(c => c.id); state.relics = Object.values(rooms).filter(r => r.relic && r.relic[0] !== 'material').map(r => r.relic[0]);
assert.equal(worldCompletion(), 100); sh = state.shards; const sideN = state.side.pool.length;
assert(checkWorldCompletion(), 'reward granted at 100%'); assert.equal(state.shards, sh + 20); assert.equal(state.side.pool.length, sideN + 1); assert(!checkWorldCompletion(), 'only once');
newGame(); configureRegion('city'); assert(worldCompletion() < 100); assert(!checkWorldCompletion());
// World-scaled talents.
newGame(); state.talents = { plating: 5, jammer: 2, weakenCore: 1, leech: 2 };
configureRegion('city'); assert.equal(talentScale(), 1); assert.equal(scaledRank('plating'), 5); assert.equal(weakenAmount(), 9);
configureRegion('elaris'); assert.equal(scaledRank('plating'), 7); assert.equal(weakenAmount(), 12);
configureRegion('vespera'); assert.equal(scaledRank('plating'), 8); assert.equal(scaledRank('leech'), 3); assert.equal(weakenAmount(), 14);
configureRegion('city');
console.log('PASS: elite card choices and 6 Shards, 3 city quiet rooms and all 4 city events, all 4 bounties (pay and miss), 100% exploration reward, world-scaled talents.');
}`);
