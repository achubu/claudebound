'use strict';
// Round 232: in the tile worlds, items stand in the open squares beside the road (tools/plazas.py),
// opened up to the walk mask, whenever their room's painting has one.
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const out = {};
for (const seed of [3, 77]) {
  newGame(); state.seed = seed;
  for (const w of ['elaris', 'sky', 'wilds', 'vespera']) {
    state.region = w; configureRegion(w); for (const k in poiCache) delete poiCache[k]; for (const k in itemSpotCache) delete itemSpotCache[k];
    const items = [];
    for (const k of Object.keys(rooms)) {
      const c = chestFor(k); if (c) items.push(['chest', k, c.x, c.y]);
      if (rooms[k].relic) items.push(['gear', k, rooms[k].relic[3], rooms[k].relic[4]]);
      const p = poiAt(k); if (p) items.push([p.type, k, p.x, p.y]);
    }
    const m = merchantRoom(); if (m) items.push(['merchant', m.key, m.x, m.y]);
    if (typeof cardsmithFor === 'function') { const s = cardsmithFor(); if (s) items.push(['cardsmith', s.key, s.x, s.y]); }
    const res = items.map(([type, k, x, y]) => ({ type, k, has: !!plazaSpots(k), on: isPlazaSpot(k, { x, y }), walk: walkable(k, x, y), reach: organicReachableAt(k, { x, y }),
      stand: !!organicSpot(k, x, y) && Math.hypot(organicSpot(k, x, y).x - x, organicSpot(k, x, y).y - y) < 40 }));
    out[w + ':' + seed] = { rooms: Object.keys(rooms).filter(k => plazaSpots(k)).length, total: Object.keys(rooms).length, res };
  }
}
return JSON.stringify(out); })()`));
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
for (const [w, x] of Object.entries(r)) {
  const inPlazaRooms = x.res.filter(i => i.has), onPlaza = inPlazaRooms.filter(i => i.on);
  console.log(w, 'rooms with squares', x.rooms + '/' + x.total, '; items in them on a square', onPlaza.length + '/' + inPlazaRooms.length,
    inPlazaRooms.filter(i => !i.on).map(i => i.type + '@' + i.k).join(' '));
  assert(x.rooms > 0, w + ': its paintings have open squares');
  assert(onPlaza.length >= inPlazaRooms.length * 0.85, w + ': items in rooms with a square stand in one');
  for (const i of onPlaza) assert(i.walk && i.reach && i.stand, w + ': the ' + i.type + ' in ' + i.k + ' can be walked up to');
}
