'use strict';
// Round 303: Elaris's Cinder Fox walks (four of the owner's eight frames); Chronospire's Gearhound reuses the sheet,
// recolored (Vespera's Static Fox has had its own since Round 305).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, fox: monsterArt('elarisFox'), hound: monsterArt('chronoHound') })`));
assert(r.fox.includes('elaris/cinder-fox.png?v=' + r.version) && r.fox.includes('.8s'), 'the Cinder Fox uses its walk sheet at the owner timing');
assert(r.hound.includes('cinder-fox.png'), 'the Gearhound still borrows it');
const b = fs.readFileSync('assets/monsters/elaris/cinder-fox.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/elaris/src/cinder-fox-walk8.png'), 'the eight-frame source is kept');
console.log('cinder-fox ok');
