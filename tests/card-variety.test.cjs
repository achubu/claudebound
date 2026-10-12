// Round 49: the 15 new cards, card-reward choice, and unspent energy -> Aether.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random; Math.random = () => 0.99; // no crits
function setup(hand, opts = {}) {
  newGame(); state.playerLevel = 10; state.talents = {}; syncTalentVitals(false); state.hp = state.maxHp = 100;
  state.room = '1,5'; state.cooldowns = {};
  startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.id = 'thornling';
  b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 300, maxHp: 300, attack: 10, boss: false, elite: false, ...(opts.enemy || {}) };
  b.hand = hand.map(h => make(h)); b.draw = Array.from({ length: 12 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = opts.energy ?? 3; b.block = 0; b.turn = opts.turn ?? 1; b.aether = 0;
  ENEMY_AFFLICTIONS.thornling = [];
  return b;
}
const dealt = (b, i = 0) => { const e = b.enemy.hp; playCard(i); return e - b.enemy.hp; };
const ids = Object.keys(NEW_CARD_WORLD);
assert.equal(ids.length, 15, '15 new cards');
for (const id of ids) for (let l = 0; l < 4; l++) { assert(defs[id].tiers[l], id + ' has 4 levels'); assert(rules({ id, level: l }).length > 8, id + ' has rules text'); }
for (const w of ['city', 'elaris', 'vespera']) assert(ids.filter(id => NEW_CARD_WORLD[id] === w).every(id => VARIETY_POOLS[w].includes(id)), w + ' offers its five new cards');

// City
let b = setup(['arcJab']); assert.equal(dealt(b), 3); assert.equal(b.aether, 1, 'Arc Jab: +1 Aether'); assert.equal(b.energy, 3, 'costs 0');
b = setup(['guard', 'bulwarkBash']); playCard(0); assert.equal(stat(b.hand[0]).damage, 5, 'Bulwark Bash shows your Block as damage'); assert.equal(dealt(b), 5);
b = setup(['bulwarkBash']); b.hand[0].level = 2; b.block = 10; assert.equal(dealt(b), 14, 'Bulwark Bash level 2: Block + 4');
b = setup(['overclock']); playCard(0); assert.equal(b.energy, 4, 'Overclock +1 energy'); assert(b.exhaust.some(c => c.id === 'overclock'), 'and exhausts');
assert.equal(pitchValue(make('overclock')), 3, 'Overclock pitches for 3 Aether');
b = setup(['staticShield']); b.bleed = 3; b.frail = 2; playCard(0); assert.equal(b.block, 6); assert.equal(b.bleed, 0, 'Static Shield cleanses one debuff (Bleed first)'); assert.equal(b.frail, 2, 'only one at level 0');
b = setup(['staticShield']); b.hand.push(makeStatic()); playCard(0); assert(!b.hand.some(isJunk), 'Static Shield can remove a Static card');
b = setup(['breachSpike', 'strike'], { enemy: { armor: 4 } }); assert.equal(dealt(b), 5 - 4); assert.equal(b.enemy.armor, 2, 'Breach Spike: −2 Armor for the fight'); assert.equal(dealt(b), 6 - 2);
// Elaris
b = setup(['thornlash', 'thornlash']); playCard(0); assert.equal(b.poison, 3, 'Thornlash: 3 Poison'); playCard(0); assert.equal(b.poison, 3 + 6, 'then doubled when already poisoned');
b = setup(['wildfire']); playCard(0); assert.equal(b.burn, 3); assert.equal(b.burnTurns, 2, 'Wildfire: Burn 3');
b = setup(['cinder', 'wildfire'], { energy: 3 }); playCard(0); const burn = b.burn; playCard(0); assert.equal(b.burn, burn * 2, 'Wildfire doubles an existing Burn');
b = setup(['rootbind'], { turn: 1 }); const hit = enemyPlan(b).damage; playCard(0); assert.equal(b.block, 5); assert.equal(enemyPlan(b).damage, hit - 4, 'Rootbind: next attack −4');
b.block = 0; let hp = state.hp; endTurn(); assert.equal(hp - state.hp, hit - 4); assert.equal(b.bind || 0, 0, 'and it is used up');
b = setup(['tidecall']); playCard(0); assert.equal(b.hand.length, 2, 'Tidecall draws 2'); b.block = 999; endTurn(); assert.equal(b.hand.length, 5, 'and 1 extra next turn');
b = setup(['verdantPact']); state.hp = 50; playCard(0); assert.equal(state.hp, 54); assert.equal(b.aether, 1);
// Vespera
b = setup(['chainLightning'], { enemy: { armor: 2 } }); assert.equal(dealt(b), 3 * (5 - 2), 'Chain Lightning: 3 hits, Armor on each');
b = setup(['stormBattery']); playCard(0); assert.equal(b.aether, 2); assert.equal(b.hand.length, 1);
b = setup(['mirrorguard'], { turn: 1 }); const inc = enemyPlan(b).damage; playCard(0); const e0 = b.enemy.hp; endTurn(); assert.equal(e0 - b.enemy.hp, Math.floor(Math.min(10, inc) / 2), 'Mirrorguard reflects half of what Block stopped');
b = setup(['tempestSurge'], { energy: 3 }); assert.equal(stat(b.hand[0]).damage, 21, 'Tempest Surge shows 7 × energy'); assert.equal(dealt(b), 21); assert.equal(b.energy, 0, 'and spends it all');
b = setup(['tempestSurge'], { energy: 0 }); playCard(0); assert.equal(b.hand.length, 1, 'needs at least 1 energy');
b = setup(['prismLance'], { enemy: { armor: 5 } }); b.enemy.barrier = 10; assert.equal(dealt(b), 12, 'Prism Lance pierces Armor and ignores Barrier'); assert.equal(b.enemy.barrier, 10);

// Card rewards: choose 1 of 3, or leave them.
b = setup([]); b.enemy.hp = 0; Math.random = () => 0.9; winBattle(); Math.random = () => 0.99;
assert.equal(b.lootType, 'choice'); assert.equal(b.offers.length, 3); assert.equal(new Set(b.offers.map(c => c.id)).size, 3, 'three different cards');
assert(b.offers.every(c => VARIETY_POOLS.city.includes(c.id)), 'from the current world');
const n = state.pool.length, pick = b.offers[2]; chooseCardReward(2); assert.equal(state.pool.length, n + 1); assert(state.pool.includes(pick)); assert.equal(b.lootType, 'card');
b = setup([]); b.enemy.hp = 0; Math.random = () => 0.9; winBattle(); Math.random = () => 0.99; const n2 = state.pool.length; chooseCardReward(null);
assert.equal(state.pool.length, n2, 'leaving them adds nothing'); assert.equal(b.lootType, 'skipped');
// Elaris: first arrival offers one Elaris card; entry levels ease in.
newGame(); const offers = offerArrivalCard(); assert.equal(offers.length, 3); assert(offers.every(c => ELARIS_ARRIVAL_POOL.includes(c.id)), 'arrival offers Elaris cards');
const ramp = lv => enemyStats('stormMoth', { region: 'elaris', level: lv }).hp / (enemies.stormMoth.hp * balanceFor('regionHp', 'elaris') * (1 + (lv - 1) * balanceFor('hpPerLevel', 'elaris')) * BALANCE.perEnemy.stormMoth.hp * balanceFor('normalHp', 'elaris'));
assert(ramp(10) < ramp(12) && ramp(12) < ramp(14) && Math.abs(ramp(14) - 1) < .02, 'Elaris regular health ramps up over levels 10-13');
assert.equal(enemyStats('bloomTyrant', { region: 'elaris', level: 10, boss: true }).hp, Math.round(enemies.bloomTyrant.hp * balanceFor('regionHp', 'elaris') * (1 + 9 * balanceFor('hpPerLevel', 'elaris')) * BALANCE.perEnemy.bloomTyrant.hp), 'bosses are not ramped');
// Deck Workshop stacks copies (same card, level and Soulbound/Impermanent).
{ const list = [make('cleave', 0, false), make('cleave', 0, false), make('cleave', 1, false), make('cleave', 0, true), make('strike', 0, false)];
  list[1].uses = 40; const g = stackCards(list);
  assert.equal(g.length, 4, 'copies stack; a different level or ownership is its own stack');
  assert.equal(g.find(x => x.key === 'cleave|0|0').cards.length, 2, 'two identical Impermanent copies form one ×2 stack');
  assert.equal(g.find(x => x.key === 'cleave|0|0').cards[0].uses, 40, 'the most-used copy represents the stack'); }
// Signal Amplifier and Deep Interference: +1 per rank.
for (let r = 0; r <= 5; r++) { state.talents = { amplifier: r, jammer: r }; assert.equal(boostAmount(), 1 + r, 'Boost +1 per Signal Amplifier rank'); assert.equal(weakenAmount(), 3 * (1 + r), 'Weaken is tripled: 3 per Deep Interference rank'); }
state.talents = {};
// City regulars eased.
assert.equal(balanceFor('normalHp', 'city'), .95); assert.equal(balanceFor('normalHp', 'elaris'), 1.1);
Math.random = realRandom;
console.log('PASS: all 15 new cards with exact numbers, world reward pools, choose-1-of-3 card rewards (and leaving them), and city regular health.');
}`);
