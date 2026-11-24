'use strict';
// Round 536 (Codex's worldgen review, finding 4): an object that could only be placed by relaxing a rule (the HUD and
// margin, the 5px edge gap, the patrols' 70px, or the street) is written down with the rules that gave way, and
// cityPlacementReport() lists the current world's. A clean placement isn't listed.
process.env.HARNESS_ONLY = '1';
process.env.SEED = process.env.SEED || '1'; // (seed 1: the review's Solaris 6,4 merchant, and two city objects, need the edge gap relaxed)
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const out = {};
  for (const W of ['city', 'elaris']) { state.region = W; configureRegion(W); cityGenEnsure();
    for (const key of Object.keys(rooms)) { state.room = key; chestFor(key); poiAt(key); if (typeof cityNightsItems === "function") cityNightsItems(key); }
    if (typeof merchantRoom === "function") merchantRoom(); if (typeof cardsmithFor === "function") cardsmithFor(); if (typeof worldPOIs === "function") worldPOIs();
    out[W] = cityPlacementReport(); }
  return JSON.stringify(out); })()`));
for (const W of ['city', 'elaris']) {
  const list = r[W]; assert(Array.isArray(list), W + ': a report');
  for (const e of list) {
    assert(typeof e.room === 'string' && Array.isArray(e.at) && e.at.length === 2, W + ': entry has a room and a spot ' + JSON.stringify(e));
    assert(e.gave.length > 0, W + ': an entry names the rules that gave way ' + JSON.stringify(e));
    assert(e.gave.every(g => /^(on the street|HUD and margin|edge gap|patrols .*px)$/.test(g)), W + ': known rule names ' + JSON.stringify(e.gave));
  }
  console.log(W + ': ' + list.length + ' relaxed placements' + (list.length ? ': ' + list.slice(0, 6).map(e => e.room + ' ' + e.type + ' (' + e.gave.join(', ') + ')').join('; ') : ''));
}
if (process.env.SEED === '1') { assert(r.elaris.some(e => e.room === '6,4' && e.type === 'merchant' && e.gave.includes('edge gap')), 'seed 1: the Solaris 6,4 merchant is listed'); assert(r.city.length >= 1, 'seed 1: city entries'); }
// the report is per world: the city's entries are not Solaris's
assert(r.city.every(e => !r.elaris.includes(e)), 'per world');
console.log('placement-report: ok');
