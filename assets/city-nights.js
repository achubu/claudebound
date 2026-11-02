'use strict';
// =====================================================================
// Round 298 (owner: "find more content to add to Neon Aftermath to make it interesting; if I like it we can
// expand it out further"). NEON AFTERMATH NIGHTS, a content pack for the first world only:
//   - The WANTED BOARD in the Afterlight Refuge names three rogues hiding among the city's patrols. Each is a
//     tougher, named version of the patrol it walks with (☠ on the map); bring them in for Shards, XP and,
//     for the last, an Upgrade Crystal.
//   - THE BLACKOUT: three breaker boxes stand across the city. Throw all three to power the AFTERLIGHT VAULT in
//     the Refuge: Shards, an Upgrade Crystal and a city card.
//   - Four more street events (Arcade Cabinet, Drone Racers, Glitched Billboard, Gang Toll) join the four from
//     Round 76; each journey's three event rooms draw from all eight.
// Everything is placed from the journey's seed, one thing per room, like the Cardsmith (Round 153/168).
// =====================================================================
const CITY_WANTED = [
  { id: 'glitchjaw', name: 'Glitchjaw', title: 'the Wire-Eater', blurb: 'Chews through power lines. Half the blackouts are his.', tier: 0, shards: 30, xp: 40 },
  { id: 'motherStatic', name: 'Mother Static', title: 'of the Scrap Gangs', blurb: 'Runs the scrap gangs from a dead radio tower.', tier: 1, shards: 40, xp: 50 },
  { id: 'chromeWidow', name: 'The Chrome Widow', title: '', blurb: 'Nobody who went looking for her came back with their gear.', tier: 2, shards: 60, xp: 60, crystal: true }
];
const CITY_WANTED_HP = 1.5, CITY_WANTED_ATTACK = 1.15; // a named rogue is a tougher version of its patrol
const CITY_VAULT_SHARDS = 50;
POI_INFO.wantedBoard = { icon: '📋', name: 'Wanted Board' };
POI_INFO.breaker = { icon: '⚡', name: 'Breaker Box' };
POI_INFO.vault = { icon: '🔒', name: 'Afterlight Vault' };

