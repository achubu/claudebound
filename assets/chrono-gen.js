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
  GEN.seedNow = seed; // (Round 449: a theme's alley() reads the seed its plan is for)
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
    : GEN.grid && landing && !GEN.topdown ? octagon(lineX, lineY, reach(Math.abs(lineX - 16), Math.min(lineX - 4, FG_COLS - 4 - lineX)), reach(Math.abs(lineY - 12), Math.min(lineY - 4, FG_ROWS - 4 - lineY)))
    : boss ? octagon(16, 12, 7, 4.5) : landing && !GEN.grid ? octagon(16, 12, 4)
    : GEN.grid ? ((MAIN = dirs.length === 1 || dirs.some(d => !GEN.alley || !GEN.alley(key, d)) ? 1 : 0), (GEN.alley ? (() => { // Round 417 (owner: "whatever happened with the road here is no good"): a crossing is exactly as wide as the roads that meet
      // in it (it was a main road's 100px square on a 50px alley, and a 200px court at a dead end), so no bump sticks out
      const hw = d => GEN.alley(key, d) ? 1 : 2, ns = dirs.filter(d => d === 'n' || d === 's').map(hw), ew = dirs.filter(d => d === 'e' || d === 'w').map(hw);
      const rx = ns.length ? Math.max(...ns) : Math.max(...ew), ry = ew.length ? Math.max(...ew) : Math.max(...ns);
      return octagon(gx.length ? Math.round(mean(gx)) : 9 + Math.floor(rnd() * 15), gy.length ? Math.round(mean(gy)) : 6 + Math.floor(rnd() * 8), rx, ry); })()
      : octagon(gx.length ? Math.round(mean(gx)) : 9 + Math.floor(rnd() * 15), gy.length ? Math.round(mean(gy)) : 6 + Math.floor(rnd() * 8), dirs.length === 1 ? 4 : MAIN ? 2 : 1)))
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
    // Round 445: an object stands toward the back of its square (50px from the wall behind it), not at the square's middle:
    // a square that reaches out over the sidewalk put its object nearer the street, where walking past could open it
    const pl = mine.map(q => { const mx = (q.x0 + q.x1) / 2 * FG_CELL, my = (q.y0 + q.y1) / 2 * FG_CELL;
      const spot = q.back === 'n' ? [mx, q.y0 * FG_CELL + 50 - 22] : q.back === 's' ? [mx, q.y1 * FG_CELL - 30 - 22] : q.back === 'w' ? [q.x0 * FG_CELL + 50, my - 22] : q.back === 'e' ? [q.x1 * FG_CELL - 50, my - 22] : [mx, my - 22];
      // (Round 447) the square's middle was checked against the HUD panel and the minimap; the spot at its back must be clear of them too
      return typeof screenCovered === 'function' && [[0, 0], [-30, -30], [30, -30], [-30, 30], [30, 30]].some(([dx, dy]) => screenCovered(spot[0] + dx, spot[1] + dy)) ? [mx, my - 22] : spot; });
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
  city: { id: 'city', art: 'assets/environment/city-gen/', version: () => '480',
    exits: key => { const r = typeof CITY_ROOMS !== 'undefined' && CITY_ROOMS[key]; if (!r) return null; const out = {}; for (const [d, v] of Object.entries(r.exits)) if (d.length === 1) out[d] = typeof v === 'string' ? v : v.to; return out; },
    world: key => { const [x, y] = key.split(',').map(Number); return [x, y - 4]; },
    bossRooms: () => Object.keys(CITY_ROOMS).filter(k => CITY_ROOMS[k].enemy && enemies[CITY_ROOMS[k].enemy[0]] && enemies[CITY_ROOMS[k].enemy[0]].boss),
    landing: () => { const nx = typeof NEXUS_POINTS !== 'undefined' && NEXUS_POINTS.city, out = ['0,5', ...GEN_THEMES.city.bossRooms()]; for (const k of nx ? [nx.start, nx.mid, nx.arrival] : []) if (k && !out.includes(k)) out.push(k); return out; },
    districtNames: ['market', 'homes', 'tech', 'garden'], districts: CITY_DISTRICTS,
    landmarks: { market: { arcade: [369, 420], 'neon-tower': [324, 420] }, homes: { tenement: [350, 420], apartment: [330, 420] }, tech: { 'relay-hut': [253, 420], 'server-block': [420, 388] }, garden: { pagoda: [344, 420], 'lantern-court': [420, 354] } },
    furniture: { lamp: [89, 200], bench: [173, 200], bollard: [156, 200] }, rename: { bollard: 'vending' },
    clutter: { car: [220, 141], dumpsters: [220, 143], crates: [220, 216], 'traffic-light': [218, 220], barrier: [200, 175] },
    scale: { building: 0.9, landmark: 0.9, lamp: 0.3, bench: 0.2, bollard: 0.2, clutter: 0.22 }, inlays: [],
    // Round 420: the surfaces' textures by name (sorted into surfaces/<surface>/); everything else the old 3/4 city drew is in legacy/
    tex: { pipes: 'surfaces/park/overgrowth', chasm: 'surfaces/sea/sea-night', overgrowth: 'surfaces/park/overgrowth', water: 'surfaces/sea/sea-night', sand: 'surfaces/waterfront/sand-pale', floor: 'legacy/road-floor', 'road-wet': 'surfaces/road/asphalt', gravel: 'legacy/road-gravel', yard: 'surfaces/lot/parking', 'yard-cargo': 'surfaces/lot/deck-plates', 'yard-rubble': 'surfaces/lot/rubble-ground', 'pavement-old': 'surfaces/sidewalk/paving-slabs' } /* Round 504: the owner's ground sheet, in the buildings' style (the old textures are in unused assets/) */, legacy: 'legacy/', kerb: ['#070b10', '#aebcc6', '#4d5a66'], holeRim: ['#5d6b76', '#05080c'], bedRim: ['#04070a', '#22331f'], yardRim: ['#0a0e14', '#8794a0'], groundShade: 'rgba(4,8,18,.2)', yardShade: 'rgba(8,14,28,.55)', round: 20, pavement: 34, grid: true, lampGap: 240, texScale: { chasm: 0.5, water: 0.5, 'yard-cargo': 0.3, 'yard-rubble': 0.35, gravel: 0.3, floor: 0.45, yard: 0.3, ground: 0.7, 'road-wet': 0.35, 'pavement-old': 0.45, plaza: 0.32, 'rubble-big': 0.8, sand: 0.4 /* Round 461: sharp ripples (it was drawn at full size and looked blurry) */ },
    mix: [{ on: 'ground', tex: 'rubble-big', tag: 'rubble', period: 5, cut: 0.4 }, { on: 'road', tex: 'road-wet', tag: 'wet', period: 6, cut: 0.6 }], blend: true, // Round 398: no kerbs, no paving tile; roads and paths blend into the ground (the plaza tile from Round 397 is unused)
    bedCut: 0.78, feather: 9, square: true, beach: ['#5b5546', 'rgba(36,40,40,.55)', '#cfe6ee'],
    // Owner: "water should be only on the edges with an occasional pond": a ragged band round the edge of the city's
    // 9x6 rooms, and a rare pond inland.
    hole: (seed, gx, gy) => { const d = Math.min(gx, 9 * CG_COLS - 1 - gx, gy, 6 * CG_ROWS - 1 - gy); return d < 0.6 + chronoNoise(seed, 'shore', gx, gy, 5) * 3.4 || (!GEN.topdown && chronoNoise(seed, 'pond', gx, gy, 4) > 0.9); }, // Round 408: no inland ponds in the top-down city (owner: "the circle thing ... looks horrible")
    // Round 394: one storey of each building to the same height on screen (measured from each painting's floors, doors and windows).
    // Round 396: main roads on every third column line and on two row lines; the other streets are alleys.
    // Round 449: which lines carry the main roads comes from the journey's seed: one east-west main road in the upper
    // half of the city (row 1 or 2) and one in the lower (row 3 or 4), and three north-south ones, one in each third of the
    // city's width. Every city used to have them on the same lines (rows 1 and 4, columns 1, 4 and 7).
    mains: seed => { const T = GEN_THEMES.city, ck = String(seed); if (T.mainsCache && T.mainsCache.ck === ck) return T.mainsCache; const h = t => chronoHash(ck + ':mains:' + t);
      return T.mainsCache = { ck, rows: [1 + h('r1') % 2, 3 + h('r2') % 2], cols: [h('c1') % 3, 3 + h('c2') % 3, 6 + h('c3') % 3] }; },
    alley: (key, d) => { const T = GEN_THEMES.city, [wx, wy] = T.world(key), m = T.mains(T.seedNow != null ? T.seedNow : chronoSeed()); return d === 'e' || d === 'w' ? !m.rows.includes(wy) : !m.cols.includes(wx); }, alleyPave: 34, // Round 396 (owner: "standardize curb size"): the same curb and pavement as a main road
    worldLots: true, topdown: true, tilt: 30, mall: false /* Round 501: the mall is a generated building */, spriteWorld: true /* Round 501 (owner) */, noParks: true /* Round 498 (owner) */, coastCrisp: true, coastLip: true /* Round 461 (owner chose C) */, gridKerb: true /* Round 464 (owner: "switch it on") */, noShadows: true /* Round 468 (owner: "lets remove all shadows they dont look right") */, startKey: '0,5', alleys: 0.35, cornerR: 22, keys: () => Object.keys(CITY_ROOMS),
    span: (wx, wy, seed) => typeof CITY_ROOMS !== 'undefined' && CITY_ROOMS[wx + ',' + (wy + 4)] ? genPlan('city', wx + ',' + (wy + 4), seed) : null,
    maxH: 300, // Round 394 (owner: "buildings should probably be around 3 times bigger")
    storey: { 'noodle-bar': 0.75, arcade: 0.88, 'pawn-shop': 0.75, 'capsule-hotel': 1.07, 'neon-tower': 1.56, 'corner-store': 0.94, 'ramen-stall': 0.7, 'repair-shop': 0.83, 'tattoo-parlour': 0.83, cinema: 0.83, tenement: 1.6, 'garden-block': 1.36, 'container-home': 1.36, 'clinic-block': 1.6, apartment: 1.5, 'scrap-shop': 0.94, 'ac-tower': 1.6, 'scrap-shack': 1.25, 'courtyard-block': 1.6, 'collapsed-block': 1.36, 'server-block': 1.19, substation: 1.67, 'parking-garage': 1.32, 'relay-hut': 1.25, 'coolant-tower': 1.25, 'drone-hangar': 1.36, 'battery-depot': 1.15, 'conveyor-factory': 1.07, pagoda: 0.94, 'shrine-gate': 0.75, 'tea-house': 0.7, 'lantern-court': 0.7, 'bell-pavilion': 0.7, greenhouse: 0.7, 'bridge-house': 1.07, 'tea-terrace': 0.75 , 'laundromat': 1.6, 'pharmacy': 1.6, 'karaoke-bar': 1.6, 'food-court': 1.44, 'walkup-flats': 1.6, 'boarding-house': 1.6, 'shanty-block': 1.6, 'data-relay': 1.44, 'robotics-workshop': 0.83, 'bathhouse': 1.25, 'temple-hall': 1.39},
    lamp: '120,230,255', vignette: '2,6,14' }
};
// =====================================================================
// Round 483 (owner: "can we apply the same world generation algorithm to solaris but instead of city buildings we will
// want to have pyramids, huts and buildings that fit the techno desert theme"). Solaris on the city's generator, from
// the owner's four sheets (assets/environment/solaris-gen/). Its room map (SOLARIS_LAYOUT: 9x6, three corners cut), room
// names, bosses and events stay; the streets, lots, buildings, oases and landmarks are generated. No sea: the ground
// between everything is sand. Its four quarters: the bazaar (sandstone, spice stalls, clay roofs), the mud-brick homes
// (adobe and huts, woven roofs), the solar works (solar walls and roofs, tech fronts) and the water quarter (sandstone,
// water sellers, copper domes). Oases are the parks: oasis grass, palms, the oasis rim. A preview only for now: Solaris
// is still played on its tile world until the owner has seen it.
// =====================================================================
GEN_THEMES.solaris = Object.assign({}, GEN_THEMES.city, { id: 'solaris', art: 'assets/environment/solaris-gen/', version: () => '483',
  exits: key => { const r = typeof SOLARIS_LAYOUT !== 'undefined' && SOLARIS_LAYOUT[key]; return r ? Object.assign({}, r.exits) : null; },
  world: key => key.split(',').map(Number),
  bossRooms: () => ['5,2', '8,0', '8,5'].filter(k => typeof SOLARIS_LAYOUT !== 'undefined' && SOLARIS_LAYOUT[k]),
  landing: () => ['0,5', ...GEN_THEMES.solaris.bossRooms()],
  keys: () => Object.keys(SOLARIS_LAYOUT), startKey: '0,5',
  span: (wx, wy, seed) => typeof SOLARIS_LAYOUT !== 'undefined' && SOLARIS_LAYOUT[wx + ',' + wy] ? genPlan('solaris', wx + ',' + wy, seed) : null,
  mains: seed => { const T = GEN_THEMES.solaris, ck = String(seed); if (T.mainsCache && T.mainsCache.ck === ck) return T.mainsCache; const h = t => chronoHash(ck + ':sol-mains:' + t);
    return T.mainsCache = { ck, rows: [1 + h('r1') % 2, 3 + h('r2') % 2], cols: [h('c1') % 3, 3 + h('c2') % 3, 6 + h('c3') % 3] }; },
  alley: (key, d) => { const T = GEN_THEMES.solaris, [wx, wy] = T.world(key), m = T.mains(T.seedNow != null ? T.seedNow : chronoSeed()); return d === 'e' || d === 'w' ? !m.rows.includes(wy) : !m.cols.includes(wx); },
  hole: () => false, mall: false, noParks: false /* (Solaris keeps its oases) */, mainsCache: null, alleyVerge: true, oasis: true, lampGlow: .1, parkDim: 'rgba(0,10,8,.08)', floorRange: [1, 2], landmarkLot: 380, landmarkW: 360, landmarkSpan: 420, noLanes: true, roadDim: 'rgba(120,70,20,.16)', groundDim: 'rgba(90,50,10,.06)', pavingDim: 'rgba(90,50,10,.06)',
  tex: { pipes: 'surfaces/park/oasis-grass', chasm: 'surfaces/water/oasis-water', overgrowth: 'surfaces/park/oasis-grass', water: 'surfaces/water/oasis-water', sand: 'surfaces/sand/sand', floor: 'surfaces/plaza/plaza', 'road-wet': 'surfaces/sand/sand' /* Round 485 (owner: "roads need to be sand") */, gravel: 'surfaces/plaza/plaza', yard: 'surfaces/lot/lot', 'pavement-old': 'surfaces/sand/sand', ground: 'surfaces/sand/sand', 'rubble-big': 'surfaces/sand/sand' },
  legacy: null, mix: [{ on: 'road', tex: 'road-wet', tag: 'wet', period: 6, cut: 9 }] /* (only so the road texture loads: the top-down painter mixes nothing) */,
  texScale: { chasm: 0.4, gravel: 0.35, floor: 0.35, yard: 0.35, ground: 0.4, 'road-wet': 0.35, 'pavement-old': 0.4, plaza: 0.35, sand: 0.4, water: 0.4, overgrowth: 0.4, pipes: 0.4 },
  kerb: ['#3a2410', '#e2c48c', '#8a6236'], yardRim: ['#3a2410', '#d8b47a'], groundShade: 'rgba(60,30,0,.08)', lamp: '255,214,140', vignette: '40,20,0',
  districtNames: ['market', 'homes', 'tech', 'garden'],
  surfaceSlots: new Set(['road', 'sidewalk', 'plaza', 'sand', 'lot', 'park', 'water', 'market-floor', 'roof', 'curb', 'desert-edge', 'yard-edge', 'park-edge', 'wall', 'shop', 'waterfront-edge',
    'market-wall', 'market-roof', 'market-shop', 'home-wall', 'home-roof', 'home-shop', 'tech-wall', 'tech-roof', 'tech-shop', 'garden-wall', 'garden-roof', 'garden-shop', 'mall-wall', 'mall-roof', 'mall-shop', 'ruin-wall']),
  slotDir: { sidewalk: 'sand', 'market-wall': 'wall', 'market-roof': 'roof', 'market-shop': 'shop', 'home-wall': 'wall', 'home-roof': 'roof', 'home-shop': 'shop', 'tech-wall': 'wall', 'tech-roof': 'roof', 'tech-shop': 'shop', 'garden-wall': 'wall', 'garden-roof': 'roof', 'garden-shop': 'shop' },
  tdArt: { wall: ['wall-sandstone', 'wall-adobe'], roof: ['roof-gravel', 'roof-sandstone', 'roof-clay'], shop: ['shop-spice', 'shop-water'],
    'market-wall': ['wall-sandstone'], 'market-roof': ['roof-clay', 'roof-sandstone', 'roof-gravel'], 'market-shop': ['shop-spice'],
    'home-wall': ['wall-adobe', 'wall-mudbrick'], 'home-roof': ['roof-woven', 'roof-clay', 'roof-gravel'], 'home-shop': ['wall-hutdoor'],
    'tech-wall': ['wall-solar'], 'tech-roof': ['roof-solar', 'roof-copper', 'roof-gravel'], 'tech-shop': ['shop-tech'],
    'garden-wall': ['wall-sandstone', 'wall-adobe'], 'garden-roof': ['roof-copper', 'roof-sandstone', 'roof-gravel'], 'garden-shop': ['shop-water'],
    curb: ['kerb-sandstone'], 'park-edge': ['oasis-rim'], sidewalk: ['sand'] /* the ground between everything is sand */, park: ['oasis-grass'], 'waterfront-edge': [],
    'mall-wall': [], 'mall-roof': [], 'mall-shop': [], 'roof-hole': [], 'ruin-wall': [], rubble: [], 'traffic-light': [], 'prop-ac': [], 'prop-skylight': [], 'prop-heater': [], 'sign-h': [], 'sign-v': [],
    'prop-vent': ['chimney'], 'prop-tank': ['tank'], 'prop-stairs': ['windcatcher'], 'prop-solar': ['mirror'],
    car: ['rover', 'skiff'], tree: ['tree-palm'], lamp: [] /* Round 484 (owner: "no lamps in desert") */, 'sign-traffic': ['banner'], cargo: ['jars', 'camel'], clutter: ['plant-succulent'],
    landmark: ['pyramid', 'obelisk', 'sphinx', 'fountain'],
    "building-market": ["spice-shop", "bazaar-hall", "crystal-stall", "fruit-stall"], "building-homes": ["adobe-house", "terrace-house", "beehive-hut", "windcatcher-house", "thatch-hut"], "building-tech": ["solar-hall", "skiff-hangar", "battery-tower", "relay-house", "pyramid-station", "observatory"], "building-garden": ["well-house", "domed-bathhouse", "water-shop", "cistern-house", "pyramid-shrine", "sun-temple", "obelisk-gate", "oasis-house"] /* Round 499: the owner's desert buildings (props/building-<quarter>/) */ },
  districtArt: { market: { wall: 'market-wall', roof: 'market-roof', shop: 'market-shop' }, homes: { wall: 'home-wall', roof: 'home-roof', shop: 'home-shop' }, tech: { wall: 'tech-wall', roof: 'tech-roof', shop: 'tech-shop' }, garden: { wall: 'garden-wall', roof: 'garden-roof', shop: 'garden-shop' } },
  roofKit: { 'roof-gravel': ['prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar'], 'roof-sandstone': ['prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar'] },
  landmarkAspect: { pyramid: 1.14, obelisk: 0.43, sphinx: 1.15, fountain: 1.24 },
  cargoSize: { jars: [70, 1.19], camel: [90, 1.21] },
  clutterH: { 'plant-succulent': 34 }, doorWalls: ['wall-hutdoor'] });
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
const genWorldCache = {}, genWorldScore = {};
function genWorld(seed) {
  const ck = GEN.id + ':' + seed; if (genWorldCache[ck]) return genWorldCache[ck];
  for (const k of Object.keys(genWorldCache)) if (k.startsWith(GEN.id + ':')) delete genWorldCache[k];
  const keys = GEN.keys(), pos = {}; let NX = 0, NY = 0; for (const k of keys) { const [x, y] = GEN.world(k); pos[k] = [x, y]; NX = Math.max(NX, x + 1); NY = Math.max(NY, y + 1); }
  const CW = NX * FG_COLS, CH = NY * FG_ROWS, cell = new Uint8Array(CW * CH), mainCell = new Uint8Array(CW * CH); let rnd = chronoRng(seed + ':world:' + GEN.id); // 0 nothing, 1 open ground, 2 street, 3 water or its shore, 4 sidewalk (Round 445)
  for (const k of keys) { const [wx, wy] = pos[k], p = chronoRoomPlan(seed, k, { roadsOnly: true }), t = chronoTerrain(seed, k);
    for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) { const i = (wy * FG_ROWS + y) * CW + wx * FG_COLS + x; cell[i] = p.floor[y * FG_COLS + x] ? 2 : t.chasm(x >> 1, y >> 1) ? 3 : 1; if (p.main && p.main[y * FG_COLS + x]) mainCell[i] = 1; } }
  const at = (x, y) => x < 0 || y < 0 || x >= CW || y >= CH ? 0 : cell[y * CW + x];
  // The beach: the sand is 50px wide round the sea, its corners rounded, with the shoreline strip 18px beyond it. Round 445
  // (owner: "there is a square shape overlapping the beach ... make sure it cant happen"): nothing is built within 3 cells
  // (75px) of the sea, diagonals included. It was 2 cells straight across only, so a lot at a corner of the shore, or one
  // against the shoreline strip, lay over the sand.
  { const SH = GEN.topdown ? 3 : 2, shore = []; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (cell[y * CW + x] === 1) { let near = false;
      if (GEN.topdown) { for (let b = -SH; b <= SH && !near; b++) for (let a = -SH; a <= SH; a++) if (at(x + a, y + b) === 3) { near = true; break; } }
      else for (let d = 1; d <= 2 && !near; d++) if ([[d, 0], [-d, 0], [0, d], [0, -d]].some(([a, b]) => at(x + a, y + b) === 3)) near = true;
      if (near) shore.push(y * CW + x); } for (const i of shore) cell[i] = 3; }
  // Round 445: a sidewalk one cell (25px) wide runs along every main road (round its corners too): open ground that is
  // never built on, so buildings stand back from the main roads and lamps, lights and signs have somewhere to stand.
  // Alleys have none: buildings stand right on them.
  if (GEN.topdown) { const walk = []; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { if (cell[y * CW + x] !== 1) continue;
      let m = false; for (let b = -1; b <= 1 && !m; b++) for (let a = -1; a <= 1; a++) { const nx = x + a, ny = y + b; if (nx >= 0 && ny >= 0 && nx < CW && ny < CH && cell[ny * CW + nx] === 2 && (mainCell[ny * CW + nx] || GEN.alleyVerge)) { m = true; break; } } // Round 486: Solaris's alleys have a sand verge too (an alley with a house on each side left the hero no way through)
      if (m) walk.push(y * CW + x); } for (const i of walk) cell[i] = 4; }
  const open = v => v === 1 || v === 4;
  // blocks: the open ground the streets enclose (4-connected)
  const block = new Int32Array(CW * CH).fill(-1), boxes = [];
  for (let i = 0; i < cell.length; i++) if (open(cell[i]) && block[i] < 0) { const id = boxes.length, q = [i], b = [CW, CH, 0, 0]; block[i] = id;
    for (let h = 0; h < q.length; h++) { const j = q[h], x = j % CW, y = (j - x) / CW; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x + 1); b[3] = Math.max(b[3], y + 1);
      for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + c; if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue; const n = ny * CW + nx; if (open(cell[n]) && block[n] < 0) { block[n] = id; q.push(n); } } }
    boxes.push(b); }
  // lots: split each block's box in two, again and again, until a piece is lot-sized; keep pieces that are mostly this block
  const LW = 11, LH = 12, MIN = 5; let lots = [];
  const inside = (r, id) => { let n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) if (block[y * CW + x] === id) n++; return n / ((r[2] - r[0]) * (r[3] - r[1])); };
  const front = r => { for (let x = r[0]; x < r[2]; x++) for (const y of [r[1] - 1, r[1] - 2, r[3], r[3] + 1]) if (at(x, y) === 2) return true; for (let y = r[1]; y < r[3]; y++) for (const x of [r[0] - 1, r[0] - 2, r[2], r[2] + 1]) if (at(x, y) === 2) return true; return false; };
  const split = (r, id) => { const w = r[2] - r[0], h = r[3] - r[1]; if (w < MIN || h < MIN) return;
    if (w <= LW && h <= LH) { if (inside(r, id) >= (GEN.topdown ? 1 : 0.85)) lots.push({ r, id, front: front(r) }); else if (w >= MIN * 2 || h >= MIN * 2) { /* Round 416 (owner: "some buildings are being drawn on top of the road path"): a lot lies wholly on its block; one that reaches over a street is split again */ if (w >= h) { const m = r[0] + (w >> 1); split([r[0], r[1], m, r[3]], id); split([m, r[1], r[2], r[3]], id); } else { const m = r[1] + (h >> 1); split([r[0], r[1], r[2], m], id); split([r[0], m, r[2], r[3]], id); } } return; }
    // Round 400 (owner: "a little bit too dense ... need some alleyways"): about a third of the cuts leave a one-cell alley.
    const gap = GEN.alleys && rnd() < GEN.alleys ? 1 : 0;
    if (w / LW >= h / LH) { const m = r[0] + Math.max(MIN, Math.min(w - MIN - gap, Math.round(w * (0.4 + rnd() * 0.2)))); split([r[0], r[1], m, r[3]], id); split([m + gap, r[1], r[2], r[3]], id); }
    else { const m = r[1] + Math.max(MIN, Math.min(h - MIN - gap, Math.round(h * (0.4 + rnd() * 0.2)))); split([r[0], r[1], r[2], m], id); split([r[0], m + gap, r[2], r[3]], id); } };
  if (!GEN.topdown) boxes.forEach((b, id) => split(b, id));
  // =====================================================================
  // Round 445 (owner: "review our neon aftermath procedural world generation algorithm, debug it, and improve it"). The
  // top-down city's lots, laid out along its streets:
  //   1. The buildable ground (open ground less the sidewalks) is cut into rectangles, the largest first, so every
  //      rectangle's sides lie on a street, a sidewalk, the shore or another rectangle: nothing is left over but slivers
  //      under 3 cells. (The old way split each block's bounding box and threw away pieces that crossed a street, which
  //      left buildings standing back from the streets at odd distances and bare patches between them.)
  //   2. Each rectangle is cut into rows 7 to 13 cells deep (175 to 325px), so every building has room for three storeys
  //      at one scale, with a one-cell back alley between some rows; each row into lots 5 to 11 cells wide, with a
  //      one-cell alley in about a third of the cuts.
  //   3. A piece too shallow or too narrow for a building at that scale is a `small` lot: a yard, a parking lot or a
  //      pocket park, never a building with squeezed storeys.
  // =====================================================================
  const BUILD_D = 7, BUILD_W = 5, ROW_MAX = 13, LOT_MAX = 11;
  const isBuild = r => r[2] - r[0] >= BUILD_W - 1 && r[3] - r[1] >= BUILD_D; // (a building may be 4 cells wide where a square was cut from its lot)
  if (GEN.topdown) { const free = new Uint8Array(CW * CH); for (let i = 0; i < cell.length; i++) free[i] = cell[i] === 1 ? 1 : 0;
    const rects = [], hgt = new Int16Array(CW);
    const bigRect = (X0, Y0, X1, Y1) => { let best = null; hgt.fill(0); // the largest rectangle of free cells inside a box, at least 3 cells each way
      for (let y = Y0; y < Y1; y++) { const st = [];
        for (let x = X0; x <= X1; x++) { const h = x < X1 ? (hgt[x] = free[y * CW + x] ? hgt[x] + 1 : 0) : 0; let start = x;
          while (st.length && st[st.length - 1][1] >= h) { const [sx, sh] = st.pop(), w = x - sx; if (sh >= 3 && w >= 3 && (!best || w * sh > best.a)) best = { a: w * sh, r: [sx, y - sh + 1, x, y + 1] }; start = sx; }
          st.push([start, h]); } }
      return best; };
    const takeRect = r => { for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) free[y * CW + x] = 0; };
    // Round 450 (owner: "a large shopping mall and parking lot style area ... it should take the size of 4 rooms"): one
    // mall a city. A window two rooms wide and two tall (64x40 cells) is slid over the city in half-room steps; the one
    // whose largest open rectangle is biggest (one of the best few, by the seed) is the mall's. In it, that rectangle's
    // north side is the mall, one building up to 900px wide whose front opens on a walkway and the parking lot below it;
    // every other piece of buildable ground in the window is parking too. The streets through it stay as they are.
    const mallLots = [];
    if (GEN.mall) { const MW = 2 * FG_COLS, MH = 2 * FG_ROWS, wins = [], sk = GEN.startKey && pos[GEN.startKey];
      for (let y0 = 0; y0 + MH <= CH; y0 += FG_ROWS / 2) for (let x0 = 0; x0 + MW <= CW; x0 += FG_COLS / 2) {
        if (sk && sk[0] * FG_COLS < x0 + MW && (sk[0] + 1) * FG_COLS > x0 && sk[1] * FG_ROWS < y0 + MH && (sk[1] + 1) * FG_ROWS > y0) continue; // not where the journey starts
        const b = bigRect(x0, y0, x0 + MW, y0 + MH); if (b && b.r[2] - b.r[0] >= 20 && b.r[3] - b.r[1] >= 14) wins.push({ x0, y0, b }); }
      if (wins.length) { wins.sort((a, b) => b.b.a - a.b.a); const top = wins.filter(w => w.b.a >= wins[0].b.a * 0.85), W = top[chronoHash(seed + ':mall') % top.length], M = W.b.r, w = M[2] - M[0], h = M[3] - M[1];
        const bw = Math.min(w, 36), bd = h >= 21 ? Math.min(15, Math.max(10, Math.round(h * 0.4))) : h, bx0 = M[0] + ((w - bw) >> 1);
        mallLots.push({ r: [bx0, M[1], bx0 + bw, M[1] + bd], mall: 'building' });
        if (bx0 - M[0] >= 4) mallLots.push({ r: [M[0], M[1], bx0 - 1, M[1] + bd], mall: 'parking' }); // beside a mall narrower than its ground
        if (M[2] - (bx0 + bw) >= 4) mallLots.push({ r: [bx0 + bw + 1, M[1], M[2], M[1] + bd], mall: 'parking' });
        if (h - bd - 1 >= 4) mallLots.push({ r: [M[0], M[1] + bd + 1, M[2], M[3]], mall: 'parking' }); // the walkway along the mall's front is the cell row left between
        takeRect(M);
        for (let g = 0; g < 200; g++) { const b = bigRect(W.x0, W.y0, W.x0 + MW, W.y0 + MH); if (!b) break; takeRect(b.r); mallLots.push({ r: b.r, mall: 'parking' }); } } }
    for (let guard = 0; guard < 4000; guard++) { const best = bigRect(0, 0, CW, CH); if (!best) break; rects.push(best.r); takeRect(best.r); }
    const rowsOf = D => { // a rectangle's depth as rows of 7 to 13 cells: [offset, depth] of each
      if (D < 2 * BUILD_D) return [[0, D]];
      const nmin = Math.ceil(D / ROW_MAX), nmax = Math.floor(D / BUILD_D), n = Math.max(nmin, Math.min(nmax, Math.round(D / 9.5)));
      let gaps = 0; for (let i = 0; i < n - 1; i++) if (D - gaps - 1 >= n * BUILD_D && rnd() < GEN.alleys) gaps++;
      const parts = new Array(n).fill(Math.floor((D - gaps) / n)); for (let i = 0, extra = (D - gaps) - parts[0] * n; i < extra; i++) parts[i % n]++;
      for (let t = 0; t < n * 2; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); if (i !== j && parts[i] > BUILD_D + 1 && parts[j] < ROW_MAX - 1 && rnd() < 0.5) { parts[i]--; parts[j]++; } }
      const gapAfter = new Set(); while (gapAfter.size < gaps) gapAfter.add(Math.floor(rnd() * (n - 1)));
      const out = []; let o = 0; parts.forEach((d, i) => { out.push([o, d]); o += d + (gapAfter.has(i) ? 1 : 0); }); return out; };
    const colsOf = (x0, x1, out) => { const w = x1 - x0; // a row's width as lots of 5 to 11 cells
      if (w < 2 * BUILD_W || (w <= LOT_MAX && rnd() < 0.5)) { out.push([x0, x1]); return; }
      const gap = w > 2 * BUILD_W && rnd() < GEN.alleys ? 1 : 0, m = x0 + Math.max(BUILD_W, Math.min(w - BUILD_W - gap, Math.round(w * (0.4 + rnd() * 0.2))));
      colsOf(x0, m, out); colsOf(m + gap, x1, out); };
    const cov = new Uint8Array(CW * CH); // 1 a lot, 2 an alley left between lots on purpose
    for (const m of mallLots) { const r = m.r; lots.push({ r, id: block[r[1] * CW + r[0]], front: front(r), mall: m.mall }); for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) cov[y * CW + x] = 1;
      if (m.mall === 'building') for (let x = r[0]; x < r[2]; x++) if (r[3] < CH && cell[r[3] * CW + x] === 1 && !cov[r[3] * CW + x]) cov[r[3] * CW + x] = 2; }
    for (const R of rects) { const id = block[R[1] * CW + R[0]], rows = rowsOf(R[3] - R[1]);
      rows.forEach(([o, d], ri) => { const cols = []; colsOf(R[0], R[2], cols);
        if (ri < rows.length - 1 && rows[ri + 1][0] > o + d) for (let x = R[0]; x < R[2]; x++) cov[(R[1] + o + d) * CW + x] = 2;
        cols.forEach(([a, b], ci) => { const r = [a, R[1] + o, b, R[1] + o + d]; lots.push({ r, id, front: front(r) });
          for (let y = r[1]; y < r[3]; y++) { for (let x = a; x < b; x++) cov[y * CW + x] = 1; if (ci < cols.length - 1 && cols[ci + 1][0] > b) cov[y * CW + b] = 2; } }); }); }
    // 4. Slivers one or two cells wide are left where a rectangle's edge was set by a jog in the street further along.
    //    Each lot grows over the open cells beside it (up to two cells each way, a whole edge at a time), so buildings
    //    stand up to the sidewalk all along a street.
    for (let pass = 0; pass < 2; pass++) for (const l of lots) { const r = l.r, clear = (x0, y0, x1, y1) => { if (x0 < 0 || y0 < 0 || x1 > CW || y1 > CH) return false; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (cell[y * CW + x] !== 1 || cov[y * CW + x]) return false; return true; };
      const take = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cov[y * CW + x] = 1; };
      if (l.mall !== 'building' && clear(r[0], r[3], r[2], r[3] + 1)) { take(r[0], r[3], r[2], r[3] + 1); r[3]++; }
      if (clear(r[0], r[1] - 1, r[2], r[1])) { take(r[0], r[1] - 1, r[2], r[1]); r[1]--; }
      if (clear(r[2], r[1], r[2] + 1, r[3])) { take(r[2], r[1], r[2] + 1, r[3]); r[2]++; }
      if (clear(r[0] - 1, r[1], r[0], r[3])) { take(r[0] - 1, r[1], r[0], r[3]); r[0]--; }
      l.front = front(r); }
    // the score of the layout: the share of each room's cells that are open ground with nothing on them (sidewalks and alleys apart)
    let worst = 0, sum = 0; for (const k of keys) { const [wx, wy] = pos[k]; let bare = 0; for (let y = 0; y < FG_ROWS; y++) for (let x = 0; x < FG_COLS; x++) { const i = (wy * FG_ROWS + y) * CW + wx * FG_COLS + x; if (cell[i] === 1 && !cov[i]) bare++; }
      const sh = bare / (FG_COLS * FG_ROWS); worst = Math.max(worst, sh); sum += sh; }
    genWorldScore[GEN.id + ':' + seed] = { worst, mean: sum / keys.length }; }
  const cut = (r, h) => { const mg = GEN.topdown ? 0 : 1, g = [h[0] - mg, h[1] - mg, h[2] + mg, h[3] + mg]; // Round 445: in the top-down city a square is a notch in the street wall: the buildings stand right beside and behind it
    if (g[2] <= r[0] || g[0] >= r[2] || g[3] <= r[1] || g[1] >= r[3]) return [r]; // (Round 450: this line had been swallowed by the comment above since Round 445, so a lot with two squares could be cut into overlapping pieces)
    return [[r[0], r[1], g[0], r[3]], [g[2], r[1], r[2], r[3]], [Math.max(r[0], g[0]), r[1], Math.min(r[2], g[2]), g[1]], [Math.max(r[0], g[0]), g[3], Math.min(r[2], g[2]), r[3]]].filter(q => GEN.topdown ? isBuild(q) || (q[2] - q[0] >= 4 && q[3] - q[1] >= 4) : q[2] - q[0] >= 4 && q[3] - q[1] >= 4); }; // Round 445: what is left beside a square is a building where one fits, a small lot from 100px each way, else part of the square's paving // Round 428: 3 cells, like the filled lots
  const roomOf = (cx, cy) => { const k = keys.find(k2 => pos[k2][0] === Math.floor(cx / FG_COLS) && pos[k2][1] === Math.floor(cy / FG_ROWS)); return k || null; };
  // the squares for objects: up to two street-front lots in each room, wholly inside it, clear of the HUD corners
  const plazas = {}, used = new Set(), holes = {}; // Round 400: a square is cut out of its lot (holes); the rest stays built
  // A square: 5x5 cells inside a street-front lot, against the side the street runs along, joined to the street by a short
  // run of paving; it lies wholly in one room (the lot may not).
  const S5 = GEN.topdown ? 4 : 5 /* Round 445: 100px squares in the top-down city (its objects are 42px, Round 441) */, squareFor = (r, room) => { const [ox, oy] = room;
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
  // Round 445: in the top-down city a square may sit at either end of its lot's street side or in the middle; the place
  // that leaves the most building (and the fewest scraps) is taken, a building behind or beside it preferred.
  const squareBest = (r, room) => { const [ox, oy] = room; let best = null;
    for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { if (r[2] - r[0] < S5 || r[3] - r[1] < S5) continue; const lo = a ? r[1] : r[0], hi = (a ? r[3] : r[2]) - S5;
      for (const t of new Set([lo, hi, Math.round((lo + hi) / 2)])) { const q = a ? (a < 0 ? [r[0], t, r[0] + S5, t + S5] : [r[2] - S5, t, r[2], t + S5]) : (b < 0 ? [t, r[1], t + S5, r[1] + S5] : [t, r[3] - S5, t + S5, r[3]]);
        let ext = 0; for (; ext <= 3; ext++) { const probe = a ? [a < 0 ? q[0] - 1 - ext : q[2] + ext, q[1] + 2] : [q[0] + 2, b < 0 ? q[1] - 1 - ext : q[3] + ext]; if (at(probe[0], probe[1]) === 2) break; }
        if (ext > 3) continue;
        if (a < 0) q[0] -= ext; else if (a > 0) q[2] += ext; else if (b < 0) q[1] -= ext; else q[3] += ext;
        // Round 448: a square keeps 4 cells (100px) from the room's edges: one beside a door opened its object as you walked in
        if (q[0] < ox + 4 || q[1] < oy + 4 || q[2] > ox + FG_COLS - 4 || q[3] > oy + FG_ROWS - 4) continue;
        // what is left of the lot: a building kept is worth most; a lot that was never going to be a building loses nothing
        const pieces = cut(r, q), score = (isBuild(r) ? pieces.reduce((n, pc) => n + (isBuild(pc) ? 2 : -0.5), -2) : 2.5) + (b > 0 ? 1 : 0);
        if (!best || score > best.score) { best = [q[0] - ox, q[1] - oy, q[2] - ox, q[3] - oy]; best.front = b > 0; best.score = score; best.back = b > 0 ? 'n' : b < 0 ? 's' : a > 0 ? 'w' : 'e'; } } }
    return best; };
  for (const k of keys) { const [wx, wy] = pos[k], ox = wx * FG_COLS, oy = wy * FG_ROWS, got = [];
    // Round 448: what stands in a square keeps 115px from where each door sets you down, so nothing opens as you walk in
    const ex = GEN.exits(k) || {}, doorPts = GEN.topdown ? Object.keys(ex).filter(d => d.length === 1).map(d => { const c = chronoDoorCell(seed, k, d) * 2 + 2; return d === 'n' ? [c, 2] : d === 's' ? [c, FG_ROWS - 2] : d === 'w' ? [2, c] : [FG_COLS - 2, c]; }) : [];
    const doorClear = (x0, y0, x1, y1, back) => { const sx = back === 'w' ? x0 + 2 : back === 'e' ? x1 - 2 : (x0 + x1) / 2, sy = back === 'n' ? y0 + 2 : back === 's' ? y1 - 2 : (y0 + y1) / 2; // where the object stands: at the square's back
      // and 125px from every edge of the room: where a door sets you down is worked out from the ground on both sides of
      // the edge, so it can be anywhere along an edge, up to about 55px in
      return sx >= 5 && sy >= 5 && sx <= FG_COLS - 5 && sy <= FG_ROWS - 5 && !doorPts.some(([dx, dy]) => Math.hypot(sx - dx, sy - dy) < 4.6); };
    const cands = lots.map((l, i) => ({ l, i })).filter(({ l, i }) => l.front && l.mall !== 'building' && !used.has(i) && l.r[2] > ox && l.r[0] < ox + FG_COLS && l.r[3] > oy && l.r[1] < oy + FG_ROWS);
    const ranked = cands.map(c => ({ ...c, q: GEN.topdown ? squareBest(c.l.r, [ox, oy]) : squareFor(c.l.r, [ox, oy]), s: rnd() })).filter(c => c.q).sort((p, q2) => GEN.topdown ? (q2.q.score - p.q.score) || p.s - q2.s : (q2.q.front - p.q.front) || p.s - q2.s);
    for (const { i, q } of ranked) { if (got.length >= (GEN.topdown ? 3 : 2)) break; // Round 448: up to three squares in the city, so a room with three objects needs no spot on the sidewalk
      const mx = (q[0] + q[2]) / 2 * FG_CELL, my = (q[1] + q[3]) / 2 * FG_CELL - 22;
      if (typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(mx + dx, my + dy))) continue;
      if (got.some(g => Math.hypot((g.x0 + g.x1) / 2 - (q[0] + q[2]) / 2, (g.y0 + g.y1) / 2 - (q[1] + q[3]) / 2) < 8)) continue;
      if (!doorClear(q[0], q[1], q[2], q[3], q.back)) continue;
      got.push({ x0: q[0], y0: q[1], x1: q[2], y1: q[3], back: q.back }); if (GEN.topdown) (holes[i] = holes[i] || []).push([q[0] + ox, q[1] + oy, q[2] + ox, q[3] + oy]); else used.add(i); }
    // a room no lot gives a square to: any open 5x5 beside a street in the room; the lots under it stay open
    if (!got.length) { const spots = [];
      for (const [EM, loose] of GEN.topdown ? [[4, 0], [2, 0], [1, 0], [1, 1] /* Round 457: last, a square anywhere beside a street, even near a door or under the HUD: a room with no square had no open ground for its object but the street */] : [[1, 0]]) { if (spots.length) break; /* Round 448: well inside the room first */ for (let y = EM; y + S5 <= FG_ROWS - EM; y++) for (let x = EM; x + S5 <= FG_COLS - EM; x++) { let open = true; /* (the arrow `open` above is shadowed here) */ for (let j = 0; j < S5 && open; j++) for (let i2 = 0; i2 < S5; i2++) if (at(ox + x + i2, oy + y + j) !== 1 && at(ox + x + i2, oy + y + j) !== 4) { open = false; break; }
        if (!open) continue; let touch = false; for (let t = 0; t < S5; t++) if (at(ox + x - 1, oy + y + t) === 2 || at(ox + x + S5, oy + y + t) === 2 || at(ox + x + t, oy + y - 1) === 2 || at(ox + x + t, oy + y + S5) === 2) touch = true;
        const mx = (x + S5 / 2) * FG_CELL, my = (y + S5 / 2) * FG_CELL - 22;
        if (touch && !lots.some(l => l.mall === 'building' && l.r[0] < ox + x + S5 && l.r[2] > ox + x && l.r[1] < oy + y + S5 && l.r[3] > oy + y) && (loose || (doorClear(x, y, x + S5, y + S5) && !(typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(mx + dx, my + dy)))))) spots.push([x, y]); } }
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
  const lotsPx = [], parkCells = [];
  const parkOk = q => { const M = 3; if (parkCells.some(p => q[0] - 2 < p[2] && q[2] + 2 > p[0] && q[1] - 2 < p[3] && q[3] + 2 > p[1])) return false;
    for (let y = q[1] - M; y < q[3] + M; y++) for (let x = q[0] - M; x < q[2] + M; x++) if (at(x, y) === 3) return false; return true; };
  lots.forEach((l, i) => { let pieces = [l.r]; for (const h of holes[i] || []) pieces = pieces.flatMap(q => cut(q, h));
    for (const q of pieces) { const lseed = Math.floor(rnd() * 1e9); let dock = false; // Round 436: a lot within 4 cells of the shore is on the docks
      if (GEN.topdown) for (let y = q[1] - 4; !dock && y < q[3] + 4; y++) for (let x = q[0] - 4; x < q[2] + 4; x++) if (at(x, y) === 3) { dock = true; break; }
      // Round 413 (owner: "make a rule that there can never be edge on edge, there must be tile in between"): a park (edged
      // by a kerb) keeps at least one clear cell of paving from any other park and from the shore (whose strip is an edge too)
      // Round 445: what a lot is follows from its size. A lot with room for a building at full scale is a building (a few
      // are parks; half of those on the docks are cargo yards); a smaller one is a yard, or a pocket park now and then.
      let use = used.has(i) ? 'plaza' : 'roof'; const roll = rnd(), small = GEN.topdown && !isBuild(q);
      if (use === 'roof') { if (small) use = !dock && !GEN.noParks && roll < 0.3 && parkOk(q) ? 'park' : 'yard'; // Round 498 (owner: the city's grass parks "look weird"): GEN.noParks, a small lot is a yard
        else if (!GEN.noParks && roll < (GEN.topdown ? 0.06 : 0.08) && parkOk(q)) use = 'park'; // (and a big one stays a building, a picture where one fits)
        else if (GEN.topdown && dock && roll > 0.7) use = 'yard'; }
      if (l.mall && use !== 'plaza') use = l.mall === 'building' ? 'roof' : 'yard'; // Round 450: the mall and its parking
      if (use === 'park') parkCells.push(q);
      const rec = { r: [q[0] * C, q[1] * C, q[2] * C, q[3] * C], use, seed: lseed, dock, small, front: front(q) };
      if (GEN.topdown) { const cx = (q[0] + q[2]) >> 1, cy = (q[1] + q[3]) >> 1;
        // (Round 445) facts about a lot that every room it reaches into must agree on, worked out once from the whole city:
        // whether a street runs along its south side (its front then shows a shopfront and signs), and its quarter (the
        // quarter of the room its middle is in). They used to be worked out per room, so a building that crossed a room's
        // edge (about half of them do) could change its walls, its height and its shopfront at the seam.
        { let sy = q[3]; while (sy < q[3] + 2 && at(cx, sy) === 4) sy++; // Round 447: past the sidewalk (a main road's sidewalk lies between; without this no building on a main road had a shopfront)
          rec.south = at(cx, sy) === 2 || (sy === q[3] && at(cx, sy + 1) === 2); }
        const rk = roomOf(cx, cy) || keys.find(k2 => q[2] > pos[k2][0] * FG_COLS && q[0] < (pos[k2][0] + 1) * FG_COLS && q[3] > pos[k2][1] * FG_ROWS && q[1] < (pos[k2][1] + 1) * FG_ROWS);
        // Round 447: the quarter comes from smooth noise at the lot's own place (about two and a half rooms across), so a
        // quarter is a neighbourhood of several streets with one look; by the room, quarters changed building by building
        void rk; rec.qv = GEN.districtNames.map(d => chronoNoise(seed, 'quarter:' + d, cx / FG_COLS, cy / FG_ROWS, 2.2)); rec.district = GEN.districtNames[0]; // (settled below, once every lot's values are known)
        // ruins gather in blast zones (smooth noise over the city) instead of being sprinkled evenly: about 6 in 10 buildings
        // inside a zone, 1 in 40 outside
        rec.blast = chronoNoise(seed, 'blast', cx, cy, 30);
        if (l.mall) { rec.mall = l.mall; if (l.mall === 'building') { rec.south = true; rec.small = false; } } }
      lotsPx.push(rec); } });
  // Round 448: each quarter's noise is measured against its own average and spread over the whole city before the strongest
  // is taken, so every city has all four quarters in fair shares (the raw noises left some cities with three)
  if (GEN.topdown) { const Q = lotsPx.filter(l => l.qv), nq = GEN.districtNames.length, mean = new Array(nq).fill(0), sd = new Array(nq).fill(0);
    for (const l of Q) l.qv.forEach((v, i) => { mean[i] += v / Q.length; }); for (const l of Q) l.qv.forEach((v, i) => { sd[i] += (v - mean[i]) ** 2 / Q.length; });
    for (const l of Q) { let best = 0, bv = -1e9; l.qv.forEach((v, i) => { const z = (v - mean[i]) / (Math.sqrt(sd[i]) || 1); if (z > bv) { bv = z; best = i; } }); l.district = l.mall && GEN.districtNames.includes('market') ? 'market' : GEN.districtNames[best]; delete l.qv; } }
  // Round 447: landmarks. About 1 room in 5 gets one (twelve a city): a building lot on a street, with its middle well inside the room, becomes an open
  // square (the city's own paving, so no new border) with a landmark standing in it. The same landmark is never used
  // again until every other has been, and then as far from its last place as can be: a room is "the one with the statue".
  if (GEN.topdown && CITY_HAS('landmark')) { const names = CITY_TD_ART.landmark, placed = [];
    // Round 485 (owner: "bigger monuments"): with GEN.landmarkSpan a monument's square also takes the building lots beside it
    // in the same row (same top and bottom), up to that width; the lot is chosen for the largest monument it then holds,
    // and the larger squares go to the broad monuments (pyramid, sphinx) first.
    const growOf = c => { let r = c.r.slice(); const took = [];
      if (GEN.landmarkSpan) for (let grew = true; grew && r[2] - r[0] < GEN.landmarkSpan;) { grew = false;
        const ox = Math.floor((c.r[0] + c.r[2]) / 2 / 800) * 800, nb = lotsPx.filter(l => l !== c && !took.includes(l) && l.use === 'roof' && !l.mall && (c.south ? l.r[3] === r[3] : l.r[1] === r[1]) && Math.min(r[3], l.r[3]) - Math.max(r[1], l.r[1]) >= 175 && (l.r[0] === r[2] || l.r[2] === r[0]) && Math.max(r[2], l.r[2]) - Math.min(r[0], l.r[0]) <= GEN.landmarkSpan + 60)
          .sort((a, b) => Math.abs((a.r[0] + a.r[2]) / 2 - (ox + 400)) - Math.abs((b.r[0] + b.r[2]) / 2 - (ox + 400)))[0];
        if (nb) { r = [Math.min(r[0], nb.r[0]), Math.max(r[1], nb.r[1]), Math.max(r[2], nb.r[2]), Math.min(r[3], nb.r[3])]; took.push(nb); grew = true; } } // (sharing the street front; the square keeps the shallower depth and the rest of a deeper lot is open sand)
      return { r, took, w: Math.min(GEN.landmarkW || 170, r[2] - r[0] - 38, (r[3] - r[1] - 48) * 1.15) }; };
    for (const k of keys.slice().sort((a, b) => chronoHash(seed + ':lm:' + a) - chronoHash(seed + ':lm:' + b))) { if (placed.length >= 12) break; if (placed.some(q => Math.abs(q[3] - pos[k][0]) <= 1 && Math.abs(q[4] - pos[k][1]) <= 1)) continue; /* Round 448: twelve a city, never in rooms side by side (a chance per room gave some cities two) */ const ox = pos[k][0] * 800, oy = pos[k][1] * 500;
      const cand = lotsPx.filter(l => l.use === 'roof' && !l.mall && !l.small && (l.south || l.front) && (l.r[0] + l.r[2]) / 2 >= ox + 90 && (l.r[0] + l.r[2]) / 2 <= ox + 710 && (l.r[1] + l.r[3]) / 2 >= oy + 110 && (l.r[1] + l.r[3]) / 2 <= oy + 400 && l.r[2] - l.r[0] >= 125 && l.r[2] - l.r[0] <= (GEN.landmarkLot || 275));
      const c = GEN.landmarkSpan ? cand.map(l => [l, growOf(l).w]).sort((a, b) => (b[0].south - a[0].south) || b[1] - a[1] || a[0].seed - b[0].seed).map(a => a[0])[0]
        : cand.sort((a, b) => (b.south - a.south) || (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]) - (b.r[2] - b.r[0]) * (b.r[3] - b.r[1]) || a.seed - b.seed)[0]; if (!c) continue;
      if (GEN.landmarkSpan && growOf(c).w < 180 && placed.filter(q => (CITY_LANDMARK_ASPECT[names[q[2]]] || 1) < 1).length >= 3) continue; // Round 485: at most three small (tall) monuments; a room with no room for a big one keeps its houses // on a street (one to its south first), the smallest such lot
      const g = GEN.landmarkSpan ? growOf(c) : null; if (g) { c.r = g.r; for (const t of g.took) { c.south = c.south || t.south; c.front = c.front || t.front; lotsPx.splice(lotsPx.indexOf(t), 1); } }
      const cx = (c.r[0] + c.r[2]) / 2, cy = (c.r[1] + c.r[3]) / 2, far = n => Math.min(1e9, ...placed.filter(q => q[2] === n).map(q => Math.hypot(q[0] - cx, q[1] - cy))), uses = n => placed.filter(q => q[2] === n).length;
      const broad = n => g && (CITY_LANDMARK_ASPECT[names[n]] || 1) >= 1 && g.w >= 200 ? 0 : g && g.w < 200 && (CITY_LANDMARK_ASPECT[names[n]] || 1) < 1 ? 0 : 1; // big squares for the broad monuments, small ones for the tall
      const n = names.map((_, i) => i).sort((a, b) => (g ? broad(a) - broad(b) : 0) || uses(a) - uses(b) || far(b) - far(a) || a - b)[0];
      c.use = 'landmark'; c.landmark = names[n]; placed.push([cx, cy, n, pos[k][0], pos[k][1]]); } }
  // the blast zones are the 18% of the city where that noise runs highest, so every journey's city has them, about as large
  if (GEN.topdown) { const bl = lotsPx.filter(l => l.use === 'roof').map(l => l.blast).sort((a, b) => a - b), T = bl.length ? bl[Math.floor(bl.length * 0.82)] : 1;
    for (const l of lotsPx) { l.zone = l.blast >= T; l.ruin = !l.mall && (l.seed % 1000) / 1000 < (l.zone ? 0.6 : 0.02); } }
  // =====================================================================
  // Round 501 (owner: "can we redesign the algorithm to build a world out to fit these pre drawn sprite buildings? I do not want
  // any procedurally generated buildings in the game"): with GEN.spriteWorld every building lot is built around one of the
  // owner's pictures, chosen here once for the world. Its own quarter's pictures first, any quarter's when none of those fits;
  // one scale for both sides, 0.75-1.25 (never distorted), the one that fills the lot best among the few best, not one a lot
  // within 40px already has where another fits. The lot then shrinks to the picture: its footprint is the picture plus the
  // 8px padding, on the 25px grid, on the lot's front (south) edge and centred; what is left over becomes a yard where it is
  // 3x3 cells or more, else open paving. A lot nothing fits is a yard. Ruins are rubble yards in their blast zones (until
  // ruin pictures come), and the mall is off (GEN.mall) since it is a generated building.
  // =====================================================================
  if (GEN.spriteWorld && GEN.topdown) {
    const slotsAll = Object.keys(CITY_TD_ART).filter(k => k.startsWith('building-') && (CITY_TD_ART[k] || []).length), F = CITY_BUILDING_FIT, picked = [];
    const fits = (slots, bw, bh) => { const out = []; for (const slot of slots) for (const n of CITY_TD_ART[slot]) { const d = CITY_BUILDING_PX[n]; if (!d) continue; const sc = Math.min(bw / d[0], bh / d[1], F.max);
      if (sc >= F.min) out.push({ slot, n, s: sc, w: d[0] * sc, h: d[1] * sc, fill: (d[0] * sc * d[1] * sc) / (bw * bh) }); } return out.sort((x, y) => y.fill - x.fill || (x.n < y.n ? -1 : 1)); };
    const extra = [], has = k => (CITY_TD_ART[k] || []).length > 0;
    // Round 502: the same placing for the owner's ruins (a blast-zone lot: its quarter's ruins and the blast zone's) and walkable
    // parks (a yard lot: its quarter's parks, which must fill 60% of its width and depth; what is left is paving)
    const place = (l, ownSlots, anySlots, minFill, leftYards) => {
      const bw = l.r[2] - l.r[0] - 16, bh = l.r[3] - l.r[1] - 16, ok = c => !minFill || (c.w >= bw * minFill && c.h >= bh * minFill);
      const own = fits(ownSlots.filter(has), bw, bh).filter(ok), all = own.length ? own : fits(anySlots.filter(has), bw, bh).filter(ok);
      if (!all.length) return false;
      const near = new Set(picked.filter(o => o.r[0] < l.r[2] + 40 && o.r[2] > l.r[0] - 40 && o.r[1] < l.r[3] + 40 && o.r[3] > l.r[1] - 40).map(o => o.sprite.n));
      const top = all.slice(0, 3), st = chronoHash('bsprite:' + l.seed); let sp = null;
      for (let k = 0; k < top.length && !sp; k++) { const c = top[(st + k) % top.length]; if (!near.has(c.n)) sp = c; }
      if (!sp) sp = all.find(c => !near.has(c.n)) || (own.length ? fits(anySlots.filter(has), bw, bh).filter(ok).find(c => !near.has(c.n)) : null) || all[0];
      const needW = Math.min(l.r[2] - l.r[0], Math.ceil((sp.w + 16) / C) * C), needD = Math.min(l.r[3] - l.r[1], Math.ceil((sp.h + 16) / C) * C);
      const x0 = l.r[0] + Math.floor(((l.r[2] - l.r[0]) - needW) / 2 / C) * C, top0 = l.r[3] - needD, old = l.r.slice();
      l.r = [x0, top0, x0 + needW, old[3]]; l.sprite = { slot: sp.slot, n: sp.n, s: sp.s, w: sp.w, h: sp.h }; l.front = front(l.r.map(v => v / C)); picked.push(l);
      if (leftYards) for (const [k, q] of [[1, [old[0], old[1], old[2], top0]], [2, [old[0], top0, x0, old[3]]], [3, [x0 + needW, top0, old[2], old[3]]]]) {
        if (q[2] - q[0] < 3 * C || q[3] - q[1] < 3 * C) continue;
        extra.push(Object.assign({}, l, { r: q, use: 'yard', small: true, seed: (l.seed * 31 + k * 7919) >>> 0, sprite: null, ruin: false, ruinPic: false, front: front(q.map(v => v / C)), south: false })); }
      return true; };
    for (const l of lotsPx) {
      if (l.use === 'roof' && l.ruin) { l.ruin = false; if (place(l, ['ruinpic-' + l.district, 'ruinpic-blast'], Object.keys(CITY_TD_ART).filter(k => k.startsWith('ruinpic-')), 0, true)) l.ruinPic = true; else { l.use = 'yard'; l.small = true; } continue; } // (no ruin picture fits: a rubble yard; cityYardKind picks rubble in a zone)
      if (l.use !== 'roof' || l.mall) continue;
      if (chronoHash('parklot:' + l.seed) % 100 < 8 && !l.dock && !l.zone && place(l, ['parkpic-' + l.district], Object.keys(CITY_TD_ART).filter(k => k.startsWith('parkpic-')), 0.6, true)) { l.use = 'parkpic'; continue; } // Round 502: about one building lot in twelve is a walkable park (where the old grass parks were ~6%)
      const bw = l.r[2] - l.r[0] - 16, bh = l.r[3] - l.r[1] - 16, own = fits(['building-' + l.district].filter(k => slotsAll.includes(k)), bw, bh), all = own.length ? own : fits(slotsAll, bw, bh);
      if (!all.length) { l.use = 'yard'; l.small = true; continue; }
      const near = new Set(picked.filter(o => o.r[0] < l.r[2] + 40 && o.r[2] > l.r[0] - 40 && o.r[1] < l.r[3] + 40 && o.r[3] > l.r[1] - 40).map(o => o.sprite.n));
      const top = all.slice(0, 3), st = chronoHash('bsprite:' + l.seed); let sp = null;
      for (let k = 0; k < top.length && !sp; k++) { const c = top[(st + k) % top.length]; if (!near.has(c.n)) sp = c; }
      if (!sp) sp = all.find(c => !near.has(c.n)) || (own.length ? fits(slotsAll, bw, bh).find(c => !near.has(c.n)) : null) || all[0]; // (another quarter's picture before a twin)
      const needW = Math.min(l.r[2] - l.r[0], Math.ceil((sp.w + 16) / C) * C), needD = Math.min(l.r[3] - l.r[1], Math.ceil((sp.h + 16) / C) * C);
      const x0 = l.r[0] + Math.floor(((l.r[2] - l.r[0]) - needW) / 2 / C) * C, top0 = l.r[3] - needD, old = l.r.slice();
      l.r = [x0, top0, x0 + needW, old[3]]; l.sprite = { slot: sp.slot, n: sp.n, s: sp.s, w: sp.w, h: sp.h }; l.front = front(l.r.map(v => v / C)); picked.push(l);
      for (const [k, q] of [[1, [old[0], old[1], old[2], top0]], [2, [old[0], top0, x0, old[3]]], [3, [x0 + needW, top0, old[2], old[3]]]]) {
        if (q[2] - q[0] < 3 * C || q[3] - q[1] < 3 * C) continue;
        extra.push(Object.assign({}, l, { r: q, use: 'yard', small: true, seed: (l.seed * 31 + k * 7919) >>> 0, sprite: null, front: front(q.map(v => v / C)), south: false })); } }
    for (const e of extra) lotsPx.push(e);
    // walkable parks on about half the yards (not the docks' cargo yards or the blast zones' rubble), where one fills the yard
    const parkSlots = Object.keys(CITY_TD_ART).filter(k => k.startsWith('parkpic-') && has(k));
    if (parkSlots.length) for (const l of lotsPx) { if (l.use !== 'yard' || l.mall || l.dock || l.zone || chronoHash('parkpic:' + l.seed) % 100 >= 50) continue;
      if (place(l, ['parkpic-' + l.district], parkSlots, 0.6, false)) l.use = 'parkpic'; } }
  // Round 445 (owner, Round 393: "shouldn't allow the same building more than once"): neighbours never share a wall or a
  // roof where the art allows. Each building takes numbers for its wall and roof pictures that no building beside or behind it has taken
  // (out of its own slot's list); the painter uses them in place of a random pick.
  if (GEN.topdown && typeof cityLotSlots === 'function') { const built = lotsPx.filter(l => l.use === 'roof'), near = (a, b) => { const ox = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), oy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); return (ox > 0 && oy >= -C) || (oy > 0 && ox >= -C); }; // side by side or back to back, touching or across a one-cell alley
    built.sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0]);
    for (let i = 0; i < built.length; i++) { const l = built[i], sl = cityLotSlots(l), around = []; for (let j = 0; j < i; j++) if (built[j].r[3] >= l.r[1] - 2 * C && near(l, built[j])) around.push(built[j]);
      for (const part of ['wall', 'roof']) { const n = Math.max(1, (CITY_TD_ART[sl[part]] || []).length), taken = new Set(around.filter(o => o.slots[part] === sl[part]).map(o => o[part + 'N'] % n)), start = l.seed % n;
        let pickN = -1; for (let t = 0; t < n; t++) if (!taken.has((start + t) % n)) { pickN = (start + t) % n; break; }
        if (pickN < 0 && sl[part] !== part && !l.ruin) { // every picture of its quarter's short list is taken next door: the city's general list instead
          sl[part] = part; l[part + 'Slot'] = part; const n2 = Math.max(1, (CITY_TD_ART[part] || []).length), taken2 = new Set(around.filter(o => o.slots[part] === part).map(o => o[part + 'N'] % n2));
          for (let t = 0; t < n2; t++) if (!taken2.has((l.seed + t) % n2)) { pickN = (l.seed + t) % n2; break; } }
        l[part + 'N'] = pickN < 0 ? start : pickN; }
      l.slots = sl; } }
  return genWorldCache[ck] = { cell, plazas, buildings, parks: parks.map(r => [r[0] * C, r[1] * C, r[2] * C, r[3] * C]), pos, lotsPx, block, CW, CH, blocks: boxes.length };
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
// Round 483: the city's art tables belong to the theme in use. A theme with its own table (GEN.tdArt, GEN.districtArt, ...)
// is read through these names while it is GEN; every other theme reads the city's.
function genThemed(name, base) { const t = () => (typeof GEN !== 'undefined' && GEN && GEN[name]) || base;
  return new Proxy(base, { get: (_, k) => Reflect.get(t(), k), set: (_, k, v) => Reflect.set(t(), k, v), has: (_, k) => Reflect.has(t(), k), deleteProperty: (_, k) => Reflect.deleteProperty(t(), k),
    ownKeys: () => Reflect.ownKeys(t()), getOwnPropertyDescriptor: (_, k) => { const d = Reflect.getOwnPropertyDescriptor(t(), k); if (d) d.configurable = true; return d; } }); }
