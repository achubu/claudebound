'use strict';
// Round 267: Neon Aftermath's Thorn Warden strides (four of the owner's eight side-walk frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('thornWarden'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/thorn-warden.png?v=' + r.version), 'the Thorn Warden uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/thorn-warden.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('thorn-warden ok');
