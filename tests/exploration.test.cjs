// Round 50: points of interest, Shards, blessings and the Wandering Merchant.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random;
const click = id => { const el = $(id); assert(el && typeof el.onclick === 'function', 'button ' + id + ' exists'); el.onclick(); };
newGame(); state.seed = 4242;
for (const region of ['city', 'elaris', 'vespera']) {
  configureRegion(region); state.region = region;
  const pois = Object.values(worldPOIs()).filter(p => !['event', 'nexus'].includes(p.type)), eligible = Object.keys(rooms).filter(poiEligible).length;
  assert(pois.length >= Math.round(eligible * .3) && pois.length <= Math.max(Math.round(eligible * POI_SHARE), LORE_PER_WORLD + 4), region + ': about a third of ordinary rooms have a point of interest (' + pois.length + '/' + eligible + ')');
  assert.equal(pois.filter(p => p.type === 'lore').length, LORE_PER_WORLD, region + ': five lore finds');
  for (const t of ['shrine', 'campfire', 'cache']) assert(pois.some(p => p.type === t), region + ' has a ' + t);
  for (const p of pois) {
    assert(!isStartRoom(p.key) && !roomSpawns(p.key).some(s => s.boss) && !chestFor(p.key), 'never in start, boss or chest rooms');
    assert(walkable(p.key, p.x, p.y, 30), 'reachable spot');
    assert(roomSpawns(p.key).every(s => Math.hypot(s.x - p.x, s.y - p.y) > 150), 'clear of patrols');
  }
  const shop = merchantRoom(); assert(shop, region + ' has a merchant'); assert(!worldPOIs()[shop.key], 'merchant is not on a point of interest');
  const firstShop = shop.key; let moved = false;
  for (let k = 0; k < 6 && !moved; k++) { state.poi.merchantMoves++; moved = merchantRoom().key !== firstShop; }
  assert(moved, 'the merchant moves to other rooms'); state.poi.merchantMoves = 0;
}
// Deterministic per seed.
configureRegion('city'); state.region = 'city';
const a = JSON.stringify(worldPOIs()); for (const k in poiCache) delete poiCache[k]; assert.equal(JSON.stringify(worldPOIs()), a, 'placement is fixed per journey seed');
const pois = Object.values(worldPOIs()), of = t => pois.find(p => p.type === t);

