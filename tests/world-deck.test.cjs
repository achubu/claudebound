// Round 163: deck size grows with bosses beaten rather than a flat +4 outside the city, and a
// save that is over the new limit is trimmed on load instead of blocking fights.
// Round 233: +1 for every boss, mini-bosses included; newly gained cards never go into the deck
// on their own, and the Deck button counts the new ones.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{newGame();state.talents={};const base=maxDeckSize();
 state.region='vespera';const vesperaNoBoss=maxDeckSize();
 const bosses=[];for(const w of WORLD_ORDER){configureRegion(w);for(const r of Object.values(rooms))if(r.enemy&&enemies[r.enemy[0]]&&enemies[r.enemy[0]].boss&&!bosses.includes(r.enemy[0]))bosses.push(r.enemy[0]);}
 configureRegion('city');state.region='city';
 const steps=[];for(const id of bosses){state.bosses.push(id);steps.push(maxDeckSize())}
 state.bosses.push(bosses[0]);const dup=maxDeckSize();
 state.bosses=['thornWarden'];while(state.pool.length<12)state.pool.push(make('strike'));state.deck=state.pool.slice(0,12).map(c=>c.uid);
 fitDeckToLimit();const trimmed=state.deck.length,issue=deckIssue(),limit=maxDeckSize();
 // New cards: a battle reward, a world's arrival gift and a side card stay out of the deck.
 newGame();state.talents={};markCardsSeen();const deck0=state.deck.slice(),side0=state.side.deck.slice();
 state.battle={phase:'reward',lootType:'choice',offers:[make('cleave')],logs:[],special:[]};chooseCardReward(0);
 state.battle=null;mechanicGift('sky',false);addSideCard('purify');
 const fresh=newCardCount(),badge=(updateDeckBadge(),$('deckBtn').textContent);
 try{showDeck()}catch(e){} const afterOpen=newCardCount();closeMenu(); // the harness DOM can't draw the Deck screen; the count clears first
 return JSON.stringify({base,vesperaNoBoss,steps,count:bosses.length,dup,trimmed,limit,issue,scale:typeof talentScale,
   deckSame:JSON.stringify(state.deck)===JSON.stringify(deck0),sideSame:JSON.stringify(state.side.deck)===JSON.stringify(side0),fresh,badge,afterOpen})})()`));
assert.strictEqual(r.vesperaNoBoss, r.base, 'no flat bonus for the world you stand in');
assert.strictEqual(r.count, 18, 'three bosses in each of the six worlds');
assert.deepStrictEqual(r.steps, r.steps.map((_, i) => r.base + i + 1), '+1 for every boss beaten, mini-bosses included');
assert.strictEqual(r.dup, r.base + r.count, 'a boss counts once');
assert.strictEqual(r.trimmed, r.limit, 'over-limit deck trimmed to the limit');
assert.strictEqual(r.issue, '', 'trimmed deck can fight');
assert.strictEqual(r.scale, 'undefined', 'no talent multiplier left');
assert(r.deckSame, 'a reward card and a world gift wait in the collection, not the deck');
assert(r.sideSame, 'a new side card waits in the collection');
assert.strictEqual(r.fresh, 4, 'four new cards counted (reward, two gift cards, side card)');
assert.strictEqual(r.badge, 'Deck · 4 new', 'the Deck button says so');
assert.strictEqual(r.afterOpen, 0, 'opening the Deck screen clears the count');
console.log('world-deck ok');
