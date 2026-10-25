'use strict';
// Round 264: Neon Aftermath's Phase Shade glides (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('shade'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/phase-shade.png?v=' + r.version), 'the Phase Shade uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/phase-shade.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('phase-shade ok');
