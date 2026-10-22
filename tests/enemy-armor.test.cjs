'use strict';
// Round 244: enemy Armor grows with the worlds after Neon Aftermath (both of a pair too), and the pair
// partner's panel shows it.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = {};
const fights = w => { newGame(); state.region = w; configureRegion(w); state.hp = state.maxHp = 999; state.tips = { pairs: true }; const got = { zone: [], elite: [], mini: [], boss: [], pair: [], keepsOwn: true };
  for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) { if (!spawnAvailable(s)) continue; state.room = k; startBattle(s.uid); const b = state.battle; if (!b) continue;
    const tag = s.boss ? (enemies[s.type].miniBoss ? 'mini' : 'boss') : s.elite ? 'elite' : 'zone'; got[tag].push(b.enemy.armor);
    if (b.enemy.armor < (enemies[s.type].armor || 0)) got.keepsOwn = false;
    if (b.pair) got.pair.push(b.pair.other.enemy.armor); state.battle = null; }
  const span = a => a.length ? [Math.min(...a), Math.max(...a)] : null; return { zone: span(got.zone), elite: span(got.elite), mini: span(got.mini), boss: span(got.boss), pair: span(got.pair), keepsOwn: got.keepsOwn }; };
for (const w of WORLD_ORDER) o[w] = fights(w);
globalThis.NO_WORLD_ARMOR = 1; o.cityOff = fights('city'); globalThis.NO_WORLD_ARMOR = 0;
o.cityMatches = JSON.stringify(o.cityOff) === JSON.stringify(o.city);
o.ranges = ARMOR_BY_WORLD;
return JSON.stringify(o); })()`));
assert(r.cityMatches, 'Neon Aftermath keeps its own Armor');
for (const w of ['elaris', 'sky', 'wilds', 'vespera', 'chronospire']) {
  const [lo, hi] = r.ranges[w], x = r[w];
  assert(x.zone[0] >= lo && x.zone[1] <= Math.max(hi, x.zone[1]) && x.zone[1] >= hi - 1, w + ': regular enemies ' + x.zone.join('-') + ' (world ' + lo + '-' + hi + ')');
  if (w !== 'elaris') assert(x.mini[0] >= hi + 2 && x.boss[0] >= hi + 3, w + ': mini-bosses and the boss have more');
  if (x.pair) assert(x.pair[0] >= lo, w + ': both of a pair are armored');
  assert(x.keepsOwn, w + ': no species loses Armor it had');
}
assert(r.chronospire.zone[0] > r.elaris.zone[1], 'Armor grows from world to world');
console.log('enemy-armor ok');
