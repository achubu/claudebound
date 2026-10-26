'use strict';
// Round 272: Solaris's Dust Devil spins (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('stormMoth'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('elaris/dust-devil.png?v=' + r.version), 'the Dust Devil uses its spin sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/elaris/dust-devil.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('dust-devil ok');
