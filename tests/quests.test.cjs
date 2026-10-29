'use strict';
// Round 287: quests picked up at points of interest; hunt / mini-boss / boss; XP and cards; the Quests screen.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const o = {};
  newGame(); configureRegion('city');
  const givers = questGivers(), pois = Object.values(worldPOIs()); o.kinds = Object.values(givers).sort();
  o.loreGiver = pois.some(p => !QUEST_GIVER_TYPES.includes(p.type) && givers[p.id]);
  const giverOf = k => pois.find(p => givers[p.id] === k);
  // The offer shows in the point of interest's menu and can be taken.
  const hp = giverOf('hunt'); openPOI(hp); o.menu = document.getElementById('menuModal').innerHTML || '';
  const offer = questOffer(hp); takeQuest(offer); o.taken = Object.keys(state.quests.taken); o.offerAfter = questOffer(hp);
  // Wins count; the 10th pays XP.
  const s = roomSpawns('1,5').find(x => !x.boss); const xp0 = state.xp + state.playerLevel * 100;
  for (let i = 0; i < 10; i++) { state.room = '1,5'; state.cooldowns = {}; startBattle(s.uid); winBattle(); o.special = (state.battle.special || []).join(' '); state.battle = null; }
  o.huntDone = state.quests.done.includes('city:hunt'); o.xpGain = state.xp + state.playerLevel * 100 - xp0;
  // Mini-boss quest: card reward when that mini-boss falls.
  const mp = giverOf('mini'); const mq = questOffer(mp); takeQuest(mq); o.mini = { target: mq.target, card: mq.card };
  const pool0 = state.pool.length; const key = Object.keys(rooms).find(k => roomSpawns(k).some(x => x.type === mq.target)); state.room = key;
  const ms = roomSpawns(key).find(x => x.type === mq.target); startBattle(ms.uid); winBattle(); state.battle = null;
  o.miniDone = state.quests.done.includes('city:mini'); o.cardAdded = state.pool.length - pool0 >= 1 && state.pool.some(c => c.id === mq.card);
  // Boss quest offered; no quest for an already-beaten boss.
  const bp = giverOf('boss'); const bq = questOffer(bp); o.bossTarget = bq && bq.target; state.bosses.push(bq.target); o.bossGone = questOffer(bp);
  // Quests screen and saves.
  takeQuest(questOffer(giverOf('hunt')) || { id: 'x', kind: 'hunt', world: 'city', need: 10, have: 3, xp: 60, text: 'Defeat 10 enemies in Neon Aftermath' });
  showQuests(); o.screen = document.getElementById('menuModal').innerHTML || '';
  save(); state = null; load(); o.kept = state.quests.done.length;
  const bad = JSON.parse(JSON.stringify(state)); bad.quests = 'x'; try { validateImport(bad); o.junk = 'accepted'; } catch (e) { o.junk = 'rejected'; }
  return JSON.stringify(o); })()`));
assert.deepStrictEqual(r.kinds, ['boss', 'hunt', 'mini'], 'three quest givers per world');
assert(!r.loreGiver, 'only shrines, campfires and caches give quests');
assert(/Take quest/.test(r.menu) && /Defeat 10 enemies/.test(r.menu), 'the point of interest offers its quest');
assert.deepStrictEqual(r.taken, ['city:hunt']); assert.strictEqual(r.offerAfter, null, 'a taken quest is not offered again');
assert(r.huntDone && /Quest complete/.test(r.special), 'ten wins finish the hunt');
assert(r.xpGain >= 60 + 10 * 1, 'the hunt pays its XP on top of the fights');
assert(r.mini.target && r.mini.card && r.miniDone && r.cardAdded, 'the mini-boss quest pays a card');
assert(r.bossTarget && r.bossGone === null, 'the boss quest names an unbeaten boss and goes away once it falls');
assert(/Quests/.test(r.screen) && /Finished: 2/.test(r.screen), 'the Quests screen lists progress');
assert.strictEqual(r.kept, 2, 'quests survive a save'); assert.strictEqual(r.junk, 'rejected');
console.log('quests ok');
