'use strict';
// =====================================================================
// Round 244 (owner request): enemy Armor grows with the worlds. Only Neon Aftermath's species had real
// Armor (Round 1); later worlds grew HP and attack instead, while cards grew to 8-16 damage, so 0-2
// Armor no longer mattered and rarely showed. Now every enemy after Neon Aftermath has at least its
// world's Armor: regular enemies from ARMOR_BY_WORLD's low end near the world's start to its high end
// at the far side (regionDistanceFrac), elites +1, mini-bosses +2 over the top, final bosses +3.
// A species whose own Armor is higher keeps it. Pierce ignores Armor and Breach Spike strips it, so
// those cards (and fewer, bigger hits) count for more. Enemy HP is trimmed per world
// (ARMOR_HP_FACTOR, tuned with the Difficulty lab) so win rates stay where they were.
// Applied when a fight starts, after enemy-pairs.js, so both of a pair get it.
// =====================================================================
// Round 262 (owner: "I never see or feel enemy Armor"): roughly doubled, so it takes a real share of a hit
// (most of a small multi-hit one) and Pierce, Sunder and Breach Spike matter.
const ARMOR_BY_WORLD = { elaris: [2, 4], sky: [3, 5], wilds: [4, 7], vespera: [5, 8], chronospire: [6, 10] };
const ARMOR_HP_FACTOR = { elaris: 0.95, sky: 0.88, wilds: 0.75, vespera: 0.8, chronospire: 0.82 }; // tuned with the Difficulty lab (CHANGES.md)
// Solaris's bosses keep their own Armor: cards are still small there and they were already hard.
const ARMOR_BOSS_WORLDS = ['sky', 'wilds', 'vespera', 'chronospire'];
function worldArmor(e, region = activeRegion, frac = 0) {
  const range = ARMOR_BY_WORLD[region]; if (!range || !e || globalThis.NO_WORLD_ARMOR) return e ? e.armor || 0 : 0;
  const [lo, hi] = range;
  if (e.boss && !ARMOR_BOSS_WORLDS.includes(region)) return e.armor || 0;
  const base = e.boss ? hi + (e.miniBoss ? 2 : 3) : lo + Math.round(Math.max(0, Math.min(1, frac)) * (hi - lo)) + (e.elite ? 1 : 0);
  return Math.max(e.armor || 0, base);
}
function armEnemy(e, frac) {
  if (!e || e.worldArmor) return;
  const before = e.armor || 0, armor = worldArmor(e, activeRegion, frac);
  e.armor = armor; e.worldArmor = true;
  const f = armor > before ? ARMOR_HP_FACTOR[activeRegion] || 1 : 1;
  if (f !== 1) { e.maxHp = Math.max(1, Math.round(e.maxHp * f)); e.hp = Math.min(e.maxHp, Math.max(1, Math.round(e.hp * f))); }
}
const startBattleBeforeArmor = startBattle;
startBattle = function (spawnId) {
  const r = startBattleBeforeArmor.apply(this, arguments), b = state && state.battle;
  if (!b || b.phase !== 'fight' || b.spawnId !== spawnId || b.armored) return r;
  const frac = typeof regionDistanceFrac === 'function' ? regionDistanceFrac(state.room) : 0;
  armEnemy(b.enemy, frac);
  if (b.pair && b.pair.other && b.pair.other.enemy) armEnemy(b.pair.other.enemy, frac);
  b.armored = true; save(); renderBattle();
  return r;
};
