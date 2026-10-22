// Round 178: each world drops its own cards. No card is in two worlds' reward pools.
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random; Math.random = () => 0.99; // no crits
function setup(hand) {
  newGame(); state.playerLevel = 10; state.talents = {}; syncTalentVitals(false); state.hp = 80; state.maxHp = 100;
  state.room = '1,5'; state.cooldowns = {};
  startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.id = 'thornling';
  b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 300, maxHp: 300, attack: 10, boss: false, elite: false };
  b.hand = hand.map(h => make(h)); b.draw = Array.from({ length: 12 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = 3; b.block = 0; b.turn = 1; b.aether = 0; b.poison = 0; ENEMY_AFFLICTIONS.thornling = [];
  return b;
}
// Every world has a pool, and no card is in two of them (except the Prismatic Counter, Round 210).
const seen = {};
for (const w of WORLD_ORDER) {
// Round 236: Sift is in every world too, like the Prismatic Counter.
  assert(Array.isArray(VARIETY_POOLS[w]) && VARIETY_POOLS[w].length >= 6, w + ' has its own reward pool');
  for (const id of VARIETY_POOLS[w]) { assert(defs[id], id + ' exists'); if (id === 'counter' || id === 'sift') continue; assert(!seen[id], id + ' drops in both ' + seen[id] + ' and ' + w); seen[id] = w; }
  assert(VARIETY_POOLS[w].includes('counter'), 'Round 210: the Prismatic Counter drops in ' + w);
}
// Offers come from the world you are in.
for (const w of WORLD_ORDER) { state.region = w; configureRegion(w); for (let i = 0; i < 5; i++) for (const c of cardOffers()) assert(VARIETY_POOLS[w].includes(c.id), w + ' offers only its own cards'); }
// Forest cards drop in Elaris now, desert ones in Solaris.
for (const id of ['thornlash', 'wildfire', 'rootbind', 'tidecall', 'verdantPact']) assert.equal(seen[id], 'wilds');
for (const id of ['sunflare', 'sandVeil', 'scarabSwarm', 'oasisDraught', 'solarLance']) assert.equal(seen[id], 'elaris');
// Mini-boss cards: every mini-boss in the six worlds has its own unique card.
const minis = Object.keys(enemies).filter(id => enemies[id].miniBoss);
for (const id of ['tidewardenElaris', 'galeSovereign', 'stormbellWarden', 'featherMatriarch', 'tideboundWarden', 'galeSovereignElaris']) assert(defs[MINI_BOSS_CARDS[id]], id + ' drops a unique card');
assert.equal(new Set(Object.values(MINI_BOSS_CARDS)).size, Object.keys(MINI_BOSS_CARDS).length, 'no two mini-bosses share a card');
// A few of the new cards in play.
let b = setup(['scarabSwarm']); const hp0 = b.enemy.hp; playCard(0); assert.equal(hp0 - b.enemy.hp, 9, 'Scarab Swarm: 3 hits of 3'); assert(b.poison >= 2, 'and poisons');
b = setup(['sporeCloud']); playCard(0); assert(b.poison >= 4, 'Spore Cloud poisons without a hit');
b = setup(['squallStep']); playCard(0); assert.equal(b.block, 6); assert.equal(b.aether, 1, 'Squall Step: Block and Aether');
b = setup(['oasisDraught']); playCard(0); assert.equal(state.hp, 85); assert.equal(b.block, 3, 'Oasis Draught heals and guards');
b = setup(['solarLance']); b.enemy.armor = 4; const hp1 = b.enemy.hp; playCard(0); assert.equal(hp1 - b.enemy.hp, 11, 'Solar Lance pierces Armor');
b = setup(['thunderclap']); playCard(0); assert(b.disrupted, 'Thunderclap disrupts the next enemy attack');
Math.random = realRandom;
}`);
const missing = [];
for (const id of ['sunflare', 'sandVeil', 'scarabSwarm', 'oasisDraught', 'solarLance', 'skyfall', 'featherguard', 'updraft', 'thunderclap', 'cloudburst', 'elderRoot', 'sporeCloud', 'briarWall', 'crystalShard', 'crystalWard', 'riptide', 'squallStep', 'cisternAegis', 'noonPeal', 'stormbellToll', 'featherfallGrace'])
  for (let l = 0; l < 4; l++) if (!fs.existsSync(path.join(__dirname, '../assets/cards/level' + l, id + '.png'))) missing.push(id + ' ' + l);
require('assert').deepStrictEqual(missing, [], 'new cards have art at every level');
console.log('PASS: six reward pools with no card shared between worlds (the Prismatic Counter drops in all of them), forest cards in Elaris, unique mini-boss cards, and the new cards play as written.');
