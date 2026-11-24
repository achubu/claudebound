'use strict';
// Pair-fight and gear bugs a review reproduced: a pair's target falling during the enemies' turn froze the turn; Second Chance
// judged on stale HP when the partner struck; Phase Veil / Mirror Sigil / Rootbind / guard Block never spent by the partner;
// Pressure on the target lowering the partner's attack; only the last of a pair counting for quests; Overkill bounty and
// Pressure reading the survivor's HP; Riot Guard and Cloudstep firing on a frozen enemy's skipped hit.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ const o = {};
const pairSetup = () => { newGame(); state.region = 'sky'; configureRegion('sky'); state.talents = {}; state.playerLevel = 24; syncTalentVitals(false);
  let k, s; for (const key of Object.keys(rooms)) { s = roomSpawns(key).find(x => spawnAvailable(x) && pairMateFor(key, x)); if (s) { k = key; break; } }
  state.room = k; state.hp = state.maxHp = 999; state.tips = { pairs: true }; startBattle(s.uid); return state.battle; };
const mateTurn = (b, ok) => { for (let t = 1; t < 30; t++) { if (ok(withPairMate(b, () => enemyPlan(b, t)))) { b.turn = t; return t; } } };
const big = b => { b.enemy.hp = b.enemy.maxHp = b.pair.other.enemy.hp = b.pair.other.enemy.maxHp = 9999; };
const quiet = b => { b.siftPick = 0; b.hand = []; };

// 1. the target falls to Poison during the enemies' turn: the turn still ends and the next starts; the survivor acts once
let b = pairSetup(); b.hand = [make('strike')]; b.energy = 0; b.block = 0; b.poison = b.enemy.hp + 5; let t0 = b.turn; endTurn();
o.dot = { turn: b.turn - t0, phase: b.phase, energy: b.energy, hand: b.hand.length };
b.siftPick = 0; const n = b.logs.length, hp1 = state.hp; endTurn(); o.dotNext = { turn: b.turn - t0, actions: b.logs.slice(n).filter(l => /HP damage|A charged strike is coming|Rootguard|Frozen/.test(l)).length };
// ... and to a Prismatic Counter's returned damage
b = pairSetup(); { let t; for (t = 1; t < 30; t++) if (enemyPlan(b, t).kind === 'elemental') break; b.turn = t; const pl = enemyPlan(b);
  for (const [el, cn] of Object.entries(COUNTERS)) if (el === pl.element) b.counter = cn; }
b.enemy.hp = 3; b.hand = [make('strike')]; b.energy = 0; b.pair.other.freeze = 1; t0 = b.turn; endTurn(); o.counter = { turn: b.turn - t0, phase: b.phase, energy: b.energy };

// 2. Second Chance: the partner's lethal hit from full health is survived; from 20 HP (stale "before" of 100) it is not
const shirt = () => { state.relics = (state.relics || []).concat(['timewornShirt']); state.gear = { shirt: 'timewornShirt' }; state.maxHp = 100; };
b = pairSetup(); shirt(); mateTurn(b, p => p.kind === 'attack' || p.kind === 'heavy'); b.block = 0; state.hp = 100; b.pair.other.enemy.attack = 500; b.enemy.attack = 1;
b.hand = [make('strike'), make('strike')]; b.energy = 0; t0 = b.turn; endTurn(); o.second = { phase: b.phase, hp: state.hp, turn: b.turn - t0, block: b.block, hand: b.hand.map(c => c.id) };
b = pairSetup(); shirt(); b.gearHpBefore = 100; mateTurn(b, p => p.kind === 'attack' || p.kind === 'heavy'); b.block = 0; state.hp = 20; b.pair.other.enemy.attack = 500; b.enemy.attack = 1;
b.hand = []; b.energy = 0; endTurn(); o.secondStale = b.phase;

// 3. Phase Veil is spent by the partner's hit; Mirror Sigil reflects onto the partner and is spent
b = pairSetup(); big(b); aetherInit(b); b.veil = true; b.freeze = 9; o.veil = [];
for (let i = 0; i < 5; i++) { quiet(b); b.block = 0; const p = withPairMate(b, () => enemyPlan(b)), hp = state.hp; endTurn(); o.veil.push({ dmg: p.damage, veiled: p.veiled || 0, lost: hp - state.hp, veil: !!b.veil }); }
b = pairSetup(); big(b); aetherInit(b); b.mirror = true; b.freeze = 9; mateTurn(b, p => p.kind === 'attack'); quiet(b); b.block = 0;
{ const p = withPairMate(b, () => enemyPlan(b)), mh = b.pair.other.enemy.hp; endTurn(); o.mirror = { mirrored: p.mirrored || 0, mateLost: mh - b.pair.other.enemy.hp, mirror: !!b.mirror }; }

