'use strict';
// Round 420: every surface of the top-down city (CITY_SURFACES in assets/chrono-gen.js) is accounted for: its art exists in
// its folder, every picture in city-gen/surfaces/ and city-gen/props/ is listed, and the walk rules hold in the walk mask.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { run } = require('./expansion.test.cjs');
const CITY = path.join(__dirname, '..', 'assets', 'environment', 'city-gen');
const r = JSON.parse(run(`(() => { newGame(); state.seed = 77; configureRegion('city'); cityGenEnsure();
  const t = GEN_THEMES.city, out = { surfaces: CITY_SURFACES.map(x => ({ key: x.key, walk: x.walk, slot: x.slot || null, base: (x.base || []).map(n => t.tex[n] || n), slotArt: x.slot ? CITY_TD_ART[x.slot] : null, rule: x.rule, label: x.label })),
    props: Object.fromEntries(Object.entries(CITY_TD_ART).filter(([s]) => !CITY_SURFACE_SLOTS.has(s))), paths: cityTdArtNames() };
  // walk rules, in the rooms of the city: a building lot's middle and the sea are closed; the street at a crossing is open
  const wl = genWith('city', () => genWorld(chronoSeed())); let roofOpen = 0, roofs = 0, seaOpen = 0, seas = 0, hubs = 0, hubOpen = 0;
  for (const l of wl.lotsPx) { if (l.use !== 'roof') continue; const cx = (l.r[0] + l.r[2]) / 2, cy = (l.r[1] + l.r[3]) / 2; roofs++; if (cityGenWalk(cx, cy - 22)) roofOpen++; }
  // (the terrain is read inside genWith('city'): it asks the active theme where the water is)
  for (const k of Object.keys(CITY_ROOMS)) genWith('city', () => { const p = cityGenPlan(k), tr = chronoTerrain(chronoSeed(), k);
    hubs++; if (walkable(k, p.hub[0], p.hub[1])) hubOpen++;
    for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (tr.chasm(x, y) && !p.floor[(y * 2 + 1) * FG_COLS + x * 2 + 1]) { seas++; if (cityRoomWalk(k, x * 50 + 25, y * 50 + 25 - 22)) seaOpen++; } });
  out.walk = { roofs, roofOpen, seas, seaOpen, hubs, hubOpen };
  return JSON.stringify(out); })()`));
const keys = r.surfaces.map(s => s.key);
for (const k of ['sea', 'waterfront', 'sidewalk', 'road', 'curb', 'lot', 'park', 'roof', 'wall', 'shop']) assert(keys.includes(k), 'surface ' + k + ' is in the registry');
const listed = new Set();
for (const s of r.surfaces) {
  assert(s.label && s.rule, s.key + ' has a label and a rule');
  assert(s.base.length || (s.slotArt && s.slotArt.length), s.key + ' has art');
  for (const b of s.base) { assert(b.startsWith('surfaces/' + s.key + '/'), s.key + ': ' + b + ' is in its own folder'); assert(fs.existsSync(path.join(CITY, b + '.webp')), b + ' exists'); listed.add(b + '.webp'); }
  for (const n of s.slotArt || []) { const p = 'surfaces/' + s.slot + '/' + n + '.webp'; assert(fs.existsSync(path.join(CITY, p)), p + ' exists'); listed.add(p); }
}
for (const [slot, ns] of Object.entries(r.props)) for (const n of ns) { const p = 'props/' + slot + '/' + n + '.webp'; assert(fs.existsSync(path.join(CITY, p)), p + ' exists'); listed.add(p); }
const onDisk = [];
for (const top of ['surfaces', 'props']) for (const d of fs.readdirSync(path.join(CITY, top))) for (const f of fs.readdirSync(path.join(CITY, top, d))) onDisk.push(top + '/' + d + '/' + f);
const stray = onDisk.filter(f => !listed.has(f));
assert.deepStrictEqual(stray, [], 'every picture in surfaces/ and props/ is listed');
assert.deepStrictEqual(fs.readdirSync(CITY).filter(f => f.endsWith('.webp')), [], 'no loose pictures at the top of city-gen/ (old 3/4 art is in legacy/)');
const w = r.walk;
assert(w.roofs > 150 && w.roofOpen === 0, 'no building can be walked on: ' + JSON.stringify(w));
assert(w.seas > 50 && w.seaOpen === 0, 'the sea cannot be walked on: ' + JSON.stringify(w));
assert.strictEqual(w.hubOpen, w.hubs, 'every room\'s crossing is open');
console.log('PASS: ' + r.surfaces.length + ' city surfaces, ' + onDisk.length + ' pictures accounted for; walk rules hold (' + w.roofs + ' buildings, ' + w.seas + ' sea cells).');
