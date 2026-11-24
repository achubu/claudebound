'use strict';
// Round 540: Codex's procedural-generation review (CODEX-NOTES.md), the parts taken up:
// 1. room masks mark each blocker's cells instead of testing every cell against every blocker: the same mask as the old
//    loop, room by room (the old loop is kept here as the reference);
// 2. a room's 8px walk grid in the generated worlds is read from its mask: the same points walkable() gives;
// 3. seeded shuffles (Fisher-Yates) instead of sort(() => rand() - .5); a journey saved before keeps the old order;
// 4. a building picture already within CITY_BUILDING_SPREAD px is avoided when another of the best fits fits; the 40px rule
//    still holds;
// 5. genFinalCoverage(): the finished world's ground sorted by kind, per room.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const out = {};
  for (const [W, th] of [['city', 'city'], ['elaris', 'solaris']]) { state.region = W; configureRegion(W); cityGenEnsure(); const o = out[W] = { maskBad: [], gridBad: [], rooms: 0 };
    for (const key of Object.keys(rooms)) { const [cx, cy0] = key.split(',').map(Number), cy = cy0 - genDy(), p = cityGenPlan(key); if (!p) continue; o.rooms++;
      // (1) the old blocker loop, as it was before Round 540, on the room's floor and blockers
      const b = genWith(th, () => cityBlockers(cityGenSeed, key, p)), ref = new Uint8Array(100 * 63);
      for (let my = 0; my < 63; my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = 0; mx < 100; mx++) { const x = mx * 8 + 4, road = p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)];
        ref[my * 100 + mx] = !b.rects.some(q => x >= q[0] && x < q[2] && y >= q[1] && y < q[3] && !(road && q[4] === 'water')) && !b.circles.some(c => Math.hypot(x - c[0], y - c[1]) < c[2]) ? 1 : 0; } }
      // the mask is that, less the edge strips and ground not joined to the streets: wherever the mask is walkable, ref is
      // too, and the blocked cells of ref are blocked in the mask
      const blk = cityMaskBlocked(p, b); let diff = 0; for (let my = 0; my < 62; my++) for (let mx = 0; mx < 100; mx++) { const i = my * 100 + mx; if ((blk[i] ? 0 : 1) !== ref[i]) diff++; } if (diff) o.maskBad.push(key + ':blocked ' + diff);
      const m = cityRoomMask(cx, cy); let bad = 0; for (let i = 0; i < m.length; i++) if (m[i] && !ref[i]) bad++; if (bad) o.maskBad.push(key + ':' + bad);
      // (2) the walk grid against walkable() itself
      const want = []; for (let py = 14; py <= 486; py += 8) for (let px = 12; px <= 788; px += 8) if (walkable(key, px, py)) want.push(px, py);
      if (organicGrid(key).join(',') !== want.join(',')) o.gridBad.push(key); }
    // (4) buildings
    const wl = genWith(th, () => genWorld(chronoSeed())), bl = wl.lotsPx.filter(l => l.sprite && l.sprite.slot.startsWith('building-')); let twin40 = 0;
    for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) { const a = bl[i].r, c = bl[j].r;
      if (bl[i].sprite.n === bl[j].sprite.n && a[0] < c[2] + 40 && a[2] > c[0] - 40 && a[1] < c[3] + 40 && a[3] > c[1] - 40) twin40++; }
    o.buildings = bl.length; o.twin40 = twin40; o.spread = typeof CITY_BUILDING_SPREAD === 'number' ? CITY_BUILDING_SPREAD : null;
    // (6) the portal (Round 540): in the start room and the boss room it stands by the objects' rule
    o.portal = [regionStartRoom(), WORLD_BOSS_ROOMS[W][0]].map(k => { const q = cityPortalSpot(k); return q && { k, ok: walkable(k, q.x, q.y) && !cityItemOnStreet(k, q.x, q.y) && cityItemSpriteClear(k, q.x, q.y, { type: 'portal' }) }; });
    // (8) Round 541: a landmark with its picture's width in landmarkPx is never drawn wider than half of it (the room canvas is 2x)
    o.landmarkBig = wl.lotsPx.filter(l => l.use === 'landmark').map(l => { const px = genWith(th, () => GEN.landmarkPx && GEN.landmarkPx[l.landmark]), b = genWith(th, () => cityLandmarkBox(l, [0, 0, l.r[2] - l.r[0], l.r[3] - l.r[1]])); return px && b.w * 2 > px + 0.5 ? l.landmark + ':' + Math.round(b.w * 2) + '>' + px : null; }).filter(Boolean);
    o.landmarkPx = !!genWith(th, () => GEN.landmarkPx);
    // (5) coverage
    const cov = genFinalCoverage(th); o.covSum = Object.values(cov.totals).reduce((a, v) => a + v, 0); o.covRooms = Object.keys(cov.rooms).length;
    o.covRoomSums = Object.values(cov.rooms).every(x => Math.abs(Object.values(x.share).reduce((a, v) => a + v, 0) - 1) < 1e-9); o.residual = cov.totals.residual; }
  // (3) shuffles
  const seq = s => { const r = seeded(s); return () => r(); };
  out.shuffle = { a: seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], seq(42)).join(''), b: seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], seq(42)).join(''), sorted: seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], seq(42)).slice().sort().join('') };
  out.newJourney = state.shuffleV === undefined ? 'new' : state.shuffleV;
  const old = JSON.parse(JSON.stringify(state)); delete old.shuffleV; restoreGame(old); out.legacy = state.shuffleV;
  const nowSaved = JSON.parse(JSON.stringify(state)); restoreGame(nowSaved); out.legacyKept = state.shuffleV;
  return JSON.stringify(out); })()`));
for (const W of ['city', 'elaris']) {
  const o = r[W];
  assert(o.rooms > 40, W + ': rooms checked');
  assert.deepStrictEqual(o.maskBad, [], W + ': the mask never walks where a blocker stands (old loop as reference)');
  assert.deepStrictEqual(o.gridBad, [], W + ': the walk grid read from the mask is what walkable() gives');
  assert.strictEqual(o.twin40, 0, W + ': no building picture twice within 40px');
  assert.strictEqual(o.spread, 360, W + ': the spread rule is on');
  assert(Math.abs(o.covSum - 1) < 1e-9 && o.covRoomSums && o.covRooms === o.rooms, W + ': coverage shares add up, room by room');
  assert(o.residual > 0 && o.residual < 0.3, W + ': residual ground reported ' + o.residual);
  assert(o.portal.every(q => q && q.ok), W + ': the portal stands off the street, clear of sprites, on walkable ground ' + JSON.stringify(o.portal));
  assert.deepStrictEqual(o.landmarkBig, [], W + ': no landmark drawn larger than its picture');
  if (W === 'elaris') assert(o.landmarkPx, 'Solaris lists its landmark pictures\' widths');
  console.log(W + ': ' + o.rooms + ' rooms; ' + o.buildings + ' buildings; residual ground ' + (o.residual * 100).toFixed(1) + '%');
}
assert.strictEqual(r.shuffle.a, r.shuffle.b, 'the same seed shuffles the same way');
assert.strictEqual(r.shuffle.sorted, '12345678', 'a shuffle keeps every element');
assert.notStrictEqual(r.shuffle.a, '12345678', 'and moves them');
assert.strictEqual(r.newJourney, 'new', 'a new journey uses the seeded shuffle');
assert.strictEqual(r.legacy, 1, 'a journey saved before Round 540 keeps the old order');
assert.strictEqual(r.legacyKept, 1, 'and keeps it through another save and load');
// (7) the Map screen (Round 540): Solaris and the Chronospire in the city's style, in their own colours; small room names
const src = require('fs').readFileSync(require('path').join(__dirname, '../assets/chrono-gen.js'), 'utf8'), css = require('fs').readFileSync(require('path').join(__dirname, '../assets/layout-polish.css'), 'utf8');
assert(/const MAP_LOOK = \{[\s\S]*solaris:[\s\S]*chronospire:/.test(src) && !/MAP_LOOK = \{[^}]*\bcity:/.test(src), 'flat map colours for Solaris and the Chronospire; the city keeps its look');
assert(/\.map-canvas \.panel b \{ font-size: 6\.5px/.test(css), 'small room names on the map');
console.log('worldgen-codex ok');
