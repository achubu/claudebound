'use strict';
// =====================================================================
// Round 358 (owner review of every Neon Aftermath object, numbered #1-#31): hand-placed spots, one per room. Since
// Round 350 a room holds at most one object, so whatever stands in one of these rooms (a point of interest, a chest,
// gear, the merchant, the Cardsmith, a Wanted Board, vault or breaker) is drawn and used at this spot. Spots are room
// pixels; a picture stands on its spot (rises about 31px above it).
// =====================================================================
const ROOM_SPOT_FIXES = {
  city: {
    '3,4': [580, 202],  // #3 Breaker Box: to the other side of the road
    '5,4': [338, 262],  // #5 chest: up
    '1,5': [468, 252],  // #7 Afterlight Vault: left, onto the road's end
    '3,5': [470, 330],  // #8 merchant: a new spot beside the road
    '4,5': [540, 158],  // #9 Nexus Waypoint: down slightly
    '5,5': [470, 340],  // #10 Sealed Cache: a new spot beside the road
    '0,6': [490, 200],  // #11 Wanted Board: a new spot by the park
    '2,6': [576, 302],  // #13 campfire: up and right 50px
    '3,6': [448, 340],  // #14 shrine: left
    '6,6': [560, 198],  // #15 shrine: the walkway by the road
    '7,6': [478, 368],  // #16 Breaker Box: onto the grass to the left
    '8,6': [200, 195],  // #17 terminal: a new spot by the road
    '0,7': [285, 360],  // #18 terminal: near the road
    '2,7': [482, 330],  // #20 Cardsmith: near the road
    '3,7': [565, 318],  // #21 chest: a new spot
    '5,7': [480, 300],  // #22 Ember Gloves: the plaza
    '6,7': [535, 302],  // #23 Breaker Box: up, closer to the road
    '1,8': [620, 195],  // #25 terminal: slightly right
    '2,8': [470, 420],  // #26 campfire: closer to the road
    '3,8': [630, 365],  // #27 Street Medic: next to the road
    // Owner: "only add objects to curbs or grass": every other room, picked on its painting (kerb/pavement or grass beside
    // the street).
    '0,4': [341, 304],  // pavement left of the road
    '1,4': [134, 212],  // quayside pavement above the road
    '2,4': [130, 204],  // quayside pavement above the road
    '4,4': [484, 246],  // pavement above the road's end
    '6,4': [320, 346],  // stone walk left of the road
    '7,4': [510, 445],  // pavement below the road
    '8,4': [520, 440],  // stone walk below the road
    '0,5': [334, 226],  // quayside pavement left of the road
    '2,5': [322, 200],  // pavement left of the road
    '6,5': [120, 344],  // walk below the road
    '7,5': [480, 340],  // pavement below the road
    '8,5': [192, 360],  // walk below the road
    '1,6': [150, 350],  // plaza paving below the road
    '4,6': [470, 420],  // pavement below the road
    '5,6': [320, 236],  // pavement below the road
    '1,7': [496, 334],  // grass below the road
    '4,7': [255, 250],  // pavement right of the road
    '7,7': [162, 160],  // pavement above the road
    '8,7': [142, 236],  // packed dirt beside the road
    '0,8': [600, 195],  // pavement right of the road
    '4,8': [250, 195],  // grass below the road
    '5,8': [440, 170],  // pavement above the road
    '6,8': [322, 340],  // pavement above the road
    '7,8': [290, 300],  // ground left of the road
    '8,8': [200, 188],  // pavement above the road
    '0,9': [560, 425],  // grass below the road
    '1,9': [600, 198],  // grass below the road
    '2,9': [492, 202],  // walk right of the road
    '3,9': [512, 392],  // grass below the road
    '4,9': [600, 196],  // walk below the road
    '5,9': [470, 120],  // pavement below the road
    '6,9': [596, 204],  // pavement above the road
    '7,9': [150, 200],  // pavement above the road
    '8,9': [330, 360],  // pavement above the road
  },
};
function roomSpotFix(key) { const t = ROOM_SPOT_FIXES[activeRegion]; return (t && t[key]) || null; }
function withSpotFix(key, p) { const f = p && roomSpotFix(key); return f ? { ...p, x: f[0], y: f[1] } : p; }
if (typeof poiAt === 'function') { const poiAtBeforeFix = poiAt; poiAt = function (key) { return withSpotFix(key, poiAtBeforeFix.apply(this, arguments)); }; }
if (typeof worldPOIs === 'function') {
  const worldPOIsBeforeFix = worldPOIs;
  worldPOIs = function () {
    const all = worldPOIsBeforeFix.apply(this, arguments);
    if (all && ROOM_SPOT_FIXES[activeRegion]) for (const k of Object.keys(ROOM_SPOT_FIXES[activeRegion])) if (all[k]) { const f = roomSpotFix(k); all[k].x = f[0]; all[k].y = f[1]; }
    return all;
  };
}
if (typeof chestFor === 'function') { const chestForBeforeFix = chestFor; chestFor = function (key) { return withSpotFix(key, chestForBeforeFix.apply(this, arguments)); }; }
if (typeof merchantRoom === 'function') { const merchantRoomBeforeFix = merchantRoom; merchantRoom = function () { const m = merchantRoomBeforeFix.apply(this, arguments); return m ? withSpotFix(m.key, m) : m; }; }
if (typeof cardsmithFor === 'function') { const cardsmithForBeforeFix = cardsmithFor; cardsmithFor = function () { const c = cardsmithForBeforeFix.apply(this, arguments); return c ? withSpotFix(c.key, c) : c; }; }
if (typeof cardsmithSpot === 'function') { const cardsmithSpotBeforeFix = cardsmithSpot; cardsmithSpot = function (key) { const s = cardsmithSpotBeforeFix.apply(this, arguments), f = roomSpotFix(key); return f ? { ...s, x: f[0], y: f[1] } : s; }; }
if (typeof cityNightsItems === 'function') { const cityNightsItemsBeforeFix = cityNightsItems; cityNightsItems = function (key = state && state.room) { return cityNightsItemsBeforeFix.apply(this, arguments).map(i => withSpotFix(i.key || key, i)); }; }
if (typeof worldRelayItems === 'function') { const worldRelayItemsBeforeFix = worldRelayItems; worldRelayItems = function (key = state && state.room) { return worldRelayItemsBeforeFix.apply(this, arguments).map(i => withSpotFix(i.key || key, i)); }; }
// Gear lying in a fixed room.
if (typeof configureRegion === 'function') {
  const configureRegionBeforeFix = configureRegion;
  configureRegion = function () {
    const out = configureRegionBeforeFix.apply(this, arguments);
    for (const [k, f] of Object.entries(ROOM_SPOT_FIXES[activeRegion] || {})) if (rooms[k] && rooms[k].relic) { rooms[k].relic[3] = f[0]; rooms[k].relic[4] = f[1]; }
    return out;
  };
}