const CITY_TD_ART_BASE = { 'market-wall': ['market-flats'], 'mall-wall': ['mall-glass-cyan', 'mall-glass-magenta'], 'mall-roof': ['mall-skylights'], 'mall-shop': ['mall-entrance'], 'waterfront-edge': [], curb: ['kerb-neon'] /* Round 505: the owner's edge sheet */, 'park-edge': ['rim-rail'] /* Round 505 */, sidewalk: ['paving-slabs', 'paving-hex'] /* Round 504 */, roof: ['roof-tar', 'roof-plate', 'roof-slab', 'roof-finegravel', 'roof-bitumen', 'roof-tarchip', 'roof-seam', 'roof-rubber'], wall: ['wall-concrete', 'wall-panel', 'wall-porthole'], shop: ['shop-noodle', 'shop-repair', 'shop-shutters'], 'prop-ac': ['ac-1', 'ac-2', 'ac-3', 'ac-twin'], 'prop-vent': ['vent-1', 'vent-3', 'vent-mesh'], 'prop-tank': ['tank-1', 'tank-sphere', 'tank-cylinder'], 'prop-stairs': ['stairs-1', 'stairs-hut', 'stairs-pod'], 'prop-solar': ['solar-1', 'solar-2'], 'prop-skylight': ['skylight-1', 'skylight-grid'], 'sign-h': ['sign-h-pink', 'sign-h-mixed', 'sign-h-pink2', 'sign-h-orange', 'sign-h-zigzag', 'sign-h-rings', 'sign-h-bulbs', 'sign-h-spiral'], 'sign-v': ['sign-v-cyan', 'sign-v-teal', 'sign-v-purple', 'sign-v-red', 'sign-v-tubes', 'sign-v-awning', 'sign-v-bulbs'], car: ['car-pickup', 'car-swat', 'car-forklift', 'car-digger', 'car-buggy', 'car-camper', 'car-trike', 'car-armour', 'car-crawler', 'car-sport', 'car-van', 'car-cargo', 'car-wreck', 'truck-wreck'], tree: ['tree-1', 'tree-2', 'tree-3', 'tree-oak', 'tree-cypress', 'tree-dead', 'tree-glow', 'bush-flower', 'grass-reeds', 'brambles'], park: ['park-clover', 'park-cracked', 'park-gravel', 'park-leaves', 'park-turf'], 'roof-hole': ['hole-crack', 'hole-double', 'hole-tear'], 'ruin-wall': ['ruin-concrete', 'ruin-cladding', 'ruin-panel', 'ruin-panel-blown', 'ruin-girder'], rubble: ['rubble-slabs', 'rubble-rebar', 'rubble-masonry', 'rubble-trolley', 'rubble-barrel', 'rubble-glass', 'rubble-cornice', 'rubble-panels'], lamp: ['lamp-arm', 'lamp-twin', 'lamp-led'], 'traffic-light': ['light-signal'], 'sign-traffic': ['sign-noentry', 'sign-holo'], cargo: ['container-red', 'container-blue', 'container-stack', 'drums', 'pods', 'hover-pallet', 'cable-drum', 'loader'], 'home-wall': ['home-shanty', 'home-pods'], 'home-roof': [], 'prop-heater': [], 'tech-wall': ['tech-megablock', 'tech-glass', 'tech-vents'], 'tech-roof': ['tech-led-plates', 'tech-glass-grid', 'tech-solar'], 'tech-shop': ['tech-lobby', 'tech-revolving'], 'garden-wall': ['garden-greenhouse', 'garden-planters', 'garden-moss'], 'garden-roof': ['garden-glass', 'garden-hydro'], 'garden-shop': ['garden-flowers', 'garden-plantshop'], 'market-roof': ['market-cables'], 'market-shop': ['market-food', 'market-screens', 'market-pawn', 'market-tech'], clutter: ['dumpster', 'bags', 'vending', 'barricade', 'barrier', 'tyres', 'bench-led', 'recycler', 'pay-bollard'], landmark: ['fountain', 'billboard', 'hovercar', 'sculpture', 'metro', 'holo-stage', 'mech', 'pylon', 'holo-beam'] };
const CITY_TD_ART = genThemed('tdArt', CITY_TD_ART_BASE);
Object.assign(CITY_TD_ART_BASE, {"building-market": ["noodle-bar", "arcade", "pawn-shop", "capsule-hotel", "karaoke-bar", "food-court", "tattoo-parlour", "cyber-repair"], "building-homes": ["tenement", "container-block", "pod-block", "shanty-block", "walkup-flats", "boarding-house", "roof-garden-block", "micro-tower"], "building-tech": ["glass-office", "server-block", "substation", "data-relay", "drone-hangar", "battery-depot", "robotics-workshop", "research-lab"], "building-garden": ["greenhouse", "tea-house", "hydro-farm", "bathhouse", "shrine-hall", "temple-hall", "flower-shop", "lantern-court"]}); // Round 496: the owner's whole buildings, by quarter (props/building-<quarter>/)
// Round 496 (owner: whole-building sprites, "we only place them where they fit and leave procedurally generated buildings
// everywhere else"; "never distort buildings to make them fit. you can increase or decrease the size but never distort"):
// each picture's size in the game at its sheet's scale (its floors as tall as a generated building's), width x height.
const CITY_BUILDING_PX = {"noodle-bar": [184, 193], "arcade": [193, 185], "pawn-shop": [109, 190], "capsule-hotel": [90, 185], "tenement": [178, 216], "container-block": [206, 210], "pod-block": [110, 202], "shanty-block": [99, 197], "glass-office": [167, 198], "server-block": [194, 205], "substation": [99, 200], "data-relay": [81, 211], "greenhouse": [176, 200], "tea-house": [199, 204], "hydro-farm": [103, 200], "bathhouse": [104, 201], "karaoke-bar": [254, 179], "food-court": [256, 176], "tattoo-parlour": [148, 162], "cyber-repair": [146, 183], "walkup-flats": [241, 187], "boarding-house": [250, 186], "roof-garden-block": [172, 186], "micro-tower": [94, 194], "drone-hangar": [229, 180], "battery-depot": [251, 179], "robotics-workshop": [174, 170], "research-lab": [132, 184], "shrine-hall": [248, 188], "temple-hall": [247, 187], "flower-shop": [157, 175], "lantern-court": [149, 185]};
Object.assign(CITY_BUILDING_PX, {"spice-shop": [188, 186], "bazaar-hall": [170, 195], "crystal-stall": [100, 191], "fruit-stall": [110, 188], "adobe-house": [174, 193], "terrace-house": [181, 192], "beehive-hut": [104, 136], "windcatcher-house": [104, 204], "solar-hall": [177, 172], "skiff-hangar": [200, 193], "battery-tower": [83, 179], "relay-house": [112, 199], "well-house": [182, 187], "domed-bathhouse": [181, 191], "water-shop": [88, 172], "cistern-house": [130, 204], "thatch-hut": [171, 192], "pyramid-station": [177, 197], "observatory": [83, 198], "pyramid-shrine": [180, 195], "sun-temple": [181, 183], "obelisk-gate": [69, 197], "oasis-house": [130, 204]}); // Round 499: Solaris's buildings (one sheet scale: a two-floor house about 190px tall)
Object.assign(CITY_TD_ART_BASE, {"ruinpic-market": ["burned-noodle-bar", "collapsed-arcade", "gutted-pawn-shop", "spilled-capsule-hotel"], "ruinpic-homes": ["collapsed-tenement", "crushed-containers", "burned-shanty", "snapped-tower"], "ruinpic-tech": ["shattered-office", "blown-server-block", "wrecked-substation", "toppled-relay"], "ruinpic-blast": ["crater-block", "gutted-front", "halved-building", "fallen-pile"], "parkpic-market": ["night-market-square", "seating-court", "hologram-square", "vending-alley"], "parkpic-homes": ["veg-garden", "playground", "basketball-court", "laundry-garden"], "parkpic-tech": ["glow-plaza", "zen-data-garden", "solar-shade-court", "drone-pad-garden"], "parkpic-garden": ["koi-garden", "shrine-garden", "bamboo-grove", "moss-lantern-garden"]}); // Round 502: the owner's ruins (by quarter, and the blast zone's) and walkable parks
Object.assign(CITY_BUILDING_PX, {"burned-noodle-bar": [193, 187], "collapsed-arcade": [191, 187], "gutted-pawn-shop": [106, 187], "spilled-capsule-hotel": [103, 187], "collapsed-tenement": [193, 195], "crushed-containers": [191, 180], "burned-shanty": [106, 185], "snapped-tower": [103, 191], "shattered-office": [192, 198], "blown-server-block": [192, 194], "wrecked-substation": [106, 183], "toppled-relay": [103, 199], "crater-block": [192, 192], "gutted-front": [191, 199], "halved-building": [105, 200], "fallen-pile": [116, 179], "night-market-square": [175, 175], "seating-court": [174, 153], "hologram-square": [96, 153], "vending-alley": [93, 162], "veg-garden": [175, 175], "playground": [174, 156], "basketball-court": [96, 174], "laundry-garden": [94, 173], "glow-plaza": [175, 170], "zen-data-garden": [174, 177], "solar-shade-court": [96, 172], "drone-pad-garden": [93, 163], "koi-garden": [174, 163], "shrine-garden": [174, 175], "bamboo-grove": [103, 190], "moss-lantern-garden": [94, 157]});
const CITY_BUILDING_FIT = { min: 0.75, max: 1.25, fillW: 0.8, fillH: 0.75 };
// Which picture (if any) stands on a building lot: one of the lot's own quarter that fits its box (bx: the lot less its 8px
// padding) at one scale for both sides, 0.75-1.25 of its size, and fills at least 80% of the box's width and 75% of its depth.
// Chosen from the lot alone (its seed, size and quarter), so a building across a room's edge is the same in both rooms.
function cityLotSpriteFits(l, bw, bh) { if (!GEN.topdown || l.use !== 'roof' || l.mall || cityIsRuin(l)) return [];
  const slot = 'building-' + l.district; if (!CITY_HAS(slot)) return []; const F = CITY_BUILDING_FIT, ok = [];
  for (const n of CITY_TD_ART[slot]) { const d = CITY_BUILDING_PX[n]; if (!d) continue; const s = Math.min(bw / d[0], bh / d[1], F.max);
    if (s >= F.min && d[0] * s >= bw * F.fillW && d[1] * s >= bh * F.fillH) ok.push({ slot, n, s, w: d[0] * s, h: d[1] * s }); }
  return ok; }
