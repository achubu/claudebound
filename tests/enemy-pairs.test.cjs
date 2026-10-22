'use strict';
// Round 243: from the Sky Isles on, some regular patrols are pairs. Both act every turn; your cards hit
// the target, which you can switch; when one falls the other fights on; beating both wins.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
const o = {};
const count = w => { newGame(); state.region = w; configureRegion(w); let n = 0, pairs = 0, bossOrElite = 0;
  for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) { if (s.boss || s.elite) { if (pairMateFor(k, s)) bossOrElite++; continue; } n++; const m = pairMateFor(k, s); if (m) { pairs++; if (m === s.type) o.same = true; } }
  return { n, pairs, bossOrElite }; };
o.city = count('city'); o.elaris = count('elaris'); o.sky = count('sky'); o.vespera = count('vespera');
newGame(); state.region = 'sky'; configureRegion('sky'); state.talents = {}; state.playerLevel = 24; syncTalentVitals(false);
let k, s; for (const key of Object.keys(rooms)) { s = roomSpawns(key).find(x => spawnAvailable(x) && pairMateFor(key, x)); if (s) { k = key; break; } }
state.room = k; state.hp = state.maxHp = 999; state.tips = { pairs: true };
const lone = enemyStats(s.type, { level: enemyLevel(k) });
startBattle(s.uid); const b = state.battle;
o.start = { encounter: b.logs[0], a: b.enemy.name, m: b.pair.other.enemy.name, hp: b.enemy.maxHp, loneHp: lone.hp, atk: b.enemy.attack, loneAtk: lone.attack };
// Turn 1: both act.
b.hand = []; b.block = 0; b.enemy.attack = 10; b.pair.other.enemy.attack = 7; const t = b.turn; let hp = state.hp;
const p1 = enemyPlan(b), p2 = withPairMate(b, () => enemyPlan(b)); endTurn();
b.siftPick = 0; // a Swipe's discard would hold back the switch below
o.turn1 = { lost: hp - state.hp, p1: p1.damage, p2: p2.damage, k1: p1.kind, k2: p2.kind, advanced: b.turn === t + 1 };
// Block protects from both, in order.
b.turn = 1; b.block = 999; hp = state.hp; endTurn(); o.blocked = hp - state.hp; b.siftPick = 0;
// Target switching swaps who your cards hit.
const first = b.enemy.name; pairSwitch(); o.switched = b.enemy.name !== first && b.pair.other.enemy.name === first;
b.hand = [make('cleave')]; b.energy = 3; const ta = b.enemy.hp, oa = b.pair.other.enemy.hp; playCard(0); o.hitTarget = b.enemy.hp < ta && b.pair.other.enemy.hp === oa;
// One falls, the other fights on; both down wins, with more XP.
b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0); o.oneDown = { phase: b.phase, alive: b.enemy.hp > 0, pairOn: pairOn(b) };
b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0); o.win = { phase: b.phase };
o.xp = (() => { const x = { enemy: { level: 5, boss: false, elite: false } }; const plain = xpReward(x); x.pair = {}; return [plain, xpReward(x)]; })();
o.guide = pairGuideHTML();
// Round 246: the two never land charged strikes on the same turn.
let clash = 0; for (const w of ['sky', 'wilds', 'vespera', 'chronospire']) { newGame(); state.region = w; configureRegion(w); state.hp = state.maxHp = 999; state.tips = { pairs: true };
  for (const kk of Object.keys(rooms)) for (const sp of roomSpawns(kk)) { if (!spawnAvailable(sp) || !pairMateFor(kk, sp)) continue; state.room = kk; startBattle(sp.uid); const bb = state.battle;
    for (let t = 1; t <= 12; t++) if (enemyPlan(bb, t).kind === 'elemental' && withPairMate(bb, () => enemyPlan(bb, t).kind) === 'elemental') clash++; state.battle = null; } }
o.clash = clash;
return JSON.stringify(o); })()`));
assert(!r.same, 'a partner is always another species');
assert.strictEqual(r.city.pairs + r.elaris.pairs, 0, 'no pairs in Neon Aftermath or Solaris');
assert(r.sky.pairs > 0 && r.vespera.pairs > 0, 'pairs from the Sky Isles on (' + r.sky.pairs + '/' + r.sky.n + ', ' + r.vespera.pairs + '/' + r.vespera.n + ')');
assert.strictEqual(r.sky.bossOrElite + r.vespera.bossOrElite, 0, 'bosses and elites never pair');
assert(r.start.encounter.includes(' and ') && r.start.a !== r.start.m, 'the encounter names both');
assert(r.start.hp < r.start.loneHp && r.start.atk < r.start.loneAtk, 'each of the pair is weaker than a lone enemy');
assert(r.turn1.advanced, 'the turn resolves once');
const dmg = (k, d) => k === 'charge' || k === 'guard' ? 0 : d;
assert(r.turn1.lost >= dmg(r.turn1.k1, r.turn1.p1) + dmg(r.turn1.k2, r.turn1.p2) - 1, 'both enemies act (' + JSON.stringify(r.turn1) + ')');
assert.strictEqual(r.blocked, 0, 'Block protects from both');
assert(r.switched && r.hitTarget, 'switching target: cards hit the target only');
assert(r.oneDown.phase === 'fight' && r.oneDown.alive && !r.oneDown.pairOn, 'one falls, the other fights on alone');
assert.strictEqual(r.win.phase, 'reward', 'both down wins');
assert(r.xp[1] > r.xp[0], 'a pair gives more XP');
assert(/Both act every turn/.test(r.guide) && /switch target/.test(r.guide), 'the first pair fight explains it');
assert.strictEqual(r.clash, 0, 'Round 246: the pair never lands two charged strikes on the same turn');
console.log('enemy-pairs ok');
