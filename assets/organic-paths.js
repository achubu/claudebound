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
const organicDoorCache = {};
function organicDoor(key, dir) {
  const o = organicDef(key); if (!o) return null;
  const ck = activeRegion + ':' + key + ':' + dir; if (ck in organicDoorCache) return organicDoorCache[ck];
  const horiz = dir === 'e' || dir === 'w', len = horiz ? 500 : 800, runs = []; let start = null;
  for (let t = 0; t <= len; t += 4) {
    const x = horiz ? (dir === 'w' ? 6 : 794) : t, y = horiz ? t : (dir === 'n' ? 6 : 494);
    const open = t < len && organicWalk(key, x, y - 22);
    if (open && start === null) start = t;
    if (!open && start !== null) { runs.push([start, t]); start = null; }
  }
  // The widest path wins; ties go to the one nearest the middle of the side.
  runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]) || Math.abs((a[0] + a[1]) / 2 - len / 2) - Math.abs((b[0] + b[1]) / 2 - len / 2));
  const r = runs[0]; if (!r) return organicDoorCache[ck] = null;
  const c = (r[0] + r[1]) / 2, half = Math.max(24, (r[1] - r[0]) / 2);
  const edge = horiz ? { x: dir === 'w' ? 14 : 786, y: c } : { x: c, y: dir === 'n' ? 14 : 486 };
  // Step inward along the path until clear of the edge trigger.
  let inward = null;
  for (let d = 34; d < 160 && !inward; d += 6) {
    const p = horiz ? { x: dir === 'w' ? d : 800 - d, y: c } : { x: c, y: dir === 'n' ? d : 500 - d };
    if (organicWalk(key, p.x, p.y - 22)) inward = { x: p.x, y: p.y - 22 };
  }
  return organicDoorCache[ck] = { edge, inward: inward || { x: edge.x, y: edge.y - 22 }, half, along: c };
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
  const p = state.pos, near = { w: p.x <= 16, e: p.x >= 784, n: p.y <= 16, s: p.y >= 484 };
  for (const dir of ['n', 's', 'e', 'w']) {
    if (!near[dir] || !organicExternalExit(state.room, dir)) continue;
    const door = organicDoor(state.room, dir); if (!door) continue;
    const along = dir === 'e' || dir === 'w' ? p.y + 22 : p.x;
    if (Math.abs(along - door.along) <= door.half + 20) { transition(dir); return; }
  }
};
const transitionBeforeOrganic = transition;
transition = function (dir) {
  const from = state.room, ok = transitionBeforeOrganic(dir);
  if (ok && state.room !== from && organicDef(state.room) && !(organicDef(from) && organicDef(from).area.cells.includes(state.room))) {
    const opp = { n: 's', s: 'n', e: 'w', w: 'e' }[dir], door = organicDoor(state.room, opp);
    if (door) { state.pos = { ...door.inward }; save(); renderWorld(); }
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