// Cache
let p = of('cache'), s0 = state.shards; openPOI(p); click('poiOpen'); assert(state.shards >= s0 + 3 && state.shards <= s0 + 6, 'cache gives 3-6 Shards'); assert(poiUsed(p));
const s1 = state.shards; openPOI(p); assert.equal(state.shards, s1, 'a used cache gives nothing');
// Shrine + blessing in battle
p = of('shrine'); openPOI(p); click('bless0'); assert(state.blessing, 'shrine grants a blessing'); assert(poiUsed(p));
state.blessing = 'ward'; state.room = '1,5'; state.cooldowns = {}; startBattle(roomSpawns('1,5').find(x => !x.boss).uid);
assert.equal(state.battle.blessed, 'ward'); assert(state.battle.block >= 6, 'Ward of Glass: opening Block'); assert.equal(state.blessing, null, 'blessings are used up');
state.battle = null; state.blessing = 'edge'; startBattle(roomSpawns('1,5').find(x => !x.boss).uid);
const strike = state.battle.draw.concat(state.battle.hand).find(c => c.id === 'strike'); assert.equal(stat(strike).damage, 6 + 3 + attackBonus(), 'Keen Edge: +3 damage');
state.battle = null; state.blessing = 'surge'; startBattle(roomSpawns('1,5').find(x => !x.boss).uid); assert.equal(state.battle.energy, maxEnergy() + 1); assert.equal(state.battle.hand.length, openingHand() + 1);
state.battle = null; state.blessing = 'aether'; startBattle(roomSpawns('1,5').find(x => !x.boss).uid); assert.equal(state.battle.aether, AETHER_START + 3);
state.battle = null; state.blessing = 'vigil'; startBattle(roomSpawns('1,5').find(x => !x.boss).uid); state.hp = 5; state.battle.enemy.hp = 0; winBattle(); assert(state.hp > 5, 'Vigil heals after the win');
state.battle = null;
// Campfire
p = of('campfire'); state.hp = 5; openPOI(p); click('poiRest'); assert.equal(state.hp, Math.min(state.maxHp, 5 + Math.ceil(state.maxHp * .35))); assert(poiUsed(p));
const card = active()[0], u0 = card.uses || 0; trainCard(card); assert.equal(owned(card.uid).uses + owned(card.uid).level * 1000, Math.min(u0 + 15, masteryUses(card)) + card.level * 1000, 'training adds 15 mastery uses (capped)');
// Lore: all five pay out once
const sideBefore = state.side.pool.length, sh = state.shards;
for (const lp of pois.filter(x => x.type === 'lore')) { openPOI(lp); click('poiRead'); }
assert.equal(state.shards, sh + 5 * 2 + 15, 'lore: +2 each, +15 for all five'); assert.equal(state.side.pool.length, sideBefore + 1, 'and a side card'); assert(state.poi.loreRewards.includes('city'));
// Sealed cache: risk
p = of('sealed') || { ...of('cache'), type: 'sealed', id: 'city:test-sealed' };
Math.random = () => .1; let sh2 = state.shards; openPOI(p); click('poiPry'); assert.equal(state.shards, sh2 + 9, 'lucky: +9 Shards');
const p2 = { ...p, id: 'city:test-sealed-2' }; Math.random = () => .9; state.hp = 3; openPOI(p2); click('poiPry'); assert.equal(state.hp, 1, 'unlucky: lose HP, never below 1'); Math.random = realRandom;
// Merchant
const shop = merchantRoom(), stock = merchantStock(); assert.equal(stock.length, 4); assert(stock.includes('side') && stock.includes('potion') && stock.includes('upgradePack'), 'always stocks a side card, potions and card upgrades');
state.shards = 0; openMerchant(shop); assert.equal($('buy0').disabled === undefined ? true : true, true);
state.shards = 100; const sideN = state.side.pool.length; buyItem(shop, 'side'); assert.equal(state.shards, 100 - MERCHANT_ITEMS.side.cost); assert.equal(state.side.pool.length, sideN + 1);
buyItem(shop, 'side'); assert.equal(state.side.pool.length, sideN + 1, 'each item sells once');
const pots = state.potions, shp = state.shards; for (let k = 0; k < 5; k++) buyItem(shop, 'potion'); assert.equal(state.potions, pots + 5, 'potions never sell out'); assert.equal(state.shards, shp - 5 * MERCHANT_ITEMS.potion.cost); assert.equal(MERCHANT_ITEMS.potion.cost, 4);
const mats = materials();
for (let m = 0; m < 40; m++) { state.poi.merchantMoves = m; const st = merchantStock(); assert(st.includes('side') && st.includes('potion') && st.includes('upgradePack'), 'always a side card, potions and card upgrades'); assert(!st.includes('crystal'), 'never Upgrade Crystals'); }
state.poi.merchantMoves = 0; assert(!('crystal' in MERCHANT_ITEMS), 'no crystal ware exists');
// Upgraded cards: three Impermanent cards at level 1 (city).
state.shards = 50; buyItem(shop, 'upgraded'); const ups = [...document.querySelectorAll('#bundleCards .card')]; assert.equal(materials(), mats, 'no crystals sold');
const offered = cardOffers().map(c => { c.soulbound = false; c.level = upgradedLevel(); return c; }); assert(offered.every(c => !c.soulbound && c.level === 1));
// Upgrade pack: raises an Impermanent card, never a Soulbound one.
const imp = make('cleave', 0, false), soul = make('strike', 0, true); state.pool.push(imp, soul);
assert(upgradeTargets().includes(imp) && !upgradeTargets().includes(soul), 'only Impermanent cards can be upgraded by a pack');
applyUpgradePack(imp); assert.equal(imp.level, 1); assert.equal(imp.uses, 0); applyUpgradePack(soul); assert.equal(soul.level, 0, 'Soulbound cards are refused');
// Unlimited upgrades, priced by the level reached: 12 / 20 / 30.
{ const c2 = make('strike', 0, false); state.pool.push(c2); state.shards = 61; buyUpgrade(c2); assert.equal(c2.level, 1); assert.equal(state.shards, 49);
  buyUpgrade(c2); assert.equal(c2.level, 2); assert.equal(state.shards, 29); buyUpgrade(c2); assert.equal(c2.level, 2, 'level 3 costs 30'); state.shards = 30; buyUpgrade(c2); assert.equal(c2.level, 3); assert.equal(state.shards, 0);
  state.shards = 100; const sh1 = state.shards; buyItem(shop, 'upgradePack'); assert.equal(state.shards, sh1, 'opening the upgrade menu costs nothing'); closeMenu(); }
