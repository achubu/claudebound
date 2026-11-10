// Round 377: the Chronospire is generated from the journey's seed (assets/chrono-gen.js).
const assert = require('assert'), fs = require('fs'), path = require('path'), cp = require('child_process');
process.env.HARNESS_ONLY = '1';
const { run } = require('./expansion.test.cjs');
const SIG = `(seed => { state.seed = seed; state.region = 'chronospire'; configureRegion('chronospire'); const o = {};
  for (const key of Object.keys(rooms)) { const p = poiAt(key), c = chestFor(key);
    o[key] = [Object.keys(rooms[key].exits).map(d => { const q = organicDoor(key, d); return q ? d + Math.round(q.x) + ',' + Math.round(q.y) : d + '-'; }).join(' '),
      roomSpawns(key).map(s => Math.round(s.x) + ',' + Math.round(s.y)).join(' '), p ? p.type + Math.round(p.x) + ',' + Math.round(p.y) : '', c ? Math.round(c.x) + ',' + Math.round(c.y) : ''].join('|'); }
  return JSON.stringify(o); })`;
if (process.argv[2] === 'sig') { run('newGame()'); console.log('SIG' + run(SIG + '(' + Number(process.argv[3]) + ')')); process.exit(0); }

const r = JSON.parse(run(`(() => { const out = { bad: [], rooms: 0, plazas: 0 }; newGame();
  for (const seed of [11, 4242, 987654321]) { state.seed = seed; state.region = 'chronospire'; configureRegion('chronospire');
    for (const key of Object.keys(rooms)) { out.rooms++; const p = chronoPlan(key), e = [];
      for (const d of Object.keys(rooms[key].exits)) { if (!organicDoor(key, d)) e.push('no door ' + d);
        if (chronoDoorCell(String(seed), key, d) !== chronoDoorCell(String(seed), TILE_WORLD_DATA.chronospire.layout[key].exits[d], { n: 's', s: 'n', e: 'w', w: 'e' }[d])) e.push('door mismatch ' + d); }
      if (organicPockets(key).length !== 1) e.push('pockets ' + organicPockets(key).length);
      if (!p.plazas.length) e.push('no square'); out.plazas += p.plazas.length;
      for (const [x, y] of p.plazas) if (!walkable(key, x, y) || !plazaFit(key, x, y)) e.push('square off the floor');
      for (const s of roomSpawns(key)) if (!walkable(key, s.x, s.y)) e.push('patrol off the floor');
      if (!walkable(key, p.hub[0], p.hub[1])) e.push('hub off the floor');
      if (chronoLandingRooms().includes(key) && !walkable(key, 400, 300)) e.push('landing room closed at its middle');
      for (let x = 1; x < 15; x++) if (p.floor[x] && !rooms[key].exits.n || p.floor[9 * 16 + x] && !rooms[key].exits.s) e.push('road at an edge without an exit');
      for (let y = 1; y < 9; y++) if (p.floor[y * 16] && !rooms[key].exits.w || p.floor[y * 16 + 15] && !rooms[key].exits.e) e.push('road at an edge without an exit');
      for (const q of chronoRoomProps(String(seed), p)) { if (q.box[0] < 0 || q.box[1] < 0 || q.box[2] > 800 || q.box[3] > 500) e.push('prop outside');
        for (let cy = Math.floor(q.box[1] / 50); cy <= Math.floor(q.box[3] / 50); cy++) for (let cx = Math.floor(q.box[0] / 50); cx <= Math.floor(q.box[2] / 50); cx++) if (p.floor[cy * 16 + cx]) e.push('prop on the floor'); }
      if (e.length) out.bad.push(seed + ' ' + key + ': ' + [...new Set(e)].join(', ')); } }
  const grid = s => { state.seed = s; return Array.from(chronoPlan('2,3').floor).join(''); };
  out.same = grid(5) === (grid(6), grid(5)); out.differs = grid(5) !== grid(6);
  out.landing = chronoLandingRooms(); out.props = Object.keys(CHRONO_BUILDINGS).concat(Object.keys(CHRONO_SMALL));
  // A save from the stand-in tiles resumes at its room's hub.
  newGame(); state.region = 'chronospire'; configureRegion('chronospire'); state.room = '2,3'; state.pos = { x: 5, y: 5 }; const s = JSON.parse(JSON.stringify(state)); delete s.chronoGen;
  restoreGame(s); out.resumed = walkable(state.room, state.pos.x, state.pos.y) && state.chronoGen === CHRONO_GEN_VERSION && state.room === '2,3';
  return JSON.stringify(out); })()`));
assert.deepStrictEqual(r.bad, [], 'every room of three seeds is sound');
assert.strictEqual(r.rooms, 162); assert(r.plazas >= 162 * 1.7, 'nearly every room has two squares: ' + r.plazas);
assert(r.same && r.differs, 'the same seed gives the same room; another seed another');
assert(r.landing.length >= 2, 'the first room and the waypoint rooms are landing rooms: ' + r.landing);
assert(r.resumed, 'an older save resumes on the floor at its room\'s hub');
for (const n of ['floor', 'ground', 'sand', ...r.props]) assert(fs.existsSync(path.join(__dirname, '..', 'assets/environment/chronospire/gen', n + '.webp')), n + '.webp');
// A change of seed in one session gives exactly what a fresh page with that seed gives (no stale caches).
run('newGame()'); run(SIG + '(31337)');
const switched = run(SIG + '(2024)');
const fresh = cp.execFileSync(process.execPath, [__filename, 'sig', '2024'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').find(l => l.startsWith('SIG')).slice(3);
assert.deepStrictEqual(JSON.parse(switched), JSON.parse(fresh), 'doors, patrols and objects after a seed change match a fresh start');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(html.indexOf('assets/tile-worlds.js') < html.indexOf('assets/chrono-gen.js') && html.indexOf('assets/chrono-gen.js') < html.indexOf('assets/world-cards.js'), 'chrono-gen loads after tile-worlds');
console.log('PASS: the Chronospire is generated from the journey seed: sound rooms on three seeds, deterministic, props clear of the roads, older saves resume at a hub, and a seed change leaves no stale caches.');
