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
// Round 486: the generated Solaris is the one played. Its rooms walk on the generated mask, have no diagonal exits, every
// door's inward spot can be stood on, and the start room's hub is walkable.
{ const p = JSON.parse(run(`(() => { newGame(); state.seed = 9; state.region = 'elaris'; configureRegion('elaris'); cityGenEnsure();
    const keys = Object.keys(rooms), out = { live: genLive('elaris'), theme: genTheme(), diag: keys.filter(k => Object.keys(rooms[k].exits).some(d => d.length > 1)), badDoors: [] };
    for (const k of keys) for (const d of ['n', 's', 'e', 'w']) { if (!rooms[k].exits[d]) continue; const o = organicDoor(k, d); if (!o || !walkable(k, o.inward.x, o.inward.y)) out.badDoors.push(k + d); }
    const h = cityGenPlan('0,5').hub; out.hub = walkable('0,5', h[0], h[1]); out.mask = keys.every(k => cityGenPlan(k)); return JSON.stringify(out); })()`));
  assert(p.live && p.theme === 'solaris', 'Solaris plays on the generator');
  assert.deepStrictEqual(p.diag, [], 'no diagonal exits in the generated Solaris');
  assert.deepStrictEqual(p.badDoors, [], 'every door in the generated Solaris can be stood in');
  assert(p.hub && p.mask, 'the start room\'s hub is walkable; every room planned');
  console.log('PASS: Solaris is played on the generator (doors, walk mask, no diagonals).'); }
// Round 489 (owner: "missing edges and cut off textures"): in both generated worlds every tree's whole canopy (1.3 x its radius)
// stands inside its park and clear of the rim, so the park's outline never slices it; and a room draws its neighbours' street
// furniture that reaches into it (a lamp's light, a post over the edge), so nothing stops at a seam.
{ const q = JSON.parse(run(`(() => { const out = {};
    for (const [region, theme] of [['city', 'city'], ['elaris', 'solaris']]) { newGame(); state.region = region; configureRegion(region); cityGenEnsure();
      out[theme] = genWith(theme, () => { const wl = genWorld(chronoSeed()); let trees = 0, bad = [];
        for (const l of wl.lotsPx) { if (l.use !== 'park') continue; const bx = [l.r[0] + 4, l.r[1] + 4, l.r[2] - 4, l.r[3] - 4];
          for (const [x, y, r] of cityParkTrees(chronoRng('t:' + l.seed), bx, bx[2] - bx[0], bx[3] - bx[1])) { trees++; const m = 1.3 * r + CITY_TREE_INSET - 0.01;
            if (x - m < bx[0] || x + m > bx[2] || y - m < bx[1] || y + m > bx[3]) bad.push(l.seed); } }
        let foreign = 0; for (const k of Object.keys(rooms)) foreign += cityFurnitureNear(chronoSeed(), cityGenPlan(k)).filter(f => f.foreign).length;
        return { trees, bad: bad.length, foreign }; }); }
    return JSON.stringify(out); })()`));
  for (const [t, o] of Object.entries(q)) { assert(o.trees > 20, t + ': parks have trees (' + o.trees + ')'); assert.strictEqual(o.bad, 0, t + ': every tree stands wholly inside its park'); }
  assert(q.city.foreign > 0, 'city rooms draw their neighbours\' lamps and posts that reach into them');
  console.log('PASS: trees inside their parks (city ' + q.city.trees + ', Solaris ' + q.solaris.trees + '); neighbours\' furniture drawn (' + q.city.foreign + ' in the city).'); }
