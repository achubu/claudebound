'use strict';
// Round 301: the Sky Isles' Thunderhorn Ram walks (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('skyRam'), version: SPRITE_VERSION })`));
assert(r.html.includes('sky/thunderhorn-ram.png?v=' + r.version), 'the Thunderhorn Ram uses its walk sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/sky/thunderhorn-ram.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/sky/src/thunderhorn-ram-walk8.png'), 'the eight-frame source is kept');
console.log('thunderhorn-ram ok');
