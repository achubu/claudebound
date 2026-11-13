'use strict';
// =====================================================================
// Round 377 (owner: "procedurally generate the Chronospire on the fly with the bare minimum of assets", a new layout
// once per journey). The room graph, names, levels and roles stay as tools/build_tile_world.py wrote them
// (TILE_WORLD_DATA.chronospire.layout); what is generated from the journey's seed (state.seed) is the inside of every
// room: its roads, squares and buildings.
//   - Each 800x500 room is a 16x10 grid of 50px cells. A road two cells wide runs from each door to a hub; the door on a
//     shared edge sits at the same cells in both rooms. Two 3x3 squares open beside the roads (TILE_WORLD_DATA
//     .chronospire.plazas, where objects stand); boss rooms get an arena and dead ends a court.
//   - The walk mask (chronoWalk, 8px cells) is read from the grids, so the organic engine, doors,
//     patrols, item placement and the map all work on it as on a painted world.
//   - paintChronoRoom() draws the room: seamless textures (floor, ground, pipes, chasm, yard) and sixteen keyed props
//     (assets/environment/chronospire/gen/, made by tools/prepare_chrono_gen.py). The shapes are drawn the dual-grid
//     way (every corner between four cells rounded by its neighbours), with a kerb and a drop shadow.
// A change of seed (a new journey, a loaded or imported save) rebuilds everything and drops the Chronospire entries of
// the caches that do not carry the seed (chronoFlushCaches).
// =====================================================================
const CHRONO_GEN_VERSION = 3, CHRONO_ART_VERSION = '386';
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
  const [cx, cy] = GEN.world(key), memo = {};
  // (x, y) are this room's cells; one beyond each edge is the neighbour's, so shapes meet across the seam.
  const kind = (x, y) => { const k = x + ',' + y; if (k in memo) return memo[k]; const gx = cx * CG_COLS + x, gy = cy * CG_ROWS + y;
    return memo[k] = (GEN.hole ? GEN.hole(seed, gx, gy) : chronoNoise(seed, 'chasm', gx, gy, 6) > 0.66) ? 'chasm' : chronoNoise(seed, 'pipes', gx, gy, 7) > (GEN.bedCut || 0.56) ? 'pipes' : 'gears'; };
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
  const to = GEN.exits(key)[dir], pair = [key, to].sort().join('|');
  // Round 393 (owner: "just go to straight roads, 90 degree angle corners ... don't have any odd shapes"): in a grid theme
  // every east-west street in a row of rooms runs at one height and every north-south street in a column at one place,
  // so the streets cross each room in straight lines and meet at plain crossings, with no jogs.
  const [wx, wy] = GEN.world(key), r = GEN.grid ? chronoRng(seed + ':line:' + (dir === 'e' || dir === 'w' ? 'row' + wy : 'col' + wx))() : chronoRng(seed + ':door:' + pair)();
  return dir === 'e' || dir === 'w' ? 3 + Math.floor(r * 3) : 5 + Math.floor(r * 6);
}
function chronoLandingRooms() { if (GEN.landing) return GEN.landing(); // the first room, the waypoint rooms, and every boss and mini-boss room (its enemy stands at the middle)
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
function chronoRoomPlan(seed, key, opts) {
  const lay = { exits: GEN.exits(key) }, rnd = chronoRng(seed + ':room:' + key);
  // Round 396: `main` marks the cells of main roads (and their squares); a theme's alleys are floor but not main.
  const floor = new Uint8Array(FG_COLS * FG_ROWS), main = new Uint8Array(FG_COLS * FG_ROWS), shapes = []; let MAIN = 1;
  const at = (x, y) => x >= 0 && y >= 0 && x < FG_COLS && y < FG_ROWS && floor[y * FG_COLS + x] === 1;
  // Shapes are in fine-cell units; every shape but a door stub keeps two cells from the room's edge.
  const clampX = (x, r) => Math.max(2 + r, Math.min(FG_COLS - 2 - r, x)), clampY = (y, r) => Math.max(2 + r, Math.min(FG_ROWS - 2 - r, y));
  const each = (x0, y0, x1, y1, f) => { for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(FG_ROWS - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(FG_COLS - 1, Math.ceil(x1)); x++) if (f(x + 0.5, y + 0.5)) { floor[y * FG_COLS + x] = 1; if (MAIN) main[y * FG_COLS + x] = 1; }; };
  const octagon = (cx, cy, rx, ry = rx) => { // a rectangle with its corners cut at 45 degrees
    cx = Math.round(clampX(cx, rx)); cy = Math.round(clampY(cy, ry)); const cut = GEN.square ? 0 : Math.min(rx, ry) * 0.6; // a square theme's hubs are plain boxes
    each(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry && Math.abs(x - cx) + Math.abs(y - cy) <= rx + ry - cut);
    const P = [[-rx + cut, -ry], [rx - cut, -ry], [rx, -ry + cut], [rx, ry - cut], [rx - cut, ry], [-rx + cut, ry], [-rx, ry - cut], [-rx, -ry + cut]];
    shapes.push({ t: 'poly', main: !!MAIN, pts: P.map(([x, y]) => [(cx + x) * FG_CELL, (cy + y) * FG_CELL]) });
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
    shapes.push({ t: 'road', main: !!MAIN, w: w * FG_CELL, pts: pts.map(([x, y]) => [x * FG_CELL, y * FG_CELL]) });
    return pts;
  };
  const rect = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { floor[y * FG_COLS + x] = 1; if (MAIN) main[y * FG_COLS + x] = 1; } shapes.push({ t: 'rect', main: !!MAIN, x: x0 * FG_CELL, y: y0 * FG_CELL, w: (x1 - x0) * FG_CELL, h: (y1 - y0) * FG_CELL }); };
  const along = (pts, f) => { // the point a fraction f of the way along a road
    const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])); let d = f * len.reduce((a, b) => a + b, 0);
    for (let i = 0; i < len.length; i++) { if (d <= len[i] || i === len.length - 1) { const t = len[i] ? Math.min(1, d / len[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; } d -= len[i]; }
    return pts[0];
  };
  // The hub. Rooms the game drops you into at the room's middle (the first room, the waypoint rooms, boss and mini-boss
  // rooms) have it there.
  const landing = chronoLandingRooms().includes(key), boss = GEN.bossRooms().includes(key);
  const dirs = Object.keys(lay.exits).filter(d => d.length === 1).sort();
  // A theme with `grid` (the city: owner, "unnatural looking road paths"): streets run straight from each door and meet at
  // right angles; the crossing lines up with the doors (the north and south doors set its column, east and west its row),
  // so a street through a room is one straight road. No by-pass loops or spurs.
  const doorAt = d => chronoDoorCell(seed, key, d) * 2 + 2, mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const gx = dirs.filter(d => d === 'n' || d === 's').map(doorAt), gy = dirs.filter(d => d === 'e' || d === 'w').map(doorAt);
  // Round 393 (owner: "don't have any odd shapes"): in a grid theme a boss room's square and a landing room's court are
  // centred on the crossing itself, wide enough to take in the room's middle (where the game sets you down and the boss
  // stands), so every edge is a whole road-width or more from the road edges beside it: no small steps.
  const lineX = gx.length ? Math.round(mean(gx)) : 16, lineY = gy.length ? Math.round(mean(gy)) : 12;
  // A court either is the road (2 cells each way) or stands out from it by 2 cells or more, and keeps 4 cells from the room's edges.
  const reach = (d, room) => { const v = Math.min(d ? Math.max(4, d + 2) : 2, room); return v < 4 ? 2 : v; };
  const hub = GEN.grid && boss ? octagon(lineX, lineY, Math.min(7, lineX - 4, FG_COLS - 4 - lineX), Math.min(4.5, lineY - 4, FG_ROWS - 4 - lineY))
    : GEN.grid && landing ? octagon(lineX, lineY, reach(Math.abs(lineX - 16), Math.min(lineX - 4, FG_COLS - 4 - lineX)), reach(Math.abs(lineY - 12), Math.min(lineY - 4, FG_ROWS - 4 - lineY)))
    : boss ? octagon(16, 12, 7, 4.5) : landing && !GEN.grid ? octagon(16, 12, 4)
    : GEN.grid ? ((MAIN = dirs.length === 1 || dirs.some(d => !GEN.alley || !GEN.alley(key, d)) ? 1 : 0), octagon(gx.length ? Math.round(mean(gx)) : 9 + Math.floor(rnd() * 15), gy.length ? Math.round(mean(gy)) : 6 + Math.floor(rnd() * 8), dirs.length === 1 ? 4 : MAIN ? 2 : 1))
    : octagon(9 + Math.floor(rnd() * 15), 6 + Math.floor(rnd() * 8), dirs.length === 1 ? 4 : 3);
  const roads = [];
  // Round 396 (owner: "lets preview that" / "you can begin"): a theme with `alley` has a hierarchy of streets: main roads
  // on a few row and column lines across the whole city, and every other door a narrow alley (2 cells, 50px), so the
  // blocks between main roads are big enough for big buildings.
  for (const d of dirs) {
    const c = chronoDoorCell(seed, key, d) * 2, al = GEN.alley && GEN.alley(key, d), o = al ? 1 : 0; let from, axis; MAIN = al ? 0 : 1;
    if (d === 'w') { rect(0, c + o, 4, c + 4 - o); from = [4, c + 2]; axis = 'x'; } else if (d === 'e') { rect(FG_COLS - 4, c + o, FG_COLS, c + 4 - o); from = [FG_COLS - 4, c + 2]; axis = 'x'; }
    else if (d === 'n') { rect(c + o, 0, c + 4 - o, 4); from = [c + 2, 4]; axis = 'y'; } else { rect(c + o, FG_ROWS - 4, c + 4 - o, FG_ROWS); from = [c + 2, FG_ROWS - 4]; axis = 'y'; }
    const span = Math.abs(axis === 'x' ? hub[0] - from[0] : hub[1] - from[1]);
    roads.push(road(from, hub, axis, GEN.grid ? span : Math.max(1, Math.floor(rnd() * Math.max(1, span - 2))), al ? 2 : 4));
  }
  MAIN = 0;
  // A narrower second road between two of the door roads, by-passing the hub: an island between them.
  if (!GEN.grid && roads.length >= 2 && rnd() < 0.6) {
    const i = Math.floor(rnd() * roads.length), k = (i + 1 + Math.floor(rnd() * (roads.length - 1))) % roads.length;
    const a = along(roads[i], 0.25 + rnd() * 0.2).map(Math.round), b = along(roads[k], 0.25 + rnd() * 0.2).map(Math.round);
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 7) road(a, b, rnd() < 0.5 ? 'x' : 'y', 1 + Math.floor(rnd() * 4), 3);
  }
  // A dead-end spur with a small yard.
  if (!GEN.grid && !boss && rnd() < 0.55) { const end = [Math.round(clampX(4 + rnd() * (FG_COLS - 8), 3)), Math.round(clampY(4 + rnd() * (FG_ROWS - 8), 3))];
    if (Math.hypot(end[0] - hub[0], end[1] - hub[1]) > 7) { road(hub, end, rnd() < 0.5 ? 'x' : 'y', 2 + Math.floor(rnd() * 4), 3); octagon(end[0], end[1], 2.5); } }
  // Squares for objects: eight-sided, 125px across, a cell clear of every road and joined to the nearest one; never
  // under the HUD panel or the minimap. A crowded room uses its hub.
  if (opts && opts.roadsOnly) return { key, floor, main, shapes };
  if (GEN.worldLots) { // Round 399: the squares for objects are street-front lots of the city's plan (genWorld)
    const street = floor.slice(), mine = genWorld(seed).plazas[key] || []; MAIN = 0;
    for (const q of mine) { rect(q.x0, q.y0, q.x1, q.y1); shapes[shapes.length - 1].pave = true; }
    const pl = mine.map(q => [(q.x0 + q.x1) / 2 * FG_CELL, (q.y0 + q.y1) / 2 * FG_CELL - 22]);
    if (!pl.length) pl.push([hub[0] * FG_CELL, hub[1] * FG_CELL - 22]);
    return { key, floor, shapes, inlays: [], hub: [hub[0] * FG_CELL, hub[1] * FG_CELL - 22], plazas: pl, props: null, main, street };
  }
  const street = floor.slice(); // Round 397: the streets alone, before the squares for objects (buildings may stand closer to a square)
  const plazas = [], PR = 2.5;
  for (let n = 0; n < 2; n++) {
    // Chebyshev distance from every cell to the nearest floor cell, and which floor cell that is (one sweep, not a search per candidate).
    const N = FG_COLS * FG_ROWS, dd = new Int16Array(N).fill(-1), nearOf = new Int32Array(N), bq = [];
    for (let i = 0; i < N; i++) if (floor[i]) { dd[i] = 0; nearOf[i] = i; bq.push(i); }
    for (let h = 0; h < bq.length; h++) { const i = bq[h], x = i % FG_COLS, y = (i - x) / FG_COLS;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= FG_COLS || ny >= FG_ROWS) continue; const j = ny * FG_COLS + nx; if (dd[j] < 0) { dd[j] = dd[i] + 1; nearOf[j] = nearOf[i]; bq.push(j); } } }
    const cand = [];
    for (let py = 2 + PR; py <= FG_ROWS - 2 - PR; py++) for (let px = 2 + PR; px <= FG_COLS - 2 - PR; px++) {
      const x = px * FG_CELL, y = py * FG_CELL - 22;
      if (typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(x + dx, y + dy))) continue;
      if (plazas.some(p => Math.hypot(p.px - px, p.py - py) < 8)) continue;
      const ci = Math.floor(py) * FG_COLS + Math.floor(px); if (dd[ci] < 0) continue; const ni = nearOf[ci], near = [ni % FG_COLS + 0.5, Math.floor(ni / FG_COLS) + 0.5], best = Math.max(Math.abs(near[0] - px), Math.abs(near[1] - py));
      if (best < PR + 1.2 || best > PR + 6) continue;
      cand.push({ px, py, x, y, near, s: rnd() });
    }
    if (!cand.length) break;
    const c = cand.sort((a, b) => a.s - b.s)[0]; plazas.push(c);
    const s0 = shapes.length; road([c.px, c.py], [Math.floor(c.near[0]) + 0.5, Math.floor(c.near[1]) + 0.5], Math.abs(c.near[0] - c.px) > Math.abs(c.near[1] - c.py) ? 'x' : 'y', 99, 3); octagon(c.px, c.py, PR);
    if (GEN.pavement) for (let i = s0; i < shapes.length; i++) shapes[i].pave = true; // the city's squares are paved, not road
  }
  if (!plazas.length) plazas.push({ px: hub[0], py: hub[1], x: hub[0] * FG_CELL, y: hub[1] * FG_CELL - 22 });
  // Round 386 (owner: the round inlays "are too large or placed incorrectly"): an inlay only in a court, an arena or a
  // dead end's hub, sized to sit well inside that eight-sided shape (its flat sides are 100px from the middle; an arena's 112px).
  const courts = []; if (GEN.inlays.length && (boss || landing || dirs.length === 1)) courts.push([hub[0] * FG_CELL, hub[1] * FG_CELL, boss ? 150 : 130]);
  return { key, floor, shapes, inlays: courts.map(([x, y, size], i) => ({ name: GEN.inlays[(chronoHash(seed + ':inlay:' + key) + i) % GEN.inlays.length], x, y, size })),
    hub: [hub[0] * FG_CELL, hub[1] * FG_CELL - 22], plazas: plazas.map(p => [p.x, p.y]), props: null, main: GEN.alley ? main : null, street: GEN.alley ? street : null };
}
// =====================================================================
// Round 385 (owner: "the roads look great but the scenery looks like randomly dropped graphics ... any procedural
// technique we can use to create a better looking cityscape?"; "lets use all the techniques"). Scenery follows the
// streets now:
//   1. Districts: smooth noise over the world's rooms zones them into a clock-tower quarter, a foundry quarter, a
//      residential quarter and ruins; a room builds from its own quarter's buildings (a few strays from elsewhere).
//   2. One landmark: the room's largest piece stands in the middle of its biggest stretch of open ground.
//   3. Street-front lots: buildings stand in rows along the roads, each a short setback from the kerb with an even
//      gap to the next, the far side of a street first (their fronts face it), then the other sides.
//   4. Yards: each building stands on cobbled paving that runs to the road, so neighbours' yards join into pavement.
//   5. Street furniture: lamps along the kerbs at regular spacing, a bench or bollards by the squares.
//   6. Back lots: crates, scrap, pipes and barrels behind the rows, thinning with distance from the road.
// Nothing is drawn over a road or a square (the hero walks there), and nothing stands in a chasm.
// =====================================================================
const CHRONO_DISTRICTS = {
  clock: { 'clock-tower': [176, 420], observatory: [341, 420], 'bell-tower': [221, 420], spire: [135, 420], hourglass: [343, 420], pavilion: [294, 420], arch: [304, 420] },
  foundry: { foundry: [368, 420], engine: [420, 368], workshop: [383, 420], smelter: [420, 292], 'pump-house': [420, 321], chimney: [162, 420], 'gear-mill': [420, 407] },
  homes: { townhouse: [299, 420], 'row-house': [262, 420], cottage: [420, 378], 'turret-house': [363, 420], terrace: [418, 420], watchmaker: [379, 420], inn: [420, 394], bakery: [410, 420], bookshop: [331, 420] },
  ruins: { ruin: [390, 420], 'ruined-hall': [420, 414], columns: [420, 346], 'broken-dome': [420, 349], 'broken-stair': [394, 420], arch: [304, 420] }
};
const CHRONO_LANDMARKS = { clock: { 'clock-tower': [176, 420], observatory: [341, 420], hourglass: [343, 420], 'bell-tower': [221, 420] }, foundry: { boilers: [429, 460], aqueduct: [460, 439], 'gear-mill': [420, 407], smelter: [420, 292] },
  homes: { inn: [420, 394], pavilion: [294, 420], 'turret-house': [363, 420], watchmaker: [379, 420] }, ruins: { 'fallen-tower': [432, 460], cogwheel: [460, 417], 'ruined-hall': [420, 414], 'broken-dome': [420, 349] } };
