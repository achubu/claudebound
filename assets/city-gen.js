'use strict';
// =====================================================================
// Round 387 (owner: "can we begin making neon aftermath more like chronospire? i want the city to look nearly the same but
// be procedurally generated"; "when designing the roads add areas of interactable objects and add them in, move as
// necessary"). Neon Aftermath's rooms are generated from the journey's seed by the Chronospire's generator
// (assets/chrono-gen.js, theme GEN_THEMES.city). What stays: the city's room map, room names, levels, bosses, gear,
// events and locks (the rooms literal in index.html). What is generated: every room's roads, hub, squares for objects,
// loops and spurs, its terrain (rubble, overgrowth, water along the city's edge and the odd pond) and its scenery
// (districts, street-front buildings on pavement, lamps, wrecks).
// The painted rooms, their traced walk mask, the hand-listed nooks and the owner-reviewed object spots (spot-fixes.js)
// are no longer used by the city: objects stand on the generated squares.
// =====================================================================
const CITY_GEN_VERSION = 1;
let cityGenSeed = null;
function cityGenEnsure() {
  const s = chronoSeed(); if (s === cityGenSeed) return;
  cityGenSeed = s; chronoFlushCaches('city');
}
function cityGenPlan(key) { cityGenEnsure(); return genPlan('city', key, cityGenSeed); }
// The walk mask, a cell at a time (8px cells judged at their centres, like the old traced mask).
// Each room's floor as a 100x63 grid of 8px cells, built once per seed.
let cityMaskSeed = null, cityMasks = {};
function cityRoomMask(cx, cy) {
  if (cityMaskSeed !== cityGenSeed) { cityMaskSeed = cityGenSeed; cityMasks = {}; }
  const k = cx + ',' + (cy + 4); if (k in cityMasks) return cityMasks[k];
  const p = cityGenPlan(k); if (!p) return cityMasks[k] = null;
  const m = new Uint8Array(100 * 63);
  for (let my = 0; my < 63; my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = 0; mx < 100; mx++) m[my * 100 + mx] = p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor((mx * 8 + 4) / FG_CELL)]; }
  // Round 415 (owner: a texture tile can be walked on unless a building, car or other sprite stands on it): in the top-down
  // city all ground can be walked; buildings, parked cars, park trees and the sea (a road over the water stays) cannot.
  if (GEN_THEMES.city.topdown) { const b = genWith('city', () => cityBlockers(cityGenSeed, k, p));
    for (let my = 0; my < 63; my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = 0; mx < 100; mx++) { const x = mx * 8 + 4, road = p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)];
      let ok = !b.rects.some(r => x >= r[0] && x < r[2] && y >= r[1] && y < r[3] && !(road && r[4] === 'water')) && !b.circles.some(c => Math.hypot(x - c[0], y - c[1]) < c[2]);
      m[my * 100 + mx] = ok ? 1 : 0; } } }
  return cityMasks[k] = m;
}
function cityGenWalk(wx, wy) {
  if (wx < 0 || wy < 0) return false;
  if (state && state.seed != null && String(state.seed) !== cityGenSeed) cityGenEnsure();
  const cx = Math.floor(wx / 800), cy = Math.floor(wy / 500), m = cityRoomMask(cx, cy); if (!m) return false;
  return m[Math.floor((wy - cy * 500) / 8) * 100 + Math.floor((wx - cx * 800) / 8)] === 1;
}
// A fast path for the city's rooms (not during the organic engine's patrol pass, where any spot in the room counts), the same answer the organic engine gives (a room's foot point is y+22, read no lower
// than 495; standing is allowed 12px in from the room's sides), without its per-call lookups: new journeys re-plan the
// city, and placement asks hundreds of thousands of these.
function cityRoomWalk(key, x, y) {
  const c = key.indexOf(','), cx = +key.slice(0, c), cy = +key.slice(c + 1) - 4, m = cityRoomMask(cx, cy); if (!m) return false;
  const X = Math.max(0, Math.min(799, x)), Y = Math.min(495, Math.max(0, Math.min(499, y + 22)));
  return m[Math.floor(Y / 8) * 100 + Math.floor(X / 8)] === 1;
}
{
  const walkableBeforeCity = walkable;
  walkable = function (key, x, y, margin) {
    if (activeRegion === 'city' && rooms[key] && !(typeof organicSpawnPass !== 'undefined' && organicSpawnPass)) { if (state && state.seed != null && String(state.seed) !== cityGenSeed) cityGenEnsure(); return x >= 12 && x <= 788 && y >= 12 && y <= 488 && cityRoomWalk(key, x, y); }
    return walkableBeforeCity.apply(this, arguments);
  };
  const blockedBeforeCity = NeonCity.blocked;
  NeonCity.blocked = function (key, x, y) {
    if (activeRegion === 'city' && rooms[key]) { if (state && state.seed != null && String(state.seed) !== cityGenSeed) cityGenEnsure(); return !cityRoomWalk(key, x, y); }
    return blockedBeforeCity.apply(this, arguments);
  };
}
{
  const walkBefore = neonWorldWalk;
  neonWorldWalk = function (wx, wy) { return activeRegion === 'city' ? cityGenWalk(wx, wy) : walkBefore.apply(this, arguments); };
  // No room has its own painting or hand-listed nooks any more.
  neonRoomArt = function () { return false; };
  const looseBefore = neonLoose;
  neonLoose = function () { return activeRegion === 'city' ? true : looseBefore.apply(this, arguments); };
  const paintBefore = paintNeonWorld;
  paintNeonWorld = function (canvas, key) { return activeRegion === 'city' && neonWorldCell(key) ? genWith('city', () => paintChronoRoom(canvas, key)) : paintBefore.apply(this, arguments); };
  // Objects stand on the generated squares.
  const plazaSpotsBefore = plazaSpots;
  plazaSpots = function (key, region = activeRegion) {
    if (region === 'city') { const p = cityGenPlan(key); return p && p.plazas.length ? p.plazas : null; }
    return plazaSpotsBefore.apply(this, arguments);
  };
  if (typeof ROOM_SPOT_FIXES !== 'undefined') delete ROOM_SPOT_FIXES.city;
  if (typeof organicDef === 'function') { const defBefore = organicDef; organicDef = function () { if (activeRegion === 'city') cityGenEnsure(); return defBefore.apply(this, arguments); }; }
  const configureBefore = configureRegion;
  configureRegion = function (region) { if (region === 'city') cityGenEnsure(); return configureBefore.apply(this, arguments); };
  // A position off the generated roads (an older save, or a fall-back spot) moves to the room's hub.
  const renderBefore = renderWorld;
  renderWorld = function () {
    if (state && activeRegion === 'city' && !state.battle && state.pos && rooms[state.room] && !walkable(state.room, state.pos.x, state.pos.y)) { const p = cityGenPlan(state.room); if (p) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    return renderBefore.apply(this, arguments);
  };
  const saveBefore = save;
  save = function () { if (state) state.cityGen = CITY_GEN_VERSION; return saveBefore.apply(this, arguments); };
}
// Patrols keep 120px from every door's landing spot in the generated city (walking in never starts a fight); a patrol that
// cannot is moved to the farthest spot on the road from the doors.
{
  const roomSpawnsBeforeCity = roomSpawns;
  roomSpawns = function (key) {
    const list = roomSpawnsBeforeCity.apply(this, arguments);
    if (activeRegion !== 'city' || !Array.isArray(list) || list.cityDoorsChecked || !rooms[key]) return list;
    const doors = ['n', 's', 'e', 'w'].map(d => rooms[key].exits[d] && organicDoor(key, d)).filter(Boolean).map(d => d.inward);
    const far = (x, y) => Math.min(Infinity, ...doors.map(d => Math.hypot(x - d.x, y - d.y)));
    for (const s of list) {
      if (s.boss || far(s.x, s.y) >= 120) continue;
      const others = list.filter(o => o !== s);
      const q = typeof organicSpot === 'function' && (organicSpot(key, s.x, s.y, doors.concat(others), 125) || organicSpot(key, s.x, s.y, doors, 125));
      if (q && far(q.x, q.y) >= 120) { s.x = q.x; s.y = q.y; continue; }
      let best = null; const pts = organicGrid(key);
      for (let i = 0; i < pts.length; i += 2) { const d = far(pts[i], pts[i + 1]); if (others.every(o => Math.hypot(o.x - pts[i], o.y - pts[i + 1]) > 90) && (!best || d > best.d)) best = { x: pts[i], y: pts[i + 1], d }; }
      if (best && best.d > far(s.x, s.y)) { s.x = best.x; s.y = best.y; }
    }
    if (Object.isExtensible(list)) Object.defineProperty(list, 'cityDoorsChecked', { value: true });
    return list;
  };
}