// 4. Rootbind on the partner wears off after the hit it softened
b = pairSetup(); b.bind = 6; pairSwitch(); b.enemy.attack = 1; big(b); o.bind = [];
for (let i = 0; i < 4; i++) { quiet(b); b.block = 0; const p = withPairMate(b, () => enemyPlan(b)); endTurn(); o.bind.push({ bound: p.bound || 0, bind: b.pair.other.bind || 0 }); }

// 5. the partner's guard Block lasts one of your turns
b = pairSetup(); b.enemy.attack = b.pair.other.enemy.attack = 1; big(b); o.guard = [];
for (let i = 0; i < 8; i++) { quiet(b); b.block = 99; const k = withPairMate(b, () => enemyPlan(b)).kind; endTurn(); o.guard.push({ k, g: b.pair.other.enemy.guard || 0 }); }

// 6. Pressure from damage on the target leaves the untouched partner's attack alone, and still lowers the target's
b = pairSetup(); mateTurn(b, p => p.kind === 'attack'); b.enemy.hp = b.enemy.maxHp = 999;
const mateBefore = withPairMate(b, () => enemyPlan(b)).damage; b.hand = [make('cleave'), make('cleave'), make('cleave')]; b.energy = 9; playCard(0); playCard(0);
o.pressure = { before: mateBefore, after: withPairMate(b, () => enemyPlan(b)).damage, dealt: pressureDealt(b), mateDealt: withPairMate(b, () => pressureDealt(b)) };

// 7. each enemy of a pair counts for quests
b = pairSetup(); ensureQuests(); const lead = b.id;
state.quests.taken['sky:species'] = { id: 'sky:species', kind: 'species', world: 'sky', target: lead, need: 3, have: 0, xp: 1, text: 'x' };
state.quests.taken['sky:hunt'] = { id: 'sky:hunt', kind: 'hunt', world: 'sky', need: 8, have: 0, xp: 1, text: 'y' };
b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0); b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0);
o.quests = { phase: b.phase, species: state.quests.taken['sky:species'].have, hunt: state.quests.taken['sky:hunt'].have };

// 8. Overkill bounty and Pressure measure the enemy the card hit, not the partner stepping in
b = pairSetup(); b.enemy.guard = 0; b.enemy.armor = 0; b.pair.other.enemy.hp = b.pair.other.enemy.maxHp = 40; b.enemy.hp = b.enemy.maxHp = 500;
b.bountyBigHit = 0; b.hand = [make('cleave')]; b.energy = 9; let h = b.enemy.hp; playCard(0); const dmg = h - b.enemy.hp;
b.bountyBigHit = 0; b.enemy.hp = dmg; b.hand = [make('cleave')]; b.energy = 9; playCard(0); o.overkill = { dmg, bigHit: b.bountyBigHit, survivorPressure: pressureDealt(b), stepped: b.pair.other.enemy.hp === 0 };

// 9-10. Riot Guard and Cloudstep wait for a real hit: a frozen enemy makes none
const solo = () => { newGame(); state.room = '1,5'; startBattle(roomSpawns('1,5').find(s => !s.boss).uid); const b = state.battle; b.enemy.hp = b.enemy.maxHp = 300; state.hp = state.maxHp = 200; return b; };
const atk = b => { for (let t = 1; t < 30; t++) { b.turn = t; if (enemyPlan(b).kind === 'attack') return; } };
b = solo(); state.relics = (state.relics || []).concat(['boots']); state.gear = { boots: 'boots' }; atk(b); b.freeze = 1; b.block = 10; b.hand = []; let eh = b.enemy.hp; endTurn(); o.riotFrozen = eh - b.enemy.hp;
b = solo(); state.relics = (state.relics || []).concat(['boots']); state.gear = { boots: 'boots' }; atk(b); b.block = 999; b.hand = []; eh = b.enemy.hp; endTurn(); o.riotHit = eh - b.enemy.hp;
b = solo(); state.relics = (state.relics || []).concat(['cloudstepBoots']); state.gear = { boots: 'cloudstepBoots' }; atk(b); b.freeze = 1; b.block = 0; b.hand = []; endTurn();
o.cloudFrozen = !!b.gearCloudUsed; atk(b); b.block = 0; { const p = enemyPlan(b), hp = state.hp; endTurn(); o.cloudNext = { plan: p.damage, lost: hp - state.hp, used: !!b.gearCloudUsed }; }
// Round 537: a won pair fight's chest, when it rolls a card, offers the card of the enemy that fell last (one chest a fight)
b = pairSetup(); { const R = Math.random; Math.random = () => 0.999; try { const mate = b.pair.other.id;
  b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0); b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0);
  o.drop = { phase: b.phase, offers: (b.offers || []).map(c => c.id), want: ENEMY_CARD[mate] }; } finally { Math.random = R; } }
