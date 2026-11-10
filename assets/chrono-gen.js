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
const CHRONO_GEN_VERSION = 2, CHRONO_ART_VERSION = '378';
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
  const v = (ix, iy) => chronoHash(seed + ':' + tag + ':' + ix + ',' + iy) / 4294967296;
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
const CHRONO_W = 6, CHRONO_H = 9, CHRONO_LEVELS = [46, 54];
const CHRONO_NAME_A = ['Brass', 'Hourglass', 'Pendulum', 'Gear', 'Cog', 'Tick', 'Escapement', 'Sundial', 'Clockwork', 'Mainspring', 'Chime', 'Copper', 'Second', 'Minute', 'Ratchet', 'Balance', 'Bronze', 'Orrery'];
const CHRONO_NAME_B = ['Stair', 'Gallery', 'Landing', 'Walk', 'Hall', 'Works', 'Loft', 'Bridge', 'Vault', 'Ring', 'Shaft', 'Spiral', 'Arcade', 'Court', 'Lift', 'Ledge', 'Chamber', 'Steps'];
const CHRONO_ROLE_NAMES = { start: 'Chronospire Gate', boss: 'The Last Second', mini1: 'Clockwarden\'s Loft', mini2: 'Paradox Stair', boss1: 'Mainspring Foundry', boss2: 'The Hollow Hour',
  breaker1: 'Gatehouse Breaker', breaker2: 'Foundry Breaker', breaker3: 'Paradox Breaker' };
