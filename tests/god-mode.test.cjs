// Round 198: God Mode: any card wins, every waypoint is open and every map is revealed, and
// nothing is saved: leaving rolls back to the journey as it was before God Mode.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname, '../assets/god-mode.js'), 'utf8'));
const r = JSON.parse(run(`JSON.stringify((() => {
  const out = {};
  // Off: cards play normally and the map starts unexplored.
  newGame(); const s0 = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss));
  state.room = s0; startBattle(roomSpawns(s0).find(s => !s.boss).uid);
  const b0 = state.battle; b0.enemy.hp = 999; b0.energy = 3; playCard(0);
  out.off = { phase: b0.phase, hp: b0.enemy.hp, visited: state.visited.length, nexus: state.poi.nexus.length };
  state.battle = null;
  // On. The journey is saved as it stands, then nothing is written.
  state.battle = null; state.shards = 77; save();
  const saved = localStorage.getItem('aethercede-expansion-v3');
  godSession = true; godFill();
  out.nexusAll = Object.entries(NEXUS_POINTS).every(([r, nx]) => [nx.start, nx.mid].every(k => state.poi.nexus.includes(nexusId(r, k))));
  out.mapsAll = WORLD_ORDER.every(r => regionRoomKeys(r).every(k => state.regionVisits[r].includes(k)));
  out.visitedIsRegion = state.visited === state.regionVisits[state.region];
  out.godFlag = state.godMode;
  // Any card wins, even one you can't afford, and a boss counts as beaten.
  const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss));
  state.room = k; startBattle(roomSpawns(k).find(s => !s.boss).uid);
  const b = state.battle; b.energy = 0; const wins = state.wins; playCard(0);
  out.win = { phase: b.phase, wins: state.wins - wins, hp: b.enemy.hp };
  state.battle = null;
  const bossRoom = WORLD_BOSS_ROOMS.city[0]; state.room = bossRoom; startBattle(roomSpawns(bossRoom).find(s => s.boss).uid);
  const bb = state.battle; playSideCard((bb.sideHand && bb.sideHand[0] || {}).uid);
  out.boss = { phase: bb.phase, beaten: state.bosses.includes(bb.id) };
  state.battle = null;
  // Waypoint travel to another world works straight away.
  nexusTravel('chronospire', NEXUS_POINTS.chronospire.mid);
  out.travel = { region: state.region, room: state.room, mapsAll: Object.keys(rooms).every(k => state.visited.includes(k)) };
  state.shards = 9999; save(); setMaterials(500);
  out.untouched = localStorage.getItem('aethercede-expansion-v3') === saved;
  let toasts = []; const t0 = toast; toast = m => toasts.push(m); exportSave(); toast = t0; out.exportBlocked = toasts.some(m => /off in God Mode/.test(m));
  // Rolling back: the saved journey is the one from before God Mode.
  godSession = false; const back = JSON.parse(localStorage.getItem('aethercede-expansion-v3'));
  out.rollback = { shards: back.shards, wins: back.wins, region: back.region, visited: back.visited.length };
  return out;
})())`));
assert.equal(r.off.phase, 'fight', 'without God Mode a card does not win on its own');
assert(r.off.visited <= 2 && r.off.nexus <= 1, 'without God Mode the map and waypoints start closed');
assert(r.nexusAll, 'every Nexus Waypoint is unlocked');
assert(r.mapsAll, 'every room of every world is revealed');
assert(r.visitedIsRegion && r.godFlag === true);
assert.deepStrictEqual(r.win, { phase: 'reward', wins: 1, hp: 0 }, 'an unaffordable card still wins the fight');
assert.equal(r.boss.phase, 'reward'); assert(r.boss.beaten, 'a boss beaten in God Mode counts');
assert.equal(r.travel.region, 'chronospire'); assert(r.travel.mapsAll, 'the new world is revealed too');
assert(r.untouched, 'nothing in God Mode reaches the save');
assert(r.exportBlocked, 'export is off in God Mode');
assert.equal(r.rollback.shards, 77, 'the save is the journey from before God Mode');
assert.equal(r.rollback.wins, 0); assert.equal(r.rollback.region, 'city'); assert(r.rollback.visited <= 2);
console.log('PASS: God Mode: any card wins (hand or side deck), every waypoint is open, every map is revealed, and nothing is saved, so leaving rolls back.');
