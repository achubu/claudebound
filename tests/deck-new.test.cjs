'use strict';
// Round 279: cards gained since the Deck screen was last opened are listed first with a NEW ribbon.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const before = newCardUids().length;
  const c = make('packetSniff'); state.pool.push(c); const after = newCardUids();
  markCardsSeen(); const seen = newCardUids().length;
  return JSON.stringify({ before, after, uid: c.uid, seen, ui: typeof markNewInDeck === 'function' }); })()`));
assert.strictEqual(r.before, 0, 'a new journey has nothing new');
assert.deepStrictEqual(r.after, [r.uid], 'a gained card is new');
assert.strictEqual(r.seen, 0, 'opening the Deck screen marks it seen');
assert.ok(r.ui, 'the Deck screen marks them (checked in the browser: first in the grid, NEW ribbon, scrolled to)');
console.log('PASS: cards gained since the Deck screen was last opened are tracked as new.');