// No two lots within 40px of each other (side by side, back to back or across a narrow street) show the same picture: the
// city's choices are made once, in the lots' own order, each avoiding those already made around it.
function cityLotSprite(l) { const wl = genWorld(chronoSeed()); if (GEN.spriteWorld) { const own = wl.lotsPx.find(q => q.seed === l.seed); return own && own.sprite || null; } // Round 501: chosen when the world was built
  if (!wl.spritePick) { const pick = wl.spritePick = new Map(), L = wl.lotsPx;
    L.forEach((q, i) => { const c = cityLotSpriteFits(q, q.r[2] - q.r[0] - 16, q.r[3] - q.r[1] - 16); if (!c.length) return; const near = new Set();
      for (let j = 0; j < i; j++) { const o = L[j]; if (o.r[0] < q.r[2] + 40 && o.r[2] > q.r[0] - 40 && o.r[1] < q.r[3] + 40 && o.r[3] > q.r[1] - 40) { const p = pick.get(o.seed); if (p) near.add(p.n); } }
      const st = chronoHash('bsprite:' + q.seed); let ch = null; for (let k = 0; k < c.length && !ch; k++) { const cand = c[(st + k) % c.length]; if (!near.has(cand.n)) ch = cand; }
      pick.set(q.seed, ch); }); } // (every fitting picture already next door: the lot keeps a generated building)
  return wl.spritePick.get(l.seed) || null; }

