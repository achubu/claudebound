'use strict';
// Round 252: the Ember Jackal is animated from the owner's sheets: it stands, rears back when hit and
// lunges with a raised paw when it attacks in battle, and walks on the map.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('emberling'), poses: posesOf('emberling'), version: SPRITE_VERSION })`));
assert(r.html.includes('pose-sprite') && r.html.includes('has-walk') && r.html.includes('Ember Jackal'), 'the Ember Jackal has poses and a walk');
assert(r.html.includes('city/ember-jackal.png?v=' + r.version) && r.html.includes('city/ember-jackal-walk.png'), 'it uses the new sheets');
assert.deepStrictEqual(r.poses, { attack: 2, hurt: 1, walk: 'city/ember-jackal-walk' }, 'lunge is frame 3, rearing frame 2');
for (const f of ['assets/monsters/city/ember-jackal.png', 'assets/monsters/city/ember-jackal-walk.png']) {
  const b = fs.readFileSync(f); assert.strictEqual(b.readUInt32BE(16), 2064, f + ' is a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
}
console.log('ember-jackal ok');
