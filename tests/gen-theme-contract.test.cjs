'use strict';
// Round 544 (owner: "lets do whatever will yield us consistent results across worlds when using our procedural algorithm"):
// every world on the generator (GEN_THEMES with topdown, today the city and Solaris; the Sky Isles next,
// tools/art-refresh/sky-gen-prompts.md) is held to one contract, so a new world can't arrive with missing or mismatched art:
//  1. its room map hooks: exits, world, keys, startKey, bossRooms; four quarters, each with its own building pictures;
//  2. every picture its art tables name is on disk;
//  3. every building, ruin and park picture has a size in CITY_BUILDING_PX whose proportions are the picture's (never
//     distort art: an owner rule) within 3%;
//  4. every landmark's aspect is its picture's within 1%, and its landmarkPx is the picture's width (Round 541: never drawn
//     larger than its picture);
//  5. every cargo piece has a size (cargoSize) and every clutter piece a height (clutterH).
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const ROOT = path.join(__dirname, '..');
const pngSize = f => { // webp (VP8/VP8L/VP8X) or png width and height, read from the header
  const b = fs.readFileSync(f);
  if (b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw Error('unknown image ' + f); };
const themes = JSON.parse(run(`(() => { newGame(); const out = {};
  for (const id of Object.keys(GEN_THEMES).filter(id => GEN_THEMES[id].topdown)) out[id] = genWith(id, () => { const T = GEN;
    const files = []; for (const [slot, names] of Object.entries(CITY_TD_ART)) for (const n of names || []) files.push({ slot, n, path: T.art + cityArtPath(slot, n) + '.webp' });
    const pics = []; for (const [slot, names] of Object.entries(CITY_TD_ART)) if (/^(building|ruinpic|parkpic)-/.test(slot)) for (const n of names || []) pics.push({ slot, n, px: CITY_BUILDING_PX[n] || null });
    const lm = (CITY_TD_ART.landmark || []).map(n => ({ n, asp: CITY_LANDMARK_ASPECT[n] || null, px: T.landmarkPx ? T.landmarkPx[n] || null : null, path: T.art + cityArtPath('landmark', n) + '.webp' }));
    const cargo = (CITY_TD_ART.cargo || []).map(n => ({ n, size: CITY_CARGO_SIZE[n] || null })), clutter = (CITY_TD_ART.clutter || []).map(n => ({ n, h: CITY_CLUTTER_H[n] || null }));
    const names = T.districtNames || Object.keys(CITY_DISTRICT_ART);
    return { hooks: ['exits', 'world', 'keys', 'bossRooms'].filter(h => typeof T[h] !== 'function'), startKey: T.startKey || null, rooms: typeof T.keys === 'function' ? T.keys().length : 0,
      districts: names, districtSlots: names.filter(d => !(CITY_TD_ART['building-' + d] || []).length) /* (Round 501: buildings are whole pictures, by quarter) */, files, pics, lm, cargo, clutter }; });
  return JSON.stringify(out); })()`));
let checked = 0;
for (const [id, t] of Object.entries(themes)) {
  assert.deepStrictEqual(t.hooks, [], id + ': room map hooks');
  assert(t.startKey && t.rooms >= 40, id + ': a start room and its rooms (' + t.rooms + ')');
  assert.strictEqual(t.districts.length, 4, id + ': four quarters');
  assert.deepStrictEqual(t.districtSlots, [], id + ': every quarter has walls, roofs and shopfronts');
  const missing = t.files.filter(f => !fs.existsSync(path.join(ROOT, f.path))).map(f => f.slot + '/' + f.n);
  assert.deepStrictEqual(missing, [], id + ': every named picture is on disk');
  const sized = t.pics.filter(p => !p.px).map(p => p.slot + '/' + p.n);
  assert.deepStrictEqual(sized, [], id + ': every building, ruin and park picture has a size');
  const skew = t.pics.filter(p => { const f = t.files.find(q => q.slot === p.slot && q.n === p.n), [w, h] = pngSize(path.join(ROOT, f.path)); return Math.abs((p.px[0] / p.px[1]) / (w / h) - 1) > 0.03; }).map(p => p.slot + '/' + p.n);
  assert.deepStrictEqual(skew, [], id + ': building sizes keep their pictures\' proportions');
  for (const l of t.lm) { const [w, h] = pngSize(path.join(ROOT, l.path));
    assert(l.asp && Math.abs(l.asp / (w / h) - 1) < 0.01, id + ': landmark ' + l.n + ' aspect ' + l.asp + ' is its picture\'s ' + (w / h).toFixed(4));
    assert.strictEqual(l.px, w, id + ': landmark ' + l.n + ' has its picture\'s width in landmarkPx'); }
  assert.deepStrictEqual(t.cargo.filter(c => !c.size).map(c => c.n), [], id + ': every cargo piece has a size');
  assert.deepStrictEqual(t.clutter.filter(c => !c.h).map(c => c.n), [], id + ': every clutter piece has a height');
  checked++; console.log(id + ': ' + t.rooms + ' rooms, ' + t.files.length + ' pictures, ' + t.pics.length + ' buildings/ruins/parks, ' + t.lm.length + ' landmarks: ok');
}
assert(checked >= 2, 'the city and Solaris are checked');
console.log('gen-theme-contract ok');
