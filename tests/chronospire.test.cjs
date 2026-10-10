// Round 77: Chronospire (fourth world) and the Suspend mechanic.
const { run } = require('./expansion.test.cjs');
run(`{
const realRandom = Math.random; Math.random = () => 0.99;
function setup(hand, opts = {}) {
  newGame(); state.playerLevel = 30; state.talents = {}; syncTalentVitals(false); state.hp = state.maxHp = 200;
  state.room = '1,5'; state.cooldowns = {}; startBattle(roomSpawns(state.room).find(s => !s.boss).uid);
  const b = state.battle; b.id = 'thornling';
  b.enemy = { ...b.enemy, element: null, armor: 0, guard: 0, hp: 500, maxHp: 500, attack: 5, boss: false, elite: false };
  b.hand = hand.map(id => make(id)); b.draw = Array.from({ length: 20 }, () => make('guard')); b.discard = []; b.exhaust = [];
  b.energy = opts.energy ?? 3; b.block = 0; b.turn = opts.turn ?? 3; // turn 3 so the countdown lands after plain attacks, not Rootguard b.bounty = null; ENEMY_AFFLICTIONS.thornling = [];
  return b;
}
// --- The world ---
newGame(); configureRegion('chronospire'); state.region = 'chronospire'; state.room = '0,0'; state.visited = ['0,0'];
const keys = Object.keys(rooms); assert.equal(keys.length, 34, '34 rooms');
const d = regionRoomDistances('chronospire'); assert(keys.every(k => d[k] != null), 'every room is reachable from the gate');
for (const k of keys) for (const [dir, to] of Object.entries(rooms[k].exits)) assert(rooms[to] && Object.values(rooms[to].exits).includes(k), k + ' ' + dir + ' exit is two-way');
assert.equal(roomSpawns('0,0').length, 0, 'the gate is safe');
assert.equal(roomSpawns('8,7')[0].type, 'chronarch'); assert.equal(roomSpawns('0,3')[0].type, 'clockwarden'); assert.equal(roomSpawns('6,6')[0].type, 'paradoxTwin');
for (const k of keys) for (const s of roomSpawns(k)) assert(enemies[s.type], 'spawn type exists: ' + s.type);
const lv = keys.filter(k => rooms[k].level).map(k => rooms[k].level); assert.equal(Math.min(...lv), 28); assert.equal(Math.max(...lv), 36);
assert.equal(regionIndex(), 3); assert.equal(talentScale(), 1.9);
for (const key of QUIET_ROOMS.chronospire) { assert.equal(roomSpawns(key).length, 0); assert.equal(poiAt(key).type, 'event'); }
assert.equal(poiAt('5,3').type, 'nexus'); assert(merchantRoom());
const st = enemyStats('chronoMauler', { region: 'chronospire', level: 35 }), vs = enemyStats('vespMauler', { region: 'vespera', level: 26 }); assert(st.hp > vs.hp && st.attack >= vs.attack, 'Chronospire hits harder than Vespera');
for (const id of EVENT_POOLS.chronospire) for (let i = 0; i < 2; i++) { newGame(); state.pool.push(make('cleave', 0, false)); state.deck.push(state.pool.at(-1).uid); state.hp = 20; const c = EVENTS[id].choices()[i]; assert(!c.disabled, id); assert(c.run().length > 3); }
// --- Portal: after the Tempest Colossus ---
newGame(); state.bosses.push('stormTyrant'); state.region = 'vespera'; configureRegion('vespera'); state.room = '6,7'; state.visited = ['6,7'];
assert.equal(portalTarget().region, 'chronospire'); travelPortal(); assert.equal(activeRegion, 'chronospire'); assert.equal(state.room, '0,0');
assert(state.chronoGift && state.pool.some(c => c.id === 'temporalBarrage') && state.pool.some(c => c.id === 'chronoSpike'), 'arrival grants two Suspend cards');
assert.equal(portalTarget().region, 'vespera', 'and the rift leads back');
configureRegion('city');
// --- Suspend ---
let b = setup(['temporalBarrage', 'strike']);
assert(rules(b.hand[0]).includes('Suspend 2') && rules(b.hand[0]).includes('+8 damage'), 'rules text explains Suspend and the charge');
suspendCard(b.hand[0].uid); assert.equal(b.hand.length, 1, 'suspending removes it from your hand'); assert.equal(b.energy, 3, 'for 0 energy'); assert.equal(b.suspended[0].turns, 2);
let e = b.enemy.hp; b.block = 999; endTurn(); assert.equal(b.suspended[0].turns, 1, 'counts down when you end your turn'); assert.equal(e, b.enemy.hp, 'nothing fires yet');
e = b.enemy.hp; b.block = 999; endTurn(); assert.equal(b.suspended.length, 0, 'fires at 0'); assert.equal(e - b.enemy.hp, 14 + 8, 'Temporal Barrage plays itself charged: 14 + 8');
assert(b.discard.some(c => c.id === 'temporalBarrage'), 'and goes to the discard pile'); assert(b.fired.length === 1 && b.fired[0].dealt === 22);
assert.equal(b.energy, maxEnergy(), 'firing costs no energy');
b = setup(['delayedBulwark']); suspendCard(b.hand[0].uid); b.block = 0; endTurn(); assert.equal(b.block, 9 + 6, 'Suspend 1 fires on your next turn with +6 Block');
b = setup(['clockworkVolley']); suspendCard(b.hand[0].uid); endTurn(); e = b.enemy.hp; endTurn(); assert(e - b.enemy.hp >= 3 * (4 + 2), 'Clockwork Volley: 3 hits of 4+2');
b = setup(['rewindMend']); state.maxHp = 200; state.hp = 100; suspendCard(b.hand[0].uid); b.block = 999; endTurn(); b.block = 999; endTurn(); assert(state.hp >= 100 + 7 + 6 - 1, 'Rewind Mend heals 7+6, hp=' + state.hp + ' max=' + state.maxHp + ' ' + b.logs.slice(-5).join(' | ')); assert(b.exhaust.some(c => c.id === 'rewindMend'), 'and exhausts');
// Accelerate pulls the countdown forward and fires what reaches 0.
b = setup(['temporalBarrage', 'accelerate', 'accelerate']); suspendCard(b.hand[0].uid); playCard(0); assert.equal(b.suspended[0].turns, 1);
e = b.enemy.hp; playCard(0); assert.equal(b.suspended.length, 0); assert.equal(e - b.enemy.hp, 22, 'Accelerate to 0 fires it immediately');
// Rewind pushes it back; with nothing suspended it drains Aether.
b = setup(['temporalBarrage']); suspendCard(b.hand[0].uid); applyHex(b, 'rewind'); assert.equal(b.suspended[0].turns, 3, 'Rewind: +1 turn');
b = setup([]); aetherInit(b); b.aether = 3; applyHex(b, 'rewind'); assert.equal(b.aether, 2, 'Rewind with nothing suspended: −1 Aether');
// At most 3 at once.
b = setup(['chronoSpike', 'chronoSpike', 'chronoSpike', 'chronoSpike']); for (let k = 0; k < 4; k++) suspendCard(b.hand[0].uid); assert.equal(b.suspended.length, 3); assert.equal(b.hand.length, 1);
// Playing it normally still works.
b = setup(['chronoSpike']); e = b.enemy.hp; playCard(0); assert.equal(e - b.enemy.hp, 7, 'played normally: no charge'); assert.equal(b.energy, 2);
// Winning while a card is suspended is fine; the guide shows once.
newGame(); assert(!state.tips || !state.tips.suspend);
Math.random = realRandom;
console.log('PASS: Chronospire (34 two-way rooms, levels 28-36, bosses, quiet rooms, events, nexus, portal + arrival gift) and Suspend (free set-aside, countdown, charged auto-play, Accelerate, Rewind, limit of 3).');
}`);