// Round 415: for each wall and shopfront strip, the columns (image px) of plain wall between windows (tools/prepare_city_art.py).
// Round 459: the gaps of the walls from the Round 452-454 sheets were marked by hand (a ruler over each picture: pillars,
// seams and plain wall between window bays); the measuring tool took the flat insides of dark or lit windows for plain wall
const CITY_TD_GAPS = {'wall-concrete': [4, 19, 29, 41, 127, 134, 147, 258, 440, 446, 453], 'wall-brick': [2, 11, 19, 73, 81, 291, 299, 307, 362, 371, 377, 435, 441, 447, 456, 515, 523, 585, 595, 601, 674, 741, 750, 756, 804], 'wall-panel': [19, 30, 40, 47, 58, 64, 75, 158, 206, 213, 222, 237, 246, 286, 293, 304, 310, 618, 657, 667, 677, 687, 698, 740, 748], 'shop-noodle': [0, 6, 18, 24, 30, 38, 57, 66, 78, 84, 92, 103, 113, 302, 436, 443, 452], 'shop-repair': [25, 34, 41, 48, 56, 63, 76, 170, 176, 197, 280, 287, 401, 409, 437, 444, 450, 457, 596, 606, 628, 641, 655, 662, 669, 675], 'shop-shutters': [12, 28, 40, 79, 85, 100, 107, 125, 238, 252, 306, 320, 473, 479, 506, 515, 527, 538, 544, 559, 665, 671, 688, 698, 717], 'ruin-brick': [2, 8, 19, 33, 91, 131, 138, 167, 173, 180, 186, 281, 348, 362, 429, 435, 442, 448, 519, 544, 611, 624, 692, 698, 705, 711, 783, 796, 806, 872, 880, 890], 'ruin-concrete': [5, 14, 21, 79, 105, 113, 162, 174, 254, 265, 276, 366, 466, 474, 529, 543, 655, 715, 725, 822, 842, 899, 906, 925, 977], 'ruin-cladding': [3, 186, 283, 365, 376, 566, 613, 626, 657, 664, 673, 685, 692, 705, 713, 725, 733, 752, 759, 771, 779, 787, 799, 810, 818, 831, 842, 850, 945], 'ruin-plaster': [53, 68, 80, 104, 131, 175, 196, 402, 426, 434, 441, 576, 591, 601, 640, 656, 672, 686, 697, 844, 854, 885, 914, 920, 928, 935], 'home-tenement': [23, 47, 69, 106, 119, 218, 225, 239, 248, 334, 345, 361, 445, 457, 471, 481, 564, 570, 578, 785, 795, 804, 888, 899, 952, 1022, 1029, 1133, 1144, 1151, 1163, 1244, 1253, 1262, 1351, 1400, 1480, 1492, 1499, 1579, 1589, 1596, 1610, 1618], 'home-shanty': [13, 68, 77, 139, 145, 151, 157, 163, 169, 175, 239, 246, 261, 269, 374, 381, 491, 498, 513, 527, 578, 681, 692, 725, 735, 854, 886], 'tech-megablock': [43, 68, 125, 131, 142, 190, 232, 286, 336, 388, 394, 431, 439, 482, 524, 572, 583, 625, 706, 717, 757, 801, 813, 860, 866, 873, 915, 1010], 'tech-lobby': [0, 26, 37, 61, 75, 87, 100, 129, 142, 152, 158, 172, 394, 402, 410, 426, 434, 697, 710, 743, 752, 791, 972, 982, 989, 1002, 1018], 'garden-ivy': [1, 12, 62, 71, 82, 96, 104, 113, 187, 443, 451, 479, 539, 632, 647, 665, 805, 811], 'garden-greenhouse': [115, 125, 140, 234, 252, 335, 353, 367, 376, 471, 575, 590, 687, 709, 720], 'garden-flowers': [15, 23, 44, 62, 76, 90, 107, 115, 124, 131, 148, 170, 578, 590, 602, 609, 643, 665, 673, 682], 'market-food': [3, 88, 105, 114, 124, 131, 159, 187, 196, 206, 274, 496, 1126, 1149, 1178, 1211, 1219, 1253, 1277, 1305, 1358, 1396, 1424, 1432, 1438, 1453, 1466, 1474, 1486, 1494, 1509, 1526, 1536, 1549, 1579, 1588, 1601, 1611, 1625, 1713], 'market-screens': [41, 61, 99, 105, 119, 126, 132, 140, 150, 278, 284, 293, 301, 559, 612, 689, 713, 719, 860, 873, 895, 901, 946, 952, 962, 968, 977, 1206, 1216, 1236, 1246, 1344, 1352, 1360, 1371, 1505, 1529, 1541, 1628, 1635, 1642, 1704, 1711], 'market-cloth': [13, 24, 67, 74, 83, 89, 142, 155, 319, 336, 450, 460, 467, 479, 498, 505, 515, 523, 590, 605, 769, 781, 793, 804, 835, 846, 890, 925, 959, 973, 981, 990, 1189, 1203, 1225, 1314, 1329, 1343, 1357, 1549, 1555, 1561, 1639, 1647, 1654, 1664, 1684, 1697], 'market-pawn': [12, 30, 46, 59, 68, 83, 94, 102, 113, 125, 136, 155, 301, 310, 340, 352, 575, 608, 782, 944, 953, 959, 966, 980, 988, 997, 1189, 1199, 1210, 1391, 1430, 1439, 1538, 1545, 1567, 1594, 1603, 1610, 1617, 1624, 1635, 1643, 1651, 1661, 1695, 1703, 1718, 1736, 1742], 'wall-strip': [12], 'wall-strip-dark': [12], 'wall-porthole': [17, 99, 187, 275], 'home-pods': [1, 128], 'ruin-panel': [15, 144], 'ruin-panel-blown': [12, 141], 'ruin-girder': [57, 205, 350], 'market-flats': [95, 195, 292], 'tech-glass': [33, 70, 143, 180, 217, 254, 290], 'tech-vents': [18, 102, 183, 265], 'garden-moss': [20, 118, 312], 'garden-planters': [12, 186], 'mall-glass-cyan': [38, 92, 145, 197, 250, 302], 'mall-glass-magenta': [38, 92, 145, 197, 250, 302], 'mall-entrance': [36, 166], 'tech-revolving': [20, 136], 'garden-plantshop': [4, 162], 'market-tech': [66, 168] };
// Round 420 (owner: "we need to have a rule for each texture tile, there should be tile for under buildings, tile for road,
// tile for curb, tile for waterfront, tile for roofs, and they should all be labeled and sorted clearly and accounted for in
// our algorithm for world generation"). Every surface of the top-down city, in drawing order, with its rule, whether it
// can be walked on, its folder (assets/environment/city-gen/surfaces/<key>/) and how its art is laid. `base` are the
// textures the generator lays (loaded by name, see GEN_THEMES.city.tex); `slot` names a list in CITY_TD_ART (art added
// with tools/prepare_city_art.py). Things that stand on the surfaces (rooftop props, signs, cars, trees) live in
// city-gen/props/<slot>/. tests/city-surfaces.test.cjs checks that every surface has its art, that every file in
// surfaces/ and props/ is listed here or in CITY_TD_ART, and the walk rules; tools/art-refresh/city-surfaces.md lists them.
const CITY_SURFACES = [
  { key: 'sea', label: 'Sea', kind: 'ground', walk: false, base: ['water'], rule: 'Only along the city edge, never inland. Round 446: its outline is the sea cells blurred into bays and headlands (never a staircase of cells), wobbled by world-wide noise; darker far out, pale teal shallows at the shore, a thin broken line of foam.' },
  { key: 'waterfront', label: 'Waterfront (beach sand)', kind: 'ground', walk: true, base: ['sand'], rule: 'The beach: from the shoreline to about one cell inland, wider in bays and narrower on points (Round 446); a darker wet band at the water; meets the sea with no border. Nothing is built within 75px of the sea.' },
  { key: 'waterfront-edge', label: 'Waterfront edge (concrete lip)', kind: 'edge', walk: true, slot: 'waterfront-edge', drawn: true, rule: 'Round 461 (owner chose it): no strip art; the paving ends in a concrete lip drawn by the painter (GEN.coastLip) at full resolution along the sand, with a soft shadow on the sand. A strip bent round the curving coast broke into slices.' },
  { key: 'sidewalk', label: 'Sidewalk paving', kind: 'ground', walk: true, base: ['pavement-old'], slot: 'sidewalk', scale: 0.22, scales: { 'paving-slabs': 0.3, 'paving-hex': 0.3 }, rule: 'All ground that is not road, sea, sand, lot or park. One paving for the whole city, picked by the journey\'s seed (Round 445; a paving per block clashed across every alley). A strip one cell (25px) wide runs along every main road and round its corners, never built on; alleys have none. The squares where objects stand are sidewalk too: a 100px notch in the street wall.' },
  { key: 'road', label: 'Road (asphalt)', kind: 'ground', walk: true, base: ['road-wet'], scale: 0.45, rule: 'One texture for every road and alley (Round 430, owner: never mix textures without a border between them); main roads 100px, alleys 50px; crossings exactly as wide as the roads meeting in them. Round 445: street corners, squares and dead ends all turn on one 22px radius; a waypoint room has a plain crossing (no court); only a boss\'s room has a square. Vehicles park along east-west streets only (they are painted side-on).' },
  { key: 'curb', label: 'Curb (kerb along every road)', kind: 'edge', walk: true, slot: 'curb', rule: 'A kerb-stone strip along both edges of every road, on the sidewalk side, bent round corners.' },
  { key: 'lot', label: 'Under buildings (lot footing)', kind: 'ground', walk: false, base: ['yard', 'yard-cargo', 'yard-rubble'] /* Round 504: parking, cargo and rubble yards each their own ground */, scale: 0.3, rule: 'Under every building, yard and parking lot. Round 445: lots are laid out along the streets. The buildable ground (open ground less the sidewalks) is cut into rectangles, largest first; each into rows 7 to 13 cells deep and lots 5 to 11 cells wide, with one-cell alleys in about a third of the cuts; lots then grow over any sliver beside them. A lot with room for three full storeys is a building; a smaller one is a yard (cargo on the docks, rubble in a blast zone, a parking lot elsewhere) or a pocket park. Never over a street, a sidewalk or the shore.' },
  { key: 'park', label: 'Park (grass)', kind: 'ground', walk: true, base: ['overgrowth'], slot: 'park', rule: 'About 6% of building lots and 3 in 10 of the small lots; corners rounded; trees and rubble on it block; at least one clear cell of sidewalk from any other park and from the shore. Each park lays one grass from its folder over the whole park (Round 430: only one, never mixed), tiled 140px; with no grass art, the base overgrowth.' },
  { key: 'park-edge', label: 'Park edge (kerb round the grass)', kind: 'edge', walk: true, slot: 'park-edge', rule: 'One strip per park, round its rounded outline, on a solid base.' },
  { key: 'roof', label: 'Roofs', kind: 'building', walk: false, slot: 'roof', rule: 'One per building part, tiled 160px; a raised parapet and a cast shadow; rooftop props (props/) sized per kind, 18px clear of the edge. Round 445: no building has the same roof as the one beside or behind it, where the art allows.' },
  { key: 'wall', label: 'Building walls (one floor)', kind: 'building', walk: false, slot: 'wall', rule: 'Floor by floor, each starting and ending on plain wall between windows (CITY_TD_GAPS). Round 445: three floors at least, every storey 42 to 50px on screen (cityLotFloors): a lot too shallow for that is not a building. A building\'s street side and quarter come from the city\'s plan, so it looks the same in every room it reaches into; no building has the same wall as the one beside or behind it, where the art allows.' },
  { key: 'shop', label: 'Shopfronts (street floor)', kind: 'building', walk: false, slot: 'shop', rule: 'The street floor of a building whose street is to the south, fitted like a wall.' },
  // Round 424 (owner: "also destroyed buildings"): about one building in eight is a ruin, once both of its slots have art
  // Round 439 (owner's Sheets G, H, I): each quarter's own walls, roofs and street floors (CITY_DISTRICT_ART)
  { key: 'tech-wall', label: 'Downtown (tech quarter): walls (one floor)', kind: 'building', walk: false, slot: 'tech-wall', rule: 'The upper floors of every building in this quarter (chronoDistrict), fitted floor by floor between windows.' },
  { key: 'tech-roof', label: 'Downtown (tech quarter): roofs', kind: 'building', walk: false, slot: 'tech-roof', rule: 'Every building in this quarter, tiled 160px.' },
  { key: 'tech-shop', label: 'Downtown (tech quarter): street floor', kind: 'building', walk: false, slot: 'tech-shop', rule: 'The street floor of a building in this quarter whose street is to the south.' },
  { key: 'garden-wall', label: 'Garden quarter: walls (one floor)', kind: 'building', walk: false, slot: 'garden-wall', rule: 'The upper floors of every building in this quarter (chronoDistrict), fitted floor by floor between windows.' },
  { key: 'garden-roof', label: 'Garden quarter: roofs', kind: 'building', walk: false, slot: 'garden-roof', rule: 'Every building in this quarter, tiled 160px.' },
  { key: 'garden-shop', label: 'Garden quarter: street floor', kind: 'building', walk: false, slot: 'garden-shop', rule: 'The street floor of a building in this quarter whose street is to the south.' },
    { key: 'market-shop', label: 'Market quarter: street floor', kind: 'building', walk: false, slot: 'market-shop', rule: 'The street floor of a building in this quarter whose street is to the south.' },
    { key: 'market-wall', label: 'Market quarter: walls (one floor)', kind: 'building', walk: false, slot: 'market-wall', rule: 'Round 454: the upper floors of a building in this quarter, fitted floor by floor between windows.' },
    { key: 'market-roof', label: 'Market quarter: roofs', kind: 'building', walk: false, slot: 'market-roof', rule: 'Round 454: the roofs of this quarter (CITY_ROOF_KIT says what stands on each).' },
    { key: 'mall-wall', label: 'The mall: walls (one floor)', kind: 'building', walk: false, slot: 'mall-wall', rule: 'Round 453: the upper floors of the city\'s one mall (GEN.mall), fitted floor by floor between windows.' },
    { key: 'mall-roof', label: 'The mall: roof', kind: 'building', walk: false, slot: 'mall-roof', rule: 'Round 453: the mall\'s one roof; only small kit stands on it (CITY_ROOF_KIT).' },
    { key: 'mall-shop', label: 'The mall: street floor', kind: 'building', walk: false, slot: 'mall-shop', rule: 'Round 453: the mall\'s front, facing its walkway and parking: entrances and display windows.' },
  // Round 436 (owner's Sheet F): the homes district's own walls and roofs
  { key: 'home-wall', label: 'Homes district: walls (one floor)', kind: 'building', walk: false, slot: 'home-wall', rule: 'Every building in the homes quarter: 3 or 4 floors, no shopfront and no signs; fitted floor by floor between windows (CITY_TD_GAPS).' },
  { key: 'ruin-wall', label: 'Destroyed buildings (burnt-out wall, one floor)', kind: 'building', walk: false, slot: 'ruin-wall', rule: 'A ruin\'s walls, floor by floor between window holes. Round 445: ruins gather in blast zones (the 18% of the city where a smooth noise runs highest): about 6 in 10 buildings there, 1 in 50 elsewhere. A ruin has an ordinary roof and parapet with a large hole in it (props/roof-hole/), no rooftop kit, no shopfront and no signs.' }
];
const CITY_SURFACE_SLOTS = new Set(CITY_SURFACES.map(x => x.slot).filter(Boolean));
function cityArtPath(slot, n) { const sl = GEN.surfaceSlots || CITY_SURFACE_SLOTS; return (sl.has(slot) ? 'surfaces/' : 'props/') + ((GEN.slotDir && GEN.slotDir[slot]) || slot) + '/' + n; }
function cityTdArtNames() { return Object.entries(CITY_TD_ART).flatMap(([slot, l]) => l.map(n => cityArtPath(slot, n))); }
// Round 413 (owner: "the edges dont have rounded corner which is a problem, we need edges that can be curved and used at
// 90 degree angles"): a border strip laid along any outline, as spline and path tools in 2D editors bend a strip. The
// outline of `mask` (alpha over half, the mask's top-left at room px ox,oy) is traced with marching squares every 4 room
// px, the crossing points placed by the mask's own alpha so curves come out smooth, and each little segment draws a
// slice of the strip turned to the outline, its top on the line and its depth T going inward. The slice is taken from the
// strip at the segment's world position, so straight runs read as one strip and it runs on across rooms.
// Round 463 (owner: "are you using 3x3 bitmasking for this? can you implement it?"): the streets and their kerbs from the
// city's 25px cells. Each street cell reads its 3x3 neighbourhood: a corner with no street on either side is rounded off
// (radius r), and a sidewalk cell with street on two sides of a corner gets a fillet there; so the road's edge always lies
// on a grid line or on one of those arcs. The kerb is laid centred on that edge (half over the road, half over what is
// beside it): each straight run is one piece of strip, each corner an arc of it, the strip taken from world position.
function cityGridRoad(road, x0, y0, nx, ny, C, r, K, W, H) { // road(cx, cy) over cells x0..x0+nx; returns the road's mask
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff';
  for (let cy = -2; cy < ny + 2; cy++) for (let cx = -2; cx < nx + 2; cx++) { const X = cx * C * K, Y = cy * C * K, S = C * K, R = r * K, at = (a, b) => road(x0 + cx + a, y0 + cy + b);
    if (at(0, 0)) { const tl = !at(-1, 0) && !at(0, -1) ? R : 0, tr = !at(1, 0) && !at(0, -1) ? R : 0, br = !at(1, 0) && !at(0, 1) ? R : 0, bl = !at(-1, 0) && !at(0, 1) ? R : 0;
      g.beginPath(); g.moveTo(X + tl, Y); g.lineTo(X + S - tr, Y); if (tr) g.arc(X + S - tr, Y + tr, tr, -Math.PI / 2, 0); g.lineTo(X + S, Y + S - br); if (br) g.arc(X + S - br, Y + S - br, br, 0, Math.PI / 2);
      g.lineTo(X + bl, Y + S); if (bl) g.arc(X + bl, Y + S - bl, bl, Math.PI / 2, Math.PI); g.lineTo(X, Y + tl); if (tl) g.arc(X + tl, Y + tl, tl, Math.PI, Math.PI * 1.5); g.closePath(); g.fill(); }
    else for (const [a, b, px, py, a0, a1] of [[-1, -1, X, Y, Math.PI * 1.5, Math.PI], [1, -1, X + S, Y, Math.PI, Math.PI / 2], [1, 1, X + S, Y + S, Math.PI / 2, 0], [-1, 1, X, Y + S, 0, -Math.PI / 2]]) {
      if (!(at(a, 0) && at(0, b))) continue; // a fillet in this corner: the corner square less a quarter circle centred r in from it
      const cx2 = px - a * R, cy2 = py - b * R, A = Math.atan2(0, px - cx2), B = Math.atan2(py - cy2, 0); let dl = B - A; while (dl > Math.PI) dl -= 2 * Math.PI; while (dl <= -Math.PI) dl += 2 * Math.PI; void a0; void a1;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px, cy2); g.arc(cx2, cy2, R, A, B, dl < 0); g.closePath(); g.fill(); } }
  return c; }
// Round 465 (owner: "overlapping edges, any way to create a rule to keep this from happening?"): one edge per seam. A lot's
// rim is drawn only where the cell beside it is open paving: a seam with a street is the kerb's, a seam with a building is
// the building's own wall, and of two yards or parks side by side only the lower-numbered one draws the shared seam.
function cityRimKeep(l) { const wl = genWorld(chronoSeed()), C = FG_CELL;
  if (!wl.lotIndex) { wl.lotIndex = new Int32Array(wl.CW * wl.CH).fill(-1); wl.lotsPx.forEach((q, i) => { for (let y = q.r[1] / C; y < q.r[3] / C; y++) for (let x = q.r[0] / C; x < q.r[2] / C; x++) wl.lotIndex[y * wl.CW + x] = i; }); }
  // Round 475 (owner: "found an issue with edges, can we fix this with rules?"): yards beside yards and parks beside parks are
  // one area (`wl.rimLead`, the lowest lot of each group): one rim round the whole of it, none down the middle
  if (!wl.rimLead) { const kind = q => q.use === 'park' ? 'park' : cityIsYard(q) ? 'yard' : null, lead = wl.lotsPx.map((q, i) => i), find = i => lead[i] === i ? i : (lead[i] = find(lead[i]));
    for (let y = 0; y < wl.CH; y++) for (let x = 0; x < wl.CW; x++) { const a = wl.lotIndex[y * wl.CW + x]; if (a < 0 || !kind(wl.lotsPx[a])) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) { if (x + dx >= wl.CW || y + dy >= wl.CH) continue; const b = wl.lotIndex[(y + dy) * wl.CW + x + dx]; if (b < 0 || b === a || kind(wl.lotsPx[b]) !== kind(wl.lotsPx[a])) continue; const ra = find(a), rb = find(b); if (ra !== rb) { if (ra < rb) lead[rb] = ra; else lead[ra] = rb; } } }
    wl.rimLead = wl.lotsPx.map((q, i) => find(i)); }
  const idx = wl.lotsPx.indexOf(l) >= 0 ? wl.lotsPx.indexOf(l) : wl.lotsPx.findIndex(q => q.seed === l.seed), me = wl.rimLead[idx];
  const fn = (X, Y, NX, NY) => { if (NX < 0 || NY < 0 || NX >= wl.CW || NY >= wl.CH) return true; const c = wl.cell[NY * wl.CW + NX]; if (c === 2) return false;
    const o = wl.lotIndex[NY * wl.CW + NX]; if (o < 0) return true; const lo = wl.rimLead[o]; if (lo === me) return false; const ol = wl.lotsPx[o]; if (ol.use === 'roof' || ol.use === 'landmark' || ol.use === 'plaza' || ol.use === 'parkpic' /* Round 502: a park picture has its own kerb */) return true; return me < lo; };
  fn.lead = idx === me; fn.me = me; fn.inArea = (X, Y) => { if (X < 0 || Y < 0 || X >= wl.CW || Y >= wl.CH) return false; const o = wl.lotIndex[Y * wl.CW + X]; return o >= 0 && wl.rimLead[o] === me; };
  { const q = wl.lotsPx[idx].r, x0 = q[0] / C, y0 = q[1] / C, x1 = q[2] / C - 1, y1 = q[3] / C - 1; // which of the lot's corners the rim turns round (else the ground runs square to the corner)
    fn.corners = [fn(x0, y0, x0, y0 - 1) && fn(x0, y0, x0 - 1, y0), fn(x1, y0, x1, y0 - 1) && fn(x1, y0, x1 + 1, y0), fn(x1, y1, x1, y1 + 1) && fn(x1, y1, x1 + 1, y1), fn(x0, y1, x0, y1 + 1) && fn(x0, y1, x0 - 1, y1)]; } fn.street = (X, Y) => X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH && wl.cell[Y * wl.CW + X] === 2; return fn; } // Round 469: a building no longer borders its lot's edge (it stands 8px in, Round 466), so a rim is drawn against it; only a street (its kerb) or a neighbouring yard/park that draws the shared rim takes it over
function cityGridKerb(ctx, road, x0, y0, nx, ny, C, r, K, art, T, wx0, wy0, keep, off) { off = off || 0; // off: Round 469, px the strip is moved toward the inside (a lot's rim lies wholly inside its lot) // keep(X, Y, NX, NY): whether the seam between world cell X,Y (inside) and NX,NY gets this edge (Round 465) // wx0, wy0: the room's origin in world px
  if (!art || !art.naturalWidth) return; const key = (x, y) => x + ',' + y, out = new Map();
  for (let cy = -2; cy < ny + 2; cy++) for (let cx = -2; cx < nx + 2; cx++) { if (!road(x0 + cx, y0 + cy)) continue; const at = (a, b) => road(x0 + cx + a, y0 + cy + b);
    // edges with the road on their right (screen y down)
    const X = x0 + cx, Y = y0 + cy, ok = (a, b) => !at(a, b) && (!keep || keep(X, Y, X + a, Y + b));
    if (ok(0, -1)) out.set(key(cx, cy), [cx + 1, cy]); if (ok(1, 0)) out.set(key(cx + 1, cy), [cx + 1, cy + 1]); if (ok(0, 1)) out.set(key(cx + 1, cy + 1), [cx, cy + 1]); if (ok(-1, 0)) out.set(key(cx, cy + 1), [cx, cy]); }
  // (two edges from one point only where streets touch at a corner; the Map keeps one, the other loop is found from its own start)
  const seen = new Set(), loops = [], into = new Set([...out.values()].map(v => key(...v)));
  const walk = k0 => { const pts = []; let k = k0, guard = 0; while (!seen.has(k) && guard++ < 5000) { seen.add(k); const [x, y] = k.split(',').map(Number); pts.push([x, y]); if (!out.has(k)) break; k = key(...out.get(k)); } return { pts, closed: k === k0 && out.has(pts[pts.length - 1].join(',')) }; };
  for (const [k0] of out) if (!into.has(k0)) loops.push(walk(k0)); // open lines first (they run off the area), from their start
  for (const [k0] of out) if (!seen.has(k0)) loops.push(walk(k0));
  const k = art.height / T, AW = art.width / k, S = C, R = r;
  const strip = (s0, len) => { let x = 0, sx = ((s0 % AW) + AW) % AW; while (x < len - 0.01) { const piece = Math.min(AW - sx, len - x); ctx.drawImage(art, sx * k, 0, Math.max(0.5, piece * k), art.height, x * K, 0, piece * K + 0.6, T * K); x += piece; sx = 0; } };
  for (const { pts, closed } of loops) { const n = pts.length; if (n < 2) continue; // corners: where the direction changes
    const dir = i => { const a = pts[((i % n) + n) % n], b = pts[(((i + 1) % n) + n) % n]; return [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])]; }, corners = [];
    for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) { const d0 = dir(i - 1), d1 = dir(i); if (d0[0] !== d1[0] || d0[1] !== d1[1]) corners.push(i); }
    const ends = closed ? corners : [0, ...corners, n - 1]; if (closed && !corners.length) continue;
    for (let j = 0; j < (closed ? ends.length : ends.length - 1); j++) { const i0 = ends[j], i1 = ends[(j + 1) % ends.length], d = dir(i0), L = closed ? ((((i1 - i0) % n) + n) % n || n) : i1 - i0; if (L <= 0) continue;
      // (Round 471, owner: "make the park edge run up until the curb edge"): a rim's open end runs on to the edge it gives way
      // to: up to the kerb's inner face (3.5px, half the kerb) where a street touches that corner, else right to the corner
      const openCut = i => { if (!keep || !keep.street) return 0; const [px, py] = pts[i], X = x0 + px, Y = y0 + py; return [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([a, b]) => keep.street(X + a, Y + b)) ? 3.5 : 0; };
      const cutA = closed || j > 0 ? R : openCut(i0), cutB = closed || j < ends.length - 2 ? R : openCut(i1);
      const A = [pts[i0][0] * S, pts[i0][1] * S], nr = [-d[1], d[0]] /* the road's side */, cut = cutA, len = L * S - cutA + cutB; // the run, less r at each end that turns into an arc
      ctx.save(); ctx.translate((A[0] + d[0] * cut + nr[0] * (T / 2 + off)) * K, (A[1] + d[1] * cut + nr[1] * (T / 2 + off)) * K); ctx.rotate(Math.atan2(d[1], d[0])); ctx.scale(1, -1);
      strip(wx0 * d[0] + wy0 * d[1] + (A[0] + d[0] * cut) * d[0] + (A[1] + d[1] * cut) * d[1], L * S - cutA - cutB); ctx.restore(); void len; if (!closed && j === ends.length - 2) continue;
      // the arc at the run's end: centre r back along this run and r on along the next
      const V = [pts[i1][0] * S, pts[i1][1] * S], e = dir(i1), cen = [V[0] - d[0] * R + e[0] * R, V[1] - d[1] * R + e[1] * R], convex = d[0] * e[1] - d[1] * e[0] > 0;
      const aStart = Math.atan2(V[1] - d[1] * R - cen[1], V[0] - d[0] * R - cen[0]), aEnd = Math.atan2(V[1] + e[1] * R - cen[1], V[0] + e[0] * R - cen[0]); let sweep = aEnd - aStart; while (sweep > Math.PI) sweep -= 2 * Math.PI; while (sweep < -Math.PI) sweep += 2 * Math.PI;
      const steps = Math.max(4, Math.ceil(Math.abs(sweep) * (R + T) / 1.5)), sg2 = convex ? -off : off, rr = (convex ? R - T / 2 : R + T / 2) + sg2, r0 = Math.max(0, R - T / 2 + sg2), r1 = R + T / 2 + sg2;
      for (let q = 0; q < steps; q++) { const t0 = aStart + sweep * q / steps, t1 = aStart + sweep * (q + 1) / steps, tm = (t0 + t1) / 2;
        ctx.save(); ctx.beginPath(); ctx.arc(cen[0] * K, cen[1] * K, (r1 + 0.5) * K, t0 - 0.002 * Math.sign(sweep), t1 + 0.002 * Math.sign(sweep), sweep < 0); ctx.arc(cen[0] * K, cen[1] * K, Math.max(0, r0 - 0.5) * K, t1 + 0.002 * Math.sign(sweep), t0 - 0.002 * Math.sign(sweep), sweep > 0); ctx.closePath(); ctx.clip();
        const tan = [-Math.sin(tm) * Math.sign(sweep), Math.cos(tm) * Math.sign(sweep)], P0 = [cen[0] + Math.cos(tm) * rr, cen[1] + Math.sin(tm) * rr], toRoad = convex ? [-Math.cos(tm), -Math.sin(tm)] : [Math.cos(tm), Math.sin(tm)];
        ctx.translate(P0[0] * K, P0[1] * K); ctx.rotate(Math.atan2(tan[1], tan[0])); if (toRoad[0] * -tan[1] + toRoad[1] * tan[0] > 0) ctx.scale(1, -1); // (the strip's top on the road's side, running away from the road)
        ctx.translate(-T * K, 0); strip(q * 1.3, 2 * T); ctx.restore(); } } } }
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
// Round 415: where a park's trees stand and where cars park, shared by the painter and the walk mask.
// Round 489 (owner: "cut off textures"): a tree is drawn 2.6 x its radius across, inside its park's outline, and was placed
// only 14px from the park's edge: a canopy near the edge was sliced flat by the outline (palms in Solaris's oases, trees in the
// city's parks). Now the whole canopy (1.3 x the radius) stands inside the park and clear of its rim (16px); a tree that
// doesn't fit is made smaller, or left out under 8px. The same draws are taken, so the park's other choices stay.
const CITY_TREE_INSET = 16;
const GEN_MASS_OVER = 125; // Round 491: how far a tower may rise over the building behind it (massing prototype)
function cityParkTrees(rr, bx, bw, bh) { const out = [], n = Math.min(4 + Math.floor(rr() * 5), Math.max(1, Math.round(bw * bh / 3500))); /* Round 445: fewer in a pocket park */
  for (let i = 0; i < n; i++) { const a = rr(), b = rr(); let r = 12 + rr() * 12; r = Math.min(r, (bw / 2 - CITY_TREE_INSET) / 1.3, (bh / 2 - CITY_TREE_INSET) / 1.3); if (r < 8) continue;
    const m = 1.3 * r + CITY_TREE_INSET; out.push([bx[0] + m + a * (bw - 2 * m), bx[1] + m + b * (bh - 2 * m), r]); } const pool = cityOasisPool(bx, bw, bh); if (!pool) return out;
  // Round 490 (owner: "palms should never start in the pool"): a tree's trunk meets the ground at the bottom of its picture
  // (1.3 x its radius below its middle, 0.4 x its radius wide): that base stands 4px or more clear of the water. The canopy
  // may hang over the pool.
  const kept = out.filter(t => !cityTreeFootInPool(t, pool));
  // Round 489: palms round the pool: in each corner of the ring between the pool and the rim, and halfway along a long side
  const r = Math.min(13, (pool[0] - bx[0] - CITY_TREE_INSET) / 1.9, (pool[1] - bx[1] - CITY_TREE_INSET) / 1.9); if (r < 8) return kept; const m = 1.3 * r + CITY_TREE_INSET;
  const spots = [[bx[0] + m, bx[1] + m], [bx[2] - m, bx[1] + m], [bx[0] + m, bx[3] - m], [bx[2] - m, bx[3] - m]];
  if (bw > 220) spots.push([(bx[0] + bx[2]) / 2, bx[1] + m], [(bx[0] + bx[2]) / 2, bx[3] - m]); if (bh > 200) spots.push([bx[0] + m, (bx[1] + bx[3]) / 2], [bx[2] - m, (bx[1] + bx[3]) / 2]);
  for (const [x, y] of spots) { const rr2 = r * (0.85 + rr() * 0.15); if (!kept.some(t => Math.hypot(t[0] - x, t[1] - y) < (t[2] + rr2) * 1.1) && !cityTreeFootInPool([x, y, rr2], pool)) kept.push([x, y, rr2]); }
  return kept; }
// Round 483: an oasis (a park in Solaris, GEN.oasis) has a pool of water in its middle, with a stone lip; palms stand round it.
function cityTreeFootInPool([x, y, r], pool) { const P = 4; return x + 0.2 * r > pool[0] - P && x - 0.2 * r < pool[2] + P && y + 1.3 * r > pool[1] - P && y + 1.1 * r < pool[3] + P; }
function cityOasisPool(bx, bw, bh) { if (!GEN.oasis || bw < 120 || bh < 130) return null; const mx = Math.max(40, bw * 0.28), myT = Math.max(54, bh * 0.32), myB = Math.max(30, bh * 0.2); /* Round 489: a ring round the pool wide enough for its palms; Round 490: deeper on the north side, where a palm's trunk stands below its canopy */ return [bx[0] + mx, bx[1] + myT, bx[2] - mx, bx[3] - myB]; }
function cityParkedCars(seed, plan) { const out = [];
  for (const rd of plan.shapes) { if (rd.t !== 'road' || rd.pave || rd.w < 90) continue; const rr = chronoRng(seed + ':cars:' + plan.key + ':' + rd.pts.join());
    for (let i = 1; i < rd.pts.length; i++) { const a = rd.pts[i - 1], b = rd.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), hz = Math.abs(b[1] - a[1]) < 1;
      if (!hz) continue; // Round 445: the vehicles are painted side-on, so they park along east-west streets only (one across a north-south lane looked crashed); the rest stand in parking lots (cityYardPieces)
      for (let d = 70; d < L - 70; d += 80 + rr() * 120) { if (rr() < 0.45) continue; const t = d / L, cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t, side = rr() < 0.5 ? -1 : 1;
        const off = hz ? (side < 0 ? rd.w / 2 - 38 : rd.w / 2 - 22) : rd.w / 2 - 40; // Round 425: the larger cars still inside the street // the whole car inside the street (Round 410)
        const px = hz ? cx : cx + side * off, py = hz ? cy + side * off : cy, skip = Math.hypot(px - plan.hub[0], py - plan.hub[1] - 22) < 110 || px < 70 || px > 730 || py < 70 || py > 430 || (plan.plazas || []).some(([qx, qy]) => Math.hypot(px - qx, py - qy) < 90);
        // Round 415: a car blocks the way, so none at a room's crossing (where the game sets you down), at its doors, or by an object
        const rec = { px, py, hz, col: ['#c9a227', '#8a1c2b', '#2d4f7c', '#d8d8d8', '#1d1d1d', '#3f6b4a'][Math.floor(rr() * 6)], artR: rr(), flip: rr() < 0.5 }; if (!skip) out.push(rec); } } }
  return out; }
