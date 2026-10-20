// Round 211: the victory screens show the final turn (cards played, what each did, the finishing blow).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname, '../assets/battle-recap.js'), 'utf8'));
const r = JSON.parse(run(`JSON.stringify((() => {
  newGame(); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss)); state.room = k;
  const fight = () => { state.battle = null; state.cooldowns = {}; state.cleared = []; startBattle(roomSpawns(k).find(s => !s.boss).uid); const b = state.battle; b.enemy.armor = 0; b.energy = 3; return b; };
  let b = fight(); b.hand = [make('guard'), make('strike'), make('strike')]; b.enemy.hp = 9;
  playCard(0); playCard(0); playCard(0);
  const card = { phase: b.phase, recap: b.recapFinal };
  // Last turn's cards don't carry over to the turn that wins.
  b = fight(); b.hand = [make('strike'), make('strike')]; b.enemy.hp = 50; playCard(0); b.turn++; b.enemy.hp = 4; playCard(0);
  const turns = b.recapFinal;
  // A win that no card dealt (damage over time) still names what finished it.
  b = fight(); b.hand = []; b.logs.push('Burn: 3 damage.'); b.enemy.hp = 0; winBattle();
  const dot = b.recapFinal;
  state.battle = null;
  return { card, turns, dot, html: recapHTML({ recapFinal: [{ name: '<b>x', what: '', finisher: true }] }) };
})())`));
assert.equal(r.card.phase, 'reward');
assert.deepStrictEqual(r.card.recap.map(l => [l.name, l.what, l.finisher]), [['Crystal Ward', '+5 Block', false], ['Ember Blade', '6 damage', false], ['Ember Blade', '3 damage', true]], 'each card, what it did, and the finishing blow');
assert.deepStrictEqual(r.turns.map(l => l.name), ['Ember Blade'], 'only the final turn');
assert(r.dot.length === 1 && r.dot[0].finisher && /Burn/.test(r.dot[0].name), 'a damage-over-time win names the burn');
assert(r.html.includes('&lt;b&gt;x') && !r.html.includes('<b>x'), 'names are escaped');
console.log('PASS: the victory screens show the final turn: cards played, what each did, and the finishing blow.');
