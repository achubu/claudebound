'use strict';
// Round 283: every boss has a signature twist and a Phase 2 at half health; final bosses go into Overdrive.
process.env.HARNESS_ONLY = '1'; process.env.BOSS_TWISTS = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const o = {};
  newGame();
  // every boss in every world has a twist
  o.missing = []; for (const w of WORLD_ORDER) { configureRegion(w); for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) if (s.boss && !BOSS_TWISTS[s.type]) o.missing.push(w + ':' + s.type); }
  configureRegion('city');
  const fight = (id) => { newGame(); configureRegion('city'); state.hp = state.maxHp = 200; const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => s.type === 'thornWarden')); state.room = k;
    const s = roomSpawns(k).find(s => s.type === 'thornWarden'); startBattle(s.uid); const b = state.battle; b.id = id; b.enemy = { ...b.enemy, boss: true, hp: 400, maxHp: 400, armor: 0, guard: 0, attack: 10 };
    b.hand = ['strike', 'strike', 'guard', 'guard', 'riposte'].map(x => make(x)); b.draw = Array.from({ length: 20 }, () => make('strike')); b.discard = []; b.energy = 9; b.turn = 1; return b; };
  // countdown: turn 4 hits x2 unless broken
  let b = fight('crownSentinel'); const plain = enemyPlanBeforeTwists(b, 4).damage, blow = enemyPlan(b, 4).damage;
  o.countdown = { plain, blow, need: countdownNeed(b) };
  b.turn = 4; b.pressureTurn = 4; b.pressureDmg = countdownNeed(b); o.countdown.broken = !!enemyPlan(b, 4).twist;
  // roots: after turn 1 ends, turn 2 has a rooted card that cannot be played
  b = fight('thornWarden'); endTurn(); o.roots = { turn: b.turn, rooted: (b.rooted || []).length, unplayable: b.hand.filter(c => stat(c).unplayable).length };
  const ri = b.hand.findIndex(c => stat(c).rooted), before = b.hand.length; playCard(ri); o.roots.stillThere = b.hand.length === before;
  // eclipse: block halved on turn 3
  b = fight('bloomTyrant'); b.turn = 3; b.block = 0; b.hand = [make('guard')]; playCard(0); o.eclipse = { block: b.block, full: statBeforeTwists(make('guard')).block };
  // surcharge: priciest card +1 on turn 3
  b = fight('stormbellWarden'); b.turn = 3; o.surcharge = b.hand.map(c => stat(c).cost - statBeforeTwists(c).cost).reduce((a, x) => a + x, 0);
  // aegis: after turn 3 ends it has Block
  b = fight('moonKnight'); b.turn = 3; endTurn(); o.aegis = b.enemy.guard;
  // phase 2 + overdrive on a final boss
  b = fight('thornWarden'); b.enemy.hp = 120; checkBossPhase(b); o.phase2 = !!b.twistPhase2;
  let guardTurn = 0; for (let t = 1; t < 12; t++) if (enemyPlanBeforeTwists(b, t).kind === 'guard') { guardTurn = t; break; }
  o.overdrive = guardTurn ? enemyPlan(b, guardTurn).kind : 'no guard turn';
  // rewind heals once at half
  b = fight('paradoxTwin'); b.enemy.hp = 190; b.poison = 5; checkBossPhase(b); o.rewind = { hp: b.enemy.hp, poison: b.poison };
  return JSON.stringify(o); })()`));
assert.deepStrictEqual(r.missing, [], 'every boss has a twist');
assert(r.countdown.blow === Math.round(r.countdown.plain * 2) && r.countdown.broken === false, 'the countdown blow hits x2 unless broken');
assert(r.roots.turn === 2 && r.roots.rooted === 1 && r.roots.unplayable >= 1 && r.roots.stillThere, 'a rooted card cannot be played');
assert(r.eclipse.block === Math.ceil(r.eclipse.full / 2), 'Eclipse halves Block from cards');
assert.strictEqual(r.surcharge, 1, 'Surcharge raises one card by 1');
assert.strictEqual(r.aegis, 32, 'Aegis gives 8% of max HP as Block');
assert(r.phase2 && r.overdrive === 'attack', 'Phase 2 at half health; final bosses stop guarding');
assert(r.rewind.hp === 250 && r.rewind.poison === 0, 'Rewind heals 15% and clears Poison');
console.log('PASS: boss twists, Phase 2 and Overdrive.');
