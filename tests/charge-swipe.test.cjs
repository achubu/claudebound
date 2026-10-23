'use strict';
// Round 242: on a charge turn an enemy swipes for a light hit (Block and Armor apply), and you discard
// a card of your choice at the start of your next turn. (Neon Aftermath's patrols have no element and
// never charge; its elemental bosses do.) Fire enemies are left out: their 🥵 Sunstroke hurts on top of the swipe.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{
newGame(); state.region='elaris'; configureRegion('elaris'); state.talents={};
const k=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>spawnAvailable(s)&&!s.boss&&enemies[s.type].element&&enemies[s.type].element!=='fire')); state.room=k;
startBattle(roomSpawns(k).find(s=>spawnAvailable(s)&&!s.boss&&enemies[s.type].element&&enemies[s.type].element!=='fire').uid);
const b=state.battle; b.enemy.hp=b.enemy.maxHp=999; b.enemy.attack=20;
const t=[...Array(12).keys()].find(t=>t>0&&enemyPlan(b,t).kind==='charge'); b.turn=t; const plan=enemyPlan(b);
const o={ name: plan.name, swipe: plan.swipe, bubble: intentBubble(plan,'now','x',false) };
b.hand=[]; b.block=2; state.hp=state.maxHp; endTurn();
o.lost=state.maxHp-state.hp; o.popup=swipePopupHTML(b); o.pending=siftPending(b); o.reason=b.siftReason; o.choices=siftChoices(b).length; o.hand=b.hand.length;
const blocked=(playCard(0), b.hand.length); o.blocked=blocked===o.hand;
const gone=b.hand[0].uid; siftDiscard(0); o.after={ pending: siftPending(b), discarded: b.discard.some(c=>c.uid===gone), reason: b.siftReason };
// A frozen enemy doesn't swipe.
b.turn=[...Array(30).keys()].find(x=>x>b.turn&&enemyPlan(b,x).kind==='charge'); b.freeze=1; state.hp=state.maxHp; endTurn(); o.frozen={ lost: state.maxHp-state.hp, pending: siftPending(b) };
return JSON.stringify(o); })()`));
assert(r.name.includes('🗡 Swipe') && r.swipe === 6, 'a charge turn swipes for 30% of the attack (' + r.swipe + ')');
assert(r.bubble.includes('🗡 Swipe: 6 damage') && /discard 1 card/.test(r.bubble), 'the intent says so');
assert.strictEqual(r.lost, 4, 'the swipe is blocked as usual (6 - 2 Block)');
assert(r.pending && r.reason === 'swipe' && r.choices === r.hand && r.hand > 0, 'next turn you choose a card to discard (any card)');
assert(r.blocked, 'no card can be played before discarding');
assert(/swiped at you/.test(r.popup) && /4 HP/.test(r.popup) && /Choose a card to discard/.test(r.popup), 'Round 245: a pop-up says who swiped, for how much, and asks for the discard');
assert(!r.after.pending && r.after.discarded && !r.after.reason, 'the chosen card is discarded and play goes on');
assert(r.frozen.lost === 0 && !r.frozen.pending, 'a frozen enemy does not swipe');
console.log('charge-swipe ok');