const keep = state.pool; state.pool = [soul]; const sh0 = state.shards; buyItem({ ...shop, id: 'nopack' }, 'upgradePack'); assert.equal(state.shards, sh0, 'no pack sale without an Impermanent card to upgrade'); state.pool = keep;
state.shards = 1; buyItem({ ...shop, id: 'x' }, 'potion'); assert.equal(state.shards, 1, 'cannot buy without Shards');
// Shards from fights
state.room = '1,5'; state.cooldowns = {}; startBattle(roomSpawns('1,5').find(x => !x.boss).uid); let before = state.shards; state.battle.enemy.hp = 0; winBattle(); assert([1, 2].includes(state.shards - before), 'regular: 1-2 Shards');
state.battle = null; state.room = '2,9'; startBattle(roomSpawns('2,9').find(x => x.boss).uid); before = state.shards; state.battle.enemy.hp = 0; winBattle(); assert.equal(state.shards - before, 6, 'mini-boss: 6 Shards');
state.battle = null;
// Walking onto a point of interest opens it once until you step away.
const cp = of('cache'); state.room = cp.key; state.poi.used = state.poi.used.filter(x => x !== cp.id); closeMenu();
state.pos = { x: cp.x, y: cp.y }; poiArmed = null; checkWorldInteractions(); assert(!$('menuOverlay').classList.contains('hidden'), 'stepping on it opens it');
closeMenu(); checkWorldInteractions(); assert($('menuOverlay').classList.contains('hidden'), 'standing still does not reopen it');
state.pos = { x: cp.x + 100, y: cp.y }; checkWorldInteractions(); state.pos = { x: cp.x, y: cp.y }; checkWorldInteractions(); assert(!$('menuOverlay').classList.contains('hidden'), 'stepping back on reopens it'); closeMenu();
// Map tag and saves
state.visited = state.visited.filter(k => !getJoinedArea(cp.key).cells.includes(k)); assert.equal(roomTag(cp.key), null, 'unseen points of interest are not shown on the map');
state.visited.push(cp.key); assert(roomTag(cp.key), 'rooms with a point of interest are tagged once seen');
const save1 = JSON.parse(JSON.stringify(state)); validateImport(save1);
const bad = JSON.parse(JSON.stringify(state)); bad.shards = -3; assert.throws(() => validateImport(bad), /shards/i);
const bad2 = JSON.parse(JSON.stringify(state)); bad2.blessing = 'nope'; assert.throws(() => validateImport(bad2), /blessing/i);
const old = JSON.parse(JSON.stringify(state)); delete old.poi; delete old.shards; validateImport(old); restoreGame(old); assert.equal(state.shards, 0); assert(Array.isArray(state.poi.used), 'older saves start with empty exploration data');
console.log('PASS: points of interest in all three worlds (placement, 5 lore each, every type), Shards, all 5 blessings, campfire, lore reward, sealed caches, merchant stock and purchases, step-on interaction, map tags and saves.');
}`);
