// Round 192: three Solaris corner rooms are cut and the rooms beside each are joined by a
// diagonal road. Walking out through a diagonal door arrives on the partner's diagonal road.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify((() => {
  newGame(); state.region = 'elaris'; configureRegion('elaris'); startBattle = function(){};
  const out = { rooms: Object.keys(rooms).length, cut: SOLARIS_CUT.filter(k => rooms[k]), links: [], trips: [], strayExits: [] };
  for (const k of Object.keys(rooms)) for (const t of Object.values(rooms[k].exits)) { const to = typeof t === 'string' ? t : t.to; if (!rooms[to]) out.strayExits.push(k + '->' + to); }
  for (const [k, doors] of Object.entries(SOLARIS_DIAG)) for (const [dir, d] of Object.entries(doors)) {
    out.links.push([k, dir, d.to, rooms[k].exits[dir] === d.to, !!(SOLARIS_DIAG[d.to] && Object.values(SOLARIS_DIAG[d.to]).some(e => e.to === k))]);
    // Walk out through the door.
    state.room = k; state.visited = [k]; const door = solarisDiagDoor(k, dir); state.pos = { ...door }; keys = {};
    const doorWalkable = walkable(k, door.x, Math.max(door.y, 30));
    move(1 / 30);
    const arrived = state.room, pos = { ...state.pos };
    out.trips.push({ from: k, dir, to: d.to, arrived, onRoad: walkable(arrived, pos.x, pos.y), clear: diagCornerAt(arrived, pos) === null, doorWalkable });
  }
  // Levels still climb from the start; the boss stays 18.
  out.levels = Object.fromEntries(['0,0', '8,5', '1,3', '5,1'].map(k => [k, rooms[k].level || null]));
  // No straight door is placed where a diagonal road leaves the same edge.
  out.southDoors = ['1,3', '7,3'].map(k => { const d = organicDoor(k, 's'); return [k, d && Math.round(d.edge.x)]; });
  return out;
})())`));
assert.equal(r.rooms, 51, 'Solaris has 51 rooms after the cut');
assert.deepEqual(r.cut, [], 'the cut rooms are gone');
assert.deepEqual(r.strayExits, [], 'no exit leads to a removed room');
assert.equal(r.links.length, 6, 'six diagonal doors (three links)');
for (const [k, dir, to, exit, back] of r.links) { assert(exit, k + ' ' + dir + ' is a real exit'); assert(back, to + ' links back to ' + k); }
for (const t of r.trips) {
  assert.equal(t.arrived, t.to, t.from + ' ' + t.dir + ' leads to ' + t.to);
  assert(t.onRoad, 'arrive on the road in ' + t.to);
  assert(t.clear, 'arrive clear of the door in ' + t.to + ' (no bounce back)');
}
for (const [k, x] of r.southDoors) assert(x !== null && Math.abs(x - 400) < 80, k + ' south door stays on the south road (x ' + x + ')');
assert.equal(r.levels['8,5'], 18, 'the Solar Crown stays level 18');
console.log('PASS: Solaris has 51 rooms; three diagonal links work both ways and arrive on the road; straight doors keep clear of them.');
