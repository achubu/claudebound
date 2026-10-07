'use strict';
// =====================================================================
// EXPLORATION (Round 50): points of interest and a wandering merchant.
//
// About a third of the ordinary rooms in each world hold a seeded point
// of interest: an Aether Shrine (pick a blessing for your next fight), a
// Campfire (rest or train a card), a lore find (5 per world; reading all
// five pays out), a Supply Cache, or a Sealed Cache you can risk opening.
// Enemies drop Shards, the currency spent at the Wandering Merchant, who
// sets up in a different room each time you enter a world (or fall).
// =====================================================================
const POI_SHARE = 0.36, LORE_PER_WORLD = 5;
const POI_SPOTS = [[400, 130], [400, 385], [330, 180], [470, 320], [330, 320], [470, 180], [205, 140], [600, 360], [205, 360], [600, 140], [400, 250]];
const LORE_NAMES = { city: ['⌨', 'Data Terminal'], elaris: ['◈', 'Whispering Stone'], vespera: ['ϟ', 'Storm Glyph'] };
const POI_INFO = {
  shrine: { icon: '⛩', name: 'Aether Shrine' },
  campfire: { icon: '🔥', name: 'Campfire' },
  cache: { icon: '⬙', name: 'Supply Cache' },
  sealed: { icon: '⚠', name: 'Sealed Cache' },
  merchant: { icon: '🛒', name: 'Wandering Merchant' }
};
const LORE = {
  city: [
    'LOG 01 — The Afterlight grid failed at 03:12. The Crown Observers kept watching the dark streets long after nobody was left to report to.',
    'LOG 02 — We sealed the Memory Annex with Briarstep locks. If you are reading this, the locks held and we did not.',
    'LOG 03 — The Ember Sigil was never a weapon. It was a key to the old reactor, and the Thorn Warden grew around it like a scar.',
    'LOG 04 — Every card is a stored moment of someone\'s will. Soulbound ones remember their owner. Impermanent ones forget.',
    'LOG 05 — The portal beneath the Warden\'s throne hums at the frequency of growing things. Something green is waiting on the other side.'
  ],
  elaris: [
    'The stone is warm. Words rise in your mind: "Before the Tyrant bloomed, Elaris sang in four voices: flame, tide, root and wind."',
    '"The Tidebound Warden was a guardian once. It guards the river still, but it no longer remembers from what."',
    '"Burn and rot are siblings here. What fire leaves, the poison finishes. Do not fight them both at once."',
    '"The Gale Sovereign crowned itself on the highest branch and called the storm its court."',
    '"The Bloom Tyrant drinks the land\'s four voices. Silence it, and the stormglass road will open to the east."'
  ],
  vespera: [
    'The glyph crackles: "Vespera was a city of glass that caught lightning and turned it into light."',
    '"The Arc Sentinels were built to hold the storm back. Now they hold it in."',
    '"Phantoms are echoes that learned to repeat themselves. Strike the echo twice and the voice runs out."',
    '"The Tempest Colossus is two storms in one body — tide and gale, trading places every few breaths."',
    '"When the Colossus falls, the storm breaks, and for one night the whole glass city glows."'
  ]
};
const BLESSINGS = {
  ward:   { name: 'Ward of Glass', text: () => 'Start your next fight with ' + (6 + Math.ceil(state.playerLevel / 2)) + ' Block.' },
  surge:  { name: 'Surge Rite', text: () => 'Next fight: +1 energy and +1 card on turn 1.' },
  aether: { name: 'Aether Well', text: () => 'Start your next fight with 3 extra Aether.' },
  edge:   { name: 'Keen Edge', text: () => 'Next fight: every attack deals +3 damage.' },
  vigil:  { name: 'Vigil', text: () => 'After you win your next fight, heal 30% of your maximum HP.' }
};
const MERCHANT_ITEMS = {
  side:    { name: 'Side deck card', cost: 10, text: 'A random side card from this world.' },
  potion:  { name: 'Healing potion', cost: 5, text: 'One small healing potion.' },
  pick:    { name: 'Card bundle', cost: 8, text: 'Choose one of three Impermanent cards from this world.' },
  upgraded:{ name: 'Upgraded card', cost: 12, text: 'Choose one of three Impermanent cards from this world, already upgraded.' },
  upgradePack: { name: 'Card upgrade pack', cost: 15, text: 'Raise one of your Impermanent cards by one level.' },
  bless:   { name: 'Bottled blessing', cost: 4, text: 'A random shrine blessing for your next fight.' }
};

