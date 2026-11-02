'use strict';
// Round 304: Elaris's Blight Antler walks and Storm Moth flies (four of the owner's eight frames each). Vespera and
// Chronospire reuse both sheets, recolored.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, stag: monsterArt('elarisAntler'), moth: monsterArt('elarisMoth'), vStag: monsterArt('vespStag'), vMoth: monsterArt('vespMoth') })`));
for (const [k, sheet, src] of [['stag', 'blight-antler', 'blight-antler-walk8'], ['moth', 'storm-moth', 'storm-moth-flight8']]) {
  assert(r[k].includes('elaris/' + sheet + '.png?v=' + r.version) && r[k].includes('.8s'), sheet + ' uses its new sheet at the owner timing');
  const b = fs.readFileSync('assets/monsters/elaris/' + sheet + '.png');
  assert.strictEqual(b.readUInt32BE(16), 2064, sheet + ': a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
  assert(fs.existsSync('assets/monsters/elaris/src/' + src + '.png'), sheet + ': the eight-frame source is kept');
}
assert(r.vStag.includes('blight-antler.png') && r.vMoth.includes('storm-moth.png'), 'Vespera still borrows both sheets');
console.log('forest-anim ok');
