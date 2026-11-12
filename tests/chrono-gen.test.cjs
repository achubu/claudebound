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

const r = JSON.parse(run(`(() => { const out = { bad: [], rooms: 0, plazas: 0, inlays: 0, kinds: {}, legs: 0, buildings: 0, onStreet: 0, lamps: 0, yards: 0, ownQuarter: 0, districts: {} }; newGame();
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
      // Round 383: the floor is on the 25px grid (32x20).
      for (let x = 0; x < 32; x++) if (p.floor[x] && !rooms[key].exits.n || p.floor[19 * 32 + x] && !rooms[key].exits.s) e.push('road at an edge without an exit');
      for (let y = 0; y < 20; y++) if (p.floor[y * 32] && !rooms[key].exits.w || p.floor[y * 32 + 31] && !rooms[key].exits.e) e.push('road at an edge without an exit');
      out.legs += p.shapes.filter(s => s.t === 'road').reduce((n, s) => n + s.pts.slice(1).filter((q, i) => Math.abs(q[0] - s.pts[i][0]) > 1 && Math.abs(q[1] - s.pts[i][1]) > 1 && Math.abs(Math.abs(q[0] - s.pts[i][0]) - Math.abs(q[1] - s.pts[i][1])) < 0.01).length, 0);
      if (p.shapes.some(s => s.t === 'road' && s.pts.slice(1).some((q, i) => { const dx = Math.abs(q[0] - s.pts[i][0]), dy = Math.abs(q[1] - s.pts[i][1]); return dx > 0.01 && dy > 0.01 && Math.abs(dx - dy) > 0.01; }))) e.push('a road leg that is neither straight nor at 45 degrees');
      for (const q of chronoRoomProps(String(seed), p)) { if (q.box[0] < 0 || q.box[1] < 0 || q.box[2] > 800 || q.box[3] > 500) e.push('prop outside');
        for (let cy = Math.floor(q.box[1] / 25); cy <= Math.floor(q.box[3] / 25); cy++) for (let cx = Math.floor(q.box[0] / 25); cx <= Math.floor(q.box[2] / 25); cx++) if (p.floor[cy * 32 + cx]) e.push('prop on the floor'); }
      // Round 385: scenery follows the streets.
      { const ps = chronoRoomProps(String(seed), p), bs = ps.filter(q => q.kind === 'building'), isF = (x, y) => x >= 0 && y >= 0 && x < 800 && y < 500 && p.floor[Math.floor(y / 25) * 32 + Math.floor(x / 25)] === 1;
        const nearRoad = q => { for (let d = 0; d <= 60; d += 4) for (const [dx, dy] of [[0, d], [-q.w / 2 - d, -q.h * 0.2], [q.w / 2 + d, -q.h * 0.2], [0, -q.h - d]]) if (isF(q.x + dx, q.y + dy)) return true; return false; };
        out.buildings += bs.length; out.onStreet += bs.filter(nearRoad).length; out.lamps += ps.filter(q => q.kind === 'lamp').length; out.yards += (p.yards || []).length; out.districts[p.district] = (out.districts[p.district] || 0) + 1;
        const table = CHRONO_DISTRICTS[p.district]; out.ownQuarter += bs.filter(q => table[q.name]).length;
        { const sm = ps.filter(q => ['lamp', 'bench', 'bollard', 'clutter'].includes(q.kind)); for (let i = 0; i < sm.length; i++) for (let j = i + 1; j < sm.length; j++) if (Math.hypot(sm[i].x - sm[j].x, sm[i].y - sm[j].y) < 160) e.push('two small pieces within 160px'); }
        { const nb = bs.map(q => q.name).concat(ps.filter(q => q.kind === 'landmark').map(q => q.name)); if (new Set(nb).size !== nb.length) e.push('a building twice in one room'); }
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const a = ps[i].box, b = ps[j].box; if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) e.push('two pieces of scenery overlap'); } }
      const t = chronoTerrain(String(seed), key);
      for (const q of chronoRoomProps(String(seed), p)) if (t.chasm(Math.floor(q.x / 50), Math.floor((q.y - 4) / 50))) e.push('prop standing in a chasm');
      for (const i of p.inlays) { if (!p.floor[Math.floor(i.y / 25) * 32 + Math.floor(i.x / 25)]) e.push('inlay off the floor'); out.inlays++; }
      for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) { out.kinds[t.kind(x, y)] = (out.kinds[t.kind(x, y)] || 0) + 1; }
      for (let y = 0; y < 10; y++) if (key.split(',')[0] < 5 && t.kind(16, y) !== chronoTerrain(String(seed), (Number(key.split(',')[0]) + 1) + ',' + key.split(',')[1]).kind(0, y)) e.push('terrain breaks at the seam');
      if (e.length) out.bad.push(seed + ' ' + key + ': ' + [...new Set(e)].join(', ')); } }
  const grid = s => { state.seed = s; return Array.from(chronoPlan('2,3').floor).join(''); };
  out.same = grid(5) === (grid(6), grid(5)); out.differs = grid(5) !== grid(6);
  out.landing = chronoLandingRooms(); out.props = chronoSceneryNames().concat(CHRONO_INLAYS, ['pipes', 'chasm', 'yard']);
  // A save from the stand-in tiles resumes at its room's hub.
  newGame(); state.region = 'chronospire'; configureRegion('chronospire'); state.room = Object.keys(rooms).find(k => k !== regionStartRoom()); state.pos = { x: 5, y: 5 }; state.visited = Object.keys(rooms).slice(0, 9);
  state.worldRelays = { chronospire: { on: [0, 1], vault: false } }; const s = JSON.parse(JSON.stringify(state)); delete s.chronoGen;
  restoreGame(s); out.resumed = walkable(state.room, state.pos.x, state.pos.y) && state.chronoGen === CHRONO_GEN_VERSION && state.room === regionStartRoom() && state.visited.length === 1 && !state.worldRelays.chronospire;
  return JSON.stringify(out); })()`));
