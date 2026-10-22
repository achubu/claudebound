'use strict';
// Round 237: in the Sky Isles a Shear attack ignores Reactive Plating (Block still counts), and from
// the Sky Isles on, enemies carry stronger damage over time (Scorch, Venom, Bleed) that Armor and
// Block can't stop, answered by cleansing or healing. Other worlds' Shear is off.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = {};
const fight = (world, boss) => { newGame(); state.region = world; configureRegion(world); state.talents = { retainCore: 1, plating: 5 }; state.playerLevel = 30; syncTalentVitals(false); state.hp = state.maxHp;
  const pick = s => spawnAvailable(s) && !!s.boss === boss && (!boss || !enemies[s.type].miniBoss);
  const k = Object.keys(rooms).find(k => roomSpawns(k).some(pick)); state.room = k; startBattle(roomSpawns(k).find(pick).uid);
  const b = state.battle; b.enemy.hp = b.enemy.maxHp = 999; b.enemy.attack = 20; b.enemy.armor = 0; b.block = 0; return b; };
let b = fight('sky', false);
// Find a plain attack turn and a Shear turn without riders, then take each hit.
const turnWith = want => [...Array(60).keys()].find(t => { if (t < 1) return false; const p = enemyPlan(b, t); return p.damage > 0 && !(p.hits > 1) && !p.rider && p.kind !== 'elemental' && want(p); });
const hit = (t, block) => { b.turn = t; b.hand = []; b.block = block; b.bleed = 0; b.playerBurn = 0; b.playerPoison = 0; const p = enemyPlan(b); state.hp = state.maxHp; const hp = state.hp; endTurn(); const lost = hp - state.hp; state.battle = b; b.phase = 'fight'; return { dmg: p.damage, lost, name: p.name }; };
const tp = turnWith(p => !p.shear), ts = turnWith(p => p.shear);
o.plain = hit(tp, 0); o.shear = hit(ts, 0); o.shearBlocked = hit(ts, 10); o.plating = scaledRank('plating');
o.bubble = intentBubble(enemyPlan(b, ts), 'now', 'x', false);
// The new afflictions, at Sky Isles strength.
b.playerBurn = 0; b.burnPower = 0; b.playerPoison = 0; applyHex(b, 'scorch'); o.scorch = { turns: b.playerBurn, power: b.burnPower };
applyHex(b, 'venom'); applyHex(b, 'venom'); applyHex(b, 'venom'); applyHex(b, 'venom'); o.venom = b.playerPoison;
o.amounts = { scorch: WORLD_ORDER.map((w, i) => afflictionAmount('scorch', i)), venom: WORLD_ORDER.map((w, i) => afflictionAmount('venom', i)), bleed: WORLD_ORDER.map((w, i) => afflictionAmount('bleed', i)) };
// A burn ticks through Block and Armor at the end of the turn, then forgets its strength once it runs out.
b.turn = turnWith(p => !p.rider && p.kind !== 'charge'); b.playerPoison = 0; b.playerBurn = 1; b.burnPower = 4; b.block = 99; state.hp = state.maxHp; endTurn(); state.battle = b; b.phase = 'fight';
o.tick = { lost: state.maxHp - state.hp, power: b.burnPower };
// Cleansing clears them (Static Shield's cleanse and Purifying Light).
b.playerBurn = 3; b.burnPower = 3; const first = cleanseOne(b); b.playerPoison = 4; const second = cleanseOne(b); o.cleanse = [first, second, b.playerBurn, b.playerPoison];
o.lists = { drake: ENEMY_AFFLICTIONS.skyDrake, harpy: ENEMY_AFFLICTIONS.skyHarpy, roc: ENEMY_AFFLICTIONS.zenithRoc, tyrant: ENEMY_AFFLICTIONS.elarisTyrant };
b = fight('elaris', false); o.otherShear = [...Array(30).keys()].some(t => enemyPlan(b, t + 1).shear);
return JSON.stringify(o); })()`));
assert.strictEqual(r.plating, 8, 'Reactive Plating 5 gives 8 Armor');
assert(r.shear.name.startsWith('🌪 Shearing') && !r.plain.name.startsWith('🌪'), 'a Shear is named in the intent');
assert.strictEqual(r.plain.lost, Math.max(0, r.plain.dmg - 8), 'a normal hit loses 8 to Plating');
assert.strictEqual(r.shear.lost, r.shear.dmg, 'a Shear ignores Plating');
assert.strictEqual(r.shearBlocked.lost, Math.max(0, r.shear.dmg - 10), 'Block from cards still stops a Shear');
assert(r.bubble.includes('🌪 Shear'), 'the intent explains it');
assert.deepStrictEqual(r.scorch, { turns: 3, power: 3 }, 'Scorch in the Sky Isles: Burn 3 for 3 turns');
assert.strictEqual(r.venom, 6, 'Venom stacks to 3x its amount');
assert.deepStrictEqual(r.amounts.bleed, [2, 3, 4, 5, 6, 7], 'Bleed grows in every world');
assert(r.amounts.scorch[5] > r.amounts.scorch[2] && r.amounts.venom[5] > r.amounts.venom[2], 'Scorch and Venom grow past the Sky Isles');
assert.strictEqual(r.tick.lost, 4, 'a Burn ticks through Block and Armor');
assert.strictEqual(r.tick.power, 0, 'a spent Burn forgets its strength');
assert.deepStrictEqual(r.cleanse, ['burn', 'poison', 0, 0], 'cleansing clears Burn and Poison');
assert(r.lists.drake.includes('scorch') && r.lists.harpy.includes('bleed') && r.lists.roc.includes('scorch') && r.lists.tyrant.includes('venom'), 'Sky Isles enemies and later ones carry them');
assert(!r.otherShear, 'no Shear outside the Sky Isles');
console.log('sky-storm ok');
