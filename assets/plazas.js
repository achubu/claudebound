'use strict';
// =====================================================================
// Round 232: in the tile worlds, chests, gear, points of interest, the merchant, the Cardsmith and
// Nexus Waypoints stand in the open squares beside the road (a paved yard, a ruin's flagstones, a
// clearing), not on the road itself. tools/plazas.py lists them per painting; the builders open each
// one up to the walk mask and write each room's spots into the world's data (SOLARIS_PLAZAS, and
// TILE_WORLD_DATA[world].plazas). Neon Aftermath already does this with its hand-picked nooks.
// A room whose painting has no such square keeps the old spot beside the road.
// =====================================================================
const PLAZA_GAP_MIN = 70; // how close a square may be to a patrol or another item before it is passed over
function plazaSpots(key, region = activeRegion) {
  const t = region === 'elaris' ? (typeof SOLARIS_PLAZAS !== 'undefined' ? SOLARIS_PLAZAS : null)
    : typeof TILE_WORLD_DATA !== 'undefined' && TILE_WORLD_DATA[region] ? TILE_WORLD_DATA[region].plazas : null;
  return t && t[key] && t[key].length ? t[key] : null;
}
function isPlazaSpot(key, p) { const s = plazaSpots(key); return !!s && s.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < 6); }
// The square nearest the wanted spot, clear of `avoid` by `gap`, preferring ones the HUD and minimap don't cover.
function plazaFor(key, x, y, avoid = [], gap = 0) {
  const spots = plazaSpots(key); if (!spots) return null;
  let best = null, bs = Infinity;
  for (const [px, py] of spots) {
    if (avoid.some(a => Math.hypot(a.x - px, a.y - py) < gap)) continue;
    if (typeof organicReachableAt === 'function' && !organicReachableAt(key, { x: px, y: py })) continue;
    const s = Math.hypot(px - x, py - y) + (screenCovered(px, py) ? 400 : 0);
    if (s < bs) { bs = s; best = { x: px, y: py }; }
  }
  return best;
}
const organicItemSpotBeforePlazas = organicItemSpot;
organicItemSpot = function (key, x, y, avoid = [], gap = 0) {
  if (plazaSpots(key)) {
    const p = plazaFor(key, x, y, avoid, gap) || (gap > PLAZA_GAP_MIN ? plazaFor(key, x, y, avoid, PLAZA_GAP_MIN) : null);
    if (p) return p;
  }
  return organicItemSpotBeforePlazas.apply(this, arguments);
};
// A square is on walkable ground, opened up to the road: it counts as beside the street.
const organicBesideStreetBeforePlazas = organicBesideStreet;
organicBesideStreet = function (key, p) {
  if (isPlazaSpot(key, p)) return walkable(key, p.x, p.y) && (typeof organicReachableAt !== 'function' || organicReachableAt(key, p));
  return organicBesideStreetBeforePlazas.apply(this, arguments);
};
// Patrols keep out of the squares, so what stands there is not right beside a fight.
const PLAZA_PATROL_GAP = 90;
const roomSpawnsBeforePlazas = roomSpawns;
roomSpawns = function (key) {
  const list = roomSpawnsBeforePlazas.apply(this, arguments), spots = plazaSpots(key);
  if (!spots || !Array.isArray(list) || list.plazaPlaced) return list;
  const squares = spots.map(([x, y]) => ({ x, y })), placed = [];
  for (const s of list) {
    if (squares.some(q => Math.hypot(q.x - s.x, q.y - s.y) < PLAZA_PATROL_GAP)) {
      const p = organicSpot(key, s.x, s.y, squares.concat(placed), PLAZA_PATROL_GAP) || organicSpot(key, s.x, s.y, squares, PLAZA_PATROL_GAP);
      if (p) { s.x = p.x; s.y = p.y; }
    }
    placed.push({ x: s.x, y: s.y });
  }
  if (Object.isExtensible(list)) Object.defineProperty(list, 'plazaPlaced', { value: true });
  return list;
};
