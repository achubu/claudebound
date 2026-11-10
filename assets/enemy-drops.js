'use strict';
// =====================================================================
// Round 380 (owner: "now enemies drop a card choice, spread the cards around so that each enemy drops a unique card,
// relevant to the world if possible but not required"; then "lets move them [the rest] to chests and quests. try to put
// them in worlds where they make sense").
//   - Every regular enemy carries exactly one card of its own world, picked to suit it (ENEMY_CARD). No card is on two
//     enemies. A card chest won from that enemy holds that card; take it or leave it. Bosses and mini-bosses keep their
//     own rewards.
//   - The rest of each world's reward pool is that world's loot (worldLootPool): its quest rewards, its vault, and now
//     also its hidden loot chests, which each draw one of those cards at random beside their crystal or potion (one
//     you don't own yet, if any). The quests and the vault take the world's loot cards in turn (worldLootCard).
// =====================================================================
const ENEMY_CARD = {
  // Neon Aftermath
  emberling: 'cleave', thornling: 'staticShield', vineguard: 'bulwarkBash', burrower: 'breachSpike', shade: 'spark', cryptWisp: 'logicBomb', forgeBeast: 'overclock', crownEye: 'zeroDay',
  // Solaris
  cinderFox: 'scarabSwarm', drownedHeron: 'oasisDraught', blightAntler: 'venom', stormMoth: 'sandVeil', sunRevenant: 'solarLance', // (the Solar Scarab, Mirage Ibis, Dune Scorpion and Dust Devil keep their old ids)
  // Sky Isles
  skyDrake: 'featherguard', skyWisp: 'cloudburst', skyHarpy: 'windWall', skyRam: 'thunderclap',
  // Elaris
  elarisFox: 'wildfire', elarisAntler: 'sporeCloud', elarisHeron: 'tidecall', elarisMoth: 'thornlash',
  // Vespera
  vespFox: 'lightningRod', vespThorn: 'prismLance', vespMoth: 'squallStep', vespHeron: 'riptide', vespShade: 'mirrorguard', vespStag: 'crystalWard', vespWisp: 'crystalShard', vespMauler: 'thunderhead',
  // Chronospire
  chronoHound: 'clockworkVolley', chronoMoth: 'accelerate', chronoSentry: 'delayedBulwark', chronoWraith: 'afterimageWard', chronoHeron: 'rewindMend', chronoStag: 'chronoSpike', chronoWisp: 'futureSight', chronoMauler: 'wardbreakerStep'
};
function enemyDropSpecies(world) {
  const zones = world === 'city' ? CITY_ZONE_ENEMY : world === 'elaris' ? Object.keys(ELARIS_WILDLIFE).filter(id => !ELARIS_WILDLIFE[id].boss)
    : typeof TILE_WORLD_ZONES !== 'undefined' && TILE_WORLD_ZONES[world] ? TILE_WORLD_ZONES[world] : world === 'vespera' ? VESPERA_ZONE_ENEMY : world === 'chronospire' ? CHRONO_ZONE_ENEMY : [];
  return [...new Set(zones)].filter(id => enemies[id] && !enemies[id].boss);
}
function enemyDropFor(id) { const c = ENEMY_CARD[id]; return c && defs[c] ? c : null; }
// The cards of a world that no enemy carries: what its quests, vault and hidden chests give.
function worldLootPool(world = activeRegion) {
  const carried = new Set(Object.values(ENEMY_CARD)), pool = (VARIETY_POOLS[world] || VARIETY_POOLS.city || []).filter(id => defs[id] && !carried.has(id));
  return pool.length ? pool : (VARIETY_POOLS[world] || []).filter(id => defs[id]);
}
// Slots 0-5 are the world's six quest cards (quests.js QUEST_ORDER) and 6 its vault: a different card each until the pool runs out.
function worldLootCard(world, slot) {
  const pool = worldLootPool(world); if (!pool.length || !state) return null;
  return pool[(hashSeed(state.seed + 'loot' + world) + slot) % pool.length];
}
const winBattleBeforeEnemyDrops = winBattle;
winBattle = function () {
  const b = state.battle, out = winBattleBeforeEnemyDrops.apply(this, arguments);
  if (!b || b.phase !== 'reward' || b.lootType !== 'choice' || !b.enemy || b.enemy.boss) return out;
  const card = enemyDropFor(b.id);
  if (card) { b.offers = [make(card)]; b.dropFrom = enemies[b.id].name; }
  return out;
};
// Boss chests and any enemy without a card of its own still offer three, now from the world's loot.
if (typeof cardOffers === 'function') {
  cardOffers = function (region = activeRegion, n = 3) {
    const pool = [...worldLootPool(region)], out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out.map(id => make(id));
  };
}
// The chest says whose card it is.
const renderBattleBeforeEnemyDrops = renderBattle;
renderBattle = function () {
  const out = renderBattleBeforeEnemyDrops.apply(this, arguments), b = state && state.battle;
  if (b && b.phase === 'reward' && b.chestOpened && b.lootType === 'choice' && b.dropFrom && typeof document !== 'undefined' && document.querySelector) {
    const p = document.querySelector('#battleModal p.muted'), h = document.querySelector('#battleModal h2'), skip = document.getElementById('skipCards');
    if (p) p.textContent = 'The ' + b.dropFrom + ' carried this card. Take it into your collection, or leave it.';
    if (h) h.textContent = 'A card'; if (skip) skip.textContent = 'Leave it';
  }
  return out;
};
// Hidden loot chests: each also holds one of its world's loot cards.
// Owner: "chests can also randomly draw from a pool of cards when opened": a loot card you don't own yet if there is one.
function worldChestCard(world = activeRegion) {
  const pool = worldLootPool(world), owned = new Set((state.pool || []).map(c => c.id)), fresh = pool.filter(c => !owned.has(c)), from = fresh.length ? fresh : pool;
  return from.length ? from[Math.floor(Math.random() * from.length)] : null;
}
const checkWorldInteractionsBeforeEnemyDrops = checkWorldInteractions;
checkWorldInteractions = function () {
  const had = state && Array.isArray(state.chests) ? state.chests.length : 0, room = state && state.room, world = activeRegion;
  const out = checkWorldInteractionsBeforeEnemyDrops.apply(this, arguments);
  if (state && Array.isArray(state.chests) && state.chests.length > had && activeRegion === world && state.room === room) {
    const id = worldChestCard(world);
    if (id) { const c = make(id); c.soulbound = false; state.pool.push(c); save(); toast('The chest also held a card: ' + stat(c).name + ' (in your collection).'); }
  }
  return out;
};
