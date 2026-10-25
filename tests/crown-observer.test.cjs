'use strict';
// Round 266: Neon Aftermath's Crown Observer hovers (four of the owner's eight frames), and Vespera's
// enemies wear 10% more Armor.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('crownEye'), version: SPRITE_VERSION,
  vesp: [worldArmor({}, 'vespera', 0), worldArmor({}, 'vespera', 1), worldArmor({ boss: true }, 'vespera')],
  wilds: [worldArmor({}, 'wilds', 0), worldArmor({}, 'wilds', 1)] })`));
assert(r.html.includes('wildlife-sprite') && r.html.includes('city/crown-observer.png?v=' + r.version), 'the Crown Observer uses its animated sheet');
const b = fs.readFileSync('assets/monsters/city/crown-observer.png');
assert.strictEqual(b.readUInt32BE(16), 2064, 'a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
assert.deepStrictEqual(r.vesp, [6, 9, 12], 'Vespera Armor 5-8 (bosses 11) +10%, rounded');
assert.deepStrictEqual(r.wilds, [4, 7], 'other worlds unchanged');
console.log('crown-observer ok');
