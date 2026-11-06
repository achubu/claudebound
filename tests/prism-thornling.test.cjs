'use strict';
// Round 306: Vespera's Prism Thornling has its own sheet (four of the owner's eight walking frames), untinted.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, thorn: monsterArt('vespThorn'), city: monsterArt('thornling') })`));
assert(r.thorn.includes('vespera/prism-thornling.png?v=' + r.version) && r.thorn.includes('.8s'), 'the Prism Thornling uses its own walk sheet at the owner timing');
assert(!/hue-rotate/.test(r.thorn), 'drawn in its own colours, not the Vespera tint');
assert(r.city.includes('city/circuit-thornling-v3.png'), 'the Circuit Thornling keeps its own sheet');
const b = fs.readFileSync('assets/monsters/vespera/prism-thornling.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/prism-thornling-walk8.png'), 'the eight-frame source is kept');
console.log('prism-thornling ok');
