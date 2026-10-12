'use strict';
// =====================================================================
// Round 88: organic paths. A joined district can be painted as one free-form
// landscape whose winding paths are traced into a walk mask
// (tools/build_organic_area.py). Inside such a district:
//   - you can only walk on the traced paths,
//   - each exit to a neighbouring room sits wherever a path meets that edge
//     of the room (its "door"), with the exit label drawn there,
//   - you arrive at that door when you come in,
//   - patrols, chests and points of interest are moved onto the paths.
// Districts without an entry in ORGANIC_AREAS are untouched.
// =====================================================================
const ORGANIC_MASK_W = 400, ORGANIC_MASK_H = 250; // 4px cells over a 1600x1000 (2x2) district
// region:art -> { src, mask } (mask: base64 bit-packed rows, MSB first). Filled by
// tools/build_organic_area.py; empty until a fitted painting is supplied.
const ORGANIC_AREAS = {};
const organicBits = {};
function organicDef(key) {
  if (!rooms[key] || typeof joinedArea !== 'function') return null;
  const area = joinedArea(key), def = rooms[key].world && ORGANIC_AREAS['world:' + activeRegion] || area.art && ORGANIC_AREAS[activeRegion + ':' + area.art];
  return def ? { def, area } : null;
}
function organicMask(def) {
  if (organicBits[def.src]) return organicBits[def.src];
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', src = def.mask.replace(/=+$/, '');
  const bits = new Uint8Array(ORGANIC_MASK_W * ORGANIC_MASK_H);
  for (let i = 0; i < bits.length; i++) bits[i] = (abc.indexOf(src[Math.floor(i / 6)]) >> (5 - i % 6)) & 1;
  return organicBits[def.src] = bits;
}
// Area-pixel lookup (the area is scaled onto the 400x250 mask).
function organicAt(o, ax, ay) {
  if (o.def.at) return o.def.at(o, ax, ay); // a world map supplies its own lookup (Round 91)
  const mx = Math.floor(ax / o.area.width * ORGANIC_MASK_W), my = Math.floor(ay / o.area.height * ORGANIC_MASK_H);
  if (mx < 0 || my < 0 || mx >= ORGANIC_MASK_W || my >= ORGANIC_MASK_H) return false;
  return organicMask(o.def)[my * ORGANIC_MASK_W + mx] === 1;
}
function organicWalk(key, x, y) {
  const o = organicDef(key); if (!o) return null;
  const off = cellOffset(key, o.area);
  return organicAt(o, off.x + Math.max(0, Math.min(799, x)), off.y + Math.max(0, Math.min(499, y + 22)));
}
// --- Doors: where a path meets the room edge for an exit leaving the district.
// Searched along the district's outer edge in area coordinates. Each door
// looks along its own room's stretch of that edge first, and may reach up to
// DOOR_REACH px into a neighbouring room of the same district (when that room
// has no exit of its own on that side), so a painted path that leaves right on
// the line between two rooms still works. Door positions are given in the
// owning room's local coordinates and may lie just outside 0..800 / 0..500.
const DOOR_REACH = 220;
const organicDoorCache = {}, organicDoorsCache = {};
// All labelled crossings on one side of a room for a given patch of street.
function organicDoors(key, dir, pocket = 0) { const d = organicDoor(key, dir, pocket); const ck = activeRegion + ':' + key + ':' + dir + ':' + pocket; return organicDoorsCache[ck] || (d ? [d] : []); }
function organicAreaWalk(o, ax, ay) { return organicAt(o, Math.max(0, Math.min(o.area.width - 1, ax)), Math.max(0, Math.min(o.area.height - 1, ay))); }
function organicDoor(key, dir, pocket = 0, checkLanding = true) {
  const o = organicDef(key); if (!o) return null;
  const ck = activeRegion + ':' + key + ':' + dir + ':' + pocket + (checkLanding ? '' : ':raw'); if (ck in organicDoorCache) return organicDoorCache[ck];
  const area = o.area, off = cellOffset(key, area), horiz = dir === 'e' || dir === 'w';
  const span = horiz ? 500 : 800, base = horiz ? off.y : off.x, areaLen = horiz ? area.height : area.width;
  // How far the search may spill into each neighbour along the edge.
  const [kx, ky] = key.split(',').map(Number), step = horiz ? [0, 1] : [1, 0];
  const reach = sgn => { const n = (kx + step[0] * sgn) + ',' + (ky + step[1] * sgn); return area.cells.includes(n) && !organicExternalExit(n, dir) ? DOOR_REACH : 0; };
  const lo = Math.max(0, base - reach(-1)), hi = Math.min(areaLen, base + span + reach(1));
  // Foot positions the player can actually stand on next to each edge (Round 92).
  const edgeCoord = dir === 'w' ? 14 : dir === 'e' ? area.width - 14 : dir === 'n' ? 34 : area.height - 6;
  const runs = []; let start = null;
  for (let t = lo; t <= hi; t += 4) {
    // ...and where you land on the far side of a painted-world edge (see neonLanding).
    const outside = dir === 'w' ? -14 : dir === 'e' ? area.width + 14 : dir === 'n' ? -1 : area.height + 36;
    // On a continuous world map a door must also be street on the far side of the edge.
    const open = t < hi && (horiz ? organicAreaWalk(o, edgeCoord, t) : organicAreaWalk(o, t, edgeCoord))
      && (!o.def.world || (horiz ? o.def.at(o, outside, t) : o.def.at(o, t, outside)));
    if (open && start === null) start = t;
    if (!open && start !== null) { runs.push([start, t]); start = null; }
  }
  // Prefer the run that overlaps this room's own stretch most, then the widest.
  const own = r => Math.max(0, Math.min(r[1], base + span) - Math.max(r[0], base));
  runs.sort((a, b) => own(b) - own(a) || (b[1] - b[0]) - (a[1] - a[0]));
  const doorFor = r => {
    const cA = (r[0] + r[1]) / 2, c = cA - base, half = Math.max(24, (r[1] - r[0]) / 2);
    const edge = horiz ? { x: dir === 'w' ? 14 : 786, y: c } : { x: c, y: dir === 'n' ? 14 : 486 };
    // Step inward along the path until clear of the edge trigger (area walk, foot point).
    let inward = null;
    for (let d = 40; d < 200 && !inward; d += 6) {
      const lx = horiz ? (dir === 'w' ? d : 800 - d) : c, ly = horiz ? c : (dir === 'n' ? d : 500 - d);
      if (organicAreaWalk(o, off.x + lx, off.y + ly)) inward = { x: lx, y: ly - 22 };
    }
    return { edge, inward: inward || { x: edge.x, y: edge.y - 22 }, half, along: c };
  };
  // Wide enough to use, and centred where the player can actually stand (head 14..486 / 14..786).
  // Clip each run to where the player can actually stand (head 14..486 / x 14..786); keep it if 8px+ remain.
  const lo2 = base + (horiz ? 36 : 14), hi2 = base + (horiz ? 508 : 786);
  const usable = runs.map(r => area.cells.length > 1 ? r : [Math.max(r[0], lo2), Math.min(r[1], hi2)]).filter(r => r[1] - r[0] >= (area.cells.length > 1 ? 12 : 8));
  if (!usable.length) return organicDoorCache[ck] = null;
  // Round 92: in a single painted room, prefer a street that joins the room's
  // main walkable area, so the exit label is never on a stub you can't reach.
  if (area.cells.length === 1) {
    const pockets = organicPockets(key), want = pockets[pocket] || pockets[0] || new Set();
    let mine = usable.map(doorFor).filter(d => organicPocketNear(key, d.inward) === pocket || (pocket === 0 && want.has(organicGridKey(d.inward))));
    // On the painted world, only crossings that land you somewhere useful on the far side.
    const raw = rooms[key].exits[dir], to = raw && (typeof raw === 'string' ? raw : raw.to);
    if (checkLanding && o.def.world && to && typeof neonLanding === 'function') mine = mine.filter(d => neonLanding(to, neonMirror(dir, { x: d.edge.x, y: d.edge.y - 22 }), dir));
    // Every separate street crossing this side from here (Round 92), at least 150px apart.
    const all = []; for (const d of mine) if (all.every(e => Math.abs(e.along - d.along) >= 150)) all.push({ ...d, inPocket: true });
    organicDoorsCache[ck] = all;
    const good = mine[0];
    if (good) return organicDoorCache[ck] = { ...good, inPocket: true };
    return organicDoorCache[ck] = { ...doorFor(usable[0]), inPocket: false };
  }
  return organicDoorCache[ck] = doorFor(usable[0]);
}
// Put a position given in some room's local coordinates into the room of the
// district that actually contains it.
function organicNormalize(key, pos) {
  const o = organicDef(key); if (!o) return { key, pos };
  const off = cellOffset(key, o.area), ax = off.x + pos.x, ay = off.y + pos.y;
  const cell = o.area.cells.find(c => { const q = cellOffset(c, o.area); return ax >= q.x && ax < q.x + 800 && ay >= q.y && ay < q.y + 500; }) || key;
  const q = cellOffset(cell, o.area); return { key: cell, pos: { x: ax - q.x, y: ay - q.y } };
}
function organicExternalExit(key, dir) {
  const raw = rooms[key] && rooms[key].exits[dir]; if (!raw) return null;
  const to = typeof raw === 'string' ? raw : raw.to, o = organicDef(key);
  return o && !o.area.cells.includes(to) ? raw : null;
}
// --- Collision
const blockedBeforeOrganic = NeonCity.blocked;
NeonCity.blocked = function (key, x, y) { const w = organicWalk(key, x, y); return w === null ? blockedBeforeOrganic(key, x, y) : !w; };
const walkableBeforeOrganic = walkable;
walkable = function (key, x, y, margin) {
  // Round 92: only where room movement can actually stand (it clamps to a 12px margin).
  const od = organicDef(key);
  if (od) return (od.area.cells.length > 1 ? x >= 0 && x <= 800 && y >= 0 && y <= 500 : x >= 12 && x <= 788 && y >= 12 && y <= 488) && !NeonCity.blocked(key, x, y); // paths are the walkable area; no body margin
  return walkableBeforeOrganic(key, x, y, margin);
};
// --- Leaving and arriving through doors
const moveBeforeOrganic = move;
move = function (dt) {
  moveBeforeOrganic(dt);
  if (!state || state.battle || !organicDef(state.room)) return;
  const o = organicDef(state.room), here = cellOffset(state.room, o.area), ax = here.x + state.pos.x, ay = here.y + state.pos.y + 22;
  const near = { w: ax <= 16, e: ax >= o.area.width - 16, n: ay - 22 <= 16, s: ay - 22 >= o.area.height - 16 };
  for (const cell of o.area.cells) for (const dir of ['n', 's', 'e', 'w']) {
    if (!near[dir] || !organicExternalExit(cell, dir)) continue;
    if (typeof keys === 'object' && keys && !({ n: keys.ArrowUp || keys.w, s: keys.ArrowDown || keys.s, e: keys.ArrowRight || keys.d, w: keys.ArrowLeft || keys.a })[dir]) continue; // only while heading that way
    const door = organicDoor(cell, dir); if (!door) continue;
    const q = cellOffset(cell, o.area), along = dir === 'e' || dir === 'w' ? ay - q.y : ax - q.x;
    if (Math.abs(along - door.along) <= door.half + 20) {
      // Leave from the room that owns this door.
      state.room = cell; state.pos = { x: ax - q.x, y: ay - 22 - q.y }; transition(dir); return;
    }
  }
};
const transitionBeforeOrganic = transition;
transition = function (dir) {
  const from = state.room, ok = transitionBeforeOrganic(dir);
  if (ok && state.room !== from && organicDef(state.room) && !(organicDef(from) && organicDef(from).area.cells.includes(state.room))) {
    const opp = { n: 's', s: 'n', e: 'w', w: 'e' }[dir], door = organicDoor(state.room, opp);
    if (door) {
      const n = organicNormalize(state.room, door.inward);
      state.room = n.key; state.pos = n.pos; if (!state.visited.includes(n.key)) state.visited.push(n.key);
      save(); renderWorld();
    }
  }
  return ok;
};
// --- Painting: the whole landscape, unstretched per band.
const paintJoinedAreaBeforeOrganic = paintJoinedArea;
paintJoinedArea = function (canvas, area, texture) {
  if (!ORGANIC_AREAS[activeRegion + ':' + area.art]) return paintJoinedAreaBeforeOrganic(canvas, area, texture);
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(texture, 0, 0, texture.naturalWidth, texture.naturalHeight, 0, 0, area.width, area.height);
};
// --- Exit labels sit at the doors.
const renderBeforeOrganic = NeonCity.render;
NeonCity.render = function (container, key, r) {
  const out = renderBeforeOrganic.apply(this, arguments);
  if (!organicDef(key) || !container || !container.querySelectorAll) return out;
  for (const node of container.querySelectorAll('.city-exit')) {
    const dir = ['n', 's', 'e', 'w'].find(d => node.classList.contains(d)); if (!dir) continue;
    // The painting shows where paths end; a 'closed' sign on a blank edge is just noise.
    if (node.classList.contains('closed') || !organicExternalExit(key, dir)) { node.remove(); continue; }
    const door = organicDoor(key, dir, key === state.room ? organicPocketAt(key, state.pos) : 0); if (!door) continue;
    // Round 92: an exit you can't reach from the patch of street you're on isn't labelled here.
    if (key === state.room && door.inPocket === false) { node.remove(); continue; }
    const place = (el, d) => { el.classList.add('organic-door'); el.dataset.along = String(d.along);
      Object.assign(el.style, { left: d.edge.x + 'px', top: d.edge.y + 'px', right: 'auto', bottom: 'auto',
        transform: 'translate(' + (dir === 'w' ? '0' : dir === 'e' ? '-100%' : '-50%') + ',' + (dir === 'n' ? '0' : dir === 's' ? '-100%' : '-50%') + ')' }); };
    const doors = key === state.room ? organicDoors(key, dir, organicPocketAt(key, state.pos)) : [door];
    place(node, doors[0] || door);
    for (const extra of doors.slice(1)) { const twin = node.cloneNode(true); place(twin, extra); node.after(twin); }
  }
  return out;
};
if (typeof document !== 'undefined' && document.getElementById) {
  const world = document.getElementById('world');
  if (world && world.addEventListener) world.addEventListener('click', e => {
    const label = e.target && e.target.closest && e.target.closest('.city-exit.organic-door'); if (!label || !state || state.battle) return;
    const key = (label.closest('.area-cell') && label.closest('.area-cell').dataset.room) || state.room, dir = ['n', 's', 'e', 'w'].find(d => label.classList.contains(d));
    const pocket = key === state.room ? organicPocketAt(key, state.pos) : 0, along = Number(label.dataset && label.dataset.along);
    const door = dir && ((Number.isFinite(along) && organicDoors(key, dir, pocket).find(d => d.along === along)) || organicDoor(key, dir, pocket)); if (!door || typeof setTouchDestination !== 'function') return;
    e.stopPropagation(); e.preventDefault();
    const o = cellOffset(key, joinedArea()); setTouchDestination({ x: o.x + door.edge.x, y: o.y + door.edge.y - 22 }, { dir, key });
  }, true);
}
// --- Patrols, chests and POIs move onto the paths.
// Walkable 10px grid points per room, cached (Round 91: spawn placement over a whole painted world).
const organicPoints = {};
function organicGrid(key) {
  const o = organicDef(key), ck = activeRegion + ':' + key + ':' + (o ? o.def.src : '-');
  if (organicPoints[ck]) return organicPoints[ck];
  const pts = [];
  // 8px grid aligned to the 8px walk masks (feet at mask-cell centres) so narrow necks aren't missed.
  for (let py = 14; py <= 486; py += 8) for (let px = 12; px <= 788; px += 8) if (walkable(key, px, py)) pts.push(px, py);
  return organicPoints[ck] = pts;
}
// The largest 4-connected patch of a room's walkable grid points.
const organicMains = {};
function organicGridKey(p) { return (Math.round((p.x - 12) / 8) * 8 + 12) + ',' + (Math.round((p.y - 14) / 8) * 8 + 14); }
// Index of the patch a spot belongs to: the nearest grid point within 30px, else -1.
function organicPocketNear(key, p) {
  const pockets = organicPockets(key);
  const [gx, gy] = organicGridKey(p).split(',').map(Number);
  for (let r = 0; r <= 32; r += 8) for (let dx = -r; dx <= r; dx += 8) for (let dy = -r; dy <= r; dy += 8) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const g = (gx + dx) + ',' + (gy + dy);
    const i = pockets.findIndex(set => set.has(g)); if (i >= 0) return i;
  }
  return -1;
}
// A room's separate walkable patches (4-connected on the 10px grid), largest first.
function organicPockets(key) {
  const o = organicDef(key), ck = activeRegion + ':' + key + ':' + (o ? o.def.src : '-');
  if (organicMains[ck]) return organicMains[ck];
  const pts = organicGrid(key), all = new Set(), seen = new Set(), out = [];
  for (let i = 0; i < pts.length; i += 2) all.add(pts[i] + ',' + pts[i + 1]);
  for (const s0 of all) {
    if (seen.has(s0)) continue;
    const comp = new Set([s0]), q = [s0]; seen.add(s0);
    while (q.length) {
      const [x, y] = q.pop().split(',').map(Number);
      for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
        const n = (x + dx) + ',' + (y + dy);
        if (all.has(n) && !seen.has(n)) { seen.add(n); comp.add(n); q.push(n); }
      }
    }
    out.push(comp);
  }
  return organicMains[ck] = out.sort((a, b) => b.size - a.size);
}
function organicMainPocket(key) { return organicPockets(key)[0] || new Set(); }
// Which patch a spot belongs to (nearest grid point), so exit labels follow
// the patch the player is actually standing on.
function organicPocketAt(key, p) {
  const pockets = organicPockets(key); if (pockets.length < 2) return 0;
  let best = 0, bd = Infinity;
  pockets.forEach((set, i) => { for (const s of set) { const [x, y] = s.split(',').map(Number), d = (x - p.x) ** 2 + (y - p.y) ** 2; if (d < bd) { bd = d; best = i; } } });
  return best;
}
// Patches of street you can actually get to: ones with an exit of their own
// (single painted rooms can contain a sliver of street fenced off from every
// crossing). Joined districts and ordinary rooms count everything.
const organicReach = {};
function organicReachable(key) {
  const o = organicDef(key), ck = activeRegion + ':' + key + ':' + (o ? o.def.src : '-');
  if (organicReach[ck]) return organicReach[ck];
  const pockets = organicPockets(key);
  if (!o || o.area.cells.length > 1 || pockets.length < 2) return organicReach[ck] = null;
  const ok = new Set();
  pockets.forEach((set, i) => { if (Object.keys(rooms[key].exits).some(d => { const door = organicDoor(key, d, i, false); return door && door.inPocket !== false; })) for (const p of set) ok.add(p); });
  if (isStartRoomKey(key)) { const st = organicPocketAt(key, { x: 400, y: 300 }); for (const p of pockets[st]) ok.add(p); }
  return organicReach[ck] = ok;
}
function isStartRoomKey(key) { return activeRegion === 'city' ? key === '0,5' : key === '0,0'; }
function organicReachableAt(key, p) { const r = organicReachable(key); if (!r) return true; const i = organicPocketNear(key, p); return i >= 0 && r.has([...organicPockets(key)[i]][0]); }
function organicSpot(key, x, y, avoid = [], gap = 0) {
  let best = null, bd = Infinity;
  const pts = organicGrid(key), reach = organicReachable(key);
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i], py = pts[i + 1];
    if (reach && !reach.has(px + ',' + py)) continue;
    if (avoid.some(a => Math.hypot(a.x - px, a.y - py) < gap)) continue;
    const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; }
  }
  return best;
}
// Round 93: chests, relics, points of interest, the merchant and Nexus
// Waypoints stand just off the street (on the verge, a doorstep, the edge of a
// plaza) rather than in the middle of the path, yet always within reach of a
// patch of street you can get to. A spot qualifies when it is not walkable
// itself, the nearest walkable ground is ITEM_OFF.min–max px away, and that
// nearest ground belongs to a reachable patch (so a tap on the item routes
// there). Spots keep clear of exit doors and of anything in `avoid`.
const ITEM_OFF = { min: 12, max: 28, ideal: 20 };
const organicItemCache = {};
function organicItemSpot(key, x, y, avoid = [], gap = 0) {
  const o = organicDef(key); if (!o) return null;
  const ck = activeRegion + ':' + key + ':' + o.def.src + ':' + Math.round(x) + ',' + Math.round(y) + ':' + gap + ':' + avoid.map(a => Math.round(a.x) + ',' + Math.round(a.y)).join(';');
  if (ck in organicItemCache) return organicItemCache[ck];
  const pts = organicGrid(key), reach = organicReachable(key), any = new Set(), ok = new Set();
  for (let i = 0; i < pts.length; i += 2) { const g = pts[i] + ',' + pts[i + 1]; any.add(g); if (!reach || reach.has(g)) ok.add(g); }
  const doors = ['n', 's', 'e', 'w'].filter(d => rooms[key].exits[d]).flatMap(d => organicDoors(key, d)).map(d => d.inward || d.edge).filter(Boolean);
  const offs = [];
  for (let dx = -32; dx <= 32; dx += 8) for (let dy = -32; dy <= 32; dy += 8) offs.push([dx, dy, Math.hypot(dx, dy)]);
  offs.sort((a, b) => a[2] - b[2]);
  let best = null, bs = Infinity;
  for (let py = 38; py <= 462; py += 8) for (let px = 28; px <= 772; px += 8) {
    if (any.has(px + ',' + py) || walkable(key, px, py)) continue;
    // Nearest walkable grid point: it must be reachable and inside the band.
    let near = null;
    for (const [dx, dy, d] of offs) { const g = (px + dx) + ',' + (py + dy); if (any.has(g)) { near = { g, d }; break; } }
    if (!near || near.d < ITEM_OFF.min || near.d > ITEM_OFF.max || !ok.has(near.g)) continue;
    if (doors.some(d => Math.hypot(d.x - px, d.y - py) < 90)) continue;
    if (avoid.some(a => Math.hypot(a.x - px, a.y - py) < gap)) continue;
    const s = Math.hypot(px - x, py - y) + 6 * Math.abs(near.d - ITEM_OFF.ideal);
    if (s < bs) { bs = s; best = { x: px, y: py }; }
  }
  return organicItemCache[ck] = best;
}
// The walkable spot a player would stand on to use an item, and how far away it is.
function organicItemStand(key, p) { const q = organicSpot(key, p.x, p.y); return q ? { ...q, d: Math.hypot(q.x - p.x, q.y - p.y) } : null; }
// An item is "beside the street": not on walkable ground, but a reachable street is within reach.
function organicBesideStreet(key, p, reach = 30) { const q = organicItemStand(key, p); return !walkable(key, p.x, p.y) && !!q && q.d <= reach; }
let organicSpawnPass = false;
const walkableForSpawns = walkable;
const roomSpawnsBeforeOrganic = roomSpawns;
roomSpawns = function (key) {
  if (!organicDef(key)) return roomSpawnsBeforeOrganic(key);
  // Let the usual sector choice run, then move each patrol onto the nearest path,
  // keeping patrols apart and away from the doors.
  organicSpawnPass = true; let list;
  try { list = roomSpawnsBeforeOrganic(key); } finally { organicSpawnPass = false; }
  if (list.organicPlaced) return list;
  const doors = ['n', 's', 'e', 'w'].map(d => organicExternalExit(key, d) && organicDoor(key, d)).filter(Boolean).map(d => d.inward), placed = [];
  for (const s of list) {
    const spot = organicSpot(key, s.x, s.y, placed.concat(doors), 125) || organicSpot(key, s.x, s.y, placed, 60) || organicSpot(key, s.x, s.y);
    if (spot) { s.x = spot.x; s.y = spot.y; } placed.push({ x: s.x, y: s.y });
  }
  Object.defineProperty(list, 'organicPlaced', { value: true });
  return list;
};
walkable = (function (inner) {
  return function (key, x, y, margin) { if (organicSpawnPass && organicDef(key)) return x >= 0 && x <= 800 && y >= 0 && y <= 500; return inner(key, x, y, margin); };
})(walkableForSpawns);
const chestForBeforeOrganic = chestFor;
chestFor = function (key) {
  const c = chestForBeforeOrganic(key); if (!c || !organicDef(key)) return c;
  // Round 93: beside the street, clear of the room's relic and its patrols.
  const r = rooms[key], avoid = r && r.relic ? [{ x: r.relic[3], y: r.relic[4] }] : [];
  if (typeof state !== 'undefined' && state && state.seed != null) for (const s of roomSpawns(key)) avoid.push({ x: s.x, y: s.y });
  const s = organicItemSpot(key, c.x, c.y, avoid, 120) || organicItemSpot(key, c.x, c.y, avoid, 70) || organicItemSpot(key, c.x, c.y, avoid.slice(0, 1), 60) || organicSpot(key, c.x, c.y);
  return s ? { ...c, x: s.x, y: s.y } : c;
};
const organicStyles = document.createElement('style');
organicStyles.textContent = '.city-exit.organic-door{white-space:nowrap}';
document.head.append(organicStyles);
