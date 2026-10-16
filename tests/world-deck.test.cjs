// Round 163: deck size grows by 1 for each world boss beaten (Thorn Warden,
// Bloom Tyrant, Storm Tyrant) rather than a flat +4 outside the city, and a
// save that is over the new limit is trimmed on load instead of blocking fights.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{newGame();state.talents={};const base=maxDeckSize();
 state.region='vespera';const vesperaNoBoss=maxDeckSize();
 const steps=[];for(const id of ['thornWarden','bloomTyrant','stormTyrant','chronarch']){state.bosses.push(id);steps.push(maxDeckSize())}
 state.bosses=['thornWarden'];while(state.pool.length<12)state.pool.push(make('strike'));state.deck=state.pool.slice(0,12).map(c=>c.uid);
 fitDeckToLimit();const trimmed=state.deck.length,issue=deckIssue();
 return JSON.stringify({base,vesperaNoBoss,steps,trimmed,limit:maxDeckSize(),issue,scale:typeof talentScale})})()`));
assert.strictEqual(r.vesperaNoBoss, r.base, 'no flat bonus for the world you stand in');
assert.deepStrictEqual(r.steps, [r.base + 1, r.base + 2, r.base + 3, r.base + 3], '+1 per world boss; the final boss opens no world');
assert.strictEqual(r.trimmed, r.limit, 'over-limit deck trimmed to the limit');
assert.strictEqual(r.issue, '', 'trimmed deck can fight');
assert.strictEqual(r.scale, 'undefined', 'no talent multiplier left');
console.log('world-deck ok');
