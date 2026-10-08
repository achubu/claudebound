// Round 44: pitching, Aether, the side deck, and every enemy affliction, through the real engine.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random;
function setup(id, hand, opts = {}) {
  newGame(); state.playerLevel = 10; state.talents = {}; syncTalentVitals(false); state.hp = state.maxHp = 100;
  state.room = '1,5'; state.cooldowns = {};
  startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle;
  b.id = id; b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 300, maxHp: 300, attack: 10, boss: false, elite: false, ...(opts.enemy || {}) };
  b.hand = hand.map(h => make(h)); b.draw = Array.from({ length: 12 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = opts.energy ?? 3; b.block = 0; b.turn = opts.turn ?? 1; b.counter = null; b.freeze = 0;
  return b;
}

// ---------- Starter side deck, pitching, drawing ----------
newGame(); ensureSide();
assert.deepEqual(state.side.pool.map(c => c.id), ['purify', 'aegis', 'dispel'], 'new journeys start with a 3-card side kit');
assert.equal(state.side.pool.length, 3, 'three starter side cards'); assert.equal(state.side.deck.length, 2, 'the side deck starts with room for 2');
let b = setup('thornling', ['strike', 'strike', 'cleave', 'spark']);
assert.equal(b.aether, AETHER_START, 'encounters start with 2 Aether'); assert.equal(b.sideDraw.length, 2, 'two side cards in the first fights');
assert.equal(pitchValue(b.hand[0]), 2, 'a 1-cost card pitches for 2'); assert.equal(pitchValue(b.hand[2]), 3, 'a 2-cost card for 3'); assert.equal(pitchValue(b.hand[3]), 1, 'a 0-cost card for 1');
togglePitch(b.hand[0].uid); togglePitch(b.hand[1].uid);
assert.equal(pendingAether(b), 4);
const pitchedUids = b.pitch.slice(), leftover = b.energy; endTurn();
assert(leftover > 1); assert.equal(b.aether, Math.min(AETHER_MAX, AETHER_START + 4 + leftover), 'two pitched 1-cost cards give 4 Aether, and each unspent energy gives 1 more');
assert(pitchedUids.every(u => b.exhaust.some(c => c.uid === u)), 'pitched cards burn away for the encounter');
assert(pitchedUids.every(u => !b.discard.some(c => c.uid === u) && !b.draw.some(c => c.uid === u)));
// Choosing a side card.
// Round 67: the side deck is always open; side cards cost Aether only (4 minimum).
for (const id of Object.keys(SIDE_CARDS)) assert(sideAetherCost(id) >= 4 && sideAetherCost(id) === 4 + SIDE_CARDS[id].cost, id + ' costs at least 4 Aether');
{ const all = sideAvailable(b).length; assert.equal(all, b.sideDraw.length, 'every side card is available'); const c = b.sideDraw[1]; b.aether = sideAetherCost(c.id) - 1; playSideCard(c.uid); assert.equal(sideAvailable(b).length, all, 'not enough Aether: nothing happens');
  if (sideUsable(b, c.id)) { b.aether = sideAetherCost(c.id); const en = b.energy; playSideCard(c.uid); assert.equal(sideAvailable(b).length, all - 1, 'played straight from the side deck, once per fight'); assert.equal(b.energy, en + (c.id === 'overflow' ? 1 : 0), 'no energy cost'); } }
// Aether cap and the minimum cycle.
b.aether = 7; b.hand = [make('cleave'), make('cleave')]; b.draw = [make('guard'), make('guard'), make('guard')]; b.discard = [];
togglePitch(b.hand[0].uid); assert.equal(b.pitch.length, 1);
togglePitch(b.hand[1].uid); assert.equal(b.pitch.length, 1, 'cannot pitch below ' + MIN_CYCLE + ' cards in the encounter');
b.savedUid = b.hand[1].uid; assert(!canPitch(b, b.hand[1]), 'a retained card cannot be pitched'); b.savedUid = null;
ENEMY_AFFLICTIONS.thornling = []; endTurn(); assert.equal(b.aether, AETHER_MAX, 'Aether caps at ' + AETHER_MAX);
b = setup('thornling', [], { energy: 2 }); ENEMY_AFFLICTIONS.thornling = []; endTurn(); assert.equal(b.aether, AETHER_START + 2, 'unspent energy gives 1 Aether per point');
b = setup('thornling', [], { energy: 0 }); endTurn(); assert.equal(b.aether, AETHER_START, 'no unspent energy, no Aether');
ENEMY_AFFLICTIONS.thornling = ['frail'];

// ---------- Schedules ----------
b = setup('emberling', []);
assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(t => riderAt(b, t)), [null, 'bleed', null, null, 'bleed', null, null, 'bleed'], 'regular enemies: every third turn from turn 2');
b.enemy.elite = true; assert.deepEqual([1, 2, 3, 4].map(t => riderAt(b, t)), [null, 'bleed', null, 'bleed'], 'elites: every other turn');
b = setup('moonKnight', [], { enemy: { boss: true, element: 'water' } });
assert.deepEqual([2, 5, 8, 11].map(t => scheduledRider(b, t)), ['rend', 'shackle', 'rend', 'shackle'], 'mini-bosses alternate two afflictions every 3rd turn');
b = setup('thornWarden', [], { enemy: { boss: true, element: 'earth' } });
assert.deepEqual([2, 5, 8].map(t => scheduledRider(b, t)), ['barrier', 'bleed', 'crush'], 'final bosses cycle three');
b.enemy.hp = 100; assert.deepEqual([2, 3, 4, 6].map(t => scheduledRider(b, t)), ['barrier', null, 'bleed', 'crush'], 'enraged final bosses: every 2nd turn');
// Strike riders scheduled on a guard turn carry to the next attack.
b = setup('burrower', []);
assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(t => riderAt(b, t)), [null, null, null, 'rend', null, null, 'rend'], 'a regular strike affliction lands on plain attacks (4, 7 …), not heavies');
assert.equal(enemyPlanBeforeAether(b, 4).kind, 'attack'); assert(enemyPlan(b, 4).name.includes('Rend'), 'the telegraph names the affliction');
b = setup('thornWarden', [], { enemy: { boss: true, element: 'earth' } });
assert.equal(scheduledRider(b, 8), 'crush'); assert.equal(enemyPlanBeforeAether(b, 8).kind, 'guard');
assert.equal(riderAt(b, 8), null); assert.equal(riderAt(b, 9), 'crush', 'a boss strike affliction on a guard turn carries to the next attack');

