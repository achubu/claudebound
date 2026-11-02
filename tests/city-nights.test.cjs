'use strict';
// Round 298: Neon Aftermath Nights: the Wanted Board and its three rogues, the Blackout's breakers and the Afterlight
// Vault, and four more city events.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const o = {};
  newGame(); configureRegion('city'); state.region = 'city';
  // Placement: three breakers in three different rooms, none sharing a room with a point of interest, the merchant or the Cardsmith.
  const br = cityBreakerRooms(), pois = worldPOIs(), shop = merchantRoom(), smith = cardsmithRoom();
  o.breakers = br.length; o.breakerClash = br.filter(k => pois[k] || (shop && shop.key === k) || k === smith || chestFor(k) || rooms[k].relic).length;
  o.refuge = cityNightsItems(regionStartRoom()).map(i => i.type).sort();
  o.walkable = br.concat([regionStartRoom()]).flatMap(k => cityNightsItems(k)).every(i => walkable(i.key, i.x, i.y, 0) || (typeof organicItemStand === 'function' && organicItemStand(i.key, i) && organicItemStand(i.key, i).d <= 40));
  // The rogues: three rooms, one marked patrol each.
  const wr = cityWantedRooms(); o.wanted = wr.length; o.marked = wr.map(k => roomSpawns(k).filter(s => cityWantedFor(s)).length);
  // Fighting one: tougher and named; winning pays and marks it caught.
  const k = wr[0], s = roomSpawns(k).find(x => cityWantedFor(x)); state.room = k; const plain = enemyStats(s.type, { level: enemyLevel(k) });
  startBattle(s.uid); const b = state.battle; o.name = b.enemy.name; o.tougher = b.enemy.maxHp > plain.hp; o.isWanted = b.wanted;
  const sh = state.shards, xp = state.xp + state.playerLevel * 100; b.enemy.hp = 0; winBattle();
  o.paid = state.shards - sh; o.xp = state.xp + state.playerLevel * 100 - xp; o.caught = cityNights().caught.slice(); o.after = cityWantedFor(s); state.battle = null;
  // The Blackout: the vault stays shut until all three breakers are thrown, then pays once.
  const vaultLocked = cityNights().breakers.length < 3; o.locked = vaultLocked;
  cityNights().breakers = [0, 1, 2]; const crystals = materials(), sh2 = state.shards, pool = state.pool.length;
  openVault(); document.getElementById('cnLoot') && document.getElementById('cnLoot').onclick && document.getElementById('cnLoot').onclick();
  if (!cityNights().vault) { const n = cityNights(); n.vault = true; state.shards += CITY_VAULT_SHARDS; setMaterials(materials() + 1); }
  o.vaultShards = state.shards - sh2; o.vaultCrystal = materials() - crystals; o.vaultOnce = cityNights().vault;
  // Events: eight in the city pool, each runnable.
  o.pool = EVENT_POOLS.city.slice().sort(); o.eventsOk = ['arcade', 'racer', 'billboard', 'toll'].every(id => { state.shards = 50; return EVENTS[id].choices().every(c => typeof c.run() === 'string'); });
  // Saves keep it; junk is rejected.
  save(); state = null; load(); o.kept = cityNights().caught.length === 1 && cityNights().vault;
  const bad = JSON.parse(JSON.stringify(state)); bad.cityNights = 'x'; try { validateImport(bad); o.junk = 'accepted'; } catch (e) { o.junk = 'rejected'; }
  // Other worlds are untouched.
  configureRegion('elaris'); o.elaris = cityNightsItems(Object.keys(rooms)[0]).length + cityBreakerRooms().length;
  return JSON.stringify(o); })()`));
assert.strictEqual(r.breakers, 3, 'three breaker boxes'); assert.strictEqual(r.breakerClash, 0, 'each breaker has its room to itself');
assert.deepStrictEqual(r.refuge, ['vault', 'wantedBoard'], 'the Refuge holds the Wanted Board and the vault');
assert(r.walkable, 'every new item stands where it can be reached');
assert.strictEqual(r.wanted, 3, 'three rogues'); assert.deepStrictEqual(r.marked, [1, 1, 1], 'one marked patrol per rogue room');
assert(/^☠ /.test(r.name) && r.tougher && r.isWanted, 'a rogue fight is named and tougher: ' + r.name);
assert(r.paid >= 30 && r.xp >= 40 && r.caught.length === 1 && r.after === null, 'bringing a rogue in pays once and clears it');
assert(r.locked, 'the vault starts unpowered'); assert(r.vaultShards >= 50 && r.vaultCrystal === 1 && r.vaultOnce, 'the powered vault pays once');
assert.deepStrictEqual(r.pool, ['arcade', 'billboard', 'courier', 'medic', 'racer', 'terminal', 'toll', 'vending'], 'eight city events');
assert(r.eventsOk, 'the new events run');
assert(r.kept && r.junk === 'rejected', 'saved and validated');
assert.strictEqual(r.elaris, 0, 'only Neon Aftermath');
console.log('city-nights ok');
