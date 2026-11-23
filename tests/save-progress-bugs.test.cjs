'use strict';
// Seven save and progression bugs a review found: a soulbound card over its mastery cap, decks over 30 cards, Chronospire
// rooms past the old 6x9 grid, duplicate uids after reloading on a card-choice screen, healing by swapping a health gear
// piece, the Solaris arrival pick hidden by the Heat intro, and species quests for species that never spawn.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run, context } = require('./expansion.test.cjs');
context.toasts = []; run('toast = m => { toasts.push(m); }');
const KEY = 'aethercede-expansion-v3';

// 1. Soulbinding a level-0 card with 51-99 uses keeps the save loadable (uses clamp to the soulbound cap).
const r1 = JSON.parse(run(`(()=>{ newGame(); const c = make('cleave'); c.uses = 60; state.pool.push(c); state.shards = 600; soulbindCard(c); save();
  const raw = JSON.parse(localStorage.getItem('${KEY}')); raw.pool.find(x => x.uid === c.uid).uses = 99; // an older save already holding too many
  localStorage.setItem('${KEY}', JSON.stringify(raw)); toasts.length = 0; state = null; const ok = load();
  return JSON.stringify({ uses: c.uses, cap: USES, ok, loaded: ok && state.pool.find(x => x.uid === c.uid).uses }); })()`));
assert.strictEqual(r1.uses, r1.cap, 'soulbinding clamps mastery uses to the soulbound cap');
assert.strictEqual(r1.ok, true, 'a soulbound card over its cap still loads');
assert.strictEqual(r1.loaded, r1.cap, 'loading clamps its uses');

// 2. A legal deck over 30 cards saves and loads.
const r2 = JSON.parse(run(`(()=>{ newGame(); state.bosses = Object.keys(enemies).filter(k => enemies[k].boss); state.talents.deckMatrix = 4;
  state.device = { crystals: [1,2,3,4,5].map(i => ({ uid: 'crystal-' + i, type: 'capacity' })), slots: ['crystal-1','crystal-2','crystal-3','crystal-4','crystal-5'], next: 6 };
  for (const id of Object.keys(defs).filter(id => !defs[id].soulbound).slice(0, 60)) { const c = make(id); state.pool.push(c); if (state.deck.length < maxDeckSize()) state.deck.push(c.uid); }
  save(); const n = state.deck.length, max = maxDeckSize(); state = null; const ok = load();
  return JSON.stringify({ n, max, ok, after: ok && state.deck.length }); })()`));
assert(r2.n > 30 && r2.n === r2.max, 'the test deck is a full legal deck over 30 cards: ' + JSON.stringify(r2));
assert.strictEqual(r2.ok, true, 'a legal deck over 30 cards loads');
assert.strictEqual(r2.after, r2.n, 'the whole deck comes back');

// 3. A Chronospire save in a room the fresh page's map lacks (a fresh page has no journey, so it builds the default
// 'aethercede' map) loads: the save's own map is built before its room is checked.
const r3 = JSON.parse(run(`(()=>{ newGame(); chronoBuild(String(state.seed)); const seedRooms = Object.keys(CHRONO_ROOM_DATA);
  chronoBuild('aethercede'); const fresh = new Set(Object.keys(CHRONO_ROOM_DATA)); const k = seedRooms.find(k => !fresh.has(k));
  if (!k) return JSON.stringify({ k: null });
  state.region = 'chronospire'; configureRegion('chronospire'); state.room = k; state.pos = { x: 400, y: 250 }; state.visited = [k]; save();
  state = null; configureRegion('city'); chronoBuild('aethercede'); const before = Object.keys(CHRONO_ROOM_DATA).includes(k); toasts.length = 0; const ok = load();
  return JSON.stringify({ k, before, ok, room: state && state.room, toasts }); })()`));
assert(r3.k && !r3.before, 'the seed has a room the default map lacks: ' + JSON.stringify(r3));
assert.strictEqual(r3.ok, true, 'the Chronospire save loads: ' + JSON.stringify(r3));
assert.strictEqual(r3.room, r3.k, 'and resumes in its room');

