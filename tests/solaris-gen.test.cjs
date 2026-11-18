'use strict';
// Round 483: Solaris on the city's generator (GEN_THEMES.solaris; a preview, not yet played). Every room of Solaris's map is
// planned, every picture the theme names exists in assets/environment/solaris-gen/, the theme's own art tables are read
// only while it is in use (the city keeps its own), and the generated Solaris has its monuments, oases and low houses.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { run } = require('./expansion.test.cjs');
const DIR = path.join(__dirname, '..', 'assets', 'environment', 'solaris-gen');
const seeds = [1, 9, 77];
const r = JSON.parse(run(`(() => { newGame(); const out = { seeds: {} };
  out.cityRoof = CITY_TD_ART.roof.slice(); out.cityKit = Object.keys(CITY_ROOF_KIT);
  out.paths = genWith('solaris', () => cityTdArtNames()); out.tex = Object.values(GEN_THEMES.solaris.tex);
  out.solRoof = genWith('solaris', () => CITY_TD_ART.roof.slice()); out.solKit = genWith('solaris', () => Object.keys(CITY_ROOF_KIT));
  out.cityRoofAfter = CITY_TD_ART.roof.slice(); out.roadTex = GEN_THEMES.solaris.tex['road-wet']; out.solLamps = genWith('solaris', () => CITY_HAS('lamp')); // Round 484
  state.seed = 9; out.lampsPlaced = genWith('solaris', () => Object.keys(SOLARIS_LAYOUT).reduce((n, k) => n + cityStreetFurniture('9', genPlan('solaris', k, '9')).filter(f => f.kind === 'lamp').length, 0));
  for (const sd of ${JSON.stringify(seeds)}) { state.seed = sd; const keys = Object.keys(SOLARIS_LAYOUT);
    const o = genWith('solaris', () => { const wl = genWorld(String(sd)), L = wl.lotsPx; let floors = [];
      for (const l of L) if (l.use === 'roof') floors.push(cityLotFloors(l, 3 + (l.seed % 5)).floors);
      return { planned: keys.filter(k => genPlan('solaris', k, String(sd))).length, landmarks: L.filter(l => l.use === 'landmark').map(l => l.landmark), broadW: L.filter(l => l.use === 'landmark' && (CITY_LANDMARK_ASPECT[l.landmark] || 1) >= 1).map(l => cityLandmarkBox(l, [l.r[0] + 4, l.r[1] + 4, l.r[2] - 4, l.r[3] - 4]).w),
        oases: L.filter(l => l.use === 'park' && cityOasisPool(l.r, l.r[2] - l.r[0], l.r[3] - l.r[1])).length, maxFloors: Math.max(...floors), minFloors: Math.min(...floors) }; });
    o.rooms = keys.length; out.seeds[sd] = o; }
  return JSON.stringify(out); })()`));
for (const p of r.paths) assert(fs.existsSync(path.join(DIR, p + '.webp')), 'Solaris art on disk: ' + p);
for (const p of r.tex) assert(fs.existsSync(path.join(DIR, p + '.webp')), 'Solaris texture on disk: ' + p);
assert(!r.cityRoof.some(n => r.solRoof.includes(n)), 'the city and Solaris roofs are separate tables');
assert.deepStrictEqual(r.cityRoof, r.cityRoofAfter, 'the city reads its own art again once Solaris is done');
assert(!r.solLamps && r.lampsPlaced === 0, 'no lamps in the desert (owner, Round 484)');
assert(/sand/.test(r.roadTex), 'Solaris roads are sand (owner, Round 485)');
assert(r.solKit.every(k => r.solRoof.includes(k)), 'Solaris rooftop kit only on its own roofs');
for (const [sd, o] of Object.entries(r.seeds)) {
  assert.strictEqual(o.planned, o.rooms, 'seed ' + sd + ': every Solaris room is planned');
  assert(o.broadW.length && o.broadW.every(w => w >= 200), 'seed ' + sd + ': broad monuments stand at least 200px wide (Round 485): ' + o.broadW.map(Math.round));
  assert(o.landmarks.length >= 6, 'seed ' + sd + ': monuments (' + o.landmarks.join(', ') + ')');
  for (const n of ['pyramid', 'obelisk', 'sphinx']) assert(o.landmarks.includes(n), 'seed ' + sd + ': a ' + n);
  assert(o.oases >= 3, 'seed ' + sd + ': oases with pools (' + o.oases + ')');
  assert(o.maxFloors <= 2 && o.minFloors >= 1, 'seed ' + sd + ': low houses, 1-2 floors');
}
console.log('PASS: Solaris on the generator: ' + Object.entries(r.seeds).map(([s, o]) => 'seed ' + s + ' ' + o.planned + ' rooms, ' + o.landmarks.length + ' monuments, ' + o.oases + ' oases').join('; '));
