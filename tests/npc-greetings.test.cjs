'use strict';
// Round 281: the merchant and the Cardsmith greet you once, the first time you enter their room.
process.env.HARNESS_ONLY = '1'; process.env.NPC_GREET = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const out = {};
  out.start = npcGreetingDue();
  const m = merchantRoom(); state.room = m.key; out.atMerchant = npcGreetingDue();
  state.npcMet = { merchant: true }; out.afterMet = npcGreetingDue();
  const c = cardsmithFor(); state.room = c.key; out.atSmith = npcGreetingDue();
  state.battle = {}; out.inBattle = npcGreetingDue(); state.battle = null;
  return JSON.stringify(out); })()`));
assert.strictEqual(r.start, null, 'no greeting in the start room');
assert.strictEqual(r.atMerchant, 'merchant', 'the merchant greets you in their room');
assert.strictEqual(r.afterMet, null, 'only once');
assert.strictEqual(r.atSmith, 'cardsmith', 'the Cardsmith greets you in theirs');
assert.strictEqual(r.inBattle, null, 'never during a battle');
console.log('PASS: the merchant and the Cardsmith greet you once, in their rooms.');
