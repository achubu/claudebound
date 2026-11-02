'use strict';
// Round 303: Elaris's Cinder Fox walks (four of the owner's eight frames); Vespera's Static Fox and Chronospire's
// Gearhound reuse the sheet, recolored.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, fox: monsterArt('elarisFox'), vesp: monsterArt('vespFox') })`));
assert(r.fox.includes('elaris/cinder-fox.png?v=' + r.version) && r.fox.includes('.8s'), 'the Cinder Fox uses its walk sheet at the owner timing');
assert(r.vesp.includes('cinder-fox.png'), 'the Static Fox still borrows it');
const b = fs.readFileSync('assets/monsters/elaris/cinder-fox.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/elaris/src/cinder-fox-walk8.png'), 'the eight-frame source is kept');
console.log('cinder-fox ok');