// Round 424 (owner: "more grass variety to make those grass areas more like park areas with rubble"; "street lights and
// stop lights and traffic signs"; "destroyed buildings"). Where each of these stands is worked out here, from the seed
// alone, so the painter and the walk mask agree. A slot with no art in CITY_TD_ART places nothing (nothing drawn, nothing
// blocking: never an invisible wall). Every piece keeps clear of the others, of cars, crossings' centres, doors, squares
// where objects stand, lots and the sea (owner: "objects never overlap").
// Round 467 (owner: "shadows should only drop on walkable tiles, not on anything else"; "dont drop it on edges either"):
// every edge drawn in a room (kerbs, park and yard rims, the beach's lip) is drawn into this mask too, and building shadows
// are cut out of it, out of every lot but the building's own, and out of every building.
let cityEdgeMask = null;
const CITY_HAS = slot => typeof CITY_TD_ART !== 'undefined' && (CITY_TD_ART[slot] || []).length > 0;
// a ruin: about 1 lot in 8, a fixed hash of the lot, once both ruin slots have art
// Round 436 (owner's Sheet E): about half the building lots on the docks are cargo yards: open ground edged by a kerb,
// with containers, pallets, drums, crates, a forklift or rope standing on it. Each piece blocks the way (its box, the
// lower part of its picture); the ground between them is open. Needs art in props/cargo/ and a lot at least 4 cells each way.
const CITY_CARGO_SIZE = genThemed('cargoSize', { 'container-red': [150, 1.09], 'container-blue': [150, 1.09], 'container-stack': [150, 0.85], drums: [66, 1.07], pods: [84, 1.07], 'hover-pallet': [76, 1.14], 'cable-drum': [62, 0.94], loader: [72, 1.09] }) /* Round 452: the futuristic cargo (the wooden crates, pallets, rope and forklift are gone) */;
// Round 447: where a landmark stands in its square (r: the lot in room px, less its 4px footing): centred, up to 170px
// across, at its picture's own proportions (CITY_LANDMARK_ASPECT: width over height).
const CITY_LANDMARK_ASPECT = genThemed('landmarkAspect', { fountain: 1.24, billboard: 1.11, 'holo-stage': 1.26, pylon: 0.38, 'holo-beam': 0.82, mech: 1.11, hovercar: 1.26, sculpture: 1.12, metro: 1.01 });
function cityLandmarkBox(l, r) { const asp = CITY_LANDMARK_ASPECT[l.landmark] || 1, bw = r[2] - r[0], bh = r[3] - r[1], w = Math.min(GEN.landmarkW || 170, bw - 30, (bh - 40) * asp), h = w / asp;
  return { x: (r[0] + r[2]) / 2 - w / 2, y: (r[1] + r[3]) / 2 - h / 2, w, h }; }
// Round 445: a yard is its own kind of lot (genWorld: lots too small for a building at full scale, and half the building
// lots on the docks). What stands in it: cargo on the docks; rubble in a blast zone; parked vehicles elsewhere (they are
// painted side-on, so a parking lot is where they belong). Each piece is { slot, n | artR, x, y, w, h, flip, block }.
function cityIsYard(l) { return l.use === 'yard'; }
function cityYardKind(l) { return l.mall ? (CITY_HAS('car') ? 'cars' : null) : l.dock && CITY_HAS('cargo') && (!l.small || l.seed % 2 === 0) ? 'cargo' : (l.zone || !CITY_HAS('car')) && CITY_HAS('rubble') ? 'rubble' : CITY_HAS('car') ? 'cars' : CITY_HAS('cargo') ? 'cargo' : null; }
function cityYardPieces(seed, l, bx) { const kind = cityYardKind(l), rr = chronoRng(seed + ':yard:' + l.seed), out = [], bw = bx[2] - bx[0], bh = bx[3] - bx[1];
  if (kind === 'cargo') { const names = CITY_TD_ART.cargo, want = Math.max(1, Math.round(bw * bh / 9000));
    for (let t = 0; t < want * 8 && out.length < want; t++) { const left = names.filter(m => !out.some(o => o.n === m)), n = (left.length ? left : names)[Math.floor(rr() * (left.length || names.length))], /* no piece twice in a yard while others are left */ [L, asp] = CITY_CARGO_SIZE[n] || [70, 1], w0 = asp >= 1 ? L : L * asp, h0 = asp >= 1 ? L / asp : L, k = Math.min(1, (bw - 16) / w0, (bh - 16) / h0), w = w0 * k, h = h0 * k;
      if (k < 0.6) continue; const x = bx[0] + 8 + rr() * (bw - 16 - w), y = bx[1] + 8 + rr() * (bh - 16 - h), flip = rr() < 0.5;
      if (out.some(o => x < o.x + o.w + 10 && x + w > o.x - 10 && y < o.y + o.h + 10 && y + h > o.y - 10)) continue;
      out.push({ slot: 'cargo', n, x, y, w, h, flip, block: [x + w * 0.08, y + h * 0.3, x + w * 0.92, y + h * 0.95] }); } }
  else if (kind === 'cars' && l.mall) { // Round 450: the mall's parking: rows of bays in pairs with a 56px aisle between pairs, a cross aisle every six bays, about 6 bays in 10 taken
    const CWd = 61, CHt = 40; out.bays = [];
    for (let y = bx[1] + 10, ry = 0; y + CHt <= bx[3] - 10; y += CHt + (ry % 2 ? 56 : 6), ry++)
      for (let x = bx[0] + 12, cx = 0; x + CWd <= bx[2] - 12; x += CWd + (cx % 6 === 5 ? 56 : 8), cx++) { const take = rr() < 0.6, artR = rr(), flip = rr() < 0.5; out.bays.push([x, y, CWd, CHt]);
        if (take) out.push({ slot: 'car', artR, x, y, w: CWd, h: CHt, flip, block: [x + 3, y + 10, x + CWd - 3, y + CHt - 1] }); } }
  else if (kind === 'cars') { // a parking lot: bays in rows, about two in three taken
    const CWd = 61, CHt = 40, cols = Math.floor((bw - 16 + 12) / (CWd + 12)), rows = Math.floor((bh - 16 + 14) / (CHt + 14));
    const gx = cols > 1 ? (bw - 16 - cols * CWd) / (cols - 1) : 0, gy = rows > 1 ? (bh - 16 - rows * CHt) / (rows - 1) : 0;
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) { const take = rr() < 0.66, artR = rr(), flip = rr() < 0.5; if (!take && !(out.length === 0 && ry === rows - 1 && cx === cols - 1)) continue;
      const x = bx[0] + 8 + (cols > 1 ? cx * (CWd + gx) : (bw - 16 - CWd) / 2), y = bx[1] + 8 + (rows > 1 ? ry * (CHt + gy) : (bh - 16 - CHt) / 2);
      out.push({ slot: 'car', artR, x, y, w: CWd, h: CHt, flip, block: [x + 3, y + 10, x + CWd - 3, y + CHt - 1] }); } }
  else if (kind === 'rubble') { const want = Math.max(1, Math.min(6, Math.round(bw * bh / 5000)));
    for (let t = 0; t < want * 8 && out.length < want; t++) { const L = 30 + rr() * 16, artR = rr(), flip = rr() < 0.5; if (bw < L + 16 || bh < L + 16) continue;
      const x = bx[0] + 8 + rr() * (bw - 16 - L), y = bx[1] + 8 + rr() * (bh - 16 - L);
      if (out.some(o => x < o.x + o.w + 8 && x + L > o.x - 8 && y < o.y + o.h + 8 && y + L > o.y - 8)) continue;
      out.push({ slot: 'rubble', artR, x, y, w: L, h: L, flip, block: [x + L * 0.15, y + L * 0.3, x + L * 0.85, y + L * 0.9] }); } }
  return out; }
// Round 445: which art slots a building takes its wall, roof and street floor from: its quarter's own (CITY_DISTRICT_ART)
// where that quarter has art, the city's general ones otherwise; a quarter with fewer than three pictures for a part uses
// the general ones on about half its buildings. From the lot and the registry alone, so genWorld and the painter agree.
function cityLotSlots(l) { const DA = CITY_DISTRICT_ART[l.district], ruin = cityIsRuin(l);
  const d = k => DA && DA[k] && CITY_HAS(DA[k]) && ((CITY_TD_ART[DA[k]] || []).length >= 3 || chronoHash('d' + k + ':' + l.seed) % 2 === 0) ? DA[k] : null;
  if (l.mall === 'building') return { wall: CITY_HAS('mall-wall') ? 'mall-wall' : d('wall') || 'wall', roof: CITY_HAS('mall-roof') ? 'mall-roof' : d('roof') || 'roof', shop: CITY_HAS('mall-shop') ? 'mall-shop' : d('shop') || 'shop', home: false }; // Round 453: the mall's own art
  return { wall: ruin ? 'ruin-wall' : l.wallSlot || d('wall') || 'wall', roof: l.roofSlot || d('roof') || 'roof', shop: d('shop') || 'shop', home: !ruin && l.district === 'homes' && !!(DA && DA.wall && CITY_HAS(DA.wall)) }; }
// Round 445: a building's storeys. Three at least (owner, Round 427), each CITY_STOREY px on screen where the lot has the
// depth (its roof keeps 40px), and never under 42px: lots too shallow for that are not buildings (genWorld).
const CITY_STOREY = 50;
// Round 459: wall pictures with doors in them; the painter lays them only as a building's ground floor
const CITY_DOOR_WALLS = genThemed('doorWalls', ['home-pods']);
// Round 446 (owner: "certain roof textures clash with certain roof objects"): what may stand on each roof. A roof that is
// already a thing in itself takes nothing (a glass roof, vegetable beds: a tank on a greenhouse made no sense); a roof with
// its own lights or drain takes only small kit. Roofs not listed take everything.
// Round 462 (owner: "object sprites can only be placed on roofs with simple tile textures, not more complex ones"): rooftop
// kit stands only on the plain roofs listed here; every other roof (glass, gardens, plates, seams, cables, solar, skylights,
// lit panels, a roof with its own drain or windows) takes nothing.
const CITY_ROOF_KIT_ALL = ['prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight', 'prop-heater'];
const CITY_ROOF_KIT = genThemed('roofKit', { 'roof-finegravel': CITY_ROOF_KIT_ALL, 'roof-bitumen': CITY_ROOF_KIT_ALL, 'roof-tarchip': CITY_ROOF_KIT_ALL, 'roof-rubber': CITY_ROOF_KIT_ALL });
function cityLotFloors(l, floors0) { const bh = l.r[3] - l.r[1] - 8, share = l.district === 'tech' ? 0.82 : 0.66 /* Round 448: downtown is towers: more wall, less roof */, fmax = Math.max(3, Math.floor(bh * share / CITY_STOREY)), floors = GEN.floorRange ? Math.max(1, Math.min(fmax, GEN.floorRange[0] + floors0 % (GEN.floorRange[1] - GEN.floorRange[0] + 1))) /* Round 483: Solaris's low houses */ : Math.max(3, Math.min(floors0, fmax)), dz = Math.min(floors * CITY_STOREY, bh - 40);
  return { floors, dz, storey: dz / floors }; }
const CITY_DISTRICT_ART = genThemed('districtArt', { homes: { wall: 'home-wall' }, tech: { wall: 'tech-wall', roof: 'tech-roof', shop: 'tech-shop' }, garden: { wall: 'garden-wall', roof: 'garden-roof', shop: 'garden-shop' }, market: { wall: 'market-wall', roof: 'market-roof', shop: 'market-shop' } });
function cityIsRuin(l) { return l.use === 'roof' && CITY_HAS('ruin-wall') && (l.ruin !== undefined ? l.ruin : chronoHash('ruin:' + l.seed) % 8 === 0); } // Round 445: in blast zones (genWorld)
// rubble lying in a park (bx: the park's box in room px): 2 to 4 pieces, each its own circle clear of the trees and of each other
function cityParkRubble(seed, l, bx, trees) { if (!CITY_HAS('rubble')) return []; const rr = chronoRng(seed + ':rubble:' + l.seed), out = [], bw = bx[2] - bx[0], bh = bx[3] - bx[1];
  for (let i = 0, n = 2 + Math.floor(rr() * 3); i < 30 && out.length < n; i++) { const L = 22 + rr() * 12, x = bx[0] + 12 + L / 2 + rr() * Math.max(0, bw - 24 - L), y = bx[1] + 12 + L / 2 + rr() * Math.max(0, bh - 24 - L), artR = rr(), rot = rr() < 0.5;
    if (bw < L + 24 || bh < L + 24) break;
    if (trees.some(([tx, ty, tr]) => Math.hypot(x - tx, y - ty) < tr * 1.3 + L / 2 + 4) || out.some(o => Math.hypot(x - o.x, y - o.y) < (L + o.L) / 2 + 6)) continue;
    out.push({ x, y, L, artR, rot }); }
  return out; }
// street furniture in a room (room px): lamps along both kerbs of the main roads, traffic lights on the corners of real
// crossings (three or more main roads), a traffic sign where an alley meets a main road. Each is { slot, x, y, h, artR, flip }:
// (x, y) is the foot of its post, h its drawn height (the picture keeps its own proportions); its post blocks the way.
const CITY_CLUTTER_H = genThemed('clutterH', { dumpster: 40, bags: 24, vending: 46, recycler: 34, barricade: 34, barrier: 26, tyres: 24, 'bench-led': 28, 'pay-bollard': 30 }); // Round 447
const CITY_FURNITURE_H = { lamp: 80, 'traffic-light': 70, 'sign-traffic': 48, clutter: 30 }; // Round 425: beside the 60px hero
// Round 489 (owner: "missing edges and cut off textures"): street furniture (lamps, lights, signs, clutter) belongs to the room
// it stands in, but a lamp's light reaches 80px and a post near a room's edge stands over it: the room beside cut them at the
// seam. This room's furniture and its eight neighbours' that reach into it, in this room's coordinates, nearest last.
function cityFurnitureNear(seed, plan) { const out = cityStreetFurniture(seed, plan).slice(), [wx, wy] = GEN.world(plan.key);
  if (GEN.span) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const np = GEN.span(wx + dx, wy + dy, seed); if (!np) continue;
    for (const f of cityStreetFurniture(seed, np)) { const x = f.x + dx * 800, y = f.y + dy * 500, reach = 90; if (x > -reach && x < 800 + reach && y > -reach && y < 500 + reach + (f.h || 0)) out.push(Object.assign({}, f, { x, y, foreign: true })); } }
  return out.sort((a, b) => a.y - b.y); }
function cityStreetFurniture(seed, plan) {
  if (!['lamp', 'traffic-light', 'sign-traffic', 'clutter'].some(CITY_HAS)) return [];
  const wl = genWorld(seed), [wx, wy] = GEN.world(plan.key), ox = wx * 800, oy = wy * 500, terrain = chronoTerrain(seed, plan.key), out = [], rr = chronoRng(seed + ':furniture:' + plan.key);
  const lots = wl.lotsPx.filter(l => l.use !== 'plaza').map(l => [l.r[0] - ox, l.r[1] - oy, l.r[2] - ox, l.r[3] - oy]).filter(r => r[2] > 0 && r[0] < 800 && r[3] > 0 && r[1] < 500);
  const road = (x, y) => x >= 0 && y >= 0 && x < 800 && y < 500 && !!plan.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)];
  const cars = cityParkedCars(seed, plan), mains = plan.shapes.filter(r => r.t === 'road' && !r.pave && r.w >= 90);
  // (a building's own box is its lot less a 4px footing; posts may stand on the footing, where the kerb runs)
  const onLot = (x, y) => lots.some(r => x > r[0] + 3 && x < r[2] - 3 && y > r[1] + 3 && y < r[3] - 3);
  const ground = (x, y, hubOk) => x > 30 && x < 770 && y > 40 && y < 470 && !road(x, y) && !onLot(x, y)
    && !onLot(x, y) && !terrain.chasm(Math.floor(x / CG_CELL), Math.floor(y / CG_CELL))
    && (hubOk || Math.hypot(x - plan.hub[0], y - plan.hub[1]) > 90) && !(plan.plazas || []).some(([qx, qy]) => Math.hypot(x - qx, y - qy) < 80)
    && !cars.some(c => Math.abs(x - c.px) < 40 && Math.abs(y - c.py) < 30) && !out.some(o => Math.hypot(x - o.x, y - o.y) < 60);
  // buildings stand close to the road (a 4px footing, the kerb strip over it): from (x, y) step out along (nx, ny) to the
  // road's edge and stand the post on the kerb, 3px past it, or up to 10px in where the sidewalk is wider
  const kerb = (x, y, nx, ny) => { let t = 0; while (t < 70 && road(x + nx * t, y + ny * t)) t += 1; if (t >= 70) return null; let e = t; while (e < t + 30 && !road(x + nx * e, y + ny * e) && !onLot(x + nx * e, y + ny * e)) e += 1;
    if (e - t < 3) return null; const u = Math.min(e - 1, t + Math.min(10, Math.max(3, (e - t) / 2))); return [x + nx * u, y + ny * u]; };
  const add = (slot, x, y, hubOk) => { if (x == null || !CITY_HAS(slot) || !ground(x, y, hubOk)) return false; out.push({ slot, x, y, h: CITY_FURNITURE_H[slot], artR: rr(), flip: rr() < 0.5 }); return true; };
  // traffic lights first: one on a corner of each crossing where three or more main roads meet (Round 443; was two)
  for (const sh of plan.shapes) { if (sh.t !== 'poly' || sh.pave) continue; const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const meet = mains.filter(rd => rd.pts.some(([px, py]) => px >= x0 - 2 && px <= x1 + 2 && py >= y0 - 2 && py <= y1 + 2)).length; if (meet < 3) continue;
    const corners = [[x0, y0, -1, -1], [x1, y1, 1, 1], [x1, y0, 1, -1], [x0, y1, -1, 1]], first = rr() < 0.5 ? 0 : 2;
    let n = 0; for (const i of [first, first + 1, (first + 2) % 4, (first + 3) % 4]) { const [cx, cy, sx, sy] = corners[i], at = kerb(cx - sx * 4, cy - sy * 4, sx * 0.7071, sy * 0.7071) || [];
      if (n < 1 && add('traffic-light', at[0], at[1], true)) n++; } } // Round 443 (owner): one traffic light per intersection
  // traffic signs: where an alley leaves a main road or a crossing, on one side of its mouth
  for (const rd of plan.shapes) { if (rd.t !== 'road' || rd.pave || rd.w >= 90) continue;
    for (const [a, b] of [[rd.pts[0], rd.pts[1]], [rd.pts[rd.pts.length - 1], rd.pts[rd.pts.length - 2]]]) { if (!b) continue;
      const onMain = mains.some(m => { for (let i = 1; i < m.pts.length; i++) { const p = m.pts[i - 1], q = m.pts[i], L2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 || 1, t = Math.max(0, Math.min(1, ((a[0] - p[0]) * (q[0] - p[0]) + (a[1] - p[1]) * (q[1] - p[1])) / L2)); if (Math.hypot(a[0] - p[0] - t * (q[0] - p[0]), a[1] - p[1] - t * (q[1] - p[1])) < m.w / 2 + 2) return true; } return false; });
      if (!onMain) continue; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L, D = 64, side = rr() < 0.5 ? 1 : -1;
      for (const sd of [side, -side]) { const at = kerb(a[0] + dx * D, a[1] + dy * D, -dy * sd, dx * sd) || []; if (add('sign-traffic', at[0], at[1])) break; } } }
  // lamps: along both kerbs of every main road. Round 443 (owner: "other lights should be evenly spaced if possible"): each
  // side of a road gets lamps at one even spacing (the road's length shared out at about 150px), the far side half a step
  // along; a lamp that can't stand at its spot moves up to 20px either way rather than leaving a gap
  for (const rd of mains) for (let i = 1; i < rd.pts.length; i++) { const a = rd.pts[i - 1], b = rd.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 100) continue; const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
    const n = Math.max(1, Math.round((L - 60) / 150)), sp = (L - 60) / n;
    for (const sd of [1, -1]) for (let j = 0; j < n; j++) { const d0 = 30 + sp * (j + (sd > 0 ? 0.25 : 0.75));
      for (const off of [0, 8, -8, 16, -16, 20, -20]) { const d = d0 + off; if (d < 30 || d > L - 30) continue; const at = kerb(a[0] + dx * d, a[1] + dy * d, -dy * sd, dx * sd); if (at && add('lamp', at[0], at[1])) break; } } }
  // Round 447: street clutter (dumpsters, rubbish bags, bins, a vending machine, barriers, tyres, a bench) stands on the
  // sidewalks of the main roads, against the buildings (the lamps stand at the kerb), between the lamps: about every
  // 150px, a little under half the spots taken. Each blocks the way like a post.
  if (CITY_HAS('clutter')) { const names = CITY_TD_ART.clutter;
    const back = (x, y, nx, ny) => { let t = 0; while (t < 70 && road(x + nx * t, y + ny * t)) t += 1; if (t >= 70) return null; let e = t; while (e < t + 30 && !road(x + nx * e, y + ny * e) && !onLot(x + nx * e, y + ny * e)) e += 1; return e - t < 20 ? null : [x + nx * (e - 7), y + ny * (e - 7)]; };
    for (const rd of mains) for (let i = 1; i < rd.pts.length; i++) { const a = rd.pts[i - 1], b = rd.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 100) continue; const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
      const n = Math.max(1, Math.round((L - 60) / 150)), sp = (L - 60) / n;
      for (const sd of [1, -1]) for (let j = 0; j < n; j++) { const take = rr() < 0.45, d = 30 + sp * (j + (sd > 0 ? 0.75 : 0.25)); if (!take) continue;
        const at = back(a[0] + dx * d, a[1] + dy * d, -dy * sd, dx * sd); if (at && add('clutter', at[0], at[1])) { const f = out[out.length - 1]; f.n = names[Math.floor(f.artR * names.length)]; f.h = CITY_CLUTTER_H[f.n] || 30;
          // Round 473 (owner: "need a rule to keep objects from being placed on buildings ... although the lights are fine"): a piece of clutter's whole picture (up to 0.7 of its height to each side, its full height up) keeps 4px clear of every building and landmark; posts (lamps, lights, signs) may rise in front of them
          const hits = h => { const hw = h * 0.7; return wl.lotsPx.some(l => { const I2 = l.use === 'roof' ? 8 : l.use === 'landmark' ? 4 : -1; return I2 >= 0 && f.x - hw < l.r[2] - ox - I2 + 2 && f.x + hw > l.r[0] - ox + I2 - 2 && f.y - h < l.r[3] - oy - I2 + 2 && f.y > l.r[1] - oy + I2 - 2; }); };
          if (hits(f.h)) { const alt = names.filter(n2 => !hits(CITY_CLUTTER_H[n2] || 30)).sort((a2, b2) => (CITY_CLUTTER_H[b2] || 30) - (CITY_CLUTTER_H[a2] || 30))[0]; if (alt) { f.n = alt; f.h = CITY_CLUTTER_H[alt] || 30; } else out.pop(); } } } } }
  return out.sort((p, q) => p.y - q.y);
}
// Round 415 (owner: "make it a rule that if the tile is just a texture tile, it can be walked on, unless it has another
// image on top like that of a building or car or other sprite"): what stands on the ground in a room of the top-down city,
// in room px: buildings (their lots, roof and front wall), parked cars, park trees, and the sea (not ground). Everything
// else, streets, sidewalks, squares, sand, park grass and kerbs, can be walked on.
// Round 457 (owner: "make sure we have a rule that interactable objects don't overlap buildings or other sprites like cars
// and signs"): the picture box of everything that stands in a room of the top-down city, in room px, as
// { x0, y0, x1, y1, kind }: buildings (their lots), landmarks, yard pieces, park trees and rubble, parked cars, lamps,
// lights, signs and street clutter. An object's own picture (cityItemBox) must not touch any of them:
// tests/city-layout.test.cjs holds the rule on six seeds, and cityParkedCars keeps cars off the squares.
function citySpriteBoxes(seed, key, plan) { const wl = genWorld(seed), [wx, wy] = GEN.world(key), ox = wx * 800, oy = wy * 500, out = [], add = (x0, y0, x1, y1, kind) => out.push({ x0, y0, x1, y1, kind });
  for (const l of wl.lotsPx) { const r = [l.r[0] - ox + 4, l.r[1] - oy + 4, l.r[2] - ox - 4, l.r[3] - oy - 4]; if (r[2] < 0 || r[0] > 800 || r[3] < 0 || r[1] > 500) continue;
    if (l.use === 'landmark') { const b = cityLandmarkBox(l, r); add(b.x, b.y, b.x + b.w, b.y + b.h, 'landmark'); }
    if (l.use === 'parkpic' && l.sprite) { const cx = (r[0] + r[2]) / 2; add(cx - l.sprite.w / 2, r[3] - l.sprite.h, cx + l.sprite.w / 2, r[3], 'park'); } // Round 502: objects keep clear of a park's picture
    else if (cityIsYard(l)) { for (const c of cityYardPieces(seed, l, r)) add(c.x, c.y, c.x + c.w, c.y + c.h, 'yard:' + c.slot); }
    else if (l.use === 'roof') add(r[0], r[1], r[2], r[3], 'building');
    else if (l.use === 'park') { const pool = cityOasisPool(r, r[2] - r[0], r[3] - r[1]); if (pool) add(pool[0], pool[1], pool[2], pool[3], 'pool'); const trees = cityParkTrees(chronoRng(seed + ':roof:' + l.seed), r, r[2] - r[0], r[3] - r[1]); for (const [tx, ty, tr] of trees) add(tx - tr, ty - tr, tx + tr, ty + tr, 'tree');
      for (const b of cityParkRubble(seed, l, r, trees)) add(b.x - b.L / 2, b.y - b.L / 2, b.x + b.L / 2, b.y + b.L / 2, 'rubble'); } }
  for (const f of cityFurnitureNear(seed, plan)) { const hw = f.slot === 'clutter' ? f.h * 0.6 : f.h * 0.2; add(f.x - hw, f.y - f.h, f.x + hw, f.y, f.slot); } // Round 489: a neighbour's post over the edge counts too
  for (const c of cityParkedCars(seed, plan)) add(c.px - 31, c.py - 20, c.px + 31, c.py + 20, 'car');
  return out; }
// Round 473 (owner: "scale interactable objects to be scaled to the main character sprite"): each kind of object has its own
// size, in room px, set against the hero (about 60px tall: a person): things a person stands at (terminals, machines, boards,
// the merchant) about the hero's height, waist-high things (chests, caches, a campfire) about two thirds of it, the waypoint
// pad and the vault entrance larger. The painter's boxes (CSS, built from this table in city-gen.js), the overlap rule and
// the tests all read it.
const CITY_ITEM_PX = { nexus: 84, chest: 44, relic: 40, merchant: 96, cardsmith: 88, wantedBoard: 64, breaker: 60, vault: 92, lore: 58, shrine: 60, campfire: 46, cache: 46, sealed: 46,
  'event:terminal': 58, 'event:medic': 76, 'event:vending': 60, 'event:courier': 44, 'event:arcade': 60, 'event:racer': 56, 'event:billboard': 62, 'event:toll': 80 };