return JSON.stringify(o); })()`));

assert.deepStrictEqual(r.dot, { turn: 1, phase: 'fight', energy: r.dot.energy, hand: r.dot.hand }, 'target killed by Poison: the turn advances ' + JSON.stringify(r.dot));
assert(r.dot.energy > 0 && r.dot.hand > 0, 'target killed by Poison: energy refilled and cards drawn ' + JSON.stringify(r.dot));
assert(r.dotNext.turn === 2 && r.dotNext.actions === 1, 'the survivor acts once the next turn ' + JSON.stringify(r.dotNext));
assert(r.counter.turn === 1 && r.counter.phase === 'fight' && r.counter.energy > 0, 'target killed by a Prismatic Counter: the turn advances ' + JSON.stringify(r.counter));
assert(r.second.phase === 'fight' && r.second.hp === 1 && r.second.turn === 1 && r.second.block === 0, 'Second Chance holds against the partner’s lethal hit from full HP ' + JSON.stringify(r.second));
assert(r.second.hand.length <= 4, 'after Second Chance the old hand is discarded before the draw ' + JSON.stringify(r.second));
assert.strictEqual(r.secondStale, 'lost', 'Second Chance does not use a stale HP from an earlier turn');
const veiled = r.veil.filter(v => v.veiled > 0);
assert(veiled.length === 1 && r.veil.some(v => v.dmg > 0 && v.lost > 0), 'Phase Veil cancels one partner hit, then partner hits land ' + JSON.stringify(r.veil));
assert(r.mirror.mirrored > 0 && r.mirror.mateLost >= r.mirror.mirrored && !r.mirror.mirror, 'Mirror Sigil reflects onto the partner and is spent ' + JSON.stringify(r.mirror));
assert(r.bind[0].bound === 6 && r.bind.slice(1).every(x => !x.bound), 'Rootbind on the partner softens one hit only ' + JSON.stringify(r.bind));
for (let i = 1; i < r.guard.length; i++) if (r.guard[i - 1].k === 'guard') assert(r.guard[i].k === 'guard' || r.guard[i].g === 0, 'the partner’s guard Block lasts one turn ' + JSON.stringify(r.guard));
assert(r.guard.some(x => x.k === 'guard' && x.g > 0), 'the partner still guards ' + JSON.stringify(r.guard));
assert(r.pressure.dealt > 0 && r.pressure.mateDealt === 0 && r.pressure.after === r.pressure.before, 'Pressure on the target leaves the partner alone ' + JSON.stringify(r.pressure));
assert.deepStrictEqual(r.quests, { phase: 'reward', species: 1, hunt: 2 }, 'each enemy of a pair counts for quests');
assert(r.overkill.stepped && r.overkill.bigHit >= r.overkill.dmg && r.overkill.survivorPressure === 0, 'Overkill and Pressure measure the enemy hit ' + JSON.stringify(r.overkill));
assert.strictEqual(r.riotFrozen, 0, 'Riot Guard: no damage to a frozen enemy that never attacked');
assert(r.riotHit > 0, 'Riot Guard still answers a blocked hit');
assert.strictEqual(r.cloudFrozen, false, 'Cloudstep is not used up by a frozen enemy');
assert(r.cloudNext.used && r.cloudNext.lost < r.cloudNext.plan, 'Cloudstep halves the next real hit ' + JSON.stringify(r.cloudNext));
assert(r.drop.phase === 'reward' && r.drop.offers.length === 1 && r.drop.offers[0] === r.drop.want, 'a pair fight drops the last enemy’s card ' + JSON.stringify(r.drop));
console.log('pair-gear-bugs ok');
