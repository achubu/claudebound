'use strict';
// =====================================================================
// Round 262 (owner request: make Armor matter, or remove it). Your Armor (Reactive Plating and Armor
// gear) took a flat amount off every hit while enemy attacks grow about fourfold across the worlds:
// rank 5 Plating's 8 Armor blocked about two thirds of a Neon Aftermath patrol's hit but about 15% of
// a Chronospire one. Now Armor grows with the world: Plating gives 1 / 2 / 3 / 4 / 5 base Armor (ranks
// 1-5), gear adds its own, and the total is multiplied by the world's scale (about the world's average
// regular attack over Neon Aftermath's), so full Plating blocks roughly 40% of a regular hit everywhere.
// Charged and heavy hits are bigger, so Armor blocks less of them. Shear (Sky Isles) still ignores it.
// =====================================================================
const ARMOR_WORLD_SCALE = { city: 1, elaris: 2.4, sky: 2.8, wilds: 3.6, vespera: 3.2, chronospire: 4.2 };
const PLATING_STEPS = [0, 1, 2, 3, 4, 5];
function armorScale(region = typeof activeRegion === 'string' ? activeRegion : 'city') { return ARMOR_WORLD_SCALE[region] || 1; }
function baseArmor() { return PLATING_STEPS[Math.min(5, talentRank('plating'))] + (typeof gearStat === 'function' ? gearStat('armor') : 0); }
const scaledRankBeforeArmorScale = scaledRank;
scaledRank = function (id) {
  if (id !== 'plating') return scaledRankBeforeArmorScale.apply(this, arguments);
  return Math.round(baseArmor() * armorScale());
};
for (const n of TALENT_BRANCHES.resolve.nodes) if (n.id === 'plating')
  n.desc = 'Gain 1 / 2 / 3 / 4 / 5 Armor (ranks 1-5), growing with each world (×1 in Neon Aftermath up to ×4.2 in Chronospire). Armor reduces every incoming hit and lasts throughout the encounter.';
