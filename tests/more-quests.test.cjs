// Round 381: six quests per world (three new: elites, one kind of enemy, the second mini-boss), each paying one of the
// world's loot cards, and two more hidden chests per world.
const assert = require('assert');
process.env.HARNESS_ONLY = '1';
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const out = { worlds: {} }; newGame();
  for (const w of WORLD_ORDER) { state.region = w; configureRegion(w); ensureExplore(); ensureQuests(); const W = out.worlds[w] = {};
    const givers = questGivers(), pois = Object.values(worldPOIs()), giverOf = k => pois.find(p => givers[p.id] === k);
    W.kinds = Object.values(givers).sort().join(); const offers = {}; for (const k of QUEST_ORDER) offers[k] = questOffer(giverOf(k));
    W.offered = Object.values(offers).filter(Boolean).length; W.cards = Object.values(offers).map(q => q && q.card);
    W.lootOnly = W.cards.every(c => c && worldLootPool(w).includes(c)); W.distinct = new Set(W.cards).size;
    W.minis = offers.mini && offers.mini2 && offers.mini.target !== offers.mini2.target && enemies[offers.mini.target].miniBoss && enemies[offers.mini2.target].miniBoss;
    W.boss = offers.boss && offers.boss.target === WORLD_BOSS_ROOMS[w][1]; W.species = offers.species && enemyDropSpecies(w).includes(offers.species.target) && offers.species.need === 5;
    W.loot = worldLootPool(w).length;
    const chests = Object.keys(rooms).filter(k => chestFor(k)); W.chests = chests.length;
    W.chestsAlone = chests.every(k => !poiAt(k) && !rooms[k].relic && !isStartRoom(k) && !roomSpawns(k).some(s => s.boss) && !(typeof worldRelayRooms === 'function' && worldRelayRooms().includes(k)) && !(merchantRoom() && merchantRoom().key === k));
    W.chestsReach = chests.every(k => regionRoomDistances(w)[k] != null);
  }
  // Counting: an elite quest counts elites only; a species quest counts its enemy only.
  state.region = 'city'; configureRegion('city'); const pois = Object.values(worldPOIs()), givers = questGivers(), giverOf = k => pois.find(p => givers[p.id] === k);
  const eq = questOffer(giverOf('elite')), sq = questOffer(giverOf('species')); takeQuest(eq); takeQuest(sq);
  const fight = (pick) => { for (const k of Object.keys(rooms)) { const s = roomSpawns(k).find(pick); if (s) { state.room = k; state.cooldowns = {}; state.battle = null; startBattle(s.uid); winBattle(); state.battle = null; return true; } } return false; };
  const other = enemyDropSpecies('city').find(t => t !== sq.target);
  fight(s => !s.boss && !s.elite && s.type === other); out.afterPlain = [eq.have, sq.have];
  const pool0 = state.pool.length;
  for (let i = 0; i < 3; i++) fight(s => s.elite && !s.boss && s.type !== sq.target); out.eliteDone = state.quests.done.includes('city:elite');
  out.eliteCard = state.pool.some(c => c.id === eq.card) && state.pool.length > pool0;
  for (let i = 0; i < 5; i++) fight(s => !s.boss && s.type === sq.target); out.speciesDone = state.quests.done.includes('city:species');
  showQuests(); out.screen = /six quests/.test(document.getElementById('menuModal').innerHTML || ''); closeMenu();
  return JSON.stringify(out); })()`));
for (const [w, W] of Object.entries(r.worlds)) {
  assert.strictEqual(W.kinds, 'boss,elite,hunt,mini,mini2,species', w + ': six quest givers');
  assert.strictEqual(W.offered, 6, w + ': all six quests are offered'); assert(W.lootOnly, w + ': each pays one of the world\'s loot cards: ' + W.cards);
  assert.strictEqual(W.distinct, Math.min(6, W.loot), w + ': different cards while the loot lasts');
  assert(W.minis && W.boss && W.species, w + ': the two mini-boss quests name different mini-bosses, the boss quest the final boss, the target quest one of the world\'s enemies');
  assert(W.chests >= 4, w + ': at least four hidden chests (' + W.chests + ')'); assert(W.chestsAlone && W.chestsReach, w + ': each chest stands alone in a reachable room');
}
assert.deepStrictEqual(r.afterPlain, [0, 0], 'an ordinary enemy of another kind counts for neither');
assert(r.eliteDone && r.eliteCard, 'three elites finish the elite quest and pay its card'); assert(r.speciesDone, 'five of the named enemy finish the target quest');
assert(r.screen, 'the Quests screen explains the six quests');
console.log('PASS: six quests in every world (hunt, elites, one kind of enemy, both mini-bosses, the boss), each paying a loot card, and at least four hidden chests standing alone.');
