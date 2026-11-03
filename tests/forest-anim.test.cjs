'use strict';
// Round 304: Elaris's Blight Antler walks and Storm Moth flies (four of the owner's eight frames each). Vespera and
// Chronospire reuse both sheets, recolored.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ version: SPRITE_VERSION, stag: monsterArt('elarisAntler'), moth: monsterArt('elarisMoth'), vStag: monsterArt('vespStag'), vMoth: monsterArt('vespMoth'), vHeron: monsterArt('vespHeron'), vShade: monsterArt('vespShade'), vWisp: monsterArt('vespWisp'), vMauler: monsterArt('vespMauler') })`));
for (const [k, sheet, src] of [['stag', 'blight-antler', 'blight-antler-walk8'], ['moth', 'storm-moth', 'storm-moth-flight8']]) {
  assert(r[k].includes('elaris/' + sheet + '.png?v=' + r.version) && r[k].includes('.8s'), sheet + ' uses its new sheet at the owner timing');
  const b = fs.readFileSync('assets/monsters/elaris/' + sheet + '.png');
  assert.strictEqual(b.readUInt32BE(16), 2064, sheet + ': a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
  assert(fs.existsSync('assets/monsters/elaris/src/' + src + '.png'), sheet + ': the eight-frame source is kept');
}
assert(r.vStag.includes('vespera/rimeglass-stag.png?v=' + r.version) && r.vStag.includes('.8s'), 'Round 335: Vespera\'s Rimeglass Stag has its own sheet');
const rs = fs.readFileSync('assets/monsters/vespera/rimeglass-stag.png'); assert.strictEqual(rs.readUInt32BE(16), 2064); assert.strictEqual(rs.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/rimeglass-stag-walk8.png'));
assert(r.vMoth.includes('vespera/tempest-moth.png?v=' + r.version) && r.vMoth.includes('.8s'), 'Round 332: Vespera\'s Tempest Moth has its own sheet');
const tm = fs.readFileSync('assets/monsters/vespera/tempest-moth.png'); assert.strictEqual(tm.readUInt32BE(16), 2064); assert.strictEqual(tm.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/tempest-moth-flight8.png'), 'the eight-frame source is kept');
assert(r.vHeron.includes('vespera/brinewing-heron.png?v=' + r.version) && r.vHeron.includes('.8s'), 'Round 333: Vespera\'s Brinewing Heron has its own sheet');
const bh = fs.readFileSync('assets/monsters/vespera/brinewing-heron.png'); assert.strictEqual(bh.readUInt32BE(16), 2064); assert.strictEqual(bh.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/brinewing-heron-walk8.png'));
assert(r.vShade.includes('vespera/ion-shade.png?v=' + r.version) && r.vShade.includes('.8s'), 'Round 334: Vespera\'s Ion Shade has its own sheet');
const is = fs.readFileSync('assets/monsters/vespera/ion-shade.png'); assert.strictEqual(is.readUInt32BE(16), 2064); assert.strictEqual(is.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/ion-shade-glide8.png'));
assert(r.vWisp.includes('vespera/arc-wisp.png?v=' + r.version) && r.vWisp.includes('.8s'), 'Round 336: Vespera\'s Arc Wisp has its own sheet');
const aw = fs.readFileSync('assets/monsters/vespera/arc-wisp.png'); assert.strictEqual(aw.readUInt32BE(16), 2064); assert.strictEqual(aw.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/arc-wisp-glide8.png'));
assert(r.vMauler.includes('vespera/thunder-mauler.png?v=' + r.version) && r.vMauler.includes('.8s'), 'Round 338: Vespera\'s Thunder Mauler has its own sheet');
const tmr = fs.readFileSync('assets/monsters/vespera/thunder-mauler.png'); assert.strictEqual(tmr.readUInt32BE(16), 2064); assert.strictEqual(tmr.readUInt32BE(20), 688);
assert(fs.existsSync('assets/monsters/vespera/src/thunder-mauler-walk8.png'));
console.log('forest-anim ok');