assert.deepStrictEqual(r.bad, [], 'every room of three seeds is sound');
assert.strictEqual(r.rooms, 162); assert(r.plazas >= 162 * 1.6, 'most rooms have two squares: ' + r.plazas); assert(r.legs > 162, 'Round 383: roads take 45-degree legs: ' + r.legs);
assert(!fs.existsSync(path.join(__dirname, '..', 'assets/environment/chronospire/gen/sand.webp')), 'Round 386: the sand texture is gone');
assert(r.inlays > 20 && r.kinds.pipes > 162 * 160 * 0.08 && r.kinds.chasm > 162 * 160 * 0.04 && r.kinds.gears > r.kinds.pipes, 'Round 378: inlays, pipe beds and chasms across the world: ' + JSON.stringify(r.kinds));
assert(r.buildings > 162 * 3.3 && r.onStreet / r.buildings > 0.9, 'Round 385: buildings stand along the streets: ' + r.onStreet + ' of ' + r.buildings);
assert(r.yards >= r.buildings && r.lamps > 162 * 2 && r.ownQuarter / r.buildings > 0.4 && Object.keys(r.districts).length === 4, 'Round 385: yards, lamps and four districts: ' + JSON.stringify([r.yards, r.lamps, r.ownQuarter, r.districts]));
assert(r.same && r.differs, 'the same seed gives the same room; another seed another');
assert(r.landing.length >= 2, 'the first room and the waypoint rooms are landing rooms: ' + r.landing);
assert(r.resumed, 'Round 379: a save from an older map restarts the Chronospire at its gate, breakers off');
for (const n of ['floor', 'ground', ...r.props]) assert(fs.existsSync(path.join(__dirname, '..', 'assets/environment/chronospire/gen', n + '.webp')), n + '.webp');
// Round 379: the room map and its locks.
const L = JSON.parse(run(`(() => { const out = { bad: [], sizes: [], starts: new Set(), steps: [], area: 0 };
  for (let i = 0; i < 150; i++) { const g = chronoGraph('s' + i), R = g.roles, e = [];
    if (Object.keys(g.layout).length !== 54) e.push('rooms'); { const xs = Object.values(g.layout).map(r => r.world[0]), ys = Object.values(g.layout).map(r => r.world[1]); if (Math.min(...xs) < 0 || Math.max(...xs) > 7 || Math.min(...ys) < 0 || Math.max(...ys) > 10) e.push('outside the 8x11 grid'); out.area += (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1); } if (!chronoGraphSolvable(g)) e.push('not solvable in order');
    if (new Set(Object.values(R)).size !== 9) e.push('roles share a room');
    const w = k => g.layout[k].wing; if (w(R.start) !== 'G' || w(R.breaker1) !== 'G' || w(R.boss1) !== 'G' || w(R.boss) !== 'G' || w(R.mini1) !== 'A' || w(R.breaker2) !== 'A' || w(R.boss2) !== 'A' || w(R.mini2) !== 'B' || w(R.breaker3) !== 'B') e.push('a role in the wrong wing');
    for (const k of [R.boss, R.boss1, R.boss2]) if (Object.keys(g.layout[k].exits).length !== 1) e.push('boss room is not a dead end');
    for (const [k, r] of Object.entries(g.layout)) for (const [d, t] of Object.entries(r.exits)) { if (g.layout[t].exits[{ n: 's', s: 'n', e: 'w', w: 'e' }[d]] !== k) e.push('one-way door');
      if (r.wing !== g.layout[t].wing && ![g.doors.A, g.doors.B].some(p => p.includes(k) && p.includes(t))) e.push('a second door between wings'); }
    const lv = Object.values(g.layout).filter(r => r.level).map(r => r.level); if (Math.min(...lv) !== 46 || Math.max(...lv) !== 54 || g.layout[R.boss].level !== 54) e.push('levels');
    const n = x => Object.values(g.layout).filter(r => r.wing === x).length; if (i < 5) out.sizes.push([n('G'), n('A'), n('B')]); out.starts.add(R.start);
    if (e.length) out.bad.push(i + ': ' + [...new Set(e)].join(', ')); }
  out.starts = out.starts.size;
  // In the game: the doors are locked on the live room table, and the chain opens them one by one.
  newGame(); state.seed = 20261110; state.region = 'chronospire'; configureRegion('chronospire'); const R = chronoMap.roles, gear = gearOf('chronospire');
  const locked = () => chronoLockedDoors().map(([a, b, t]) => { const raw = Object.values(rooms[a].exits).find(x => (x.to || x) === b), back = Object.values(rooms[b].exits).find(x => (x.to || x) === a); return (raw.requires === 'chrono:' + t && back.requires === 'chrono:' + t ? '' : '!') + (doorLocked(raw) ? 'L' : 'o'); }).join('');
  const reach = () => { const seen = new Set([R.start]), q = [R.start]; while (q.length) { const k = q.shift(); for (const raw of Object.values(rooms[k].exits)) { const t = raw.to || raw; if (seen.has(t) || doorLocked(raw)) continue; seen.add(t); q.push(t); } } return seen; };
  out.enemies = [R.mini1, R.mini2, R.boss1, R.boss2, R.boss].map(k => roomSpawns(k)[0] && roomSpawns(k)[0].type).join();
  out.gearRooms = rooms[R.mini1].relic[0] === gear[0] && rooms[R.mini2].relic[0] === gear[1]; out.breakers = worldRelayRooms().join() === [R.breaker1, R.breaker2, R.breaker3].join();
  out.breakerItems = worldRelayRooms().every(k => worldRelayItems(k).length === 1 && !poiAt(k) && !chestFor(k));
  const log = () => out.steps.push(chronoNextStep()[0] + ':' + locked() + ':' + reach().size + ':' + [R.breaker1, R.mini1, R.boss1, R.breaker2, R.mini2, R.boss2, R.breaker3, R.boss].map(k => reach().has(k) ? 1 : 0).join(''));
  const relay = worldRelayState('chronospire', true); log();
  relay.on.push(0); log(); state.relics.push(gear[0]); log(); state.bosses.push('mainspringColossus'); log(); relay.on.push(1); log();
  state.relics.push(gear[1]); log(); state.bosses.push('hollowHour'); log(); relay.on.push(2); log();
  out.lockNames = ['chrono:breaker2', 'chrono:loot1'].map(relicName).join('|') === 'Breaker 2|' + GEAR[gear[0]].name;
  out.objective = objective(); out.wingNames = [rooms[R.boss1].name, rooms[R.boss2].name, rooms[R.boss].name, rooms[R.start].name];
  return JSON.stringify(out); })()`));