// 4. Reloading on a card-choice victory screen: no duplicate uids afterwards.
const r4 = JSON.parse(run(`(()=>{ newGame(); state.room = '3,7'; state.pos = { x: 400, y: 280 }; let tries = 0;
  while (tries++ < 80) { state.cooldowns = {}; const sp = roomSpawns(state.room).find(s => !s.boss && spawnAvailable(s)); if (!sp) return JSON.stringify({ err: 'no spawn' });
    startBattle(sp.uid); const b = state.battle; b.enemy.hp = 0; winBattle(); if (b.lootType === 'choice') break; finishBattle(); }
  const b = state.battle; if (!b || b.lootType !== 'choice') return JSON.stringify({ err: 'no choice screen' });
  b.chestOpened = true; save(); state = null; load();
  chooseCardReward(0); finishBattle(); for (let i = 0; i < 6; i++) state.pool.push(make('strike'));
  const dups = state.pool.map(c => c.uid).filter((u, i, a) => a.indexOf(u) !== i); save(); state = null; const ok = load();
  return JSON.stringify({ dups, ok }); })()`));
assert(!r4.err, r4.err);
assert.deepStrictEqual(r4.dups, [], 'no duplicate card uids after reloading on a choice screen');
assert.strictEqual(r4.ok, true, 'the save still loads');

// 5. Taking a health gear piece off and on heals nothing.
const r5 = JSON.parse(run(`(()=>{ newGame(); state.relics.push('timewornShirt'); equipGear('shirt', 'timewornShirt'); const out = {};
  for (const start of [20, 'max']) { state.hp = start === 'max' ? state.maxHp : start; const log = [state.hp];
    for (let i = 0; i < 4; i++) { equipGear('shirt', null); equipGear('shirt', 'timewornShirt'); log.push(state.hp); } out[start] = log; }
  return JSON.stringify(out); })()`));
assert(r5[20].every(h => h === 20), 'swapping a health piece does not heal: ' + r5[20].join(' -> '));
assert(r5.max.every(h => h === r5.max[0]), 'nor lose HP at full health: ' + r5.max.join(' -> '));

// 6. Arriving in Solaris: the card pick stays on screen; the Heat intro opens once a card is picked.
const r6 = JSON.parse(run(`(()=>{ newGame(); state.bosses.push('thornWarden'); state.room = WORLD_BOSS_ROOMS.city[0]; const opened = [];
  const om = openMenu; openMenu = function (h) { opened.push((h.match(/<h2>([^<]*)/) || [])[1]); return om.apply(this, arguments); };
  travelPortal(); const picker = String($('menuModal').innerHTML || '').includes('arrivalCards'), before = opened.slice(); openMenu = om;
  return JSON.stringify({ region: state.region, before, picker, pending: !!state.pendingMechIntro }); })()`));
assert.strictEqual(r6.region, 'elaris');
assert(r6.picker && r6.before.length === 1, 'only the arrival pick is open: ' + r6.before.join(' | '));
assert(r6.pending, 'the Heat intro waits for the pick');
// Picking a card (the offer's own click handler) closes the pick and opens the intro.
const r6b = JSON.parse(run(`(()=>{ const n = state.pool.length, picks = [], ce = cardElement; cardElement = function (c, fn) { picks.push(fn); return ce.apply(this, arguments); };
  try { offerArrivalCard(); } finally { cardElement = ce; } if (picks[0]) picks[0]();
  return JSON.stringify({ intro: String($('menuModal').innerHTML || '').includes('New mechanic'), pending: !!state.pendingMechIntro, added: state.pool.length - n }); })()`));
assert(r6b.added === 1 && r6b.intro && !r6b.pending, 'the picked card joins and the Heat intro opens after the pick: ' + JSON.stringify(r6b));

// 7. Every world's species quest targets a species that patrols there.
const r7 = JSON.parse(run(`(()=>{ newGame(); const res = {}; for (const w of WORLD_ORDER) { state.region = w; configureRegion(w); const seen = {};
  for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) { seen[s.type] = 1; const m = typeof pairMateFor === 'function' && pairMateFor(k, s); if (m) seen[m] = 1; }
  const g = questGivers(), pid = Object.keys(g).find(id => g[id] === 'species'), p = Object.values(worldPOIs()).find(p => p.id === pid), q = p && questOffer(p);
  res[w] = q ? { target: q.target, ok: !!seen[q.target] } : null; } return JSON.stringify(res); })()`));
for (const [w, q] of Object.entries(r7)) if (q) assert(q.ok, w + ': the species quest targets ' + q.target + ', which never spawns');
assert(r7.chronospire, 'the Chronospire offers a species quest');

console.log('save-progress-bugs ok');
