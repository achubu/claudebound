'use strict';
// =====================================================================
// Round 287 (owner request): quests for XP. In each world three points of interest also hand out a quest
// (a ❗ over them until you take it): hunt 10 enemies in this world, defeat one of its mini-bosses, and
// defeat its final boss. Kills count from when you take the quest. A finished quest pays at once: XP, and for
// the mini-boss and boss quests a card from that world's pool for your collection. The Quests screen
// (nav button) lists what you are doing and what you have finished.
// =====================================================================
const QUEST_KINDS = {
  hunt: { icon: '⚔', xp: 60, need: 10 },
  mini: { icon: '⚑', xp: 80, card: 1 },
  boss: { icon: '♛', xp: 120, card: 1 }
};
function ensureQuests(s = state) {
  if (!s) return {};
  const q = s.quests && typeof s.quests === 'object' && !Array.isArray(s.quests) ? s.quests : {};
  q.taken = q.taken && typeof q.taken === 'object' && !Array.isArray(q.taken) ? q.taken : {};
  q.done = Array.isArray(q.done) ? q.done : [];
  return s.quests = q;
}
function questWorldName(w = activeRegion) { return (typeof WORLD_NAMES !== 'undefined' && WORLD_NAMES[w]) || w; }
// The world's bosses, read from its rooms: mini-bosses first, in room order, then the final boss.
function questBosses() {
  const out = { mini: [], boss: [] };
  for (const k of Object.keys(rooms).sort()) for (const s of roomSpawns(k)) if (s.boss && enemies[s.type]) {
    const list = enemies[s.type].miniBoss ? out.mini : out.boss; if (!list.includes(s.type)) list.push(s.type);
  }
  return out;
}
// Which points of interest give which quest: three shrines, campfires or caches, picked with the journey's seed.
const QUEST_GIVER_TYPES = ['shrine', 'campfire', 'cache', 'sealed'];
function questGivers(region = activeRegion) {
  const pois = Object.values(worldPOIs(region)).filter(p => QUEST_GIVER_TYPES.includes(p.type)).sort((a, b) => a.key < b.key ? -1 : 1);
  const rand = seeded(hashSeed(state.seed + region + 'quests')), order = pois.map(p => [rand(), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const out = {}; ['hunt', 'mini', 'boss'].forEach((kind, i) => { if (order[i]) out[order[i].id] = kind; });
  return out;
}
// The quest this giver would hand out now, or null (already taken, or nothing left to defeat).
function questOffer(p) {
  if (!state || !p) return null; ensureQuests();
  const kind = questGivers()[p.id]; if (!kind) return null;
  const id = activeRegion + ':' + kind, q = state.quests; if (q.taken[id] || q.done.includes(id)) return null;
  const K = QUEST_KINDS[kind], world = activeRegion;
  if (kind === 'hunt') return { id, kind, world, need: K.need, have: 0, xp: K.xp, text: 'Defeat ' + K.need + ' enemies in ' + questWorldName(world) };
  const target = questBosses()[kind].find(t => !state.bosses.includes(t)); if (!target) return null;
  const pool = (typeof VARIETY_POOLS !== 'undefined' && (VARIETY_POOLS[world] || VARIETY_POOLS.city)) || [];
  const card = pool.length ? pool[hashSeed(state.seed + id) % pool.length] : null;
  return { id, kind, world, target, need: 1, have: 0, xp: K.xp, card, text: 'Defeat ' + enemies[target].name };
}
function questReward(q) { return '+' + q.xp + ' XP' + (q.card && defs[q.card] ? ' and ' + defs[q.card].name + (QUEST_KINDS[q.kind].card ? ' +' + QUEST_KINDS[q.kind].card : '') : ''); }
function takeQuest(q) { ensureQuests(); if (state.quests.taken[q.id] || state.quests.done.includes(q.id)) return; state.quests.taken[q.id] = q; save(); toast('📜 Quest taken: ' + q.text + '. Reward: ' + questReward(q) + '.'); }
function finishQuest(q, b) {
  delete state.quests.taken[q.id]; state.quests.done.push(q.id);
  gainXP(q.xp); let card = null;
  if (q.card && defs[q.card]) { card = make(q.card, Math.min(3, QUEST_KINDS[q.kind].card || 0)); card.soulbound = false; state.pool.push(card); }
  const line = '📜 Quest complete: ' + q.text + '. +' + q.xp + ' XP' + (card ? ' and ' + stat(card).name + ' (in your collection)' : '') + '.';
  if (b && Array.isArray(b.special)) b.special.push(line); else toast(line);
}
// Kills count toward quests you have taken.
const winBattleBeforeQuests = winBattle;
winBattle = function () {
  const b = state && state.battle; if (!b || b.phase !== 'fight') return winBattleBeforeQuests.apply(this, arguments);
  const r = winBattleBeforeQuests.apply(this, arguments);
  if (b.phase !== 'reward') return r;
  ensureQuests();
  for (const q of Object.values(state.quests.taken)) {
    if (q.kind === 'hunt' ? q.world === activeRegion : q.target === b.id) q.have = Math.min(q.need, (q.have || 0) + 1);
    if (q.have >= q.need) finishQuest(q, b);
  }
  save(); return r;
};
// Points of interest offer their quest beside their usual choice.
let questGiver = null;
const openPOIBeforeQuests = openPOI;
openPOI = function (p) { questGiver = p; try { return openPOIBeforeQuests.apply(this, arguments); } finally { questGiver = null; } };
const poiMenuBeforeQuests = poiMenu;
poiMenu = function (title, body, buttons) {
  const q = questOffer(questGiver);
  if (!q) return poiMenuBeforeQuests.apply(this, arguments);
  const p = questGiver;
  body = '<div class="quest-offer"><b>📜 Quest: ' + q.text + '</b><span>Reward: ' + questReward(q) + '</span></div>' + body;
  buttons = [{ id: 'questTake', label: '📜 Take quest', onclick: () => { takeQuest(q); openPOI(p); } }].concat(buttons);
  return poiMenuBeforeQuests.call(this, title, body, buttons);
};
// A used point of interest still opens when walked to while it has a quest to give.
const checkWorldInteractionsBeforeQuests = checkWorldInteractions;
checkWorldInteractions = function () {
  if (state && !state.battle && $('menuOverlay').classList.contains('hidden')) {
    const p = poiAt(state.room);
    if (p && poiUsed(p) && poiArmed !== p.id && questOffer(p) && Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 40 && !(typeof touchPassingBy === 'function' && touchPassingBy(p))) { poiArmed = p.id; return openPOI(p); }
  }
  return checkWorldInteractionsBeforeQuests.apply(this, arguments);
};
// ❗ over a giver in the world.
const poiNodeBeforeQuests = poiNode;
poiNode = function (p) {
  const node = poiNodeBeforeQuests.apply(this, arguments);
  if (node && node.append && questOffer(p)) { const m = document.createElement('span'); m.className = 'quest-mark'; m.textContent = '❗'; node.append(m); node.classList.remove('used'); node.dataset.name = (node.dataset.name || '').replace(' · used', '') + ' · quest'; }
  return node;
};
// --- The Quests screen ---
function showQuests() {
  if (!state) return; ensureQuests();
  const taken = Object.values(state.quests.taken), givers = questGivers(), open = Object.values(worldPOIs()).filter(p => givers[p.id] && questOffer(p));
  const row = q => '<article class="quest-row"><span class="quest-icon">' + QUEST_KINDS[q.kind].icon + '</span><div><b>' + q.text + '</b><small>' + questWorldName(q.world) + ' · Reward: ' + questReward(q) + '</small>'
    + '<div class="quest-bar"><i style="width:' + Math.round((q.have || 0) / q.need * 100) + '%"></i></div></div><span class="quest-count">' + (q.have || 0) + '/' + q.need + '</span></article>';
  const done = state.quests.done.length;
  openMenu('<div class="eyebrow">JOURNEY · QUESTS</div><h1>Quests</h1><p>Points of interest marked ❗ hand out quests: hunt enemies, defeat a mini-boss, defeat the world\'s boss. Each pays XP; the boss quests also give a card.</p>'
    + '<h2>Active</h2>' + (taken.length ? taken.map(row).join('') : '<p class="muted">No quests yet.</p>')
    + '<p class="notice">' + (open.length ? open.length + ' quest' + (open.length > 1 ? 's' : '') + ' still to pick up in ' + questWorldName() + (open.some(p => areaSeen(p.key)) ? '.' : ' (explore to find the givers).') : 'No more quests to pick up in ' + questWorldName() + '.') + (done ? ' Finished: ' + done + '.' : '') + '</p>'
    + '<p><button id="questsClose" class="primary">Close</button></p>');
  const close = $('questsClose'); if (close) close.onclick = closeMenu;
}
const newGameBeforeQuests = newGame;
newGame = function () { const out = newGameBeforeQuests.apply(this, arguments); ensureQuests(); return out; };
const validateImportBeforeQuests = validateImport;
validateImport = function (s) {
  if (s && s.quests !== undefined && (typeof s.quests !== 'object' || s.quests === null || Array.isArray(s.quests))) throw Error('Invalid quests.');
  const out = validateImportBeforeQuests(s); ensureQuests(out); return out;
};
if (typeof document !== 'undefined' && document.createElement) {
  const nav = $('nav'), btn = document.createElement('button'); btn.id = 'questsBtn'; btn.textContent = 'Quests'; btn.onclick = () => showQuests();
  const gear = nav && nav.querySelector ? nav.querySelector('#gearBtn') : null;
  if (gear && gear.after) gear.after(btn); else if (nav && nav.append) nav.append(btn);
  const style = document.createElement('style');
  style.textContent = '.quest-offer{display:flex;flex-direction:column;gap:2px;margin:10px 0;padding:8px 10px;border:1px solid #e5bc62;border-radius:10px;background:#2a2110cc}.quest-offer span{color:#ffe7b0;font-size:14px}'
    + '.quest-row{display:flex;gap:10px;align-items:center;padding:8px 10px;margin:6px 0;border:1px solid #2e5566;border-radius:10px;background:#0b1a26}.quest-row>div{flex:1}.quest-row small{display:block;opacity:.8}'
    + '.quest-icon{font-size:22px}.quest-count{font-weight:800;color:#ffe7b0}.quest-bar{height:6px;margin-top:5px;border-radius:3px;background:#1b3442;overflow:hidden}.quest-bar i{display:block;height:100%;background:linear-gradient(90deg,#e5bc62,#ffe7b0)}'
    + '.poi-node .quest-mark{position:absolute;left:50%;top:-20px;transform:translateX(-50%);font-size:16px;filter:drop-shadow(0 0 4px #ffcf5a);animation:questBob 1.2s ease-in-out infinite;pointer-events:none}'
    + '@keyframes questBob{50%{transform:translate(-50%,-4px)}}';
  document.head.append(style);
}