function ensureExplore(s = state) {
  if (!s) return;
  if (!Number.isInteger(s.shards) || s.shards < 0) s.shards = 0;
  if (!s.poi || typeof s.poi !== 'object') s.poi = {};
  if (!Array.isArray(s.poi.used)) s.poi.used = [];
  if (!Array.isArray(s.poi.lore)) s.poi.lore = [];
  if (!Array.isArray(s.poi.loreRewards)) s.poi.loreRewards = [];
  if (!Array.isArray(s.poi.bought)) s.poi.bought = [];
  if (!Number.isInteger(s.poi.merchantMoves)) s.poi.merchantMoves = 0;
  if (s.blessing && !Object.hasOwn(BLESSINGS, s.blessing)) s.blessing = null;
}

// --- Placement (deterministic per journey seed) ---
const poiCache = {};
function isStartRoom(key) { return activeRegion === 'city' ? key === '0,5' : key === '0,0'; }
function poiEligible(key) {
  const r = rooms[key]; if (!r || isStartRoom(key) || r.relic || chestFor(key)) return false;
  return !roomSpawns(key).some(s => s.boss);
}
const spotCache = {};
function poiSpot(key) {
  const ck = state.seed + ':' + activeRegion + ':' + key;
  if (ck in spotCache) return spotCache[ck];
  const spawns = roomSpawns(key), rand = seeded(hashSeed(state.seed + activeRegion + key + 'poi-spot'));
  const spots = [...POI_SPOTS].sort(() => rand() - .5);
  return spotCache[ck] = spots.find(([x, y]) => walkable(key, x, y, 30) && spawns.every(s => Math.hypot(s.x - x, s.y - y) > 150)) || null;
}
function worldPOIs(region = activeRegion) {
  const id = state.seed + ':' + region;
  if (poiCache[id]) return poiCache[id];
  const keys = Object.keys(rooms).filter(poiEligible).sort();
  const rand = seeded(hashSeed(state.seed + region + 'poi'));
  const order = keys.map(k => [rand(), k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const out = {}; let lore = 0; const guaranteed = ['shrine', 'campfire', 'cache', 'sealed'].sort(() => rand() - .5);
  const target = Math.round(keys.length * POI_SHARE);
  for (const key of order) {
    if (Object.keys(out).length >= target) break;
    const spot = poiSpot(key); if (!spot) continue;
    let type;
    if (lore < LORE_PER_WORLD) { type = 'lore'; lore++; }
    else if (guaranteed.length) type = guaranteed.shift(); // one of each kind first
    else { const r = rand(); type = r < .3 ? 'shrine' : r < .55 ? 'campfire' : r < .82 ? 'cache' : 'sealed'; }
    out[key] = { key, type, x: spot[0], y: spot[1], loreIndex: type === 'lore' ? lore - 1 : null, id: region + ':' + key };
  }
  return poiCache[id] = out;
}
function poiAt(key) { return worldPOIs()[key] || null; }
function poiUsed(p) { return state.poi.used.includes(p.id); }
const merchantCache = {};
function merchantRoom() {
  const ck = state.seed + ':' + activeRegion + ':' + state.poi.merchantMoves;
  if (ck in merchantCache) return merchantCache[ck];
  return merchantCache[ck] = findMerchantRoom();
}
function findMerchantRoom() {
  const pois = worldPOIs(), keys = Object.keys(rooms).filter(k => poiEligible(k) && !pois[k] && poiSpot(k)).sort();
  // Every world always has a store: if no ordinary room is free, the merchant sets up at the safe start room.
  if (!keys.length) { const start = Object.keys(rooms).find(isStartRoom); return { key: start, x: 560, y: 250, type: 'merchant', id: activeRegion + ':merchant:' + state.poi.merchantMoves }; }
  const key = keys[hashSeed(state.seed + activeRegion + 'merchant' + state.poi.merchantMoves) % keys.length], spot = poiSpot(key);
  return { key, x: spot[0], y: spot[1], type: 'merchant', id: activeRegion + ':merchant:' + state.poi.merchantMoves };
}
function merchantStock() {
  const rand = seeded(hashSeed(state.seed + activeRegion + 'stock' + state.poi.merchantMoves));
  // Always a side card and a card upgrade (an upgraded card or an upgrade pack), plus one other ware.
  // The merchant never sells Soulbound cards or Upgrade Crystals.
  const upgrade = rand() < .5 ? 'upgraded' : 'upgradePack', others = ['potion', 'pick', 'bless'];
  return ['side', upgrade, others[Math.floor(rand() * others.length)]];
}
function poiDisplay(p) {
  if (p.type === 'lore') { const [icon, name] = LORE_NAMES[activeRegion] || LORE_NAMES.city; return { icon, name }; }
  return POI_INFO[p.type];
}

// --- Rendering in the world and on the map ---
function poiNode(p) {
  const d = poiDisplay(p), node = document.createElement('div');
  node.className = 'poi-node poi-' + p.type + (p.type !== 'merchant' && poiUsed(p) ? ' used' : '');
  node.dataset.name = d.name + (p.type !== 'merchant' && poiUsed(p) ? ' · used' : '');
  node.innerHTML = '<span class="poi-glyph">' + d.icon + '</span>';
  node.style.left = p.x + 'px'; node.style.top = p.y + 'px';
  return node;
}
const renderWorldBeforeExplore = renderWorld;
renderWorld = function () {
  renderWorldBeforeExplore();
  if (!state) return; ensureExplore();
  const world = $('world'), area = typeof joinedArea === 'function' ? joinedArea() : { cells: [state.room] }, shop = merchantRoom();
  for (const key of area.cells) {
    const host = world.querySelector && world.querySelector('.area-cell[data-room="' + key + '"]') || (key === state.room ? world : null);
    if (!host || !host.append) continue;
    const p = poiAt(key); if (p) host.append(poiNode(p));
    if (shop && shop.key === key) host.append(poiNode(shop));
  }
};
const renderHUDBeforeExplore = renderHUD;
renderHUD = function () {
  renderHUDBeforeExplore(); ensureExplore();
  const hud = $('hud'); if (!hud || !hud.append) return;
  const line = document.createElement('div'); line.className = 'hud-row explore-row';
  line.innerHTML = '<span>◇ ' + state.shards + ' Shards</span>' + (state.blessing ? '<span class="blessing-chip" title="' + BLESSINGS[state.blessing].text() + '">✧ ' + BLESSINGS[state.blessing].name + '</span>' : '');
  hud.append(line);
};
const roomTagBeforeExplore = roomTag;
roomTag = function (key) {
  const tag = roomTagBeforeExplore(key); if (tag || !state) return tag;
  ensureExplore();
  const shop = merchantRoom(); if (shop && shop.key === key) return { color: '#ffd27a', label: '🛒 Merchant' };
  const p = poiAt(key); if (!p) return null;
  const d = poiDisplay(p);
  return { color: poiUsed(p) ? '#7a8a96' : '#c9a7ff', label: d.icon + ' ' + (poiUsed(p) ? '✓' : d.name) };
};
const showMapBeforeExplore = showMap;
showMap = function () {
  showMapBeforeExplore(); ensureExplore();
  const all = Object.values(worldPOIs()), found = all.filter(p => state.visited.includes(p.key)).length, used = all.filter(poiUsed).length;
  const lore = state.poi.lore.filter(id => id.startsWith(activeRegion + ':')).length;
  const p = document.createElement('p'); p.className = 'map-poi-summary';
  p.textContent = 'Points of interest: ' + found + '/' + all.length + ' found, ' + used + ' used · ' + LORE_NAMES[activeRegion][1] + 's read ' + lore + '/' + LORE_PER_WORLD + ' · ◇ ' + state.shards + ' Shards.';
  const shop = merchantRoom(); if (shop) p.textContent += ' 🛒 Merchant: ' + (typeof getJoinedArea === 'function' ? getJoinedArea(shop.key).name : rooms[shop.key].name) + '.';
  const ret = $('mapReturn'); if (ret && ret.before) ret.before(p);
};

// --- Interaction ---
let poiArmed = null;
const checkWorldInteractionsBeforeExplore = checkWorldInteractions;
checkWorldInteractions = function () {
  checkWorldInteractionsBeforeExplore();
  if (!state || state.battle || !$('menuOverlay').classList.contains('hidden')) return;
  ensureExplore();
  const shop = merchantRoom(), here = [poiAt(state.room), shop && shop.key === state.room ? shop : null].filter(Boolean);
  const near = here.find(p => Math.hypot(state.pos.x - p.x, state.pos.y - p.y) < 40);
  if (!near) { poiArmed = null; return; }
  if (poiArmed === near.id) return; // already opened; step away to re-open
  poiArmed = near.id;
  openPOI(near);
};
function poiMenu(title, body, buttons) {
  keys = {};
  openMenu('<div class="eyebrow">POINT OF INTEREST</div><h2>' + title + '</h2>' + body + '<div class="poi-actions">' + buttons.map(b => '<button id="' + b.id + '"' + (b.primary ? ' class="primary"' : '') + (b.disabled ? ' disabled' : '') + '>' + b.label + '</button>').join('') + '</div>');
  for (const b of buttons) { const el = $(b.id); if (el && !b.disabled) el.onclick = b.onclick; }
}
function finishPOI(p, msg) { if (p && !state.poi.used.includes(p.id)) state.poi.used.push(p.id); if (msg) toast(msg); save(); closeMenu(); renderWorld(); }
function openPOI(p) {
  if (p.type === 'merchant') return openMerchant(p);
  const d = poiDisplay(p);
  if (poiUsed(p)) return poiMenu(d.icon + ' ' + d.name, '<p class="muted">You have already used this.' + (p.type === 'lore' ? '</p><blockquote class="lore">' + LORE[activeRegion][p.loreIndex] + '</blockquote>' : '</p>'), [{ id: 'poiLeave', label: 'Leave', primary: true, onclick: closeMenu }]);
  if (p.type === 'shrine') {
    const rand = seeded(hashSeed(p.id + state.seed)), offers = Object.keys(BLESSINGS).sort(() => rand() - .5).slice(0, 3);
    return poiMenu('⛩ Aether Shrine', '<p>The shrine offers one blessing for your next fight.' + (state.blessing ? ' It replaces <b>' + BLESSINGS[state.blessing].name + '</b>.' : '') + '</p>' + offers.map(id => '<p class="poi-option"><b>' + BLESSINGS[id].name + '</b> — ' + BLESSINGS[id].text() + '</p>').join(''),
      offers.map((id, i) => ({ id: 'bless' + i, label: BLESSINGS[id].name, primary: i === 0, onclick: () => { state.blessing = id; finishPOI(p, 'Blessing: ' + BLESSINGS[id].name + '. It lasts until your next fight.'); } })).concat([{ id: 'poiLeave', label: 'Leave', onclick: closeMenu }]));
  }
  if (p.type === 'campfire') {
    const heal = Math.ceil(state.maxHp * .35), deck = active().filter(c => c.level < 3);
    poiMenu('🔥 Campfire', '<p>Rest and recover <b>' + heal + ' HP</b>, or train one card in your active deck for <b>+15 mastery uses</b> (tap a card).</p><div class="cards" id="trainCards"></div>',
      [{ id: 'poiRest', label: 'Rest · +' + heal + ' HP', primary: true, disabled: state.hp >= state.maxHp, onclick: () => { state.hp = Math.min(state.maxHp, state.hp + heal); finishPOI(p, 'You rest by the fire: +' + heal + ' HP.'); } }, { id: 'poiLeave', label: 'Leave', onclick: closeMenu }]);
    const host = $('trainCards');
    if (host && host.append) deck.forEach(c => host.append(cardElement(c, () => { trainCard(c); finishPOI(p, stat(c).name + ' trained: +15 mastery uses.'); })));
    return;
  }
  if (p.type === 'lore') {
    const d2 = poiDisplay(p);
    return poiMenu(d2.icon + ' ' + d2.name, '<blockquote class="lore">' + LORE[activeRegion][p.loreIndex] + '</blockquote><p class="muted">' + (state.poi.lore.filter(id => id.startsWith(activeRegion + ':')).length + 1) + ' of ' + LORE_PER_WORLD + ' in this world. Reading all five reveals a reward.</p>',
      [{ id: 'poiRead', label: 'Take it in · +2 Shards', primary: true, onclick: () => readLore(p) }]);
  }
  if (p.type === 'cache') {
    const rand = seeded(hashSeed(p.id + state.seed + 'cache')), shards = 3 + Math.floor(rand() * 4), potion = rand() < .25;
    return poiMenu('⬙ Supply Cache', '<p>A cache left by earlier travellers.</p>', [{ id: 'poiOpen', label: 'Open it', primary: true, onclick: () => { state.shards += shards; if (potion) state.potions++; finishPOI(p, 'Cache: +' + shards + ' Shards' + (potion ? ' and a healing potion' : '') + '.'); } }]);
  }
  if (p.type === 'sealed') {
    const hurt = Math.ceil(state.maxHp * .15);
    return poiMenu('⚠ Sealed Cache', '<p>The seal hums with stored charge. Prying it open might pay well — or discharge into you.</p><p class="poi-option">50%: <b>+9 Shards</b>. 50%: lose <b>' + hurt + ' HP</b> (never below 1) and the cache is ruined.</p>',
      [{ id: 'poiPry', label: 'Pry it open', primary: true, onclick: () => { if (Math.random() < .5) { state.shards += 9; finishPOI(p, 'The seal gives: +9 Shards.'); } else { state.hp = Math.max(1, state.hp - hurt); finishPOI(p, 'The seal discharges: −' + hurt + ' HP.'); } } }, { id: 'poiLeave', label: 'Leave it', onclick: closeMenu }]);
  }
}
function trainCard(c) { const o = owned(c.uid) || c; for (let k = 0; k < 15; k++) recordCardUse(o); }
function readLore(p) {
  state.shards += 2; state.poi.lore.push(p.id);
  const read = state.poi.lore.filter(id => id.startsWith(activeRegion + ':')).length;
  let msg = 'Lore recorded: +2 Shards.';
  if (read >= LORE_PER_WORLD && !state.poi.loreRewards.includes(activeRegion)) {
    state.poi.loreRewards.push(activeRegion); state.shards += 15;
    const pool = typeof sidePoolFor === 'function' ? sidePoolFor().filter(id => id !== 'stasis') : [];
    const card = pool.length && typeof addSideCard === 'function' ? addSideCard(pool[Math.floor(Math.random() * pool.length)]) : null;
    msg = 'All five read! +15 Shards' + (card ? ' and the side card ' + SIDE_CARDS[card.id].name : '') + '.';
  }
  finishPOI(p, msg);
}
function openMerchant(p) {
  const stock = merchantStock(), bought = id => state.poi.bought.includes(p.id + ':' + id);
  poiMenu('🛒 Wandering Merchant', '<p>"Shards for wares, traveller. I move on when you do."</p><p>You have <b>◇ ' + state.shards + ' Shards</b>.</p>' + stock.map(id => '<p class="poi-option"><b>' + MERCHANT_ITEMS[id].name + '</b> · ◇ ' + MERCHANT_ITEMS[id].cost + ' — ' + MERCHANT_ITEMS[id].text + (bought(id) ? ' <i>(sold)</i>' : '') + '</p>').join(''),
    stock.map((id, i) => ({ id: 'buy' + i, label: (bought(id) ? 'Sold · ' : 'Buy ') + MERCHANT_ITEMS[id].name + ' · ◇ ' + MERCHANT_ITEMS[id].cost, disabled: bought(id) || state.shards < MERCHANT_ITEMS[id].cost || (id === 'upgradePack' && !upgradeTargets().length), onclick: () => buyItem(p, id) })).concat([{ id: 'poiLeave', label: 'Leave', primary: true, onclick: closeMenu }]));
}
function buyItem(p, id) {
  const item = MERCHANT_ITEMS[id], tag = p.id + ':' + id;
  if (state.poi.bought.includes(tag) || state.shards < item.cost || (id === 'upgradePack' && !upgradeTargets().length)) return;
  state.shards -= item.cost; state.poi.bought.push(tag);
  let msg = 'Bought ' + item.name + '.';
  if (id === 'side') { const pool = sidePoolFor().filter(x => x !== 'stasis'), card = addSideCard(pool[Math.floor(Math.random() * pool.length)]); msg = 'Bought the side card ' + SIDE_CARDS[card.id].name + (state.side.deck.includes(card.uid) ? ' (added to your side deck).' : '. Add it in the Deck Workshop.'); }
  if (id === 'potion') state.potions++;
  if (id === 'bless') { const ids = Object.keys(BLESSINGS); state.blessing = ids[Math.floor(Math.random() * ids.length)]; msg = 'Bottled blessing: ' + BLESSINGS[state.blessing].name + '.'; }
  save();
  if (id === 'pick') return openBundle(0);
  if (id === 'upgraded') return openBundle(upgradedLevel());
  if (id === 'upgradePack') return openUpgradePack(p);
  toast(msg); openMerchant(p);
}
function upgradedLevel() { return activeRegion === 'vespera' ? 2 : 1; }
function upgradeTargets() { return state.pool.filter(c => !c.soulbound && !(defs[c.id] && defs[c.id].soulbound) && c.level < 3); }
function openUpgradePack(p) {
  poiMenu('Card upgrade pack', '<p>Choose one Impermanent card to raise by one level. Its mastery progress starts fresh at the new level.</p><div class="cards" id="packCards"></div>', []);
  const host = $('packCards');
  if (host && host.append) upgradeTargets().forEach(c => host.append(cardElement(c, () => applyUpgradePack(c))));
}
function applyUpgradePack(c) {
  const card = owned(c.uid) || c; if (card.soulbound || card.level >= 3) return;
  card.level++; card.uses = 0; save(); toast(stat(card).name + ' upgraded to level ' + card.level + '.'); closeMenu();
}
function openBundle(level = 0) {
  // Store cards are always Impermanent, never Soulbound.
  const offers = cardOffers().map(c => { c.soulbound = false; c.level = level; return c; });
  poiMenu(level ? 'Upgraded cards' : 'Card bundle', '<p>Choose one card.</p><div class="cards" id="bundleCards"></div>', [{ id: 'poiLeave', label: 'Leave them', onclick: closeMenu }]);
  offers.forEach(c => $('bundleCards').append(cardElement(c, () => { state.pool.push(c); if (state.deck.length < maxDeckSize() && copiesInDeck(c.id) < maxCopies()) state.deck.push(c.uid); save(); toast(stat(c).name + ' added to your collection.'); closeMenu(); })));
}

// --- Shards from fights, blessings in fights, merchant moving on ---
function shardDrop(b) { return b.enemy.boss ? ((enemies[b.id] || {}).miniBoss ? 6 : 10) : b.enemy.elite ? 3 : 1 + (Math.random() < .5 ? 1 : 0); }
const winBattleBeforeExplore = winBattle;
winBattle = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  winBattleBeforeExplore();
  if (b.phase !== 'reward') return;
  ensureExplore();
  const n = shardDrop(b); state.shards += n; b.special = b.special || []; b.special.push('◇ +' + n + ' Shards (' + state.shards + ' total).');
  if (b.blessVigil) { const heal = Math.ceil(state.maxHp * .3); state.hp = Math.min(state.maxHp, state.hp + heal); b.special.push('✧ Vigil: healed ' + heal + ' HP.'); }
};
const startBattleBeforeExplore = startBattle;
startBattle = function (spawnId) {
  startBattleBeforeExplore(spawnId);
  const b = state.battle; ensureExplore();
  if (!b || b.phase !== 'fight' || b.turn !== 1 || !state.blessing || b.blessed) return;
  const id = state.blessing; b.blessed = id; state.blessing = null;
  if (id === 'ward') b.block += 6 + Math.ceil(state.playerLevel / 2);
  if (id === 'surge') { b.energy += 1; drawCards(1); }
  if (id === 'aether' && typeof aetherInit === 'function') { aetherInit(b); b.aether = Math.min(AETHER_MAX, b.aether + 3); }
  if (id === 'edge') b.blessEdge = 3;
  if (id === 'vigil') b.blessVigil = true;
  b.logs.push('Blessing: ' + BLESSINGS[id].name + '.');
  save(); renderBattle();
};
const statBeforeExplore = stat;
stat = function (c) {
  const d = statBeforeExplore(c), b = typeof state === 'object' && state && state.battle;
  return b && b.blessEdge && d.damage > 0 && c && c.uid != null ? { ...d, damage: d.damage + b.blessEdge } : d;
};
const travelPortalBeforeExplore = travelPortal;
travelPortal = function () { ensureExplore(); const from = state.region; travelPortalBeforeExplore(); if (state.region !== from) { state.poi.merchantMoves++; save(); renderWorld(); } };
const loseBattleBeforeExplore = loseBattle;
loseBattle = function () { const r = loseBattleBeforeExplore(); if (state.battle && state.battle.phase === 'lost') { ensureExplore(); state.poi.merchantMoves++; } return r; };

const newGameBeforeExplore = newGame;
newGame = function () { newGameBeforeExplore(); ensureExplore(); save(); };
const restoreGameBeforeExplore = restoreGame;
restoreGame = function (s) { ensureExplore(s); return restoreGameBeforeExplore(s); };
const validateImportBeforeExplore = validateImport;
validateImport = function (s) {
  if (s && s.shards !== undefined && (!Number.isInteger(s.shards) || s.shards < 0 || s.shards > 1e7)) throw Error('Invalid shards.');
  if (s && s.blessing != null && !Object.hasOwn(BLESSINGS, s.blessing)) throw Error('Invalid blessing.');
  if (s && s.poi !== undefined) {
    const p = s.poi;
    if (!p || typeof p !== 'object') throw Error('Invalid exploration data.');
    for (const k of ['used', 'lore', 'loreRewards', 'bought']) if (p[k] !== undefined && (!Array.isArray(p[k]) || p[k].length > 5000 || p[k].some(x => typeof x !== 'string' || x.length > 120 || /[<>]/.test(x)))) throw Error('Invalid exploration data.');
    if (p.merchantMoves !== undefined && (!Number.isInteger(p.merchantMoves) || p.merchantMoves < 0)) throw Error('Invalid exploration data.');
  }
  return validateImportBeforeExplore(s);
};

const exploreStyles = document.createElement('style');
exploreStyles.textContent = '.poi-node{position:absolute;width:46px;height:46px;transform:translate(-50%,-50%);z-index:5;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#2b1f4ccc,#140f26cc);border:2px solid #c9a7ff;box-shadow:0 0 16px #b58cff88;animation:poiBob 2.4s ease-in-out infinite}.poi-node::after{content:attr(data-name);position:absolute;top:50px;white-space:nowrap;font:700 10px system-ui;color:#efe6ff;text-shadow:0 1px 2px #000;pointer-events:none}.poi-glyph{font-size:22px;line-height:1;filter:drop-shadow(0 0 4px #fff8)}.poi-node.used{opacity:.45;animation:none;filter:grayscale(.7)}.poi-merchant{border-color:#ffd27a;box-shadow:0 0 18px #ffbf4a99;background:radial-gradient(circle,#4a3410cc,#1e1406cc)}.poi-campfire{border-color:#ff9b5a;box-shadow:0 0 18px #ff7a3a88}.poi-shrine{border-color:#8fe3ff;box-shadow:0 0 18px #6fd6ff88}.poi-sealed{border-color:#ff6b6b}@keyframes poiBob{50%{transform:translate(-50%,calc(-50% - 4px))}}.explore-row{margin-top:4px}.blessing-chip{color:#d9c8ff}.poi-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.poi-option{margin:6px 0}.lore{margin:10px 0;padding:10px 14px;border-left:3px solid #c9a7ff;background:#1a1530;color:#e8e0ff;font-style:italic}.map-poi-summary{color:#d9c8ff}';
document.head.append(exploreStyles);
