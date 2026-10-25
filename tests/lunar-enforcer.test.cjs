'use strict';
// Round 268: Neon Aftermath's mini-boss, the Lunar Enforcer, glides (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('moonKnight'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/lunar-enforcer.png?v=' + r.version), 'the Lunar Enforcer uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/lunar-enforcer.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('lunar-enforcer ok');
