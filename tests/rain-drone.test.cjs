'use strict';
// Round 299: the Sky Isles' Rain Drone hovers (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('skyWisp'), version: SPRITE_VERSION })`));
assert(r.html.includes('sky/rain-drone.png?v=' + r.version), 'the Rain Drone uses its hover sheet');
assert(r.html.includes('.8s'), 'at the owner timing');
const b = fs.readFileSync('assets/monsters/sky/rain-drone.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/sky/src/rain-drone-hover8.png'), 'the eight-frame source is kept');
console.log('rain-drone ok');
