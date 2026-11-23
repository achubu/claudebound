'use strict';
// Battle core bugs a review reproduced: a Swipe from an enemy that dies to Burn / Poison (and a win at 0 HP),
// Mirrorguard reflecting Block that stopped nothing (countered strike, Rend), Lightning Disrupt halving only
// Barrage's last hit, Rootbind taken off every Barrage hit and spent by a countered strike, Cinder Lance
// overwriting a larger Burn.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ const o = {};
const setup = (hand, enemy = {}) => { newGame(); state.room = '1,5'; startBattle(roomSpawns('1,5').find(s => !s.boss).uid); const b = state.battle;
  b.enemy = { ...b.enemy, hp: 300, maxHp: 300, armor: 0, guard: 0, attack: 20, baseAttack: 20, ...enemy }; b.hand = hand.map(id => make(id)); b.energy = 9; state.hp = state.maxHp = 200; return b; };
const turnOf = (b, kind) => { for (let t = 1; t < 30; t++) { b.turn = t; const p = enemyPlan(b); if (p && p.kind === kind && !p.rider) return p; } return null; };
const findRider = (b, r) => { for (let t = 1; t < 40; t++) { b.turn = t; const p = enemyPlan(b); if (p.rider === r) return p; } return null; };
// 1. Swipe from an enemy that dies to Poison this end of turn
let b = setup([], { element: 'fire' }); o.chargeFound = !!turnOf(b, 'charge'); b.enemy.hp = 5; b.poison = 10; b.block = 0; state.hp = 50; endTurn();
o.swipeDot = { phase: b.phase, hp: state.hp };
b = setup([], { element: 'fire' }); turnOf(b, 'charge'); b.enemy.hp = 5; b.poison = 10; b.block = 0; state.hp = 2; endTurn();
o.swipeLethal = { phase: b.phase, hp: state.hp };
// ... and no win at 0 HP when the enemy dies to DoT
b = setup([], { element: 'fire' }); turnOf(b, 'attack'); b.enemy.hp = 5; b.poison = 10; state.hp = 0; endTurn();
o.zeroHp = { phase: b.phase };
// 2. Mirrorguard: a countered strike stops nothing; Rend halves the Block first
b = setup(['mirrorguard'], { element: 'fire' }); o.elemFound = !!turnOf(b, 'elemental'); playCard(0); b.counter = COUNTERS.fire;
let h0 = b.enemy.hp; endTurn(); o.mirrorCountered = h0 - b.enemy.hp;
b = setup(['mirrorguard']); b.id = 'burrower'; b.enemy.element = null; o.rendFound = !!findRider(b, 'rend'); playCard(0); o.mirrorBlock = b.block;
h0 = b.enemy.hp; endTurn(); o.mirrorRend = h0 - b.enemy.hp;
// 3. Lightning Disrupt halves all three Barrage hits
b = setup([]); b.id = 'vespMoth'; b.enemy.element = null; const pb = findRider(b, 'barrage'); o.barrage = pb && { d: pb.damage, hits: pb.hits };
let hp = state.hp; b.block = 0; endTurn(); o.barrageNormal = hp - state.hp;
b = setup([]); b.id = 'vespMoth'; b.enemy.element = null; findRider(b, 'barrage'); b.disrupted = true; hp = state.hp; b.block = 0; endTurn(); o.barrageDisrupted = hp - state.hp;
// 4. Rootbind comes off Barrage's total, and a countered strike doesn't spend it
b = setup([]); b.id = 'vespMoth'; b.enemy.element = null; findRider(b, 'barrage'); b.bind = 4; hp = state.hp; b.block = 0; endTurn(); o.barrageBound = hp - state.hp;
b = setup(['rootbind'], { element: 'fire' }); turnOf(b, 'elemental'); playCard(0); o.bindBefore = b.bind; b.counter = COUNTERS.fire; endTurn(); o.bindAfter = b.bind;
// 5. Cinder Lance never lowers a larger Burn
b = setup(['cinder']); b.burn = 6; b.burnTurns = 2; playCard(0); o.cinderOver = { burn: b.burn, t: b.burnTurns };
b = setup(['cinder']); b.burn = 6; b.burnTurns = 0; playCard(0); o.cinderFresh = { burn: b.burn, t: b.burnTurns };
return JSON.stringify(o); })()`));
assert(r.chargeFound && r.elemFound && r.rendFound && r.barrage && r.barrage.hits === 3, 'setup found its plans: ' + JSON.stringify(r));
assert.deepStrictEqual(r.swipeDot, { phase: 'reward', hp: 50 }, 'an enemy dying to Poison does not Swipe');
assert.deepStrictEqual(r.swipeLethal, { phase: 'reward', hp: 2 }, 'no lethal Swipe from an enemy dying to Poison');
assert.notStrictEqual(r.zeroHp.phase, 'reward', 'no win at 0 HP when the enemy dies to Burn / Poison');
assert.strictEqual(r.mirrorCountered, 6, 'Mirrorguard reflects nothing when the strike is countered (only the counter\'s 6)');
assert.strictEqual(r.mirrorRend, Math.floor((r.mirrorBlock - Math.ceil(r.mirrorBlock / 2)) / 2), 'Mirrorguard reflects only the Block Rend left');
assert.strictEqual(r.barrageNormal, r.barrage.d * 3, 'plain Barrage: three full hits');
assert.strictEqual(r.barrageDisrupted, Math.ceil(r.barrage.d / 2) * 3, 'Lightning Disrupt halves every Barrage hit');
assert.strictEqual(r.barrageBound, (r.barrage.d - Math.ceil(4 / 3)) * 3, 'Rootbind is shared across Barrage\'s hits');
assert(r.bindBefore > 0 && r.bindAfter === r.bindBefore, 'a countered strike does not spend Rootbind: ' + r.bindBefore + ' -> ' + r.bindAfter);
assert.deepStrictEqual(r.cinderOver, { burn: 6, t: 2 }, 'Cinder Lance keeps a larger Burn');
assert(r.cinderFresh.burn > 0 && r.cinderFresh.burn < 6 && r.cinderFresh.t === 2, 'Cinder Lance sets a fresh Burn: ' + JSON.stringify(r.cinderFresh));
console.log('battle-core-bugs ok');
