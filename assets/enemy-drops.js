'use strict';
// =====================================================================
// Round 380 (owner: "now enemies drop a card choice, spread the cards around so that each enemy drops a unique card,
// relevant to the world if possible but not required"). A card chest used to offer three cards from the whole world's
// pool. Now every regular enemy has its own cards: each world's reward pool is dealt round its enemies in turn (the
// first enemy of the world gets the pool's first card, and so on), and no card is on two enemies anywhere in the game
// (a card in two worlds' pools belongs to an enemy of the earlier world). An enemy with one card drops that card; one
// with two or three offers the choice between its own. Bosses and mini-bosses keep their own rewards.
// The pools themselves still feed quests, vaults and chests found in the world.
// =====================================================================
function enemyDropSpecies(world) {
  const zones = world === 'city' ? CITY_ZONE_ENEMY : world === 'elaris' ? Object.keys(ELARIS_WILDLIFE).filter(id => !ELARIS_WILDLIFE[id].boss)
    : typeof TILE_WORLD_ZONES !== 'undefined' && TILE_WORLD_ZONES[world] ? TILE_WORLD_ZONES[world] : world === 'vespera' ? VESPERA_ZONE_ENEMY : world === 'chronospire' ? CHRONO_ZONE_ENEMY : [];
  return [...new Set(zones)].filter(id => enemies[id] && !enemies[id].boss);
}
let enemyDropTable = null;
function enemyDrops() {
  if (enemyDropTable) return enemyDropTable;
  const out = {}, used = new Set();
  for (const world of WORLD_ORDER) {
    const species = enemyDropSpecies(world), cards = (VARIETY_POOLS[world] || []).filter(id => defs[id] && !used.has(id));
    for (const s of species) out[s] = out[s] || [];
    if (!species.length) continue;
    cards.forEach((id, i) => { out[species[i % species.length]].push(id); used.add(id); });
  }
  return enemyDropTable = out;
}
function enemyDropFor(id) { return enemyDrops()[id] || null; }
// Up to three of the enemy's own cards, the ones you don't own yet first.
function enemyCardOffers(id) {
  const list = enemyDropFor(id); if (!list || !list.length) return null;
  const owned = new Set((state.pool || []).map(c => c.id)), rank = list.map(c => [c, (owned.has(c) ? 1 : 0) + Math.random() * 0.9]).sort((a, b) => a[1] - b[1]);
  return rank.slice(0, 3).map(([c]) => make(c));
}
const winBattleBeforeEnemyDrops = winBattle;
winBattle = function () {
  const b = state.battle, out = winBattleBeforeEnemyDrops.apply(this, arguments);
  if (!b || b.phase !== 'reward' || b.lootType !== 'choice' || !b.enemy || b.enemy.boss) return out;
  const offers = enemyCardOffers(b.id);
  if (offers) { b.offers = offers; b.dropFrom = enemies[b.id].name; }
  return out;
};
// The chest says whose cards these are.
const renderBattleBeforeEnemyDrops = renderBattle;
renderBattle = function () {
  const out = renderBattleBeforeEnemyDrops.apply(this, arguments), b = state && state.battle;
  if (b && b.phase === 'reward' && b.chestOpened && b.lootType === 'choice' && b.dropFrom && typeof document !== 'undefined') {
    const p = document.querySelector && document.querySelector('#battleModal p.muted');
    if (p) p.textContent = b.offers.length > 1 ? 'The ' + b.dropFrom + ' carried these. Take one into your collection, or leave them.' : 'The ' + b.dropFrom + ' carried this card. Take it into your collection, or leave it.';
    const h = document.querySelector && document.querySelector('#battleModal h2'); if (h && b.offers.length === 1) h.textContent = 'A card';
  }
  return out;
};
