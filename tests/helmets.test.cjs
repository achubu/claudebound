'use strict';
// Round 571: helmets. A sixth gear slot; one helmet per world, won from its final boss (or, by a small chance, an elite), never
// one of the two pieces that open the boss door; every helmet has an icon and a recipe the game draws.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const out = {};
  out.slots = GEAR_SLOTS.join(','); const helmets = Object.keys(GEAR).filter(id => GEAR[id].slot === 'helmet');
  out.perWorld = WORLD_ORDER.map(w => helmets.filter(id => GEAR[id].world === w).length);
  out.door = WORLD_ORDER.map(w => gearOf(w).some(id => GEAR[id].slot === 'helmet'));
  out.helmets = helmets;
  // the city's final boss gives the Neon Visor, worn at once
  state.region = 'city'; configureRegion('city'); const bossRoom = WORLD_BOSS_ROOMS.city[0]; state.battle = null; state.room = bossRoom;
  const boss = roomSpawns(bossRoom).find(s => s.boss); try { startBattle(boss.uid); state.battle.enemy.hp = 0; winBattle(); } catch (e) { out.err = String(e); }
  out.won = state.relics.includes('neonVisor'); out.worn = state.gear.helmet; out.health = gearStat('health');
  // an elite: with the roll in its favour, the world's helmet if not yet owned; never a door piece
  state.relics = state.relics.filter(id => id !== 'neonVisor'); ensureGear(); const rnd = Math.random; Math.random = () => 0.01;
  state.battle = null; let el = null; for (const k of Object.keys(rooms)) { state.room = k; el = (roomSpawns(k) || []).find(s => s.elite && !s.boss); if (el) break; }
  out.foundElite = !!el; try { if (el) { startBattle(el.uid); Math.random = () => 0.01; state.battle.enemy.hp = 0; winBattle(); } } catch (e) { out.err2 = String(e); } Math.random = rnd;
  out.eliteDrop = state.relics.includes('neonVisor'); out.doorPieces = gearOf('city').filter(id => state.relics.includes(id)).length;
  return JSON.stringify(out); })()`));
assert.strictEqual(r.slots, 'boots,shirt,pants,belt,gloves,helmet', 'a helmet slot');
assert(r.perWorld.every(n => n === 1), 'one helmet per world ' + JSON.stringify(r.perWorld));
assert(r.door.every(x => !x), 'helmets never open the boss door');
assert(r.won && r.worn === 'neonVisor' && r.health >= 3, 'the final boss gives its helmet, worn at once ' + JSON.stringify(r));
assert(!r.foundElite || (r.eliteDrop && r.doorPieces === 0), 'an elite can drop the helmet, never a door piece ' + JSON.stringify(r));
for (const id of r.helmets) { assert(fs.existsSync(path.join(__dirname, '../assets/items/gear', id + '.png')), id + ' has an icon');
  const rec = JSON.parse(fs.readFileSync(path.join(__dirname, '../gear/recipes', id + '.json'), 'utf8')); assert.strictEqual(rec.slot, 'helmet', id + ' has a helmet recipe'); }
console.log('helmets ok');
