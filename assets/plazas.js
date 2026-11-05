'use strict';
// =====================================================================
// Round 232: in the tile worlds, chests, gear, points of interest, the merchant, the Cardsmith and
// Nexus Waypoints stand in the open squares beside the road (a paved yard, a ruin's flagstones, a
// clearing), not on the road itself. tools/plazas.py lists them per painting; the builders open each
// one up to the walk mask and write each room's spots into the world's data (SOLARIS_PLAZAS, and
// TILE_WORLD_DATA[world].plazas). Neon Aftermath already does this with its hand-picked nooks.
// A room whose painting has no such square keeps the old spot beside the road.
// =====================================================================
function plazaSpots(key, region = activeRegion) {
  const t = region === 'elaris' ? (typeof SOLARIS_PLAZAS !== 'undefined' ? SOLARIS_PLAZAS : null)
    : typeof TILE_WORLD_DATA !== 'undefined' && TILE_WORLD_DATA[region] ? TILE_WORLD_DATA[region].plazas : null;
  return t && t[key] && t[key].length ? t[key] : null;
}
function isPlazaSpot(key, p) { const s = plazaSpots(key); return !!s && s.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < 6 || Math.hypot(x - p.x, y - p.y) <= 46); } // Round 358: a nudged spot still counts
// Round 358: the nearest point within 32px of a square where the whole object picture stands on walkable ground.
const plazaFitCache = {}, PLAZA_COVER = 0.55;
function plazaFit(key, x, y) {
  if (typeof itemGroundCover !== 'function') return [x, y];
  const ck = activeRegion + ':' + key + ':' + x + ',' + y; if (ck in plazaFitCache) return plazaFitCache[ck];
  let best = null, bd = Infinity;
  for (let dx = -32; dx <= 32; dx += 8) for (let dy = -32; dy <= 32; dy += 8) {
    // The squares are hand-picked open ground beside the road; the walk mask covers only part of some (the forest's and
    // the storm coast's clearings, about 2/3), so a square needs 55% here rather than the 90% elsewhere.
    const d = Math.hypot(dx, dy); if (d >= bd || !walkable(key, x + dx, y + dy) || itemGroundCover(key, x + dx, y + dy) < PLAZA_COVER) continue;
    bd = d; best = [x + dx, y + dy];
  }
  return plazaFitCache[ck] = best;
}
// The square nearest the wanted spot, clear of `avoid` by `gap`, preferring ones the HUD and minimap don't cover.
function plazaFor(key, x, y, avoid = [], gap = 0) {
  const spots = plazaSpots(key); if (!spots) return null;
  let best = null, bs = Infinity;
  for (const [sx, sy] of spots) {
    // Round 358: the object must stand fully on the square's open ground; nudge it up to 32px within the square if needed.
    const fit = plazaFit(key, sx, sy); if (!fit) continue;
    const [px, py] = fit;
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
    const p = plazaFor(key, x, y, avoid, gap); // each caller's own gap (points of interest keep 150px from patrols)
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
// Patrols keep well clear of the squares (160px where the path allows, else 120 or 90), so what stands
// there is not right beside a fight.
const PLAZA_PATROL_GAPS = [160, 120, 90];
const roomSpawnsBeforePlazas = roomSpawns;
roomSpawns = function (key) {
  const list = roomSpawnsBeforePlazas.apply(this, arguments), spots = plazaSpots(key);
  if (!spots || !Array.isArray(list) || list.plazaPlaced) return list;
  const squares = spots.map(([x, y]) => ({ x, y })), placed = [];
  for (const s of list) {
    for (const gap of PLAZA_PATROL_GAPS) {
      if (squares.every(q => Math.hypot(q.x - s.x, q.y - s.y) >= gap)) break;
      const p = organicSpot(key, s.x, s.y, squares.concat(placed), gap) || organicSpot(key, s.x, s.y, squares, gap);
      if (p) { s.x = p.x; s.y = p.y; break; }
    }
    placed.push({ x: s.x, y: s.y });
  }
  if (Object.isExtensible(list)) Object.defineProperty(list, 'plazaPlaced', { value: true });
  return list;
};
