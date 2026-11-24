// Round 548: the Sky Isles are generated now (GEN_THEMES.sky). The generator has no diagonal walkways (as Solaris); the
// one from 1,5 to 2,4 was all that joined the second mini-boss's corner, so a straight link round the corner (1,4 to 2,4)
// takes its place (GEN_THEMES.sky.extraLinks). While GEN_SKY_LIVE, this checks that instead of the painted tile world's
// diagonals below.
{ process.env.HARNESS_ONLY = '1'; const assert = require('assert'); const { run } = require('./expansion.test.cjs');
  const g = JSON.parse(run(`(() => { newGame(); state.region = 'sky'; configureRegion('sky'); if (!genLive('sky')) return JSON.stringify({ live: false });
    const diag = Object.keys(rooms).filter(k => Object.keys(rooms[k].exits).some(d => d.length > 1));
    const seen = new Set([regionStartRoom()]), q = [regionStartRoom()]; while (q.length) { const k = q.pop(); for (const e of Object.values(rooms[k].exits)) { const t = typeof e === 'string' ? e : e.to; if (rooms[t] && !seen.has(t)) { seen.add(t); q.push(t); } } }
    return JSON.stringify({ live: true, diag, reach: seen.size, rooms: Object.keys(rooms).length, link: rooms['1,4'].exits.e, back: rooms['2,4'].exits.w, cut: TILE_WORLD_DATA.sky.cut.filter(k => rooms[k]) }); })()`));
  if (g.live) {
    assert.deepStrictEqual(g.diag, [], 'the generated Sky Isles have no diagonal exits');
    assert.strictEqual(g.reach, g.rooms, 'every room can be reached from the start (' + g.reach + '/' + g.rooms + ')');
    assert(g.link === '2,4' && g.back === '1,4', 'the straight link 1,4 - 2,4 replaces the lost diagonal');
    assert.deepStrictEqual(g.cut, [], 'the three cut corner rooms stay cut');
    console.log('sky-diagonals ok (generated: ' + g.rooms + ' rooms, all reachable)'); process.exit(0); } }
// Round 197: the Sky Isles are painted from the owner's top-down tiles. Three edge rooms are cut
// and the rooms beside each are joined by a diagonal walkway (the tile world's 'diag' table).
/* (below: the painted tile world, when GEN_SKY_LIVE is off) */
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify((() => {
  newGame(); state.region = 'sky'; configureRegion('sky'); startBattle = function(){};
  const d = TILE_WORLD_DATA.sky;
  const out = { rooms: Object.keys(rooms).length, cut: d.cut.filter(k => rooms[k]), links: [], trips: [], strayExits: [], placeholders: d.placeholders, tiles: [...new Set(Object.values(d.plan).map(p => p[0]))] };
  for (const k of Object.keys(rooms)) for (const t of Object.values(rooms[k].exits)) { const to = typeof t === 'string' ? t : t.to; if (!rooms[to]) out.strayExits.push(k + '->' + to); }
  for (const [k, doors] of Object.entries(d.diag)) for (const [dir, door0] of Object.entries(doors)) {
    out.links.push([k, dir, door0.to, rooms[k].exits[dir] === door0.to, !!(d.diag[door0.to] && Object.values(d.diag[door0.to]).some(e => e.to === k))]);
    state.room = k; state.visited = [k]; const door = solarisDiagDoor(k, dir); state.pos = { ...door }; keys = {};
    move(1 / 30);
    const arrived = state.room, pos = { ...state.pos };
    out.trips.push({ from: k, dir, to: door0.to, arrived, onRoad: walkable(arrived, pos.x, pos.y), clear: diagCornerAt(arrived, pos) === null, nearDoor: (() => { const back = Object.keys((typeof SOLARIS_DIAG !== 'undefined' && activeRegion === 'elaris' ? SOLARIS_DIAG : TILE_WORLD_DATA[activeRegion].diag)[arrived] || {})[0], dd = back && solarisDiagDoor(arrived, back); return dd ? Math.round(Math.hypot(pos.x - dd.x, pos.y - dd.y)) : -1; })() });
  }
  out.roles = d.roles; out.bossLevel = rooms[d.roles.boss].level;
  // Solaris keeps its own diagonals while the Sky Isles are loaded and after.
  // A save standing in a cut room resumes at the start instead of failing to load.
  newGame(); state.region = 'sky'; configureRegion('sky'); const old = JSON.parse(JSON.stringify(state));
  old.room = '8,0'; old.visited = ['8,1', '8,0', '7,0']; old.regionVisits.sky = old.visited.slice();
  let err = null; try { validateImport(old); } catch (e) { err = e.message; }
  out.migrated = { err, room: old.room, visited: old.visited, start: d.roles.start };
  configureRegion('elaris'); out.solarisDoors = Object.keys(worldDiagTable()).length;
  configureRegion('city'); out.cityDoors = Object.keys(worldDiagTable()).length;
  return out;
})())`));
assert.equal(r.rooms, 51, 'the Sky Isles have 51 rooms after the cut');
assert.deepEqual(r.cut, [], 'the cut rooms are gone');
assert.deepEqual(r.strayExits, [], 'no exit leads to a removed room');
assert.deepEqual(r.placeholders, [], 'no stand-in tiles are left');
assert(r.tiles.some(n => n.startsWith('diag-')), 'diagonal tiles are used');
assert.equal(r.links.length, 6, 'six diagonal doors (three links)');
for (const [k, dir, to, exit, back] of r.links) { assert(exit, k + ' ' + dir + ' is a real exit'); assert(back, to + ' links back to ' + k); }
for (const t of r.trips) {
  assert.equal(t.arrived, t.to, t.from + ' ' + t.dir + ' leads to ' + t.to);
  assert(t.onRoad, 'arrive on the walkway in ' + t.to);
  assert(t.nearDoor >= 0 && t.nearDoor < 160, 'Round 218: arrive on the diagonal road beside its door in ' + t.to + ' (' + t.nearDoor + 'px away)');
  assert(t.clear, 'arrive clear of the door in ' + t.to + ' (no bounce back)');
}
assert.equal(r.bossLevel, 27, 'the Eye of the Sky stays level 27');
assert.equal(r.migrated.err, null, 'a save in a cut room still loads');
assert.equal(r.migrated.room, r.migrated.start, 'it resumes at Windgate Landing');
assert(!r.migrated.visited.includes('8,0'), 'cut rooms leave the visited list');
assert.equal(r.solarisDoors, 0, 'the generated Solaris has no diagonal doors (Round 486)');
assert.equal(r.cityDoors, 0, 'Neon Aftermath has no tile-world diagonals');
// Every tile the plan uses has a painting and a walk mask.
for (const n of r.tiles) {
  assert(fs.existsSync(path.join(__dirname, '../assets/environment/sky/' + n + '.webp')), n + '.webp exists');
  assert(fs.existsSync(path.join(__dirname, '../assets/environment/sky/src/masks/' + n + '.png')), n + ' has a walk mask');
}
console.log('PASS: the Sky Isles use the owner\'s tiles: 51 rooms, three diagonal links that work both ways and arrive on the walkway.');
