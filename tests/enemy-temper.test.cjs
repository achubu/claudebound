'use strict';
// Round 253: enemies roll a temper (🔥 Fierce / 🛡 Hardy / plain) when a fight starts, and every attack
// rolls up to ±15%, fixed per turn so the intent is exact. Neon Aftermath's first levels stay plain.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
globalThis.NO_TEMPER = 0; const o = { tempers: {}, stable: true, inRange: true, varied: new Set(), cityEarly: 0, cityEarlyN: 0 };
for (let s = 0; s < 40; s++) {
  newGame(); state.region = 'sky'; configureRegion('sky'); state.hp = state.maxHp = 999; state.tips = { pairs: true };
  const k = Object.keys(rooms).find(k => roomSpawns(k).some(x => spawnAvailable(x) && !x.boss)); state.room = k;
  const sp = roomSpawns(k).find(x => spawnAvailable(x) && !x.boss); const plain = enemyStats(sp.type, { level: enemyLevel(k) });
  startBattle(sp.uid); const b = state.battle, e = b.enemy, t = e.temper || 'plain'; o.tempers[t] = (o.tempers[t] || 0) + 1;
  if (!b.pair) { if (t === 'fierce' && !(e.maxHp < plain.hp && e.attack > plain.attack && /Fierce/.test(e.name))) o.fierceBad = true;
    if (t === 'hardy' && !(e.maxHp > plain.hp && e.attack < plain.attack && /Hardy/.test(e.name))) o.hardyBad = true; }
  for (let turn = 1; turn <= 6; turn++) { const a = enemyPlan(b, turn), c = enemyPlan(b, turn); if (a.damage !== c.damage) o.stable = false;
    if (a.temperRoll != null) { if (Math.abs(a.temperRoll) > TEMPER_ROLL + 1e-9) o.inRange = false; o.varied.add(Math.round(a.temperRoll * 100)); } }
  state.battle = null;
}
for (let s = 0; s < 10; s++) { newGame(); const k = Object.keys(rooms).find(k => enemyLevel(k) < TEMPER_FROM_LEVEL && roomSpawns(k).some(x => spawnAvailable(x) && !x.boss));
  state.room = k; startBattle(roomSpawns(k).find(x => spawnAvailable(x) && !x.boss).uid); const b = state.battle; o.cityEarlyN++;
  if (b.enemy.temper || [1, 2, 3].some(t => enemyPlan(b, t).temperRoll)) o.cityEarly++; state.battle = null; }
globalThis.NO_TEMPER = 1; o.varied = o.varied.size;
return JSON.stringify(o); })()`));
assert(r.tempers.fierce > 0 && r.tempers.hardy > 0 && r.tempers.plain > 0, 'all three tempers show up (' + JSON.stringify(r.tempers) + ')');
assert(!r.fierceBad, 'Fierce: less health, harder hits, named');
assert(!r.hardyBad, 'Hardy: more health, softer hits, named');
assert(r.stable, 'a turn\'s roll is the same every time the intent is read');
assert(r.inRange && r.varied > 5, 'attack rolls stay within ±15% and vary');
assert.strictEqual(r.cityEarly, 0, 'Neon Aftermath\'s first levels stay plain');
console.log('enemy-temper ok');
// Round 291 (playtest): a boss called "The …" reads "🔥 The Fierce Crown Sentinel", not "🔥 Fierce The Crown Sentinel".
const names = JSON.parse(run(`(()=>{ globalThis.NO_TEMPER = 0; const out = [];
  for (let s = 0; s < 30 && out.length < 3; s++) { newGame(); configureRegion('city'); state.hp = state.maxHp = 999;
    const k = Object.keys(rooms).find(k => roomSpawns(k).some(x => x.type === 'crownSentinel')); state.room = k; state.seed = 'temper-name-' + s;
    startBattle(roomSpawns(k).find(x => x.type === 'crownSentinel').uid); const e = state.battle.enemy; if (e.temper) out.push(e.name); state.battle = null; }
  globalThis.NO_TEMPER = 1; return JSON.stringify(out); })()`));
assert(names.length && names.every(n => /^(🔥|🛡) The (Fierce|Hardy) Crown Sentinel$/u.test(n)), 'tempered "The" names read naturally: ' + names.join(', '));
console.log('temper names ok:', names.join(' | '));
