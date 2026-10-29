'use strict';
// Round 290: a sure heal at an event can't be picked at full HP (it would use up the event, or Shards, for nothing).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => {
  newGame(); configureRegion('city'); const o = {};
  const wasted = (ev, i) => eventHealWasted(EVENTS[ev].choices()[i]);
  state.hp = state.maxHp;
  o.full = { medic: wasted('medic', 0), spring: wasted('spring', 0), shelter: wasted('shelter', 0), seedpod: wasted('seedpod', 1), supplies: wasted('medic', 1) };
  o.extra = Object.keys(EVENTS).filter(k => EVENTS[k].choices().some(c => eventHealWasted(c))).sort();
  state.hp = state.maxHp - 5; o.hurt = wasted('medic', 0);
  return JSON.stringify(o); })()`));
assert(r.full.medic, 'the Medic does not take Shards at full HP');
assert(r.full.spring && r.full.shelter, 'free sure heals wait until you are hurt');
assert(!r.full.seedpod, 'a gamble with a heal in it stays available');
assert(!r.full.supplies, 'the other choice stays available');
assert(!r.hurt, 'hurt: the heal can be picked');
console.log('sure heals held at full HP:', r.extra.join(', '));
console.log('event-heal ok');