const CHRONO_FURNITURE = { lamp: [44, 200], bollard: [97, 200], railing: [200, 196], bench: [200, 195] };
const CHRONO_CLUTTER = { crates: [200, 184], scrap: [200, 115], 'pipe-stack': [131, 200], barrels: [200, 159], gears: [220, 187], pendulum: [168, 220], crystals: [181, 220], bell: [220, 186] };
const CHRONO_SCENERY_SCALE = { building: 0.3, landmark: 0.42, lamp: 0.32, bench: 0.2, bollard: 0.13, clutter: 0.2 };
// =====================================================================
// Round 387 (owner: "can we begin making neon aftermath more like chronospire? i want the city to look nearly the same but
// be procedurally generated like chronospire"). The generator is no longer the Chronospire's alone: everything that
// differs between worlds is a theme (GEN_THEMES): where a room's exits and roles come from, where the room sits in the
// world, its art folder and textures, its districts and their buildings, its kerb colours. GEN is the theme in use
// (the Chronospire's unless genWith() says otherwise).
// =====================================================================
const CITY_DISTRICTS = {
  market: { 'noodle-bar': [420, 373], arcade: [369, 420], 'pawn-shop': [400, 420], 'capsule-hotel': [339, 420], 'neon-tower': [324, 420], 'corner-store': [381, 420], 'ramen-stall': [420, 408], 'repair-shop': [372, 420], 'tattoo-parlour': [350, 420], cinema: [408, 420] , 'laundromat': [345, 420], 'pharmacy': [345, 420], 'karaoke-bar': [340, 420], 'food-court': [406, 420]},
  homes: { tenement: [350, 420], 'garden-block': [405, 420], 'container-home': [290, 420], 'clinic-block': [321, 420], apartment: [330, 420], 'scrap-shop': [420, 387], 'ac-tower': [241, 420], 'scrap-shack': [413, 420], 'courtyard-block': [420, 350], 'collapsed-block': [393, 420], 'walkup-flats': [361, 420], 'boarding-house': [347, 420], 'shanty-block': [341, 420] },
  tech: { 'server-block': [420, 388], substation: [420, 279], 'parking-garage': [420, 361], 'relay-hut': [253, 420], 'coolant-tower': [271, 420], 'drone-hangar': [420, 382], 'battery-depot': [420, 328], 'conveyor-factory': [400, 420] , 'data-relay': [304, 420], 'robotics-workshop': [366, 420]},
  garden: { pagoda: [344, 420], 'shrine-gate': [383, 420], 'tea-house': [420, 342], 'lantern-court': [420, 354], 'bell-pavilion': [420, 389], greenhouse: [420, 409], 'bridge-house': [420, 409], 'tea-terrace': [420, 329] , 'bathhouse': [420, 318], 'temple-hall': [420, 314]}
};
const GEN_THEMES = {
  chronospire: { id: 'chronospire', art: 'assets/environment/chronospire/gen/', version: () => CHRONO_ART_VERSION,
    exits: key => { const r = TILE_WORLD_DATA.chronospire.layout[key]; return r ? r.exits : null; }, world: key => key.split(',').map(Number),
    bossRooms: () => { const R = TILE_WORLD_DATA.chronospire.roles; return [R.boss, R.boss1, R.boss2, R.mini1, R.mini2]; }, landing: null,
    districtNames: ['clock', 'foundry', 'homes', 'ruins'], districts: CHRONO_DISTRICTS, landmarks: CHRONO_LANDMARKS, furniture: CHRONO_FURNITURE, clutter: CHRONO_CLUTTER, scale: CHRONO_SCENERY_SCALE, inlays: CHRONO_INLAYS,
    tex: {}, kerb: ['#1c1206', '#b88a3c', '#5a3f18'], holeRim: ['#8a6c3a', '#17100a'], bedRim: ['#07060f', '#4a3a2a'], yardRim: ['#14101f', '#6f6a86'], groundShade: 'rgba(8,6,24,.28)', lamp: '255,196,96', vignette: '6,4,18' },
  city: { id: 'city', art: 'assets/environment/city-gen/', version: () => '412',
    exits: key => { const r = typeof CITY_ROOMS !== 'undefined' && CITY_ROOMS[key]; if (!r) return null; const out = {}; for (const [d, v] of Object.entries(r.exits)) if (d.length === 1) out[d] = typeof v === 'string' ? v : v.to; return out; },
    world: key => { const [x, y] = key.split(',').map(Number); return [x, y - 4]; },
    bossRooms: () => Object.keys(CITY_ROOMS).filter(k => CITY_ROOMS[k].enemy && enemies[CITY_ROOMS[k].enemy[0]] && enemies[CITY_ROOMS[k].enemy[0]].boss),
    landing: () => { const nx = typeof NEXUS_POINTS !== 'undefined' && NEXUS_POINTS.city, out = ['0,5', ...GEN_THEMES.city.bossRooms()]; for (const k of nx ? [nx.start, nx.mid, nx.arrival] : []) if (k && !out.includes(k)) out.push(k); return out; },
    districtNames: ['market', 'homes', 'tech', 'garden'], districts: CITY_DISTRICTS,
    landmarks: { market: { arcade: [369, 420], 'neon-tower': [324, 420] }, homes: { tenement: [350, 420], apartment: [330, 420] }, tech: { 'relay-hut': [253, 420], 'server-block': [420, 388] }, garden: { pagoda: [344, 420], 'lantern-court': [420, 354] } },
    furniture: { lamp: [89, 200], bench: [173, 200], bollard: [156, 200] }, rename: { bollard: 'vending' },
    clutter: { car: [220, 141], dumpsters: [220, 143], crates: [220, 216], 'traffic-light': [218, 220], barrier: [200, 175] },
    scale: { building: 0.9, landmark: 0.9, lamp: 0.3, bench: 0.2, bollard: 0.2, clutter: 0.22 }, inlays: [],
    tex: { pipes: 'overgrowth', chasm: 'water' }, kerb: ['#070b10', '#aebcc6', '#4d5a66'], holeRim: ['#5d6b76', '#05080c'], bedRim: ['#04070a', '#22331f'], yardRim: ['#0a0e14', '#8794a0'], groundShade: 'rgba(4,8,18,.2)', yardShade: 'rgba(8,14,28,.55)', round: 20, pavement: 34, grid: true, lampGap: 240, texScale: { floor: 0.8, yard: 0.5, ground: 0.7, 'road-wet': 0.55, 'pavement-old': 0.45, plaza: 0.32, 'rubble-big': 0.8 },
    mix: [{ on: 'ground', tex: 'rubble-big', tag: 'rubble', period: 5, cut: 0.4 }, { on: 'road', tex: 'road-wet', tag: 'wet', period: 6, cut: 0.6 }], blend: true, // Round 398: no kerbs, no paving tile; roads and paths blend into the ground (the plaza tile from Round 397 is unused)
    bedCut: 0.78, feather: 9, square: true, beach: ['#5b5546', 'rgba(36,40,40,.55)', '#cfe6ee'],
    // Owner: "water should be only on the edges with an occasional pond": a ragged band round the edge of the city's
    // 9x6 rooms, and a rare pond inland.
    hole: (seed, gx, gy) => { const d = Math.min(gx, 9 * CG_COLS - 1 - gx, gy, 6 * CG_ROWS - 1 - gy); return d < 0.6 + chronoNoise(seed, 'shore', gx, gy, 5) * 3.4 || (!GEN.topdown && chronoNoise(seed, 'pond', gx, gy, 4) > 0.9); }, // Round 408: no inland ponds in the top-down city (owner: "the circle thing ... looks horrible")
    // Round 394: one storey of each building to the same height on screen (measured from each painting's floors, doors and windows).
    // Round 396: main roads on every third column line and on two row lines; the other streets are alleys.
    alley: (key, d) => { const [wx, wy] = GEN_THEMES.city.world(key); return d === 'e' || d === 'w' ? !(wy === 1 || wy === 4) : wx % 3 !== 1; }, alleyPave: 34, // Round 396 (owner: "standardize curb size"): the same curb and pavement as a main road
    worldLots: true, topdown: true, tilt: 30, alleys: 0.35, keys: () => Object.keys(CITY_ROOMS),
    span: (wx, wy, seed) => typeof CITY_ROOMS !== 'undefined' && CITY_ROOMS[wx + ',' + (wy + 4)] ? genPlan('city', wx + ',' + (wy + 4), seed) : null,
    maxH: 300, // Round 394 (owner: "buildings should probably be around 3 times bigger")
    storey: { 'noodle-bar': 0.75, arcade: 0.88, 'pawn-shop': 0.75, 'capsule-hotel': 1.07, 'neon-tower': 1.56, 'corner-store': 0.94, 'ramen-stall': 0.7, 'repair-shop': 0.83, 'tattoo-parlour': 0.83, cinema: 0.83, tenement: 1.6, 'garden-block': 1.36, 'container-home': 1.36, 'clinic-block': 1.6, apartment: 1.5, 'scrap-shop': 0.94, 'ac-tower': 1.6, 'scrap-shack': 1.25, 'courtyard-block': 1.6, 'collapsed-block': 1.36, 'server-block': 1.19, substation: 1.67, 'parking-garage': 1.32, 'relay-hut': 1.25, 'coolant-tower': 1.25, 'drone-hangar': 1.36, 'battery-depot': 1.15, 'conveyor-factory': 1.07, pagoda: 0.94, 'shrine-gate': 0.75, 'tea-house': 0.7, 'lantern-court': 0.7, 'bell-pavilion': 0.7, greenhouse: 0.7, 'bridge-house': 1.07, 'tea-terrace': 0.75 , 'laundromat': 1.6, 'pharmacy': 1.6, 'karaoke-bar': 1.6, 'food-court': 1.44, 'walkup-flats': 1.6, 'boarding-house': 1.6, 'shanty-block': 1.6, 'data-relay': 1.44, 'robotics-workshop': 0.83, 'bathhouse': 1.25, 'temple-hall': 1.39},
    lamp: '120,230,255', vignette: '2,6,14' }
};
let GEN = GEN_THEMES.chronospire;
function genWith(id, fn) { const was = GEN; GEN = GEN_THEMES[id]; try { return fn(); } finally { GEN = was; } }
// A themed world's room plans, kept per seed (the Chronospire keeps its own, with its room map).
const genPlanCache = {};
function genPlan(id, key, seed = chronoSeed()) {
  const ck = id + ':' + seed; if (!genPlanCache[ck]) { for (const k of Object.keys(genPlanCache)) if (k.startsWith(id + ':')) delete genPlanCache[k]; genPlanCache[ck] = {}; }
  const c = genPlanCache[ck]; if (c[key]) return c[key];
  return genWith(id, () => GEN.exits(key) ? (c[key] = chronoRoomPlan(seed, key)) : null);
}
// =====================================================================
// Round 399 (owner: "improve our algorithm for city generation, it's just not good enough"; "try to find the best 2d
// city generation algorithm and copy that"). After ProbableTrain's MapGenerator: roads first, then the blocks they
// enclose, then each block split in two again and again (along its longer side, near the middle) until every piece
// is a building lot, then one building per lot, sized to it; some lots stay open as parks. The streets stay a straight
// grid (the owner ruled out curves) and come from the rooms' own plans, so doors and walk masks work as before. The
// squares where objects stand are street-front lots, chosen before the buildings. Built once per seed for the world.
// =====================================================================
const genWorldCache = {};
function genWorld(seed) {
  const ck = GEN.id + ':' + seed; if (genWorldCache[ck]) return genWorldCache[ck];
  for (const k of Object.keys(genWorldCache)) if (k.startsWith(GEN.id + ':')) delete genWorldCache[k];
  const keys = GEN.keys(), pos = {}; let NX = 0, NY = 0; for (const k of keys) { const [x, y] = GEN.world(k); pos[k] = [x, y]; NX = Math.max(NX, x + 1); NY = Math.max(NY, y + 1); }
  const CW = NX * FG_COLS, CH = NY * FG_ROWS, cell = new Uint8Array(CW * CH), rnd = chronoRng(seed + ':world:' + GEN.id); // 0 nothing, 1 open ground, 2 street, 3 water or its shore
  for (const k of keys) { const [wx, wy] = pos[k], p = chronoRoomPlan(seed, k, { roadsOnly: true }), t = chronoTerrain(seed, k);
    for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) cell[(wy * FG_ROWS + y) * CW + wx * FG_COLS + x] = p.floor[y * FG_COLS + x] ? 2 : t.chasm(x >> 1, y >> 1) ? 3 : 1; }
  const at = (x, y) => x < 0 || y < 0 || x >= CW || y >= CH ? 0 : cell[y * CW + x];
  { const shore = []; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (cell[y * CW + x] === 1) { for (let d = 1; d <= 2; d++) if ([[d, 0], [-d, 0], [0, d], [0, -d]].some(([a, b]) => at(x + a, y + b) === 3)) { shore.push(y * CW + x); break; } } for (const i of shore) cell[i] = 3; }
  // blocks: the open ground the streets enclose (4-connected)
  const block = new Int32Array(CW * CH).fill(-1), boxes = [];
  for (let i = 0; i < cell.length; i++) if (cell[i] === 1 && block[i] < 0) { const id = boxes.length, q = [i], b = [CW, CH, 0, 0]; block[i] = id;
    for (let h = 0; h < q.length; h++) { const j = q[h], x = j % CW, y = (j - x) / CW; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x + 1); b[3] = Math.max(b[3], y + 1);
      for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + c; if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue; const n = ny * CW + nx; if (cell[n] === 1 && block[n] < 0) { block[n] = id; q.push(n); } } }
    boxes.push(b); }
  // lots: split each block's box in two, again and again, until a piece is lot-sized; keep pieces that are mostly this block
  const LW = 11, LH = 12, MIN = 5, lots = [];
  const inside = (r, id) => { let n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) if (block[y * CW + x] === id) n++; return n / ((r[2] - r[0]) * (r[3] - r[1])); };
  const front = r => { for (let x = r[0]; x < r[2]; x++) for (const y of [r[1] - 1, r[1] - 2, r[3], r[3] + 1]) if (at(x, y) === 2) return true; for (let y = r[1]; y < r[3]; y++) for (const x of [r[0] - 1, r[0] - 2, r[2], r[2] + 1]) if (at(x, y) === 2) return true; return false; };
  const split = (r, id) => { const w = r[2] - r[0], h = r[3] - r[1]; if (w < MIN || h < MIN) return;
    if (w <= LW && h <= LH) { if (inside(r, id) >= 0.85) lots.push({ r, id, front: front(r) }); else if (w > MIN * 2 || h > MIN * 2) { if (w >= h) { const m = r[0] + (w >> 1); split([r[0], r[1], m, r[3]], id); split([m, r[1], r[2], r[3]], id); } else { const m = r[1] + (h >> 1); split([r[0], r[1], r[2], m], id); split([r[0], m, r[2], r[3]], id); } } return; }
    // Round 400 (owner: "a little bit too dense ... need some alleyways"): about a third of the cuts leave a one-cell alley.
    const gap = GEN.alleys && rnd() < GEN.alleys ? 1 : 0;
    if (w / LW >= h / LH) { const m = r[0] + Math.max(MIN, Math.min(w - MIN - gap, Math.round(w * (0.4 + rnd() * 0.2)))); split([r[0], r[1], m, r[3]], id); split([m + gap, r[1], r[2], r[3]], id); }
    else { const m = r[1] + Math.max(MIN, Math.min(h - MIN - gap, Math.round(h * (0.4 + rnd() * 0.2)))); split([r[0], r[1], r[2], m], id); split([r[0], m + gap, r[2], r[3]], id); } };
  boxes.forEach((b, id) => split(b, id));
  const roomOf = (cx, cy) => { const k = keys.find(k2 => pos[k2][0] === Math.floor(cx / FG_COLS) && pos[k2][1] === Math.floor(cy / FG_ROWS)); return k || null; };
  // the squares for objects: up to two street-front lots in each room, wholly inside it, clear of the HUD corners
  const plazas = {}, used = new Set(), holes = {}; // Round 400: a square is cut out of its lot (holes); the rest stays built
  // A square: 5x5 cells inside a street-front lot, against the side the street runs along, joined to the street by a short
  // run of paving; it lies wholly in one room (the lot may not).
  const S5 = 5, squareFor = (r, room) => { const [ox, oy] = room;
    for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const cx = Math.round((r[0] + r[2] - S5) / 2), cy = Math.round((r[1] + r[3] - S5) / 2);
      let q = a ? (a < 0 ? [r[0], cy, r[0] + S5, cy + S5] : [r[2] - S5, cy, r[2], cy + S5]) : (b < 0 ? [cx, r[1], cx + S5, r[1] + S5] : [cx, r[3] - S5, cx + S5, r[3]]);
      let ext = 0; for (; ext <= 3; ext++) { const probe = a ? [a < 0 ? q[0] - 1 - ext : q[2] + ext, q[1] + 2] : [q[0] + 2, b < 0 ? q[1] - 1 - ext : q[3] + ext]; if (at(probe[0], probe[1]) === 2) break; }
      if (ext > 3) continue;
      if (a < 0) q[0] -= ext; else if (a > 0) q[2] += ext; else if (b < 0) q[1] -= ext; else q[3] += ext;
      if (q[0] < ox + 1 || q[1] < oy + 1 || q[2] > ox + FG_COLS - 1 || q[3] > oy + FG_ROWS - 1) continue;
      // Round 412 (owner: "the squares around objects don't make any sense"): a square is a forecourt at a building's
      // entrance, so at least 4 cells of the building must stand behind it (the old cut could empty the whole lot)
      if (GEN.topdown && (b ? (r[3] - r[1]) - S5 - 1 < 4 : (r[2] - r[0]) - S5 - 1 < 4)) continue;
      const out = [q[0] - ox, q[1] - oy, q[2] - ox, q[3] - oy]; out.front = b > 0; return out; }
    return null; };
  for (const k of keys) { const [wx, wy] = pos[k], ox = wx * FG_COLS, oy = wy * FG_ROWS, got = [];
    const cands = lots.map((l, i) => ({ l, i })).filter(({ l, i }) => l.front && !used.has(i) && l.r[2] > ox && l.r[0] < ox + FG_COLS && l.r[3] > oy && l.r[1] < oy + FG_ROWS);
    const ranked = cands.map(c => ({ ...c, q: squareFor(c.l.r, [ox, oy]), s: rnd() })).filter(c => c.q).sort((p, q2) => (q2.q.front - p.q.front) || p.s - q2.s);
    for (const { i, q } of ranked) { if (got.length >= 2) break;
      const mx = (q[0] + q[2]) / 2 * FG_CELL, my = (q[1] + q[3]) / 2 * FG_CELL - 22;
      if (typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(mx + dx, my + dy))) continue;
      if (got.some(g => Math.hypot((g.x0 + g.x1) / 2 - (q[0] + q[2]) / 2, (g.y0 + g.y1) / 2 - (q[1] + q[3]) / 2) < 8)) continue;
      got.push({ x0: q[0], y0: q[1], x1: q[2], y1: q[3] }); if (GEN.topdown) (holes[i] = holes[i] || []).push([q[0] + ox, q[1] + oy, q[2] + ox, q[3] + oy]); else used.add(i); }
    // a room no lot gives a square to: any open 5x5 beside a street in the room; the lots under it stay open
    if (!got.length) { const spots = [];
      for (let y = 1; y + S5 <= FG_ROWS - 1; y++) for (let x = 1; x + S5 <= FG_COLS - 1; x++) { let open = true; for (let j = 0; j < S5 && open; j++) for (let i2 = 0; i2 < S5; i2++) if (at(ox + x + i2, oy + y + j) !== 1) { open = false; break; }
        if (!open) continue; let touch = false; for (let t = 0; t < S5; t++) if (at(ox + x - 1, oy + y + t) === 2 || at(ox + x + S5, oy + y + t) === 2 || at(ox + x + t, oy + y - 1) === 2 || at(ox + x + t, oy + y + S5) === 2) touch = true;
        const mx = (x + S5 / 2) * FG_CELL, my = (y + S5 / 2) * FG_CELL - 22;
        if (touch && !(typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(mx + dx, my + dy)))) spots.push([x, y]); }
      for (const [x, y] of spots.sort(() => rnd() - 0.5)) { if (got.length >= 2) break; if (got.some(g => Math.hypot(g.x0 - x, g.y0 - y) < 8)) continue;
        got.push({ x0: x, y0: y, x1: x + S5, y1: y + S5 }); lots.forEach((l, i) => { if (l.r[0] < ox + x + S5 && l.r[2] > ox + x && l.r[1] < oy + y + S5 && l.r[3] > oy + y) { if (GEN.topdown) (holes[i] = holes[i] || []).push([ox + x, oy + y, ox + x + S5, oy + y + S5]); else used.add(i); } }); } }
    plazas[k] = got; }
  // one building per lot: the biggest painting that fits it, from the room's quarter (sometimes another), never twice in a
  // room and never within REPEAT px of the same one; a lot nothing fits is a park now and then, else open ground
  const REPEAT = 450, C = FG_CELL, buildings = [], parks = [], names = {};
  const sizeOf = (table, name) => { const [iw, ih] = table[name]; let k = GEN.scale.building * (GEN.storey && GEN.storey[name] || 1); if (GEN.maxH && ih * k > GEN.maxH) k = GEN.maxH / ih; return [iw * k, ih * k]; };
  const order = lots.map((l, i) => i).filter(i => !used.has(i)).sort(() => rnd() - 0.5).sort((i, j) => lots[j].front - lots[i].front);
  for (const i of order) { const { r } = lots[i], k = roomOf((r[0] + r[2]) >> 1, (r[1] + r[3]) >> 1); if (!k) continue;
    const district = chronoDistrict(seed, k), lw = (r[2] - r[0]) * C - 12, lh = (r[3] - r[1]) * C - 10, fx = (r[0] + r[2]) / 2 * C, fy = r[3] * C - 6;
    const pool = []; for (const [d, t] of Object.entries(GEN.districts)) for (const n of Object.keys(t)) { const [w, h] = sizeOf(t, n); if (w <= lw && h <= lh * 1.15) pool.push({ n, t, w, h, own: d === district }); }
    const ok = c => !(names[c.n] || []).some(([x, y, rk]) => rk === k || Math.hypot(x - fx, y - fy) < REPEAT);
    const own = pool.filter(c => c.own && ok(c)), other = pool.filter(c => !c.own && ok(c));
    const from = own.length && (rnd() < 0.85 || !other.length) ? own : other;
    if (!from.length) { if (rnd() < 0.35) parks.push(r); continue; }
    from.sort((a, b) => b.w * b.h - a.w * a.h); const c = from[Math.floor(rnd() * Math.min(3, from.length))];
    buildings.push({ name: c.n, x: fx, y: fy, w: c.w, h: c.h }); (names[c.n] = names[c.n] || []).push([fx, fy, k]); }
  // Round 399 (owner's reference: a top-down cyberpunk street map): with `topdown`, every lot that is not a square for an
  // object is a building seen from above that fills it (a few are parks), rather than a painting stood in it.
  // a lot with a square cut out of it is built on what is left: the pieces beside, behind and in front of the square
  // (a cell of sidewalk kept round the square), each at least 4 cells each way
  const cut = (r, h) => { const g = [h[0] - 1, h[1] - 1, h[2] + 1, h[3] + 1]; if (g[2] <= r[0] || g[0] >= r[2] || g[3] <= r[1] || g[1] >= r[3]) return [r];
    return [[r[0], r[1], g[0], r[3]], [g[2], r[1], r[2], r[3]], [Math.max(r[0], g[0]), r[1], Math.min(r[2], g[2]), g[1]], [Math.max(r[0], g[0]), g[3], Math.min(r[2], g[2]), r[3]]].filter(q => q[2] - q[0] >= 4 && q[3] - q[1] >= 4); };
  const lotsPx = [], parkCells = [];
  lots.forEach((l, i) => { let pieces = [l.r]; for (const h of holes[i] || []) pieces = pieces.flatMap(q => cut(q, h));
    for (const q of pieces) { let use = used.has(i) ? 'plaza' : rnd() < 0.08 ? 'park' : 'roof';
      // Round 413 (owner: "make a rule that there can never be edge on edge, there must be tile in between"): a park (edged
      // by a kerb) keeps at least one clear cell of paving from any other park and from the shore (whose strip is an edge too)
      if (use === 'park') { const M = 3, near = (x, y) => at(x, y) === 3; let ok = !parkCells.some(p => q[0] - 2 < p[2] && q[2] + 2 > p[0] && q[1] - 2 < p[3] && q[3] + 2 > p[1]);
        for (let y = q[1] - M; ok && y < q[3] + M; y++) for (let x = q[0] - M; x < q[2] + M; x++) if (near(x, y)) { ok = false; break; }
        if (ok) parkCells.push(q); else use = 'roof'; }
      lotsPx.push({ r: [q[0] * C, q[1] * C, q[2] * C, q[3] * C], use, seed: Math.floor(rnd() * 1e9) }); } });
  return genWorldCache[ck] = { plazas, buildings, parks: parks.map(r => [r[0] * C, r[1] * C, r[2] * C, r[3] * C]), pos, lotsPx, block, CW, CH, blocks: boxes.length };
}
// Round 399: the city seen from straight above (owner's reference). Every lot is a rooftop that fills it: a drop
// shadow, a roof surface, a parapet, rooftop clutter (air units, vents, tanks, stair huts, solar panels, skylights) and a
// neon sign along its street side; parks are planted lots; the streets get zebra crossings, parked cars and pools of
// light. All drawn as placeholders for now (owner: "use placeholders as necessary") until the owner's art arrives.
// Round 402 (owner: "get it ready for new graphics"): art slots for the top-down city. Each slot lists file names under
// assets/environment/city-gen/td/ (no extension); a slot with art draws it, an empty slot keeps the drawn placeholder.
// Add files with `python3 tools/prepare_city_art.py <image> <slot> <name>`, which keys or tiles the image and adds it here.
// Slots: roof, wall, shop (seamless textures: a roof surface; one floor of wall; one floor of shopfront); prop-ac, prop-vent,
// prop-tank, prop-stairs, prop-solar, prop-skylight (rooftop things seen from above); sign-h, sign-v (neon signs, wide and
// tall); car (seen from above, facing east); tree (seen from above); sidewalk (Round 407: seamless paving; the first is
// the city's main paving, the rest by block); edge (Round 409: a border strip run round parks, outer side at the top);
// trim (Round 410: a border strip framing the squares where objects stand). Prompts: tools/art-refresh/city-topdown-prompts.md.
const CITY_TD_ART = { shore: ['shore-crumble'], trim: ['trim-steel', 'trim-brick'], edge: ['edge-granite', 'edge-kerb', 'edge-planter'], sidewalk: ['walk-slabs', 'walk-herringbone', 'walk-cobbles', 'walk-tiles', 'walk-plates'], roof: ['roof-tar', 'roof-asphalt', 'roof-rust', 'roof-concrete', 'roof-plate', 'roof-slate', 'roof-tin', 'roof-tarpaper', 'roof-corrugated', 'roof-slab', 'roof-gravel', 'roof-membrane', 'roof-riveted', 'roof-mossy', 'roof-painted', 'roof-puddles', 'roof-cracked', 'roof-plates', 'roof-grit', 'roof-carpark', 'roof-grating', 'roof-algae', 'roof-patched'], wall: ['wall-concrete', 'wall-brick', 'wall-panel'], shop: ['shop-noodle', 'shop-repair', 'shop-shutters'], 'prop-ac': ['ac-1', 'ac-2', 'ac-3'], 'prop-vent': ['vent-1', 'vent-3'], 'prop-tank': ['tank-1', 'tank-2', 'tank-3'], 'prop-stairs': ['stairs-1', 'stairs-2', 'stairs-3'], 'prop-solar': ['solar-1', 'solar-2'], 'prop-skylight': ['skylight-1', 'skylight-2', 'skylight-3'], 'sign-h': ['sign-h-pink', 'sign-h-mixed', 'sign-h-pink2', 'sign-h-orange'], 'sign-v': ['sign-v-cyan', 'sign-v-teal', 'sign-v-purple', 'sign-v-red'], car: ['car-pickup', 'car-swat', 'car-forklift', 'car-digger', 'car-buggy', 'car-camper', 'car-trike', 'car-armour', 'car-crawler', 'car-sport', 'car-van', 'car-cargo', 'car-taxi', 'car-sedan', 'car-whitevan', 'car-rustpickup'], tree: ['tree-1', 'tree-2', 'tree-3'] };
function cityTdArtNames() { return Object.values(CITY_TD_ART).flat().map(n => 'td/' + n); }
// Round 413 (owner: "the edges dont have rounded corner which is a problem, we need edges that can be curved and used at
// 90 degree angles"): a border strip laid along any outline, as spline and path tools in 2D editors bend a strip. The
// outline of `mask` (alpha over half, the mask's top-left at room px ox,oy) is traced with marching squares every 4 room
// px, the crossing points placed by the mask's own alpha so curves come out smooth, and each little segment draws a
// slice of the strip turned to the outline, its top on the line and its depth T going inward. The slice is taken from the
// strip at the segment's world position, so straight runs read as one strip and it runs on across rooms.
function cityEdgeAlong(ctx, mask, ox, oy, K, art, T, wx, wy) {
  const g = mask.getContext && mask.getContext('2d'); if (!g || !g.getImageData || !art || !art.naturalWidth) return;
  const mw = mask.width, mh = mask.height, D = g.getImageData(0, 0, mw, mh).data, st = 4, nx = Math.floor(mw / (st * K)), ny = Math.floor(mh / (st * K));
  const A = (i, j) => D[(Math.min(mh - 1, Math.round(j * st * K)) * mw + Math.min(mw - 1, Math.round(i * st * K))) * 4 + 3];
  const val = []; for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) row.push(A(i, j)); val.push(row); }
  const k = art.height / T, cross = (va, vb) => va === vb ? 0.5 : Math.max(0, Math.min(1, (127.5 - va) / (vb - va)));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = val[j][i], b = val[j][i + 1], c = val[j + 1][i + 1], d = val[j + 1][i], A2 = a > 127, B2 = b > 127, C2 = c > 127, D2 = d > 127; if (A2 === B2 && B2 === C2 && C2 === D2) continue;
    const pts = []; if (A2 !== B2) pts.push([i + cross(a, b), j]); if (B2 !== C2) pts.push([i + 1, j + cross(b, c)]); if (C2 !== D2) pts.push([i + 1 - cross(c, d), j + 1]); if (D2 !== A2) pts.push([i, j + 1 - cross(d, a)]);
    for (let q = 0; q + 1 < pts.length; q += 2) { const p0 = pts[q], p1 = pts[q + 1], x0 = ox + p0[0] * st, y0 = oy + p0[1] * st, x1 = ox + p1[0] * st, y1 = oy + p1[1] * st, L = Math.hypot(x1 - x0, y1 - y0); if (L < 0.01) continue;
      let ang = Math.atan2(y1 - y0, x1 - x0); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      // the strip goes inward: turn it round if the inside is on the other side
      const tx = Math.round((cx - ox - Math.sin(ang) * 3) * K), ty = Math.round((cy - oy + Math.cos(ang) * 3) * K);
      if (!(tx >= 0 && ty >= 0 && tx < mw && ty < mh && D[(ty * mw + tx) * 4 + 3] > 127)) ang += Math.PI;
      const ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang)), sAlong = (ca >= sa ? wx * 800 + cx : wy * 500 + cy);
      const sx = (((sAlong - L / 2) * k) % art.width + art.width) % art.width, sw = Math.min(art.width - sx, (L + 1.2) * k);
      ctx.save(); ctx.translate(cx * K, cy * K); ctx.rotate(ang); ctx.drawImage(art, sx, 0, sw, art.height, (-L / 2 - 0.6) * K, 0, sw / k * K, T * K); ctx.restore(); } }
}
function paintTopdownCity(ctx, plan, key, W, H, K, imgs, fill) {
  const A = slot => { const l = (CITY_TD_ART[slot] || []).map(n => imgs['td/' + n]).filter(i => i && i.naturalWidth); return l.length ? l : null; };
  const pick = (slot, r) => { const l = A(slot); return l ? l[Math.floor(r() * l.length)] : null; };
  // a seamless picture laid over a rectangle, `th` px tall per repeat, starting at the rectangle's corner
  const tile = (img, x, y, w, h, th) => { const p = ctx.createPattern(img, 'repeat'), k = th * K / img.height; if (p.setTransform) p.setTransform(new DOMMatrix().translate(x * K, y * K).scale(k)); ctx.save(); ctx.fillStyle = p; ctx.fillRect(x * K, y * K, w * K, h * K); ctx.restore(); };
  const seed = chronoSeed(), wl = genWorld(seed), [wx, wy] = GEN.world(key), ox = wx * 800, oy = wy * 500;
  const S = v => v * K, isRoad = (x, y) => x >= 0 && y >= 0 && x < 800 && y < 500 && plan.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)] === 1;
  const lots = wl.lotsPx.filter(l => l.r[2] > ox && l.r[0] < ox + 800 && l.r[3] > oy && l.r[1] < oy + 500).map(l => ({ ...l, r: [l.r[0] - ox, l.r[1] - oy, l.r[2] - ox, l.r[3] - oy] })).sort((a, b) => a.r[3] - b.r[3]);
  const SIN = Math.sin((GEN.tilt || 0) * Math.PI / 180), district = chronoDistrict(seed, key);
  const ROOF = ['#2b303b', '#34302d', '#2a333b', '#3b3538', '#262b34', '#30363a', '#3a3a33'], NEON = ['#ff3b6b', '#36f1ff', '#ff9f1c', '#b85cff', '#4dff8a', '#ff4fd8'];
  // street lights: soft pools along the streets
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let y = 40; y < 500; y += 90) for (let x = 40; x < 800; x += 90) { if (!isRoad(x, y) || isRoad(x, y - 60) && isRoad(x, y + 60) && isRoad(x - 60, y) && isRoad(x + 60, y)) continue;
    const c = chronoHash(seed + ':lamp:' + key + ':' + x + ',' + y), col = c % 3 ? '90,200,255' : '255,120,200', g = ctx.createRadialGradient(S(x), S(y), 0, S(x), S(y), S(70)); g.addColorStop(0, 'rgba(' + col + ',.16)'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(S(x - 70), S(y - 70), S(140), S(140)); }
  ctx.restore();
  // zebra crossings where a street meets a crossing
  ctx.save(); ctx.fillStyle = 'rgba(220,226,232,.55)';
  for (const sh of plan.shapes) { if (sh.t !== 'poly' || sh.pave) continue; const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (const rd of plan.shapes) { if (rd.t !== 'road' || rd.pave || rd.w < 90) continue; const [a, b] = [rd.pts[0], rd.pts[1]]; if (!(a[0] >= x0 && a[0] <= x1 && a[1] >= y0 && a[1] <= y1)) continue;
      const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), hw = rd.w / 2 - 8;
      for (let i = 0; i < 7; i++) { const t = -hw + 6 + i * (2 * hw - 8) / 6; if (dx) { const x = dx > 0 ? x1 + 8 : x0 - 30; ctx.fillRect(S(x), S(a[1] + t - 3), S(22), S(6)); } else { const y = dy > 0 ? y1 + 8 : y0 - 30; ctx.fillRect(S(a[0] + t - 3), S(y), S(6), S(22)); } } } }
  ctx.restore();
  // (Round 412: no frames round the squares; a square is a building's forecourt and reads by the building round it)
  // lots
  for (const l of lots) { const ra = chronoRng(seed + ':art:' + l.seed), rr = chronoRng(seed + ':roof:' + l.seed), [x0, y0, x1, y1] = l.r, I = 4, bx = [x0 + I, y0 + I, x1 - I, y1 - I], bw = bx[2] - bx[0], bh = bx[3] - bx[1];
    if (l.use === 'plaza') continue;
    if (l.use === 'park') { const PR = 16; ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(S(bx[0]), S(bx[1]), S(bw), S(bh), S(PR)); else ctx.rect(S(bx[0]), S(bx[1]), S(bw), S(bh)); ctx.clip(); fill(ctx, imgs.pipes); ctx.fillStyle = 'rgba(0,10,8,.35)'; ctx.fillRect(S(bx[0]), S(bx[1]), S(bw), S(bh));
      for (let i = 0; i < 4 + rr() * 5; i++) { const tx = bx[0] + 14 + rr() * (bw - 28), ty = bx[1] + 14 + rr() * (bh - 28), tr = 12 + rr() * 12, treeArt = pick('tree', ra); if (treeArt) { ctx.drawImage(treeArt, S(tx - tr * 1.3), S(ty - tr * 1.3), S(tr * 2.6), S(tr * 2.6)); continue; } const g = ctx.createRadialGradient(S(tx - 3), S(ty - 3), 1, S(tx), S(ty), S(tr)); g.addColorStop(0, '#2f6a3c'); g.addColorStop(1, '#0e2a19'); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(S(tx + 5), S(ty + 6), S(tr), 0, 7); ctx.fill(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S(tx), S(ty), S(tr), 0, 7); ctx.fill(); }
      ctx.restore();
      // Round 408: a park is edged like a planter: a stone kerb round the grass, so it never meets the paving bare
      const edgeArt = pick('edge', ra);
      if (edgeArt) { // Round 413: the kerb follows the park's rounded outline, round its corners too
        const m = document.createElement('canvas'); m.width = Math.ceil((bw + 8) * K); m.height = Math.ceil((bh + 8) * K); const mg = m.getContext('2d'); mg.fillStyle = '#fff'; mg.beginPath();
        if (mg.roundRect) mg.roundRect(4 * K, 4 * K, bw * K, bh * K, PR * K); else mg.rect(4 * K, 4 * K, bw * K, bh * K); mg.fill();
        const [pwx, pwy] = GEN.world(key); cityEdgeAlong(ctx, m, bx[0] - 4, bx[1] - 4, K, edgeArt, 14, pwx, pwy); }
      else { ctx.save(); ctx.strokeStyle = '#0b0e14'; ctx.lineWidth = S(7); ctx.strokeRect(S(bx[0]), S(bx[1]), S(bw), S(bh)); ctx.restore(); }
      continue; }
    // the street side: the side with a road just beyond it
    const sides = [['s', (bx[0] + bx[2]) / 2, y1 + 20], ['n', (bx[0] + bx[2]) / 2, y0 - 20], ['e', x1 + 20, (bx[1] + bx[3]) / 2], ['w', x0 - 20, (bx[1] + bx[3]) / 2]].filter(([, x, y]) => isRoad(x, y) || isRoad(x, y + (y > y1 ? 20 : -20)));
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(S(bx[0] + 8), S(bx[1] + 10), S(bw), S(bh)); ctx.restore(); // drop shadow
    // Round 400 (owner: "could the buildings be not quite directly over the top? ... maybe 10 degrees?"): seen tilted by
    // GEN.tilt degrees, a building shows its south wall, sin(tilt) of its height, drawn inside its own lot under the roof.
    // Round 401: the tall shopfronts face a street to the south; a building with its street behind it (north) is kept low.
    let blade = false; const southSt = sides.some(sd => sd[0] === 's'), floors = (southSt ? 4 + Math.floor(rr() * 4) : 4 + Math.floor(rr() * 2)) + (district === 'tech' ? 1 : 0) /* Round 412 (owner): at least 4 floors */, dz = Math.min(floors * 36 * SIN, bh * 0.5), wallTop = bx[3] - dz;
    const rb = [bx[0], bx[1], bx[2], wallTop]; bx[3] = wallTop; const bh0 = bh;
    // a roof, sometimes in two parts of different heights
    const parts = bw > 140 && rr() < 0.5 ? (() => { const m = bx[0] + bw * (0.35 + rr() * 0.3); return [[bx[0], bx[1], m, bx[3]], [m, bx[1], bx[2], bx[3]]]; })() : bh > 140 && rr() < 0.5 ? (() => { const m = bx[1] + bh * (0.35 + rr() * 0.3); return [[bx[0], bx[1], bx[2], m], [bx[0], m, bx[2], bx[3]]]; })() : [bx];
    parts.forEach((q, pi) => { const w = q[2] - q[0], h = q[3] - q[1], col = ROOF[Math.floor(rr() * ROOF.length)];
      ctx.save(); ctx.beginPath(); ctx.rect(S(q[0]), S(q[1]), S(w), S(h)); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h));
      const roofArt = pick('roof', ra); if (roofArt) { tile(roofArt, q[0], q[1], w, h, 160); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      else { ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = 'multiply'; fill(ctx, imgs.floor); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (pi) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h)); }
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(140,150,165,.55)'; ctx.lineWidth = S(4); ctx.strokeRect(S(q[0] + 2), S(q[1] + 2), S(w - 4), S(h - 4)); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = S(2); ctx.strokeRect(S(q[0] + 5), S(q[1] + 5), S(w - 10), S(h - 10)); ctx.restore();
      // rooftop clutter
      const items = 2 + Math.floor(rr() * 4), placed = [];
      for (let i = 0; i < items * 3 && placed.length < items; i++) { const kind = Math.floor(rr() * 6), iw = [24, 14, 30, 34, 46, 22][kind], ih = [18, 14, 30, 26, 28, 14][kind], ix = q[0] + 10 + rr() * (w - 20 - iw), iy = q[1] + 10 + rr() * (h - 20 - ih);
        if (w < iw + 22 || h < ih + 22 || placed.some(p => ix < p[2] + 10 && ix + iw > p[0] - 10 && iy < p[3] + 10 && iy + ih > p[1] - 10)) continue; placed.push([ix, iy, ix + iw, iy + ih]);
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(S(ix + 4), S(iy + 5), S(iw), S(ih));
        const propArt = pick(['prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight'][kind], ra);
        if (propArt) { const k2 = Math.min(iw / propArt.width, ih / propArt.height), // inside its own box: never over a neighbour
           dw = propArt.width * k2, dh = propArt.height * k2; ctx.drawImage(propArt, S(ix + (iw - dw) / 2), S(iy + (ih - dh) / 2), S(dw), S(dh)); }
        else if (kind === 0) { ctx.fillStyle = '#7d8590'; ctx.fillRect(S(ix), S(iy), S(iw), S(ih)); ctx.strokeStyle = '#3d434b'; ctx.lineWidth = S(1.5); ctx.beginPath(); ctx.arc(S(ix + iw / 2), S(iy + ih / 2), S(ih / 2 - 3), 0, 7); ctx.stroke(); }
        else if (kind === 1) { ctx.fillStyle = '#5c636c'; ctx.beginPath(); ctx.arc(S(ix + 7), S(iy + 7), S(7), 0, 7); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(S(ix + 7), S(iy + 7), S(3), 0, 7); ctx.fill(); }
        else if (kind === 2) { ctx.fillStyle = '#6b5a4a'; ctx.beginPath(); ctx.arc(S(ix + 15), S(iy + 15), S(15), 0, 7); ctx.fill(); ctx.strokeStyle = '#3a3029'; ctx.lineWidth = S(2); ctx.beginPath(); ctx.arc(S(ix + 15), S(iy + 15), S(10), 0, 7); ctx.stroke(); }
        else if (kind === 3) { ctx.fillStyle = '#4a4f57'; ctx.fillRect(S(ix), S(iy), S(iw), S(ih)); ctx.fillStyle = '#2a2e34'; ctx.fillRect(S(ix + 4), S(iy + ih - 9), S(12), S(9)); }
        else if (kind === 4) { ctx.fillStyle = '#1d2a44'; ctx.fillRect(S(ix), S(iy), S(iw), S(ih)); ctx.strokeStyle = '#4f6a9a'; ctx.lineWidth = S(1); for (let gx = ix + 9; gx < ix + iw; gx += 9) { ctx.beginPath(); ctx.moveTo(S(gx), S(iy)); ctx.lineTo(S(gx), S(iy + ih)); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(S(ix), S(iy + ih / 2)); ctx.lineTo(S(ix + iw), S(iy + ih / 2)); ctx.stroke(); }
        else { ctx.fillStyle = 'rgba(255,210,120,.85)'; ctx.shadowColor = 'rgba(255,190,90,.9)'; ctx.shadowBlur = S(10); ctx.fillRect(S(ix), S(iy), S(iw), S(ih)); }
        ctx.restore(); } });
    if (dz > 3) { const wall = ctx.createLinearGradient(0, S(wallTop), 0, S(wallTop + dz)); wall.addColorStop(0, '#3a3f4a'); wall.addColorStop(1, '#1c1f27');
      ctx.save(); ctx.fillStyle = wall; ctx.fillRect(S(bx[0]), S(wallTop), S(bw), S(dz)); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(S(bx[0]), S(wallTop), S(bw), S(1.5));
      const rowH = dz / floors, shopF = southSt && floors > 1 ? floors - 1 : -1;
      const wallArt = pick('wall', ra), shopArt = pick('shop', ra); if (wallArt) tile(wallArt, bx[0], wallTop, bw, shopF >= 0 ? dz - rowH : dz, rowH);
      if (!wallArt) for (let f = 0; f < floors; f++) { if (f === shopF) continue; const yy = wallTop + f * rowH + rowH * 0.3, wh = Math.max(1.5, rowH * 0.45); for (let xx = bx[0] + 6; xx < bx[2] - 10; xx += 15) { const lit = rr() < 0.38; ctx.fillStyle = lit ? 'rgba(255,205,120,.9)' : 'rgba(40,60,90,.8)'; if (lit) { ctx.shadowColor = 'rgba(255,190,90,.8)'; ctx.shadowBlur = S(4); } else ctx.shadowBlur = 0; ctx.fillRect(S(xx), S(yy), S(8), S(wh)); } }
      if (shopF >= 0) { // Round 401 (owner: 30 degrees): a shopfront at street level: a lit window band, doors, an awning
        const y0 = wallTop + shopF * rowH, col = NEON[Math.floor(rr() * NEON.length)];
        if (shopArt) tile(shopArt, bx[0], y0, bw, rowH, rowH); else {
        ctx.fillStyle = 'rgba(255,214,150,.55)'; ctx.shadowColor = 'rgba(255,200,120,.8)'; ctx.shadowBlur = S(8); ctx.fillRect(S(bx[0] + 6), S(y0 + rowH * 0.25), S(bw - 12), S(rowH * 0.6)); ctx.shadowBlur = 0;
        for (let xx = bx[0] + 22 + rr() * 30; xx < bx[2] - 22; xx += 70 + rr() * 50) { ctx.fillStyle = '#0d1016'; ctx.fillRect(S(xx), S(y0 + rowH * 0.2), S(12), S(rowH * 0.8)); ctx.fillStyle = 'rgba(255,220,160,.35)'; ctx.fillRect(S(xx + 2), S(y0 + rowH * 0.3), S(8), S(rowH * 0.65)); }
        ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(S(bx[0] + 4), S(y0), S(bw - 8), S(Math.max(3, rowH * 0.2))); ctx.globalAlpha = 1; }
        if (floors >= 3 && rr() < 0.75) { blade = true; // a blade sign down the upper floors
          const bxp = rr() < 0.5 ? bx[0] + 10 : bx[2] - 22, bt = wallTop + rowH * 0.3, bl = y0 - bt - 4, nc = NEON[Math.floor(rr() * NEON.length)];
          ctx.fillStyle = '#0b0d14'; ctx.fillRect(S(bxp), S(bt), S(12), S(bl)); ctx.strokeStyle = nc; ctx.shadowColor = nc; ctx.shadowBlur = S(12); ctx.lineWidth = S(1.5); ctx.strokeRect(S(bxp + 1), S(bt + 1), S(10), S(bl - 2));
          ctx.fillStyle = nc; for (let g = bt + 5; g < bt + bl - 7; g += 9) ctx.fillRect(S(bxp + 3.5), S(g), S(5), S(5)); ctx.shadowBlur = 0;
          const vArt = pick('sign-v', ra); if (vArt) { const k2 = 16 / vArt.width; ctx.drawImage(vArt, S(bxp - 2), S(bt), S(16), S(Math.min(bl, vArt.height * k2))); } } }
      ctx.restore(); }
    void bh0;
    // a neon sign on the street side
    // Round 407 (owner: "billboards should only be placed on the front side of buildings never the back side ... and neon
    // signs"): a sign only on a building whose street is in front (south): a board along the front roof edge, unless the
    // front wall already carries a blade sign. Never on a back or side wall.
    if (southSt && !blade && rr() < 0.7) { const sd = 's', col = NEON[Math.floor(rr() * NEON.length)], long = 50 + rr() * Math.min(90, (sd === 'n' || sd === 's' ? bw : bh) - 60);
      if (long > 40) { let sx, sy, sw, sh2; if (sd === 's') { sx = bx[0] + 16 + rr() * Math.max(0, bw - 32 - long); sy = bx[3] - 6; sw = long; sh2 = 12; } else if (sd === 'n') { sx = bx[0] + 16 + rr() * Math.max(0, bw - 32 - long); sy = bx[1] - 6; sw = long; sh2 = 12; } else { sx = sd === 'e' ? bx[2] - 6 : bx[0] - 6; sy = bx[1] + 16 + rr() * Math.max(0, bh - 32 - long); sw = 12; sh2 = long; }
        ctx.save(); ctx.fillStyle = '#0b0d14'; ctx.fillRect(S(sx), S(sy), S(sw), S(sh2)); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = S(14); ctx.lineWidth = S(2); ctx.strokeRect(S(sx + 1.5), S(sy + 1.5), S(sw - 3), S(sh2 - 3));
        const hArt = pick(sw > sh2 ? 'sign-h' : 'sign-v', ra); if (hArt) ctx.drawImage(hArt, S(sx), S(sy), S(sw), S(sh2));
        else { ctx.fillStyle = col; const n = Math.floor(long / 12); for (let i = 0; i < n; i++) { const g0 = 6 + i * 12; if (sw > sh2) ctx.fillRect(S(sx + g0), S(sy + 3.5), S(6), S(5)); else ctx.fillRect(S(sx + 3.5), S(sy + g0), S(5), S(6)); } }
        ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(S(sx + sw / 2), S(sy + sh2 / 2), 0, S(sx + sw / 2), S(sy + sh2 / 2), S(long * 0.8)); g.addColorStop(0, col + '33'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.shadowBlur = 0; ctx.fillRect(S(sx + sw / 2 - long), S(sy + sh2 / 2 - long), S(long * 2), S(long * 2)); ctx.restore(); } } }
  // Round 410: cars last, so no lot, park or border is ever drawn over one
  // parked cars along the main streets
  for (const rd of plan.shapes) { if (rd.t !== 'road' || rd.pave || rd.w < 90) continue; const rr = chronoRng(seed + ':cars:' + key + ':' + rd.pts.join());
    for (let i = 1; i < rd.pts.length; i++) { const a = rd.pts[i - 1], b = rd.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), hz = Math.abs(b[1] - a[1]) < 1;
      for (let d = 70; d < L - 70; d += 80 + rr() * 120 /* Round 407: past a car's length, so parked cars never overlap */) { if (rr() < 0.45) continue; const t = d / L, cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t, side = rr() < 0.5 ? -1 : 1, off = hz ? (side < 0 ? rd.w / 2 - 36 : rd.w / 2 - 26) : rd.w / 2 - 30; // Round 410 (owner: "a vehicle behind the border"): the whole car inside the street (an upright car is 56px wide, its top 60% above its foot)
        const px = hz ? cx : cx + side * off, py = hz ? cy + side * off : cy, w = hz ? 46 : 22, h = hz ? 22 : 46, col = ['#c9a227', '#8a1c2b', '#2d4f7c', '#d8d8d8', '#1d1d1d', '#3f6b4a'][Math.floor(rr() * 6)];
        const carArt = pick('car', rr); if (carArt) { // painted at the 3/4 angle, so stood upright, not turned with the street; half face the other way
          const L2 = 56, T2 = L2 * carArt.height / carArt.width; ctx.save(); ctx.translate(S(px), S(py)); if (rr() < 0.5) ctx.scale(-1, 1); ctx.drawImage(carArt, S(-L2 / 2), S(-T2 * 0.6), S(L2), S(T2)); ctx.restore(); continue; }
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(S(px - w / 2 + 3), S(py - h / 2 + 4), S(w), S(h)); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(S(px - w / 2), S(py - h / 2), S(w), S(h), S(5)) : ctx.rect(S(px - w / 2), S(py - h / 2), S(w), S(h)); ctx.fill();
        ctx.fillStyle = 'rgba(20,30,45,.85)'; if (hz) ctx.fillRect(S(px - w / 2 + 12), S(py - h / 2 + 3), S(w - 26), S(h - 6)); else ctx.fillRect(S(px - w / 2 + 3), S(py - h / 2 + 12), S(w - 6), S(h - 26)); ctx.restore(); } } }
}
function chronoDistrict(seed, key) {
  const [cx, cy] = GEN.world(key), a = chronoNoise(seed, 'district', cx, cy, 1.9), b = chronoNoise(seed, 'district2', cx, cy, 1.9), n = GEN.districtNames;
  return a > 0.5 ? (b > 0.5 ? n[0] : n[1]) : (b > 0.5 ? n[2] : n[3]);
}
function chronoSceneryNames() { const out = new Set(), old = GEN.id === 'chronospire' ? [CHRONO_BUILDINGS, CHRONO_SMALL, CHRONO_LARGE] : []; for (const t of [...Object.values(GEN.districts), ...Object.values(GEN.landmarks), GEN.clutter, ...old]) for (const n of Object.keys(t)) out.add(n); for (const k of Object.keys(GEN.furniture)) out.add((GEN.rename && GEN.rename[k]) || k); return [...out]; }
function chronoRoomProps(seed, plan) {
  if (plan.props) return plan.props;
  const rnd = chronoRng(seed + ':props:' + plan.key), out = [], yards = [], terrain = chronoTerrain(seed, plan.key), district = chronoDistrict(seed, plan.key);
  const F = plan.floor, C = FG_CELL;
  // How far each 25px cell is from the nearest road or square, in cells (a breadth-first sweep).
  const dist = new Int16Array(FG_COLS * FG_ROWS).fill(-1), q = [];
  for (let i = 0; i < F.length; i++) if (F[i]) { dist[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % FG_COLS, y = (i - x) / FG_COLS;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= FG_COLS || ny >= FG_ROWS) continue; const n = ny * FG_COLS + nx; if (dist[n] < 0) { dist[n] = dist[i] + 1; q.push(n); } } }
  // Round 394 (owner: "buildings should probably be around 3 times bigger"): a theme with `span` lets a building's picture
  // run past the room's east and north edges into the next room (its foot stays in its own room). Those rooms see it,
  // keep clear of it and draw their part: a room takes in the buildings of its west, south and south-west neighbours.
  const [RX, RY] = GEN.world(plan.key), nb = (dx, dy) => GEN.span ? GEN.span(RX + dx, RY + dy, seed) : null;
  if (GEN.span && !GEN.worldLots) for (const [dx, dy] of [[-1, 0], [0, 1], [-1, 1]]) { const np = nb(dx, dy); if (!np) continue;
    for (const p of chronoRoomProps(seed, np)) { if (p.foreign || (p.kind !== 'building' && p.kind !== 'landmark')) continue;
      const box = [p.box[0] + dx * 800, p.box[1] + dy * 500, p.box[2] + dx * 800, p.box[3] + dy * 500];
      if (box[2] > 0 && box[0] < 800 && box[3] > 0 && box[1] < 500) out.push({ ...p, x: p.x + dx * 800, y: p.y + dy * 500, box, foreign: true }); } }
  // and no building one of the eight rooms around it uses: rooms are made in order (south rows first, west to east), so
  // each room checks the four neighbours made before it (west, south-west, south, south-east), which covers every pair.
  // Round 396: with big buildings that is too few names, so it is by distance instead: no building within REPEAT_GAP px of
  // the same one in those four rooms (measured across the seam), as well as never twice in a room.
  const nearUse = []; if (GEN.span && !GEN.worldLots) for (const [dx, dy] of [[-1, 0], [-1, 1], [0, 1], [1, 1]]) { const np = nb(dx, dy); if (np) for (const p of chronoRoomProps(seed, np)) if (!p.foreign && (p.kind === 'building' || p.kind === 'landmark')) nearUse.push([p.name, p.x + dx * 800, p.y + dy * 500]); }
  const REPEAT_GAP = 400, banned = { has: () => false }, tooNear = (name, x, y) => nearUse.some(([n, ux, uy]) => n === name && Math.hypot(ux - x, uy - y) < REPEAT_GAP);
  const cellOf = (which, cx, cy) => { const arr = q => which === 1 ? q.main || q.floor : which === 2 ? q.street || q.floor : q.floor;
    if (cx >= 0 && cy >= 0 && cx < FG_COLS && cy < FG_ROWS) return arr(plan)[cy * FG_COLS + cx];
    const dx = Math.floor(cx / FG_COLS), dy = Math.floor(cy / FG_ROWS), np = nb(dx, dy); return np ? arr(np)[(cy - dy * FG_ROWS) * FG_COLS + (cx - dx * FG_COLS)] : 1; };
  const floorAt = (cx, cy) => cellOf(0, cx, cy);
  const streetIn = (x0, y0, x1, y1) => { for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) if (cellOf(2, cx, cy)) return true; return false; };
  // Round 396: main roads (with their pavement) keep big pieces BIG_CLEAR away; an alley only ALLEY_CLEAR.
  const mainIn = (x0, y0, x1, y1) => { for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) if (cellOf(1, cx, cy)) return true; return false; };
  const floorIn = GEN.span ? (x0, y0, x1, y1) => { for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) if (floorAt(cx, cy)) return true; return false; }
    : (x0, y0, x1, y1) => { for (let cy = Math.max(0, Math.floor(y0 / C)); cy <= Math.min(FG_ROWS - 1, Math.floor(y1 / C)); cy++) for (let cx = Math.max(0, Math.floor(x0 / C)); cx <= Math.min(FG_COLS - 1, Math.floor(x1 / C)); cx++) if (F[cy * FG_COLS + cx]) return true; return false; };
  const chasmIn = (x0, y0, x1, y1) => { for (let cy = Math.floor(y0 / CG_CELL); cy <= Math.floor(y1 / CG_CELL); cy++) for (let cx = Math.floor(x0 / CG_CELL); cx <= Math.floor(x1 / CG_CELL); cx++) if (terrain.chasm(cx, cy)) return true; return false; };
  const isFloor = (x, y) => x >= 0 && y >= 0 && x < 800 && y < 500 && F[Math.floor(y / C) * FG_COLS + Math.floor(x / C)] === 1;
  // A picture with its foot at (x, y): its whole box clear of roads (the hero walks there), its base clear of chasms, inside the room, and clear of the others.
  // Round 391 (owner: "set up clear rules that position buildings only on certain terrain, curb tiles should only hold
  // small objects like street lamps and benches"). Placement rules by kind:
  //   - roads and squares: nothing (the hero walks there);
  //   - pavement (a theme's strip along the roads, GEN.pavement px wide): street furniture only (lamps, benches, bollards);
  //   - open ground beyond the pavement: buildings, landmarks and clutter; never a chasm or water hole.
  // `clear` is how far a piece's whole picture keeps from roads and squares: past the pavement for big pieces.
  // Owner: "no buildings should overlap a curb": big pieces keep past the pavement and its 9px kerb border, with a margin.
  // Round 399: with no kerb or pavement drawn (`blend`), buildings stand close to the road, as on a real street.
  const PAVE = GEN.blend ? 0 : GEN.pavement || 0, BIG_CLEAR = GEN.blend ? 18 : PAVE ? PAVE + 18 : 9, ALLEY_CLEAR = GEN.blend ? 16 : (GEN.alleyPave || 0) + 14;
  const fits = (x, y, w, h, gap, clear = BIG_CLEAR) => {
    const box = [x - w / 2 + 4, y - h + 6, x + w / 2 - 4, y - 1];
    if (GEN.span ? (box[0] < 4 || box[3] > 496 || x >= 796 || box[2] > 1590 || box[1] < -490) : (box[0] < 4 || box[1] < 4 || box[2] > 796 || box[3] > 496)) return null;
    const ac = Math.min(clear, ALLEY_CLEAR);
    if ((plan.main && GEN.span ? floorIn(box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6) || streetIn(box[0] - ac, box[1] - ac, box[2] + ac, box[3] + ac) || mainIn(box[0] - clear, box[1] - clear, box[2] + clear, box[3] + clear) : floorIn(box[0] - clear, box[1] - clear, box[2] + clear, box[3] + clear)) || chasmIn(box[0], y - h * 0.4, box[2], y - 1)) return null;
    if (out.some(p => box[0] < p.box[2] + gap && box[2] > p.box[0] - gap && box[1] < p.box[3] + gap && box[3] > p.box[1] - gap)) return null;
    return box;
  };
  // Owner: "non building objects such as lamps benches barriers should never be grouped, keep them far apart, never 2 or 3
  // next to each other". Every small piece (furniture and clutter) stands SMALL_GAP px from every other small piece.
  const SMALL = { lamp: 1, bench: 1, bollard: 1, clutter: 1 }, SMALL_GAP = 165;
  // Round 393 (owner: "i'm seeing buildings of the same type side by side ... shouldn't allow the same building more than
  // once per room"): a room never repeats a building, and two rooms never put the same one face to face across their
  // shared edge. Each building is given a side of every seam from the seed; within EDGE px of a room's east or west edge
  // only buildings whose side differs from the room's column parity may stand (the room beyond needs the other side),
  // and the same along the north and south edges by row. So the two buildings either side of a seam always differ.
  const [WX, WY] = GEN.world(plan.key), EDGE = 130, side = (name, axis) => chronoHash(seed + ':side:' + axis + ':' + name) & 1;
  const seamOk = (name, box) => GEN.span ? !tooNear(name, (box[0] + box[2]) / 2, box[3]) :  ((box[0] > EDGE && box[2] < 800 - EDGE) || side(name, 'x') !== (WX & 1)) && ((box[1] > EDGE && box[3] < 500 - EDGE) || side(name, 'y') !== (WY & 1));
  const lonely = (x, y) => !out.some(p => SMALL[p.kind] && Math.hypot(p.x - x, p.y - y) < SMALL_GAP);
  const put = (name, kind, x, y, w, h, box) => { const p = { name, kind, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), box }; out.push(p); return p; };
  // Round 394 (owner: "adjust buildings to be similar in scale? All doors and windows should be similar in size"): a theme
  // may give each building a factor (GEN.storey) that brings one storey of it, doors and windows with it, to one height.
  const size = (table, name, kind) => { const [iw, ih] = table[name], big = kind === 'building' || kind === 'landmark'; let k = GEN.scale[kind] * (big && GEN.storey && GEN.storey[name] || 1);
    if (big && GEN.maxH && ih * k > GEN.maxH) k = GEN.maxH / ih; // the tallest still fit a room
    return [iw * k, ih * k]; };
  // The road nearest below a foot point (within `reach` px), else to its left or right: where a yard runs to.
  const roadBelow = (x, y, reach) => { for (let d = 2; d <= reach; d += 4) if (isFloor(x, y + d)) return d; return 0; };
  if (GEN.worldLots) { // Round 399: the buildings come from the city's plan; this room takes every one that reaches into it
    const wl = genWorld(seed), ox = RX * 800, oy = RY * 500; plan.parks = wl.parks.filter(r => r[2] > ox && r[0] < ox + 800 && r[3] > oy && r[1] < oy + 500).map(r => [r[0] - ox, r[1] - oy, r[2] - ox, r[3] - oy]);
    for (const b of wl.buildings) { const x = b.x - ox, y = b.y - oy, box = [x - b.w / 2 + 4, y - b.h + 6, x + b.w / 2 - 4, y - 1]; if (box[2] > 0 && box[0] < 800 && box[3] > 0 && box[1] < 500) out.push({ name: b.name, kind: 'building', x, y, w: b.w, h: b.h, box }); } }
  // 2. The landmark: where the open ground is widest.
  if (!GEN.worldLots)
  { const all = Object.keys(GEN.landmarks[district]), names = all.filter(n => !banned.has(n)).length ? all.filter(n => !banned.has(n)) : all, name = names[Math.floor(rnd() * names.length)], [w, h] = size(GEN.landmarks[district], name, 'landmark'); let best = null;
    if (!banned.has(name))
    for (let y = h + 8; y < 496; y += 12) for (let x = w / 2 + 8; x < 792 - w / 2; x += 12) { const box = fits(x, y, w, h, 0); if (!box || !seamOk(name, box)) continue;
      const d = dist[Math.min(FG_ROWS - 1, Math.floor((y - h * 0.3) / C)) * FG_COLS + Math.floor(x / C)]; if (!best || d > best.d) best = { x, y, box, d }; }
    if (best) { put(name, 'landmark', best.x, best.y, w, h, best.box); if (!GEN.pavement) yards.push({ t: 'oct', x: best.x, y: best.y - h * 0.16, rx: w * 0.62, ry: h * 0.3 }); } }
  // 3 and 4. Street-front lots and their yards. Pass 0: the far side of a street (a road just below the foot); pass 1: beside or above a road.
  const own = Object.keys(GEN.districts[district]), others = Object.keys(GEN.districts).filter(d => d !== district);
  const pick = (x, y) => { const ok = n => !out.some(p => p.name === n) && !(x != null && GEN.span && tooNear(n, x, y)), free = own.filter(ok); if (free.length && rnd() < 0.85) { const n = free[Math.floor(rnd() * free.length)]; return [n, GEN.districts[district]]; } const d = others[Math.floor(rnd() * others.length)], t = Object.keys(GEN.districts[d]), tf = t.filter(ok), tt = tf.length ? tf : t; return [tt[Math.floor(rnd() * tt.length)], GEN.districts[d]]; };
  let built = 0;
  // Round 399 (owner: "improve our algorithm for city generation, it's just not good enough"): street frontage. Buildings
  // stand in rows along both sides of every street, side by side, an even step back from the road (main roads first),
  // instead of being scattered over the open ground. What is left over is filled after (4c).
  if (GEN.span && !GEN.worldLots) {
    const segs = [];
    for (const sh of plan.shapes) { if (sh.pave) continue; const main = sh.main !== false;
      if (sh.t === 'road') for (let i = 1; i < sh.pts.length; i++) segs.push({ a: sh.pts[i - 1], b: sh.pts[i], w: sh.w, main });
      else if (sh.t === 'rect') segs.push(sh.w >= sh.h ? { a: [sh.x, sh.y + sh.h / 2], b: [sh.x + sh.w, sh.y + sh.h / 2], w: sh.h, main } : { a: [sh.x + sh.w / 2, sh.y], b: [sh.x + sh.w / 2, sh.y + sh.h], w: sh.w, main }); }
    const len = sg => Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]); segs.sort((p, q) => (q.main - p.main) || len(q) - len(p));
    const STEP = 18, GAP = 6;
    const row = (place, from, to) => { for (let c = from; c < to && built < 24;) { let done = 0;
      for (let t = 0; t < 8 && !done; t++) { const [name, table] = pick(...place.at(c)); if (out.some(p => p.name === name)) continue; const [w, h] = size(table, name, 'building'), [fx, fy] = place.foot(c, w, h), box = fits(fx, fy, w, h, GAP, STEP - 2);
        if (box && seamOk(name, box)) { put(name, 'building', fx, fy, w, h, box); built++; done = place.next(c, w, h); } }
      c = done || c + 12; } };
    for (const sg of segs) { const hz = Math.abs(sg.a[1] - sg.b[1]) < 1, half = sg.w / 2;
      if (hz) { const y = sg.a[1], x0 = Math.min(sg.a[0], sg.b[0]) - half, x1 = Math.max(sg.a[0], sg.b[0]) + half;
        row({ at: c => [c, y - half - STEP], foot: (c, w) => [c + w / 2, y - half - STEP], next: (c, w) => c + w + GAP }, x0, x1); // north side: fronts on the street
        row({ at: c => [c, y + half + STEP], foot: (c, w, h) => [c + w / 2, y + half + STEP + h - 6], next: (c, w) => c + w + GAP }, x0, x1); } // south side
      else { const x = sg.a[0], y0 = Math.min(sg.a[1], sg.b[1]) - half, y1 = Math.max(sg.a[1], sg.b[1]) + half;
        row({ at: c => [x - half - STEP, c], foot: (c, w, h) => [x - half - STEP - w / 2 + 4, c + h - 6], next: (c, w, h) => c + h + GAP }, y0, y1); // west side
        row({ at: c => [x + half + STEP, c], foot: (c, w, h) => [x + half + STEP + w / 2 - 4, c + h - 6], next: (c, w, h) => c + h + GAP }, y0, y1); } } // east side
  }
  if (!GEN.span) for (const pass of [0, 1]) for (let y = 40; y < 498 && built < 16; y += 6) {
    for (let x = 16; x < 790 && built < 16;) {
      const below = roadBelow(x, y, 26 + PAVE), near = dist[Math.min(FG_ROWS - 1, Math.floor((y - 12) / C)) * FG_COLS + Math.floor(x / C)];
      const n0 = Math.ceil((BIG_CLEAR + 4) / C); if (pass === 0 ? !(below >= BIG_CLEAR - 1) : !(near >= n0 && near <= n0 + 2)) { x += 6; continue; }
      let placed = null;
      for (let t = 0; t < 9 && !placed; t++) { const [name, table] = pick(x, y), [w, h] = size(table, name, 'building'), cx = x + w / 2;
        if (out.some(p => p.name === name) || banned.has(name)) continue; // Round 388 (owner): never the same building twice in a room; leave the lot empty instead
        if (pass === 0 && !(roadBelow(cx - w * 0.3, y, 30 + PAVE) && roadBelow(cx + w * 0.3, y, 30 + PAVE))) continue; // the whole front on the street
        const box = fits(cx, y, w, h, 5); if (box && seamOk(name, box)) placed = put(name, 'building', cx, y, w, h, box); }
      if (!placed) { x += 10; continue; }
      built++; const run = roadBelow(placed.x, y, 30 + PAVE);
      if (!GEN.pavement) yards.push({ t: 'rect', x0: placed.box[0] - 7, y0: y - placed.h * 0.42, x1: placed.box[2] + 7, y1: y + (run ? run + 6 : 9) });
      x = placed.box[2] + 6 + Math.floor(rnd() * 8);
    }
  }
  // 4b. Round 393 (owner: "use a building as a transition point between tiles so that seams are always hidden? could
  // that be a rule?"): where the ground changes kind (rubble to overgrowth) and nothing stands yet, a building may stand
  // over the seam, its base across it. It obeys every other rule (off the curb, out of the water, never repeated), so a
  // seam it can't take is left to the soft edge the painter gives it.
  if (GEN.feather && !GEN.worldLots) {
    const seams = [], k = (x, y) => terrain.chasm(x, y) ? 'w' : terrain.pipes(x, y) ? 'p' : 'g';
    for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) { const a = k(x, y); if (a === 'w') continue;
      if (x + 1 < CG_COLS && k(x + 1, y) !== a && k(x + 1, y) !== 'w') seams.push([(x + 1) * CG_CELL, (y + 0.5) * CG_CELL]);
      if (y + 1 < CG_ROWS && k(x, y + 1) !== a && k(x, y + 1) !== 'w') seams.push([(x + 0.5) * CG_CELL, (y + 1) * CG_CELL]); }
    const covered = (sx, sy) => out.some(p => sx > p.box[0] && sx < p.box[2] && sy > p.box[1] && sy < p.box[3]);
    for (let i = seams.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [seams[i], seams[j]] = [seams[j], seams[i]]; }
    for (const [sx, sy] of seams) { if (built >= 20) break; if (covered(sx, sy)) continue;
      for (let t = 0; t < 6; t++) { const [name, table] = pick(sx, sy); if (out.some(p => p.name === name) || banned.has(name)) continue; const [w, h] = size(table, name, 'building');
        const box = fits(sx, sy + h * 0.25, w, h, 5); if (box && seamOk(name, box)) { put(name, 'building', sx, sy + h * 0.25, w, h, box); built++; break; } } }
  }
  // 4c. Round 394: with bigger buildings, open ground away from the streets is filled too (still never a repeat).
  if (GEN.span && !GEN.worldLots) for (let y = 60; y < 496 && built < 16; y += 14) for (let x = 30; x < 780 && built < 16; x += 18) {
    const [name, table] = pick(x, y); if (out.some(p => p.name === name) || banned.has(name)) continue; const [w, h] = size(table, name, 'building');
    const box = fits(x, y, w, h, 6); if (box && seamOk(name, box)) { put(name, 'building', x, y, w, h, box); built++; x += w * 0.6; } }
  // 5. Street furniture: lamps on the far kerb every 150px or so; a bench or two bollards beside each square.
  const lamps = [];
  for (let y = 20; y < 496; y += 5) for (let x = 20; x < 782; x += 5) { const b = roadBelow(x, y, 14); if (!(b >= 6) || !lonely(x, y) || lamps.some(l => Math.hypot(l[0] - x, l[1] - y) < (GEN.lampGap || 150))) continue;
    const [w, h] = size(GEN.furniture, 'lamp', 'lamp'), box = fits(x, y, w, h, 3, 3); if (box) { put('lamp', 'lamp', x, y, w, h, box); lamps.push([x, y]); } }
  for (const [px, py] of plan.plazas) { const kind = rnd() < 0.5 ? 'bench' : 'bollard', [w, h] = size(GEN.furniture, kind, kind);
    for (const [dx, dy] of [[0, -78], [-92, 0], [92, 0], [-70, -60], [70, -60]]) { const x = px + dx, y = py + 22 + dy; if (!lonely(x, y)) continue; const box = fits(x, y, w, h, 3, 3); if (box && !isFloor(x, y)) { put((GEN.rename && GEN.rename[kind]) || kind, kind, x, y, w, h, box); break; } } } // one piece per square
  // 6. Back lots: clutter behind the rows, likelier near the road and beside a building.
  const clutter = Object.keys(GEN.clutter);
  for (let t = 0, made = 0; t < 160 && made < 9; t++) { const name = clutter[Math.floor(rnd() * clutter.length)], [w, h] = size(GEN.clutter, name, 'clutter'), x = 20 + rnd() * 760, y = 30 + rnd() * 465;
    const d = dist[Math.min(FG_ROWS - 1, Math.floor(y / C)) * FG_COLS + Math.floor(x / C)]; if (d * C < BIG_CLEAR || rnd() > Math.exp(-(d - 1) / 3.5)) continue;
    if (!out.some(p => (p.kind === 'building' || p.kind === 'landmark') && Math.abs(p.x - x) < p.w / 2 + 46 && y > p.y - p.h * 0.5 && y < p.y + 40) && rnd() < 0.7) continue;
    if (!lonely(x, y)) continue;
    const box = fits(x, y, w, h, 2); if (box) { put(name, 'clutter', x, y, w, h, box); made++; } }
  out.sort((a, b) => a.y - b.y);
  plan.yards = yards; plan.district = district;
  return plan.props = out;
}
// --- The world for the current seed ---
let chronoSeedNow = null, chronoPlans = {}, chronoBuiltSeed = null;
// The squares table, read like the other worlds' (plazas[key]); each room's entry is planned on first use.
const chronoPlazaTable = typeof Proxy === 'function' ? new Proxy({}, {
  get(_, key) { if (typeof key !== 'string') return undefined; const p = chronoRoomOf(key); return p && p.plazas.length ? p.plazas : undefined; },
  has(_, key) { return typeof key === 'string' && !!chronoRoomOf(key); },
  ownKeys() { return Object.keys(TILE_WORLD_DATA.chronospire.layout); },
  getOwnPropertyDescriptor(_, key) { const p = typeof key === 'string' && chronoRoomOf(key); return p ? { value: p.plazas, enumerable: true, configurable: true } : undefined; }
}) : {};
function chronoRoomOf(key) { if (chronoPlans[key]) return chronoPlans[key]; return TILE_WORLD_DATA.chronospire.layout[key] ? (chronoPlans[key] = chronoRoomPlan(chronoBuiltSeed, key)) : null; }
// The walk mask, asked a cell at a time: the same 8px cells as the other tile worlds (a cell is judged at its centre).
function chronoWalk(wx, wy) {
  const cell = TILE_WORLD_DATA.chronospire.world.cell, x = Math.floor(wx / cell) * cell + cell / 2, y = Math.floor(wy / cell) * cell + cell / 2;
  if (x < 0 || y < 0) return false;
  const cx = Math.floor(x / 800), cy = Math.floor(y / 500), p = chronoRoomOf(cx + ',' + cy);
  return !!p && p.floor[Math.floor((y - cy * 500) / FG_CELL) * FG_COLS + Math.floor((x - cx * 800) / FG_CELL)] === 1;
}
function chronoFlushCaches(id = 'chronospire') {
  const mine = k => typeof k === 'string' && k.indexOf(id) >= 0;
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
  chronoPlans = {}; chronoBuiltSeed = seed; // rooms are planned when first asked for (chronoPlan), not all 54 on every new game
  chronoSeedNow = seed + '|' + (typeof FIRST_WAYPOINT_ROOMS !== 'undefined');
  chronoFlushCaches();
  // The live room table is a copy made by configureRegion: make it again when the map changed under it.
  if (activeRegion === 'chronospire' && !chronoApplying) { chronoApplying = true; try { configureRegion('chronospire'); } finally { chronoApplying = false; } }
}
// Built on first use and again whenever the seed changes (or once waypoints.js has loaded, which moves the first waypoint).
function chronoEnsure() { const s = chronoSeed(); if (s + '|' + (typeof FIRST_WAYPOINT_ROOMS !== 'undefined') !== chronoSeedNow) chronoBuild(s); }
function chronoPlan(key) { chronoEnsure(); return chronoRoomOf(key); }

