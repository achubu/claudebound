'use strict';
// Round 300: the Sky Isles' Gale Harpy flies (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('skyHarpy'), version: SPRITE_VERSION })`));
assert(r.html.includes('sky/gale-harpy.png?v=' + r.version), 'the Gale Harpy uses its flight sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/sky/gale-harpy.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/sky/src/gale-harpy-flight8.png'), 'the eight-frame source is kept');
console.log('gale-harpy ok');
