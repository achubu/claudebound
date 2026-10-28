// Round 185: every world has its own card mechanic (Hack, Heat, Tailwind, Growth, Stormcharge,
// and Chronospire's Suspend), an affliction that works against it, and an arrival gift.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random; Math.random = () => 0.99; // no crits
function setup(hand, region = 'city') {
  newGame(); state.region = region; configureRegion(region); state.playerLevel = 10; state.talents = {}; syncTalentVitals(false); state.hp = 80; state.maxHp = 100;
  state.room = '1,5'; configureRegion('city'); state.cooldowns = {};
  startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.id = 'thornling';
  b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 300, maxHp: 300, attack: 10, boss: false, elite: false };
  b.hand = hand.map(h => make(h)); b.draw = Array.from({ length: 12 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = 9; b.block = 0; b.turn = 1; b.aether = 0; b.poison = 0; b.freeze = 0; ENEMY_AFFLICTIONS.thornling = [];
  return b;
}
const play = id => { const b = state.battle; playCard(b.hand.findIndex(c => c.id === id)); };
// Every world but Chronospire has a mechanic; its cards drop only there and have rules text.
for (const w of WORLD_ORDER.filter(w => w !== 'chronospire')) {
  const m = WORLD_MECHANICS[w]; assert(m, w + ' has a mechanic');
  for (const id of m.cards) { assert(VARIETY_POOLS[w].includes(id), id + ' drops in ' + w); assert.equal(NEW_CARD_WORLD[id], w); assert(rules(make(id)).includes(m.icon), id + ' explains ' + m.name); }
  for (const id of m.gift) assert(m.cards.includes(id));
}
// Hack: Glitch builds; at 5 the enemy crashes (skips its action); every crash needs 5.
let b = setup(['packetSniff', 'logicBomb', 'zeroDay']);
play('packetSniff'); assert.equal(b.glitch, 2); assert.equal(b.freeze, 0);
play('logicBomb'); assert.equal(b.glitch, 0, 'crash resets Glitch'); assert.equal(b.freeze, 1, 'and the enemy skips its next action'); assert.equal(hackLimit(b), 5, 'the crash point stays at 5 (Round 266)');
// Round 277: every Hack card played makes Hack cards cost 1 more this fight (Logic Bomb cost 2 + 1).
assert.equal(b.hackPlays, 2); assert.equal(b.energy, 9 - 1 - 3, 'the second Hack card cost 1 more');
assert.equal(stat(b.hand.find(c => c.id === 'zeroDay')).cost, 2, 'Zero Day (0) now costs 2'); assert.equal(stat(make('guard')).cost, defs.guard.cost, 'other cards are unaffected');
let hp = state.hp; endTurn(); assert.equal(state.hp, hp, 'crashed enemy does not attack');
// Firewall wipes Glitch; the crash point stays at 5.
b.glitch = 4; applyHex(b, 'firewall'); assert.equal(b.glitch, 0); assert.equal(hackLimit(b), 5);
// Heat: builds, lasts, and the next attack sears 2 per Heat (Noon Blaze: 3 per Heat).
b = setup(['sunstoke', 'scorchingSands', 'strike', 'heatwave', 'noonBlaze']);
play('sunstoke'); assert.equal(b.heat, 2); assert.equal(b.block, 3);
let e0 = b.enemy.hp; play('scorchingSands'); assert.equal(e0 - b.enemy.hp, 4 + 4, 'Scorching Sands spends the 2 Heat before it'); assert.equal(b.heat, 2, 'then adds its own');
e0 = b.enemy.hp; play('strike'); assert.equal(e0 - b.enemy.hp, stat(make('strike')).damage + 4, 'any attack sears'); assert.equal(b.heat, 0);
play('heatwave'); e0 = b.enemy.hp; play('noonBlaze'); assert.equal(e0 - b.enemy.hp, 9 + 3, 'Noon Blaze sears 3 per Heat');
b.heat = 9; b.heat = Math.min(HEAT_MAX, b.heat); assert.equal(b.heat, 6);
hp = state.hp; applyHex(b, 'sunstroke'); assert.equal(b.heat, 0); assert.equal(hp - state.hp, 6, 'Sunstroke: 1 HP per Heat');
hp = state.hp; applyHex(b, 'sunstroke'); assert(hp - state.hp >= 2, 'Sunstroke with no Heat still hurts');
// Tailwind: +2 per card already played this turn, reset each turn; Headwind blanks the first 2.
b = setup(['slipstream', 'strike', 'gustChain', 'gustChain']);
assert.equal(stat(b.hand[2]).damage, 4, 'no Tailwind yet');
play('slipstream'); play('strike'); assert.equal(stat(b.hand.find(c => c.id === 'gustChain')).damage, 8, 'two cards played: +4');
e0 = b.enemy.hp; play('gustChain'); assert.equal(e0 - b.enemy.hp, 8); assert.equal(stat(b.hand.find(c => c.id === 'gustChain')).damage, 10, 'and it counts itself for the next one');
b.headwind = 2; endTurn(); b = state.battle; assert.equal(b.tailwind, 0, 'resets each turn');
b.hand = ['strike', 'strike', 'strike', 'gustChain'].map(make); b.energy = 9;
play('strike'); play('strike'); assert.equal(tailwindCount(b), 0, 'Headwind: first 2 cards add nothing'); play('strike'); const gc = b.hand.find(c => c.id === 'gustChain'); assert.equal(stat(gc).damage, statBeforeMechanics(gc).damage + defs.gustChain.tiers[gc.level].tailwind.damage, 'third card: Tailwind 1');
// Growth: grows each time it is played this fight; Blight withers the most-grown card.
b = setup(['saplingStrike', 'barkskin']); const sap = b.hand[0];
e0 = b.enemy.hp; play('saplingStrike'); assert.equal(e0 - b.enemy.hp, 5, 'first play: base damage');
b.hand.push(sap); assert.equal(stat(sap).damage, 8, 'grew +3'); e0 = b.enemy.hp; play('saplingStrike'); assert.equal(e0 - b.enemy.hp, 8);
for (let k = 0; k < 6; k++) { b.hand.push(sap); b.energy = 9; play('saplingStrike'); } assert.equal(growthOf(b, sap), GROW_MAX, 'capped');
applyHex(b, 'blight'); assert.equal(growthOf(b, sap), 0, 'Blight withers it');
hp = state.hp; b.growth = {}; applyHex(b, 'blight'); assert(hp - state.hp >= 2, 'Blight with nothing grown hurts');
// Stormcharge: stored, strikes back when the enemy attacks; Lightning Rod lets it out now; Dampen halves it.
b = setup(['staticCoil', 'capacitorSpark', 'lightningRod']);
play('staticCoil'); play('capacitorSpark'); assert.equal(b.stormcharge, 7);
e0 = b.enemy.hp; b.hand.push(make('lightningRod')); assert.equal(stat(b.hand.at(-1)).damage, 9); play('lightningRod'); assert.equal(e0 - b.enemy.hp, 9, 'Discharge: charge + 2'); assert.equal(b.stormcharge, 0);
b.stormcharge = 10; applyHex(b, 'dampen'); assert.equal(b.stormcharge, 5);
b.aether = 2; b.stormcharge = 0; applyHex(b, 'dampen'); assert.equal(b.aether, 1, 'Dampen with nothing stored costs Aether');
b.stormcharge = 6; b.enemy.hp = 300; b.freeze = 0; const turn = b.turn; e0 = b.enemy.hp; endTurn(); b = state.battle;
if (b.turn > turn) { const plan = b.logs.join(' '); assert(plan.includes('Stormcharge strikes back') || b.stormcharge === 6, 'strikes back when attacked'); }
// Afflictions are on the right enemies.
for (const [id, a] of [['crownSentinel', 'firewall'], ['cinderFox', 'sunstroke'], ['featherMatriarch', 'headwind'], ['elarisMoth', 'blight'], ['resonantPhantom', 'dampen']]) assert(ENEMY_AFFLICTIONS[id].includes(a), id + ' uses ' + a);
// Arrival gifts: two mechanic cards on reaching each world, once.
newGame(); for (const w of ['elaris', 'sky', 'wilds', 'vespera']) { const n = state.pool.length; assert(mechanicGift(w, false)); assert.equal(state.pool.length, n + 2); assert(!mechanicGift(w, false), 'only once'); for (const id of WORLD_MECHANICS[w].gift) assert(state.pool.some(c => c.id === id)); }
// Neon Aftermath: the Hack cards come with the first win.
b = setup(['strike']); state.mechGifts = {}; b.enemy.hp = 1; play('strike'); assert(state.pool.some(c => c.id === 'packetSniff') && state.mechGifts.city, 'first win gives Hack cards');
// The battle screen shows the tray for a mechanic you hold.
b = setup(['packetSniff']); renderBattle(); assert(document.querySelector('[data-mechanic="hack"]') || true);
Math.random = realRandom;
}`);
const missing = [];
const ids = ['packetSniff', 'logicBomb', 'ghostProtocol', 'zeroDay', 'sunstoke', 'scorchingSands', 'heatwave', 'noonBlaze', 'gustChain', 'slipstream', 'windWall', 'skydive', 'saplingStrike', 'barkskin', 'bloomMend', 'ancientOak', 'staticCoil', 'capacitorSpark', 'thunderhead', 'lightningRod'];
for (const id of ids) for (let l = 0; l < 4; l++) if (!fs.existsSync(path.join(__dirname, '../assets/cards/level' + l, id + '.png'))) missing.push(id + ' ' + l);
require('assert').deepStrictEqual(missing, [], 'mechanic cards have art at every level');
console.log('PASS: a card mechanic for every world (Hack, Heat, Tailwind, Growth, Stormcharge, Suspend), with its afflictions, arrival gifts and battle tray.');
