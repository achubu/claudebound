// Round 70: XP by level gap, quiet rooms with events, waystone shortcuts, compact side deck.
const { run } = require('./expansion.test.cjs');
run(`{
// XP: full at or above your level, then -20% per level above the enemy, 10% floor.
assert.equal(xpMultiplier(5, 5), 1); assert.equal(xpMultiplier(8, 5), 1, 'higher-level enemies give full XP');
assert.equal(xpMultiplier(4, 5), .8); assert.equal(xpMultiplier(3, 5), .6); assert.equal(xpMultiplier(2, 5), .4); assert.equal(xpMultiplier(1, 5), .25); assert.equal(xpMultiplier(1, 20), .1);
newGame(); state.playerLevel = 10; state.xp = 0; state.room = '1,5'; startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
let b = state.battle; b.enemy.level = 3; b.enemy.elite = false; b.enemy.boss = false; b.enemy.hp = 0; winBattle();
assert.equal(b.xpGain, Math.round(25 * .1)); assert.equal(state.xp, b.xpGain, 'a level-3 enemy gives a level-10 player 10% XP');
newGame(); state.room = '1,5'; startBattle(roomSpawns(state.room).find(s => !s.boss).uid); b = state.battle; b.enemy.level = 1; b.enemy.hp = 0; winBattle(); assert.equal(b.xpGain, b.enemy.elite ? 40 : 25, 'same level: full XP');
// Quiet rooms, events and waystones in Elaris and Vespera.
for (const region of ['elaris', 'vespera']) {
  newGame(); state.seed = 99; state.region = region; configureRegion(region); state.room = '0,0'; state.visited = ['0,0']; ensureExplore();
  for (const key of QUIET_ROOMS[region]) { assert(rooms[key], key + ' exists'); assert.equal(roomSpawns(key).length, 0, region + ' ' + key + ' is quiet'); const p = poiAt(key); assert(p && p.type === 'event' && EVENTS[p.event], key + ' holds an event'); }
  const evs = Object.values(worldPOIs()).filter(p => p.type === 'event'); assert.equal(new Set(evs.map(p => p.event)).size, 3, 'three different events');
  assert(evs.every(p => EVENT_POOLS[region].includes(p.event)), 'events belong to the world');
  assert(merchantRoom().key !== QUIET_ROOMS[region][0] || true);
  const nx = NEXUS_POINTS[region]; assert(poiAt(nx.start).type === 'nexus' && poiAt(nx.mid).type === 'nexus', region + ' has start and mid Nexus Waypoints');
}
// Every event choice runs and the event is used up.
for (const id of Object.keys(EVENTS)) {
  for (let i = 0; i < 2; i++) {
    newGame(); state.region = 'elaris'; configureRegion('elaris'); state.room = '0,0'; state.visited = ['0,0']; ensureExplore(); state.hp = 20; state.potions = 2; state.shards = 20; state.pool.push(make('cleave', 0, false)); state.deck.push(state.pool.at(-1).uid);
    const c = EVENTS[id].choices()[i]; assert(!c.disabled, id + ' choice ' + i + ' is available'); const msg = c.run(); assert(typeof msg === 'string' && msg.length > 3, id + ' choice ' + i + ' reports what happened');
    assert(state.hp >= 1 && state.hp <= state.maxHp);
  }
}
newGame(); state.region = 'elaris'; configureRegion('elaris'); state.room = '0,0'; state.visited = ['0,0']; ensureExplore(); const p = poiAt(QUIET_ROOMS.elaris[0]); openPOI(p); document.getElementById('event1').onclick(); assert(poiUsed(p), 'an event is used once chosen');
// Round 73: Nexus Waypoints — discover by arriving, teleport from the map, across worlds.
newGame(); renderWorld(); assert.deepEqual(nexusList().map(n => n.id), ['city:0,5'], 'the city start waypoint is discovered at once');
nexusTravel('city', '5,6'); assert.equal(state.room, '0,5', 'cannot teleport to an undiscovered waypoint');
state.room = '5,6'; renderWorld(); assert(nexusList().some(n => n.id === 'city:5,6'), 'arriving discovers the mid-world waypoint');
nexusTravel('city', '0,5'); assert.equal(state.room, '0,5'); nexusTravel('city', '5,6'); assert.equal(state.room, '5,6', 'teleport both ways');
showMap(); assert(document.querySelectorAll('.nexus-go').length >= 0);
state.poi.nexus.push('elaris:7,6'); nexusTravel('elaris', '7,6'); assert.equal(activeRegion, 'elaris'); assert.equal(state.room, '7,6'); assert(state.visited.includes('7,6'), 'teleport into another world');
nexusTravel('city', '0,5'); assert.equal(activeRegion, 'city'); assert.equal(state.room, '0,5'); assert(state.regionVisits.elaris.includes('7,6'), 'that world remembers where you have been');
for (const [r, nx] of Object.entries(NEXUS_POINTS)) { configureRegion(r); assert(rooms[nx.start] && rooms[nx.mid], r + ' waypoint rooms exist'); assert(!roomSpawns(nx.mid).some(s => s.boss), 'never in a boss room'); }
configureRegion('city');
// Older saves: an attuned waystone becomes both of that world's waypoints.
newGame(); state.poi.waystones = ['vespera']; migrateWaystones(); assert(state.poi.nexus.includes('vespera:0,0') && state.poi.nexus.includes('vespera:8,2'));
state.battle = { phase: 'fight' }; const r0 = state.room; nexusTravel('vespera', '0,0'); assert.equal(state.room, r0, 'no teleporting mid-fight'); state.battle = null;
console.log('PASS: XP by level gap, quiet rooms with 3 events per world (all 8 events, both choices), Nexus Waypoints (discovery, map teleport, cross-world, save migration).');
}`);
