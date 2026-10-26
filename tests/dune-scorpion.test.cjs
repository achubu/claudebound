'use strict';
// Round 271: Solaris's Dune Scorpion scuttles (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('blightAntler'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('elaris/dune-scorpion.png?v=' + r.version), 'the Dune Scorpion uses its walk sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/elaris/dune-scorpion.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('dune-scorpion ok');
