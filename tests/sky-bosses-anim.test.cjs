'use strict';
// Round 302: the Sky Isles' Stormbell Warden walks, the Featherfall Matriarch and the Zenith Roc fly (four of the owner's eight frames each).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, html: { stormbellWarden: monsterArt('stormbellWarden'), featherMatriarch: monsterArt('featherMatriarch'), zenithRoc: monsterArt('zenithRoc') } })`));
for (const [id, sheet, src] of [['stormbellWarden', 'stormbell-warden', 'stormbell-warden-walk8'], ['featherMatriarch', 'featherfall-matriarch', 'featherfall-matriarch-flight8'], ['zenithRoc', 'zenith-roc', 'zenith-roc-flight8']]) {
  assert(r.html[id].includes('sky/' + sheet + '.png?v=' + r.version), id + ' uses its new sheet');
  assert(r.html[id].includes('.8s'), id + ' at the owner timing');
  const b = fs.readFileSync('assets/monsters/sky/' + sheet + '.png');
  assert.strictEqual(b.readUInt32BE(16), 2064, id + ': a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
  assert(fs.existsSync('assets/monsters/sky/src/' + src + '.png'), id + ': the eight-frame source is kept');
}
console.log('sky-bosses-anim ok');
