'use strict';
// =====================================================================
// Round 229: each world's first Nexus Waypoint is no longer in the room you arrive in. It stands a
// few rooms in (three steps from the start), in a room with nothing else in it: no point of interest,
// merchant, Cardsmith, chest, relic, event or patrol. The rooms were picked with the game's own
// checks (tests/waypoints.test.cjs re-checks them in every world).
// NEXUS_POINTS[world].start now names that room; the arrival room is NEXUS_POINTS[world].arrival.
// =====================================================================
const FIRST_WAYPOINT_ROOMS = { city: '1,7', elaris: '1,2', sky: '5,0', wilds: '6,4', vespera: '1,3', chronospire: '0,2' };
for (const [region, key] of Object.entries(FIRST_WAYPOINT_ROOMS)) {
  const nx = NEXUS_POINTS[region]; if (!nx) continue;
  nx.arrival = nx.arrival || nx.start; nx.start = key;
}
function firstWaypointRoom(region = activeRegion) { return FIRST_WAYPOINT_ROOMS[region] || null; }

// Nothing else is placed in the waypoint's room (points of interest, the merchant and the Cardsmith all
// choose from the eligible rooms)...
const poiEligibleBeforeWaypoints = poiEligible;
poiEligible = function (key) { return key !== firstWaypointRoom() && poiEligibleBeforeWaypoints(key); };
// ...and no patrols walk there.
const roomSpawnsBeforeWaypoints = roomSpawns;
roomSpawns = function (key) {
  const list = roomSpawnsBeforeWaypoints(key);
  return key === firstWaypointRoom() ? list.filter(s => s.boss) : list;
};
// The waypoint itself, placed like the middle one.
const worldPOIsBeforeWaypoints = worldPOIs;
worldPOIs = function (region = activeRegion) {
  const out = worldPOIsBeforeWaypoints(region), key = firstWaypointRoom(region);
  if (key && rooms[key] && region === activeRegion && !(out[key] && out[key].type === 'nexus')) {
    const spot = poiSpot(key) || [400, 250];
    out[key] = { key, type: 'nexus', x: spot[0], y: spot[1], id: region + ':nexus:' + key };
  }
  return out;
};
const poiAtBeforeWaypoints = poiAt;
poiAt = function (key) {
  if (key === firstWaypointRoom()) return worldPOIs()[key] || null;
  const nx = NEXUS_POINTS[activeRegion];
  if (nx && key === nx.arrival) { const p = poiAtBeforeWaypoints(key); return p && p.type === 'nexus' ? null : p; } // the arrival room has no waypoint now
  return poiAtBeforeWaypoints(key);
};
// Discovering it says so, as the middle one does.
const discoverNexusBeforeWaypoints = discoverNexus;
discoverNexus = function () {
  const found = discoverNexusBeforeWaypoints.apply(this, arguments);
  if (found && state.room === firstWaypointRoom() && rooms[state.room]) toast('⟟ Nexus Waypoint discovered: ' + rooms[state.room].name + '. Teleport here from the map.');
  return found;
};
// Saves that discovered a world's old start-room waypoint keep it, now in its new room.
const ensureExploreBeforeWaypoints = ensureExplore;
ensureExplore = function (s = state) {
  const r = ensureExploreBeforeWaypoints.apply(this, arguments);
  if (s && s.poi && Array.isArray(s.poi.nexus)) {
    for (const [region, nx] of Object.entries(NEXUS_POINTS)) {
      if (!nx.arrival || nx.arrival === nx.start) continue;
      const old = region + ':' + nx.arrival, now = region + ':' + nx.start, i = s.poi.nexus.indexOf(old);
      if (i >= 0) { if (s.poi.nexus.includes(now)) s.poi.nexus.splice(i, 1); else s.poi.nexus[i] = now; }
    }
  }
  return r;
};
