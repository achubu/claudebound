'use strict';
// Round 269: Solaris's Solar Scarab walks (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('cinderFox'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('elaris/solar-scarab.png?v=' + r.version), 'the Solar Scarab uses its walk sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/elaris/solar-scarab.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('solar-scarab ok');
