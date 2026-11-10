'use strict';
// =====================================================================
// Round 377 (owner: "procedurally generate the Chronospire on the fly with the bare minimum of assets", a new layout
// once per journey). The room graph, names, levels and roles stay as tools/build_tile_world.py wrote them
// (TILE_WORLD_DATA.chronospire.layout); what is generated from the journey's seed (state.seed) is the inside of every
// room: its roads, squares, sand drifts and buildings.
//   - Each 800x500 room is a 16x10 grid of 50px cells. A road two cells wide runs from each door to a hub; the door on a
//     shared edge sits at the same cells in both rooms. Two 3x3 squares open beside the roads (TILE_WORLD_DATA
//     .chronospire.plazas, where objects stand); boss rooms get an arena and dead ends a court.
//   - The walk mask (tileWorldBits.chronospire, 8px cells) is filled from the grids, so the organic engine, doors,
//     patrols, item placement and the map all work on it as on a painted world.
//   - paintChronoRoom() draws the room: three seamless textures (floor, ground, sand) and sixteen keyed props
//     (assets/environment/chronospire/gen/, made by tools/prepare_chrono_gen.py). The shapes are drawn the dual-grid
//     way (every corner between four cells rounded by its neighbours), with a kerb and a drop shadow.
// A change of seed (a new journey, a loaded or imported save) rebuilds everything and drops the Chronospire entries of
// the caches that do not carry the seed (chronoFlushCaches).
// =====================================================================
const CHRONO_GEN_VERSION = 3, CHRONO_ART_VERSION = '378';
const CG_COLS = 16, CG_ROWS = 10, CG_CELL = 50;
// name: [width, height] of the keyed picture (px), drawn at CHRONO_PROP_SCALE of that in room pixels.
const CHRONO_BUILDINGS = { 'clock-tower': [176, 420], observatory: [341, 420], 'bell-tower': [221, 420], spire: [135, 420], workshop: [383, 420], townhouse: [299, 420], foundry: [368, 420], ruin: [390, 420], hourglass: [343, 420], arch: [304, 420], engine: [420, 368], pavilion: [294, 420] };
const CHRONO_SMALL = { gears: [220, 187], pendulum: [168, 220], crystals: [181, 220], bell: [220, 186] };
const CHRONO_PROP_SCALE = { building: 0.4, small: 0.3, large: 0.42 };
// Round 378: large set pieces, and flat inlays set into courts, arenas and some squares.
const CHRONO_LARGE = { aqueduct: [460, 439], cogwheel: [460, 417], boilers: [429, 460], 'fallen-tower': [432, 460] };
const CHRONO_INLAYS = ['inlay-clock', 'inlay-sun', 'inlay-gears', 'inlay-hourglass'];
// Round 378: two more grounds, laid by smooth noise over the whole world's cells so they run on from room to room:
// beds of steam pipes, and chasms the roads cross like bridges (nothing stands on a chasm).
function chronoNoise(seed, tag, gx, gy, period) {
  const base = chronoHash(seed + ':' + tag);
  const v = (ix, iy) => { let h = base ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const fx = gx / period, fy = gy / period, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy;
}
function chronoTerrain(seed, key) {
  const [cx, cy] = key.split(',').map(Number), memo = {};
  // (x, y) are this room's cells; one beyond each edge is the neighbour's, so shapes meet across the seam.
  const kind = (x, y) => { const k = x + ',' + y; if (k in memo) return memo[k]; const gx = cx * CG_COLS + x, gy = cy * CG_ROWS + y;
    return memo[k] = chronoNoise(seed, 'chasm', gx, gy, 6) > 0.66 ? 'chasm' : chronoNoise(seed, 'pipes', gx, gy, 7) > 0.56 ? 'pipes' : 'gears'; };
  return { kind, chasm: (x, y) => kind(x, y) === 'chasm', pipes: (x, y) => kind(x, y) === 'pipes' };
}

function chronoHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function chronoRng(str) { let a = chronoHash(str) || 1; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function chronoSeed() { return typeof state !== 'undefined' && state && state.seed != null ? String(state.seed) : 'aethercede'; }

// =====================================================================
// Round 379 (owner: "per journey room map"; "boss rooms ... unlocked using a system of breakers ... and mini boss wins
// acquiring loot ... backtracking ... planned for in the initial generation"). The room map itself comes from the seed:
//   - a spanning tree over the 6x9 grid, cut at two edges into three wings: the Gate wing, wing A behind it and wing B
//     behind A. Those two edges are the sealed wing doors. A few extra doors make loops inside a wing.
//   - roles are placed for the order of play: Breaker 1 (Gate wing) opens wing A; the Clockwarden deep in A carries the
//     gear that opens Boss room 1, a dead end back in the Gate wing; that boss frees Breaker 2 (in A), which opens wing B;
//     the Paradox Twin deep in B carries the gear for Boss room 2, a dead end back in A; that boss frees Breaker 3 (in B),
//     which opens The Last Second, a dead end by the gate. Every lock's key lies in rooms open before it (checked).
// The locks themselves are applied by assets/chrono-locks.js.
// =====================================================================
// Round 383 (owner: "the map is what's most stale, it's just a rectangle full of rectangular rooms"): 54 rooms on an
// 8x11 grid, so the world is an irregular shape with arms and gaps, not a full block.
const CHRONO_W = 8, CHRONO_H = 11, CHRONO_ROOMS = 54, CHRONO_LEVELS = [46, 54];
const CHRONO_NAME_A = ['Brass', 'Hourglass', 'Pendulum', 'Gear', 'Cog', 'Tick', 'Escapement', 'Sundial', 'Clockwork', 'Mainspring', 'Chime', 'Copper', 'Second', 'Minute', 'Ratchet', 'Balance', 'Bronze', 'Orrery'];
const CHRONO_NAME_B = ['Stair', 'Gallery', 'Landing', 'Walk', 'Hall', 'Works', 'Loft', 'Bridge', 'Vault', 'Ring', 'Shaft', 'Spiral', 'Arcade', 'Court', 'Lift', 'Ledge', 'Chamber', 'Steps'];
const CHRONO_ROLE_NAMES = { start: 'Chronospire Gate', boss: 'The Last Second', mini1: 'Clockwarden\'s Loft', mini2: 'Paradox Stair', boss1: 'Mainspring Foundry', boss2: 'The Hollow Hour',
  breaker1: 'Gatehouse Breaker', breaker2: 'Foundry Breaker', breaker3: 'Paradox Breaker' };
function chronoGraphTry(seed) {
  const rnd = chronoRng(seed), K = (x, y) => x + ',' + y, xy = k => k.split(',').map(Number);
  // The world's shape: grown a room at a time from near the middle; a free cell touching few rooms is likelier, which makes arms and bays.
  const cells = new Set([K(2 + Math.floor(rnd() * (CHRONO_W - 4)), 3 + Math.floor(rnd() * (CHRONO_H - 6)))]);
  const around = k => { const [x, y] = xy(k); return [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']].filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < CHRONO_W && y + dy < CHRONO_H).map(([dx, dy, d]) => [K(x + dx, y + dy), d]); };
  while (cells.size < CHRONO_ROOMS) {
    const edge = {}; for (const k of cells) for (const [t] of around(k)) if (!cells.has(t)) edge[t] = (edge[t] || 0) + 1;
    const list = Object.keys(edge).sort(), weight = list.map(t => edge[t] === 1 ? 3 : edge[t] === 2 ? 1.2 : 0.35); let r = rnd() * weight.reduce((a, b) => a + b, 0), i = 0;
    while (i < list.length - 1 && (r -= weight[i]) > 0) i++;
    cells.add(list[i]);
  }
  const near = k => around(k).filter(([t]) => cells.has(t)), all = [...cells].sort();
  const start = all[Math.floor(rnd() * all.length)], parent = { [start]: null }, order = [start], active = [start];
  while (active.length) { // a growing tree: mostly the newest room (corridors), sometimes any (branches)
    const i = rnd() < 0.62 ? active.length - 1 : Math.floor(rnd() * active.length), k = active[i], open = near(k).filter(([t]) => !(t in parent));
    if (!open.length) { active.splice(i, 1); continue; }
    const [t] = open[Math.floor(rnd() * open.length)]; parent[t] = k; order.push(t); active.push(t);
  }
  const kids = {}, size = {}, depth = { [start]: 0 }; for (const k of order) { kids[k] = []; size[k] = 1; }
  for (const k of order) if (parent[k]) { kids[parent[k]].push(k); depth[k] = depth[parent[k]] + 1; }
  for (let i = order.length - 1; i > 0; i--) size[parent[order[i]]] += size[order[i]];
  const under = (k, top) => { for (let c = k; c; c = parent[c]) if (c === top) return true; return false; };
  const pick = list => list.length ? list[Math.floor(rnd() * list.length)] : null;
  const doorA = pick(order.filter(k => k !== start && size[k] >= 28 && size[k] <= 37)); if (!doorA) return null;
  const doorB = pick(order.filter(k => k !== doorA && under(k, doorA) && size[k] >= 12 && size[k] <= 18)); if (!doorB) return null;
  const wing = {}; for (const k of order) wing[k] = under(k, doorB) ? 'B' : under(k, doorA) ? 'A' : 'G';
  const leaf = k => !kids[k].length, roles = { start }, taken = new Set([start, doorA, doorB, parent[doorA], parent[doorB]]);
  const best = (w, score, ok = () => true) => { const c = order.filter(k => wing[k] === w && !taken.has(k) && ok(k)).sort((a, b) => score(b) - score(a) || (a < b ? -1 : 1))[0]; if (c) taken.add(c); return c || null; };
  roles.boss = best('G', k => -depth[k], k => leaf(k) && depth[k] >= 2);          // the last door stands near the gate
  roles.boss1 = best('G', k => depth[k], leaf);                                    // a dead end far across the Gate wing
  roles.breaker1 = best('G', k => depth[k] + (leaf(k) ? 3 : 0), k => depth[k] >= 2);
  roles.boss2 = best('A', k => -depth[k], leaf);                                   // a dead end near wing A's door
  roles.mini1 = best('A', k => depth[k]);
  roles.breaker2 = best('A', k => depth[k] + (leaf(k) ? 3 : 0) - (parent[k] === roles.mini1 || parent[roles.mini1] === k ? 20 : 0));
  roles.mini2 = best('B', k => depth[k]);
  roles.breaker3 = best('B', k => depth[k] + (leaf(k) ? 3 : 0) - (parent[k] === roles.mini2 || parent[roles.mini2] === k ? 20 : 0));
  if (Object.values(roles).some(v => !v)) return null;
  const edges = order.filter(k => parent[k]).map(k => [parent[k], k]), dead = new Set([roles.boss, roles.boss1, roles.boss2]), has = new Set(edges.map(e => e.slice().sort().join('|')));
  const loops = []; for (const k of order) for (const [t] of near(k)) if (k < t && wing[k] === wing[t] && !dead.has(k) && !dead.has(t) && !has.has([k, t].sort().join('|'))) loops.push([k, t]);
  for (let n = 0; n < 7 && loops.length; n++) edges.push(loops.splice(Math.floor(rnd() * loops.length), 1)[0]);
  const layout = {}, used = new Set(), roleOf = {}; for (const [r, k] of Object.entries(roles)) roleOf[k] = r;
  // Levels climb in the order of play: the Gate wing, then A, then B; each boss room one above its wing's top.
  const rank = order.slice().sort((a, b) => 'GAB'.indexOf(wing[a]) - 'GAB'.indexOf(wing[b]) || depth[a] - depth[b]), [lo, top] = CHRONO_LEVELS;
  const level = {}; rank.forEach((k, i) => { level[k] = lo + Math.round((top - lo - 2) * i / (rank.length - 1)); });
  level[roles.boss1] = Math.min(top - 1, level[roles.mini1] + 1); level[roles.boss2] = Math.min(top - 1, level[roles.mini2] + 1); level[roles.boss] = top;
  for (const k of order) {
    const h = chronoHash(seed + ':name:' + k); let name = CHRONO_ROLE_NAMES[roleOf[k]], i = 0;
    while (!name || used.has(name)) { name = CHRONO_NAME_A[(h + i * 7) % CHRONO_NAME_A.length] + ' ' + CHRONO_NAME_B[(Math.floor(h / 31) + i * 11) % CHRONO_NAME_B.length]; i++; }
    used.add(name);
    layout[k] = { name, exits: {}, world: xy(k), wing: wing[k], ...(k === start ? {} : { level: level[k], zone: Math.min(8, level[k] - lo + 1) }) };
  }
  for (const [a, b] of edges) { const d = near(a).find(([t]) => t === b)[1]; layout[a].exits[d] = b; layout[b].exits[{ n: 's', s: 'n', e: 'w', w: 'e' }[d]] = a; }
  // The first Nexus Waypoint: an ordinary Gate-wing room exactly three rooms' walk from the gate (loops counted).
  const walk = { [start]: 0 }, wq = [start]; while (wq.length) { const k = wq.shift(); for (const t of Object.values(layout[k].exits)) if (!(t in walk) && wing[t] === 'G') { walk[t] = walk[k] + 1; wq.push(t); } }
  const way = order.filter(k => wing[k] === 'G' && !taken.has(k) && walk[k] === 3).sort((a, b) => Object.keys(layout[b].exits).length - Object.keys(layout[a].exits).length || (a < b ? -1 : 1))[0];
  if (!way) return null;
  return { layout, roles, wing, waypoint: way, doors: { A: [parent[doorA], doorA], B: [parent[doorB], doorB] } };
}
function chronoGraph(seed) {
  for (let i = 0; i < 400; i++) { const g = chronoGraphTry(seed + ':graph:' + i); if (g && chronoGraphSolvable(g)) return g; }
  throw new Error('no Chronospire map for seed ' + seed);
}
// Play the locks in order from the gate: every key must lie in rooms already open. Returns the order of steps, or null.
function chronoGraphSolvable(g) {
  const R = g.roles, lockOf = {}; // room pair -> the step that opens it
  const pair = (a, b) => [a, b].sort().join('|');
  lockOf[pair(...g.doors.A)] = 'breaker1'; lockOf[pair(...g.doors.B)] = 'breaker2';
  const only = k => Object.values(g.layout[k].exits)[0];
  if ([R.boss, R.boss1, R.boss2].some(k => Object.keys(g.layout[k].exits).length !== 1)) return null;
  lockOf[pair(R.boss1, only(R.boss1))] = 'mini1'; lockOf[pair(R.boss2, only(R.boss2))] = 'mini2'; lockOf[pair(R.boss, only(R.boss))] = 'breaker3';
  const needs = { breaker2: 'boss1', breaker3: 'boss2' }, done = new Set(), steps = [];
  for (let round = 0; round < 12; round++) {
    const seen = new Set([R.start]), q = [R.start];
    while (q.length) { const k = q.shift(); for (const t of Object.values(g.layout[k].exits)) { const l = lockOf[pair(k, t)]; if (seen.has(t) || (l && !done.has(l))) continue; seen.add(t); q.push(t); } }
    const next = ['breaker1', 'mini1', 'boss1', 'breaker2', 'mini2', 'boss2', 'breaker3', 'boss'].find(r => !done.has(r) && seen.has(R[r]) && (!needs[r] || done.has(needs[r])));
    if (!next) return null;
    done.add(next); steps.push(next); if (next === 'boss') return steps.join('>') === 'breaker1>mini1>boss1>breaker2>mini2>boss2>breaker3>boss' ? steps : null;
  }
  return null;
}

// The first of the two cells a door takes on its edge: rows 3-5 on a side wall, columns 5-10 on the top or bottom
// (clear of the HUD panel in the top-left corner and the minimap in the bottom-right).
function chronoDoorCell(seed, key, dir) {
  const to = TILE_WORLD_DATA.chronospire.layout[key].exits[dir], pair = [key, to].sort().join('|');
  const r = chronoRng(seed + ':door:' + pair)();
  return dir === 'e' || dir === 'w' ? 3 + Math.floor(r * 3) : 5 + Math.floor(r * 6);
}
function chronoLandingRooms() { // the first room, the waypoint rooms, and every boss and mini-boss room (its enemy stands at the middle)
  const R = TILE_WORLD_DATA.chronospire.roles, out = [R.start], nx = typeof NEXUS_POINTS !== 'undefined' && NEXUS_POINTS.chronospire;
  for (const k of [R.boss, R.boss1, R.boss2, R.mini1, R.mini2].concat(nx ? [nx.start, nx.mid, nx.arrival] : [])) if (k && !out.includes(k)) out.push(k);
  return out;
}
// Round 379: put a generated map into the game's tables (the room table in place, as tile-worlds.js does at load).
let chronoMap = null, chronoApplying = false;
function chronoApplyGraph(g) {
  const d = TILE_WORLD_DATA.chronospire, swap = (target, src) => { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, src); };
  swap(d.layout, g.layout); swap(d.roles, g.roles); chronoMap = g;
  // Every room is 'planned' (the painter, the loose crossings and the preloader ask), though none uses a tile painting.
  swap(d.plan, Object.fromEntries(Object.keys(g.layout).map(k => [k, ['gen/floor', 0, 0]])));
  swap(CHRONO_ROOM_DATA, tileWorldRooms('chronospire', TILE_WORLD_ROLES.chronospire));
  const stops = tileWorldStops('chronospire'), T = TILE_REGIONS.chronospire;
  T.rooms = CHRONO_ROOM_DATA; T.start = d.roles.start; T.stops = stops; T.chests = tileWorldChests('chronospire', stops);
  WORLD_BOSS_ROOMS.chronospire = [d.roles.boss, TILE_WORLD_ROLES.chronospire.boss];
  QUIET_ROOMS.chronospire = stops.quiet;
  const waypoints = typeof FIRST_WAYPOINT_ROOMS !== 'undefined';
  if (waypoints) FIRST_WAYPOINT_ROOMS.chronospire = g.waypoint;
  NEXUS_POINTS.chronospire = waypoints ? { start: g.waypoint, arrival: d.roles.start, mid: stops.mid } : { start: d.roles.start, mid: stops.mid };
  const drop = o => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (k.indexOf('chronospire') >= 0) delete o[k]; };
  if (typeof regionDistanceCache !== 'undefined') drop(regionDistanceCache);
  if (typeof cardsmithRoomCache !== 'undefined') drop(cardsmithRoomCache);
  if (typeof quietItemRoomCache !== 'undefined') drop(quietItemRoomCache);
  if (typeof relayRoomCache !== 'undefined') drop(relayRoomCache);
  if (typeof merchantCache !== 'undefined') drop(merchantCache);
  if (typeof extraChestCache !== 'undefined') drop(extraChestCache);
}
// =====================================================================
// Round 383 (owner: "keep the roads the same but maybe add complexity to them, maybe add diagonals"). A room's floor is
// still straight-edged road, now drawn from shapes on a 32x20 grid of 25px cells:
//   - a stub 100px wide in from each door, then a road to the hub in three legs: straight on, a 45-degree diagonal, and
//     straight again (how far it runs before turning differs from road to road);
//   - an eight-sided hub (an arena in boss rooms, a court where the game drops you in or at a dead end);
//   - sometimes a narrower second road between two door roads that by-passes the hub and leaves an island, and a
//     dead-end spur with a small yard;
//   - eight-sided squares for objects, joined to the nearest road.
// plan.shapes lists them in room pixels for the painter; plan.floor is the same shapes on the grid (a cell is floor when
// its centre lies inside one), which fills the walk mask.
// =====================================================================
const FG_COLS = 32, FG_ROWS = 20, FG_CELL = 25;
function chronoRoomPlan(seed, key) {
  const lay = TILE_WORLD_DATA.chronospire.layout[key], roles = TILE_WORLD_DATA.chronospire.roles, rnd = chronoRng(seed + ':room:' + key);
  const floor = new Uint8Array(FG_COLS * FG_ROWS), sand = new Uint8Array(CG_COLS * CG_ROWS), shapes = [];
  const at = (x, y) => x >= 0 && y >= 0 && x < FG_COLS && y < FG_ROWS && floor[y * FG_COLS + x] === 1;
  // Shapes are in fine-cell units; every shape but a door stub keeps two cells from the room's edge.
  const clampX = (x, r) => Math.max(2 + r, Math.min(FG_COLS - 2 - r, x)), clampY = (y, r) => Math.max(2 + r, Math.min(FG_ROWS - 2 - r, y));
  const each = (x0, y0, x1, y1, f) => { for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(FG_ROWS - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(FG_COLS - 1, Math.ceil(x1)); x++) if (f(x + 0.5, y + 0.5)) floor[y * FG_COLS + x] = 1; };
  const octagon = (cx, cy, rx, ry = rx) => { // a rectangle with its corners cut at 45 degrees
    cx = Math.round(clampX(cx, rx)); cy = Math.round(clampY(cy, ry)); const cut = Math.min(rx, ry) * 0.6;
    each(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry && Math.abs(x - cx) + Math.abs(y - cy) <= rx + ry - cut);
    const P = [[-rx + cut, -ry], [rx - cut, -ry], [rx, -ry + cut], [rx, ry - cut], [rx - cut, ry], [-rx + cut, ry], [-rx, ry - cut], [-rx, -ry + cut]];
    shapes.push({ t: 'poly', pts: P.map(([x, y]) => [(cx + x) * FG_CELL, (cy + y) * FG_CELL]) });
    return [cx, cy];
  };
  const seg = (a, b, r) => each(Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, (x, y) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0;
    return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t) <= r; });
  // From a to b in three legs: `run` cells straight along `axis` ('x' or 'y'), a 45-degree diagonal, then straight to b.
  const road = (a, b, axis, run, w) => {
    const r = w / 2, pts = [a], sx = Math.sign(b[0] - a[0]) || 1, sy = Math.sign(b[1] - a[1]) || 1;
    const p1 = axis === 'x' ? [clampX(a[0] + sx * Math.min(run, Math.abs(b[0] - a[0])), r), a[1]] : [a[0], clampY(a[1] + sy * Math.min(run, Math.abs(b[1] - a[1])), r)];
    const m = Math.min(Math.abs(b[0] - p1[0]), Math.abs(b[1] - p1[1])), p2 = [p1[0] + Math.sign(b[0] - p1[0]) * m, p1[1] + Math.sign(b[1] - p1[1]) * m];
    for (const p of [p1, p2, b]) { const q = pts[pts.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.01) pts.push(p); }
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], r);
    shapes.push({ t: 'road', w: w * FG_CELL, pts: pts.map(([x, y]) => [x * FG_CELL, y * FG_CELL]) });
    return pts;
  };
  const rect = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) floor[y * FG_COLS + x] = 1; shapes.push({ t: 'rect', x: x0 * FG_CELL, y: y0 * FG_CELL, w: (x1 - x0) * FG_CELL, h: (y1 - y0) * FG_CELL }); };
  const along = (pts, f) => { // the point a fraction f of the way along a road
    const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])); let d = f * len.reduce((a, b) => a + b, 0);
    for (let i = 0; i < len.length; i++) { if (d <= len[i] || i === len.length - 1) { const t = len[i] ? Math.min(1, d / len[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; } d -= len[i]; }
    return pts[0];
  };
  // The hub. Rooms the game drops you into at the room's middle (the first room, the waypoint rooms, boss and mini-boss
  // rooms) have it there.
  const landing = chronoLandingRooms().includes(key), boss = [roles.boss, roles.boss1, roles.boss2, roles.mini1, roles.mini2].includes(key);
  const dirs = Object.keys(lay.exits).filter(d => d.length === 1).sort();
  const hub = boss ? octagon(16, 12, 7, 4.5) : landing ? octagon(16, 12, 4) : octagon(9 + Math.floor(rnd() * 15), 6 + Math.floor(rnd() * 8), dirs.length === 1 ? 4 : 3);
  const roads = [];
  for (const d of dirs) {
    const c = chronoDoorCell(seed, key, d) * 2; let from, axis;
    if (d === 'w') { rect(0, c, 4, c + 4); from = [4, c + 2]; axis = 'x'; } else if (d === 'e') { rect(FG_COLS - 4, c, FG_COLS, c + 4); from = [FG_COLS - 4, c + 2]; axis = 'x'; }
    else if (d === 'n') { rect(c, 0, c + 4, 4); from = [c + 2, 4]; axis = 'y'; } else { rect(c, FG_ROWS - 4, c + 4, FG_ROWS); from = [c + 2, FG_ROWS - 4]; axis = 'y'; }
    const span = Math.abs(axis === 'x' ? hub[0] - from[0] : hub[1] - from[1]);
    roads.push(road(from, hub, axis, Math.max(1, Math.floor(rnd() * Math.max(1, span - 2))), 4));
  }
  // A narrower second road between two of the door roads, by-passing the hub: an island between them.
  if (roads.length >= 2 && rnd() < 0.6) {
    const i = Math.floor(rnd() * roads.length), k = (i + 1 + Math.floor(rnd() * (roads.length - 1))) % roads.length;
    const a = along(roads[i], 0.25 + rnd() * 0.2).map(Math.round), b = along(roads[k], 0.25 + rnd() * 0.2).map(Math.round);
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 7) road(a, b, rnd() < 0.5 ? 'x' : 'y', 1 + Math.floor(rnd() * 4), 3);
  }
  // A dead-end spur with a small yard.
  if (!boss && rnd() < 0.55) { const end = [Math.round(clampX(4 + rnd() * (FG_COLS - 8), 3)), Math.round(clampY(4 + rnd() * (FG_ROWS - 8), 3))];
    if (Math.hypot(end[0] - hub[0], end[1] - hub[1]) > 7) { road(hub, end, rnd() < 0.5 ? 'x' : 'y', 2 + Math.floor(rnd() * 4), 3); octagon(end[0], end[1], 2.5); } }
  // Squares for objects: eight-sided, 125px across, a cell clear of every road and joined to the nearest one; never
  // under the HUD panel or the minimap. A crowded room uses its hub.
  const plazas = [], PR = 2.5;
  for (let n = 0; n < 2; n++) {
    const fl = []; for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) if (floor[y * FG_COLS + x]) fl.push([x + 0.5, y + 0.5]);
    const cand = [];
    for (let py = 2 + PR; py <= FG_ROWS - 2 - PR; py++) for (let px = 2 + PR; px <= FG_COLS - 2 - PR; px++) {
      const x = px * FG_CELL, y = py * FG_CELL - 22;
      if (typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(x + dx, y + dy))) continue;
      if (plazas.some(p => Math.hypot(p.px - px, p.py - py) < 8)) continue;
      let best = Infinity, near = null; for (const c of fl) { const dd = Math.max(Math.abs(c[0] - px), Math.abs(c[1] - py)); if (dd < best) { best = dd; near = c; } }
      if (best < PR + 1.2 || best > PR + 6) continue;
      cand.push({ px, py, x, y, near, s: rnd() });
    }
    if (!cand.length) break;
    const c = cand.sort((a, b) => a.s - b.s)[0]; plazas.push(c);
    road([c.px, c.py], [Math.floor(c.near[0]) + 0.5, Math.floor(c.near[1]) + 0.5], Math.abs(c.near[0] - c.px) > Math.abs(c.near[1] - c.py) ? 'x' : 'y', 99, 3); octagon(c.px, c.py, PR);
  }
  if (!plazas.length) plazas.push({ px: hub[0], py: hub[1], x: hub[0] * FG_CELL, y: hub[1] * FG_CELL - 22 });
  // Sand drifts: up to two blobs of open ground on the 50px grid, a cell clear of every road and of the room's edge.
  const atC = (x, y) => at(x * 2, y * 2) || at(x * 2 + 1, y * 2) || at(x * 2, y * 2 + 1) || at(x * 2 + 1, y * 2 + 1);
  const free = (x, y) => { if (x < 1 || y < 1 || x > CG_COLS - 2 || y > CG_ROWS - 2) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (atC(x + dx, y + dy)) return false; return true; };
  for (let b = 0, blobs = Math.floor(rnd() * 3); b < blobs; b++) {
    const open = []; for (let y = 1; y < CG_ROWS - 1; y++) for (let x = 1; x < CG_COLS - 1; x++) if (free(x, y) && !sand[y * CG_COLS + x]) open.push([x, y]);
    if (!open.length) break;
    const blob = [open[Math.floor(rnd() * open.length)]], want = 4 + Math.floor(rnd() * 9);
    sand[blob[0][1] * CG_COLS + blob[0][0]] = 1;
    for (let tries = 0; blob.length < want && tries < 80; tries++) {
      const [x, y] = blob[Math.floor(rnd() * blob.length)], [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
      if (free(x + dx, y + dy) && !sand[(y + dy) * CG_COLS + x + dx]) { sand[(y + dy) * CG_COLS + x + dx] = 1; blob.push([x + dx, y + dy]); }
    }
  }
  // Sand never lies in a chasm.
  { const t = chronoTerrain(seed, key); for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (sand[y * CG_COLS + x] && t.chasm(x, y)) sand[y * CG_COLS + x] = 0; }
  const courts = []; if (boss || landing || dirs.length === 1) courts.push([hub[0] * FG_CELL, hub[1] * FG_CELL, boss ? 170 : 150]);
  for (const p of plazas) if (rnd() < 0.3 && !(p.px === hub[0] && p.py === hub[1])) courts.push([p.px * FG_CELL, p.py * FG_CELL, 120]);
  return { key, floor, sand, shapes, inlays: courts.map(([x, y, size], i) => ({ name: CHRONO_INLAYS[(chronoHash(seed + ':inlay:' + key) + i) % CHRONO_INLAYS.length], x, y, size })),
    hub: [hub[0] * FG_CELL, hub[1] * FG_CELL - 22], plazas: plazas.map(p => [p.x, p.y]), props: null };
}
// Buildings and small props on the open ground: the whole picture clear of roads, squares and each other.
function chronoRoomProps(seed, plan) {
  if (plan.props) return plan.props;
  const rnd = chronoRng(seed + ':props:' + plan.key), out = [], terrain = chronoTerrain(seed, plan.key);
  const chasm = new Uint8Array(CG_COLS * CG_ROWS); for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (terrain.chasm(x, y)) chasm[y * CG_COLS + x] = 1;
  const blocked = (x0, y0, x1, y1, grid, cols = CG_COLS, rows = CG_ROWS, cell = CG_CELL) => { for (let cy = Math.max(0, Math.floor(y0 / cell)); cy <= Math.min(rows - 1, Math.floor(y1 / cell)); cy++) for (let cx = Math.max(0, Math.floor(x0 / cell)); cx <= Math.min(cols - 1, Math.floor(x1 / cell)); cx++) if (grid[cy * cols + cx]) return true; return false; };
  const place = (table, kind, want, tries) => {
    const names = Object.keys(table); let made = 0;
    for (let t = 0; t < tries && made < want; t++) {
      const name = names[Math.floor(rnd() * names.length)], [iw, ih] = table[name], w = iw * CHRONO_PROP_SCALE[kind], h = ih * CHRONO_PROP_SCALE[kind];
      const x = w / 2 + 6 + rnd() * (800 - w - 12), y = h + 6 + rnd() * (500 - h - 12);
      const box = [x - w / 2 + 6, y - h + 8, x + w / 2 - 6, y - 2];
      if (blocked(box[0] - 10, box[1] - 10, box[2] + 10, box[3] + 10, plan.floor, FG_COLS, FG_ROWS, FG_CELL)) continue; // (a drawn diagonal reaches a few px past its cells)
      if (blocked(box[0], y - h * 0.45, box[2], y - 2, chasm)) continue; // nothing stands over a chasm
      if (kind === 'small' && blocked(box[0], box[1], box[2], box[3], plan.sand) && rnd() < 0.6) continue; // few things lie on the sand
      if (out.some(p => name === p.name && Math.hypot(p.x - x, p.y - y) < (kind === 'small' ? 380 : 300))) continue; // the same building twice only far apart
      if (out.some(p => box[0] < p.box[2] - 8 && box[2] > p.box[0] + 8 && box[1] < p.box[3] - 8 && box[3] > p.box[1] + 8)) continue;
      out.push({ name, kind, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), box }); made++;
    }
  };
  place(CHRONO_LARGE, 'large', 2, 60); place(CHRONO_BUILDINGS, 'building', 9, 400); place(CHRONO_SMALL, 'small', 4, 40);
  out.sort((a, b) => a.y - b.y);
  return plan.props = out;
}