assert.deepStrictEqual(L.bad, [], '150 room maps: 54 rooms, three wings joined by two doors, roles in their wings, boss rooms are dead ends, solvable in order');
assert(L.area / 150 > 62, 'Round 383: the world is an irregular shape, not a full block: its 54 rooms span ' + Math.round(L.area / 150) + ' cells on average');
assert(L.starts > 25, 'the gate stands in a different room from seed to seed: ' + L.starts);
assert.strictEqual(L.enemies, 'clockwarden,paradoxTwin,mainspringColossus,hollowHour,chronarch'); assert(L.gearRooms && L.breakers && L.breakerItems, 'gear with the mini-bosses, a breaker alone in each breaker room');
assert.deepStrictEqual(L.steps.map(s => s.split(':')[0]), ['breaker1', 'mini1', 'boss1', 'breaker2', 'mini2', 'boss2', 'breaker3', 'boss'], 'the objective walks the chain in order');
assert.deepStrictEqual(L.steps.map(s => s.split(':')[1]), ['LLLLL', 'oLLLL', 'oLoLL', 'oLoLL', 'oooLL', 'ooooL', 'ooooL', 'ooooo'], 'each step opens its door (wing A, wing B, boss room 1, boss room 2, the last door)');
assert.deepStrictEqual(L.steps.map(s => s.split(':')[3]), ['10000000', '11010000', '11110000', '11110000', '11111010', '11111110', '11111110', '11111111'], 'each step\'s room is in reach exactly when its turn comes');
assert(L.lockNames, 'Round 383: the Map screen names a lock (Breaker 2, the gear piece), not its token');
assert(/Face The Chronarch/.test(L.objective) && L.wingNames.join('|') === 'Mainspring Foundry|The Hollow Hour|The Last Second|Chronospire Gate');
// A change of seed in one session gives exactly what a fresh page with that seed gives (no stale caches).
run('newGame()'); run(SIG + '(31337)');
const switched = run(SIG + '(2024)');
const fresh = cp.execFileSync(process.execPath, [__filename, 'sig', '2024'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').find(l => l.startsWith('SIG')).slice(3);
assert.deepStrictEqual(JSON.parse(switched), JSON.parse(fresh), 'doors, patrols and objects after a seed change match a fresh start');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(html.indexOf('assets/tile-worlds.js') < html.indexOf('assets/chrono-gen.js') && html.indexOf('assets/chrono-gen.js') < html.indexOf('assets/world-cards.js'), 'chrono-gen loads after tile-worlds');
console.log('PASS: the Chronospire is generated from the journey seed (with pipe beds, chasms and inlays): sound rooms on three seeds, deterministic, props clear of the roads, older saves restart at the gate, a seed change leaves no stale caches, and the room map\'s locks open in order (breakers, mini-boss gear, bosses).');
