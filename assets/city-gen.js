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
// Round 486: the generated worlds in play. Neon Aftermath always; Solaris (region 'elaris', theme GEN_THEMES.solaris) while
// GEN_SOLARIS_LIVE. Everything below answers for the region you are in: its theme, and where its room keys sit on the
// world grid (the city's keys run from row 4, Solaris's from row 0).
let GEN_SOLARIS_LIVE = true;
let GEN_SKY_LIVE = true; // Round 548: the Sky Isles on the generator (theme GEN_THEMES.sky)
let GEN_WILDS_LIVE = true; // Round 552: Elaris, the forest, on the generator (theme GEN_THEMES.wilds)
const GEN_REGIONS = { city: { id: 'city', theme: 'city', dy: 4 }, elaris: { id: 'elaris', theme: 'solaris', dy: 0, live: () => GEN_SOLARIS_LIVE }, sky: { id: 'sky', theme: 'sky', dy: 0, live: () => GEN_SKY_LIVE }, wilds: { id: 'wilds', theme: 'wilds', dy: 0, live: () => GEN_WILDS_LIVE } };
// Round 488: these run for every walk test (millions while a journey is placed), so the current region's answer is kept
// until the region or the Solaris switch changes.
let genRegionMemo = { reg: undefined, live: undefined, r: null };
function genRegion(region) {
  if (region === undefined) { const reg = typeof activeRegion !== 'undefined' ? activeRegion : 'city', m = genRegionMemo; if (m.reg === reg && m.live === GEN_SOLARIS_LIVE + ':' + GEN_SKY_LIVE + ':' + GEN_WILDS_LIVE) return m.r;
    const r = GEN_REGIONS[reg], out = r && (!r.live || r.live()) ? r : null; genRegionMemo = { reg, live: GEN_SOLARIS_LIVE + ':' + GEN_SKY_LIVE + ':' + GEN_WILDS_LIVE, r: out }; return out; }
  const r = GEN_REGIONS[region]; return r && (!r.live || r.live()) ? r : null; }
function genLive(region) { return !!genRegion(region); }
function genTheme() { const r = genRegion(); return r ? r.theme : 'city'; }
function genDy() { const r = genRegion(); return r ? r.dy : 4; }
function genWorldCell(key) { const r = genLive() && rooms[key]; return r && r.world ? r.world : null; }
let cityGenSeed = null, cityGenKey = null;
// Round 488: a world's caches are flushed only when its own seed changes. Going from the city to Solaris and back with the
// same seed (a portal, or the tests' many journeys) used to flush and re-place everything each way, ~4s a switch.
const cityGenSeedOf = {};
function cityGenEnsure() {
  const s = chronoSeed(), th = genTheme(), k = th + ':' + s; if (k === cityGenKey) return;
  cityGenKey = k; cityGenSeed = s; if (cityGenSeedOf[th] !== s) { cityGenSeedOf[th] = s; chronoFlushCaches((genRegion() || GEN_REGIONS.city).id); }
}
let cityStaleMemo = { seed: undefined, reg: undefined, key: undefined };
function cityGenStale() { if (typeof state === 'undefined' || !state || state.seed == null) return false; const m = cityStaleMemo; if (m.seed === state.seed && m.reg === activeRegion && m.key === cityGenKey) return false;
  if (genTheme() + ':' + String(state.seed) !== cityGenKey) return true; cityStaleMemo = { seed: state.seed, reg: activeRegion, key: cityGenKey }; return false; }
