'use strict';
// Round 276: diagonal roads (Solaris, the Sky Isles) are drawn as connected streets on the map, door to door
// across the cut room even where the doors don't line up; and on a phone the room labels shrink with the map.
const fs = require('node:fs'), path = require('node:path');
process.env.HARNESS_ONLY = '1';
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname, '../assets/map-terrain.js'), 'utf8'));
run(`{
newGame();
const deep = () => new Proxy(function () {}, { get: (t, k) => k === 'canvas' ? undefined : deep(), apply: () => deep(), set: () => true });
const strokes = []; let stroking = null;
const ctx2d = () => new Proxy({}, { get: (t, k) => k === 'moveTo' ? (x, y) => { stroking = [[x, y]]; } : k === 'lineTo' ? (x, y) => { stroking && stroking.push([x, y]); } : k === 'stroke' ? () => { if (stroking) strokes.push(stroking); } : k === 'canvas' ? undefined : deep(), set: () => true });
const fakeCanvas = () => ({ width: 0, height: 0, style: {}, className: '', isConnected: true, setAttribute() {}, getContext: () => ctx2d(), toDataURL: () => '' });
const realCreate = document.createElement; document.createElement = tag => tag === 'canvas' ? fakeCanvas() : realCreate(tag);
for (const region of ['elaris', 'sky']) {
  configureRegion(region); state.visited = Object.keys(rooms); state.room = regionStartRoom();
  const t = worldDiagTable(); let pairs = 0;
  for (const [key, dirs] of Object.entries(t)) for (const [dir, d] of Object.entries(dirs)) {
    const a = mapDiagAnchor(key, d); assert(a && a.length === 2, region + ' ' + key + ' ' + dir + ' has an anchor');
    assert(Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) < 300, region + ' ' + key + ': the street near its diagonal door');
    assert(Object.values(t[d.to] || {}).some(e => e.to === key), region + ': ' + key + ' and ' + d.to + ' point at each other'); pairs++;
  }
  assert(pairs >= 4, region + ' has diagonal roads');
  strokes.length = 0; const c = document.createElement('canvas'); drawMapTerrain(c, 256);
  const joins = strokes.filter(s => s.length === 4).length; // street, door, partner's door, partner's street
  assert(joins >= 3 * pairs / 2, region + ': every diagonal is drawn door to door (' + joins + ' strokes for ' + pairs / 2 + ' roads)');
}
const props = {}; const map = { dataset: { baseW: 1000, baseH: 600 }, style: { setProperty: (k, v) => { props[k] = v; } }, offsetWidth: 1000, offsetHeight: 600, querySelector: () => null };
const scroller = { clientWidth: 400, clientHeight: 300, scrollLeft: 0, scrollTop: 0 };
applyMapZoom(map, scroller, 0.3); assert.equal(props['--map-label-scale'], '0.5', 'a phone-sized map shrinks its labels');
applyMapZoom(map, scroller, 1); assert.equal(props['--map-label-scale'], '1', 'a full-size map keeps them');
console.log('PASS: diagonal roads join door to door on the map in Solaris and the Sky Isles; labels shrink with a small map.');
}`);
