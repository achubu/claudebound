'use strict';
// Round 229: every world's first Nexus Waypoint stands a few rooms from the arrival room, in a room
// with nothing else in it (no point of interest, merchant, Cardsmith, chest, relic or patrol).
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const out = { worlds: {} };
for (const seed of [3, 77, 4041]) {
  newGame(); state.seed = seed;
  for (const w of WORLD_ORDER) {
    state.region = w; configureRegion(w); for (const k in poiCache) delete poiCache[k];
    const nx = NEXUS_POINTS[w], key = nx.start, arrival = nx.arrival;
    const dist = { [arrival]: 0 }, q = [arrival];
    while (q.length) { const k = q.shift(); for (const v of Object.values(rooms[k].exits)) { const t = typeof v === 'string' ? v : v.to; if (rooms[t] && !(t in dist)) { dist[t] = dist[k] + 1; q.push(t); } } }
    const pois = Object.entries(worldPOIs()).filter(([k]) => k === key).map(([, p]) => p.type);
    const merchants = []; for (let m = 0; m < 12; m++) { state.poi.merchantMoves = m; const s = merchantRoom(); if (s) merchants.push(s.key); } state.poi.merchantMoves = 0;
    const here = poiAt(key);
    out.worlds[w + ':' + seed] = { key, arrival, dist: dist[key], exists: !!rooms[key], pois, here: here && here.type, onPath: here ? walkable(key, here.x, here.y) || organicBesideStreet(key, here) : false,
      arrivalNexus: !!(poiAt(arrival) && poiAt(arrival).type === 'nexus'), chest: !!chestFor(key), relic: !!rooms[key].relic, smith: typeof cardsmithRoom === 'function' && cardsmithRoom() === key,
      merchant: merchants.includes(key), spawns: roomSpawns(key).length, quiet: isQuietRoom(key), mid: nx.mid === key };
  }
}
// Walking in discovers it, and you can travel back to it.
newGame(); state.region = 'city'; configureRegion('city'); ensureExplore(); state.room = NEXUS_POINTS.city.start; const found = discoverNexus();
state.room = NEXUS_POINTS.city.arrival; nexusTravel('city', NEXUS_POINTS.city.start); out.travel = { found, room: state.room };
// A save that had discovered the old start-room waypoint keeps it, in its new room.
newGame(); state.poi = state.poi || {}; ensureExplore(); state.poi.nexus = ['city:' + NEXUS_POINTS.city.arrival, 'elaris:' + NEXUS_POINTS.elaris.arrival]; ensureExplore();
out.migrated = state.poi.nexus.slice();
return JSON.stringify(out); })()`));
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
for (const [w, x] of Object.entries(r.worlds)) {
  assert(x.exists && x.key !== x.arrival && x.dist >= 2 && x.dist <= 4, w + ': the first waypoint is ' + x.dist + ' rooms from the arrival room (' + x.key + ')');
  assert(!x.arrivalNexus, w + ': the arrival room has no waypoint');
  assert(x.here === 'nexus' && x.onPath, w + ': the waypoint stands in its room, by the path');
  assert(JSON.stringify(x.pois) === '["nexus"]' && !x.chest && !x.relic && !x.smith && !x.merchant && !x.quiet && !x.mid, w + ': nothing else is in its room ' + JSON.stringify(x));
  assert(x.spawns === 0, w + ': no patrols in its room');
}
assert(r.travel.found && r.travel.room === r.worlds['city:3'].key, 'walking in discovers it, and the Nexus travels there');
assert(r.migrated.includes('city:' + r.worlds['city:3'].key) && r.migrated.includes('elaris:' + r.worlds['elaris:3'].key) && r.migrated.length === 2, 'an old save keeps its start-room waypoints, moved to the new rooms');
