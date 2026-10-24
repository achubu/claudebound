'use strict';
// Round 258: Neon Aftermath's Tunnel Borehound walks (four of the owner's eight right-facing frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('burrower'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/tunnel-borehound.png?v=' + r.version), 'the Tunnel Borehound uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/tunnel-borehound.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('tunnel-borehound ok');
