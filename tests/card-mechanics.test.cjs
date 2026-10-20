// Round 206: three mechanics from the Cardbound concept lab: Follow-through, Amplify, Choose one.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`JSON.stringify((() => {
  const out = {};
  const ids = ['cinderCapacitor', 'duskProtocol', 'crystalAegis', 'tidalDecision', 'wardbreakerStep', 'afterimageWard'];
  out.pools = Object.fromEntries(ids.map(id => [id, Object.keys(VARIETY_POOLS).filter(w => VARIETY_POOLS[w].includes(id))]));
  out.rules = Object.fromEntries(ids.map(id => [id, rules(make(id))]));
  newGame(); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss)); state.room = k;
  const fight = (...cards) => { state.battle = null; startBattle(roomSpawns(k).find(s => !s.boss).uid); const b = state.battle; b.enemy.hp = b.enemy.maxHp = 999; b.enemy.armor = 0; b.block = 0; b.energy = 3; b.hand = cards.map(id => make(id)); b.draw = Array.from({ length: 6 }, () => make('strike')); return b; };
  // Follow-through: Wardbreaker Step after a Defense card hits harder; after an Attack it doesn't.
  let b = fight('guard', 'wardbreakerStep'); playCard(0); let hp = b.enemy.hp; out.readyGlow = followReady(b, stat(b.hand[0])); playCard(0); out.afterDefense = hp - b.enemy.hp;
  b = fight('strike', 'wardbreakerStep'); playCard(0); hp = b.enemy.hp; playCard(0); out.afterAttack = hp - b.enemy.hp;
  b = fight('guard', 'wardbreakerStep'); playCard(0); b.turn++; hp = b.enemy.hp; playCard(0); out.nextTurn = hp - b.enemy.hp;
  b = fight('strike', 'afterimageWard'); playCard(0); const bl = b.block; playCard(0); out.wardAfterAttack = b.block - bl;
  // Suspend's automatic plays don't start a sequence.
  b = fight('guard', 'wardbreakerStep'); b.firingUid = b.hand[0].uid; playCard(0); b.firingUid = null; hp = b.enemy.hp; playCard(0); out.afterAuto = hp - b.enemy.hp;
  // Amplify: one more energy for the bonus; a plain play costs 1.
  b = fight('cinderCapacitor'); hp = b.enemy.hp; playCardWith(0, { amplify: true }); out.amp = { dmg: hp - b.enemy.hp, energy: b.energy, log: b.logs.some(l => /Amplified/.test(l)) };
  b = fight('cinderCapacitor'); hp = b.enemy.hp; playCard(0); out.plain = { dmg: hp - b.enemy.hp, energy: b.energy };
  b = fight('cinderCapacitor'); b.energy = 1; playCardWith(0, { amplify: true }); out.ampNoEnergy = { inHand: b.hand.length, energy: b.energy };
  b = fight('crystalAegis'); playCardWith(0, { amplify: true }); out.aegis = b.block;
  // Choose one: only the chosen mode resolves; clicking the card plays the first.
  b = fight('duskProtocol'); hp = b.enemy.hp; playCardWith(0, { mode: 1 }); out.duskBlock = { block: b.block, dmg: hp - b.enemy.hp };
  b = fight('duskProtocol'); hp = b.enemy.hp; playCard(0); out.duskClick = { block: b.block, dmg: hp - b.enemy.hp };
  b = fight('tidalDecision'); const h0 = b.hand.length; playCardWith(0, { mode: 1 }); out.tidalDraw = { hand: b.hand.length - h0, block: b.block, exhausted: b.exhaust.some(c => c.id === 'tidalDecision') };
  state.battle = null;
  return out;
})())`));
assert.deepStrictEqual(r.pools, { cinderCapacitor: ['city'], duskProtocol: ['city'], crystalAegis: ['wilds'], tidalDecision: ['wilds'], wardbreakerStep: ['vespera'], afterimageWard: ['vespera'] }, 'each new card drops in one world');
assert.match(r.rules.cinderCapacitor, /Deal 5 damage\..*Amplify \(\+1 energy\): \+6 damage/);
assert.match(r.rules.duskProtocol, /^Choose one: deal 5 damage; or gain 4 Block\.$/);
assert.match(r.rules.tidalDecision, /Choose one: gain 7 Block; or draw 1 card\. Exhaust\./);
assert.match(r.rules.wardbreakerStep, /Deal 4 damage\..*Follow-through: .*a Defense, \+4 damage/);
assert(r.readyGlow, 'the card shows it is ready');
assert.equal(r.afterDefense, 8, 'Wardbreaker Step after a Defense card: 4 + 4');
assert.equal(r.afterAttack, 4, 'after an Attack: no bonus');
assert.equal(r.nextTurn, 4, 'the sequence ends with the turn');
assert.equal(r.wardAfterAttack, 7, 'Afterimage Ward after an Attack: 3 + 4 Block');
assert.equal(r.afterAuto, 4, "Suspend's automatic plays don't start a sequence");
assert.deepStrictEqual(r.amp, { dmg: 11, energy: 1, log: true }, 'Amplify: 2 energy for 5 + 6');
assert.deepStrictEqual(r.plain, { dmg: 5, energy: 2 }, 'a plain play costs 1');
assert.deepStrictEqual(r.ampNoEnergy, { inHand: 1, energy: 1 }, 'Amplify needs the energy');
assert.equal(r.aegis, 9, 'Crystal Aegis amplified: 4 + 5 Block');
assert.deepStrictEqual(r.duskBlock, { block: 4, dmg: 0 }, 'Dusk Protocol block mode only blocks');
assert.deepStrictEqual(r.duskClick, { block: 0, dmg: 5 }, 'clicking the card plays the first mode');
assert.deepStrictEqual(r.tidalDraw, { hand: 0, block: 0, exhausted: true }, 'Tidal Decision draw mode: draws 1 (replacing itself) and exhausts');
console.log('PASS: Follow-through, Amplify and Choose one work as printed; the six concept-lab cards drop in their worlds.');
