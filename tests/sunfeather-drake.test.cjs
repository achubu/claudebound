'use strict';
// Round 282: the Sky Isles' Sunfeather Drake walks (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { configureRegion('sky'); return JSON.stringify({ html: monsterArt('skyDrake'), version: SPRITE_VERSION }); })()`));
assert(r.html.includes('sky/sunfeather-drake.png?v=' + r.version), 'the Sunfeather Drake uses its walk sheet');
const b = fs.readFileSync('assets/monsters/sky/sunfeather-drake.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('sunfeather-drake ok');
