'use strict';
// Round 273: Neon Aftermath's Data Wisp orbits (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('cryptWisp'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/data-wisp.png?v=' + r.version), 'the Data Wisp uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/data-wisp.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('data-wisp ok');
