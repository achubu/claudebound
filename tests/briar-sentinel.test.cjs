'use strict';
// Round 234: the Briar Sentinel is animated from the owner's sheets: it stands, raises its shield when
// hit and slashes when it attacks in battle, and walks on the map. Borrowed art brings the poses along.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify({ html: monsterArt('vineguard'), arc: monsterArt('arcSentinel'), sentry: !!posesOf('chronoSentry'),
  poses: posesOf('vineguard'), revenant: posesOf('sunRevenant'), revenantHtml: monsterArt('sunRevenant') })`));
assert(r.html.includes('pose-sprite') && r.html.includes('has-walk'), 'the Briar Sentinel has poses and a walk');
assert(r.html.includes('city/briar-sentinel.png') && r.html.includes('city/briar-sentinel-walk.png'), 'it uses the new sheets');
assert(r.html.includes('--pose-attack:66.666667%') && r.html.includes('--pose-hurt:33.333333%'), 'slash is frame 3, shield-up frame 2');
assert(r.arc.includes('pose-sprite') && r.arc.includes('Arc Sentinel') && r.sentry, 'enemies borrowing its art animate too');
assert.deepStrictEqual(r.revenant, { attack: 1, hurt: 3, walk: 'elaris/sun-revenant-walk' }, 'the Revenant keeps its poses');
assert(r.revenantHtml.includes('sun-revenant-walk.png') && r.revenantHtml.includes('--pose-attack:33.333333%'), 'and its walk');
for (const f of ['assets/monsters/city/briar-sentinel.png', 'assets/monsters/city/briar-sentinel-walk.png']) {
  const b = fs.readFileSync(f); assert.strictEqual(b.readUInt32BE(16), 2064, f + ' is a 4-frame sheet'); assert.strictEqual(b.readUInt32BE(20), 688);
}
console.log('briar-sentinel ok');
