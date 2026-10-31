'use strict';
// Round 286: bounties are decided before the fight (on the map label), three new kinds, and XP for completing them.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const o = {};
  newGame(); configureRegion('city'); state.room = '1,5';
  const s = roomSpawns('1,5').find(x => !x.boss); o.planned = spawnBounty(s); o.same = spawnBounty(s) === o.planned;
  renderWorld(); const l = bountyLabel(s); o.label = l.name; o.tip = l.tip;
  startBattle(s.uid); o.fight = state.battle.bounty;
  // Bare-knuckle: Block from a card fails it
  let b = state.battle; b.bounty = 'bareKnuckle'; b.hand = [make('guard')]; b.energy = 3; playCard(0); o.bare = bountyFailed(b);
  // Combo: four cards in a turn
  b.bounty = 'combo'; b.bountyCombo = 0; b.hand = ['strike', 'strike', 'strike', 'strike'].map(x => make(x)); b.energy = 9; b.enemy.hp = 999; for (let i = 0; i < 4; i++) playCard(0); o.combo = bountyMet(b);
  // Completing a bounty pays XP too; the spawn then rolls a new one
  b.bounty = 'combo'; b.enemy.elite = false; b.enemy.boss = false; const xp0 = state.xp + state.playerLevel * 100, sh0 = state.shards; b.enemy.hp = 0; winBattle();
  o.xp = state.xp + state.playerLevel * 100 - xp0 - (b.xpGain || 0); o.shards = state.shards - sh0; o.special = (b.special || []).join(' ');
  o.gen = state.bountyGen[s.uid];
  // Every spawn in every world has a known bounty; exploit only with an element
  o.bad = []; for (const w of WORLD_ORDER) { configureRegion(w); for (const k of Object.keys(rooms)) for (const x of roomSpawns(k)) { const id = spawnBounty(x); if (!BOUNTIES[id] || (id === 'exploit' && !x.element)) o.bad.push(w + ':' + x.uid); } }
  return JSON.stringify(o); })()`));
assert(r.planned && r.same, "a patrol's bounty is fixed before the fight");
assert(r.label.includes('·★'), 'the map label shows the bounty: ' + r.label); assert(/Bounty:/.test(r.tip));
assert.strictEqual(r.fight, r.planned, 'the fight takes the planned bounty');
assert(r.bare, 'Bare-knuckle fails on card Block'); assert(r.combo, 'Combo is met by four cards in a turn');
assert.strictEqual(r.xp, 8, 'a regular bounty pays +8 XP'); assert(r.shards >= 3); assert(/\+8 XP/.test(r.special), r.special);
assert.strictEqual(r.gen, 1, 'the spawn rolls a new bounty after the fight');
assert.deepStrictEqual(r.bad, []);
console.log('bounty-plan ok');
