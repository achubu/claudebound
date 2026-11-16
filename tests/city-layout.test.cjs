'use strict';
// Round 445 (owner: "review our neon aftermath procedural world generation algorithm, debug it, and improve it"). The
// rules of the top-down city's layout, checked on four seeds:
//   - lots never overlap, and stand only on buildable ground (never a street, a sidewalk, the sea, or within 75px of it:
//     the beach and its shoreline strip);
//   - every building has three floors at least and storeys of 42 to 50px (before: a fifth were under half scale);
//   - a building's street side, quarter, wall and roof come from the city's plan (the same in every room it reaches into);
//   - buildings beside or behind each other don't share a wall, where the art allows (under 3% of pairs);
//   - ruins gather in blast zones (8 to 17% of buildings, three quarters of them inside a zone);
//   - vehicles park along east-west streets only; a waypoint room's crossing is no wider than its roads;
//   - little open ground is left bare (under 10% of any room's cells, sidewalks and alleys apart);
//   - Round 447: landmarks (several per city, never the same one within a room's width), street clutter on the sidewalks, and
//     four quarters that are neighbourhoods (three in four buildings share their quarter with those around them);
//   - all ground that can be walked on is joined to the room's streets (no walled-in pockets).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
for (const seed of [77, 4242, 2026, 9]) {
  const r = JSON.parse(run(`(() => { newGame(); state.seed = ${seed}; configureRegion('city'); cityGenEnsure(); const o = genWith('city', () => { const sd = chronoSeed(), wl = genWorld(sd), L = wl.lotsPx, keys = Object.keys(CITY_ROOMS), o = { lots: L.length };
    let ov = 0; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i].r, b = L[j].r; if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) ov++; } o.overlaps = ov;
    let off = 0; for (const l of L) for (let y = l.r[1] / 25; y < l.r[3] / 25; y++) for (let x = l.r[0] / 25; x < l.r[2] / 25; x++) if (wl.cell[y * wl.CW + x] !== 1) off++; o.offGround = off;
    const B = L.filter(l => l.use === 'roof'); o.buildings = B.length;
    o.storeyMin = 99; o.storeyMax = 0; o.floorsMin = 99; for (const l of B) for (const f0 of [3, 5, 8]) { const f = cityLotFloors(l, f0); o.storeyMin = Math.min(o.storeyMin, f.storey); o.storeyMax = Math.max(o.storeyMax, f.storey); o.floorsMin = Math.min(o.floorsMin, f.floors); }
    o.planned = B.every(l => typeof l.south === 'boolean' && GEN.districtNames.includes(l.district) && Number.isInteger(l.wallN) && Number.isInteger(l.roofN));
    let pairs = 0, same = 0; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j], ox = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), oy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]);
      if (!((ox > 0 && oy >= -25) || (oy > 0 && ox >= -25))) continue; pairs++; const sa = cityLotSlots(a), sb = cityLotSlots(b), n = CITY_TD_ART[sa.wall].length; if (sa.wall === sb.wall && n > 1 && a.wallN % n === b.wallN % n) same++; } o.pairs = pairs; o.sameWall = same;
    const ruins = B.filter(cityIsRuin); o.ruins = ruins.length; o.ruinsInZone = ruins.filter(l => l.zone).length;
    o.small = L.filter(l => l.small && l.use === 'roof').length; o.yards = L.filter(cityIsYard).length;
    o.carsAcross = 0; o.cars = 0; for (const k of keys) for (const c of cityParkedCars(sd, cityGenPlan(k))) { o.cars++; if (!c.hz) o.carsAcross++; }
    o.courts = 0; for (const k of chronoLandingRooms()) { if (GEN.bossRooms().includes(k)) continue; const hub = cityGenPlan(k).shapes.find(sh => sh.t === 'poly' && !sh.pave), xs = hub.pts.map(p => p[0]), ys = hub.pts.map(p => p[1]); if (Math.max(...xs) - Math.min(...xs) > 100 || Math.max(...ys) - Math.min(...ys) > 100) o.courts++; }
    // Round 447: landmarks, street clutter, quarters
    const LM = L.filter(l => l.use === 'landmark'); o.landmarks = LM.length; o.landmarkKinds = new Set(LM.map(l => l.landmark)).size; o.landmarkRepeatNear = 0;
    for (let i = 0; i < LM.length; i++) for (let j = i + 1; j < LM.length; j++) if (LM[i].landmark === LM[j].landmark && Math.hypot(LM[i].r[0] - LM[j].r[0], LM[i].r[1] - LM[j].r[1]) < 800) o.landmarkRepeatNear++;
    o.clutter = 0; o.clutterBad = 0; for (const k of keys) { const p = cityGenPlan(k), [wx, wy] = GEN.world(k); for (const f of cityStreetFurniture(sd, p)) { if (f.slot !== 'clutter') continue; o.clutter++;
      const onRoad = !!p.floor[Math.floor(f.y / 25) * 32 + Math.floor(f.x / 25)], onLot = L.some(l => l.use !== 'plaza' && f.x + wx * 800 > l.r[0] + 4 && f.x + wx * 800 < l.r[2] - 4 && f.y + wy * 500 > l.r[1] + 4 && f.y + wy * 500 < l.r[3] - 4); if (onRoad || onLot || !CITY_CLUTTER_H[f.n]) o.clutterBad++; } }
    o.quarters = {}; for (const l of B) o.quarters[l.district] = (o.quarters[l.district] || 0) + 1;
    // a quarter is a neighbourhood: most buildings share their quarter with the building next door
    let qp = 0, qs = 0; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i], b = B[j]; if (Math.abs(a.r[0] - b.r[0]) < 300 && Math.abs(a.r[1] - b.r[1]) < 300) { qp++; if (a.district === b.district) qs++; } } o.quarterSame = qs / qp;
    o.southMain = B.filter(l => l.south).length;
    o.bare = genWorldScore['city:' + sd]; return o; });
    // walled-in pockets: walkable ground the room's streets don't reach (read after the masks are built)
    o.pockets = 0; for (const k of Object.keys(CITY_ROOMS)) { const [x, y] = k.split(',').map(Number), m = cityRoomMask(x, y - 4), p = cityGenPlan(k), seen = new Uint8Array(6300), q = [];
      for (let my = 0; my < 63; my++) for (let mx = 0; mx < 100; mx++) { const X = mx * 8 + 4, Y = my * 8 + 4; if (Y < 500 && m[my * 100 + mx] && p.street[Math.floor(Y / 25) * 32 + Math.floor(X / 25)]) { seen[my * 100 + mx] = 1; q.push(my * 100 + mx); } }
      for (let h = 0; h < q.length; h++) { const i = q[h], mx = i % 100, my = (i - mx) / 100; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = mx + a, ny = my + b; if (nx < 0 || ny < 0 || nx >= 100 || ny >= 63) continue; const n = ny * 100 + nx; if (m[n] && !seen[n]) { seen[n] = 1; q.push(n); } } }
      for (let i = 0; i < 6300; i++) if (m[i] && !seen[i]) o.pockets++; }
    return JSON.stringify(o); })()`));
  const at = seed + ': ' + JSON.stringify(r);
  assert.strictEqual(r.overlaps, 0, 'no two lots overlap; ' + at);
  assert.strictEqual(r.offGround, 0, 'lots stand only on buildable ground; ' + at);
  assert(r.buildings > 200, 'the city is built up; ' + at);
  assert(r.floorsMin >= 3 && r.storeyMin >= 41.9 && r.storeyMax <= 50.01, 'three floors at least, storeys 42 to 50px; ' + at);
  assert.strictEqual(r.small, 0, 'no building on a lot too small for one; ' + at);
  assert(r.planned, 'every building has its street side, quarter, wall and roof from the plan; ' + at);
  assert(r.sameWall <= r.pairs * 0.03, 'neighbours do not share a wall; ' + at);
  assert(r.ruins >= r.buildings * 0.08 && r.ruins <= r.buildings * 0.17 && r.ruinsInZone >= r.ruins * 0.75, 'ruins gather in blast zones; ' + at);
  assert(r.cars > 5 && r.carsAcross === 0, 'vehicles park along east-west streets only; ' + at);
  assert.strictEqual(r.courts, 0, 'a waypoint room has a plain crossing; ' + at);
  assert(r.bare.worst <= 0.1 && r.bare.mean <= 0.04, 'little ground is left bare; ' + at);
  assert(r.landmarks >= 3 && r.landmarkKinds >= Math.min(5, r.landmarks) && r.landmarkRepeatNear === 0, 'landmarks: several, different, never the same one close by; ' + at);
  assert(r.clutter >= 15 && r.clutterBad === 0, 'street clutter stands on the sidewalks; ' + at);
  assert(Object.keys(r.quarters).length === 4 && r.quarterSame > 0.75, 'four quarters, each a neighbourhood; ' + at);
  assert(r.southMain >= r.buildings * 0.2, 'buildings with a street to the south have a front (shopfront and signs), main roads included; ' + at);
  assert.strictEqual(r.pockets, 0, 'no walled-in pockets of walkable ground; ' + at);
  console.log(seed + ': ' + r.buildings + ' buildings (storeys ' + r.storeyMin.toFixed(0) + '-' + r.storeyMax.toFixed(0) + 'px), ' + r.yards + ' yards, ' + r.ruins + ' ruins (' + r.ruinsInZone + ' in zones), ' + r.sameWall + '/' + r.pairs + ' neighbours alike, worst room ' + Math.round(r.bare.worst * 100) + '% bare');
}
// Round 446: the roofs that take no (or little) rooftop kit are real roofs, and name real kinds of kit
{ const k = JSON.parse(run(`JSON.stringify({ kit: CITY_ROOF_KIT, roofs: [...CITY_TD_ART.roof, ...Object.values(CITY_DISTRICT_ART).flatMap(d => d.roof ? CITY_TD_ART[d.roof] : [])], slots: Object.keys(CITY_TD_ART) })`));
  for (const [roof, kit] of Object.entries(k.kit)) { assert(k.roofs.includes(roof), 'CITY_ROOF_KIT names a roof in the game: ' + roof); for (const s of kit) assert(k.slots.includes(s), roof + ' allows a real kind of kit: ' + s); }
  for (const glass of ['garden-glass', 'tech-glass-grid', 'garden-beds']) assert(k.kit[glass] && k.kit[glass].length === 0, 'nothing stands on ' + glass); }
console.log('PASS: the city\'s lots follow its streets; one scale; buildings agree across rooms; ruins in zones; no pockets.');