function cityGenPlan(key) { cityGenEnsure(); return genPlan(genTheme(), key, cityGenSeed); }
// The walk mask, a cell at a time (8px cells judged at their centres, like the old traced mask).
// Each room's floor as a 100x63 grid of 8px cells, built once per seed.
const cityMasksBy = {}; let cityMasks = {}; // Round 488: kept per theme and seed
// Round 540: the 8px cells (100x63) a room's blockers stand on, a cell judged at its centre; a water rect leaves road cells
// open (a road over the water). Each blocker marks only the cells it covers.
function cityMaskBlocked(p, b) {
  const blk = new Uint8Array(100 * 63), cellsIn = (lo, hi) => [Math.max(0, Math.ceil((lo - 4) / 8)), Math.min(99, Math.ceil((hi - 4) / 8) - 1)];
    for (const r of b.rects) { const [x0, x1] = cellsIn(r[0], r[2]), [y0, y1] = cellsIn(r[1], r[3]), water = r[4] === 'water';
      for (let my = y0; my <= Math.min(62, y1); my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = x0; mx <= x1; mx++) { const i = my * 100 + mx; if (blk[i]) continue;
        if (water && p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor((mx * 8 + 4) / FG_CELL)]) continue; blk[i] = 1; } } }
    for (const c of b.circles) { const [x0, x1] = cellsIn(c[0] - c[2], c[0] + c[2] + 1), [y0, y1] = cellsIn(c[1] - c[2], c[1] + c[2] + 1);
      for (let my = y0; my <= Math.min(62, y1); my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = x0; mx <= x1; mx++) if (Math.hypot(mx * 8 + 4 - c[0], y - c[1]) < c[2]) blk[my * 100 + mx] = 1; } }
  return blk;
}
function cityRoomMask(cx, cy) {
  cityMasks = cityMasksBy[cityGenKey] || (cityMasksBy[cityGenKey] = {}); for (const ck of Object.keys(cityMasksBy)) if (ck !== cityGenKey && ck.split(':')[0] === cityGenKey.split(':')[0]) delete cityMasksBy[ck];
  const k = cx + ',' + (cy + genDy()); if (k in cityMasks) return cityMasks[k];
  const p = cityGenPlan(k); if (!p) return cityMasks[k] = null;
  const m = new Uint8Array(100 * 63);
  for (let my = 0; my < 63; my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = 0; mx < 100; mx++) m[my * 100 + mx] = p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor((mx * 8 + 4) / FG_CELL)]; }
  // Round 415 (owner: a texture tile can be walked on unless a building, car or other sprite stands on it): in the top-down
  // city all ground can be walked; buildings, parked cars, park trees and the sea (a road over the water stays) cannot.
  if (GEN_THEMES[genTheme()].topdown) { const b = genWith(genTheme(), () => cityBlockers(cityGenSeed, k, p));
    // Round 540 (Codex's review): each blocker marks only the cells whose centres it covers, instead of every cell testing
    // every blocker; the same cells as before (tests/city-mask-raster.test.cjs compares the two)
    const blk = cityMaskBlocked(p, b);
    for (let my = 0; my < 63; my++) { const y = my * 8 + 4; if (y >= 500) continue; for (let mx = 0; mx < 100; mx++) m[my * 100 + mx] = blk[my * 100 + mx] ? 0 : 1; }
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
const cityEnemyBlockBy = {}; let cityEnemyBlock = {}, cityEnemyBlockFor = null;
function cityEnemyOk(key, x, y) {
  // (Round 540, Codex's review: the old seeds' tables are swept when the seed or world changes, not on every call, and each
  // room keeps its floor beside its blockers; patrol placement calls this thousands of times)
  if (cityEnemyBlockFor !== cityGenKey) { cityEnemyBlockFor = cityGenKey; cityEnemyBlock = cityEnemyBlockBy[cityGenKey] || (cityEnemyBlockBy[cityGenKey] = {}); for (const ck of Object.keys(cityEnemyBlockBy)) if (ck !== cityGenKey && ck.split(':')[0] === cityGenKey.split(':')[0]) delete cityEnemyBlockBy[ck]; }
  if (!cityRoomWalk(key, x, y)) return false;
  if (x < 20 || x > 780 || y < 24 || y > 476) return false;
  let b = cityEnemyBlock[key]; if (!b) { const p = cityGenPlan(key); b = cityEnemyBlock[key] = p ? genWith(genTheme(), () => cityBlockers(cityGenSeed, key, p)) : { rects: [], circles: [] }; b.floor = p ? p.floor : null; }
  const bx0 = x - 20, bx1 = x + 20, by0 = y - 24, by1 = y + 24, f = b.floor;
  for (const r of b.rects) { if (bx0 < r[2] && bx1 > r[0] && by0 < r[3] && by1 > r[1]) { if (r[4] === 'water' && f[Math.floor(Math.min(495, y + 22) / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)]) continue; return false; } }
  for (const c of b.circles) { const nx = Math.max(bx0, Math.min(c[0], bx1)), ny = Math.max(by0, Math.min(c[1], by1)); if (Math.hypot(nx - c[0], ny - c[1]) < c[2]) return false; }
  return true;
}
function cityGenWalk(wx, wy) {
  if (wx < 0 || wy < 0) return false;
  if (cityGenStale()) cityGenEnsure();
  const cx = Math.floor(wx / 800), cy = Math.floor(wy / 500), m = cityRoomMask(cx, cy); if (!m) return false;
  return m[Math.floor((wy - cy * 500) / 8) * 100 + Math.floor((wx - cx * 800) / 8)] === 1;
}
// A fast path for the city's rooms (not during the organic engine's patrol pass, where any spot in the room counts), the same answer the organic engine gives (a room's foot point is y+22, read no lower
// than 495; standing is allowed 12px in from the room's sides), without its per-call lookups: new journeys re-plan the
// city, and placement asks hundreds of thousands of these.
const cityKeyMasksBy = new Map(); let cityKeyMasks = new Map(), cityKeyMasksFor = null; // Round 488: each room's mask by its key, for this theme and seed
function cityRoomWalk(key, x, y) {
  if (cityKeyMasksFor !== cityGenKey) { cityKeyMasksFor = cityGenKey; cityKeyMasks = cityKeyMasksBy.get(cityGenKey) || new Map(); cityKeyMasksBy.set(cityGenKey, cityKeyMasks); for (const ck of [...cityKeyMasksBy.keys()]) if (ck !== cityGenKey && ck.split(':')[0] === cityGenKey.split(':')[0]) cityKeyMasksBy.delete(ck); }
  let m = cityKeyMasks.get(key); if (m === undefined) { const c = key.indexOf(','), cx = +key.slice(0, c), cy = +key.slice(c + 1) - genDy(); m = cityRoomMask(cx, cy); cityKeyMasks.set(key, m); } if (!m) return false;
  const X = Math.max(0, Math.min(799, x)), Y = Math.min(495, Math.max(0, Math.min(499, y + 22)));
  return m[Math.floor(Y / 8) * 100 + Math.floor(X / 8)] === 1;
}
{
  const walkableBeforeCity = walkable;
  walkable = function (key, x, y, margin) {
    if (genLive() && rooms[key] && !(typeof organicSpawnPass !== 'undefined' && organicSpawnPass) && GEN_THEMES[genTheme()].topdown && (margin === 26 || margin === 28)) { if (cityGenStale()) cityGenEnsure(); return cityEnemyOk(key, x, y); } // Round 417: a patrol's step or spot
    if (genLive() && rooms[key] && !(typeof organicSpawnPass !== 'undefined' && organicSpawnPass)) { if (cityGenStale()) cityGenEnsure(); return x >= 12 && x <= 788 && y >= 12 && y <= 488 && cityRoomWalk(key, x, y); }
    return walkableBeforeCity.apply(this, arguments);
  };
  const blockedBeforeCity = NeonCity.blocked;
  NeonCity.blocked = function (key, x, y) {
    if (genLive() && rooms[key]) { if (cityGenStale()) cityGenEnsure(); return !cityRoomWalk(key, x, y); }
    return blockedBeforeCity.apply(this, arguments);
  };
}
{
  const walkBefore = neonWorldWalk;
  neonWorldWalk = function (wx, wy) { return genLive() ? cityGenWalk(wx, wy) : walkBefore.apply(this, arguments); };
  // No room has its own painting or hand-listed nooks any more.
  neonRoomArt = function () { return false; };
  const looseBefore = neonLoose;
  neonLoose = function () { return genLive() ? true : looseBefore.apply(this, arguments); };
  const paintBefore = paintNeonWorld;
  paintNeonWorld = function (canvas, key) { return genLive() && genWorldCell(key) ? genWith(genTheme(), () => paintChronoRoom(canvas, key)) : paintBefore.apply(this, arguments); };
  // Objects stand on the generated squares.
  const plazaSpotsBefore = plazaSpots;
  plazaSpots = function (key, region = activeRegion) {
    if (genLive(region) && region === activeRegion) { const p = cityGenPlan(key); if (!p || !p.plazas.length) return null;
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
  const CITY_ITEM_PAD = CITY_ITEM_GAP /* Round 520 (owner): at least 5px between an object and anything else */, cityItemClear = (key, x, y, boxes, o) => { // Round 473: the object's own box (CITY_ITEM_PX) with a 3px margin; with no object given, a 64px one
    const b = o && typeof o === 'object' ? cityItemBox({ x, y, type: o.type || 'chest', event: o.event }, o.type || 'chest') : { x0: x - 32, y0: y - 51, x1: x + 32, y1: y + 14 }, B = [b.x0 - CITY_ITEM_PAD, b.y0 - CITY_ITEM_PAD, b.x1 + CITY_ITEM_PAD, b.y1 + CITY_ITEM_PAD];
    return !boxes.some(b => (!cityEdgesSoft || !b.kind.startsWith('edge:')) && B[0] < b.x1 && B[2] > b.x0 && B[1] < b.y1 && B[3] > b.y0); };
  let cityEdgesSoft = false; // Round 525: set only while a room has no spot clear of its edges as well
  const cityItemBoxesCache = {};
  { // Round 473: the objects' sizes on screen in the city, from CITY_ITEM_PX
    const css = Object.entries(CITY_ITEM_PX).map(([k, w]) => { const sel = k === 'chest' ? '.map-chest' : k === 'relic' ? '.relic:not(.hidden-crystal):not(.gear-relic)' : k.startsWith('event:') ? '.poi-node.poi-event[style*="events/' + k.slice(6) + '"]' : '.poi-node.poi-' + k;
      return '#world#world#world.td-city ' + sel + '{width:' + w + 'px!important;height:' + w + 'px!important}'; }).join('');
    if (typeof document !== 'undefined' && document.createElement && document.head) { const st = document.createElement('style'); st.id = 'city-item-sizes'; st.textContent = css; document.head.append(st); } }
  // an object stands on open ground, never on a street: its foot point (22px under its spot, as everywhere) and the ground
  // a little to each side must be clear of the room's street cells
  const cityItemOnStreet = globalThis.cityItemOnStreet = function (key, x, y) { const wl = genWith(genTheme(), () => genWorld(chronoSeed())), [wx, wy] = GEN_THEMES[genTheme()].world(key), road = (px, py) => px >= 0 && py >= 0 && px < 800 && py < 500 && wl.cell[(wy * FG_ROWS + Math.floor(py / FG_CELL)) * wl.CW + wx * FG_COLS + Math.floor(px / FG_CELL)] === 2; // (the city's street cells: a room's plan also counts the squares' paving as floor)
    return [[0, 22], [-16, 22], [16, 22], [0, 10], [0, 30]].some(([dx, dy]) => road(x + dx, y + dy)); };
  const cityItemSpotClear = globalThis.cityItemSpotClear = function (key, x, y, o) { if (cityGenStale()) cityGenEnsure(); // (Round 473: never against the last journey's city: its plans and boxes could be cached under the new seed)
    const sd = genWith(genTheme(), () => chronoSeed()), ck = genTheme() + ':' + sd + ':' + key /* (the theme too: room keys exist in the city and in Solaris) */, boxes = cityItemBoxesCache[ck] || (cityItemBoxesCache[ck] = genWith(genTheme(), () => citySpriteBoxes(sd, key, cityGenPlan(key)))); return cityItemClear(key, x, y, boxes, o); };
  globalThis.cityItemSpriteClear = (key, x, y, o) => { cityEdgesSoft = true; try { return cityItemSpotClear(key, x, y, o); } finally { cityEdgesSoft = false; } }; // Round 525: clear of every sprite (edges aside)
  // Round 540 (Codex's review): a room's 8px walk grid (organic-paths.js) read straight from the room's mask in the generated
  // worlds: the same points walkable() gives there (12..788 x 14..486, the mask at the foot), without ~5,800 trips through
  // walkable()'s wrappers per room
  if (typeof organicGrid === 'function') { const organicGridBeforeCity = organicGrid;
    organicGrid = function (key) {
      if (!genLive() || !rooms[key] || (typeof organicSpawnPass !== 'undefined' && organicSpawnPass)) return organicGridBeforeCity.apply(this, arguments);
      if (cityGenStale()) cityGenEnsure();
      const o = typeof organicDef === 'function' ? organicDef(key) : null, ck = activeRegion + ':' + key + ':' + (o ? o.def.src : '-');
      if (organicPoints[ck]) return organicPoints[ck];
      const pts = []; for (let py = 14; py <= 486; py += 8) for (let px = 12; px <= 788; px += 8) if (cityRoomWalk(key, px, py)) pts.push(px, py);
      return organicPoints[ck] = pts; }; }
  const itemSpotBefore = organicItemSpot;
  organicItemSpot = function (key, x, y, avoid = [], gap = 0) {
    const p = itemSpotBefore.apply(this, arguments);
    if (!genLive() || !genWorldCell(key) || !cityGenPlan(key)) return p;
    const ok = (cx, cy) => cx >= 60 && cx <= 740 && cy >= 70 && cy <= 440 && walkable(key, cx, cy) && !cityItemOnStreet(key, cx, cy) && cityItemSpotClear(key, cx, cy) && !(typeof screenCovered === 'function' && [[0, 0], [-12, -12], [12, -12], [-12, 24], [12, 24]].some(([a, b]) => screenCovered(cx + a, cy + b))) /* Round 525: the picture, not only its spot, clear of the HUD and minimap */
      && !avoid.some(a => Math.hypot(a.x - cx, a.y - cy) < gap) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, { x: cx, y: cy }));
    if (p && ok(p.x, p.y)) return p;
    const from = p || { x, y }; let best = null, bd = Infinity;
    for (let cy = 72; cy <= 440; cy += 8) for (let cx = 60; cx <= 740; cx += 8) { const d = Math.hypot(cx - from.x, cy - from.y); if (d < bd && ok(cx, cy)) { bd = d; best = { x: cx, y: cy }; } }
    if (!best) { cityEdgesSoft = true; try { for (let cy = 72; cy <= 440; cy += 8) for (let cx = 60; cx <= 740; cx += 8) { const d = Math.hypot(cx - from.x, cy - from.y); if (d < bd && ok(cx, cy)) { bd = d; best = { x: cx, y: cy }; } } } finally { cityEdgesSoft = false; } } // Round 525: as in cityFixSpot
    return best || p;
  };
  // The same rule for spots that don't come through organicItemSpot (a point of interest's own spot table, the start
  // room's waypoint, the city's night objects, chests, the merchant): each is checked once per journey and moved if needed.
  const cityFixCache = {}; let cityFixBusy = false;
  // Round 536: objects placed by relaxing a rule, by theme, seed and room: cityPlacementReport() lists the current world's
  const cityPlacementLog = globalThis.cityPlacementLog = {};
  globalThis.cityPlacementReport = () => { const pre = genTheme() + ':' + String(state && state.seed) + ':'; return Object.keys(cityPlacementLog).filter(k => k.startsWith(pre)).map(k => cityPlacementLog[k]); };
  const cityFixSpot = (key, o) => { if (o && genLive() && cityGenStale()) cityGenEnsure(); if (!o || !genLive() || !rooms[key] || !genWorldCell(key) || !cityGenPlan(key)) return o; const tag = genTheme() + ':' + String(state && state.seed) + ':' + key /* (the theme too: room keys exist in the city and in Solaris; the mark and the cache both carry it) */, mark = () => tag + '@' + Math.round(o.x) + ',' + Math.round(o.y); if (o.cityClear === mark()) return o; // (Round 473: the mark holds the spot it was checked at: a copy moved elsewhere, as the waypoint's is, is checked again)
    const fk = tag + ':' + Math.round(o.x) + ',' + Math.round(o.y), hit = cityFixCache[fk]; if (hit) { o.x = hit[0]; o.y = hit[1]; o.cityClear = mark(); return o; } // (some callers build a new object every time: the answer is kept by spot)
    // the rule in order of what gives way when a room has little open ground: first the HUD and the room's margin, then
    // the patrols' distance down to 60px, then the street, last the patrols' distance; never a sprite, never ground that
    // can't be reached
    // Round 540 (Codex's review): the fallback passes below test the same grid points again and again (up to 18 passes);
    // each answer is kept for this call, by point, tier and whether edges are relaxed
    const okMemo = new Map(), ok = (cx, cy, tier) => { const mk = (cx * 512 + cy) * 8 + tier * 2 + (cityEdgesSoft ? 1 : 0); let v = okMemo.get(mk); if (v === undefined) { v = okRaw(cx, cy, tier); okMemo.set(mk, v); } return v; };
    const okRaw = (cx, cy, tier) => cx >= (tier ? 40 : 60) && cx <= (tier ? 760 : 740) && cy >= (tier ? 56 : 70) && cy <= (tier ? 456 : 440) && walkable(key, cx, cy) && (tier > 1 || !cityItemOnStreet(key, cx, cy)) && cityItemSpotClear(key, cx, cy, o.type ? o : { type: 'chest' })
      && (tier > 0 || !(typeof screenCovered === 'function' && [[0, 0], [-12, -12], [12, -12], [-12, 24], [12, 24]].some(([a, b]) => screenCovered(cx + a, cy + b))) /* Round 525: the picture, not only its spot, clear of the HUD and minimap */) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, { x: cx, y: cy }));
    // the patrols' spots (Round 535: also for the spot the object comes with). Asked from inside roomSpawns (a patrol being
    // placed asks where the objects are), the list can't be had: the answer is then neither cached nor marked, so the object
    // is checked again, patrols and all, the next time it is asked for.
    const skipped = cityFixBusy; let sp = [];
    if (!skipped) { cityFixBusy = true; try { sp = roomSpawns(key) || []; } catch (e) { sp = []; } finally { cityFixBusy = false; } }
    const near = (cx, cy, far) => far > 0 && sp.some(q => Math.hypot(q.x - cx, q.y - cy) < far);
    if (!ok(o.x, o.y, 0) || near(o.x, o.y, 70)) { let best = null, bd = Infinity;
      // Round 525: each step of the old order is tried with the edges' 5px kept, then relaxed, before the next step: clear of the
      // HUD and margin, then not, then on the street
      let how = null; const pass = (soft, list) => { if (best) return; cityEdgesSoft = soft; try { for (const [tier, far] of list) { if (best) break; for (let cy = 56; cy <= 456; cy += 8) for (let cx = 40; cx <= 760; cx += 8) { const d = Math.hypot(cx - o.x, cy - o.y); if (d < bd && ok(cx, cy, tier) && !near(cx, cy, far)) { bd = d; best = [cx, cy]; } } if (best) how = { tier, far, soft }; } } finally { cityEdgesSoft = false; } };
      // (150px from patrols first, a point of interest's own rule, then 70; clear of the HUD before clear of edges. Round 535:
      // off the street an object keeps 70px from the patrols; it used to take the nearest spot at any distance first, and a
      // chest stood 22px from a patrol)
      pass(false, [[0, 152], [0, 70]]); pass(true, [[0, 152], [0, 70]]); pass(false, [[1, 152], [1, 70]]); pass(true, [[1, 152], [1, 70]]);
      // (a small room with no open ground 70px from its patrols: 60px, then the street 70px from them, before an object
      // under a patrol)
      pass(false, [[0, 60], [1, 60]]); pass(true, [[0, 60], [1, 60]]); pass(false, [[2, 152], [2, 70]]); pass(true, [[2, 152], [2, 70]]);
      for (const t of [0, 1, 2]) { pass(false, [[t, 0]]); pass(true, [[t, 0]]); }
      if (best) { o.x = best[0]; o.y = best[1];
        // Round 536: a spot that only some of the rules allowed is written down, with which ones gave way, for QA
        // (cityPlacementReport()); a clean one (off the street, clear of the HUD and the edges, 70px from patrols) isn't
        if (how && (how.tier || how.soft || how.far < 70) && !skipped) cityPlacementLog[tag + ':' + (o.type || o.id || 'object')] = { room: key, type: o.type || o.id || 'object', at: [o.x, o.y],
          gave: [how.tier > 1 ? 'on the street' : '', how.tier > 0 ? 'HUD and margin' : '', how.soft ? 'edge gap' : '', how.far < 70 ? 'patrols ' + (how.far || 'any') + 'px' : ''].filter(Boolean) };
      } else return o; } // (Round 473: nothing found, as while the region is still being set up and no ground counts as reachable yet: not remembered, so it is tried again)
    if (skipped) return o;
    cityFixCache[fk] = [o.x, o.y]; o.cityClear = mark(); return o; };
  // "beside the street" in the city means: on open ground joined to the streets, off the street itself, clear of every sprite
  const besideStreetBeforeCity = organicBesideStreet;
  organicBesideStreet = function (key, p) { if (genLive() && rooms[key] && genWorldCell(key) && cityGenPlan(key)) return walkable(key, p.x, p.y) && !cityItemOnStreet(key, p.x, p.y) && cityItemSpotClear(key, p.x, p.y, p) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, p)); return besideStreetBeforeCity.apply(this, arguments); };
  if (typeof worldPOIs === 'function') { const worldPOIsBefore = worldPOIs; worldPOIs = function () { const t = worldPOIsBefore.apply(this, arguments); if (genLive() && t) for (const k of Object.keys(t)) cityFixSpot(t[k].key || k, t[k]); return t; }; } // (the table itself, for whoever reads it whole)
  if (typeof cityNightsItems === 'function') { const nightsBefore = cityNightsItems; cityNightsItems = function (key = state && state.room) { return nightsBefore.apply(this, arguments).map(it => cityFixSpot(it.key || key, it)); }; } // Round 473: the Wanted Board, the breakers and the vault too
  // Round 540 (owner: "the portal should be placed with the same rules as interactable objects, not overlapping the road and
  // edges"): a world's portal had one fixed spot in every room; in the generated worlds it gets a spot from the objects' rule
  // (off the street, 5px clear of sprites and edges, away from patrols and the HUD), its picture standing on it
  globalThis.cityPortalSpot = key => { const o = cityFixSpot(key, { x: 400, y: 380, type: 'portal', id: 'portal' }); return o && { x: o.x, y: o.y }; };
  if (typeof renderWorld === 'function') { const renderWorldBeforePortal = renderWorld;
    renderWorld = function () { const out = renderWorldBeforePortal.apply(this, arguments);
      const el = genLive() && typeof document !== 'undefined' && document.querySelector ? document.querySelector('#world .region-portal') : null;
      if (el && state && rooms[state.room]) { const p = cityPortalSpot(state.room), art = el.querySelector('.portal-art');
        if (p) { const ah = (art && art.offsetHeight) || 79; el.style.height = 'auto'; el.style.justifyContent = 'flex-start'; el.style.left = Math.round(p.x - 52) + 'px'; el.style.top = Math.round(p.y + 16 - ah) + 'px'; el.dataset.spot = Math.round(p.x) + ',' + Math.round(p.y); } }
      return out; }; }
  const poiAtBeforeCityClear = poiAt; poiAt = function (key) { return cityFixSpot(key, poiAtBeforeCityClear.apply(this, arguments)); };
  if (typeof chestFor === 'function') { const chestForBefore = chestFor; chestFor = function (key) { return cityFixSpot(key, chestForBefore.apply(this, arguments)); }; }
  if (typeof cardsmithFor === 'function') { const cardsmithForBefore = cardsmithFor; cardsmithFor = function () { const c = cardsmithForBefore.apply(this, arguments); return c && c.key ? cityFixSpot(c.key, c) : c; }; }
  if (typeof merchantRoom === 'function') { const merchantRoomBefore = merchantRoom; merchantRoom = function () { const m = merchantRoomBefore.apply(this, arguments); return m && m.key ? cityFixSpot(m.key, m) : m; }; }
  if (typeof ROOM_SPOT_FIXES !== 'undefined') delete ROOM_SPOT_FIXES.city;
  if (typeof organicDef === 'function') { const defBefore = organicDef; organicDef = function () { if (genLive()) cityGenEnsure(); return defBefore.apply(this, arguments); }; }
  const configureBefore = configureRegion;
  configureRegion = function (region) { if (genLive(region)) { const was = activeRegion; activeRegion = region; try { cityGenEnsure(); } finally { activeRegion = was; } }
    const out = configureBefore.apply(this, arguments);
    // Round 486: the generated Solaris has no diagonal roads (its rooms stay joined through their straight doors)
    if ((region === 'elaris' || region === 'sky' || region === 'wilds') && genLive(region)) for (const k of Object.keys(rooms)) for (const d of Object.keys(rooms[k].exits || {})) if (d.length > 1) delete rooms[k].exits[d]; // (Round 548: the Sky Isles too)
    if ((region === 'sky' || region === 'wilds') && genLive(region) && GEN_THEMES[region].extraLinks) for (const [a, d, b] of GEN_THEMES[region].extraLinks()) if (rooms[a] && rooms[b] && !rooms[a].exits[d]) rooms[a].exits[d] = b; // (the straight links that replace a diagonal walkway)
    return out; };
  // A position off the generated roads (an older save, or a fall-back spot) moves to the room's hub.
  const renderBefore = renderWorld;
  renderWorld = function () {
    if (state && genLive() && !state.battle && state.pos && rooms[state.room] && !walkable(state.room, state.pos.x, state.pos.y)) { const p = cityGenPlan(state.room); if (p) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    const out = renderBefore.apply(this, arguments);
    // Round 441 (owner: "reduce interactable object size, increase building size"): smaller objects in the top-down city
    const w = document.getElementById('world'); if (w) w.classList.toggle('td-city', genLive() && typeof GEN_THEMES !== 'undefined');
    return out;
  };
  const saveBefore = save;
  save = function () { if (state) state.cityGen = CITY_GEN_VERSION; return saveBefore.apply(this, arguments); };
  // Round 448: a new journey starts on the street at once. The start spot (400,300) is only on a street in some cities;
  // it used to be put right when the room was first drawn, after the tutorial.
  const newGameBeforeCity = newGame;
  newGame = function () { const out = newGameBeforeCity.apply(this, arguments);
    if (state && genLive() && rooms[state.room] && state.pos) { cityGenEnsure(); const p = cityGenPlan(state.room); if (p && !cityRoomWalk(state.room, state.pos.x, state.pos.y)) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    return out; };
}
// Patrols keep 120px from every door's landing spot in the generated city (walking in never starts a fight); a patrol that
// cannot is moved to the farthest spot on the road from the doors.
{
  const roomSpawnsBeforeCity = roomSpawns;
  roomSpawns = function (key) {
    const list = roomSpawnsBeforeCity.apply(this, arguments);
    if (!genLive() || !Array.isArray(list) || list.cityDoorsChecked || !rooms[key]) return list;
    const doors = ['n', 's', 'e', 'w'].map(d => rooms[key].exits[d] && organicDoor(key, d)).filter(Boolean).map(d => d.inward);
    const far = (x, y) => Math.min(Infinity, ...doors.map(d => Math.hypot(x - d.x, y - d.y)));
    // Round 417: a patrol (or boss) stands only where its whole sprite is clear of objects; else the nearest such spot on the road
    if (GEN_THEMES[genTheme()].topdown) for (const s of list) { if (cityEnemyOk(key, s.x, s.y)) continue; const pts = organicGrid(key); let best = null;
      for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; if (!cityEnemyOk(key, x, y) || (!s.boss && far(x, y) < 120) || list.some(o => o !== s && Math.hypot(o.x - x, o.y - y) < 90)) continue; const d = Math.hypot(x - s.x, y - s.y); if (!best || d < best.d) best = { x, y, d }; }
      if (best) { s.x = best.x; s.y = best.y; } }
    for (const s of list) {
      if (s.boss || far(s.x, s.y) >= 120) continue;
      const others = list.filter(o => o !== s);
      const q = typeof organicSpot === 'function' && (organicSpot(key, s.x, s.y, doors.concat(others), 125) || organicSpot(key, s.x, s.y, doors, 125));
      const eok = (x, y) => !GEN_THEMES[genTheme()].topdown || cityEnemyOk(key, x, y);
      if (q && far(q.x, q.y) >= 120 && eok(q.x, q.y)) { s.x = q.x; s.y = q.y; continue; }
      let best = null; const pts = organicGrid(key);
      for (let i = 0; i < pts.length; i += 2) { const d = far(pts[i], pts[i + 1]); if (others.every(o => Math.hypot(o.x - pts[i], o.y - pts[i + 1]) > 90) && eok(pts[i], pts[i + 1]) && (!best || d > best.d)) best = { x: pts[i], y: pts[i + 1], d }; }
      if (best && best.d > far(s.x, s.y)) { s.x = best.x; s.y = best.y; }
    }
    if (Object.isExtensible(list)) Object.defineProperty(list, 'cityDoorsChecked', { value: true });
    return list;
  };
}
// Round 486: Solaris in play on the generator. Its ground is painted by the generator, its organic walk area reads the
// generated walk mask, and it has no diagonal roads (worldDiagTable answers none; configureRegion drops those exits).
{
  if (typeof paintSolaris === 'function') { const paintSolarisBefore = paintSolaris; paintSolaris = function (canvas, key) { if (activeRegion === 'elaris' && genLive('elaris') && rooms[key]) { cityGenEnsure(); return genWith('solaris', () => paintChronoRoom(canvas, key)); } return paintSolarisBefore.apply(this, arguments); }; }
  if (typeof ORGANIC_AREAS !== 'undefined' && ORGANIC_AREAS['world:elaris']) { const A = ORGANIC_AREAS['world:elaris'], atBefore = A.at;
    A.at = function (o, ax, ay) { if (!genLive('elaris')) return atBefore.apply(this, arguments); if (ay >= 0 && ay < 500) ay = Math.min(ay, 495); return cityGenWalk(o.area.left * 800 + ax, o.area.top * 500 + ay); }; }
  if (typeof worldDiagTable === 'function') { const diagBefore = worldDiagTable; worldDiagTable = function () { return (activeRegion === 'elaris' || activeRegion === 'sky' || activeRegion === 'wilds') && genLive(activeRegion) ? {} : diagBefore.apply(this, arguments); }; }
  // Round 548: the Sky Isles the same way: painted by the generator, walked on its mask, no diagonal walkways
  if (typeof paintTileWorld === 'function') { const paintTileBefore = paintTileWorld; paintTileWorld = function (canvas, id, key) { if ((id === 'sky' || id === 'wilds') && genLive(id) && rooms[key]) { cityGenEnsure(); return genWith(id, () => paintChronoRoom(canvas, key)); } /* (Round 552: Elaris too) */ return paintTileBefore.apply(this, arguments); }; }
  for (const W of ['sky', 'wilds']) if (typeof ORGANIC_AREAS !== 'undefined' && ORGANIC_AREAS['world:' + W]) { const A = ORGANIC_AREAS['world:' + W], atBefore = A.at;
    A.at = function (o, ax, ay) { if (!genLive(W)) return atBefore.apply(this, arguments); if (ay >= 0 && ay < 500) ay = Math.min(ay, 495); return cityGenWalk(o.area.left * 800 + ax, o.area.top * 500 + ay); }; }
}
// Objects in the generated Solaris are placed as in the city (open ground beside the streets, clear of every sprite), not
// on the old tile world's "ground 22-40px inside its edge" (Round 212).
if (typeof itemsOnGround === 'function') { const onGroundBefore = itemsOnGround; itemsOnGround = function () { return (activeRegion === 'elaris' || activeRegion === 'sky' || activeRegion === 'wilds') && genLive(activeRegion) ? false : onGroundBefore.apply(this, arguments); }; }
