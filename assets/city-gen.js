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
      m[my * 100 + mx] = ok ? 1 : 0; } }
    // Round 445: only ground joined to the room's streets counts. A yard or a strip of paving walled in by buildings is
    // not somewhere to stand: nothing is placed there and nobody can be set down there with no way out.
    // Round 449: a room's edge is crossed only on a street. The game takes each door from the widest walkable stretch along
    // an edge; with sidewalks and yards walkable that was often not the road, so doors, their labels and where they set
    // you down drifted off the streets (and onto objects' squares). In the strips the doors are read from (the top 40px,
    // the bottom 12px, 16px at each side) only street cells stay walkable.
    const st = (mx, my) => { const y = my * 8 + 4; return y < 500 && (p.street || p.floor)[Math.floor(y / FG_CELL) * FG_COLS + Math.floor((mx * 8 + 4) / FG_CELL)]; };
    for (let my = 0; my < 63; my++) for (let mx = 0; mx < 100; mx++) { if (my > 4 && my < 61 && mx > 1 && mx < 98) continue; const i = my * 100 + mx; if (m[i] && !st(mx, my)) m[i] = 0; }
    // Round 448: only ground joined to the room's streets counts, and joined through the part of the room inside those
    // strips (rows 5-60, columns 2-97). A notch that met the street only along the room's top strip passed the first
    // version of this check, and a door could set you down in it with no way on. A street cell in the strips stays only
    // if the cell straight in from it stays.
    const R0 = 5, R1 = 60, C0 = 2, C1 = 97, seen = new Uint8Array(100 * 63), q = [];
    for (let my = R0; my <= R1; my++) for (let mx = C0; mx <= C1; mx++) { const i = my * 100 + mx; if (m[i] && st(mx, my)) { seen[i] = 1; q.push(i); } }
    for (let h = 0; h < q.length; h++) { const i = q[h], mx = i % 100, my = (i - mx) / 100; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = mx + a, ny = my + b; if (nx < C0 || ny < R0 || nx > C1 || ny > R1) continue; const n = ny * 100 + nx; if (m[n] && !seen[n]) { seen[n] = 1; q.push(n); } } }
    for (let my = 0; my < 63; my++) for (let mx = 0; mx < 100; mx++) { const i = my * 100 + mx; if (!m[i]) continue; const cy = Math.max(R0, Math.min(R1, my)), cx = Math.max(C0, Math.min(C1, mx)); if (!seen[cy * 100 + cx]) m[i] = 0; } }
  return cityMasks[k] = m;
}
// Round 417 (owner: "make sure enemy pathing is only allowed on texture tiles and not object sprites"): an enemy is a
// sprite about 40px wide standing on its foot (y + 22), so where it may stand is checked for its whole body: its box
// (x +-20, y - 24 .. y + 24) must touch no building, car, tree or sea, and its foot must be on walkable ground.
let cityEnemySeed = null, cityEnemyBlock = {};
function cityEnemyOk(key, x, y) {
  if (cityEnemySeed !== cityGenSeed) { cityEnemySeed = cityGenSeed; cityEnemyBlock = {}; }
  if (!cityRoomWalk(key, x, y)) return false;
  if (x < 20 || x > 780 || y < 24 || y > 476) return false;
  let b = cityEnemyBlock[key]; if (!b) { const p = cityGenPlan(key); b = cityEnemyBlock[key] = p ? genWith('city', () => cityBlockers(cityGenSeed, key, p)) : { rects: [], circles: [] }; }
  const bx0 = x - 20, bx1 = x + 20, by0 = y - 24, by1 = y + 24, f = cityGenPlan(key).floor;
  for (const r of b.rects) { if (bx0 < r[2] && bx1 > r[0] && by0 < r[3] && by1 > r[1]) { if (r[4] === 'water' && f[Math.floor(Math.min(495, y + 22) / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)]) continue; return false; } }
  for (const c of b.circles) { const nx = Math.max(bx0, Math.min(c[0], bx1)), ny = Math.max(by0, Math.min(c[1], by1)); if (Math.hypot(nx - c[0], ny - c[1]) < c[2]) return false; }
  return true;
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
    if (activeRegion === 'city' && rooms[key] && !(typeof organicSpawnPass !== 'undefined' && organicSpawnPass) && GEN_THEMES.city.topdown && (margin === 26 || margin === 28)) { if (state && state.seed != null && String(state.seed) !== cityGenSeed) cityGenEnsure(); return cityEnemyOk(key, x, y); } // Round 417: a patrol's step or spot
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
    if (region === 'city') { const p = cityGenPlan(key); if (!p || !p.plazas.length) return null;
      // Round 448: a square within 70px of where a door really sets you down is not used while the room has another (the
      // landing spots come from the ground on both sides of a room's edge, so the city's plan can only keep squares roughly
      // clear of them; an object there opened as you walked in)
      if (p.clearSpots === undefined) { p.clearSpots = null; const lands = ['n', 's', 'e', 'w'].map(d => rooms[key] && rooms[key].exits[d] && organicDoor(key, d)).filter(Boolean).map(d => d.inward);
        const ok = p.plazas.filter(([x, y]) => !lands.some(l => Math.hypot(l.x - x, l.y - y) < 70)); p.clearSpots = ok.length ? ok : p.plazas; }
      return p.clearSpots || p.plazas; }
    return plazaSpotsBefore.apply(this, arguments);
  };
  // Round 457 (owner: "make sure we have a rule that interactable objects don't overlap buildings or other sprites like
  // cars and signs"): whatever spot an object is given in the city, its picture must be clear of every sprite's picture
  // (citySpriteBoxes: buildings, landmarks, yard pieces, trees, rubble, cars, lamps, lights, signs, clutter). A spot that
  // isn't is moved to the nearest ground that is: walkable, joined to the streets, 60px inside the room, clear of the HUD,
  // and clear of whatever the caller keeps a gap from. (The old fallback, "just off the path", is a building here.)
  const CITY_ITEM_PAD = 3, cityItemClear = (key, x, y, boxes, small) => { const B = small ? [x - 21 - CITY_ITEM_PAD, y - 34 - CITY_ITEM_PAD, x + 21 + CITY_ITEM_PAD, y + 22 + CITY_ITEM_PAD] : [x - 29 - CITY_ITEM_PAD, y - 47 - CITY_ITEM_PAD, x + 29 + CITY_ITEM_PAD, y + 22 + CITY_ITEM_PAD]; // the largest object's box (58px) with a 3px margin, so any object fits
    return !boxes.some(b => B[0] < b.x1 && B[2] > b.x0 && B[1] < b.y1 && B[3] > b.y0); };
  const cityItemBoxesCache = {};
  // an object stands on open ground, never on a street: its foot point (22px under its spot, as everywhere) and the ground
  // a little to each side must be clear of the room's street cells
  const cityItemOnStreet = globalThis.cityItemOnStreet = function (key, x, y) { const wl = genWith('city', () => genWorld(chronoSeed())), [wx, wy] = GEN_THEMES.city.world(key), road = (px, py) => px >= 0 && py >= 0 && px < 800 && py < 500 && wl.cell[(wy * FG_ROWS + Math.floor(py / FG_CELL)) * wl.CW + wx * FG_COLS + Math.floor(px / FG_CELL)] === 2; // (the city's street cells: a room's plan also counts the squares' paving as floor)
    return [[0, 22], [-16, 22], [16, 22], [0, 10], [0, 30]].some(([dx, dy]) => road(x + dx, y + dy)); };
  const cityItemSpotClear = globalThis.cityItemSpotClear = function (key, x, y, small) { const sd = genWith('city', () => chronoSeed()), ck = sd + ':' + key, boxes = cityItemBoxesCache[ck] || (cityItemBoxesCache[ck] = genWith('city', () => citySpriteBoxes(sd, key, cityGenPlan(key)))); return cityItemClear(key, x, y, boxes, small); };
  const itemSpotBefore = organicItemSpot;
  organicItemSpot = function (key, x, y, avoid = [], gap = 0) {
    const p = itemSpotBefore.apply(this, arguments);
    if (activeRegion !== 'city' || !neonWorldCell(key) || !cityGenPlan(key)) return p;
    const ok = (cx, cy) => cx >= 60 && cx <= 740 && cy >= 70 && cy <= 440 && walkable(key, cx, cy) && !cityItemOnStreet(key, cx, cy) && cityItemSpotClear(key, cx, cy) && !(typeof screenCovered === 'function' && screenCovered(cx, cy))
      && !avoid.some(a => Math.hypot(a.x - cx, a.y - cy) < gap) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, { x: cx, y: cy }));
    if (p && ok(p.x, p.y)) return p;
    const from = p || { x, y }; let best = null, bd = Infinity;
    for (let cy = 72; cy <= 440; cy += 8) for (let cx = 60; cx <= 740; cx += 8) { const d = Math.hypot(cx - from.x, cy - from.y); if (d < bd && ok(cx, cy)) { bd = d; best = { x: cx, y: cy }; } }
    return best || p;
  };
  // The same rule for spots that don't come through organicItemSpot (a point of interest's own spot table, the start
  // room's waypoint, the city's night objects, chests, the merchant): each is checked once per journey and moved if needed.
  const cityFixCache = {}; let cityFixBusy = false;
  const cityFixSpot = (key, o) => { if (!o || activeRegion !== 'city' || !rooms[key] || !neonWorldCell(key) || !cityGenPlan(key)) return o; const tag = String(state && state.seed) + ':' + key; if (o.cityClear === tag) return o;
    const fk = tag + ':' + Math.round(o.x) + ',' + Math.round(o.y), hit = cityFixCache[fk]; if (hit) { o.x = hit[0]; o.y = hit[1]; o.cityClear = tag; return o; } // (some callers build a new object every time: the answer is kept by spot)
    // the rule in order of what gives way when a room has little open ground: first the HUD and the room's margin, then
    // the patrols' distance, last the street; never a sprite, never ground that can't be reached
    const small = !(o.type === 'merchant' || o.type === 'cardsmith' || o.type === 'vault');
    const ok = (cx, cy, tier) => cx >= (tier ? 40 : 60) && cx <= (tier ? 760 : 740) && cy >= (tier ? 56 : 70) && cy <= (tier ? 456 : 440) && walkable(key, cx, cy) && (tier > 1 || !cityItemOnStreet(key, cx, cy)) && cityItemSpotClear(key, cx, cy, small)
      && (tier > 0 || !(typeof screenCovered === 'function' && screenCovered(cx, cy))) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, { x: cx, y: cy }));
    if (!ok(o.x, o.y, 0)) { let best = null, bd = Infinity, sp = []; try { sp = cityFixBusy ? [] : (cityFixBusy = true, roomSpawns(key) || []); } catch (e) { sp = []; } cityFixBusy = false;
      for (const [tier, far] of [[0, 152], [1, 152], [0, 70], [1, 70], [0, 0], [1, 0], [2, 152], [2, 70], [2, 0]]) /* 150px from patrols first (a point of interest's own rule), then 70, then any */ { if (best) break; for (let cy = 56; cy <= 456; cy += 8) for (let cx = 40; cx <= 760; cx += 8) { const d = Math.hypot(cx - o.x, cy - o.y); if (d < bd && ok(cx, cy, tier) && !sp.some(q => Math.hypot(q.x - cx, q.y - cy) < far)) { bd = d; best = [cx, cy]; } } }
      if (best) { o.x = best[0]; o.y = best[1]; } }
    cityFixCache[fk] = [o.x, o.y]; o.cityClear = tag; return o; };
  // "beside the street" in the city means: on open ground joined to the streets, off the street itself, clear of every sprite
  const besideStreetBeforeCity = organicBesideStreet;
  organicBesideStreet = function (key, p) { if (activeRegion === 'city' && rooms[key] && neonWorldCell(key) && cityGenPlan(key)) return walkable(key, p.x, p.y) && !cityItemOnStreet(key, p.x, p.y) && cityItemSpotClear(key, p.x, p.y, !(p.type === 'merchant' || p.type === 'cardsmith' || p.type === 'vault')) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, p)); return besideStreetBeforeCity.apply(this, arguments); };
  if (typeof worldPOIs === 'function') { const worldPOIsBefore = worldPOIs; worldPOIs = function () { const t = worldPOIsBefore.apply(this, arguments); if (activeRegion === 'city' && t) for (const k of Object.keys(t)) cityFixSpot(t[k].key || k, t[k]); return t; }; } // (the table itself, for whoever reads it whole)
  const poiAtBeforeCityClear = poiAt; poiAt = function (key) { return cityFixSpot(key, poiAtBeforeCityClear.apply(this, arguments)); };
  if (typeof chestFor === 'function') { const chestForBefore = chestFor; chestFor = function (key) { return cityFixSpot(key, chestForBefore.apply(this, arguments)); }; }
  if (typeof cardsmithFor === 'function') { const cardsmithForBefore = cardsmithFor; cardsmithFor = function () { const c = cardsmithForBefore.apply(this, arguments); return c && c.key ? cityFixSpot(c.key, c) : c; }; }
  if (typeof merchantRoom === 'function') { const merchantRoomBefore = merchantRoom; merchantRoom = function () { const m = merchantRoomBefore.apply(this, arguments); return m && m.key ? cityFixSpot(m.key, m) : m; }; }
  if (typeof ROOM_SPOT_FIXES !== 'undefined') delete ROOM_SPOT_FIXES.city;
  if (typeof organicDef === 'function') { const defBefore = organicDef; organicDef = function () { if (activeRegion === 'city') cityGenEnsure(); return defBefore.apply(this, arguments); }; }
  const configureBefore = configureRegion;
  configureRegion = function (region) { if (region === 'city') cityGenEnsure(); return configureBefore.apply(this, arguments); };
  // A position off the generated roads (an older save, or a fall-back spot) moves to the room's hub.
  const renderBefore = renderWorld;
  renderWorld = function () {
    if (state && activeRegion === 'city' && !state.battle && state.pos && rooms[state.room] && !walkable(state.room, state.pos.x, state.pos.y)) { const p = cityGenPlan(state.room); if (p) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    const out = renderBefore.apply(this, arguments);
    // Round 441 (owner: "reduce interactable object size, increase building size"): smaller objects in the top-down city
    const w = document.getElementById('world'); if (w) w.classList.toggle('td-city', activeRegion === 'city' && typeof GEN_THEMES !== 'undefined');
    return out;
  };
  const saveBefore = save;
  save = function () { if (state) state.cityGen = CITY_GEN_VERSION; return saveBefore.apply(this, arguments); };
  // Round 448: a new journey starts on the street at once. The start spot (400,300) is only on a street in some cities;
  // it used to be put right when the room was first drawn, after the tutorial.
  const newGameBeforeCity = newGame;
  newGame = function () { const out = newGameBeforeCity.apply(this, arguments);
    if (state && activeRegion === 'city' && rooms[state.room] && state.pos) { cityGenEnsure(); const p = cityGenPlan(state.room); if (p && !cityRoomWalk(state.room, state.pos.x, state.pos.y)) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    return out; };
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
    // Round 417: a patrol (or boss) stands only where its whole sprite is clear of objects; else the nearest such spot on the road
    if (GEN_THEMES.city.topdown) for (const s of list) { if (cityEnemyOk(key, s.x, s.y)) continue; const pts = organicGrid(key); let best = null;
      for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; if (!cityEnemyOk(key, x, y) || (!s.boss && far(x, y) < 120) || list.some(o => o !== s && Math.hypot(o.x - x, o.y - y) < 90)) continue; const d = Math.hypot(x - s.x, y - s.y); if (!best || d < best.d) best = { x, y, d }; }
      if (best) { s.x = best.x; s.y = best.y; } }
    for (const s of list) {
      if (s.boss || far(s.x, s.y) >= 120) continue;
      const others = list.filter(o => o !== s);
      const q = typeof organicSpot === 'function' && (organicSpot(key, s.x, s.y, doors.concat(others), 125) || organicSpot(key, s.x, s.y, doors, 125));
      const eok = (x, y) => !GEN_THEMES.city.topdown || cityEnemyOk(key, x, y);
      if (q && far(q.x, q.y) >= 120 && eok(q.x, q.y)) { s.x = q.x; s.y = q.y; continue; }
      let best = null; const pts = organicGrid(key);
      for (let i = 0; i < pts.length; i += 2) { const d = far(pts[i], pts[i + 1]); if (others.every(o => Math.hypot(o.x - pts[i], o.y - pts[i + 1]) > 90) && eok(pts[i], pts[i + 1]) && (!best || d > best.d)) best = { x: pts[i], y: pts[i + 1], d }; }
      if (best && best.d > far(s.x, s.y)) { s.x = best.x; s.y = best.y; }
    }
    if (Object.isExtensible(list)) Object.defineProperty(list, 'cityDoorsChecked', { value: true });
    return list;
  };
}
