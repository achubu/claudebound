'use strict';
// Round 255: Neon Aftermath's Circuit Thornling scuttles (four of the owner's eight walk frames), and
// Vespera's Prism Thornling, which borrows its art, animates too.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('thornling'), prism: monsterArt('vespThorn'), version: SPRITE_VERSION })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/circuit-thornling.png?v=' + r.version), 'the Circuit Thornling uses its animated sheet');
assert(r.prism.includes('city/circuit-thornling.png'), 'the Prism Thornling borrows it');
const b = fs.readFileSync('assets/monsters/city/circuit-thornling.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
console.log('circuit-thornling ok');