Object.defineProperty(TILE_WORLD_DATA.chronospire, 'plazas', { get() { chronoEnsure(); return chronoPlazaTable; }, enumerable: true, configurable: true });
// Everything that reads the Chronospire's ground goes through one of these; each checks the seed first.
{
  const walkBefore = tileWorldWalk;
  tileWorldWalk = function (id, wx, wy) { if (id === 'chronospire') { chronoEnsure(); return chronoWalk(wx, wy); } return walkBefore.apply(this, arguments); };
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
  const src = GEN.art + ((GEN.tex && GEN.tex[name]) || name) + '.webp?v=' + GEN.version();
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
const chronoScaled = {};
function paintChronoRoom(canvas, key) {
  const theme = GEN.id, seed = theme === 'chronospire' ? null : chronoSeed(), plan = theme === 'chronospire' ? chronoPlan(key) : genPlan(theme, key, seed); if (!plan || typeof document === 'undefined') return false;
  const paintKey = theme + ':' + (theme === 'chronospire' ? chronoSeedNow : seed) + '#' + key;
  const done = chronoPainted.get(paintKey);
  if (done) {
    canvas.width = done.width; canvas.height = done.height; if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
    const c2 = canvas.getContext('2d'); if (c2) c2.drawImage(done, 0, 0);
    if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null; return true;
  }
  const props = chronoRoomProps(theme === 'chronospire' ? chronoSeed() : seed, plan);
  const names = ['ground', 'floor', 'pipes', 'chasm', 'yard', ...(GEN.plazaTex ? [GEN.plazaTex] : []), ...(GEN.beach ? ['sand'] : []), ...(GEN.topdown ? ['pavement-old', ...cityTdArtNames()] : []), ...(GEN.mix || []).map(m => m.tex), ...new Set(props.map(p => p.name).concat(plan.inlays.map(i => i.name)))], imgs = {};
  for (const n of names) imgs[n] = chronoArtImage(n);
  const waiting = names.map(n => imgs[n]).find(i => !(i.complete && i.naturalWidth));
  if (waiting) {
    if (canvas.dataset) canvas.dataset.pending = '1'; canvas.pendingImage = waiting;
    if (waiting.addEventListener) waiting.addEventListener('load', () => { if (canvas.isConnected) genWith(theme, () => paintChronoRoom(canvas, key)); }, { once: true });
    return false;
  }
  const K = 2, W = 800 * K, H = 500 * K; canvas.width = W; canvas.height = H;
  if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // The textures run on from room to room: the pattern starts at the world's corner, not the room's.
  const [cx, cy] = GEN.world(key), offY = (((cy * H) % 800) + 800) % 800, offX = (((cx * W) % 800) + 800) % 800;
  // Round 388 (owner: "the road tile is too big ... those puddles are huge"): a theme may draw a texture smaller (texScale).
  const sized = img => { const k = GEN.texScale && GEN.texScale[Object.keys(imgs).find(n => imgs[n] === img)]; if (!k || k === 1) return img;
    const ck = img.src + '@' + k; if (!chronoScaled[ck]) { const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(img, 0, 0, c.width, c.height); chronoScaled[ck] = c; } return chronoScaled[ck]; };
  const fill = (g, img) => { g.save(); g.translate(-offX, -offY); g.fillStyle = g.createPattern(sized(img), 'repeat'); g.fillRect(offX, offY, W, H); g.restore(); };
  if (GEN.topdown) { fill(ctx, imgs['pavement-old']); ctx.fillStyle = 'rgba(8,12,24,.5)'; ctx.fillRect(0, 0, W, H); } else fill(ctx, imgs.ground);
  // Round 389 (owner: "use all the assets for neon aftermath, the rubble the puddles, the grass, everything should be
  // mixed"): a theme may lay a second texture over a first in soft patches from world-wide noise (GEN.mix: which
  // texture, over what, how much). Applied to the ground here and to the road and pavement below.
  const patches = (tag, period, cut) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff';
    const [wx, wy] = GEN.world(key), sd = chronoSeed();
    for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) { const v = chronoNoise(sd, tag, wx * FG_COLS + x, wy * FG_ROWS + y, period); if (v > cut) { g.globalAlpha = Math.min(1, (v - cut) * 9); g.beginPath(); g.arc((x + 0.5) * FG_CELL * K, (y + 0.5) * FG_CELL * K, FG_CELL * K * 1.05, 0, Math.PI * 2); g.fill(); } }
    const b = document.createElement('canvas'); b.width = W; b.height = H; const bg = b.getContext('2d'); bg.filter = 'blur(' + (10 * K) + 'px)'; bg.drawImage(c, 0, 0); return b; };
  const mixInto = (target, under, mix) => { const img = imgs[mix.tex]; if (!img) return; const m = patches(mix.tag, mix.period, mix.cut), layerC = document.createElement('canvas'); layerC.width = W; layerC.height = H;
    const lg = layerC.getContext('2d'); lg.drawImage(m, 0, 0); lg.globalCompositeOperation = 'source-in'; fill(lg, img); if (under) { lg.globalCompositeOperation = 'destination-in'; lg.drawImage(under, 0, 0); }
    target.drawImage(layerC, 0, 0); };
  if (!GEN.topdown) { for (const mix of (GEN.mix || []).filter(m => m.on === 'ground')) mixInto(ctx, null, mix);
  ctx.fillStyle = GEN.groundShade; ctx.fillRect(0, 0, W, H); }
  else { const sw = (typeof CITY_TD_ART !== 'undefined' ? CITY_TD_ART.sidewalk : []).map(n => 'td/' + n).filter(n => imgs[n] && imgs[n].naturalWidth);
    // Round 407 (owner: "sidewalk tile size is far too big"): drawn at 0.35, a paving tile about 90px across
    for (const n of sw) (GEN.texScale = GEN.texScale || {})[n] = 0.35;
    // Round 408 (owner: blends between very different tiles "look horrible ... set rules so it cant happen again"; "find what
    // technique is used by modern 2d games"): as with autotiled terrain, a material change is a hard edge on the grid,
    // never a fade. Each block of the city (the ground the streets enclose) takes one paving, half of them the main one;
    // a block's edges run along its streets, so a paving only changes across a street.
    if (sw.length) { fill(ctx, imgs[sw[0]]);
      const wl = sw.length > 1 && genWorld(chronoSeed()), [wx, wy] = GEN.world(key);
      if (wl) for (let m = 1; m < sw.length; m++) { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; let any2 = false;
        for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) { const b = wl.block[(wy * FG_ROWS + y) * wl.CW + wx * FG_COLS + x]; if (b < 0) continue;
          const h = chronoHash(chronoSeed() + ':paving:' + b) % (2 * (sw.length - 1)); if (h + 1 !== m) continue; g.fillRect(x * FG_CELL * K, y * FG_CELL * K, FG_CELL * K + 1, FG_CELL * K + 1); any2 = true; }
        if (any2) { g.globalCompositeOperation = 'source-in'; fill(g, imgs[sw[m]]); ctx.drawImage(c, 0, 0); } }
      ctx.fillStyle = 'rgba(8,12,24,.38)'; ctx.fillRect(0, 0, W, H); } } // the machinery sits back, so the roads read at a glance
  const layer = (grid, img, radius) => {
    const shape = chronoShape(grid, K, radius), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in'; fill(g, img);
    return { shape, art: c };
  };
  // Round 393 (owner: "curb corners need to be a bit more rounded"): blur a shape and cut it back at half strength, which
  // rounds its corners, the inside ones (where two roads meet) as well as the outside ones.
  // The shape's edge pixels are stretched outward first, so a road running off the room keeps its full width to the edge.
  const blurred = (src, r) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const P = Math.ceil(r * 3), e = document.createElement('canvas'); e.width = W + 2 * P; e.height = H + 2 * P; const eg = e.getContext('2d');
    eg.drawImage(src, P, P); eg.drawImage(src, 0, 0, 1, H, 0, P, P, H); eg.drawImage(src, W - 1, 0, 1, H, W + P, P, P, H); eg.drawImage(src, 0, 0, W, 1, P, 0, W, P); eg.drawImage(src, 0, H - 1, W, 1, P, H + P, W, P);
    g.filter = 'blur(' + r + 'px)'; g.drawImage(e, -P, -P); g.filter = 'none'; return c; };
  const smoothed = (src, r) => { const c = blurred(src, r), g = c.getContext('2d'); if (!g || !g.getImageData) return src; const d = g.getImageData(0, 0, W, H), a = d.data;
    for (let i = 3; i < a.length; i += 4) { a[i - 3] = a[i - 2] = a[i - 1] = 255; a[i] = Math.max(0, Math.min(255, (a[i] - 128) * 5 + 128)); }
    g.putImageData(d, 0, 0); return c; };
  // Round 393 (owner: "grass edges should also not be straight grass is more random"; "the water edge ... should look more
  // like a beachfront edge"): a shape's edge broken up by noise laid over the whole world in 20px cells (so it runs on
  // across rooms), then cut back sharply (`sharp`) or softly. `grow` pushes the edge outward in px (for a beach round water).
  const raggedNoise = {}, noiseAt = tag => { if (raggedNoise[tag]) return raggedNoise[tag]; const [wx, wy] = GEN.world(key), sd = chronoSeed(), c = document.createElement('canvas'); c.width = 41; c.height = 26;
      const g = c.getContext('2d'), d = g.createImageData(41, 26);
      for (let y = 0; y < 26; y++) for (let x = 0; x < 41; x++) { const gx = wx * 40 + x, gy = wy * 25 + y, v = chronoNoise(sd, tag, gx, gy, 5) * 0.62 + chronoNoise(sd, tag + '2', gx, gy, 1.7) * 0.38, i = (y * 41 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.round(v * 255); d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); const big = document.createElement('canvas'); big.width = W; big.height = H; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = true; bg.drawImage(c, 0, 0, 41 * 20 * K, 26 * 20 * K);
      return raggedNoise[tag] = bg.getImageData ? bg.getImageData(0, 0, W, H).data : null; };
  const ragged = (src, tag, { blur = 22, amp = 0.7, sharp = 6, grow = 0, stretch = true } = {}) => {
    let base = src;
    if (typeof src === 'function') { // a terrain grid: drawn with the neighbours' cells round it, so an edge on a seam is ragged on both sides
      const P = Math.ceil(blur * K * 3 + grow * K), T = CG_CELL * K, n = Math.ceil(P / T), e = document.createElement('canvas'); e.width = W + 2 * P; e.height = H + 2 * P; const eg = e.getContext('2d'); eg.fillStyle = '#fff';
      for (let y = -n; y < CG_ROWS + n; y++) for (let x = -n; x < CG_COLS + n; x++) if (src(x, y)) eg.fillRect(P + x * T - grow * K, P + y * T - grow * K, T + 2 * grow * K, T + 2 * grow * K);
      const c = document.createElement('canvas'); c.width = W; c.height = H; const cg = c.getContext('2d'); cg.filter = 'blur(' + (blur * K) + 'px)'; cg.drawImage(e, -P, -P); cg.filter = 'none'; return cut(c, tag, amp, sharp, base);
    }
    if (grow) { base = document.createElement('canvas'); base.width = W; base.height = H; const bg = base.getContext('2d'); for (let a = 0; a < 16; a++) bg.drawImage(src, Math.round(Math.cos(a * Math.PI / 8) * grow * K), Math.round(Math.sin(a * Math.PI / 8) * grow * K)); }
    const bl = stretch ? blurred(base, blur * K) : (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.filter = 'blur(' + (blur * K) + 'px)'; g.drawImage(base, 0, 0); g.filter = 'none'; return c; })();
    return cut(bl, tag, amp, sharp, base); };
  const cut = (c, tag, amp, sharp, base) => { const g = c.getContext('2d'), nz = noiseAt(tag); if (!g || !g.getImageData || !nz) return typeof base === 'function' ? c : base;
    // the noise may move the edge, but never lift bare ground far from the shape above nothing
    const d = g.getImageData(0, 0, W, H), a = d.data, A = Math.min(amp, 1 - 1.3 / sharp);
    for (let i = 3; i < a.length; i += 4) { a[i - 3] = a[i - 2] = a[i - 1] = 255; a[i] = Math.max(0, Math.min(255, ((a[i] / 255 - 0.5) + (nz[i - 3] / 255 - 0.5) * A) * sharp * 255 + 128)); }
    g.putImageData(d, 0, 0); return c; };
  // Round 394: a shape "closed" by r room px: its inside corners turn on an arc of radius r (grown by r, then shrunk by r),
  // worked out exactly from distance fields at the room's own scale, with the room's edges run on past it.
  const closed = (src, r) => { const g0 = src.getContext('2d'); if (!g0 || !g0.getImageData) return src;
    const P = Math.ceil(2 * r + 4), w = 800 + 2 * P, h = 500 + 2 * P, small = document.createElement('canvas'); small.width = 800; small.height = 500;
    const sg = small.getContext('2d'); sg.drawImage(src, 0, 0, 800, 500); const a = sg.getImageData(0, 0, 800, 500).data, INF = 1e12;
    const f = new Float64Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = Math.min(799, Math.max(0, x - P)), sy = Math.min(499, Math.max(0, y - P)); f[y * w + x] = a[(sy * 800 + sx) * 4 + 3] > 127 ? 0 : INF; }
    const edt = g => { const n = Math.max(w, h), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), line = (get, set, len) => {
        let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < len; q++) { let sv; do { const p = v[k]; sv = ((get(q) + q * q) - (get(p) + p * p)) / (2 * q - 2 * p); if (sv <= z[k]) k--; else break; } while (k >= 0); k++; v[k] = q; z[k] = sv; z[k + 1] = INF; }
        k = 0; for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + get(v[k]); } for (let q = 0; q < len; q++) set(q, d[q]); };
      for (let x = 0; x < w; x++) line(q => g[q * w + x], (q, val) => { g[q * w + x] = val; }, h);
      for (let y = 0; y < h; y++) line(q => g[y * w + q], (q, val) => { g[y * w + q] = val; }, w); return g; };
    const d1 = edt(f), f2 = new Float64Array(w * h); for (let i = 0; i < f2.length; i++) f2[i] = d1[i] <= r * r ? INF : 0; // the grown shape's outside
    const d2 = edt(f2), out = sg.createImageData(800, 500);
    for (let y = 0; y < 500; y++) for (let x = 0; x < 800; x++) { const i = (y * 800 + x) * 4, v = Math.sqrt(d2[(y + P) * w + x + P]) - r + 0.5; out.data[i] = out.data[i + 1] = out.data[i + 2] = 255; out.data[i + 3] = Math.max(0, Math.min(255, Math.round(v * 255))); }
    sg.putImageData(out, 0, 0); const c = document.createElement('canvas'); c.width = W; c.height = H; const cg = c.getContext('2d'); cg.imageSmoothingEnabled = true; cg.drawImage(small, 0, 0, W, H);
    cg.globalCompositeOperation = 'source-over'; cg.drawImage(src, 0, 0); return c; };
  const ring = (pic, r) => { for (let a = 0; a < 8; a++) ctx.drawImage(pic, Math.round(Math.cos(a * Math.PI / 4) * r), Math.round(Math.sin(a * Math.PI / 4) * r)); };
  const terrain = chronoTerrain(chronoSeed(), key), any = f => { for (let y = -1; y <= CG_ROWS; y++) for (let x = -1; x <= CG_COLS; x++) if (f(x, y)) return true; return false; };
  if (!GEN.topdown && any(terrain.pipes)) { // a bed of pipes, sunk a little into the machinery
    const s = layer(terrain.pipes, imgs.pipes, 24);
    // Round 393 (owner: "transitions between tiles are not great"): a theme with `feather` blends the bed into the ground
    // over a soft edge instead of a hard rim.
    if (GEN.feather) { const m = ragged(terrain.pipes, 'grass', { blur: 30, amp: 0.8, sharp: 9 }), g = m.getContext('2d'); g.globalCompositeOperation = 'source-in'; fill(g, imgs.pipes); ctx.drawImage(m, 0, 0); }
    else { ring(chronoTint(s.shape, GEN.bedRim[0]), 5); ring(chronoTint(s.shape, GEN.bedRim[1]), 2); ctx.drawImage(s.art, 0, 0); }
  }
  if (any(terrain.chasm) && GEN.beach && GEN.topdown) {
    // Round 412 (owner: "sand and grass tiles still do not transition well"): as in autotiled games, the coast keeps to the
    // grid: water cells, then a band of sand exactly one cell wide, with a shoreline strip (CITY_TD_ART.shore: concrete
    // crumbling into the sand) laid along every straight edge where the sand meets the paving, and a foam line along the water.
    const T = CG_CELL, W8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], isW = (x, y) => terrain.chasm(x, y), isS = (x, y) => !isW(x, y) && W8.some(([a, b]) => isW(x + a, y + b));
    const cellMask = f => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff';
      for (let y = -1; y <= CG_ROWS; y++) for (let x = -1; x <= CG_COLS; x++) if (f(x, y)) g.fillRect(x * T * K, y * T * K, T * K + 1, T * K + 1); return smoothed(c, 14 * K); }; // corners rounded, in and out
    const beach = cellMask((x, y) => isS(x, y) || isW(x, y)), sea = cellMask(isW);
    const tintIn = (mask, paint) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in'; paint(g); return c; };
    ctx.drawImage(tintIn(beach, g => { fill(g, imgs.sand); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,12,24,.25)'; g.fillRect(0, 0, W, H); }), 0, 0);
    ring(chronoTint(sea, '#cfe6ee'), 3); // foam along the water
    ctx.drawImage(tintIn(sea, g => { fill(g, imgs.chasm); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(4,2,14,.35)'; g.fillRect(0, 0, W, H); }), 0, 0);
    const shoreArt = typeof CITY_TD_ART !== 'undefined' ? (CITY_TD_ART.shore || []).map(n => imgs['td/' + n]).find(i => i && i.naturalWidth) : null;
    const [wx0, wy0] = GEN.world(key);
    if (shoreArt) cityEdgeAlong(ctx, beach, 0, 0, K, shoreArt, 18, wx0, wy0); else { ring(chronoTint(beach, '#0b0e14'), 3); }
  } else if (any(terrain.chasm) && GEN.beach) { // water with a beach: sand, a darker wet band, a foam line at the water's edge
    const s = layer(terrain.chasm, imgs.chasm, 24), shore = ragged(terrain.chasm, 'shore', { blur: 26, amp: 0.8, sharp: 7, grow: 8 }), sand = ragged(terrain.chasm, 'sand', { blur: 26, amp: 0.8, sharp: 9, grow: 38 });
    const tintIn = (mask, paint) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in'; paint(g); return c; };
    // Round 398 (owner: "water should always have that beach tile around it"): an even strip of sand round all water,
    // under the ragged beach, so the noise never thins the beach to nothing.
    const sandMin = ragged(terrain.chasm, 'sand2', { blur: 6, amp: 0.1, sharp: 9, grow: 18 });
    // Round 408: in the top-down city the beach is one crisp shape (sharp edge, no see-through fringe) with a dark border
    // where it meets the paving, like a kerb, so two very different grounds never fade into each other.
    const beachShape = GEN.topdown ? (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(sandMin, 0, 0); g.drawImage(sand, 0, 0); return smoothed(c, 2 * K); })() : null;
    if (beachShape) { ring(chronoTint(beachShape, '#0b0e14'), 4); ring(chronoTint(beachShape, '#3a414c'), 2); ctx.drawImage(tintIn(beachShape, g => fill(g, imgs.sand)), 0, 0); }
    else { ctx.drawImage(tintIn(sandMin, g => fill(g, imgs.sand)), 0, 0);
    ctx.drawImage(tintIn(sand, g => fill(g, imgs.sand)), 0, 0); } // Round 394: the owner's beach-sand tile
    ctx.drawImage(tintIn(blurred(sand, 3 * K), g => { const w = blurred(shore, 14 * K); g.globalCompositeOperation = 'source-in'; g.drawImage(w, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = GEN.beach[1]; g.fillRect(0, 0, W, H); }), 0, 0);
    const water = tintIn(shore, g => fill(g, imgs.chasm)); ctx.drawImage(water, 0, 0);
    for (const [r, a] of [[3, 0.55], [9, 0.18]]) { ctx.save(); ctx.globalAlpha = a; const foam = document.createElement('canvas'); foam.width = W; foam.height = H; const fg = foam.getContext('2d');
      fg.drawImage(blurred(shore, r * K), 0, 0); fg.globalCompositeOperation = 'destination-out'; fg.drawImage(shore, 0, 0); fg.globalCompositeOperation = 'source-in'; fg.fillStyle = GEN.beach[2]; fg.fillRect(0, 0, W, H); ctx.drawImage(foam, 0, 0); ctx.restore(); }
  } else if (any(terrain.chasm)) { // a chasm: a lit rim, the dark below, and a shadow falling in from its edge
    const s = layer(terrain.chasm, imgs.chasm, 24), g = s.art.getContext('2d');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(4,2,14,.45)'; g.fillRect(0, 0, W, H);
    const rim = document.createElement('canvas'); rim.width = W; rim.height = H; const rg = rim.getContext('2d');
    rg.fillStyle = '#000'; rg.fillRect(0, 0, W, H); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(s.shape, 0, 0);
    g.shadowColor = 'rgba(0,0,0,.95)'; g.shadowBlur = 50; g.shadowOffsetY = 16; g.drawImage(rim, 0, 0); g.shadowColor = 'transparent';
    ring(chronoTint(s.shape, GEN.holeRim[0]), 5); ring(chronoTint(s.shape, GEN.holeRim[1]), 2); ctx.drawImage(s.art, 0, 0);
  }
  // Round 385: cobbled yards under the buildings, running to the road (drawn before it, so the kerb overlaps them).
  if (plan.yards && plan.yards.length) {
    const yc = document.createElement('canvas'); yc.width = W; yc.height = H; const g = yc.getContext('2d'); g.fillStyle = '#fff';
    for (const yd of plan.yards) {
      if (yd.t === 'rect') g.fillRect(yd.x0 * K, yd.y0 * K, (yd.x1 - yd.x0) * K, (yd.y1 - yd.y0) * K);
      else { const cut = Math.min(yd.rx, yd.ry) * 0.6, P = [[-yd.rx + cut, -yd.ry], [yd.rx - cut, -yd.ry], [yd.rx, -yd.ry + cut], [yd.rx, yd.ry - cut], [yd.rx - cut, yd.ry], [-yd.rx + cut, yd.ry], [-yd.rx, yd.ry - cut], [-yd.rx, -yd.ry + cut]];
        g.beginPath(); P.forEach(([x, y], i) => i ? g.lineTo((yd.x + x) * K, (yd.y + y) * K) : g.moveTo((yd.x + x) * K, (yd.y + y) * K)); g.closePath(); g.fill(); }
    }
    const art = document.createElement('canvas'); art.width = W; art.height = H; const ag = art.getContext('2d'); ag.drawImage(yc, 0, 0); ag.globalCompositeOperation = 'source-in'; fill(ag, imgs.yard);
    ag.globalCompositeOperation = 'source-atop'; ag.fillStyle = GEN.yardShade || 'rgba(10,8,26,.22)'; ag.fillRect(0, 0, W, H);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.drawImage(chronoTint(yc, '#0a0714'), 0, 0); ctx.restore();
    ring(chronoTint(yc, GEN.yardRim[0]), 4); ring(chronoTint(yc, GEN.yardRim[1]), 2); ctx.drawImage(art, 0, 0);
  }
  // The floor is drawn from the room's shapes: straight-edged roads with mitred corners and 45-degree legs, eight-sided hubs and squares.
  // `grow` px wider on every side gives the pavement's outline from the same shapes, drawn as clean vectors (Round 393).
  const drawFloor = (grow0) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'square'; g.lineJoin = 'miter'; g.miterLimit = 4; let grow = grow0, G = grow * K;
    // A theme with `round` (the city: "make the roads look more like roads, they are too sharp") turns every corner on an
    // arc: road bends, and the corners of hubs and squares.
    const R = (GEN.round || 0) * K, turn = (pts, close) => { g.beginPath(); const n = pts.length, P = i => pts[((i % n) + n) % n];
      if (!R) { pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); if (close) g.closePath(); return; }
      if (close) { const a = P(-1), b = P(0); g.moveTo((a[0] + b[0]) / 2 * K, (a[1] + b[1]) / 2 * K); for (let i = 0; i < n; i++) { const c = P(i), d = P(i + 1); g.arcTo(c[0] * K, c[1] * K, (c[0] + d[0]) / 2 * K, (c[1] + d[1]) / 2 * K, Math.min(R, Math.hypot(d[0] - c[0], d[1] - c[1]) * K / 2)); } g.closePath(); }
      else { g.moveTo(pts[0][0] * K, pts[0][1] * K); for (let i = 1; i < n - 1; i++) { const a = pts[i - 1], c = pts[i], d = pts[i + 1]; g.arcTo(c[0] * K, c[1] * K, d[0] * K, d[1] * K, Math.min(R * 1.6, Math.hypot(c[0] - a[0], c[1] - a[1]) * K / 2, Math.hypot(d[0] - c[0], d[1] - c[1]) * K / 2)); } g.lineTo(pts[n - 1][0] * K, pts[n - 1][1] * K); } };
    if (R) { g.lineCap = 'round'; g.lineJoin = 'round'; }
    const box = (x0, y0, x1, y1, r) => { const rr = (r + grow) * K, a = x0 * K - G, b = y0 * K - G, c2 = x1 * K + G, d = y1 * K + G; g.beginPath(); g.moveTo(a + rr, b);
      g.arcTo(c2, b, c2, d, rr); g.arcTo(c2, d, a, d, rr); g.arcTo(a, d, a, b, rr); g.arcTo(a, b, c2, b, rr); g.closePath(); g.fill(); };
    for (const sh of plan.shapes) {
      if (sh.pave) continue;
      grow = grow0 && GEN.alley && sh.main === false ? Math.min(grow0, GEN.alleyPave || 0) : grow0; G = grow * K; // an alley has a narrow kerb, not a pavement
      if (sh.t === 'rect' && GEN.square) { // a door's stub: run on past the room's edge, so its rounded ends fall outside the room
        const e = 3 * grow + 60, x0 = sh.x <= 0 ? -e : sh.x, y0 = sh.y <= 0 ? -e : sh.y, x1 = sh.x + sh.w >= 800 ? 800 + e : sh.x + sh.w, y1 = sh.y + sh.h >= 500 ? 500 + e : sh.y + sh.h; box(x0, y0, x1, y1, 0); }
      else if (sh.t === 'rect') g.fillRect(sh.x * K - G, sh.y * K - G, sh.w * K + 2 * G, sh.h * K + 2 * G);
      else if (sh.t === 'poly' && GEN.square) { // Round 393 (owner: "just go to straight roads, 90 degree angle corners ... don't have any odd shapes"): a hub is its box
        // Round 394 (owner: "round the curb corners more"): its corners turn on an arc, and the pavement's on the same centre
        // an arc wider, so the curb keeps one width round the corner.
        const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
        box(x0, y0, x1, y1, Math.min(50, (x1 - x0) / 2, (y1 - y0) / 2)); }
      else if (sh.t === 'poly') { turn(sh.pts, true); g.fill(); if (G) { g.lineWidth = 2 * G; g.stroke(); } }
      else if (GEN.square) { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = sh.w * K + 2 * G; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.stroke(); g.restore(); }
      else { g.lineWidth = sh.w * K + 2 * G; turn(sh.pts, false); g.stroke(); }
    }
    return c; };
  const floorShape = drawFloor(0);
  if (!GEN.square) { // close hairline gaps where two shapes pass within a few pixels of each other
    const copy = document.createElement('canvas'); copy.width = W; copy.height = H; copy.getContext('2d').drawImage(floorShape, 0, 0);
    const g = floorShape.getContext('2d'); for (let a = 0; a < 8; a++) g.drawImage(copy, Math.round(Math.cos(a * Math.PI / 4) * 5), Math.round(Math.sin(a * Math.PI / 4) * 5)); }
  // Owner: "round the curb corners more": the road's inside corners turn on an arc too (and the pavement's on the same centre, an arc narrower).
  const f = { shape: GEN.square ? closed(floorShape, GEN.pavement + 30) : floorShape, art: document.createElement('canvas') }; f.art.width = W; f.art.height = H;
  { const g = f.art.getContext('2d'); g.drawImage(f.shape, 0, 0); g.globalCompositeOperation = 'source-in'; fill(g, imgs.floor); g.globalCompositeOperation = 'source-over'; for (const mix of (GEN.mix || []).filter(m => m.on === 'road')) mixInto(g, f.shape, mix); }
  if (GEN.blend) { // Round 398 (owner: "remove curbs from roads altogether and remove the special tile we use for off path
    // travel, try to blend everything in but have a somewhat clear path"): no kerb, no pavement strip, no paving tile.
    // The road is its own surface with a soft, slightly broken edge into the ground; the squares and paths to objects are
    // worn ground in the same surface, fainter and with a looser edge, so the way to them reads without a border.
    const pv = document.createElement('canvas'); pv.width = W; pv.height = H;
    { const g = pv.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = g.lineJoin = 'round';
      for (const sh of plan.shapes) if (sh.pave) { if (sh.t === 'poly') { g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.closePath(); g.fill(); } else if (sh.t === 'road') { g.lineWidth = sh.w * K; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.stroke(); } } }
    plan._plazaShape = pv;
    if (!GEN.topdown) { const pm = ragged(pv, 'path', { blur: 16, amp: 0.7, sharp: 3, grow: 6, stretch: false }), pg = pm.getContext('2d');
    pg.globalCompositeOperation = 'source-in'; fill(pg, imgs.floor); pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = 'rgba(8,12,22,.4)'; pg.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(pm, 0, 0); ctx.restore(); }
    const rm = GEN.topdown ? (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(f.shape, 0, 0); return c; })() : ragged(f.shape, 'verge', { blur: 9, amp: 0.6, sharp: 4 }), rg = rm.getContext('2d');
    if (GEN.topdown) { ring(chronoTint(f.shape, '#05070c'), 4); ring(chronoTint(f.shape, '#3c4450'), 2); }
    rg.globalCompositeOperation = 'source-in'; fill(rg, imgs.floor); rg.globalCompositeOperation = 'source-over'; for (const mix of (GEN.mix || []).filter(m => m.on === 'road')) mixInto(rg, rm, mix);
    if (GEN.topdown) { rg.globalCompositeOperation = 'source-atop'; rg.fillStyle = 'rgba(4,6,12,.62)'; rg.fillRect(0, 0, W, H); }
    ctx.drawImage(rm, 0, 0);
    if (GEN.topdown) paintTopdownCity(ctx, plan, key, W, H, K, imgs, fill);
  } else {
  if (GEN.pavement) { // a strip of pavement down both sides of every road
    // Owner (Round 393): "clean half circle edges ... and a corner cut at 90 degrees": the pavement is the same shapes drawn
    // wider, so its outside corners are true arcs and its inside corners (where a road meets a hub) stay crisp.
    const wide = GEN.square ? closed(drawFloor(GEN.pavement), 30) : drawFloor(GEN.pavement);
    // Owner: "find a different tile to use for off path traversal to objects, do not use the curb tile for those areas":
    // the paved squares and their paths are drawn below in their own tile (GEN.plazaTex), not as pavement.
    const pv = document.createElement('canvas'); pv.width = W; pv.height = H;
    { const g = pv.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = g.lineJoin = 'round';
      for (const sh of plan.shapes) if (sh.pave) { if (sh.t === 'poly') { g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.closePath(); g.fill(); } else if (sh.t === 'road') { g.lineWidth = sh.w * K; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.stroke(); } } }
    plan._plazaShape = pv;
    const pa = document.createElement('canvas'); pa.width = W; pa.height = H; const pg = pa.getContext('2d'); pg.drawImage(wide, 0, 0); pg.globalCompositeOperation = 'source-in'; fill(pg, imgs.yard);
    pg.globalCompositeOperation = 'source-over'; for (const mix of (GEN.mix || []).filter(m => m.on === 'pavement')) mixInto(pg, wide, mix);
    pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = GEN.yardShade || 'rgba(10,8,26,.22)'; pg.fillRect(0, 0, W, H);
    // Round 391 (owner: "make all curbs drawn at a similar width, use the same border on both sides of the curb"): the
    // pavement's outer edge gets the same kerb border as its road edge (three bands), and neither casts a shadow.
    // Round 393 (owner: "lets not have the curb overlap with the off path grass, have them touch at the edges"): the
    // squares are laid first, so the pavement and its kerb sit over them and the grass meets the kerb's outer edge.
    if (GEN.plazaTex && imgs[GEN.plazaTex]) { // the squares: their own tile, a thin dark edge, laid over the pavement they join
      const pl = document.createElement('canvas'); pl.width = W; pl.height = H; const lg = pl.getContext('2d'); lg.drawImage(pv, 0, 0); lg.globalCompositeOperation = 'source-in'; fill(lg, imgs[GEN.plazaTex]);
      lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = GEN.plazaShade || 'rgba(10,14,24,.42)'; lg.fillRect(0, 0, W, H);
      if (GEN.feather) { const m = smoothed(pv, 10 * K), g = m.getContext('2d'); ring(chronoTint(m, GEN.kerb[0]), 3); g.globalCompositeOperation = 'source-in'; fill(g, imgs[GEN.plazaTex]); g.globalCompositeOperation = 'source-atop'; g.fillStyle = GEN.plazaShade; g.fillRect(0, 0, W, H); ctx.drawImage(m, 0, 0); }
      else { ring(chronoTint(pv, GEN.kerb[0]), 4); ctx.drawImage(pl, 0, 0); } }
    ring(chronoTint(wide, GEN.kerb[0]), 9); ring(chronoTint(wide, GEN.kerb[1]), 6); ring(chronoTint(wide, GEN.kerb[2]), 2); ctx.drawImage(pa, 0, 0);
  }
  if (!GEN.pavement) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12; ctx.drawImage(chronoTint(f.shape, '#0a0714'), 0, 0); ctx.restore(); }
  ring(chronoTint(f.shape, GEN.kerb[0]), 9); ring(chronoTint(f.shape, GEN.kerb[1]), 6); ring(chronoTint(f.shape, GEN.kerb[2]), 2);
  ctx.drawImage(f.art, 0, 0);
  }
  if (GEN.laneLine) { // a dashed centre line along each road
    ctx.save(); ctx.strokeStyle = GEN.laneLine; ctx.lineWidth = 3 * K; ctx.lineCap = 'butt'; ctx.setLineDash([14 * K, 14 * K]);
    const g = ctx; for (const sh of plan.shapes) if (sh.t === 'road' && sh.w >= 90 && sh.pts.length > 1) { const pts = sh.pts, n = pts.length, Rr = (GEN.round || 0) * K * 1.6; g.beginPath(); g.moveTo(pts[0][0] * K, pts[0][1] * K);
      for (let i = 1; i < n - 1; i++) { const a = pts[i - 1], c = pts[i], d = pts[i + 1]; g.arcTo(c[0] * K, c[1] * K, d[0] * K, d[1] * K, Math.min(Rr, Math.hypot(c[0] - a[0], c[1] - a[1]) * K / 2, Math.hypot(d[0] - c[0], d[1] - c[1]) * K / 2)); }
      g.lineTo(pts[n - 1][0] * K, pts[n - 1][1] * K); g.stroke(); }
    ctx.restore(); }
  for (const i of plan.inlays) { ctx.save(); ctx.globalAlpha = 0.94; ctx.drawImage(imgs[i.name], (i.x - i.size / 2) * K, (i.y - i.size / 2) * K, i.size * K, i.size * K); ctx.restore(); }
  for (const p of GEN.topdown ? [] : props) {
    const img = imgs[p.name];
    // Round 391 (owner: "remove shadows from images used in procedural room generation, they look wrong"): no drawn shadow under scenery.
    if (p.kind === 'lamp') { const lg = ctx.createRadialGradient(p.x * K, (p.y - p.h * 0.78) * K, 2, p.x * K, (p.y - p.h * 0.78) * K, 70 * K); lg.addColorStop(0, 'rgba(' + GEN.lamp + ',.38)'); lg.addColorStop(1, 'rgba(' + GEN.lamp + ',0)'); ctx.fillStyle = lg; ctx.fillRect((p.x - 70) * K, (p.y - p.h * 0.78 - 70) * K, 140 * K, 140 * K); }
    ctx.drawImage(img, (p.x - p.w / 2) * K, (p.y - p.h) * K, p.w * K, p.h * K);
  }
  // The room's corners fall away into the dark.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(' + GEN.vignette + ',0)'); v.addColorStop(1, 'rgba(' + GEN.vignette + ',.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const keep = document.createElement('canvas'); keep.width = W; keep.height = H; keep.getContext('2d').drawImage(canvas, 0, 0);
  chronoPainted.set(paintKey, keep); while (chronoPainted.size > 6) chronoPainted.delete(chronoPainted.keys().next().value);
  if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null;
  return true;
}

