'use strict';
// Round 265: no two enemies fight the same way. Inside each world no two enemies share a move pattern or a
// signature trait, and no two regular enemies share an affliction; no enemy anywhere has the same full set.
process.env.HARNESS_ONLY = '1'; process.env.TRAITS = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{ const o = { worlds: {}, kits: [] };
for (const w of WORLD_ORDER) { newGame(); configureRegion(w); const ids = new Set(); for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) ids.add(s.type);
  o.worlds[w] = [...ids].map(id => { const e = enemies[id]; const pat = (BOSS_PATTERNS[id] || (e.element ? ['attack', 'charge', 'elemental', 'guard'] : ['attack', 'guard', 'heavy'])).join('>');
    return { id, boss: !!e.boss, pat, trait: SPECIES_TRAIT[id] || null, aff: (ENEMY_AFFLICTIONS[id] || []).join('+') }; }); }
// Behaviour, through the real engine.
const setup = (trait, hand) => { newGame(); state.room = '1,5'; startBattle(roomSpawns('1,5').find(s => !s.boss).uid); const b = state.battle;
  b.enemy = { ...b.enemy, hp: 300, maxHp: 300, armor: 0, guard: 0, attack: 20, baseAttack: 20, trait }; b.hand = hand.map(id => make(id)); b.energy = 9; state.hp = state.maxHp = 200; return b; };
let b = setup('thorns', ['strike']); playCard(0); o.thorns = 200 - state.hp;
b = setup('phasing', ['strike', 'strike']); let h = b.enemy.hp; playCard(0); o.phase1 = h - b.enemy.hp; h = b.enemy.hp; playCard(0); o.phase2 = h - b.enemy.hp;
b = setup('staticField', ['strike', 'strike']); o.costs = [stat(b.hand[0]).cost]; playCard(0); o.costs.push(stat(b.hand[0]).cost);
b = setup('undying', ['strike']); b.enemy.hp = 3; playCard(0); o.undying = { phase: b.phase, hp: b.enemy.hp };
b = setup('regen', []); b.enemy.hp = 200; b.block = 999; endTurn(); o.regen = b.enemy.hp - 200;
b = setup('frenzy', []); b.turn = 1; b.block = 999; const plan = enemyPlan(b); endTurn(); o.frenzy = { kind: plan.kind, attack: b.enemy.attack };
b = setup('punisher', []); const pun = enemyPlan(b).damage; b.block = 5; o.punisher = [pun, enemyPlan(b).damage];
return JSON.stringify(o); })()`));
const all = [];
for (const [w, list] of Object.entries(r.worlds)) {
  const traits = list.map(x => x.trait).filter(Boolean), pats = list.map(x => x.pat), regAff = list.filter(x => !x.boss).map(x => x.aff);
  assert(list.every(x => x.trait), w + ': every enemy has a trait (' + list.filter(x => !x.trait).map(x => x.id) + ')');
  assert.strictEqual(new Set(traits).size, traits.length, w + ': no two enemies share a trait');
  assert.strictEqual(new Set(pats).size, pats.length, w + ': no two enemies share a move pattern (' + pats.join(' | ') + ')');
  assert.strictEqual(new Set(regAff).size, regAff.length, w + ': no two regular enemies share an affliction (' + regAff.join(', ') + ')');
  for (const x of list) all.push(x.pat + '|' + x.trait + '|' + x.aff);
}
assert.strictEqual(new Set(all).size, all.length, 'no enemy anywhere has the same full set of abilities');
assert(r.thorns > 0, 'Thorns: your hit costs you HP');
assert(r.phase1 > 0 && r.phase2 > r.phase1, 'Phasing: the first hit each turn deals half (' + r.phase1 + ' then ' + r.phase2 + ')');
assert.deepStrictEqual(r.costs, [2, 1], 'Static field: the first card each turn costs 1 more');
assert(r.undying.phase === 'fight' && r.undying.hp > 0, 'Undying: it gets back up once');
assert(r.regen > 0, 'Regeneration heals it');
assert(r.frenzy.kind !== 'attack' && r.frenzy.kind !== 'heavy' || r.frenzy.attack > 20, 'Frenzy: its attack rises when it attacks');
assert(r.punisher[0] > r.punisher[1], 'Punisher: harder hits when you have no Block');
console.log('enemy-traits ok');