// ---------- Every affliction ----------
// Bleed (hex on a guard turn): ticks at the end of the next turns, decaying.
b = setup('emberling', [], { turn: 2 }); endTurn(); assert.equal(b.bleed, 2);
let hp = state.hp; b.block = 999; endTurn(); assert.equal(hp - state.hp, 2, 'Bleed 2'); assert.equal(b.bleed, 1);
hp = state.hp; b.block = 999; endTurn(); assert.equal(hp - state.hp, 1); assert.equal(b.bleed, 0);
b.bleed = 50; state.hp = 5; b.block = 999; endTurn(); assert.equal(state.hp, 1, 'Bleed never drops you below 1');
// Frail: 25% less card damage for two turns.
b = setup('thornling', [], { turn: 2 }); endTurn(); b.enemy.guard = 0; b.hand = [make('strike'), make('strike'), make('strike')]; b.energy = 3;
let e = b.enemy.hp; playCard(0); assert.equal(e - b.enemy.hp, 6 - 2, 'Frail: 6 damage becomes 4 (rounded 25% cut)');
b.block = 999; endTurn(); b.enemy.guard = 0; b.hand = [make('strike')]; b.energy = 3; e = b.enemy.hp; playCard(0); assert.equal(e - b.enemy.hp, 4, 'still Frail the second turn');
b.block = 999; endTurn(); b.enemy.guard = 0; b.hand = [make('strike')]; b.energy = 3; e = b.enemy.hp; playCard(0); assert.equal(e - b.enemy.hp, 6, 'Frail wears off');
// Shackle: one less energy.
b = setup('vespShade', [], { turn: 2 }); endTurn(); assert.equal(b.energy, maxEnergy() - 1, 'Shackle: −1 energy'); assert(b.shackledNow);
// Fog: one fewer card.
b = setup('shade', [], { turn: 2 }); endTurn(); assert.equal(b.hand.length, 3, 'Fog: draw 3 instead of 4');
// Static: unplayable junk, pitchable for 1.
b = setup('cryptWisp', [], { turn: 2 }); const drawBefore = b.draw.length; endTurn();
const statics = [...b.draw, ...b.hand].filter(isJunk); assert.equal(statics.length, 1, 'Static Flood adds 1 Static in the city');
b.hand.unshift(makeStatic()); const handLen = b.hand.length; playCard(0); assert.equal(b.hand.length, handLen, 'Static cannot be played');
assert(!canPitch(b, b.hand[0]), 'Static cannot be pitched for Aether'); togglePitch(b.hand[0].uid); assert.equal(b.pitch.length, 0);
b.aether = 1; let junkUid = b.hand[0].uid; cleanseStatic(junkUid); assert(b.hand.some(c => c.uid === junkUid), 'cleansing needs ' + STATIC_CLEANSE_COST + ' Aether');
b.aether = 3; cleanseStatic(junkUid); assert(!b.hand.some(c => c.uid === junkUid), 'cleansing removes the Static'); assert.equal(b.aether, 3 - STATIC_CLEANSE_COST, 'and costs Aether');
assert(![...b.draw, ...b.discard, ...b.exhaust].some(c => c.uid === junkUid), 'it is gone for the encounter');
// Empower and Barrier.
b = setup('crownSentinel', [], { turn: 5, enemy: { boss: true, element: 'air' } }); b.enemy.boss = true;
const atk = b.enemy.attack; b.block = 999; endTurn(); assert.equal(b.enemy.attack, atk + 2, 'Empower +2 in the city'); assert.equal(b.empower, 2);
applyHex(b, 'empower'); applyHex(b, 'empower'); assert.equal(b.empower, 4, 'Empower stacks once, to double');
b.bleed = 0; applyHex(b, 'bleed'); applyHex(b, 'bleed'); applyHex(b, 'bleed'); assert.equal(b.bleed, 4, 'Bleed stacks to double');
b = setup('vineguard', [], { turn: 2 }); endTurn(); b.enemy.guard = 0; assert.equal(b.enemy.barrier, 5, 'Barrier 5 in the city');
applyHex(b, 'barrier'); assert.equal(b.enemy.barrier, 5, 'Barrier refreshes rather than stacking');
b.hand = [make('cleave')]; b.energy = 3; e = b.enemy.hp; playCard(0); assert.equal(e - b.enemy.hp, 13 - 5, 'Barrier absorbs card damage'); assert.equal(b.enemy.barrier, 0);
// Rend.
b = setup('burrower', [], { turn: 4 }); const rendHit = enemyPlan(b).damage; b.block = 6; hp = state.hp; endTurn(); assert.equal(hp - state.hp, Math.max(0, rendHit - 3), 'Rend cuts through half your Block');
// Crush.
b = setup('forgeBeast', [], { turn: 4 }); assert.equal(enemyPlan(b).damage, Math.round(enemyPlanBeforeAether(b, 4).damage * 1.3), 'Crush +30%');
// Siphon.
b = setup('drownedHeron', [], { turn: 2, enemy: { element: 'water', hp: 200 } });
assert.equal(enemyPlanBeforeAether(b, 4).kind, 'guard'); assert.equal(riderAt(b, 5), 'siphon', 'Siphon carries from the guard turn onto the next attack');
b.turn = 5; const sip = enemyPlan(b).damage; e = b.enemy.hp; hp = state.hp; endTurn(); assert.equal(hp - state.hp, sip, 'the siphoning strike lands in full'); assert.equal(b.enemy.hp - e, sip, 'Siphon heals the enemy by the damage dealt');
// Barrage: three hits, Block and Armor on each.
b = setup('cinderFox', [], { turn: 5, enemy: { element: 'fire' } }); const per = enemyPlan(b).damage; assert.equal(enemyPlan(b).hits, 3);
assert.equal(per, Math.max(1, Math.round(enemyPlanBeforeAether(b, 5).damage * .45)));
state.talents = { plating: 1 }; b.block = 5; hp = state.hp; endTurn();
const net = per - 1; let blk = 5, taken = 0; for (let k = 0; k < 3; k++) { const s = Math.min(blk, net); blk -= s; taken += net - s; }
assert.equal(hp - state.hp, taken, 'Barrage: 3 hits, Armor and Block each time');
state.talents = {};