function chronoGraphTry(seed) {
  const rnd = chronoRng(seed), K = (x, y) => x + ',' + y, xy = k => k.split(',').map(Number);
  const near = k => { const [x, y] = xy(k); return [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']].filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < CHRONO_W && y + dy < CHRONO_H).map(([dx, dy, d]) => [K(x + dx, y + dy), d]); };
  const start = K(Math.floor(rnd() * CHRONO_W), Math.floor(rnd() * CHRONO_H)), parent = { [start]: null }, order = [start], active = [start];
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
  // The first Nexus Waypoint: an ordinary Gate-wing room about three steps in.
  const way = order.filter(k => wing[k] === 'G' && !taken.has(k) && Object.keys(layout[k].exits).length > 1).sort((a, b) => Math.abs(depth[a] - 3) - Math.abs(depth[b] - 3) || (a < b ? -1 : 1))[0];
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
}
// One room's grids: floor (walkable), sand, its hub and squares. Props are added when the room is first painted.
function chronoRoomPlan(seed, key) {
  const lay = TILE_WORLD_DATA.chronospire.layout[key], roles = TILE_WORLD_DATA.chronospire.roles, rnd = chronoRng(seed + ':room:' + key);
  const floor = new Uint8Array(CG_COLS * CG_ROWS), sand = new Uint8Array(CG_COLS * CG_ROWS);
  const carve = (x0, y0, x1, y1) => { for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(CG_ROWS - 1, Math.max(y0, y1)); y++) for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(CG_COLS - 1, Math.max(x0, x1)); x++) floor[y * CG_COLS + x] = 1; };
  const at = (x, y) => x >= 0 && y >= 0 && x < CG_COLS && y < CG_ROWS && floor[y * CG_COLS + x] === 1;
  // The hub's top-left cell (2x2). Rooms the game drops you into at the room's middle (the world's first room and the
  // Nexus Waypoint rooms) have their hub there, with a court around it.
  const landing = chronoLandingRooms().includes(key);
  const hx = landing ? 7 : 5 + Math.floor(rnd() * 5), hy = landing ? 5 : 3 + Math.floor(rnd() * 3);
  carve(hx, hy, hx + 1, hy + 1); if (landing) carve(hx - 1, hy - 1, hx + 2, hy + 2);
  const dirs = Object.keys(lay.exits).filter(d => d.length === 1).sort();
  for (const d of dirs) {
    const c = chronoDoorCell(seed, key, d), bend = rnd() < 0.45;
    if (d === 'w' || d === 'e') {
      const edge = d === 'w' ? 0 : CG_COLS - 1;
      // Straight in to the hub's columns then along them, or with a bend at a column in between.
      const mx = bend ? (d === 'w' ? 2 + Math.floor(rnd() * Math.max(1, hx - 3)) : hx + 3 + Math.floor(rnd() * Math.max(1, CG_COLS - 4 - (hx + 3)))) : hx;
      const col = Math.max(1, Math.min(CG_COLS - 3, mx));
      carve(edge, c, col + (d === 'w' ? 1 : 0), c + 1); carve(col, c, col + 1, hy + 1); carve(col, c < hy ? hy : hy, col + 1, hy + 1); carve(col, hy, hx + 1, hy + 1);
    } else {
      const edge = d === 'n' ? 0 : CG_ROWS - 1;
      const my = bend ? (d === 'n' ? 1 + Math.floor(rnd() * Math.max(1, hy - 1)) : hy + 2 + Math.floor(rnd() * Math.max(1, CG_ROWS - 3 - (hy + 2)))) : hy;
      const row = Math.max(1, Math.min(CG_ROWS - 3, my));
      carve(c, edge, c + 1, row + (d === 'n' ? 1 : 0)); carve(c, row, hx + 1, row + 1); carve(hx, row, hx + 1, hy + 1);
    }
  }
  const boss = [roles.boss, roles.boss1, roles.boss2, roles.mini1, roles.mini2].includes(key);
  if (boss) carve(Math.max(1, hx - 2), Math.max(1, hy - 1), Math.min(CG_COLS - 2, hx + 3), Math.min(CG_ROWS - 2, hy + 2)); // an arena
  else if (dirs.length === 1) carve(hx - 1, hy - 1, hx + 2, hy + 2); // a dead end's court
  // Squares: 3x3 blocks of open ground with one side on a road, one cell in from the room's edge.
  const plazas = [];
  // Strict first (exactly one side on a road), then any block that touches a road, so every room has somewhere to stand an object.
  for (const loose of [false, true, 'any']) { // 'any': a crowded room widens a road into its square
    if (plazas.length >= (loose === 'any' ? 1 : 2)) break;
    const cand = [];
    for (let py = 1; py + 2 <= CG_ROWS - 2; py++) for (let px = 1; px + 2 <= CG_COLS - 2; px++) {
      let clear = true; for (let y = py; y <= py + 2 && clear; y++) for (let x = px; x <= px + 2; x++) if (at(x, y)) { clear = false; break; }
      let over = 0; if (loose === 'any') { for (let y = py; y <= py + 2; y++) for (let x = px; x <= px + 2; x++) if (at(x, y)) over++; if (over > 4) continue; } else if (!clear) continue;
      const sides = [[0, -1], [0, 3], [-1, 0], [3, 0]].map(([dx, dy], i) => { let n = 0; for (let k = 0; k < 3; k++) if (i < 2 ? at(px + k, py + dy) : at(px + dx, py + k)) n++; return n; });
      const total = sides.reduce((a, b) => a + b, 0);
      if (loose === 'any' ? total + over < 1 : loose ? total < 1 : (sides.filter(n => n >= 2).length !== 1 || total > 4)) continue;
      const x = (px + 1.5) * CG_CELL, y = (py + 1.5) * CG_CELL - 22; // the spot whose foot point is the square's centre
      // Never under the HUD panel or the minimap (an object may be nudged up to 32px within its square).
      const covered = typeof screenCovered === 'function' && [[0, 0], [-40, -40], [40, -40], [-40, 40], [40, 40]].some(([dx, dy]) => screenCovered(x + dx, y + dy));
      if (covered && loose !== 'any') continue;
      cand.push({ px, py, x, y, s: rnd() + over * 3 + (covered ? 2 : 0) });
    }
    cand.sort((a, b) => a.s - b.s);
    for (const gap of [5, 4]) for (const c of cand) { // well apart first, then a cell's gap between them
      if (plazas.length >= 2) break;
      if (plazas.some(p => Math.abs(p.px - c.px) < gap && Math.abs(p.py - c.py) < gap)) continue;
      plazas.push(c);
    }
  }
  for (const p of plazas) carve(p.px, p.py, p.px + 2, p.py + 2);
  // Sand drifts: up to two blobs of open ground, a cell clear of every road and of the room's edge.
  const free = (x, y) => { if (x < 1 || y < 1 || x > CG_COLS - 2 || y > CG_ROWS - 2) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) return false; return true; };
  for (let b = 0, blobs = Math.floor(rnd() * 3); b < blobs; b++) {
    const open = []; for (let y = 1; y < CG_ROWS - 1; y++) for (let x = 1; x < CG_COLS - 1; x++) if (free(x, y) && !sand[y * CG_COLS + x]) open.push([x, y]);
    if (!open.length) break;
    const cells = [open[Math.floor(rnd() * open.length)]], want = 4 + Math.floor(rnd() * 9);
    sand[cells[0][1] * CG_COLS + cells[0][0]] = 1;
    for (let tries = 0; cells.length < want && tries < 80; tries++) {
      const [x, y] = cells[Math.floor(rnd() * cells.length)], [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
      if (free(x + dx, y + dy) && !sand[(y + dy) * CG_COLS + x + dx]) { sand[(y + dy) * CG_COLS + x + dx] = 1; cells.push([x + dx, y + dy]); }
    }
  }
  // Sand never lies in a chasm.
  { const t = chronoTerrain(seed, key); for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (sand[y * CG_COLS + x] && t.chasm(x, y)) sand[y * CG_COLS + x] = 0; }
  const courts = []; if (boss || landing || dirs.length === 1) courts.push([(hx + 1) * CG_CELL, (hy + 1) * CG_CELL, boss ? 170 : 150]);
  for (const p of plazas) if (rnd() < 0.25) courts.push([(p.px + 1.5) * CG_CELL, (p.py + 1.5) * CG_CELL, 120]);
  return { key, floor, sand, inlays: courts.map(([x, y, size], i) => ({ name: CHRONO_INLAYS[(chronoHash(seed + ':inlay:' + key) + i) % CHRONO_INLAYS.length], x, y, size })), hub: [(hx + 1) * CG_CELL, (hy + 1) * CG_CELL - 22], plazas: plazas.map(p => [p.x, p.y]), props: null };
}
// Buildings and small props on the open ground: the whole picture clear of roads, squares and each other.
function chronoRoomProps(seed, plan) {
  if (plan.props) return plan.props;
  const rnd = chronoRng(seed + ':props:' + plan.key), out = [], terrain = chronoTerrain(seed, plan.key);
  const chasm = new Uint8Array(CG_COLS * CG_ROWS); for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (terrain.chasm(x, y)) chasm[y * CG_COLS + x] = 1;
  const blocked = (x0, y0, x1, y1, grid) => { for (let cy = Math.max(0, Math.floor(y0 / CG_CELL)); cy <= Math.min(CG_ROWS - 1, Math.floor(y1 / CG_CELL)); cy++) for (let cx = Math.max(0, Math.floor(x0 / CG_CELL)); cx <= Math.min(CG_COLS - 1, Math.floor(x1 / CG_CELL)); cx++) if (grid[cy * CG_COLS + cx]) return true; return false; };
  const place = (table, kind, want, tries) => {
    const names = Object.keys(table); let made = 0;
    for (let t = 0; t < tries && made < want; t++) {
      const name = names[Math.floor(rnd() * names.length)], [iw, ih] = table[name], w = iw * CHRONO_PROP_SCALE[kind], h = ih * CHRONO_PROP_SCALE[kind];
      const x = w / 2 + 6 + rnd() * (800 - w - 12), y = h + 6 + rnd() * (500 - h - 12);
      const box = [x - w / 2 + 6, y - h + 8, x + w / 2 - 6, y - 2];
      if (blocked(box[0], box[1], box[2], box[3], plan.floor)) continue;
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
  chronoApplyGraph(chronoGraph(seed));
  chronoPlans = {}; chronoPlazaTable = {};
  for (const key of Object.keys(d.layout)) { const p = chronoPlans[key] = chronoRoomPlan(seed, key); if (p.plazas.length) chronoPlazaTable[key] = p.plazas; }
  const bits = new Uint8Array(w.maskW * w.maskH);
  for (let my = 0; my < w.maskH; my++) {
    const wy = my * w.cell + w.cell / 2, cy = Math.floor(wy / 500), gy = Math.floor((wy - cy * 500) / CG_CELL);
    for (let mx = 0; mx < w.maskW; mx++) {
      const wx = mx * w.cell + w.cell / 2, cx = Math.floor(wx / 800), p = chronoPlans[cx + ',' + cy];
      if (p && p.floor[gy * CG_COLS + Math.floor((wx - cx * 800) / CG_CELL)]) bits[my * w.maskW + mx] = 1;
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
  const f = layer(plan.floor, imgs.floor, 18);
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