// --- The world for the current seed ---
let chronoSeedNow = null, chronoPlans = {}, chronoPlazaTable = {};
function chronoFlushCaches() {
  const mine = k => typeof k === 'string' && k.indexOf('chronospire') >= 0;
  const drop = o => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (mine(k)) delete o[k]; };
  // Every cache keyed by world and room that does not also carry the journey's seed, and the seeded ones for good measure.
  if (typeof organicDoorCache !== 'undefined') { drop(organicDoorCache); drop(organicDoorsCache); }
  if (typeof organicPoints !== 'undefined') { drop(organicPoints); drop(organicMains); drop(organicReach); drop(organicItemCache); }
  if (typeof plazaFitCache !== 'undefined') drop(plazaFitCache);
  if (typeof cardsmithCache !== 'undefined') drop(cardsmithCache);
  if (typeof relaySpotCache !== 'undefined') drop(relaySpotCache);
  if (typeof itemSpotCache !== 'undefined') drop(itemSpotCache);
  if (typeof spotCache !== 'undefined') { drop(spotCache); drop(poiCache); }
  if (typeof itemPadCache !== 'undefined') drop(itemPadCache);
  if (typeof spawnCatalog !== 'undefined') { drop(spawnCatalog); drop(patrolCatalog); }
  if (typeof mapTileCache !== 'undefined') { drop(mapTileCache); drop(mapPatchCache); drop(mapSeamCache); drop(mapRoadCache); drop(mapRoadRawCache); drop(mapRoadAlignCache); }
  if (typeof minimapTerrainKey !== 'undefined') minimapTerrainKey = '';
  if (typeof touchGridCache !== 'undefined') for (const k of [...touchGridCache.keys()]) if (mine(k)) touchGridCache.delete(k);
}
function chronoBuild(seed) {
  const d = TILE_WORLD_DATA.chronospire, w = d.world;
  w.maskW = CHRONO_W * 100; w.maskH = Math.ceil(CHRONO_H * 500 / w.cell); // Round 383: the grid is 8x11 rooms
  chronoApplyGraph(chronoGraph(seed));
  chronoPlans = {}; chronoPlazaTable = {};
  for (const key of Object.keys(d.layout)) { const p = chronoPlans[key] = chronoRoomPlan(seed, key); if (p.plazas.length) chronoPlazaTable[key] = p.plazas; }
  const bits = new Uint8Array(w.maskW * w.maskH);
  for (let my = 0; my < w.maskH; my++) {
    const wy = my * w.cell + w.cell / 2, cy = Math.floor(wy / 500), gy = Math.floor((wy - cy * 500) / FG_CELL);
    for (let mx = 0; mx < w.maskW; mx++) {
      const wx = mx * w.cell + w.cell / 2, cx = Math.floor(wx / 800), p = chronoPlans[cx + ',' + cy];
      if (p && p.floor[gy * FG_COLS + Math.floor((wx - cx * 800) / FG_CELL)]) bits[my * w.maskW + mx] = 1;
    }
  }
  tileWorldBits.chronospire = bits; chronoSeedNow = seed + '|' + (typeof FIRST_WAYPOINT_ROOMS !== 'undefined');
  chronoFlushCaches();
  // The live room table is a copy made by configureRegion: make it again when the map changed under it.
  if (activeRegion === 'chronospire' && !chronoApplying) { chronoApplying = true; try { configureRegion('chronospire'); } finally { chronoApplying = false; } }
}
// Built on first use and again whenever the seed changes (or once waypoints.js has loaded, which moves the first waypoint).
function chronoEnsure() { const s = chronoSeed(); if (s + '|' + (typeof FIRST_WAYPOINT_ROOMS !== 'undefined') !== chronoSeedNow) chronoBuild(s); }
function chronoPlan(key) { chronoEnsure(); return chronoPlans[key] || null; }