function cityNights() {
  if (!state) return null;
  const n = state.cityNights && typeof state.cityNights === 'object' ? state.cityNights : {};
  for (const k of ['caught', 'breakers']) if (!Array.isArray(n[k])) n[k] = [];
  n.vault = !!n.vault; n.board = !!n.board;
  return state.cityNights = n;
}
const cnFrac = k => typeof regionDistanceFrac === 'function' ? regionDistanceFrac(k) : .5;
// One room in each third of the city (near, middle, far from the Refuge), picked with the journey's seed.
function cnPickByThirds(keys, salt) {
  const rand = seeded(hashSeed(state.seed + 'city-nights' + salt)), out = [];
  for (const [lo, hi] of [[0, .4], [.4, .7], [.7, 1.01]]) {
    const band = keys.filter(k => cnFrac(k) >= lo && cnFrac(k) < hi && !out.includes(k)).sort();
    if (band.length) out.push(band[Math.floor(rand() * band.length)]);
  }
  return out;
}
// The breaker rooms: ordinary rooms with nothing else in them (taken out of the points-of-interest pool).
let cnBreakerCache = null;
function cityBreakerRooms() {
  if (activeRegion !== 'city' || !state) return [];
  const ck = state.seed; if (cnBreakerCache && cnBreakerCache.seed === ck) return cnBreakerCache.rooms;
  const smith = typeof cardsmithRoom === 'function' ? cardsmithRoom() : null;
  const keys = Object.keys(rooms).filter(k => poiEligibleBeforeNights(k) && k !== smith);
  cnBreakerCache = { seed: ck, rooms: cnPickByThirds(keys, 'breakers') };
  return cnBreakerCache.rooms;
}
const poiEligibleBeforeNights = poiEligible;
poiEligible = function (key) { return poiEligibleBeforeNights(key) && !(activeRegion === 'city' && state && cityBreakerRooms().includes(key)); };
// The Wanted rogues: one patrol in a room near, middle and far, never in the Refuge, a boss room or a quiet room.
let cnWantedCache = null;
function cityWantedRooms() {
  if (activeRegion !== 'city' || !state) return [];
  const ck = state.seed; if (cnWantedCache && cnWantedCache.seed === ck) return cnWantedCache.rooms;
  const keys = Object.keys(rooms).filter(k => !isStartRoom(k) && rooms[k] && !(rooms[k].enemy && enemies[rooms[k].enemy[0]] && enemies[rooms[k].enemy[0]].boss) && roomSpawnsBeforeNights(k).some(s => !s.boss));
  cnWantedCache = { seed: ck, rooms: cnPickByThirds(keys, 'wanted') };
  return cnWantedCache.rooms;
}
function cityWantedFor(spawn) {
  if (activeRegion !== 'city' || !state || !spawn || spawn.boss) return null;
  const list = cityWantedRooms(), key = spawn.uid.replace(/^city:/, '').replace(/:\d+$/, ''), i = list.indexOf(key);
  if (i < 0 || !CITY_WANTED[i]) return null;
  const first = roomSpawnsBeforeNights(key).find(s => !s.boss); if (!first || first.uid !== spawn.uid) return null;
  return cityNights().caught.includes(CITY_WANTED[i].id) ? null : { ...CITY_WANTED[i], room: key };
}
const roomSpawnsBeforeNights = roomSpawns;
// Interactables: the board and the vault in the Refuge, the breakers in their rooms.
const cnSpotCache = {};
function cnSpot(key, id, avoid) {
  const ck = state.seed + ':' + id; if (ck in cnSpotCache) return cnSpotCache[ck];
  const spawns = roomSpawns(key).map(q => ({ x: q.x, y: q.y })), all = avoid.concat(spawns);
  const clear = (x, y) => all.every(a => Math.hypot(a.x - x, a.y - y) > 110);
  for (const [tx, ty] of [[560, 330], [240, 330], [560, 170], [240, 170], [640, 250], [160, 250]]) {
    const q = typeof organicItemSpot === 'function' ? organicItemSpot(key, tx, ty, all, 110) : null;
    if (q && clear(q.x, q.y)) return cnSpotCache[ck] = { x: q.x, y: q.y };
  }
  for (let r = 0; r < 320; r += 12) for (let a = 0; a < 16; a++) {
    const x = Math.round(400 + r * Math.cos(a * Math.PI / 8)), y = Math.round(250 + r * .6 * Math.sin(a * Math.PI / 8));
    if (x > 40 && x < 760 && y > 40 && y < 460 && walkable(key, x, y, 20) && clear(x, y)) return cnSpotCache[ck] = { x, y };
  }
  return cnSpotCache[ck] = { x: 400, y: 250 };
}
function cityNightsItems(key = state && state.room) {
  if (activeRegion !== 'city' || !state || !rooms[key]) return [];
  const out = [];
  if (isStartRoom(key)) {
    const taken = [{ x: 400, y: 300 }], shop = typeof merchantRoom === 'function' && merchantRoom(); if (shop && shop.key === key) taken.push(shop);
    const board = cnSpot(key, 'board', taken); out.push({ key, type: 'wantedBoard', id: 'city:wantedBoard', x: board.x, y: board.y });
    const vault = cnSpot(key, 'vault', taken.concat([board])); out.push({ key, type: 'vault', id: 'city:vault', x: vault.x, y: vault.y });
  }
  const b = cityBreakerRooms().indexOf(key);
  if (b >= 0) { const s = cnSpot(key, 'breaker' + b, []); out.push({ key, type: 'breaker', id: 'city:breaker:' + b, index: b, x: s.x, y: s.y }); }
  return out;
}
// --- Drawing ---
const poiNodeBeforeNights = poiNode;
poiNode = function (p) {
  const node = poiNodeBeforeNights.apply(this, arguments);
  if (!p || !node || !node.classList) return node;
  const n = cityNights();
  if (p.type === 'breaker' && n && n.breakers.includes(p.index)) { node.classList.add('used'); node.dataset.name = 'Breaker Box · on'; }
  if (p.type === 'vault') { const open = n && n.breakers.length >= 3; node.querySelector('.poi-glyph').textContent = n.vault ? '🔓' : open ? '🔓' : '🔒'; node.dataset.name = 'Afterlight Vault · ' + (n.vault ? 'emptied' : open ? 'powered' : n.breakers.length + '/3 power'); if (n.vault) node.classList.add('used'); }
  if (p.type === 'wantedBoard') { const left = CITY_WANTED.filter(w => !n.caught.includes(w.id)).length; node.dataset.name = 'Wanted Board' + (left ? ' · ' + left + ' at large' : ' · all caught'); }
  node.classList.add('poi-nights');
  return node;
};
const renderWorldBeforeNights = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeNights.apply(this, arguments);
  if (!state || state.battle || activeRegion !== 'city' || typeof document === 'undefined' || !document.querySelectorAll) return out;
  const world = $('world'); if (world && world.append) for (const it of cityNightsItems()) world.append(poiNode(it));
  const spawns = roomSpawns(state.room);
  for (const node of document.querySelectorAll('#world .enemy-node[data-spawn]')) {
    const w = cityWantedFor(spawns.find(s => s.uid === node.dataset.spawn)); if (!w || /WANTED/.test(node.dataset.name || '')) continue;
    node.classList.add('wanted-node'); node.dataset.name = '☠ WANTED · ' + w.name + ' · ' + (node.dataset.name || '').replace(/^.*?·\s*(?=Lv\.)/, '');
    node.title = w.name + (w.title ? ' ' + w.title : '') + ': a tougher, named rogue. Bring them in for ◇' + w.shards + ' and ' + w.xp + ' XP.';
  }
  return out;
};
// The map: rooms you have seen with a rogue at large are tagged.
const roomTagBeforeNights = roomTag;
roomTag = function (key) {
  const tag = roomTagBeforeNights.apply(this, arguments);
  if (tag || activeRegion !== 'city' || !state) return tag;
  const i = cityWantedRooms().indexOf(key);
  if (i >= 0 && !cityNights().caught.includes(CITY_WANTED[i].id) && (typeof areaSeen !== 'function' || areaSeen(key))) return { color: '#ff6b5a', label: '☠ ' + CITY_WANTED[i].name };
  return tag;
};
// --- Interaction ---
function cnMenu(title, body, buttons) { poiMenu(title, body, buttons.concat([{ id: 'cnLeave', label: 'Leave', onclick: closeMenu }])); }
function openWantedBoard() {
  const n = cityNights(); n.board = true; save();
  const rows = CITY_WANTED.map((w, i) => {
    const caught = n.caught.includes(w.id), key = cityWantedRooms()[i], where = key && rooms[key] ? rooms[key].name : 'somewhere in the city';
    return '<li class="wanted-row' + (caught ? ' caught' : '') + '"><b>☠ ' + w.name + (w.title ? ' <small>' + w.title + '</small>' : '') + '</b><span>' + w.blurb + '</span>'
      + '<span class="wanted-meta">' + (caught ? '✔ Brought in' : 'Last seen: <b>' + where + '</b>') + ' · Reward ◇' + w.shards + ' + ' + w.xp + ' XP' + (w.crystal ? ' + an Upgrade Crystal' : '') + '</span></li>';
  }).join('');
  cnMenu('📋 Wanted Board', '<p>Faded posters, fresh ink. The Refuge pays for anyone who brings these three in. Each walks with an ordinary patrol (☠ on the street) and fights harder than it.</p><ul class="wanted-list">' + rows + '</ul>', []);
}
function openBreaker(p) {
  const n = cityNights(), on = n.breakers.includes(p.index);
  if (on) return cnMenu('⚡ Breaker Box', '<p>The breaker is thrown. The grid hums: <b>' + n.breakers.length + '/3</b> breakers on.</p>', []);
  cnMenu('⚡ Breaker Box', '<p>A grid breaker, padlocked by someone long gone. Throwing it feeds power back toward the Afterlight Refuge.</p><p class="muted">Grid: ' + n.breakers.length + '/3 breakers on. All three power the Afterlight Vault in the Refuge.</p>',
    [{ id: 'cnThrow', label: '⚡ Throw the breaker', primary: true, onclick: () => {
      if (!n.breakers.includes(p.index)) n.breakers.push(p.index);
      save(); closeMenu(); renderWorld();
      toast(n.breakers.length >= 3 ? '⚡ The grid is back! The Afterlight Vault in the Refuge has power.' : '⚡ Breaker thrown: ' + n.breakers.length + '/3. The grid flickers.');
    } }]);
}
function openVault() {
  const n = cityNights();
  if (n.vault) return cnMenu('🔓 Afterlight Vault', '<p>The vault stands open and empty. You took what was left.</p>', []);
  if (n.breakers.length < 3) return cnMenu('🔒 Afterlight Vault', '<p>A sealed vault door, dead without power.</p><p class="notice">Grid: <b>' + n.breakers.length + '/3</b> breakers on. The breaker boxes (⚡) stand somewhere in the city.</p>', []);
  const pool = (typeof VARIETY_POOLS !== 'undefined' && VARIETY_POOLS.city) || [], cardId = pool.length ? pool[hashSeed(state.seed + 'vault') % pool.length] : null;
  cnMenu('🔓 Afterlight Vault', '<p>The door groans open. Inside: emergency stores the Refuge sealed when the grid failed.</p><p class="notice">◇' + CITY_VAULT_SHARDS + ' Shards · an Upgrade Crystal' + (cardId && defs[cardId] ? ' · ' + defs[cardId].name : '') + '</p>',
    [{ id: 'cnLoot', label: 'Take it all', primary: true, onclick: () => {
      if (n.vault) return; n.vault = true; state.shards += CITY_VAULT_SHARDS; if (typeof setMaterials === 'function') setMaterials(materials() + 1);
      if (cardId && defs[cardId]) { const c = make(cardId); c.soulbound = false; state.pool.push(c); }
      save(); closeMenu(); renderWorld(); toast('Afterlight Vault: +' + CITY_VAULT_SHARDS + ' Shards, an Upgrade Crystal' + (cardId && defs[cardId] ? ' and ' + defs[cardId].name + ' (in your collection)' : '') + '.');
    } }]);
}
function openCityNightsItem(p) { if (p.type === 'wantedBoard') return openWantedBoard(); if (p.type === 'breaker') return openBreaker(p); if (p.type === 'vault') return openVault(); }
const openPOIBeforeNights = openPOI;
openPOI = function (p) { if (p && ['wantedBoard', 'breaker', 'vault'].includes(p.type)) return openCityNightsItem(p); return openPOIBeforeNights.apply(this, arguments); };
let cnArmed = null;
const checkWorldInteractionsBeforeNights = checkWorldInteractions;
checkWorldInteractions = function () {
  checkWorldInteractionsBeforeNights.apply(this, arguments);
  if (!state || state.battle || activeRegion !== 'city' || !$('menuOverlay').classList.contains('hidden')) return;
  const near = cityNightsItems().find(it => Math.hypot(state.pos.x - it.x, state.pos.y - it.y) < 40);
  if (!near) { cnArmed = null; return; }
  if (cnArmed === near.id) return;
  if (typeof touchPassingBy === 'function' && touchPassingBy(near)) return; // only a tap on it opens it while passing (Round 184)
  cnArmed = near.id; openCityNightsItem(near);
};
// Walkable pads around them (Round 275), for player movement only.
if (typeof itemPadsFor === 'function') {
  const itemPadsForBeforeNights = itemPadsFor;
  itemPadsFor = function (key) {
    const pads = itemPadsForBeforeNights.apply(this, arguments);
    if (activeRegion === 'city' && !pads.cityNights) { for (const it of cityNightsItems(key)) pads.push({ x: it.x, y: it.y, r: 40 + ITEM_PAD_EXTRA }); Object.defineProperty(pads, 'cityNights', { value: true }); }
    return pads;
  };
}
// --- The Wanted fight ---
const startBattleBeforeNights = startBattle;
startBattle = function (spawnId) {
  const spawn = activeRegion === 'city' && state ? roomSpawns(state.room).find(s => s.uid === spawnId) : null, w = cityWantedFor(spawn);
  const r = startBattleBeforeNights.apply(this, arguments), b = state && state.battle;
  if (w && b && b.phase === 'fight' && !b.wanted) {
    const e = b.enemy; b.wanted = w.id;
    e.name = '☠ ' + w.name; e.maxHp = Math.round(e.maxHp * CITY_WANTED_HP); e.hp = e.maxHp; e.attack = Math.round(e.attack * CITY_WANTED_ATTACK); if (e.baseAttack) e.baseAttack = Math.round(e.baseAttack * CITY_WANTED_ATTACK); e.elite = true;
    b.logs.push('☠ WANTED: ' + w.name + (w.title ? ' ' + w.title : '') + '. ' + w.blurb);
    save(); renderBattle();
  }
  return r;
};
const winBattleBeforeNights = winBattle;
winBattle = function () {
  const b = state && state.battle; if (!b || b.phase !== 'fight' || !b.wanted) return winBattleBeforeNights.apply(this, arguments);
  const r = winBattleBeforeNights.apply(this, arguments), w = CITY_WANTED.find(x => x.id === b.wanted), n = cityNights();
  if (b.phase === 'reward' && w && !n.caught.includes(w.id)) {
    n.caught.push(w.id); state.shards += w.shards; gainXP(w.xp); if (w.crystal && typeof setMaterials === 'function') setMaterials(materials() + 1);
    if (Array.isArray(b.special)) b.special.push('☠ WANTED: ' + w.name + ' brought in! +◇' + w.shards + ', +' + w.xp + ' XP' + (w.crystal ? ', an Upgrade Crystal' : '') + '.');
    if (n.caught.length === CITY_WANTED.length) toast('All three rogues brought in. The Refuge sleeps easier tonight.');
    save();
  }
  return r;
};
// --- Four more street events (the city's three event rooms now draw from eight) ---
Object.assign(EVENTS, {
  arcade: { icon: '🕹', name: 'Arcade Cabinet', text: () => 'A cabinet still glows in the rain: AETHER RAIDERS. Top score 9,999,999.',
    choices: () => [{ label: 'Play · ◇3: 50% chance of +12 Shards', disabled: state.shards < 3, run: () => { state.shards -= 3; if (Math.random() < .5) { state.shards += 12; return 'NEW HIGH SCORE. The coin tray rattles: +12 Shards.'; } return 'GAME OVER. The cabinet keeps your 3 Shards.'; } },
                    { label: 'Pry open the coin box · −' + pct(.1) + ' HP, +6 Shards', run: () => { state.hp = Math.max(1, state.hp - pct(.1)); state.shards += 6; return 'Sparks fly, but the box gives: +6 Shards.'; } }] },
  racer: { icon: '🏍', name: 'Drone Racers', text: () => 'Kids race scrap drones down the boulevard. They want a sponsor.',
    choices: () => [{ label: 'Back the red drone · ◇5: 40% chance of +15 Shards and a potion', disabled: state.shards < 5, run: () => { state.shards -= 5; if (Math.random() < .4) { state.shards += 15; state.potions++; return 'Red takes the line! +15 Shards and a healing potion.'; } return 'Red clips a lamppost. Your 5 Shards are gone.'; } },
                    { label: 'Help with repairs · Surge Rite blessing', run: () => { state.blessing = 'surge'; return 'Surge Rite: next fight +1 energy and +1 card on turn 1.'; } }] },
  billboard: { icon: '📺', name: 'Glitched Billboard', text: () => 'A billboard loops a broken advert, and between frames, a hidden message.',
    choices: () => [{ label: 'Decode it · train your whole deck +10 uses', run: () => { active().forEach(c => { for (let k = 0; k < 10; k++) recordCardUse(owned(c.uid) || c); }); return 'The message is a combat manual. Every card in your deck gains 10 mastery uses.'; } },
                    { label: 'Strip its wiring · +8 Shards', run: () => { state.shards += 8; return 'Good copper: +8 Shards.'; } }] },
  toll: { icon: '💀', name: 'Gang Toll', text: () => 'Three masked scavengers block the road. "Toll\'s six."',
    choices: () => [{ label: 'Pay ◇6 · they toss you a stolen potion', disabled: state.shards < 6, run: () => { state.shards -= 6; state.potions++; return 'They count the Shards and throw you a potion "for the road".'; } },
                    { label: 'Refuse · −' + pct(.15) + ' HP, +10 Shards', run: () => { state.hp = Math.max(1, state.hp - pct(.15)); state.shards += 10; return 'A short, ugly scuffle. You walk away with their takings: +10 Shards.'; } }] }
});
if (EVENT_POOLS.city) for (const id of ['arcade', 'racer', 'billboard', 'toll']) if (!EVENT_POOLS.city.includes(id)) EVENT_POOLS.city.push(id);
// --- Saves ---
const validateImportBeforeNights = validateImport;
validateImport = function (s) {
  if (s && s.cityNights !== undefined && (typeof s.cityNights !== 'object' || s.cityNights === null || Array.isArray(s.cityNights))) throw Error('Invalid city nights.');
  return validateImportBeforeNights(s);
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#world .enemy-node.wanted-node{filter:drop-shadow(0 0 6px #ff3b3b) drop-shadow(0 0 2px #ff9a8a)}#world .enemy-node.wanted-node::after{color:#ffb3a8!important}'
    + '.poi-node.poi-wantedBoard{border-color:#ff8a6b;box-shadow:0 0 16px #ff6b4a88}.poi-node.poi-breaker{border-color:#ffe066;box-shadow:0 0 16px #ffd23f88}.poi-node.poi-vault{border-color:#9fe7f5;box-shadow:0 0 16px #6fd6ff88}'
    + '.wanted-list{list-style:none;margin:10px 0;padding:0;display:grid;gap:8px}.wanted-row{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid #6b2a2a;border-radius:10px;background:#1c0f12}.wanted-row b small{font-weight:400;opacity:.8}'
    + '.wanted-row.caught{opacity:.6;border-color:#2e5566;background:#0b1a26}.wanted-meta{font-size:13px;color:#ffd0c4}';
  document.head.append(st);
}
