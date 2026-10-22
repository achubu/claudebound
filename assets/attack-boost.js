'use strict';
// =====================================================================
// Round 240 (owner request): attack cards deal 25% more damage in every world after Neon Aftermath.
// Each attack card's printed damage numbers are scaled (rounded) when a later world is configured,
// and put back in Neon Aftermath, so card text, live bonuses and the damage dealt all agree:
// base damage, Tempest Surge's damage per energy, Bulwark Bash's bonus over your Block, and the damage
// in Tailwind, Follow-through, Amplify and Choose-one modes. Talent, crystal and Boost bonuses are added
// on top as before. Loaded late, after every card is defined.
// =====================================================================
const ATTACK_BOOST = 1.25;
const ATTACK_BOOST_FIELDS = ['damage', 'xDamage', 'blockStrike'];
const attackBoostBase = {}; // id -> the printed tiers, as defined
for (const [id, def] of Object.entries(defs)) if (/Attack/.test(def.kind || '') && Array.isArray(def.tiers)) attackBoostBase[id] = JSON.parse(JSON.stringify(def.tiers));
function boostTier(t) {
  const out = JSON.parse(JSON.stringify(t)), up = n => Math.round(n * ATTACK_BOOST);
  for (const k of ATTACK_BOOST_FIELDS) if (typeof out[k] === 'number' && out[k] > 0) out[k] = up(out[k]);
  for (const k of ['tailwind', 'follow', 'amplify']) if (out[k] && typeof out[k].damage === 'number') out[k].damage = up(out[k].damage);
  if (Array.isArray(out.modes)) out.modes.forEach(m => { if (typeof m.damage === 'number') m.damage = up(m.damage); });
  return out;
}
function attackBoostOn(region) { return typeof region === 'string' && region !== 'city' && !globalThis.NO_ATTACK_BOOST; } // NO_ATTACK_BOOST: the simulator's off switch
let attackBoosted = null;
function applyAttackBoost(region) {
  const on = attackBoostOn(region); if (attackBoosted === on) return;
  for (const [id, tiers] of Object.entries(attackBoostBase)) {
    const now = on ? tiers.map(boostTier) : JSON.parse(JSON.stringify(tiers));
    defs[id].tiers.splice(0, defs[id].tiers.length, ...now); // in place: other code keeps references to the array
  }
  attackBoosted = on;
}
const configureRegionBeforeAttackBoost = configureRegion;
configureRegion = function (region) { applyAttackBoost(region); return configureRegionBeforeAttackBoost.apply(this, arguments); };
if (typeof activeRegion === 'string') applyAttackBoost(activeRegion);
