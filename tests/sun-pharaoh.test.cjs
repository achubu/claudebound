'use strict';
// Round 280: Solaris's final boss, the Sun Pharaoh, walks (four of the owner's eight frames).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('bloomTyrant'), version: SPRITE_VERSION })`));
assert(r.html.includes('elaris/sun-pharaoh.png?v=' + r.version) && r.html.includes('--wildlife-cycle:.8s'), 'the Sun Pharaoh uses its walk sheet at 0.8s');
const b = fs.readFileSync('assets/monsters/elaris/sun-pharaoh.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('sun-pharaoh ok');
