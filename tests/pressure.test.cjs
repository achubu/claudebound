'use strict';
// Round 226: ⚔ Pressure. On a turn where you gain no Block from a card, every few damage you deal
// (the world's rate) takes 1 off the enemy's attack at the end of that turn, up to half of it.
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = {};
const fight = () => { newGame(); state.region = 'city'; configureRegion('city'); state.playerLevel = 8; syncTalentVitals(false); state.hp = state.maxHp;
  const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && !s.boss)); state.room = k; startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.boss).uid);
  const b = state.battle; b.enemy.hp = b.enemy.maxHp = 999; b.enemy.attack = 30; b.enemy.armor = 0; b.enemy.guard = 0; b.energy = 9; return b; };
// Make sure this turn's plan is an attack.
const attackTurn = b => { for (let t = 0; t < 12 && !(enemyPlan(b).damage > 0 && !(enemyPlan(b).hits > 1)); t++) b.turn++; return enemyPlan(b).damage; };
let b = fight(); const full = attackTurn(b);
b.hand = [make('strike')]; const dmg = (() => { const hp = b.enemy.hp; playCard(0); return hp - b.enemy.hp; })();
o.one = { per: pressurePer(), full, dmg, now: enemyPlan(b).damage, off: enemyPlan(b).pressure, next: enemyPlan(b, b.turn + 1).pressure || 0 };
b.energy = 20; b.hand = Array.from({ length: 6 }, () => make('cleave')); for (let i = 0; i < 6; i++) playCard(0);
o.cap = { full, now: enemyPlan(b).damage, dealt: pressureDealt(b) };
b.energy = 5; b.hand = [make('bastion')]; playCard(0); o.blocked = { now: enemyPlan(b).damage, guarded: pressureGuarded(b), line: intentBubble(enemyPlan(b), 'now', '', false).includes('No Pressure') };
// The hit you take matches the shown intent.
b = fight(); attackTurn(b); b.hand = [make('cleave'), make('cleave')]; playCard(0); playCard(0);
const shown = enemyPlan(b).damage, hp = state.hp; b.block = 0; endTurn(); o.taken = { shown, lost: hp - state.hp };
o.reset = { dealt: pressureDealt(state.battle), guarded: pressureGuarded(state.battle) };
return JSON.stringify(o); })()`));
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg, JSON.stringify(r)); process.exit(1); } console.log('ok', msg); };
assert(r.one.off === Math.floor(r.one.dmg / r.one.per) && r.one.now === r.one.full - r.one.off, 'every ' + r.one.per + ' damage dealt takes 1 off this turn\'s attack');
assert(r.one.next === 0, 'the turn after is untouched');
assert(r.cap.dealt / r.one.per > r.cap.full / 2 && r.cap.now === r.cap.full - Math.floor(r.cap.full / 2), 'it takes off at most half');
assert(r.blocked.guarded && r.blocked.now === r.one.full && r.blocked.line, 'gaining Block from a card that turn means no Pressure, and the intent says so');
assert(r.taken.lost === r.taken.shown && r.taken.shown > 0, 'the hit taken matches the lowered intent');
assert(r.reset.dealt === 0 && !r.reset.guarded, 'it starts again from nothing each turn');
