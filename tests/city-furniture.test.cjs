'use strict';
// Round 424: street lights, traffic lights, traffic signs, park rubble and ruins. With no art nothing is placed (nothing
// drawn, nothing blocking); with art, every piece stands on open ground (the kerb or sidewalk) (not road, lot, sea, a crossing's centre or an
// object's square), clear of cars and of every other piece, and its post blocks the way.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); state.seed = 77; configureRegion('city'); cityGenEnsure();
  const keys = Object.keys(CITY_ROOMS), seed = chronoSeed(), out = { empty: 0, n: {}, bad: [], ruins: 0, roofs: 0, rubble: 0, blocked: 0 };
  const save = {}; for (const s of ['lamp', 'traffic-light', 'sign-traffic', 'rubble', 'ruin-wall']) save[s] = CITY_TD_ART[s];
  for (const s of Object.keys(save)) CITY_TD_ART[s] = []; // (Round 435: the slots have art now; empty them for this check)
  genWith('city', () => { for (const k of keys) out.empty += cityStreetFurniture(seed, cityGenPlan(k)).length; });
  for (const s of Object.keys(save)) CITY_TD_ART[s] = ['test'];
  try { genWith('city', () => { const wl = genWorld(seed);
    for (const l of wl.lotsPx) if (l.use === 'roof') { out.roofs++; if (cityIsRuin(l)) out.ruins++; }
    for (const k of keys) { const p = cityGenPlan(k), f = cityStreetFurniture(seed, p), cars = cityParkedCars(seed, p), [wx, wy] = GEN.world(k), ox = wx * 800, oy = wy * 500, b = cityBlockers(seed, k, p);
      for (const x of f) { out.n[x.slot] = (out.n[x.slot] || 0) + 1;
        const onRoad = !!p.floor[Math.floor(x.y / FG_CELL) * FG_COLS + Math.floor(x.x / FG_CELL)], onLot = wl.lotsPx.some(l => l.use !== 'plaza' && x.x + ox > l.r[0] + 4 && x.x + ox < l.r[2] - 4 && x.y + oy > l.r[1] + 4 && x.y + oy < l.r[3] - 4); // (not on a building's own box)
        const near = f.some(o => o !== x && Math.hypot(o.x - x.x, o.y - x.y) < 60), byCar = cars.some(c => Math.abs(x.x - c.px) < 40 && Math.abs(x.y - c.py) < 30), bySquare = (p.plazas || []).some(([qx, qy]) => Math.hypot(x.x - qx, x.y - qy) < 80);
        if (onRoad || onLot || near || byCar || bySquare) out.bad.push([k, x.slot, x.x | 0, x.y | 0, { onRoad, onLot, near, byCar, bySquare }]);
        if (b.circles.some(c => c[0] === x.x && c[1] === x.y)) out.blocked++; }
      for (const l of wl.lotsPx) if (l.use === 'park') { const rr = [l.r[0] - ox + 4, l.r[1] - oy + 4, l.r[2] - ox - 4, l.r[3] - oy - 4]; if (rr[2] < 0 || rr[0] > 800 || rr[3] < 0 || rr[1] > 500) continue; out.rubble += cityParkRubble(seed, l, rr, cityParkTrees(chronoRng(seed + ':roof:' + l.seed), rr, rr[2] - rr[0], rr[3] - rr[1])).length; } } });
  } finally { for (const s of Object.keys(save)) CITY_TD_ART[s] = save[s]; }
  return JSON.stringify(out); })()`));
assert.strictEqual(r.empty, 0, 'with no art, no street furniture is placed');
assert.deepStrictEqual(r.bad, [], 'every piece stands on open ground (the kerb or sidewalk), clear of cars, squares and each other');
assert(r.n.lamp > 60, 'lamps line the main roads: ' + JSON.stringify(r.n));
assert(r.n['traffic-light'] > 4, 'traffic lights at the crossings: ' + JSON.stringify(r.n));
assert(r.n['sign-traffic'] > 4, 'traffic signs at alley mouths: ' + JSON.stringify(r.n));
const total = Object.values(r.n).reduce((a, b) => a + b, 0);
assert.strictEqual(r.blocked, total, 'every post blocks the way');
assert(r.ruins > r.roofs * 0.07 && r.ruins < r.roofs * 0.2, 'about one building in eight is a ruin: ' + r.ruins + ' of ' + r.roofs);
assert(r.rubble > 5, 'rubble lies in the parks: ' + r.rubble);
console.log('PASS: ' + JSON.stringify(r.n) + ', ' + r.ruins + ' ruins of ' + r.roofs + ' buildings, ' + r.rubble + ' pieces of park rubble; none without art.');
