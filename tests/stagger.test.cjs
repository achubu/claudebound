// Round 189: ✸ Chain on Cinder Lance. Two Cinder Lances in one turn daze the enemy (bosses too):
// its attack that turn deals STAGGER_DAZE less. At most once every 3 turns.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random; Math.random = () => 0.99;
function setup(boss) {
  newGame(); state.playerLevel = 10; state.talents = {}; syncTalentVitals(false); state.hp = state.maxHp = 400;
  state.room = '1,5'; state.cooldowns = {}; startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.id = 'thornling'; ENEMY_AFFLICTIONS.thornling = [];
  b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 900, maxHp: 900, attack: 40, boss: !!boss, elite: false };
  b.draw = Array.from({ length: 20 }, () => make('guard')); b.discard = []; b.exhaust = []; b.turn = 1; b.freeze = 0; b.block = 0;
  return b;
}
// Round 226: the Lances' own damage would also bring ⚔ Pressure; mark the turn as guarded so only the daze shows.
const lance = b => { b.hand.push(make('cinder')); b.energy = 9; playCard(b.hand.length - 1); b.guardTurn = b.turn; };
const nextAttackTurn = () => { const b = state.battle; while (!(enemyPlan(b).damage > 0)) { b.block = 999; endTurn(); } return state.battle; };
assert(defs.cinder.stagger && rules(make('cinder')).includes('Chain'), 'Cinder Lance explains the chain');
assert.equal(stat(make('cinder')).damage, 6); assert.equal(stat(make('cinder')).burn, 2);
// One Lance a turn never dazes, however many times it is played over the fight.
let b = setup(false); for (let t = 0; t < 4; t++) { lance(b); assert(!dazedNow(b), 'one per turn: no daze'); b.block = 999; endTurn(); b = state.battle; }
// Two in one turn daze the enemy's attack that turn, by STAGGER_DAZE.
b = setup(false); b = nextAttackTurn(); const full = enemyPlan(b).damage; lance(b); lance(b);
assert(dazedNow(b), 'two in one turn daze'); assert.equal(enemyPlan(b).damage, Math.ceil(full * (1 - STAGGER_DAZE)), 'the attack is reduced');
b.block = 0; let hp = state.hp; endTurn(); assert(hp - state.hp <= Math.ceil(full * (1 - STAGGER_DAZE)), 'the hit that lands is the reduced one');
b = state.battle; assert(!dazedNow(b), 'the daze lasts one turn');
// Recovery: another chain within 3 turns does not daze.
lance(b); lance(b); assert(!dazedNow(b), 'still recovering');
// Bosses are dazed too.
b = setup(true); b = nextAttackTurn(); lance(b); lance(b); assert(dazedNow(b), 'bosses are dazed');
Math.random = realRandom;
}`);
console.log('PASS: two Cinder Lances in one turn daze any enemy (attack reduced by STAGGER_DAZE for that turn), once every 3 turns.');