// Round 383 (owner: "since you are now creating the world procedurally, you should be able to make the map look similar
// to the world"). A room's tile for the Map screen and the minimap: its own roads, hub, squares, loops and spurs drawn
// from plan.shapes in the map's road style (pale kerb, dark asphalt), with the room's objects at the spots where they stand.
function chronoMapTile(key, onReady) {
  const plan = GEN.id === 'chronospire' ? chronoPlan(key) : genPlan(GEN.id, key); if (!plan || typeof document === 'undefined' || !document.createElement) return null;
  const objs = typeof mapRoomObjects === 'function' ? mapRoomObjects(key) : [], sig = objs.map(o => (o.src || o.glyph) + (o.used ? '·u' : '')).join('|');
  const ck = 'gen:' + GEN.id + ':' + (GEN.id === 'chronospire' ? chronoSeedNow : chronoSeed()) + ':' + key + ':' + sig; if (typeof mapTileCache !== 'undefined' && mapTileCache[ck]) return mapTileCache[ck];
  const W = 800, H = 500, tile = document.createElement('canvas'); tile.width = W; tile.height = H;
  const ctx = tile.getContext('2d'); if (!ctx) return null;
  // Owner: "make the map for chronospire look similar to the rooms, use similar colors": the room's own textures at
  // map scale (the machinery ground set back, the brass-and-slate floor, a brass kerb and a shadow), flat colours until
  // the textures have loaded.
  const tex = n => { const im = chronoArtImage(n); if (im.complete && im.naturalWidth) return im; if (onReady && im.addEventListener) im.addEventListener('load', onReady, { once: true }); return null; };
  const groundImg = tex('ground'), floorImg = tex('floor'); let complete = !!(groundImg && floorImg);
  const [mx, my] = GEN.world(key), offX = (((mx * 800) % 400) + 400) % 400, offY = (((my * 500) % 400) + 400) % 400;
  const paint = (g, img, flat) => { g.save(); if (img) { g.translate(-offX, -offY); g.scale(0.5, 0.5); g.fillStyle = g.createPattern(img, 'repeat'); g.fillRect(0, 0, (W + offX) * 2, (H + offY) * 2); } else { g.fillStyle = flat; g.fillRect(0, 0, W, H); } g.restore(); };
  paint(ctx, groundImg, '#1a1a3c'); ctx.fillStyle = 'rgba(8,6,24,.38)'; ctx.fillRect(0, 0, W, H);
  const shape = document.createElement('canvas'); shape.width = W; shape.height = H;
  { const g = shape.getContext('2d'); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'square'; g.lineJoin = 'miter'; g.miterLimit = 4;
    for (const sh of plan.shapes) {
      if (sh.t === 'rect') g.fillRect(sh.x, sh.y, sh.w, sh.h);
      else if (sh.t === 'poly') { g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
      else { g.lineWidth = sh.w; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    } }
  const ring = (pic, r) => { for (let a = 0; a < 12; a++) ctx.drawImage(pic, Math.round(Math.cos(a * Math.PI / 6) * r), Math.round(Math.sin(a * Math.PI / 6) * r)); };
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8; ctx.drawImage(chronoTint(shape, '#0a0714'), 0, 0); ctx.restore();
  ring(chronoTint(shape, GEN.kerb[0]), 9); ring(chronoTint(shape, GEN.id === 'chronospire' ? '#d0a04a' : GEN.kerb[1]), 6);
  { const art = document.createElement('canvas'); art.width = W; art.height = H; const g = art.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in'; paint(g, floorImg, '#b8923f'); ctx.drawImage(art, 0, 0); }
  const style = { kerb: GEN.id === 'chronospire' ? '#d0a04a' : GEN.kerb[1] };
  // The room's objects where they stand (dimmed once used).
  const ICON = 104;
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