Object.defineProperty(TILE_WORLD_DATA.chronospire, 'plazas', { get() { chronoEnsure(); return chronoPlazaTable; }, enumerable: true, configurable: true });
// Everything that reads the Chronospire's ground goes through one of these; each checks the seed first.
{
  const walkBefore = tileWorldWalk;
  tileWorldWalk = function (id) { if (id === 'chronospire') chronoEnsure(); return walkBefore.apply(this, arguments); };
  if (typeof organicDef === 'function') { const defBefore = organicDef; organicDef = function () { if (activeRegion === 'chronospire') chronoEnsure(); return defBefore.apply(this, arguments); }; }
  const configureBefore = configureRegion;
  configureRegion = function () { const was = chronoApplying; chronoApplying = true; try { chronoEnsure(); } finally { chronoApplying = was; } return configureBefore.apply(this, arguments); };
  const newGameBeforeChrono = newGame;
  newGame = function () { const out = newGameBeforeChrono.apply(this, arguments); chronoEnsure(); return out; };
  // A save made on an older layout (the stand-in tiles, or an earlier generator) resumes at its room's hub.
  const restoreBeforeChrono = restoreGame;
  restoreGame = function (s) {
    // The save's own map first, so every migration below sees its rooms.
    if (s) { const sd = s.seed != null ? String(s.seed) : 'aethercede'; if (sd + '|' + (typeof FIRST_WAYPOINT_ROOMS !== 'undefined') !== chronoSeedNow) chronoBuild(sd); }
    if (s && s.chronoGen !== CHRONO_GEN_VERSION) { // Round 379: a new room map: exploration of the Chronospire restarts at its gate (character, deck, gear and boss kills stay)
      const start = chronoGraph(s.seed != null ? String(s.seed) : 'aethercede').roles.start, mine = k => typeof k === 'string' && k.startsWith('chronospire:');
      if (s.regionVisits && Array.isArray(s.regionVisits.chronospire)) s.regionVisits.chronospire = [start];
      if (s.region === 'chronospire') { s.room = start; s.pos = { x: 400, y: 300 }; s.visited = [start]; if (s.regionVisits) s.regionVisits.chronospire = s.visited; s.battle = null; }
      if (s.cooldowns) for (const k of Object.keys(s.cooldowns)) if (mine(k)) delete s.cooldowns[k];
      if (Array.isArray(s.chests)) s.chests = s.chests.filter(c => !mine(c));
      if (s.poi && Array.isArray(s.poi.nexus)) s.poi.nexus = s.poi.nexus.filter(n => !mine(n));
      if (s.poi && Array.isArray(s.poi.used)) s.poi.used = s.poi.used.filter(u => !mine(u));
      if (s.worldRelays && s.worldRelays.chronospire) delete s.worldRelays.chronospire;
    }
    if (s) s.chronoGen = CHRONO_GEN_VERSION;
    const out = restoreBeforeChrono.apply(this, arguments); chronoEnsure(); return out;
  };
  // Wherever a fall-back position (the room's middle) lands off the roads, stand at the room's hub instead.
  const renderBeforeChrono = renderWorld;
  renderWorld = function () {
    if (state && activeRegion === 'chronospire' && !state.battle && state.pos && !walkable(state.room, state.pos.x, state.pos.y)) { const p = chronoPlan(state.room); if (p) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    return renderBeforeChrono.apply(this, arguments);
  };
  const saveBeforeChrono = save;
  save = function () { if (state) state.chronoGen = CHRONO_GEN_VERSION; return saveBeforeChrono.apply(this, arguments); };
}

// --- Painting ---
const chronoImages = {};
function chronoArtImage(name) {
  const src = 'assets/environment/chronospire/gen/' + name + '.webp?v=' + CHRONO_ART_VERSION;
  let img = chronoImages[src]; if (!img) { img = new Image(); img.src = src; chronoImages[src] = img; }
  return img;
}
// The shape of a grid as a white picture, K canvas pixels per room pixel, each corner rounded the dual-grid way: an
// outer corner (both side neighbours empty) is cut to a quarter circle, an inner one (both filled) is filled in.
function chronoShape(grid, K, radius) { // grid: a 16x10 array (edges run on straight), or a lookup (x, y) that also knows the cells one beyond the room
  const c = document.createElement('canvas'); c.width = 800 * K; c.height = 500 * K;
  const g = c.getContext('2d'), T = CG_CELL * K, R = radius * K;
  const at = typeof grid === 'function' ? grid : (x, y) => grid[Math.max(0, Math.min(CG_ROWS - 1, y)) * CG_COLS + Math.max(0, Math.min(CG_COLS - 1, x))] === 1;
  g.fillStyle = '#fff';
  for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (at(x, y)) g.fillRect(x * T, y * T, T, T);
  const corner = (x, y, sx, sy, cut) => {
    const px = (x + (sx > 0 ? 1 : 0)) * T, py = (y + (sy > 0 ? 1 : 0)) * T, qx = sx > 0 ? px - R : px, qy = sy > 0 ? py - R : py;
    g.globalCompositeOperation = cut ? 'destination-out' : 'source-over'; g.fillRect(qx, qy, R, R);
    g.globalCompositeOperation = cut ? 'source-over' : 'destination-out'; g.beginPath(); g.arc(px - sx * R, py - sy * R, R, 0, Math.PI * 2); g.fill();
  };
  for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const inX = x + sx >= 0 && x + sx < CG_COLS, inY = y + sy >= 0 && y + sy < CG_ROWS;
    if (at(x, y)) { if (!at(x + sx, y) && !at(x, y + sy)) corner(x, y, sx, sy, true); }
    else if ((typeof grid === 'function' || inX && inY) && at(x + sx, y) && at(x, y + sy)) corner(x, y, sx, sy, false);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}
function chronoTint(shape, fill) {
  const c = document.createElement('canvas'); c.width = shape.width; c.height = shape.height;
  const g = c.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height);
  return c;
}
// The last few rooms painted are kept, so drawing the world again (it is redrawn on many events) is one copy.
const chronoPainted = new Map();
function paintChronoRoom(canvas, key) {
  const plan = chronoPlan(key); if (!plan || typeof document === 'undefined') return false;
  const done = chronoPainted.get(chronoSeedNow + '#' + key);
  if (done) {
    canvas.width = done.width; canvas.height = done.height; if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
    const c2 = canvas.getContext('2d'); if (c2) c2.drawImage(done, 0, 0);
    if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null; return true;
  }
  const props = chronoRoomProps(chronoSeed(), plan);
  const names = ['ground', 'floor', 'sand', 'pipes', 'chasm', ...new Set(props.map(p => p.name).concat(plan.inlays.map(i => i.name)))], imgs = {};
  for (const n of names) imgs[n] = chronoArtImage(n);
  const waiting = names.map(n => imgs[n]).find(i => !(i.complete && i.naturalWidth));
  if (waiting) {
    if (canvas.dataset) canvas.dataset.pending = '1'; canvas.pendingImage = waiting;
    if (waiting.addEventListener) waiting.addEventListener('load', () => { if (canvas.isConnected) paintChronoRoom(canvas, key); }, { once: true });
    return false;
  }
  const K = 2, W = 800 * K, H = 500 * K; canvas.width = W; canvas.height = H;
  if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // The textures run on from room to room: the pattern starts at the world's corner, not the room's.
  const [cx, cy] = key.split(',').map(Number), offY = (cy * H) % 800, offX = (cx * W) % 800;
  const fill = (g, img) => { g.save(); g.translate(-offX, -offY); g.fillStyle = g.createPattern(img, 'repeat'); g.fillRect(offX, offY, W, H); g.restore(); };
  fill(ctx, imgs.ground);
  ctx.fillStyle = 'rgba(8,6,24,.28)'; ctx.fillRect(0, 0, W, H); // the machinery sits back, so the roads read at a glance
  const layer = (grid, img, radius) => {
    const shape = chronoShape(grid, K, radius), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in'; fill(g, img);
    return { shape, art: c };
  };
  const ring = (pic, r) => { for (let a = 0; a < 8; a++) ctx.drawImage(pic, Math.round(Math.cos(a * Math.PI / 4) * r), Math.round(Math.sin(a * Math.PI / 4) * r)); };
  const terrain = chronoTerrain(chronoSeed(), key), any = f => { for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (f(x, y)) return true; return false; };
  if (any(terrain.pipes)) { // a bed of pipes, sunk a little into the machinery
    const s = layer(terrain.pipes, imgs.pipes, 24);
    ring(chronoTint(s.shape, '#07060f'), 5); ring(chronoTint(s.shape, '#4a3a2a'), 2); ctx.drawImage(s.art, 0, 0);
  }
  if (any(terrain.chasm)) { // a chasm: a lit rim, the dark below, and a shadow falling in from its edge
    const s = layer(terrain.chasm, imgs.chasm, 24), g = s.art.getContext('2d');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(4,2,14,.45)'; g.fillRect(0, 0, W, H);
    const rim = document.createElement('canvas'); rim.width = W; rim.height = H; const rg = rim.getContext('2d');
    rg.fillStyle = '#000'; rg.fillRect(0, 0, W, H); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(s.shape, 0, 0);
    g.shadowColor = 'rgba(0,0,0,.95)'; g.shadowBlur = 50; g.shadowOffsetY = 16; g.drawImage(rim, 0, 0); g.shadowColor = 'transparent';
    ring(chronoTint(s.shape, '#8a6c3a'), 5); ring(chronoTint(s.shape, '#17100a'), 2); ctx.drawImage(s.art, 0, 0);
  }
  if (plan.sand.some(v => v)) {
    const s = layer(plan.sand, imgs.sand, 22);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 18; ctx.drawImage(chronoTint(s.shape, '#3a2c52'), 0, 0); ctx.restore();
    ring(chronoTint(s.shape, '#6b5a86'), 3); ctx.drawImage(s.art, 0, 0);
  }
  // The floor is drawn from the room's shapes: straight-edged roads with mitred corners and 45-degree legs, eight-sided hubs and squares.
  const floorShape = document.createElement('canvas'); floorShape.width = W; floorShape.height = H;
  { const g = floorShape.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'square'; g.lineJoin = 'miter'; g.miterLimit = 4;
    for (const sh of plan.shapes) {
      if (sh.t === 'rect') g.fillRect(sh.x * K, sh.y * K, sh.w * K, sh.h * K);
      else if (sh.t === 'poly') { g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.closePath(); g.fill(); }
      else { g.lineWidth = sh.w * K; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.stroke(); }
    } }
  { // close hairline gaps where two shapes pass within a few pixels of each other
    const copy = document.createElement('canvas'); copy.width = W; copy.height = H; copy.getContext('2d').drawImage(floorShape, 0, 0);
    const g = floorShape.getContext('2d'); for (let a = 0; a < 8; a++) g.drawImage(copy, Math.round(Math.cos(a * Math.PI / 4) * 5), Math.round(Math.sin(a * Math.PI / 4) * 5)); }
  const f = { shape: floorShape, art: document.createElement('canvas') }; f.art.width = W; f.art.height = H;
  { const g = f.art.getContext('2d'); g.drawImage(floorShape, 0, 0); g.globalCompositeOperation = 'source-in'; fill(g, imgs.floor); }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12; ctx.drawImage(chronoTint(f.shape, '#0a0714'), 0, 0); ctx.restore();
  ring(chronoTint(f.shape, '#1c1206'), 9); ring(chronoTint(f.shape, '#b88a3c'), 6); ring(chronoTint(f.shape, '#5a3f18'), 2);
  ctx.drawImage(f.art, 0, 0);
  for (const i of plan.inlays) { ctx.save(); ctx.globalAlpha = 0.94; ctx.drawImage(imgs[i.name], (i.x - i.size / 2) * K, (i.y - i.size / 2) * K, i.size * K, i.size * K); ctx.restore(); }
  for (const p of props) {
    const img = imgs[p.name];
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(p.x * K, (p.y - p.h * 0.07) * K, p.w * 0.46 * K, p.w * 0.16 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, (p.x - p.w / 2) * K, (p.y - p.h) * K, p.w * K, p.h * K);
  }
  // The room's corners fall away into the dark.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(6,4,18,0)'); v.addColorStop(1, 'rgba(6,4,18,.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const keep = document.createElement('canvas'); keep.width = W; keep.height = H; keep.getContext('2d').drawImage(canvas, 0, 0);
  chronoPainted.set(chronoSeedNow + '#' + key, keep); while (chronoPainted.size > 6) chronoPainted.delete(chronoPainted.keys().next().value);
  if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null;
  return true;
}