function cityItemPx(p, kind) { const k = kind || (p && p.type) || 'chest'; return CITY_ITEM_PX[k === 'event' && p && p.event ? 'event:' + p.event : k] || 48; }
// an object's picture box at its spot (measured in the browser): standing on its spot, a little below it (the foot point);
// a chest or a relic is centred on its spot
function cityItemBox(p, kind) { const k = kind || (p && p.type) || 'chest', mid = k === 'chest' || k === 'relic', w = cityItemPx(p, k); return mid ? { x0: p.x - w / 2, y0: p.y - w / 2, x1: p.x + w / 2, y1: p.y + w / 2 } : { x0: p.x - w / 2, y0: p.y - w * 0.8, x1: p.x + w / 2, y1: p.y + w * 0.22 }; }
function cityBlockers(seed, key, plan) {
  const wl = genWorld(seed), [wx, wy] = GEN.world(key), ox = wx * 800, oy = wy * 500, rects = [], circles = [];
  for (const l of wl.lotsPx) { const r = [l.r[0] - ox + 4, l.r[1] - oy + 4, l.r[2] - ox - 4, l.r[3] - oy - 4]; if (r[2] < 0 || r[0] > 800 || r[3] < 0 || r[1] > 500) continue;
    if (l.use === 'landmark') { const b = cityLandmarkBox(l, r); rects.push([b.x + b.w * 0.1, b.y + b.h * 0.35, b.x + b.w * 0.9, b.y + b.h * 0.95]); } // Round 447: the landmark blocks; its square is open
    else if (cityIsYard(l)) { for (const c of cityYardPieces(seed, l, r)) rects.push(c.block); } // Round 436: a yard's ground is open, its cargo is not
    else if (l.use === 'roof') rects.push([r[0] - 4, r[1] - 4, r[2] + 4, r[3] + 4]); // Round 445: the whole lot, footing and all: two buildings side by side used to leave an 8px slit between them that counted as open ground
    else if (l.use === 'park') { const pool = cityOasisPool(r, r[2] - r[0], r[3] - r[1]); if (pool) rects.push([...pool, 'water']); const trees = cityParkTrees(chronoRng(seed + ':roof:' + l.seed), r, r[2] - r[0], r[3] - r[1]); for (const [tx, ty, tr] of trees) circles.push([tx, ty, tr * 0.75]);
      for (const b of cityParkRubble(seed, l, r, trees)) circles.push([b.x, b.y, b.L * 0.4]); } } // Round 424: rubble blocks too
  for (const f of cityStreetFurniture(seed, plan)) circles.push([f.x, f.y, 8]); // Round 424: a lamp, light or sign post
  for (const c of cityParkedCars(seed, plan)) rects.push([c.px - 29, c.py - 15, c.px + 29, c.py + 14]); // Round 425: the larger cars; Round 442: 15% smaller
  const t = chronoTerrain(seed, key); for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (t.chasm(x, y)) rects.push([x * CG_CELL, y * CG_CELL, (x + 1) * CG_CELL, (y + 1) * CG_CELL, 'water']);
  return { rects, circles };
}
function paintTopdownCity(ctx, plan, key, W, H, K, imgs, fill) {
  const A = slot => { const l = (CITY_TD_ART[slot] || []).map(n => imgs[cityArtPath(slot, n)]).filter(i => i && i.naturalWidth); return l.length ? l : null; };
  const pick = (slot, r) => { const l = A(slot); return l ? l[Math.floor(r() * l.length)] : null; };
  // a seamless picture laid over a rectangle, `th` px tall per repeat, starting at the rectangle's corner
  const tile = (img, x, y, w, h, th, ph = 0) => { const p = ctx.createPattern(img, 'repeat'), k = th * K / img.height; if (p.setTransform) p.setTransform(new DOMMatrix().translate((x - ph) * K, y * K).scale(k)); ctx.save(); ctx.fillStyle = p; ctx.fillRect(x * K, y * K, w * K, h * K); ctx.restore(); };
  // Round 415 (owner: "never cut a building floor sprite halfway through a window at the edge, the edge of a building must
  // always end on an edge"): one floor of a wall or shopfront strip laid so that both ends of the building fall on plain
  // wall between windows (CITY_TD_GAPS): a random start column, then the end column whose span needs the least stretch.
  const nameOf = new Map(Object.keys(imgs).filter(n => n.indexOf('/') >= 0).map(n => [imgs[n], n.split('/').pop()]));
  // Round 420 (owner: "never stretch graphics"): the strip keeps its proportions; to make both ends land on plain wall the
  // whole picture is scaled evenly (never more than the floor needs: the extra height is cropped evenly top and bottom).
  // Round 459 (owner: "window tiles should be offset from floor to floor if possible, but dont cut a window at the building
  // edge"): every start and end gap that fits the wall is listed; a floor takes the snuggest fit whose start differs from the
  // floor above (prev), where one is within 15% of the snuggest, so the windows step across from floor to floor. A wall
  // with a single gap per picture can only repeat.
  const fitRow = function (img, x, y, w, h, r, prev) { const gaps = CITY_TD_GAPS[nameOf.get(img)], s = h / img.height, Wi = img.width;
    let k = s, g0 = Math.floor(r() * Wi);
    if (gaps && gaps.length >= 1) { let all = [];
      for (const lim of [1.35, 1.6]) { if (all.length) break; for (const g of gaps) for (const g2 of gaps) for (let n = 0; n < 6; n++) { const sp = g2 + n * Wi - g; if (sp <= 0) continue; const kx = w / sp; if (kx < s || kx > s * lim) continue; all.push({ g, kx }); } }
      if (all.length) { all.sort((a2, b2) => a2.kx - b2.kx || a2.g - b2.g); const top = all[0].kx * 1.15, alt = all.filter(c => c.kx <= top && c.g !== prev), pool = alt.length ? alt : all.filter(c => c.kx <= top);
        const best = pool[Math.floor(r() * Math.min(3, pool.length))]; k = best.kx; g0 = best.g; }
      else if (!fitRow.force) return null; } // (no clean fit: nothing drawn; the caller takes another picture)
    const p = ctx.createPattern(img, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().translate(x * K, (y + (h - img.height * k) / 2) * K).scale(k * K, k * K).translate(-g0, 0));
    ctx.save(); ctx.fillStyle = p; ctx.fillRect(x * K, y * K, w * K, h * K); ctx.restore(); return g0; };
  const seed = chronoSeed(), wl = genWorld(seed), [wx, wy] = GEN.world(key), ox = wx * 800, oy = wy * 500;
  const S = v => v * K, isRoad = (x, y) => x >= 0 && y >= 0 && x < 800 && y < 500 && plan.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)] === 1;
  const lots = wl.lotsPx.filter(l => l.r[2] > ox && l.r[0] < ox + 800 && l.r[3] > oy && (l.r[1] < oy + 500 || (GEN.massing && l.use === 'roof' && l.r[1] < oy + 500 + GEN_MASS_OVER))).map(l => ({ ...l, r: [l.r[0] - ox, l.r[1] - oy, l.r[2] - ox, l.r[3] - oy] })).sort((a, b) => a.r[3] - b.r[3]);
  const SIN = Math.sin((GEN.tilt || 0) * Math.PI / 180), roomDistrict = chronoDistrict(seed, key);
  const ROOF = ['#2b303b', '#34302d', '#2a333b', '#3b3538', '#262b34', '#30363a', '#3a3a33'], NEON = ['#ff3b6b', '#36f1ff', '#ff9f1c', '#b85cff', '#4dff8a', '#ff4fd8'];
  // street lights: soft pools along the streets
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lamps = cityFurnitureNear(seed, plan).filter(f => f.slot === 'lamp'); // Round 424: with lamp art, the pools lie under the lamps (Round 489: the neighbours' too)
  if (lamps.length) for (const f of lamps) { const c = chronoHash(seed + ':lamp:' + key + ':' + f.x + ',' + f.y), col = c % 3 ? '255,214,150' : '150,210,255', g = ctx.createRadialGradient(S(f.x), S(f.y), 0, S(f.x), S(f.y), S(80)); g.addColorStop(0, 'rgba(' + col + ',.2)'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(S(f.x - 80), S(f.y - 80), S(160), S(160)); }
  // (Round 445: no pools without lamps. Rooms with no main road used to get the old stand-in pools in pink and cyan, which read as stains on the paving.)
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
  const shL = document.createElement('canvas'); shL.width = W; shL.height = H; const shG = shL.getContext('2d'); // Round 467: every building's shadow, cut and laid down after the lots
  const rimDone = new Set(), rimQueue = []; // (drawn after every lot's ground, so no later lot of the same area paints over them) // Round 480 (owner: "still having edge issues, find a permanent rule fix"): an area's rim is drawn by the first of its lots in this room, not by its lowest lot, which may lie in another room (the rim then went missing here)
  const groundPath = (l, bx, bw, bh, fallbackR) => { // Round 475: a yard's or park's ground fills its lot, under its rim; a corner is rounded only where the rim turns round it
    if (GEN.gridKerb && ctx.roundRect) { const RK = cityRimKeep(l), R0 = (l.use === 'park' ? 19 : 18); ctx.roundRect(S(l.r[0]), S(l.r[1]), S(l.r[2] - l.r[0]), S(l.r[3] - l.r[1]), RK.corners.map(c => c ? S(R0) : 0)); }
    else if (ctx.roundRect) ctx.roundRect(S(bx[0]), S(bx[1]), S(bw), S(bh), S(fallbackR)); else ctx.rect(S(bx[0]), S(bx[1]), S(bw), S(bh)); };
  for (const l of lots) { const ra = chronoRng(seed + ':art:' + l.seed), rr = chronoRng(seed + ':roof:' + l.seed), [x0, y0, x1, y1] = l.r, I = l.use === 'roof' ? 8 : 4 /* Round 466 (owner: "a few pixels of padding between buildings and edges"): a building stands 8px in from its lot (was 4), so 4px or more of paving shows between it and a kerb, a rim or the next building */, bx = [x0 + I, y0 + I, x1 - I, y1 - I], bw = bx[2] - bx[0], bh = bx[3] - bx[1];
    if (l.use === 'plaza') continue;
    if (l.use === 'parkpic') { const sp = l.sprite, art = sp && imgs[cityArtPath(sp.slot, sp.n)]; if (art && art.naturalWidth) ctx.drawImage(art, S((bx[0] + bx[2]) / 2 - sp.w / 2), S(bx[3] - sp.h), S(sp.w), S(sp.h)); continue; } // Round 502: a walkable park, its picture
    if (l.use === 'landmark') { // Round 447: an open square on the city's own paving, a pool of light, the landmark in the middle
      const b = cityLandmarkBox(l, bx), art = imgs[cityArtPath('landmark', l.landmark)], mx = b.x + b.w / 2, my = b.y + b.h * 0.6, R2 = Math.max(bw, bh) * 0.6;
      void R2; // Round 478 (owner: "the area around the statue is a different color ... it should be the same color"): no pool of light round a landmark (it was clipped to the lot, so it showed as a pale rectangle); its square is the city's paving like any other
      if (art && art.naturalWidth) ctx.drawImage(art, S(b.x), S(b.y), S(b.w), S(b.h));
      continue; }
    if (cityIsYard(l)) { // Round 436: a cargo yard: the lot ground edged by a kerb strip (never two textures without a border), its cargo on it
      ctx.save(); ctx.beginPath(); groundPath(l, bx, bw, bh, 0); ctx.clip(); fill(ctx, (GEN.tex && imgs[{ cargo: 'yard-cargo', rubble: 'yard-rubble' }[cityYardKind(l)]]) || imgs.yard); /* Round 504: each yard's own ground (parking, cargo deck, rubble) */ ctx.fillStyle = 'rgba(6,8,14,.3)'; /* Round 452: the new lot ground is dark asphalt already (was .62 over the old white tiles) */ ctx.fillRect(S(l.r[0]), S(l.r[1]), S(l.r[2] - l.r[0]), S(l.r[3] - l.r[1])); /* Round 468 (owner: "remove all shadows"): no grime shadow round the yard */ /* Round 447: grime gathered along the yard's edge */ ctx.restore(); // (Round 445: darker, so a yard doesn't glare beside the paving)
      const edgeArt = pick('park-edge', ra); if (edgeArt) { const m = document.createElement('canvas'); m.width = Math.ceil((bw + 8) * K); m.height = Math.ceil((bh + 8) * K); const mg = m.getContext('2d'); mg.fillStyle = '#fff'; mg.fillRect(4 * K, 4 * K, bw * K, bh * K);
        const [ywx, ywy] = GEN.world(key), TT = 12; (GEN.gridKerb ? (() => { const [gwx, gwy] = GEN.world(key), r = l.r, gx = gwx * FG_COLS, gy = gwy * FG_ROWS, RK = cityRimKeep(l), inLot = RK.inArea; void r; if (!rimDone.has(RK.me)) { rimDone.add(RK.me); rimQueue.push(() => { for (const cx2 of [ctx, cityEdgeMask && cityEdgeMask.getContext('2d')]) if (cx2) cityGridKerb(cx2, inLot, gx, gy, FG_COLS, FG_ROWS, FG_CELL, 12 + TT / 2, K, edgeArt, TT, gwx * 800, gwy * 500, RK, TT / 2); }); } })() : cityEdgeAlong(ctx, m, bx[0] - 4, bx[1] - 4, K, edgeArt, 12, ywx, ywy)); } // Round 464: the bitmasked rim, centred on the lot's edge
      const yardPieces = cityYardPieces(seed, l, bx); if (yardPieces.bays) { ctx.save(); ctx.fillStyle = 'rgba(214,222,232,.3)'; for (const [x, y, w, h] of yardPieces.bays) { ctx.fillRect(S(x - 4.5), S(y + 4), S(1.5), S(h - 4)); ctx.fillRect(S(x + w + 3), S(y + 4), S(1.5), S(h - 4)); } ctx.restore(); } // Round 450: the mall's bays are marked
      for (const c of yardPieces.sort((a, b) => (a.y + a.h) - (b.y + b.h))) { const list = A(c.slot), art = c.n ? imgs[cityArtPath(c.slot, c.n)] : list && list[Math.floor(c.artR * list.length)]; if (!art || !art.naturalWidth) continue;
        const k = Math.min(c.w / art.width, c.h / art.height), dw = art.width * k, dh = art.height * k; // at its own proportions, standing on the bottom of its box
        ctx.save(); ctx.translate(S(c.x + c.w / 2), 0); if (c.flip) ctx.scale(-1, 1); ctx.drawImage(art, S(-dw / 2), S(c.y + c.h - dh), S(dw), S(dh)); ctx.restore(); }
      continue; }
    if (l.use === 'park') { const PR = GEN.gridKerb ? 8 : 16; /* Round 464: the grass's corner on the same centre as the rim's arc */ ctx.save(); ctx.beginPath(); groundPath(l, bx, bw, bh, PR); ctx.clip(); fill(ctx, imgs.pipes);
      // Round 424: the park's own grass over the whole park, and a second one in soft patches (each tiled 140px)
      const grass = A('park'); if (grass) { const pr = chronoRng(seed + ':grass:' + l.seed), g1 = grass[Math.floor(pr() * grass.length)], g2 = g1; // Round 430: one grass per park (no mixing without a border)
        if (GEN.gridKerb) tile(g1, l.r[0], l.r[1], l.r[2] - l.r[0], l.r[3] - l.r[1], 140, pr() * 140); else tile(g1, bx[0], bx[1], bw, bh, 140, pr() * 140);
        if (g2 !== g1) { const m = document.createElement('canvas'); m.width = Math.ceil(S(bw)); m.height = Math.ceil(S(bh)); const mg = m.getContext('2d');
          for (let i = 0, n = 2 + Math.floor(pr() * 3); i < n; i++) { const cx = pr() * bw, cy = pr() * bh, rad = 30 + pr() * Math.min(bw, bh) * 0.45, gr = mg.createRadialGradient(S(cx), S(cy), 0, S(cx), S(cy), S(rad));
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); mg.fillStyle = gr; mg.fillRect(0, 0, m.width, m.height); }
          mg.globalCompositeOperation = 'source-in'; const pat = mg.createPattern(g2, 'repeat'), k = 140 * K / g2.height; if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(k)); mg.fillStyle = pat; mg.fillRect(0, 0, m.width, m.height);
          ctx.drawImage(m, S(bx[0]), S(bx[1])); } }
      ctx.fillStyle = GEN.parkDim || 'rgba(0,10,8,.35)'; ctx.fillRect(S(bx[0]), S(bx[1]), S(bw), S(bh));
      const trees = cityParkTrees(rr, bx, bw, bh), pool = cityOasisPool(bx, bw, bh);
      if (pool) { const pw = pool[2] - pool[0], ph = pool[3] - pool[1], rad = Math.min(16, pw / 3, ph / 3); ctx.save(); ctx.beginPath(); ctx.roundRect(S(pool[0]), S(pool[1]), S(pw), S(ph), S(rad)); ctx.save(); ctx.clip(); fill(ctx, imgs.chasm); ctx.restore();
        ctx.lineWidth = S(5); ctx.strokeStyle = GEN.kerb[1]; ctx.stroke(); ctx.lineWidth = S(1.2); ctx.strokeStyle = GEN.kerb[0]; ctx.beginPath(); ctx.roundRect(S(pool[0] - 2.5), S(pool[1] - 2.5), S(pw + 5), S(ph + 5), S(rad + 2.5)); ctx.stroke(); ctx.beginPath(); ctx.roundRect(S(pool[0] + 2.5), S(pool[1] + 2.5), S(pw - 5), S(ph - 5), S(Math.max(0, rad - 2.5))); ctx.stroke(); ctx.restore(); } // Round 483: the oasis pool, a drawn stone lip between water and grass
      for (const b of cityParkRubble(seed, l, bx, trees)) { const ru = A('rubble'), art = ru && ru[Math.floor(b.artR * ru.length)]; if (!art) continue; const k = b.L / Math.max(art.width, art.height), dw = art.width * k, dh = art.height * k;
        ctx.save(); ctx.translate(S(b.x), S(b.y)); if (b.rot) ctx.scale(-1, 1); ctx.drawImage(art, S(-dw / 2), S(-dh / 2), S(dw), S(dh)); ctx.restore(); }
      // Round 447: a worn, darker rim inside the kerb fading toward the middle, so the grass has depth (as the shallows give the sea)
      /* Round 468 (owner: "remove all shadows"): no shadow round the park */
      for (const [tx, ty, tr] of trees) { const treeArt = pick('tree', ra); if (treeArt) { const k = tr * 2.6 / Math.max(treeArt.width, treeArt.height), dw = treeArt.width * k, dh = treeArt.height * k; ctx.drawImage(treeArt, S(tx - dw / 2), S(ty - dh / 2), S(dw), S(dh)); } /* Round 438: at its own proportions, never stretched */ }
      ctx.restore();
      // Round 408: a park is edged like a planter: a stone kerb round the grass, so it never meets the paving bare
      const edgeArt = pick('park-edge', ra);
      if (edgeArt) { // Round 413: the kerb follows the park's rounded outline, round its corners too
        const m = document.createElement('canvas'); m.width = Math.ceil((bw + 8) * K); m.height = Math.ceil((bh + 8) * K); const mg = m.getContext('2d'); mg.fillStyle = '#fff'; mg.beginPath();
        if (mg.roundRect) mg.roundRect(4 * K, 4 * K, bw * K, bh * K, PR * K); else mg.rect(4 * K, 4 * K, bw * K, bh * K); mg.fill();
        const [pwx, pwy] = GEN.world(key), TT = 14; (GEN.gridKerb ? (() => { const [gwx, gwy] = GEN.world(key), r = l.r, gx = gwx * FG_COLS, gy = gwy * FG_ROWS, RK = cityRimKeep(l), inLot = RK.inArea; void r; if (!rimDone.has(RK.me)) { rimDone.add(RK.me); rimQueue.push(() => { for (const cx2 of [ctx, cityEdgeMask && cityEdgeMask.getContext('2d')]) if (cx2) cityGridKerb(cx2, inLot, gx, gy, FG_COLS, FG_ROWS, FG_CELL, 12 + TT / 2, K, edgeArt, TT, gwx * 800, gwy * 500, RK, TT / 2); }); } })() : cityEdgeAlong(ctx, m, bx[0] - 4, bx[1] - 4, K, edgeArt, 14, pwx, pwy)); } // Round 464: the bitmasked rim
      continue; }
    // the street side: the side with a road just beyond it
    // Round 414 (owner: "the roofs look like ground"): a cast shadow that grows with the building's height
    // Round 420: the lot under a building (surface 'lot'), its footing showing round the building
    if (I < 8) { ctx.save(); ctx.beginPath(); ctx.rect(S(x0), S(y0), S(x1 - x0), S(y1 - y0)); ctx.clip(); fill(ctx, imgs.yard); /* (Round 466: a building with its 8px padding has no dark footing round it: the paving shows to its wall) */ ctx.fillStyle = 'rgba(4,6,10,.78)' /* Round 426 (owner: "the borders around the buildings look strange"): the footing reads as the building's contact shadow, not a pale frame */; ctx.fillRect(S(x0), S(y0), S(x1 - x0), S(y1 - y0)); ctx.restore(); }
    { const hgt = 4 + Math.floor(rr() * 5); shG.save(); /* Round 431 (owner: "make sure buildings dont drop shadows on other buildings"): the shadow falls only on open ground, never on another lot */ shG.beginPath(); shG.rect(0, 0, S(800), S(500)); for (const o of lots) if (o !== l && o.use !== 'plaza') shG.rect(S(o.r[0]), S(o.r[1]), S(o.r[2] - o.r[0]), S(o.r[3] - o.r[1])); shG.clip('evenodd'); shG.shadowColor = 'rgba(0,0,0,.5)'; shG.shadowBlur = S(7); /* Round 447: a soft-edged shadow, and a faint dark halo where the building meets the ground */ shG.fillStyle = 'rgba(0,0,0,.6)'; shG.fillRect(S(bx[0] + 4 + hgt * 2.2), S(bx[1] + 4 + hgt * 1.2), S(bw), S(bh)); shG.shadowBlur = S(10); shG.fillStyle = 'rgba(0,0,0,.25)'; shG.fillRect(S(bx[0]), S(bx[1]), S(bw), S(bh)); shG.restore(); } // drop shadow
    // Round 400 (owner: "could the buildings be not quite directly over the top? ... maybe 10 degrees?"): seen tilted by
    // GEN.tilt degrees, a building shows its south wall, sin(tilt) of its height, drawn inside its own lot under the roof.
    // Round 401: the tall shopfronts face a street to the south; a building with its street behind it (north) is kept low.
    const ruin = cityIsRuin(l); // Round 424: a destroyed building (both ruin slots have art)
    // Round 439: each quarter's own walls, roofs and street floors (CITY_DISTRICT_ART), where it has art; a quarter with fewer
    // than three pictures for a part (roof, wall, street floor) uses the general ones on about half its buildings
    const district = l.district || roomDistrict, SL = cityLotSlots({ ...l, district }), dRoof = SL.roof, home = SL.home; // Round 436: the homes quarter: 3-4 floors, no shops or signs
    // Round 445: the street side and the quarter come from the city's plan (l.south, l.district), the same in every room a
    // building reaches into; its storeys from cityLotFloors (three at least, 42 to 50px each)
    // =====================================================================
    // Round 491 (owner: "our building generation algorithm is complete junk ... find a new technique"): massing, after
    // CityEngine-style shape grammars. A lot is split into volumes at different heights before anything is drawn: one block,
    // a podium with a tower set back on it, a setback (the upper floors stepped back from the street), two wings side by side
    // at different heights, or an L (a low front wing and a tall back wing). Seen tilted, a volume with ground footprint
    // f and height z shows its roof f shifted up by z and its south wall from f's south edge up by z; volumes are drawn from
    // the back, a tower after the podium it stands on, so nearer parts cover farther ones. Everything stays inside the lot,
    // so placement, overlap rules and walk masks are as before. A prototype (GEN.massing), with the art already in the game.
    // =====================================================================
    { const sp = cityLotSprite(l), art = sp && imgs[cityArtPath(sp.slot, sp.n)]; // Round 496: a whole building where one fits, never distorted
      if (art && art.naturalWidth) { ctx.drawImage(art, S((bx[0] + bx[2]) / 2 - sp.w / 2), S(bx[3] - sp.h), S(sp.w), S(sp.h)); continue; } }
    if (GEN.massing && !l.mall && !ruin && bw >= 70 && bh >= 120) {
      // how far a part may rise over the lot behind it: only over another building (never a street, yard or park), in 25px rows
      const overAt = (xa, xb) => { let k = 0; for (; k < GEN_MASS_OVER / 25; k++) { const y = l.r[1] + oy - 12 - k * 25; let ok = true;
          for (let x = xa + ox + 6; x <= xb + ox - 6; x += 20) if (!wl.lotsPx.some(o => o !== l && o.use === 'roof' && !o.mall && x >= o.r[0] && x < o.r[2] && y >= o.r[1] + 8 && y < o.r[3])) { ok = false; break; } if (!ok) break; } return k * 25; };
      const X0 = bx[0], Y0 = bx[1], X1 = bx[2], Y1 = bx[3], D = Y1 - Y0, ST = GEN.massStorey || 46, southSt2 = !!l.south;
      const maxZ = (minRoof, front) => Math.max(ST, D - minRoof - front); // a volume's height with at least minRoof of roof showing
      const fl = z => Math.max(1, Math.round(z / ST)), zOf = f => f * ST;
      const kinds = bw >= 110 && D >= 170 ? ['tower', 'tower', 'tower', 'setback', 'wings', 'L'] : bw >= 110 ? ['wings', 'wings', 'setback', 'block'] : D >= 170 ? ['setback', 'tower', 'block'] : ['block', 'setback'];
      const kind = kinds[Math.floor(rr() * kinds.length)], vols = [];
      const LF2 = cityLotFloors(l, home ? 3 + Math.floor(rr() * 2) : 4 + Math.floor(rr() * 3) + (district === 'tech' ? 1 : 0)), base = Math.max(GEN.floorRange ? 1 : 2, Math.min(LF2.floors, fl(maxZ(50, 0)))); // the building's own height (cityLotFloors), as before
      if (kind === 'block') { const f = base; vols.push({ x0: X0, x1: X1, y1: Y1, z0: 0, z1: zOf(f), ground: true }); }
      else if (kind === 'tower' || kind === 'setback') { // a podium the whole lot, and a taller part on it, set back from the street
        const zp = zOf(kind === 'tower' ? 1 + Math.floor(rr() * 2) : Math.max(1, base - 2)), d = 14 + Math.floor(rr() * 18);
        const tw = kind === 'setback' ? bw - 16 : Math.max(60, bw * (0.42 + rr() * 0.28)), tx0 = kind === 'setback' ? X0 + 8 : X0 + 8 + rr() * (bw - 16 - tw), over = kind === 'tower' ? overAt(tx0, tx0 + tw) : 0;
        const zt = Math.min(maxZ(64, d) + over, zOf(base + (kind === 'tower' ? 2 + Math.floor(rr() * 4) : 1 + Math.floor(rr() * 2))));
        vols.push({ x0: X0, x1: X1, y1: Y1, z0: 0, z1: zp, ground: true });
        if (zt < zp + ST) vols[vols.length - 1].z1 = zOf(base); // (no room for the upper part: an ordinary block)
        else vols.push({ x0: tx0, x1: tx0 + tw, y1: Y1 - d, z0: zp, z1: zt, upper: true, back: kind === 'tower' ? 10 + Math.floor(rr() * 14) : 0, over: Math.max(0, zt - maxZ(64, d)) }); }
      else if (kind === 'wings') { const m = X0 + bw * (0.35 + rr() * 0.3), za = zOf(Math.max(2, base - 1 - Math.floor(rr() * 2))), zb = Math.min(maxZ(46, 0), zOf(base + Math.floor(rr() * 2)));
        const tallLeft = rr() < 0.5; vols.push({ x0: X0, x1: m, y1: Y1, z0: 0, z1: tallLeft ? zb : za, ground: true }, { x0: m, x1: X1, y1: Y1, z0: 0, z1: tallLeft ? za : zb, ground: true }); }
      else if (kind === 'L') { const zf = zOf(Math.max(1, base - 2)), ym = Y1 - (50 + rr() * 30), w2 = bw * (0.45 + rr() * 0.25), left = rr() < 0.5, bx0 = left ? X0 : X1 - w2;
        const zb = Math.min(ym - Y0 - 46, zf + zOf(2 + Math.floor(rr() * 3)));
        if (zb > zf) vols.push({ x0: bx0, x1: bx0 + w2, y1: ym, z0: 0, z1: zb, ground: false, back: true }); vols.push({ x0: X0, x1: X1, y1: Y1, z0: 0, z1: zf, ground: true }); }
      // draw: back to front (south edge), a part standing on another after it
      vols.sort((a, b) => (a.y1 - b.y1) || (a.z0 - b.z0));
      let biggest = null;
      vols.forEach((v, vi) => { const w = v.x1 - v.x0, roofY0 = Y0 + (v.over ? 0 : (v.back || 0)) - (v.over || 0), roofY1 = v.y1 - v.z1, rh = roofY1 - roofY0; if (w < 20 || rh < 10) return;
        const col = ROOF[Math.floor(rr() * ROOF.length)], roofList = A(dRoof), roofArt = roofList ? roofList[((l.roofN || 0) + vi) % roofList.length] : null; ra();
        ctx.save(); ctx.beginPath(); ctx.rect(S(v.x0), S(roofY0), S(w), S(rh)); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(S(v.x0), S(roofY0), S(w), S(rh));
        if (roofArt) tile(roofArt, v.x0, roofY0, w, rh, 160); if (v.upper) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(S(v.x0), S(roofY0), S(w), S(rh)); } ctx.restore();
        { const P = 4; ctx.save(); for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(0,0,0,' + (0.3 - i * 0.05) + ')'; ctx.lineWidth = S(2); ctx.strokeRect(S(v.x0 + P + 1 + i * 1.6), S(roofY0 + P + 1 + i * 1.6), S(w - 2 * (P + 1 + i * 1.6)), S(rh - 2 * (P + 1 + i * 1.6))); }
          ctx.strokeStyle = '#4b525c'; ctx.lineWidth = S(P); ctx.strokeRect(S(v.x0 + P / 2), S(roofY0 + P / 2), S(w - P), S(rh - P)); ctx.strokeStyle = 'rgba(205,214,226,.25)'; ctx.lineWidth = S(1); ctx.strokeRect(S(v.x0 + 1), S(roofY0 + 1), S(w - 2), S(rh - 2)); ctx.restore(); }
        if (roofArt && CITY_ROOF_KIT[nameOf.get(roofArt)] && (!biggest || w * rh > biggest.a)) biggest = { a: w * rh, q: [v.x0, roofY0, v.x1, roofY1], roofArt };
        // the south wall, floor by floor, from the top of the wall down
        const wy0 = v.y1 - v.z1, wy1 = v.y1 - v.z0, nf = Math.max(1, Math.round((wy1 - wy0) / ST)), rowH = (wy1 - wy0) / nf;
        const wallList = A(SL.wall), wallArt = wallList ? wallList[((l.wallN || 0) + (v.upper ? 1 : 0)) % wallList.length] : null, isDoor = a => !!a && CITY_DOOR_WALLS.includes(nameOf.get(a));
        const noDoor = [...(wallList || []), ...(A('wall') || [])].filter(a => !isDoor(a)), doorWall = home && (wallList || []).find(isDoor);
        ctx.save(); ctx.fillStyle = '#2a2e37'; ctx.fillRect(S(v.x0), S(wy0), S(w), S(wy1 - wy0));
        let prevG = null; const shop = v.ground && southSt2 && !home && v.y1 === Y1 && nf > 1;
        for (let f = 0; f < nf; f++) { const fy = wy0 + f * rowH, groundRow = v.ground && f === nf - 1;
          if (groundRow && shop) { const sa = pick(SL.shop, ra); if (sa && fitRow(sa, v.x0, fy, w, rowH, rr) === null) { fitRow.force = true; fitRow(sa, v.x0, fy, w, rowH, rr); fitRow.force = false; } continue; }
          const art = groundRow && doorWall ? doorWall : (isDoor(wallArt) ? noDoor[0] : wallArt); if (!art) continue;
          let g = fitRow(art, v.x0, fy, w, rowH, rr, prevG); if (g === null) { fitRow.force = true; g = fitRow(art, v.x0, fy, w, rowH, rr, null); fitRow.force = false; } prevG = g;
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(S(v.x0), S(fy + rowH - 1.5), S(w), S(1.5)); }
        ctx.fillStyle = 'rgba(190,198,210,.35)'; ctx.fillRect(S(v.x0 - 1), S(wy0), S(w + 2), S(2.5)); // the cornice at the wall's top
        if (v.upper) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(S(v.x0), S(wy0), S(w), S(wy1 - wy0)); } // (a part set back reads as further away)
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = S(1); ctx.strokeRect(S(v.x0 + 0.5), S(roofY0 + 0.5), S(w - 1), S(wy1 - roofY0 - 1)); ctx.restore(); });
      if (biggest) { const [qx0, qy0, qx1, qy1] = biggest.q, w = qx1 - qx0, h = qy1 - qy0, n = 1 + Math.floor(rr() * 3), placed = [];
        for (let i = 0; i < n * 3 && placed.length < n; i++) { const kind2 = Math.floor(rr() * 7), slot = ['prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight', 'prop-heater'][kind2];
          const ok = (CITY_ROOF_KIT[nameOf.get(biggest.roofArt)] || []).includes(slot), art = ok ? pick(slot, ra) : (ra(), null), L = [36, 28, 50, 56, 64, 44, 40][kind2]; if (!art) continue;
          const k3 = L / Math.max(art.width, art.height), iw = art.width * k3, ih = art.height * k3, EM = 24; if (w < iw + 2 * EM || h < ih + 2 * EM) continue;
          const ix = qx0 + EM + rr() * (w - 2 * EM - iw), iy = qy0 + EM + rr() * (h - 2 * EM - ih); if (placed.some(p => ix < p[2] + 10 && ix + iw > p[0] - 10 && iy < p[3] + 10 && iy + ih > p[1] - 10)) continue;
          placed.push([ix, iy, ix + iw, iy + ih]); ctx.drawImage(art, S(ix), S(iy), S(iw), S(ih)); } }
      continue; }
    let blade = false; const southSt = !!l.south, floors0 = l.mall ? 3 : home ? 3 + Math.floor(rr() * 2) : (southSt ? 4 + Math.floor(rr() * 4) : 4 + Math.floor(rr() * 2)) + (district === 'tech' ? 1 : 0), LF = cityLotFloors(l, floors0), floors = LF.floors, dz = LF.dz, wallTop = bx[3] - dz;
    const rb = [bx[0], bx[1], bx[2], wallTop]; bx[3] = wallTop; const bh0 = bh;
    // a roof, sometimes in two parts of different heights
    const parts = l.mall ? [bx] /* Round 450: the mall is one roof */ : bw > 140 && rr() < 0.5 ? (() => { const m = bx[0] + bw * (0.35 + rr() * 0.3); return [[bx[0], bx[1], m, bx[3]], [m, bx[1], bx[2], bx[3]]]; })() : bh > 140 && rr() < 0.5 ? (() => { const m = bx[1] + bh * (0.35 + rr() * 0.3); return [[bx[0], bx[1], bx[2], m], [bx[0], m, bx[2], bx[3]]]; })() : [bx];
    parts.forEach((q, pi) => { const w = q[2] - q[0], h = q[3] - q[1], col = ROOF[Math.floor(rr() * ROOF.length)];
      ctx.save(); ctx.beginPath(); ctx.rect(S(q[0]), S(q[1]), S(w), S(h)); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h));
      const roofList = A(dRoof), roofArt = roofList ? roofList[((l.roofN || 0) + pi) % roofList.length] : null; ra(); /* Round 445: the lot's own number (no neighbour has it); the second part takes the next */ if (roofArt) { tile(roofArt, q[0], q[1], w, h, 160); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (pi) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(S(q[0]), S(q[1]), S(w), S(h)); }
      ctx.restore();
      { ctx.save(); const P = 4; // Round 426: a thinner parapet (was 6). Round 414: a raised parapet: a lit top, a dark inner face, a shadow falling onto the roof
        for (let i = 0; i < 8; i++) { ctx.strokeStyle = 'rgba(0,0,0,' + (0.32 - i * 0.04) + ')'; ctx.lineWidth = S(2); ctx.strokeRect(S(q[0] + P + 1 + i * 1.6), S(q[1] + P + 1 + i * 1.6), S(w - 2 * (P + 1 + i * 1.6)), S(h - 2 * (P + 1 + i * 1.6))); }
        ctx.strokeStyle = '#4b525c'; ctx.lineWidth = S(P); ctx.strokeRect(S(q[0] + P / 2), S(q[1] + P / 2), S(w - P), S(h - P));
        ctx.strokeStyle = 'rgba(205,214,226,.22)'; ctx.lineWidth = S(1); ctx.strokeRect(S(q[0] + 1), S(q[1] + 1), S(w - 2), S(h - 2));
        ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = S(1.2); ctx.strokeRect(S(q[0] + P), S(q[1] + P), S(w - 2 * P), S(h - 2 * P)); ctx.restore(); }
      /* Round 426: the second dark line inside the parapet is gone */
      // Round 439 (owner: "the destroyed building roofs don't look good ... maybe a roof with a large hole or something but not
      // rubble"): a ruin keeps an ordinary roof and parapet, with a hole (props/roof-hole/) in its largest part; no rooftop kit
      if (ruin) { const ho = (pi === 0 || parts.length > 1 && rr() < 0.5) && pick('roof-hole', ra); if (ho && CITY_ROOF_KIT[nameOf.get(roofArt)]) { const k = Math.min((w - 48) / ho.width, (h - 48) / ho.height) * (0.85 + rr() * 0.12), dw = ho.width * k, dh = ho.height * k; // Round 475 (owner: "a rule not to place objects on roofs that dont fit"): a hole too only on a plain roof, 24px clear of every edge (as rooftop kit)
          const hx = q[0] + 24 + rr() * (w - 48 - dw), hy = q[1] + 24 + rr() * (h - 48 - dh); if (dw > 30 && dh > 30 && hx >= 0 && hy >= 0 && hx + dw <= 800 && hy + dh <= 500) ctx.drawImage(ho, S(hx), S(hy), S(dw), S(dh)); } return; } // Round 479 (owner: "roof of this building has a cut off graphic"): a hole only where the whole of it lies inside the room (one drawn across a room's edge could show cut)
      // rooftop clutter
      const items = l.mall ? Math.round(w * h / 12000) : 2 + Math.floor(rr() * 4), placed = [];
      // Round 416 (owner: "some rooftop objects being too small, others being too big"): each kind has one size, the
      // longer side of its picture (Round 425: 1.4x these: an air unit 36, a vent 28, a tank 50, a stair hut 56, solar 64, a skylight 44; before: an air unit 26, a vent 20, a tank 36, a stair hut 40,
      // solar panels 46, a skylight 32), and its box follows the picture's own shape; it used to be squeezed into a fixed box.
      for (let i = 0; i < items * 3 && placed.length < items; i++) { const kind = Math.floor(rr() * 7), slot = ['prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight', 'prop-heater'][kind], kitOk = !!roofArt && (CITY_ROOF_KIT[nameOf.get(roofArt)] || []).includes(slot), propArt = kitOk ? pick(slot, ra) : (ra(), null), L = [36, 28, 50, 56, 64, 44, 40][kind]; /* Round 438: water heaters */ /* Round 425: 1.4x, with the taller storeys */
        let iw = 0, ih = 0; if (propArt) { const k3 = L / Math.max(propArt.width, propArt.height); iw = propArt.width * k3; ih = propArt.height * k3; }
        if (!propArt) continue; const EM = 24; /* Round 462 (owner: "should also not touch the roof edges"): clear of the parapet, its shadow and a front sign by a few px more */ /* Round 442 (owner: "rooftop objects are never touching the edge of the roofs"): clear of the parapet (4px) and its inner shadow (to ~17px) */ const ix = q[0] + EM + rr() * (w - 2 * EM - iw), iy = q[1] + EM + rr() * (h - 2 * EM - ih);
        if (w < iw + 2 * EM || h < ih + 2 * EM || placed.some(p => ix < p[2] + 10 && ix + iw > p[0] - 10 && iy < p[3] + 10 && iy + ih > p[1] - 10)) continue; placed.push([ix, iy, ix + iw, iy + ih]);
        if (propArt) ctx.drawImage(propArt, S(ix), S(iy), S(iw), S(ih)); } }); // its box is its picture: never over a neighbour; no picture, nothing drawn
    if (dz > 3) { const wall = ctx.createLinearGradient(0, S(wallTop), 0, S(wallTop + dz)); wall.addColorStop(0, '#3a3f4a'); wall.addColorStop(1, '#1c1f27');
      ctx.save(); ctx.fillStyle = wall; ctx.fillRect(S(bx[0]), S(wallTop), S(bw), S(dz)); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(S(bx[0]), S(wallTop), S(bw), S(1.5));
      const rowH = dz / floors, shopF = southSt && floors > 1 && !ruin && !home ? floors - 1 : -1;
      const wallList = A(SL.wall), wallArt = wallList ? wallList[(l.wallN || 0) % wallList.length] : null, shopArt = pick(SL.shop, ra);
      // Round 414 (owner: "our buildings have too many identical floors"): the wall is laid floor by floor, each floor its
      // own sideways shift and its own light (some floors dark), a ledge under each floor, a cornice at the top, and on a
      // third of buildings the upper floors in a second material.
      if (wallArt) { const upper = rr() < 0.33 ? pick(SL.wall, ra) : wallArt, split = 1 + Math.floor(rr() * Math.max(1, floors - 2));
        // Round 459 (owner: "buildings should only use a sprite with a door on the 1st floor"): a wall picture with doors in
        // it (CITY_DOOR_WALLS) is laid only as a building's ground floor; an upper floor that would get one takes a doorless
        // wall of the same list (else the city's general walls); a home shows its door wall at street level where it has one
        const isDoor = a => !!a && CITY_DOOR_WALLS.includes(nameOf.get(a)), noDoor = [...(wallList || []), ...(A('wall') || [])].filter(a => !isDoor(a)),
          plain = a => isDoor(a) ? (noDoor.find(b => b === wallArt) || noDoor[(l.wallN || 0) % Math.max(1, noDoor.length)] || null) : a,
          doorWall = home && (wallList || []).find(isDoor);
        let prevG = null, prevArt = null;
        for (let f = 0; f < floors; f++) { if (f === shopF) continue; const fy = wallTop + f * rowH, ground = f === floors - 1;
          const art = ground ? (doorWall || (f < split ? upper : wallArt)) : plain(f < split ? upper : wallArt); if (!art) continue;
          // Round 459 (owner: "any windows that cant be properly cut to fit can be removed and replaced"): a picture that can't
          // start and end between windows on this wall gives way to the next one of the list that can (the last resort cuts)
          let g = fitRow(art, bx[0], fy, bw, rowH, rr, art === prevArt ? prevG : null), used = art;
          if (g === null) for (const alt of [...noDoor.filter(a => a !== art), null]) { if (!alt) { fitRow.force = true; g = fitRow(art, bx[0], fy, bw, rowH, rr, null); fitRow.force = false; break; } g = fitRow(alt, bx[0], fy, bw, rowH, rr, null); if (g !== null) { used = alt; break; } }
          prevG = g; prevArt = used;
          const shade = rr(); if (shade < 0.3) { ctx.fillStyle = 'rgba(4,6,12,' + (0.25 + shade) + ')'; ctx.fillRect(S(bx[0]), S(fy), S(bw), S(rowH)); }
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(S(bx[0]), S(fy + rowH - 1.5), S(bw), S(1.5)); ctx.fillStyle = 'rgba(170,178,190,.22)'; ctx.fillRect(S(bx[0]), S(fy + rowH), S(bw), S(1)); }
        ctx.fillStyle = 'rgba(190,198,210,.35)'; ctx.fillRect(S(bx[0] - 1), S(wallTop), S(bw + 2), S(2.5)); }
      if (shopF >= 0) { // Round 401 (owner: 30 degrees): a shopfront at street level: a lit window band, doors, an awning
        const y0 = wallTop + shopF * rowH, col = NEON[Math.floor(rr() * NEON.length)];
        if (shopArt && fitRow(shopArt, bx[0], y0, bw, rowH, rr) === null) { const alts = [...(A(SL.shop) || []), ...(A('shop') || [])].filter(a => a !== shopArt); let done = false; for (const a of alts) if (fitRow(a, bx[0], y0, bw, rowH, rr) !== null) { done = true; break; } if (!done) { fitRow.force = true; fitRow(shopArt, bx[0], y0, bw, rowH, rr); fitRow.force = false; } }
        if (floors >= 3 && !l.mall && rr() < 0.75) { blade = true; // a blade sign down the upper floors
          const bxp = rr() < 0.5 ? bx[0] + 10 : bx[2] - 22, bt = wallTop + rowH * 0.3, bl = y0 - bt - 4, nc = NEON[Math.floor(rr() * NEON.length)];
          // Round 420 (owner: "remove all placeholder graphics"; "never stretch graphics"): only the sign's own picture, at its own
          // proportions, as large as fits down the upper floors and 18px wide; no drawn stand-in
          const vArt = pick('sign-v', ra); if (vArt) { const k2 = Math.min(bl / vArt.height, 26 / vArt.width), dw = vArt.width * k2, dh = vArt.height * k2; ctx.drawImage(vArt, S(bxp + 6 - dw / 2), S(bt + (bl - dh) / 2), S(dw), S(dh)); } else blade = false; } }
      ctx.restore(); }
    void bh0;
    // a neon sign on the street side
    // Round 407 (owner: "billboards should only be placed on the front side of buildings never the back side ... and neon
    // signs"): a sign only on a building whose street is in front (south): a board along the front roof edge, unless the
    // front wall already carries a blade sign. Never on a back or side wall.
    if (l.mall) { const list = A('sign-h'); // Round 450: the mall's front carries a row of signs, evenly spaced, each a different one while they last
      if (list) for (let sx = bx[0] + 40, i = Math.floor(rr() * list.length); sx + 60 < bx[2]; sx += 150, i++) { const hArt = list[i % list.length], k2 = 23 / hArt.height, dw = Math.min(110, hArt.width * k2), dh = dw / hArt.width * hArt.height; if (sx + dw < bx[2] - 20) ctx.drawImage(hArt, S(sx), S(bx[3] - dh / 2 - 2), S(dw), S(dh)); } }
    else if (southSt && !blade && !ruin && !home && rr() < 0.7) { const hArt = pick('sign-h', ra); // the sign's own picture at its own proportions, up to 16px tall, centred on the front roof edge
      if (hArt) { const k2 = Math.min(23 / hArt.height, (bw - 24) / hArt.width), dw = hArt.width * k2, dh = hArt.height * k2, sx = bx[0] + 12 + rr() * Math.max(0, bw - 24 - dw);
        if (dw > 30) ctx.drawImage(hArt, S(sx), S(bx[3] - dh / 2 - 2), S(dw), S(dh)); } }
    // Round 470 (owner: "can we add a 1px black border to all buildings as well?"): round the whole building, roof and front wall
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = S(1); ctx.strokeRect(S(bx[0] + 0.5), S(bx[1] + 0.5), S(bw - 1), S(bh0 - 1)); ctx.restore(); }
  for (const f of rimQueue) f(); // Round 480: the yard and park rims, over all the ground
  { // Round 467: the shadows fall only on walkable ground: never on a building (its own included), another lot, or an edge
    shG.save(); shG.globalCompositeOperation = 'destination-out'; shG.fillStyle = '#000';
    for (const l of lots) { const I2 = l.use === 'roof' ? 8 : 0; if (l.use !== 'plaza') shG.fillRect(S(l.r[0] + I2), S(l.r[1] + I2), S(l.r[2] - l.r[0] - 2 * I2), S(l.r[3] - l.r[1] - 2 * I2)); }
    if (cityEdgeMask) shG.drawImage(cityEdgeMask, 0, 0); shG.restore(); if (!GEN.noShadows) ctx.drawImage(shL, 0, 0); } // Round 468: off (GEN.noShadows)
  // Round 410: cars last, so no lot, park or border is ever drawn over one
  // parked cars along the main streets (where they stand comes from cityParkedCars, which the walk mask reads too)
  for (const c of cityParkedCars(seed, plan)) { const { px, py, hz, col } = c, w = hz ? 46 : 22, h = hz ? 22 : 46, cars = A('car');
    if (cars) { const carArt = cars[Math.floor(c.artR * cars.length)], L2 = 61, T2 = L2 * carArt.height / carArt.width; /* Round 425: 56 -> 72; Round 442 (owner: "reduce car size 15%"): 61 */ // painted at the 3/4 angle, so stood upright; half face the other way
      ctx.save(); ctx.translate(S(px), S(py)); if (c.flip) ctx.scale(-1, 1); ctx.drawImage(carArt, S(-L2 / 2), S(-T2 * 0.6), S(L2), S(T2)); ctx.restore(); } } // no picture, no car drawn
  // Round 424: street lights, traffic lights and traffic signs, stood upright on their post's foot, nearest last
  for (const f of cityFurnitureNear(seed, plan)) { const l = A(f.slot), art = l && l[Math.floor(f.artR * l.length)]; if (!art) continue; const dh = f.h, dw = art.width * dh / art.height; if (f.foreign && (f.x + dw / 2 < 0 || f.x - dw / 2 > 800 || f.y < 0 || f.y - dh > 500)) continue; // Round 489: and the neighbours' that stand over the edge
    ctx.save(); ctx.translate(S(f.x), S(f.y)); if (f.flip) ctx.scale(-1, 1); ctx.drawImage(art, S(-dw / 2), S(-dh), S(dw), S(dh)); ctx.restore(); }
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
  const src = GEN.art + ((GEN.tex && GEN.tex[name]) || (GEN.legacy && name.indexOf('/') < 0 ? GEN.legacy + name : name)) + '.webp?v=' + GEN.version();
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
  const names = ['ground', 'floor', 'pipes', 'chasm', 'yard', ...(GEN.tex && GEN.tex['yard-cargo'] ? ['yard-cargo', 'yard-rubble'] : []), ...(GEN.plazaTex ? [GEN.plazaTex] : []), ...(GEN.beach ? ['sand'] : []), ...(GEN.topdown ? ['pavement-old', ...cityTdArtNames()] : []), ...(GEN.mix || []).map(m => m.tex), ...new Set((GEN.topdown ? [] : props.map(p => p.name)).concat(plan.inlays.map(i => i.name)))], imgs = {};
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
  if (GEN.topdown) { fill(ctx, imgs['pavement-old']); ctx.fillStyle = GEN.groundDim || 'rgba(8,12,24,.5)'; /* Round 483: a theme's own light (Solaris is day) */ ctx.fillRect(0, 0, W, H); } else fill(ctx, imgs.ground);
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
  else { const sw = (typeof CITY_TD_ART !== 'undefined' ? CITY_TD_ART.sidewalk : []).map(n => cityArtPath('sidewalk', n)).filter(n => imgs[n] && imgs[n].naturalWidth);
    // Round 407 (owner: "sidewalk tile size is far too big"): drawn at 0.35, a paving tile about 90px across
    const swReg = CITY_SURFACES.find(x => x.key === 'sidewalk'); for (const n of sw) (GEN.texScale = GEN.texScale || {})[n] = (swReg.scales && swReg.scales[n.split('/').pop()]) || swReg.scale; // Round 423 (owner: "walk slabs and walk plates are too big"): per-picture scales // Round 420 (owner: "the road and curb tile scale should be smaller")
    // Round 408 (owner: blends between very different tiles "look horrible ... set rules so it cant happen again"; "find what
    // technique is used by modern 2d games"): as with autotiled terrain, a material change is a hard edge on the grid,
    // never a fade. Each block of the city (the ground the streets enclose) takes one paving, half of them the main one;
    // a block's edges run along its streets, so a paving only changes across a street.
    // Round 445 (owner: "textures clashing"): one paving for the whole city, picked by the journey's seed. A paving per
    // block (Round 408) put a pale paving beside a dark one across every alley.
    if (sw.length) { fill(ctx, imgs[sw[chronoHash(chronoSeed() + ':paving') % sw.length]]);
      ctx.fillStyle = GEN.pavingDim || 'rgba(8,12,24,.38)'; ctx.fillRect(0, 0, W, H); } } // the machinery sits back, so the roads read at a glance
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
  cityEdgeMask = GEN.topdown ? (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; })() : null;
  // (Round 489: defined before the coast, which cuts the sand under the road exactly as the road will be drawn)
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
        box(x0, y0, x1, y1, GEN.cornerR ? Math.min(GEN.cornerR, (x1 - x0) / 4, (y1 - y0) / 4) : Math.min(50, (x1 - x0) / 2, (y1 - y0) / 2)); } // Round 445: the city's crossings, squares and dead ends turn on the same modest radius as its street corners (a dead-end alley ended in a pill, a boss's square in a blob)
      else if (sh.t === 'poly') { turn(sh.pts, true); g.fill(); if (G) { g.lineWidth = 2 * G; g.stroke(); } }
      else if (GEN.square) { g.save(); g.lineCap = GEN.alley ? 'butt' : 'round'; g.lineJoin = 'round'; /* Round 417: flat road ends; the crossing and door stubs cover the joins */ g.lineWidth = sh.w * K + 2 * G; g.beginPath(); sh.pts.forEach(([x, y], i) => i ? g.lineTo(x * K, y * K) : g.moveTo(x * K, y * K)); g.stroke(); g.restore(); }
      else { g.lineWidth = sh.w * K + 2 * G; turn(sh.pts, false); g.stroke(); }
    }
    return c; };
  // Round 489: whether a street cell of the world is painted as road in this room. The road painter lays road only where the
  // plan's own drawing covers a cell's middle, so a stub one cell deep is never painted; the coast below used to treat it as
  // street all the same (no sand there), leaving a square of bare paving framed by the beach's lip. Every part that needs to
  // know where the road is (the coast's sand, the cut under the road) asks this, the one answer.
  let roadDrawnMemo = null;
  const roadDrawnCell = (X, Y) => { const [qx, qy] = GEN.world(key), cx = X - qx * FG_COLS, cy = Y - qy * FG_ROWS; if (cx < 0 || cy < 0 || cx >= FG_COLS || cy >= FG_ROWS) return true;
    if (!plan.floor[cy * FG_COLS + cx]) return false;
    if (!roadDrawnMemo) { const fs = drawFloor(0), vec = GEN.square ? closed(fs, GEN.cornerR || GEN.pavement + 30) : fs; roadDrawnMemo = vec.getContext('2d').getImageData(0, 0, W, H).data; }
    return roadDrawnMemo[(Math.round((cy + 0.5) * FG_CELL * K) * W + Math.round((cx + 0.5) * FG_CELL * K)) * 4 + 3] > 127; };
  let coastBeachMask = null, coastLipDraw = null; // (Round 461) for the streets drawn later: their kerbs stop at the sand, the lip runs on along them
  if (any(terrain.chasm) && GEN.beach && GEN.topdown) {
    // Round 412 (owner: "sand and grass tiles still do not transition well"): as in autotiled games, the coast keeps to the
    // grid: water cells, then a band of sand exactly one cell wide, with a shoreline strip (CITY_TD_ART.shore: concrete
    // crumbling into the sand) laid along every straight edge where the sand meets the paving, and a foam line along the water.
    const T = CG_CELL, W8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], isW = (x, y) => terrain.chasm(x, y), isS = (x, y) => !isW(x, y) && W8.some(([a, b]) => isW(x + a, y + b));
    // Round 423 (owner: "our water texture needs improvement, it repeats too much"): the water is drawn larger, and a second
    // copy, turned a quarter and mirrored and shifted, is laid over it in soft patches from world-wide noise, so the
    // picture's repeat no longer lines up into a visible grid.
    const waterFill = g => { fill(g, imgs.chasm); const img = sized(imgs.chasm), m = patches('water2', 4, 0.42), c = document.createElement('canvas'); c.width = W; c.height = H; const cg = c.getContext('2d');
      cg.drawImage(m, 0, 0); cg.globalCompositeOperation = 'source-in'; const p = cg.createPattern(img, 'repeat'); const [vx, vy] = GEN.world(key);
      if (p.setTransform) p.setTransform(new DOMMatrix().translate(-((vx * W) % 1600) - 517, -((vy * H) % 1600) - 311).rotate(90).scale(-1, 1)); cg.fillStyle = p; cg.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.drawImage(c, 0, 0); g.restore(); };
    // Round 446 (owner: "design a better beach and water algorithm, our beach and water looks terrible"). The coast used to
    // be the sea's 50px cells with their corners rounded: a staircase of square notches, a sand band of one fixed width, flat
    // dark water and a hard line where they met. Now:
    //   1. Two smooth fields are worked out per room px from the whole world's cells (so they run on across room edges):
    //      `v`, the sea's cells blurred (three box passes, about 22px), and `sv`, the same for the sea and the ring of cells
    //      round it. A little world-wide noise wobbles both. Blurring turns the notches into bays and headlands.
    //   2. The shoreline is where v = 0.5; the sand runs to where sv = 0.5 (so it is wider in bays, narrower on points).
    //   3. The water has depth: full texture far out, darker with distance, a band of pale teal shallows at the shore.
    //   4. The sand has a darker wet band at the water, and a thin broken line of foam where the two meet, with a fainter
    //      second line a little way out. No border strip between water and sand (owner, Round 417).
    // The sea's cells still decide where you can walk; the drawn shore keeps within a few px of them.
    const coast = (() => { const P = 66, R = 22, w = 800 + 2 * P, h = 500 + 2 * P, V = new Float32Array(w * h), SV = new Float32Array(w * h), tmp = new Float32Array(w * h);
      const cw = Math.ceil(w / T) + 2, c0 = Math.floor(-P / T), cellW = new Uint8Array(cw * (Math.ceil(h / T) + 2)), cellS = new Uint8Array(cellW.length);
      for (let cy = 0; cy * cw < cellW.length; cy++) for (let cx = 0; cx < cw; cx++) { const wv = isW(cx + c0, cy + c0); cellW[cy * cw + cx] = wv ? 1 : 0; cellS[cy * cw + cx] = wv || isS(cx + c0, cy + c0) ? 1 : 0; }
      for (let y = 0; y < h; y++) { const cy = Math.floor((y - P) / T) - c0; for (let x = 0; x < w; x++) { const ci = cy * cw + Math.floor((x - P) / T) - c0; V[y * w + x] = cellW[ci]; SV[y * w + x] = cellS[ci]; } }
      const box = (a) => { for (let pass = 0; pass < 3; pass++) { // three box blurs: close to a Gaussian
          for (let y = 0; y < h; y++) { let sum = 0; const o = y * w; for (let x = -R; x <= R; x++) sum += a[o + Math.max(0, Math.min(w - 1, x))];
            for (let x = 0; x < w; x++) { tmp[o + x] = sum / (2 * R + 1); sum += a[o + Math.min(w - 1, x + R + 1)] - a[o + Math.max(0, x - R)]; } }
          for (let x = 0; x < w; x++) { let sum = 0; for (let y = -R; y <= R; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
            for (let y = 0; y < h; y++) { a[y * w + x] = sum / (2 * R + 1); sum += tmp[Math.min(h - 1, y + R + 1) * w + x] - tmp[Math.max(0, y - R) * w + x]; } } } };
      box(V); box(SV);
      // Round 461 (owner: "remove these pieces where road tile is underneath sticking out onto the beach"): the bare shore
      // ground (the city's no-build margin by the sea) left between the sand and a street or a lot. A pocket of it under
      // 6000 px² (a bump between the beach and the road) becomes sand, grown 6px under the sand's edge so the beach's
      // wobble leaves no sliver; larger stretches stay paving (promenades, squares). Found over the room and 66px round it.
      const pocket = new Uint8Array(w * h), dry = new Uint8Array(w * h); /* dry: Round 479, no beach or sea here whatever the noise adds later */ if (GEN.coastCrisp && GEN.worldLots) { const wl = genWorld(chronoSeed()), [qx, qy] = GEN.world(key), FC = FG_CELL;
        const kind = (x, y) => { const X = qx * 800 + x - P, Y = qy * 500 + y - P, cx = Math.floor(X / FC), cy = Math.floor(Y / FC); if (cx < 0 || cy < 0 || cx >= wl.CW || cy >= wl.CH) return 9; const v = wl.cell[cy * wl.CW + cx];
          if (v === 2 && !roadDrawnCell(cx, cy)) return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => wl.cell[(cy + b) * wl.CW + cx + a] === 3) ? 3 : 1; return v; }; // (Round 489: a street the road doesn't paint is shore by the sea, ground elsewhere)
        // Round 479: sand cut off from the water by a street (a street along the coast covers the sea's first cells, and the band
        // of sand round them then lay on its far side, inside the block) is paving: a stretch of sand not touching visible water
        // without crossing a street is dropped
        { // first the water: a patch of sea cut off from the open sea by a street (the smooth coast bulging past a street
          // laid over the sea's edge) is dry land; the open sea is what reaches the edge of the area worked out
          const wet0 = new Uint8Array(w * h), seenW = new Uint8Array(w * h), qw = new Int32Array(w * h);
          for (let i = 0; i < w * h; i++) { const x = i % w; wet0[i] = V[i] >= 0.5 && kind(x, (i - x) / w) !== 2 ? 1 : 0; }
          for (let s0 = 0; s0 < w * h; s0++) { if (!wet0[s0] || seenW[s0]) continue; let qh = 0, qt = 0, open = false; qw[qt++] = s0; seenW[s0] = 1;
            while (qh < qt) { const i = qw[qh++], x = i % w, y = (i - x) / w; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) open = true;
              for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && Math.abs((j % w) - x) <= 1 && wet0[j] && !seenW[j]) { seenW[j] = 1; qw[qt++] = j; } }
            if (!open) for (let n = 0; n < qt; n++) { V[qw[n]] = 0.2; SV[qw[n]] = 0.2; dry[qw[n]] = 1; } } }
        { const sand = new Uint8Array(w * h), seen2 = new Uint8Array(w * h), q2 = new Int32Array(w * h);
          for (let i = 0; i < w * h; i++) { const x = i % w, y = (i - x) / w; sand[i] = SV[i] >= 0.5 && V[i] < 0.5 && kind(x, y) !== 2 ? 1 : 0; }
          for (let s0 = 0; s0 < w * h; s0++) { if (!sand[s0] || seen2[s0]) continue; let qh = 0, qt = 0, wet = false; q2[qt++] = s0; seen2[s0] = 1;
            while (qh < qt) { const i = q2[qh++], x = i % w;
              for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || Math.abs((j % w) - x) > 1) continue; if (V[j] >= 0.5 && kind(j % w, (j - (j % w)) / w) !== 2) wet = true; if (sand[j] && !seen2[j]) { seen2[j] = 1; q2[qt++] = j; } } }
            if (!wet) for (let n = 0; n < qt; n++) { SV[q2[n]] = 0; dry[q2[n]] = 1; } } }
          for (let i = 0; i < w * h; i++) if (V[i] < 0.5 && SV[i] >= 0.5) { const x = i % w; if (kind(x, (i - x) / w) === 2) { SV[i] = 0.49; dry[i] = 1; } } // (no sand under a street: the street is drawn over it, and the hidden sand's edge drew a scrap of lip into the block)
        const nearSt = (x, y) => kind(x - 25, y) === 2 || kind(x + 25, y) === 2 || kind(x, y - 25) === 2 || kind(x, y + 25) === 2 || kind(x - 18, y - 18) === 2 || kind(x + 18, y - 18) === 2 || kind(x - 18, y + 18) === 2 || kind(x + 18, y + 18) === 2;
        const bare = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; bare[i] = SV[i] < 0.5 && kind(x, y) === 3 ? 1 : 0; } void nearSt;
        const seen = new Uint8Array(w * h), q = new Int32Array(w * h);
        for (let s0 = 0; s0 < w * h; s0++) { if (!bare[s0] || seen[s0]) continue; let qh = 0, qt = 0, edge = false; q[qt++] = s0; seen[s0] = 1;
          while (qh < qt) { const i = q[qh++], x = i % w, y = (i - x) / w; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
            for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && !seen[j] && bare[j] && Math.abs((j % w) - x) <= 1) { seen[j] = 1; q[qt++] = j; } }
          let touches = false; for (let n = 0; n < qt && !touches; n++) { const i = q[n]; for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && !bare[j] && SV[j] >= 0.5 && kind(j % w, (j - (j % w)) / w) === 3) { touches = true; break; } }
          if (qt < 6000 && !edge && touches) for (let n = 0; n < qt; n++) pocket[q[n]] = 1; } // Round 479: only a pocket touching the beach becomes sand (one hemmed in by streets and lots far from the sand showed as a stray strip of sand)
        for (let pass = 0; pass < 6; pass++) { const add = []; for (let i = w; i < w * h - w; i++) if (!pocket[i] && SV[i] >= 0.5 && kind(i % w, (i - (i % w)) / w) === 3 && (pocket[i - 1] || pocket[i + 1] || pocket[i - w] || pocket[i + w])) add.push(i); for (const i of add) pocket[i] = 1; } }
      // noise on a 10px grid over the world, read between its points
      const [nwx, nwy] = GEN.world(key), sd = chronoSeed(), G = 10, gw = Math.ceil(800 / G) + 2, gh = Math.ceil(500 / G) + 2, n1 = new Float32Array(gw * gh), n2 = new Float32Array(gw * gh), n3 = new Float32Array(gw * gh);
      for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const X = nwx * 800 + gx * G, Y = nwy * 500 + gy * G; n1[gy * gw + gx] = chronoNoise(sd, 'coast', X, Y, 90) - 0.5; n2[gy * gw + gx] = chronoNoise(sd, 'coast2', X, Y, 26) - 0.5; n3[gy * gw + gx] = chronoNoise(sd, 'foam', X, Y, 14); }
      const lerp = (a, x, y) => { const fx = x / G, fy = y / G, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, i = y0 * gw + x0; return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + gw] * (1 - tx) + a[i + gw + 1] * tx) * ty; };
      const crisp = !!GEN.coastCrisp, MW = crisp ? W : 800, MH = crisp ? H : 500, sK = crisp ? K : 1;
      const mk = () => { const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d'), d = g.createImageData(MW, MH); return { c, g, d }; };
      // (Round 461) the fields at room px, noise added; read between px for each canvas px when crisp
      const VF = new Float32Array(801 * 501), SF = new Float32Array(801 * 501), NF = new Float32Array(801 * 501), PF = new Float32Array(801 * 501);
      for (let y = 0; y <= 500; y++) for (let x = 0; x <= 800; x++) { const o = (Math.min(y, h - P - 1) + P) * w + Math.min(x, w - P - 1) + P, a = lerp(n1, Math.min(x, 799), Math.min(y, 499)), b = lerp(n2, Math.min(x, 799), Math.min(y, 499)); VF[y * 801 + x] = dry[o] ? Math.min(0.3, V[o]) : V[o] + a * 0.16 + b * 0.07; SF[y * 801 + x] = dry[o] ? Math.min(0.3, SV[o]) : SV[o] + a * 0.2 + b * 0.05; NF[y * 801 + x] = lerp(n3, Math.min(x, 799), Math.min(y, 499)); PF[y * 801 + x] = pocket[o]; }
      if (GEN.coastCrisp && GEN.worldLots) { // Round 479: the same rule once more on the final fields (the noise can lift sand just outside a cleared stretch back over the line, leaving a sliver): sand that can't reach water without crossing a street goes
        const wlF = genWorld(chronoSeed()), [fx, fy] = GEN.world(key), st = (x, y) => wlF.cell[Math.floor((fy * 500 + y) / FG_CELL) * wlF.CW + Math.floor((fx * 800 + x) / FG_CELL)] === 2, N = 801 * 501;
        const sd2 = new Uint8Array(N), sn = new Uint8Array(N), qq = new Int32Array(N);
        for (let i = 0; i < N; i++) { const x = i % 801, y = (i - x) / 801; sd2[i] = SF[i] >= 0.5 && VF[i] < 0.5 && !st(Math.min(x, 799), Math.min(y, 499)) ? 1 : 0; }
        for (let s0 = 0; s0 < N; s0++) { if (!sd2[s0] || sn[s0]) continue; let qh = 0, qt = 0, wet = false; qq[qt++] = s0; sn[s0] = 1;
          while (qh < qt) { const i = qq[qh++], x = i % 801; for (const j of [i - 1, i + 1, i - 801, i + 801]) { if (j < 0 || j >= N || Math.abs((j % 801) - x) > 1) continue; const jx = j % 801, jy = (j - jx) / 801;
            if (VF[j] >= 0.5 && !st(Math.min(jx, 799), Math.min(jy, 499))) wet = true; if (sd2[j] && !sn[j]) { sn[j] = 1; qq[qt++] = j; } } }
          if (!wet) for (let n = 0; n < qt; n++) SF[qq[n]] = Math.min(SF[qq[n]], 0.3); } }
      const bil = (F, x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, i = y0 * 801 + x0; return (F[i] * (1 - tx) + F[i + 1] * tx) * (1 - ty) + (F[i + 801] * (1 - tx) + F[i + 802] * tx) * ty; };
      const cellAt = (x, y) => { const cy = Math.floor(y / T), cx = Math.floor(x / T); return cellS[(cy - c0 + Math.floor(P / T) * 0 + 0) * cw + cx - c0] ; };
      const sea = mk(), beach = mk(), shallow = mk(), deep = mk(), wet = mk(), foam = mk(), cl = x => x < 0 ? 0 : x > 1 ? 1 : x;
      const straight = !!GEN.coastStraight, sharp = 50 * sK;
      for (let Y = 0; Y < MH; Y++) for (let X = 0; X < MW; X++) { const x = sK > 1 ? Math.min(799.999, Math.max(0, (X + 0.5) / sK - 0.5)) : X, y = sK > 1 ? Math.min(499.999, Math.max(0, (Y + 0.5) / sK - 0.5)) : Y /* (off: the same room px as before) */, v = bil(VF, Math.max(0, x), Math.max(0, y)), sv = bil(SF, Math.max(0, x), Math.max(0, y)), i = (Y * MW + X) * 4;
        // (Round 461, straight) the paving ends on the cells' own straight edges, as a sea wall: the beach is the sea's cells and the ring round them
        const inSea = cl((v - 0.5) * sharp + 0.5), inBeach = Math.max(inSea, straight ? (cellAt(x + 0.0001, y + 0.0001) ? 1 : 0) : Math.max(cl((sv - 0.5) * sharp + 0.5), cl((bil(PF, x, y) - 0.5) * 2 * sK + 0.5)));
        for (const m of [sea, beach, shallow, deep, wet, foam]) m.d.data[i] = m.d.data[i + 1] = m.d.data[i + 2] = 255;
        sea.d.data[i + 3] = inSea * 255; beach.d.data[i + 3] = inBeach * 255;
        shallow.d.data[i + 3] = inSea * Math.pow(cl(1 - (v - 0.5) / 0.5), 1.6) * 255;           // strongest at the shore, gone about 30px out
        deep.d.data[i + 3] = inSea * cl((v - 0.8) / 0.2) * 255;                  // the open sea, darker
        wet.d.data[i + 3] = (1 - inSea) * cl(1 - (0.5 - v) / 0.24) * 255;         // wet sand: about 14px up the beach
        const f = bil(NF, Math.max(0, x), Math.max(0, y)), line = cl(1 - Math.abs(v - 0.505) / 0.03) * cl((f - 0.3) * 4), swash = cl(1 - Math.abs(v - 0.66) / 0.016) * cl((f - 0.5) * 5) * 0.45;
        foam.d.data[i + 3] = Math.max(line, swash) * 255; }
      const up = m => { m.g.putImageData(m.d, 0, 0); if (MW === W) return m.c; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(m.c, 0, 0, W, H); return c; };
      return { sea: up(sea), beach: up(beach), shallow: up(shallow), deep: up(deep), wet: up(wet), foam: up(foam) }; })();
    const tintIn = (mask, paint) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in'; paint(g); return c; };
    const flat = (mask, col) => tintIn(mask, g => { g.fillStyle = col; g.fillRect(0, 0, W, H); });
    const beach = coast.beach;
    ctx.drawImage(tintIn(beach, g => { fill(g, imgs.sand); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,12,24,.06)'; g.fillRect(0, 0, W, H); }), 0, 0);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(flat(coast.wet, '#0a1420'), 0, 0); ctx.restore();                       // wet sand
    ctx.drawImage(tintIn(coast.sea, g => { waterFill(g); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(30,70,110,.16)'; g.fillRect(0, 0, W, H); }), 0, 0);
    ctx.save(); ctx.globalAlpha = 0.28; ctx.drawImage(flat(coast.deep, '#02040e'), 0, 0); ctx.restore();                      // deep water
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.42; ctx.drawImage(flat(coast.shallow, '#2a7f8e'), 0, 0); ctx.restore(); // shallows
    ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(flat(coast.foam, '#d7ecee'), 0, 0); ctx.restore();                     // foam
    const shoreArt = typeof CITY_TD_ART !== 'undefined' ? (CITY_TD_ART['waterfront-edge'] || []).map(n => imgs[cityArtPath('waterfront-edge', n)]).find(i => i && i.naturalWidth) : null;
    const [wx0, wy0] = GEN.world(key);
    if (GEN.coastLip) { // Round 461: no strip: the paving ends in a drawn concrete lip, crisp at canvas resolution, with a soft shadow on the sand
      const cv = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const grow = (src, r) => { const c = cv(), g = c.getContext('2d'); for (let a = 0; a < 16; a++) for (const rr of [r, r * 0.5]) g.drawImage(src, Math.cos(a * Math.PI / 8) * rr, Math.sin(a * Math.PI / 8) * rr); g.drawImage(src, 0, 0); return c; };
      // sand: the sand that shows; caster: what throws the shadow onto it (all of the rest, or only the streets later)
      const lipWith = (sand, caster) => { const out = cv(), og = out.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, W, H); og.globalCompositeOperation = 'destination-out'; og.drawImage(sand, 0, 0);
        const src = caster || out, sh = cv(), sg = sh.getContext('2d'); sg.filter = 'blur(' + (5 * K) + 'px)'; sg.drawImage(src, 0, 3 * K); sg.filter = 'none'; sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(0,0,0,.55)'; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = 'destination-in'; sg.drawImage(sand, 0, 0); if (!GEN.noShadows) ctx.drawImage(sh, 0, 0);
        for (const [r, col] of [[7, '#3a3f48'], [5.5, '#5d636d'], [1.6, '#9aa2ad']]) { const c = grow(sand, r * K), g = c.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(caster || out, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, W, H); ctx.drawImage(c, 0, 0); if (cityEdgeMask) cityEdgeMask.getContext('2d').drawImage(c, 0, 0); } };
      // Round 479: the lip runs only round what shows: beach (sand and sea) under a street is left out, or the sea a coastal
      // street covers got a lip drawn round it, out into the block
      const shown = (() => { const c = cv(), g = c.getContext('2d'); g.drawImage(beach, 0, 0); if (GEN.worldLots) { const wl2 = genWorld(chronoSeed()), [qx2, qy2] = GEN.world(key); g.globalCompositeOperation = 'destination-out';
        // Round 489: the road exactly as it will be drawn (the grid road leaves out a stub only one cell deep), so no street cell
        // the road doesn't paint is cut out of the sand and left showing bare paving framed by the lip
        if (GEN.gridKerb) { const x0g = qx2 * FG_COLS, y0g = qy2 * FG_ROWS, fn = (X, Y) => X >= 0 && Y >= 0 && X < wl2.CW && Y < wl2.CH && wl2.cell[Y * wl2.CW + X] === 2 && (X < x0g || Y < y0g || X >= x0g + FG_COLS || Y >= y0g + FG_ROWS || !!plan.floor[(Y - y0g) * FG_COLS + X - x0g]);
          const fn2 = (X, Y) => fn(X, Y) && roadDrawnCell(X, Y);
          g.drawImage(cityGridRoad(fn2, x0g, y0g, FG_COLS, FG_ROWS, FG_CELL, GEN.gridR || 12, K, W, H), 0, 0); }
        else for (let cy = 0; cy < FG_ROWS; cy++) for (let cx = 0; cx < FG_COLS; cx++) if (wl2.cell[(qy2 * FG_ROWS + cy) * wl2.CW + qx2 * FG_COLS + cx] === 2 && plan.floor[cy * FG_COLS + cx]) g.fillRect(cx * FG_CELL * K, cy * FG_CELL * K, FG_CELL * K, FG_CELL * K); } return c; })();
      lipWith(shown, null);
      // (the streets are drawn later, over the sand where they reach it: their edge against the sand gets the same lip, on the street's side)
      coastBeachMask = beach; coastLipDraw = road => { const sand = cv(), sg = sand.getContext('2d'); sg.drawImage(shown, 0, 0); /* (Round 479: only the beach that shows) */ sg.globalCompositeOperation = 'destination-out'; sg.drawImage(road, 0, 0); lipWith(sand, road); return grow(sand, 10 * K); }; }
    else if (shoreArt) cityEdgeAlong(ctx, beach, 0, 0, K, shoreArt, 18, wx0, wy0); else { ring(chronoTint(beach, '#0b0e14'), 3); }
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
  const floorShape = drawFloor(0);
  if (!GEN.square) { // close hairline gaps where two shapes pass within a few pixels of each other
    const copy = document.createElement('canvas'); copy.width = W; copy.height = H; copy.getContext('2d').drawImage(floorShape, 0, 0);
    const g = floorShape.getContext('2d'); for (let a = 0; a < 8; a++) g.drawImage(copy, Math.round(Math.cos(a * Math.PI / 4) * 5), Math.round(Math.sin(a * Math.PI / 4) * 5)); }
  // Owner: "round the curb corners more": the road's inside corners turn on an arc too (and the pavement's on the same centre, an arc narrower).
  const gridRoad = GEN.gridKerb && GEN.worldLots ? (() => { const wl = genWorld(chronoSeed()), [qx, qy] = GEN.world(key), x0g = qx * FG_COLS, y0g = qy * FG_ROWS, fn = (X, Y) => X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH && wl.cell[Y * wl.CW + X] === 2 && (X < x0g || Y < y0g || X >= x0g + FG_COLS || Y >= y0g + FG_ROWS || !!plan.floor[(Y - y0g) * FG_COLS + X - x0g]); /* (in the room, only where its plan lays road: a stub the plan trims stays trimmed) */ return { fn, x0: qx * FG_COLS, y0: qy * FG_ROWS, ox: qx * 800, oy: qy * 500 }; })() : null;
  const vecShape = GEN.square ? closed(floorShape, GEN.cornerR || GEN.pavement + 30) : floorShape;
  if (gridRoad) { const d = vecShape.getContext('2d').getImageData(0, 0, W, H).data, base = gridRoad.fn; // (in the room, a cell is road only where the plan's own drawing has road at its middle)
    gridRoad.fn = (X, Y) => { const cx = X - gridRoad.x0, cy = Y - gridRoad.y0; if (cx < 0 || cy < 0 || cx >= FG_COLS || cy >= FG_ROWS) return base(X, Y); return base(X, Y) && d[(Math.round((cy + 0.5) * FG_CELL * K) * W + Math.round((cx + 0.5) * FG_CELL * K)) * 4 + 3] > 127; }; }
  const f = { shape: gridRoad ? cityGridRoad(gridRoad.fn, gridRoad.x0, gridRoad.y0, FG_COLS, FG_ROWS, FG_CELL, GEN.gridR || 12, K, W, H) : vecShape, /* Round 445: the city's street corners turn on one modest radius (GEN.cornerR); 64px made lopsided flares where roads of different widths met */ art: document.createElement('canvas') }; f.art.width = W; f.art.height = H;
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
    const curbArt = GEN.topdown && (CITY_TD_ART.curb || []).map(n => imgs[cityArtPath('curb', n)]).find(i => i && i.naturalWidth);
    if (GEN.topdown && !curbArt) { ring(chronoTint(f.shape, '#05070c'), 4); ring(chronoTint(f.shape, '#3c4450'), 2); }
    rg.globalCompositeOperation = 'source-in';
    // Round 430 (owner: "road texture should all just be one, the road-wet one is good for now, lets try not to mix any
    // textures unless we have a border in between"): the city's roads and alleys are one texture, with no patches
    if (GEN.topdown) fill(rg, imgs['road-wet']); else { fill(rg, imgs.floor); rg.globalCompositeOperation = 'source-over'; for (const mix of (GEN.mix || []).filter(m => m.on === 'road')) mixInto(rg, rm, mix); }
    if (false) { // Round 423 (owner: "roof-gravel can be changed to road texture"): alleys are gravel
      const am = document.createElement('canvas'); am.width = W; am.height = H; const ag = am.getContext('2d'); ag.fillStyle = ag.strokeStyle = '#fff'; ag.lineCap = 'butt';
      for (const sh of plan.shapes) { if (sh.pave || sh.main !== false) continue;
        if (sh.t === 'rect') ag.fillRect(sh.x * K, sh.y * K, sh.w * K, sh.h * K);
        else if (sh.t === 'poly') { ag.beginPath(); sh.pts.forEach(([x, y], i) => i ? ag.lineTo(x * K, y * K) : ag.moveTo(x * K, y * K)); ag.closePath(); ag.fill(); }
        else { ag.lineWidth = sh.w * K; ag.beginPath(); sh.pts.forEach(([x, y], i) => i ? ag.lineTo(x * K, y * K) : ag.moveTo(x * K, y * K)); ag.stroke(); } }
      // a main road's own shapes are drawn back on top, so where an alley meets one the asphalt runs through
      ag.globalCompositeOperation = 'destination-out';
      for (const sh of plan.shapes) { if (sh.pave || sh.main === false) continue;
        if (sh.t === 'rect') ag.fillRect(sh.x * K, sh.y * K, sh.w * K, sh.h * K);
        else if (sh.t === 'poly') { const xs = sh.pts.map(q => q[0]), ys = sh.pts.map(q => q[1]); ag.fillRect(Math.min(...xs) * K, Math.min(...ys) * K, (Math.max(...xs) - Math.min(...xs)) * K, (Math.max(...ys) - Math.min(...ys)) * K); }
        else { ag.lineWidth = sh.w * K; ag.beginPath(); sh.pts.forEach(([x, y], i) => i ? ag.lineTo(x * K, y * K) : ag.moveTo(x * K, y * K)); ag.stroke(); } }
      ag.globalCompositeOperation = 'destination-in'; ag.drawImage(rm, 0, 0); ag.globalCompositeOperation = 'source-in'; fill(ag, imgs.gravel);
      rg.globalCompositeOperation = 'source-atop'; rg.drawImage(am, 0, 0); }
    if (GEN.topdown) { rg.globalCompositeOperation = 'source-atop'; rg.fillStyle = GEN.roadDim || 'rgba(4,6,12,.56)'; rg.fillRect(0, 0, W, H); }
    ctx.drawImage(rm, 0, 0);
    if (GEN.topdown) { // Round 447 (owner: "what you did with the water is great, can you similarly improve other textures and edges?"):
      // a road has depth like the water: a dark, damp gutter along both kerbs fading toward the crown of the road
      const inv0 = document.createElement('canvas'); inv0.width = W; inv0.height = H; const i0 = inv0.getContext('2d'); i0.fillStyle = '#fff'; i0.fillRect(0, 0, W, H); i0.globalCompositeOperation = 'destination-out'; i0.drawImage(f.shape, 0, 0);
      const band = blurred(inv0, 9 * K), bg2 = band.getContext('2d'); bg2.globalCompositeOperation = 'destination-in'; bg2.drawImage(f.shape, 0, 0); bg2.globalCompositeOperation = 'source-in'; bg2.fillStyle = '#01030a'; bg2.fillRect(0, 0, W, H);
      if (!GEN.noShadows) { ctx.save(); ctx.globalAlpha = 0.75; ctx.drawImage(band, 0, 0); ctx.restore(); } }
    if (curbArt) { // Round 420: the curb, a kerb-stone strip along every road edge, on the sidewalk side (the road mask turned inside out)
      const inv = document.createElement('canvas'); inv.width = W; inv.height = H; const ig = inv.getContext('2d'); ig.fillStyle = '#fff'; ig.fillRect(0, 0, W, H); ig.globalCompositeOperation = 'destination-out'; ig.drawImage(f.shape, 0, 0);
      const [cwx, cwy] = GEN.world(key);
      if (gridRoad) for (const cx2 of [ctx, cityEdgeMask && cityEdgeMask.getContext('2d')]) if (cx2) cityGridKerb(cx2, gridRoad.fn, gridRoad.x0, gridRoad.y0, FG_COLS, FG_ROWS, FG_CELL, GEN.gridR || 12, K, curbArt, 7, gridRoad.ox, gridRoad.oy); // Round 463 trial: the bitmasked kerb, centred on the road's edge, on sand too
      else if (coastBeachMask) { // Round 461 (owner: "need to fix these edges too"): no kerb strip on the sand where a street meets the beach; the beach's concrete lip runs along the street there instead
        const cl = document.createElement('canvas'); cl.width = W; cl.height = H; const cg = cl.getContext('2d'); cityEdgeAlong(cg, inv, 0, 0, K, curbArt, 7, cwx, cwy);
        const near = coastLipDraw(f.shape); cg.globalCompositeOperation = 'destination-out'; cg.drawImage(near, 0, 0); ctx.drawImage(cl, 0, 0); } // Round 462 (owner: "you put an edge over an edge"): the kerb stops where the lip begins, never on it or across it
      else cityEdgeAlong(ctx, inv, 0, 0, K, curbArt, 7, cwx, cwy); }
    if (GEN.topdown) { // Round 420 (owner: "add lanes to the road paths"): a dashed centre line down each main road (two lanes), stopping at the crossings
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
      for (const sh of plan.shapes) if (sh.t === 'poly' && !sh.pave) { const xs = sh.pts.map(q => q[0]), ys = sh.pts.map(q => q[1]); ctx.rect(Math.max(...xs) * K + 10 * K, (Math.min(...ys) - 10) * K, -(Math.max(...xs) - Math.min(...xs) + 20) * K, (Math.max(...ys) - Math.min(...ys) + 20) * K); }
      ctx.clip('evenodd'); ctx.strokeStyle = GEN.noLanes ? 'rgba(0,0,0,0)' /* Round 485: sand tracks have no lane markings */ : 'rgba(232,226,196,.55)'; ctx.lineWidth = 2.5 * K; ctx.setLineDash([16 * K, 14 * K]); ctx.lineCap = 'butt';
      for (const sh of plan.shapes) { if (sh.t !== 'road' || sh.pave || sh.w < 90) continue; ctx.beginPath(); sh.pts.forEach(([x, y], i) => i ? ctx.lineTo(x * K, y * K) : ctx.moveTo(x * K, y * K)); ctx.stroke(); }
      // the door stubs carry the line to the room's edge
      for (const sh of plan.shapes) { if (sh.t !== 'rect' || sh.pave || sh.main === false || Math.max(sh.w, sh.h) < 90) continue; ctx.beginPath(); if (sh.x <= 0 || sh.x + sh.w >= 800) { /* an east or west door: the line runs across */ ctx.moveTo(sh.x * K, (sh.y + sh.h / 2) * K); ctx.lineTo((sh.x + sh.w) * K, (sh.y + sh.h / 2) * K); } else { ctx.moveTo((sh.x + sh.w / 2) * K, sh.y * K); ctx.lineTo((sh.x + sh.w / 2) * K, (sh.y + sh.h) * K); } ctx.stroke(); }
      ctx.restore(); }
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
    if (p.kind === 'lamp') { const lg = ctx.createRadialGradient(p.x * K, (p.y - p.h * 0.78) * K, 2, p.x * K, (p.y - p.h * 0.78) * K, 70 * K); lg.addColorStop(0, 'rgba(' + GEN.lamp + ',' + (GEN.lampGlow != null ? GEN.lampGlow : .38) + ')'); lg.addColorStop(1, 'rgba(' + GEN.lamp + ',0)'); ctx.fillStyle = lg; ctx.fillRect((p.x - 70) * K, (p.y - p.h * 0.78 - 70) * K, 140 * K, 140 * K); }
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
