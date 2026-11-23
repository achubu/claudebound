'use strict';
// Round 533: five trait bugs a review found (owner passed them on to check): Twin strike while frozen or blocked, lethal hits
// skipping Phasing / Resistant, trait effects from a card not saved, Purging on a pair's partner, Bloodthirst healing from
// damage it didn't deal.
process.env.HARNESS_ONLY = '1'; process.env.TRAITS = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ const o = {};
const setup = (trait, hand) => { newGame(); state.room = '1,5'; startBattle(roomSpawns('1,5').find(s => !s.boss).uid); const b = state.battle;
  b.enemy = { ...b.enemy, hp: 300, maxHp: 300, armor: 0, guard: 0, attack: 20, baseAttack: 20, trait }; b.hand = hand.map(id => make(id)); b.energy = 9; state.hp = state.maxHp = 200; return b; };
const attackTurn = b => { for (let t = 1; t < 30; t++) { b.turn = t; const p = enemyPlan(b); if (p && p.kind === 'attack') return p; } };
// 1. Twin strike: nothing while frozen; leftover Block takes the extra hit
let b = setup('twinStrike', []); attackTurn(b); b.freeze = 1; let hp = state.hp; endTurn(); o.twinFrozen = hp - state.hp;
b = setup('twinStrike', []); attackTurn(b); b.block = 100; hp = state.hp; endTurn(); o.twinBlocked = hp - state.hp;
b = setup('twinStrike', []); attackTurn(b); b.block = 0; hp = state.hp; endTurn(); o.twinOpen = hp - state.hp;
// 2. Phasing on a lethal first hit: it survives with what passed through
b = setup('phasing', ['strike']); const hit = (() => { const t = setup('phasing', ['strike']); t.enemy.trait = null; const h0 = t.enemy.hp; playCard(0); return h0 - t.enemy.hp; })();
b = setup('phasing', ['strike']); b.enemy.hp = hit; playCard(0); o.phaseLethal = { phase: state.battle && state.battle.phase, hp: state.battle && state.battle.enemy.hp, hit };
b = setup('resistant', ['strike']); b.enemy.hp = hit; playCard(0); o.resistLethal = { phase: state.battle && state.battle.phase, hp: state.battle && state.battle.enemy.hp };
// 3. what a card's trait effect changes is saved
b = setup('phasing', ['strike']); let last = null; const save0 = save; save = function () { last = JSON.parse(JSON.stringify(state)); return save0.apply(this, arguments); }; playCard(0); save = save0; o.saved = { live: b.enemy.hp, saved: last && last.battle && last.battle.enemy.hp, phaseTurn: last && last.battle && last.battle.phaseTurn };
// 4. Purging on the partner of a pair halves the partner's own Poison
b = setup(null, []); b.block = 999; b.pair = { other: { enemy: { ...b.enemy, name: 'Mate', hp: 300, maxHp: 300, trait: 'purging' }, id: b.enemy.id || 'x', freeze: 0, enemyDebuff: 0, burn: 0, burnTurns: 0, poison: 8 }, names: [b.enemy.name, 'Mate'] };
try { endTurn(); } catch (e) { o.pairErr = e.message; } o.purgeMate = state.battle && state.battle.pair ? state.battle.pair.other.poison : null;
// 5. Bloodthirst heals only from its own hits: frozen, with 5 Bleed on you, it heals nothing
b = setup('bloodthirst', []); attackTurn(b); b.freeze = 1; b.enemy.hp = 200; b.bleed = 5; const before = b.enemy.hp; const hpB = state.hp; endTurn(); o.bloodGuard = b.enemy.hp - before; o.bloodLost = hpB - state.hp;
b = setup('bloodthirst', []); attackTurn(b); b.enemy.hp = 200; b.block = 0; endTurn(); o.bloodHit = b.enemy.hp - 200;
return JSON.stringify(o); })()`));
assert.strictEqual(r.twinFrozen, 0, 'Twin strike: no extra hit while frozen');
assert.strictEqual(r.twinBlocked, 0, 'Twin strike: leftover Block takes the extra hit');
assert(r.twinOpen > 0, 'Twin strike still hits an open target');
assert(r.phaseLethal.phase === 'fight' && r.phaseLethal.hp > 0, 'Phasing: a lethal first hit is cut by 30%, the enemy survives: ' + JSON.stringify(r.phaseLethal));
assert(r.resistLethal.phase === 'fight' && r.resistLethal.hp > 0, 'Resistant: a lethal non-elemental hit is cut by 25%: ' + JSON.stringify(r.resistLethal));
assert.strictEqual(r.saved.saved, r.saved.live, 'the HP Phasing gave back is saved');
assert(r.saved.phaseTurn != null, 'the Phasing turn marker is saved');
assert(!r.pairErr && r.purgeMate === 4, 'Purging works on a pair partner: ' + (r.pairErr || r.purgeMate));
assert(r.bloodLost > 0 && r.bloodGuard === 0, 'Bloodthirst: frozen, it heals nothing from your Bleed (' + r.bloodGuard + ', you lost ' + r.bloodLost + ')');
assert(r.bloodHit > 0, 'Bloodthirst still heals from its own hit');
console.log('enemy-traits-bugs ok');