// ---------- Every side card ----------
const give = (b, id) => { b.sideHand.push({ uid: 'sx' + id, id }); b.aether = (b.aether || 0) + sideAetherCost(id); return b.sideHand.length - 1; };
// Round 65: playing a side card is what costs Aether.
{ const b0 = setup('thornling', []); const i0 = give(b0, 'overflow'); b0.aether = sideAetherCost('overflow') - 1; playSide(i0); assert.equal(b0.sideHand.length, 1, 'playing a side card needs ' + SIDE_DRAW_COST + ' Aether'); b0.aether = sideAetherCost('overflow'); playSide(i0); assert.equal(b0.sideHand.length, 0); assert.equal(b0.aether, 1, 'and spends it (Overflow then gives +1)'); }
b = setup('thornling', []); b.bleed = 3; b.frail = 2; b.playerPoison = 2; b.playerBurn = 2; b.drained = true; b.exposed = 2; b.shackledNow = true; b.energy = 2; b.draw.push(makeStatic()); b.discard.push(makeStatic());
playSide(give(b, 'purify')); assert.equal(b.bleed + b.frail + b.playerPoison + b.playerBurn + b.exposed, 0, 'Purifying Light cleanses'); assert.equal(b.energy, 3, 'and gives back Shackle\\'s energy');
assert.equal([...b.draw, ...b.discard].filter(isJunk).length, 0, 'and purges Static');
b = setup('thornling', []); b.empower = 4; b.enemy.attack += 4; b.enemy.barrier = 10; e = b.enemy.hp;
playSide(give(b, 'dispel')); assert.equal(b.enemy.attack, 10); assert.equal(b.enemy.barrier, 0); assert.equal(e - b.enemy.hp, dispelDamage(), 'Dispel Lance strips buffs and deals piercing damage');
b = setup('burrower', [], { turn: 4 }); playSide(give(b, 'aegis')); assert.equal(b.block, aegisBlock()); hp = state.hp; const hit = enemyPlan(b).damage; endTurn();
assert.equal(hp - state.hp, Math.max(0, hit - aegisBlock()), 'Aegis Ward Block holds against Rend');
b = setup('vineguard', [], { turn: 2 }); b.energy = 1; const a0 = b.aether; playSide(give(b, 'anchor')); assert.equal(b.energy, 1, 'side cards cost no energy'); assert.equal(b.aether, a0, 'Null Anchor costs 5 Aether');
assert.equal(enemyPlan(b).anchored, 'barrier'); endTurn(); assert.equal(b.enemy.barrier || 0, 0, 'Null Anchor prevents the affliction'); assert.equal(b.anchor, false, 'and is used up');
b = setup('thornling', []); state.hp = 50; b.bleed = 4; playSide(give(b, 'restore')); assert.equal(state.hp, 50 + restoreHeal()); assert.equal(b.bleed, 0);
b = setup('blightAntler', [], { turn: 3, enemy: { element: 'earth' } }); assert.equal(enemyPlan(b).kind, 'elemental');
playSide(give(b, 'ground')); e = b.enemy.hp; hp = state.hp; endTurn(); assert.equal(hp - state.hp, 0, 'Grounding Rod cancels the charged strike'); assert.equal(e - b.enemy.hp, 6);
b = setup('thornling', [], { turn: 3 }); b.energy = 2; playSide(give(b, 'mirror')); const full = enemyPlan(b).mirrored; assert(full > 0);
hp = state.hp; e = b.enemy.hp; endTurn(); assert.equal(hp - state.hp, Math.ceil(full / 2), 'Mirror Sigil: you take half'); assert.equal(e - b.enemy.hp, full, 'and the enemy takes it all');
b = setup('burrower', [], { turn: 1 }); playSide(give(b, 'phase'));
assert.equal(enemyPlan(b, 1).damage, 0, 'Phase Veil negates the next damaging action'); hp = state.hp; endTurn(); assert.equal(hp - state.hp, 0); assert.equal(b.veil, false);
b = setup('thornling', []); const handN = b.hand.length; playSide(give(b, 'overflow')); assert.equal(b.energy, 4); assert.equal(b.hand.length, handN + 1); assert.equal(b.aether, AETHER_START + 1);
b = setup('thornling', []); playSide(give(b, 'stasis')); assert.equal(b.energy, 3, 'Stasis Field costs no energy'); assert.equal(sideAetherCost('stasis'), 6, 'Stasis Field costs 6 Aether'); hp = state.hp; endTurn(); assert.equal(hp - state.hp, 0, 'Stasis Field: the enemy skips its action');
b = setup('thornling', []); b.energy = 0; give(b, 'anchor'); b.aether = 4; playSide(0); assert.equal(b.sideHand.length, 1, 'Null Anchor needs 5 Aether');

// ---------- Rewards, workshop rules, saves ----------
newGame(); b = setup('thornling', []); b.phase = 'reward'; b.special = [];
const n0 = state.side.pool.length; assert.equal(rollSideDrop(b, .05), null, 'regular: 5% chance'); assert(rollSideDrop(b, .04), 'regular drop under 5%'); b.enemy.elite = true; assert.equal(rollSideDrop(b, .05), null, 'elites: 5% too'); b.enemy.elite = false; assert.equal(state.side.pool.length, n0 + 1);
b.enemy.boss = true; assert(rollSideDrop(b, .999), 'bosses always drop one');
assert(sidePoolFor(0).every(id => SIDE_CARDS[id].tier === 0), 'city drops city-tier side cards'); assert(sidePoolFor(2).includes('phase'));
newGame(); state.bosses.push('crownSentinel', 'galeSovereign', 'bloomTyrant', 'resonantPhantom'); for (let k = 0; k < 6; k++) addSideCard('purify');
assert(state.side.deck.length <= SIDE_DECK_MAX); assert.equal(sideCopies('purify'), SIDE_COPIES, 'at most 2 copies per side card');
const saved = JSON.parse(JSON.stringify(state)); validateImport(saved);
const bad = JSON.parse(JSON.stringify(state)); bad.side.pool.push({ uid: 'x9', id: 'purify' }); assert.throws(() => validateImport(bad), /side/);
const bad2 = JSON.parse(JSON.stringify(state)); bad2.side.pool.push({ uid: 's900', id: 'nope' }); assert.throws(() => validateImport(bad2), /side/);
const old = JSON.parse(JSON.stringify(state)); delete old.side; validateImport(old); restoreGame(old); assert.equal(state.side.deck.length, Math.min(3, sideDeckMax()), 'older saves receive the starter kit');
Math.random = realRandom;
// Round 71: side deck capacity grows 2 -> 6 with bosses.
newGame(); assert.equal(sideDeckMax(), 2); state.side.pool.push({ uid: 's90', id: 'restore' }, { uid: 's91', id: 'anchor' }, { uid: 's92', id: 'mirror' }, { uid: 's93', id: 'phase' });
toggleSideCard('s90'); assert.equal(state.side.deck.length, 2, 'cannot exceed the current capacity');
const grow = ['crownSentinel', 'galeSovereign', 'bloomTyrant', 'resonantPhantom'];
grow.forEach((id, i) => { state.bosses.push(id); assert.equal(sideDeckMax(), 3 + i); }); state.bosses.push('stormTyrant'); assert.equal(sideDeckMax(), 6, 'never above 6');
state.bosses = state.bosses.filter(id => id !== 'crownSentinel'); state.room = '4,0'; const sp = roomSpawns(state.room).find(s => s.type === 'crownSentinel'); if (sp) { state.side.deck = state.side.deck.slice(0, 5); startBattle(sp.uid); state.battle.enemy.hp = 0; winBattle(); assert.equal(sideDeckMax(), 6); assert.equal(state.side.deck.length, 6, 'a new slot is filled automatically'); assert(state.battle.special.some(t => /Side deck expanded/.test(t))); }
newGame(); state.side.deck = state.side.pool.map(c => c.uid); ensureSide(); assert.equal(state.side.deck.length, 2, 'over-capacity side decks are trimmed');
console.log('PASS: pitching, Aether, side-deck draws, all 11 enemy afflictions, schedules, all 10 side cards, drops, deck rules and save migration.');
}`);
