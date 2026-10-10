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
  const area = joinedArea(key), def = area.art && ORGANIC_AREAS[activeRegion + ':' + area.art];
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
const organicDoorCache = {};
function organicAreaWalk(o, ax, ay) { return organicAt(o, Math.max(0, Math.min(o.area.width - 1, ax)), Math.max(0, Math.min(o.area.height - 1, ay))); }
function organicDoor(key, dir) {
  const o = organicDef(key); if (!o) return null;
  const ck = activeRegion + ':' + key + ':' + dir; if (ck in organicDoorCache) return organicDoorCache[ck];
  const area = o.area, off = cellOffset(key, area), horiz = dir === 'e' || dir === 'w';
  const span = horiz ? 500 : 800, base = horiz ? off.y : off.x, areaLen = horiz ? area.height : area.width;
  // How far the search may spill into each neighbour along the edge.
  const [kx, ky] = key.split(',').map(Number), step = horiz ? [0, 1] : [1, 0];
  const reach = sgn => { const n = (kx + step[0] * sgn) + ',' + (ky + step[1] * sgn); return area.cells.includes(n) && !organicExternalExit(n, dir) ? DOOR_REACH : 0; };
  const lo = Math.max(0, base - reach(-1)), hi = Math.min(areaLen, base + span + reach(1));
  const edgeCoord = dir === 'w' ? 6 : dir === 'e' ? area.width - 6 : dir === 'n' ? 6 : area.height - 6;
  const runs = []; let start = null;
  for (let t = lo; t <= hi; t += 4) {
    const open = t < hi && (horiz ? organicAreaWalk(o, edgeCoord, t) : organicAreaWalk(o, t, edgeCoord));
    if (open && start === null) start = t;
    if (!open && start !== null) { runs.push([start, t]); start = null; }
  }
  // Prefer the run that overlaps this room's own stretch most, then the widest.
  const own = r => Math.max(0, Math.min(r[1], base + span) - Math.max(r[0], base));
  runs.sort((a, b) => own(b) - own(a) || (b[1] - b[0]) - (a[1] - a[0]));
  const r = runs.find(r => r[1] - r[0] >= 12); if (!r) return organicDoorCache[ck] = null;
  const cA = (r[0] + r[1]) / 2, c = cA - base, half = Math.max(24, (r[1] - r[0]) / 2);
  const edge = horiz ? { x: dir === 'w' ? 14 : 786, y: c } : { x: c, y: dir === 'n' ? 14 : 486 };
  // Step inward along the path until clear of the edge trigger (area walk, foot point).
  let inward = null;
  for (let d = 40; d < 200 && !inward; d += 6) {
    const lx = horiz ? (dir === 'w' ? d : 800 - d) : c, ly = horiz ? c : (dir === 'n' ? d : 500 - d);
    if (organicAreaWalk(o, off.x + lx, off.y + ly)) inward = { x: lx, y: ly - 22 };
  }
  return organicDoorCache[ck] = { edge, inward: inward || { x: edge.x, y: edge.y - 22 }, half, along: c };
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
  if (organicDef(key)) return x >= 0 && x <= 800 && y >= 0 && y <= 500 && !NeonCity.blocked(key, x, y); // paths are the walkable area; no body margin
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
    const door = organicDoor(key, dir); if (!door) continue;
    node.classList.add('organic-door');
    Object.assign(node.style, { left: door.edge.x + 'px', top: door.edge.y + 'px', right: 'auto', bottom: 'auto',
      transform: 'translate(' + (dir === 'w' ? '0' : dir === 'e' ? '-100%' : '-50%') + ',' + (dir === 'n' ? '0' : dir === 's' ? '-100%' : '-50%') + ')' });
  }
  return out;
};
if (typeof document !== 'undefined' && document.getElementById) {
  const world = document.getElementById('world');
  if (world && world.addEventListener) world.addEventListener('click', e => {
    const label = e.target && e.target.closest && e.target.closest('.city-exit.organic-door'); if (!label || !state || state.battle) return;
    const key = (label.closest('.area-cell') && label.closest('.area-cell').dataset.room) || state.room, dir = ['n', 's', 'e', 'w'].find(d => label.classList.contains(d));
    const door = dir && organicDoor(key, dir); if (!door || typeof setTouchDestination !== 'function') return;
    e.stopPropagation(); e.preventDefault();
    const o = cellOffset(key, joinedArea()); setTouchDestination({ x: o.x + door.edge.x, y: o.y + door.edge.y - 22 }, { dir, key });
  }, true);
}
// --- Patrols, chests and POIs move onto the paths.
function organicSpot(key, x, y, avoid = [], gap = 0) {
  let best = null, bd = Infinity;
  for (let py = 40; py <= 460; py += 10) for (let px = 30; px <= 770; px += 10) {
    if (!walkable(key, px, py) || avoid.some(a => Math.hypot(a.x - px, a.y - py) < gap)) continue;
    const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; }
  }
  return best;
}
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
    const spot = organicSpot(key, s.x, s.y, placed.concat(doors), 110) || organicSpot(key, s.x, s.y, placed, 60) || organicSpot(key, s.x, s.y);
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
  const c = chestForBeforeOrganic(key); if (!c || !organicDef(key) || walkable(key, c.x, c.y)) return c;
  const s = organicSpot(key, c.x, c.y); return s ? { ...c, x: s.x, y: s.y } : c;
};
const organicStyles = document.createElement('style');
organicStyles.textContent = '.city-exit.organic-door{white-space:nowrap}';
document.head.append(organicStyles);
