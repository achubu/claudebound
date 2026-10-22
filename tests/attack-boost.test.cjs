'use strict';
// Round 240: attack cards deal 25% more damage after Neon Aftermath; their printed numbers (and so the
// text, live bonuses and damage dealt) scale when a later world is configured, and come back in the city.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = {}, at = w => { state.region = w; configureRegion(w); return { strike: stat(make('strike')).damage, cleave: stat(make('cleave')).damage, surge: defs.tempestSurge.tiers[0].xDamage,
  gustTail: defs.gustChain.tiers[0].tailwind.damage, guard: stat(make('guard')).block, dusk: defs.duskProtocol.tiers[0].modes[0].damage, bash3: defs.bulwarkBash.tiers[3].blockStrike, text: rules(make('tempestSurge')) }; };
newGame(); o.city = at('city'); o.sky = at('sky'); o.chrono = at('chronospire'); o.back = at('city');
// The damage actually dealt follows.
newGame(); state.region = 'elaris'; configureRegion('elaris'); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && !s.boss)); state.room = k; state.talents = {};
startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.boss).uid); const b = state.battle; b.enemy.hp = b.enemy.maxHp = 999; b.enemy.armor = 0; b.enemy.guard = 0; b.enemy.barrier = 0; b.energy = 9;
b.hand = [make('cleave')]; const hp = b.enemy.hp; playCard(0); o.dealt = hp - b.enemy.hp;
return JSON.stringify(o); })()`));
assert.deepStrictEqual([r.city.strike, r.city.cleave, r.city.surge, r.city.gustTail], [6, 13, 7, 2], 'Neon Aftermath keeps the printed numbers');
assert.deepStrictEqual([r.sky.strike, r.sky.cleave, r.sky.surge, r.sky.gustTail], [8, 16, 9, 3], 'later worlds: +25%, rounded (bonuses too)');
assert.strictEqual(r.sky.text, 'Spend all your energy: deal 9 damage per energy.', 'the card text shows it');
assert.deepStrictEqual(r.chrono, r.sky, 'the same in every later world (not compounded)');
assert.strictEqual(r.sky.guard, r.city.guard, 'defense cards unchanged');
assert.strictEqual(r.sky.dusk, r.city.dusk, 'skills unchanged');
assert.strictEqual(r.sky.bash3, r.city.bash3, 'Bulwark Bash is a defensive card and keeps its values (owner)');
assert.deepStrictEqual(r.back, r.city, 'back in Neon Aftermath the numbers return');
assert.strictEqual(r.dealt, 16, 'the damage dealt follows (16 for Cleave)');
console.log('attack-boost ok');
