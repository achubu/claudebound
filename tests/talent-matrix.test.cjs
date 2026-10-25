// Every Round 40 talent, verified with exact numbers through the real engine.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random;
// A controlled encounter: plain city enemy, no armor/element unless a test sets them.
function setup(talents, hand, opts = {}) {
  newGame(); state.playerLevel = 30; state.talents = talents; syncTalentVitals(false); state.hp = state.maxHp;
  state.room = '1,5'; state.cooldowns = {};
  const spawn = roomSpawns(state.room).find(s => !s.boss); startBattle(spawn.uid);
  const b = state.battle;
  b.id = 'emberling'; b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 300, maxHp: 300, attack: 10, boss: false };
  b.hand = hand.map(id => make(id)); b.draw = Array.from({ length: 12 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = opts.energy ?? 3; b.block = 0; b.turn = opts.turn ?? 1; b.tm = null;
  Object.assign(b.enemy, opts.enemy || {});
  return b;
}
const dealt = (b, i = 0) => { const before = b.enemy.hp; playCard(i); return before - b.enemy.hp; };

// ---------------- SURGE ----------------
let b = setup({ attunement: 3 }, ['cinder']); assert.equal(dealt(b), 6 + 9, 'Elemental Attunement +3 per rank on elemental cards'); // Cinder Lance is 6 since Round 189
b = setup({ attunement: 3 }, ['strike']); assert.equal(dealt(b), 6, 'Attunement does not touch non-elemental cards');
b = setup({ attunement: 2, kindle: 2 }, ['cinder']); playCard(0); assert.equal(b.burn, 2 + 4, 'Kindling Matrix +2 Burn per rank');
b = setup({ attunement: 2, kindle: 1, weakpoint: 2 }, ['cinder'], { enemy: { element: 'earth' } }); assert.equal(dealt(b), Math.round((6 + 6) * 1.9), 'Exploit Weakness: +50% weakness becomes +90% at rank 2 (Round 253)');
b = setup({ attunement: 2, kindle: 1, weakpoint: 2, stormcaller: 1 }, ['cinder', 'cinder']);
assert.equal(stat(b.hand[0]).cost, 0, 'Stormcaller: a 1-energy elemental card shows cost 0 (1 less, Round 253)'); playCard(0); assert.equal(b.energy, 3, 'Stormcaller card was free');
assert.equal(stat(b.hand[0]).cost, 1, 'Stormcaller only discounts the first elemental card each turn'); playCard(0); assert.equal(b.energy, 2);
b = setup({ powerCore: 1, amplifier: 3, edge: 1, momentum: 2 }, ['strike', 'strike']);
const atk = attackBonus(); assert.equal(dealt(b), 6 + atk, 'first attack gets no Momentum'); assert.equal(dealt(b), 6 + atk + 6, 'Momentum +3 per rank after the first attack');
b = setup({ powerCore: 1, amplifier: 3, edge: 1, momentum: 2, flurry: 1 }, ['strike', 'strike']);
assert.equal(stat(b.hand[0]).cost, 0, 'Flurry: first 1-energy attack is free'); playCard(0); assert.equal(b.energy, 3); playCard(0); assert.equal(b.energy, 2, 'Flurry only once per turn');
b = setup({ sunder: 2 }, ['strike'], { enemy: { armor: 5 } }); assert.equal(dealt(b), 6 - 1, 'Sunder ignores 2 Armor per rank (5 armor - 4 = 1)');
b = setup({ sunder: 2, shatterpoint: 1 }, ['shatter'], { enemy: { armor: 5 } }); assert.equal(dealt(b), 10 + 6, 'Shatterpoint: Pierce cards +6');
Math.random = () => 0;
b = setup({ powerCore: 1, critical: 2, lethal: 2 }, ['strike']); assert.equal(dealt(b), Math.round(6 * 2.7), 'Lethal Focus rank 2: crits x2.7 (Round 253)');
Math.random = () => 0.12; b = setup({ powerCore: 1, critical: 2, lethal: 2 }, ['strike']); assert.equal(dealt(b), Math.round(6 * 2.7), 'Lethal Focus adds +4% crit chance per rank (6% + 8% = 14% > 12%)');
b = setup({ powerCore: 1, critical: 2 }, ['strike']); assert.equal(dealt(b), 6, 'without Lethal Focus a 12% roll is not a crit');
Math.random = () => 0;
b = setup({ powerCore: 1, critical: 2, lethal: 1, adrenaline: 1 }, ['strike', 'strike']); playCard(0); assert.equal(b.energy, 3, 'Adrenaline Loop refunds 1 energy on a crit'); playCard(0); assert.equal(b.energy, 2, 'only once per turn');
Math.random = () => 0.99;
b = setup({ powerCore: 1, critical: 2, lethal: 1, adrenaline: 1, executioner: 1 }, ['strike'], { enemy: { hp: 80, maxHp: 300 } }); assert.equal(dealt(b), Math.round(6 * 1.5), 'Executioner: +50% below 30% health (Round 253)');
b = setup({ powerCore: 1, critical: 2, lethal: 1, adrenaline: 1, executioner: 1 }, ['strike']); assert.equal(dealt(b), 6, 'no Executioner bonus above 30%');

// ---------------- DISRUPTION ----------------
b = setup({}, [], { turn: 3 }); const plainHeavy = enemyPlan(b, 3); b = setup({ weakenCore: 1, jammer: 2, suppression: 3 }, [], { turn: 3 });
assert.equal(plainHeavy.kind, 'heavy'); assert.equal(enemyPlan(b, 3).damage, Math.round(plainHeavy.damage * .7), 'Suppression Field -10% per rank on heavy hits (Round 259)');
assert.equal(enemyPlan(b, 1).damage, enemyPlan(setup({}, []), 1).damage, 'Suppression leaves normal strikes alone');
// Jammer Reserve: extra Weaken charges, one active at a time.
b = setup({ weakenCore: 1 }, []); assert.equal(weakenCharges(), 2, 'Weaken has 2 charges (Round 259)'); useWeaken(); assert.equal(b.enemyDebuff, 3, 'Weaken 3 with no Deep Interference'); assert(!b.debuffUsed, 'a second charge is left');
b = setup({ weakenCore: 1, jammer: 3, reserve: 2 }, [], { turn: 1 }); assert.equal(weakenCharges(), 4, 'Jammer Reserve: +1 charge per rank');
useWeaken(); assert.equal(b.enemyDebuff, weakenAmount()); assert(!b.debuffUsed); useWeaken(); assert.equal(b.weakenUses, 1, 'only one Weaken at a time');
b.block = 999; endTurn(); assert.equal(b.enemyDebuff, 0, 'it wears off after the attack'); useWeaken(); assert.equal(b.weakenUses, 2); b.enemyDebuff = 0; useWeaken(); assert.equal(b.weakenUses, 3); b.enemyDebuff = 0; useWeaken(); assert.equal(b.weakenUses, 4); assert(b.debuffUsed, 'all 4 charges spent');
b = setup({ weakenCore: 1, jammer: 5 }, [], { enemy: { attack: 80 } }); assert.equal(weakenAmount(), 32, 'Weaken: 40% of the attack of a strong enemy at rank 5'); b.enemy.attack = 10; assert.equal(weakenAmount(), 27, 'or the flat amount when that is more');
// Round 259: the deep Disruption talents serve a large deck, deck cycling and elemental attacks.
b = setup({ silence: 1 }, ['strike']); assert.equal(dealt(b), 6 + Math.floor(state.deck.length / 5), 'Arsenal: +1 damage per 5 cards in the deck');
b = setup({ dominion: 1 }, ['strike']); assert.equal(dealt(b), 8, 'Grand Library: the first play of a card deals +25%'); b.hand.push(b.discard.pop()); b.energy = 3; assert.equal(dealt(b), 6, 'only the first play');
b = setup({ dominion: 1 }, ['guard']); playCard(0); assert.equal(b.block, 5 + 1, 'Grand Library: +25% Block on the first play');
b = setup({ weakenCore: 1, jammer: 3, quickdraw: 1, foresight: 1 }, []); endTurn(); assert.equal(b.hand.length, 4 + 1, 'Foresight draws 1 extra card per turn');
b = setup({ weakenCore: 1, jammer: 3, quickdraw: 1, foresight: 1, cycle: 1 }, ['spark', 'spark']); playCard(0); assert.equal(b.hand.length, 1 + 1, 'Recycler: a 0-energy card draws 1'); playCard(0); assert.equal(b.hand.length, 1, 'Recycler rank 1: once per turn');
b = setup({ foresight: 1, battery: 1 }, ['focus', 'strike']); playCard(0); assert.equal(b.flow, 6, 'Flow State: +3 per card drawn during your turn'); assert.equal(dealt(b, 0), 12, 'the next attack gets it'); assert.equal(b.flow || 0, 0, 'and spends it');
endTurn(); assert.equal(b.flow || 0, 0, 'the opening draw of a turn does not count');
// Counter mastery: turn 3 of an elemental enemy's cycle is its charged strike.
b = setup({ counterWeave: 3, resonance: 1 }, [], { turn: 3, enemy: { element: 'fire' } }); b.counter = COUNTERS.fire; const ehp = b.enemy.hp;
assert.equal(enemyPlan(b).kind, 'elemental'); endTurn();
assert.equal(ehp - b.enemy.hp, 6 + 8, 'Counter Weave rank 3: +8 on a successful counter (steps 1/2/4)'); assert.equal(b.energy, maxEnergy() + 1, 'Resonant Rebound +1 energy');
b = setup({ reflux: 1 }, ['cinder', 'venom', 'cinder']); playCard(0); assert.equal(b.hand.length, 2, 'Prism Shift: the first elemental attack draws nothing');
playCard(0); assert.equal(b.hand.length, 2, 'a different element draws 1'); playCard(0); assert.equal(b.hand.length, 1, 'once per turn at rank 1');
b = setup({ nullField: 1 }, ['cinder', 'venom']); assert.equal(dealt(b), Math.round(6 * 1.2), 'Prismatic Cascade: +20% with one element'); assert.equal(dealt(b), Math.round(3 * 1.4), '+40% with two');

// ---------------- RESOLVE ----------------
b = setup({ bulwark: 3 }, ['guard']); playCard(0); assert.equal(b.block, 5 + 6, 'Bulwark Doctrine rank 3: +6 Block on Defense cards');
b = setup({ bulwark: 3 }, ['riposte']); playCard(0); assert.equal(b.block, 3, 'Bulwark does not apply to attack cards that also block');
b = setup({ bulwark: 2, thorns: 2 }, []); b.block = 30; const e1 = b.enemy.hp; endTurn(); assert.equal(e1 - b.enemy.hp, 2, 'Retaliation Coil rank 2 returns 2 when Block absorbs a hit');
b = setup({ bulwark: 2, thorns: 1, fortress: 1 }, []); b.block = 30; const hit = enemyPlan(b).damage; endTurn(); assert.equal(b.block, Math.min(10, Math.floor((30 - hit) / 2)), 'Fortress keeps half of the unused Block, up to 10');
b = setup({ bulwark: 2, thorns: 1, fortress: 1, unbreakable: 1 }, []); newGame(); state.talents = { bulwark: 2, thorns: 1, fortress: 1, unbreakable: 1, retainCore: 1, preparation: 1, recall: 1, steadyMind: 1 }; state.playerLevel = 30; state.room = '1,5'; state.cooldowns = {};
startBattle(roomSpawns('1,5').find(s => !s.boss).uid); assert.equal(state.battle.block, 10 + crystalOpeningBlock(), 'Unbreakable: 10 Block at the start'); assert.equal(state.battle.energy, maxEnergy() + 1, 'Steady Mind: +1 energy on turn 1');
b = setup({ retainCore: 1, plating: 3, vitality: 1, leech: 2 }, ['strike', 'strike']); state.hp = 10; playCard(0); assert.equal(state.hp, 14, 'Siphon Edge rank 2 heals 4'); playCard(0); assert.equal(state.hp, 14, 'only the first attack each turn');
b = setup({ retainCore: 1, plating: 3, vitality: 1, leech: 2, secondWind: 1 }, ['strike']); state.hp = 10; const sw = state.hp; playCard(0); assert.equal(state.hp, sw + 4 + Math.max(6, Math.round(state.maxHp * .15)), 'Second Wind heals 15% of max health once below half health');
b = setup({ retainCore: 1, plating: 3, vitality: 1, leech: 2, secondWind: 1, undying: 1 }, []); state.hp = 1; b.secondWindUsed = true; b.enemy.attack = 99; endTurn();
assert.equal(state.hp, 1, 'Undying Core: survive at 1 HP'); assert.equal(b.phase, 'fight'); assert.equal(b.turn, 2, 'the fight continues to the next turn');
for (let k = 0; k < 3 && b.phase === 'fight'; k++) endTurn(); assert.equal(b.phase, 'lost', 'Undying works once per encounter');
b = setup({ retainCore: 1, preparation: 1, recall: 2 }, ['strike', 'guard']); b.savedUid = b.hand[0].uid; endTurn();
const kept = b.hand.find(c => c.id === 'strike'); assert(kept, 'Memory Buffer retained the strike');
assert.equal(stat(kept).cost, 1, 'Preparation no longer changes cost'); const idx = b.hand.indexOf(kept); assert.equal(dealt(b, idx), 6 + 2 + 2, 'Preparation +2 and Total Recall +1 per rank on the retained card');
Math.random = realRandom;
console.log('PASS: all 32 new talents verified (Surge 11, Disruption 11 incl. Jammer Reserve charges, Resolve 10) with exact numbers through the real engine.');
}`);
// Round 218: Edge Calibration adds +1 damage per rank.
run(`{ newGame(); const got = [1, 2, 3, 4, 5].map(r => { state.talents.edge = r; return attackBonus(); }); assert.deepEqual(got, [1, 2, 3, 4, 5], 'Edge Calibration: +1 per rank');
  const node = Object.values(TALENT_BRANCHES).flatMap(b => b.nodes).find(n => n.id === 'edge'); assert(node.desc.includes('+1 damage per rank')); console.log('PASS: Edge Calibration adds +1 damage per rank, as its description says.'); }`);