// Round 383 (owner: "since you are now creating the world procedurally, you should be able to make the map look similar
// to the world"). A room's tile for the Map screen and the minimap: its own roads, hub, squares, loops and spurs drawn
// from plan.shapes in the map's road style (pale kerb, dark asphalt), with the room's objects at the spots where they stand.
function chronoMapTile(key, onReady) {
  const plan = chronoPlan(key); if (!plan || typeof document === 'undefined' || !document.createElement) return null;
  const objs = typeof mapRoomObjects === 'function' ? mapRoomObjects(key) : [], sig = objs.map(o => (o.src || o.glyph) + (o.used ? '·u' : '')).join('|');
  const ck = 'chrono:' + chronoSeedNow + ':' + key + ':' + sig; if (typeof mapTileCache !== 'undefined' && mapTileCache[ck]) return mapTileCache[ck];
  const W = 800, H = 500, tile = document.createElement('canvas'); tile.width = W; tile.height = H;
  const ctx = tile.getContext('2d'); if (!ctx) return null;
  const ground = typeof MAP_PATH_STYLE !== 'undefined' ? MAP_PATH_STYLE : { ground: '#0e1620', block: '#152231' };
  ctx.fillStyle = ground.ground; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ground.block;
  for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) ctx.fillRect(x + 6, y + 6, 28, 28);
  const shape = document.createElement('canvas'); shape.width = W; shape.height = H;
  { const g = shape.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'square'; g.lineJoin = 'miter'; g.miterLimit = 4;
    for (const sh of plan.shapes) {
      if (sh.t === 'rect') g.fillRect(sh.x, sh.y, sh.w, sh.h);
      else if (sh.t === 'poly') { g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
      else { g.lineWidth = sh.w; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    } }
  const style = typeof MAP_ROAD_STYLE !== 'undefined' ? MAP_ROAD_STYLE : { shadow: 'rgba(0,0,0,.35)', kerb: '#cfe6ee', asphalt: '#36424f' };
  const ring = (pic, r) => { for (let a = 0; a < 12; a++) ctx.drawImage(pic, Math.round(Math.cos(a * Math.PI / 6) * r), Math.round(Math.sin(a * Math.PI / 6) * r)); };
  ring(chronoTint(shape, style.shadow), 13); ring(chronoTint(shape, style.kerb), 7); ctx.drawImage(chronoTint(shape, style.asphalt), 0, 0);
  // The room's objects where they stand (dimmed once used).
  let complete = true; const ICON = 104;
  for (const o of objs) {
    const x = Math.max(ICON / 2, Math.min(W - ICON / 2, o.x)), y = Math.max(ICON / 2, Math.min(H - ICON / 2, o.y + 6));
    ctx.globalAlpha = o.used ? 0.45 : 1;
    const img = o.src && typeof Image !== 'undefined' && typeof mapImage === 'function' ? mapImage(o.src, onReady) : null;
    if (img && img.complete && img.naturalWidth) { const k = ICON / Math.max(img.naturalWidth, img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k; ctx.drawImage(img, x - w / 2, y - h / 2, w, h); }
    else { if (img) complete = false;
      ctx.fillStyle = '#16222e'; ctx.strokeStyle = style.kerb; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, ICON / 2 - 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (o.glyph) { ctx.fillStyle = '#eaf6ff'; ctx.font = '700 30px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.glyph, x, y + 1); } }
    ctx.globalAlpha = 1;
  }
  if (complete && typeof mapTileCache !== 'undefined') mapTileCache[ck] = tile;
  return tile;
}
