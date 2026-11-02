'use strict';
// Round 305: Vespera's Static Fox has its own sheet (four of the owner's eight walking frames), untinted.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, fox: monsterArt('vespFox'), hound: monsterArt('chronoHound') })`));
assert(r.fox.includes('vespera/static-fox.png?v=' + r.version) && r.fox.includes('.8s'), 'the Static Fox uses its own walk sheet at the owner timing');
assert(!/hue-rotate/.test(r.fox), 'drawn in its own colours, not the Vespera tint');
assert(r.hound.includes('cinder-fox.png'), 'Chronospire\'s Gearhound still borrows the Cinder Fox');
const b = fs.readFileSync('assets/monsters/vespera/static-fox.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/static-fox-walk8.png'), 'the eight-frame source is kept');
console.log('static-fox ok');
