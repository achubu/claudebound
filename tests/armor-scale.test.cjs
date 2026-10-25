'use strict';
// Round 262: your Armor (Plating and gear) grows with the world; enemy Armor is roughly doubled after
// Neon Aftermath and always shows beside the enemy's health (armor-hud.js, checked in the browser test).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ newGame(); const o = {};
state.talents = { retainCore: 1, plating: 5 }; o.full = {}; for (const w of WORLD_ORDER) { configureRegion(w); o.full[w] = scaledRank('plating'); }
state.talents = { retainCore: 1, plating: 2 }; configureRegion('city'); o.rank2 = scaledRank('plating');
state.talents = {}; o.none = scaledRank('plating');
configureRegion('chronospire'); state.talents = { retainCore: 1, plating: 5 }; state.relics = ['mossweavePants']; ensureGear(); state.gear.pants = 'mossweavePants'; o.gear = scaledRank('plating');
o.desc = TALENT_BRANCHES.resolve.nodes.find(n => n.id === 'plating').desc; o.enemy = ARMOR_BY_WORLD;
return JSON.stringify(o); })()`));
assert.deepStrictEqual(r.full, { city: 5, elaris: 8, sky: 9, wilds: 11, vespera: 10, chronospire: 13 }, 'full Plating grows with the world (' + JSON.stringify(r.full) + ')');
assert.strictEqual(r.rank2, 2, 'rank 2 is 2 Armor in Neon Aftermath'); assert.strictEqual(r.none, 0, 'no Plating, no Armor');
assert.strictEqual(r.gear, Math.round((5 + 2) * 2.6), 'gear Armor scales too');
assert(/growing with each world/.test(r.desc), 'the talent says so');
assert(r.enemy.chronospire[1] >= 10 && r.enemy.elaris[0] >= 2, 'enemy Armor is roughly doubled');
console.log('armor-scale ok');
