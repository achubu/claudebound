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
function cityGenWalk(wx, wy) {
  const x = Math.floor(wx / 8) * 8 + 4, y = Math.floor(wy / 8) * 8 + 4; if (x < 0 || y < 0) return false;
  const cx = Math.floor(x / 800), cy = Math.floor(y / 500), p = cityGenPlan(cx + ',' + (cy + 4));
  return !!p && p.floor[Math.floor((y - cy * 500) / FG_CELL) * FG_COLS + Math.floor((x - cx * 800) / FG_CELL)] === 1;
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
