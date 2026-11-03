'use strict';
// Round 343 (owner): Neon Aftermath's map shows only the main roads as vector paths: straight lines and 45° jogs,
// lining up exactly across every room edge, with small object paintings beside them.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync('assets/combined-rooms.js', 'utf8')); run(fs.readFileSync('assets/map-terrain.js', 'utf8'));
for (const world of JSON.parse(run('JSON.stringify(WORLD_ORDER)'))) {
const r = JSON.parse(run(`(() => { newGame(); configureRegion('${world}'); const o = { rooms: {}, exits: [] };
  for (const k of Object.keys(rooms)) o.rooms[k] = mapRoadNet(k);
  for (const [k, rm] of Object.entries(rooms)) for (const d of Object.keys(rm.exits)) { const raw = rm.exits[d], to = typeof raw === 'string' ? raw : raw.to; if (rooms[to] && rooms[to].world) o.exits.push([k, d, to]); }
  o.svg = mapRoadSvg(Object.keys(rooms)[0]); o.objs = mapRoomObjects(Object.keys(rooms).find(isStartRoom) || state.room).length; o.style = MAP_ROAD_STYLE;
  configureRegion('city'); return JSON.stringify(o); })()`));
const W = 800, H = 500, opp = { n: 's', s: 'n', e: 'w', w: 'e' };
const edgePoint = (net, d) => net.paths.map(p => p[0]).filter(([x, y]) => d === 'n' ? y < 0 : d === 's' ? y > H : d === 'w' ? x < 0 : x > W);
let checked = 0;
for (const [k, d, to] of r.exits.filter(e => 'nsew'.includes(e[1]) && e[1].length === 1)) {
  const a = edgePoint(r.rooms[k], d).map(([x, y]) => d === 'n' || d === 's' ? x : y).sort(), b = edgePoint(r.rooms[to], opp[d]).map(([x, y]) => d === 'n' || d === 's' ? x : y).sort();
  assert(a.length, world + ' ' + k + ' ' + d + ': every exit has a road on the map');
  assert.deepStrictEqual(a, b, world + ' ' + k + ' ' + d + ' -> ' + to + ': the road meets its neighbour at exactly the same point');
  checked++;
}
for (const [k, net] of Object.entries(r.rooms)) for (const p of net.paths) for (let i = 1; i < p.length; i++) {
  const dx = Math.abs(p[i][0] - p[i - 1][0]), dy = Math.abs(p[i][1] - p[i - 1][1]);
  assert(dx === 0 || dy === 0 || Math.abs(dx - dy) < 0.01, k + ': roads are straight or 45° (' + JSON.stringify(p) + ')');
}
assert(checked > 60, world + ': all ' + checked + ' crossings checked');
assert(/^M\d/.test(r.svg) && !/[CAS]/.test(r.svg), 'roads are SVG path data of lines and rounded turns');
assert(r.objs >= 0);
assert(r.style.kerb && r.style.asphalt && r.style.dash, 'owner-example road style: asphalt, kerb, dashed centre line');
console.log('map-roads ' + world + ': ' + checked + ' crossings line up');
}
console.log('map-roads ok');
