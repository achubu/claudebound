'use strict';
// Round 285: combat feel (floating numbers, shake, flashes, sound). It changes no rules and must never throw.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const o = {};
  newGame(); configureRegion('city'); state.room = '1,5'; const s = roomSpawns('1,5').find(x => !x.boss); startBattle(s.uid);
  const b = state.battle; b.hand = [make('strike'), make('guard')]; b.energy = 3;
  playCard(0); playCard(0); endTurn(); b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0);
  o.phase = state.battle.phase; o.sounds = Object.keys(JUICE_SOUNDS).sort();
  juiceSetMuted(true); o.muted = juiceMuted(); juiceSetMuted(false); o.unmuted = !juiceMuted();
  for (const k of o.sounds) juiceSound(k);
  return JSON.stringify(o); })()`));
assert.strictEqual(r.phase, 'reward', 'a fight plays through with the effects on');
assert.deepStrictEqual(r.sounds, ['bigHit', 'block', 'crash', 'heal', 'hit', 'hurt', 'lose', 'phase', 'win']);
assert(r.muted && r.unmuted, 'the sound switch is remembered');
console.log('juice ok');
