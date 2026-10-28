'use strict';
// =====================================================================
// Round 275 (owner: "I keep hitting invisible boundaries"): every chest, relic, point of interest, Nexus
// Waypoint, the merchant and the Cardsmith get a small walkable pad around them, so walking straight at
// one carries you onto it instead of stopping at the edge of the traced street.
//
// Items stand just beside the walk mask (Round 93: 12-28px off the street, or Round 212: on the ground near
// its edge). The mask is traced from the painting and has notches and kerbs, so straight approaches often
// stopped short, outside the item's reach (Round 275 measured over half of them in Elaris and Vespera).
//
// The pads count for player movement only (collides(), the step-back and snap checks in neon-world.js).
// walkable() and NeonCity.blocked stay as they were, because items are placed from them: the pads must not
// feed back into where items stand, the pockets, or patrols.
// =====================================================================
const ITEM_PAD_EXTRA = 24; // the pad reaches this far past the item's trigger radius
const itemPadCache = {};
function itemPadsFor(key) {
  if (!state || !rooms[key] || typeof organicDef !== 'function' || !organicDef(key)) return [];
  const ck = activeRegion + ':' + key + ':' + state.seed;
  if (itemPadCache[ck]) return itemPadCache[ck];
  const pads = [], add = (p, reach) => { if (p && typeof p.x === 'number' && typeof p.y === 'number') pads.push({ x: p.x, y: p.y, r: reach + ITEM_PAD_EXTRA }); };
  add(poiAt(key), 40);
  if (typeof chestFor === 'function') add(chestFor(key), 38);
  const relic = rooms[key].relic; if (relic) add({ x: relic[3], y: relic[4] }, 48);
  const shop = typeof merchantRoom === 'function' && merchantRoom(); if (shop && shop.key === key) add(shop, 40);
  const smith = typeof cardsmithFor === 'function' && cardsmithFor(); if (smith && smith.key === key) add(smith, 40);
  return itemPadCache[ck] = pads;
}
function itemPadAt(key, x, y) {
  if (x < 12 || x > 788 || y < 12 || y > 488) return false;
  return itemPadsFor(key).some(p => Math.hypot(x - p.x, y - p.y) < p.r);
}
const collidesBeforeItemPads = collides;
collides = function (x, y) { return collidesBeforeItemPads(x, y) && !itemPadAt(state.room, x, y); };
