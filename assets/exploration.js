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
  potion:  { name: 'Healing potion', cost: 4, repeatable: true, text: 'One small healing potion. Always in stock.' },
  pick:    { name: 'Card bundle', cost: 8, text: 'Choose one of three Impermanent cards from this world.' },
  upgraded:{ name: 'Upgraded card', cost: 12, text: 'Choose one of three Impermanent cards from this world, already upgraded.' },
  upgradePack: { name: 'Card upgrade', cost: 12, repeatable: true, text: 'Raise one of your Impermanent cards by one level: ◇ 12 to level 1, ◇ 20 to level 2, ◇ 30 to level 3. Always available.' },
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
  if (!Array.isArray(s.poi.waystones)) s.poi.waystones = [];
  if (!Array.isArray(s.poi.nexus)) s.poi.nexus = [];
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
  const target = Math.max(Math.round(keys.length * POI_SHARE), LORE_PER_WORLD + 4); // always room for all lore and one of each kind
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
  // Round 69: potions and card upgrades are always in stock and never sell out.
  const others = ['upgraded', 'pick', 'bless'];
  return ['side', 'potion', 'upgradePack', others[Math.floor(rand() * others.length)]];
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
function areaSeen(key) { const cells = typeof getJoinedArea === 'function' ? getJoinedArea(key).cells : [key]; return cells.some(c => state.visited.includes(c)); }
const roomTagBeforeExplore = roomTag;
roomTag = function (key) {
  if (state && !areaSeen(key)) return null; // nothing is tagged until you've seen that area
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
  // Round 59: the map only mentions what you have actually seen.
  const all = Object.values(worldPOIs()), seen = all.filter(p => areaSeen(p.key)), used = all.filter(poiUsed).length;
  const lore = state.poi.lore.filter(id => id.startsWith(activeRegion + ':')).length;
  const p = document.createElement('p'); p.className = 'map-poi-summary';
  const shop = merchantRoom(), shopSeen = shop && areaSeen(shop.key);
  p.textContent = 'Points of interest found: ' + seen.length + (used ? ' (' + used + ' used)' : '') + (lore ? ' · ' + LORE_NAMES[activeRegion][1] + 's read: ' + lore : '') + ' · ◇ ' + state.shards + ' Shards' + (shopSeen ? ' · 🛒 Merchant: ' + (typeof getJoinedArea === 'function' ? getJoinedArea(shop.key).name : rooms[shop.key].name) : '') + '.';
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
  if (poiUsed(p)) return poiMenu(d.icon + ' ' + d.name, '<p class="muted">' + (p.type === 'campfire' ? 'The campfire has burned out. Each campfire can be used once — to rest or to train one card.' : 'You have already used this.') + (p.type === 'lore' ? '</p><blockquote class="lore">' + LORE[activeRegion][p.loreIndex] + '</blockquote>' : '</p>'), [{ id: 'poiLeave', label: 'Leave', primary: true, onclick: closeMenu }]);
  if (p.type === 'shrine') {
    const rand = seeded(hashSeed(p.id + state.seed)), offers = Object.keys(BLESSINGS).sort(() => rand() - .5).slice(0, 3);
    return poiMenu('⛩ Aether Shrine', '<p>The shrine offers one blessing for your next fight.' + (state.blessing ? ' It replaces <b>' + BLESSINGS[state.blessing].name + '</b>.' : '') + '</p>' + offers.map(id => '<p class="poi-option"><b>' + BLESSINGS[id].name + '</b> — ' + BLESSINGS[id].text() + '</p>').join(''),
      offers.map((id, i) => ({ id: 'bless' + i, label: BLESSINGS[id].name, primary: i === 0, onclick: () => { state.blessing = id; finishPOI(p, 'Blessing: ' + BLESSINGS[id].name + '. It lasts until your next fight.'); } })).concat([{ id: 'poiLeave', label: 'Leave', onclick: closeMenu }]));
  }
  if (p.type === 'campfire') {
    const heal = Math.ceil(state.maxHp * .35), deck = active().filter(c => c.level < 3);
    poiMenu('🔥 Campfire', '<p>Rest and recover <b>' + heal + ' HP</b>, <i>or</i> train one card in your active deck for <b>+15 mastery uses</b> (tap a card). The fire burns out after one use.</p><div class="cards" id="trainCards"></div>',
      [{ id: 'poiRest', label: 'Rest · +' + heal + ' HP', primary: true, disabled: state.hp >= state.maxHp, onclick: () => { if (poiUsed(p)) return; state.hp = Math.min(state.maxHp, state.hp + heal); finishPOI(p, 'You rest by the fire: +' + heal + ' HP. The campfire burns out.'); } }, { id: 'poiLeave', label: 'Leave', onclick: closeMenu }]);
    const host = $('trainCards');
    if (host && host.append) deck.forEach(c => host.append(cardElement(c, () => { if (poiUsed(p)) return; trainCard(c); finishPOI(p, stat(c).name + ' trained: +15 mastery uses. The campfire burns out.'); })));
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
  const stock = merchantStock(), bought = id => !MERCHANT_ITEMS[id].repeatable && state.poi.bought.includes(p.id + ':' + id);
  poiMenu('🛒 Wandering Merchant', '<p>"Shards for wares, traveller. I move on when you do."</p><p>You have <b>◇ ' + state.shards + ' Shards</b>.</p>' + stock.map(id => '<p class="poi-option"><b>' + MERCHANT_ITEMS[id].name + '</b> · ◇ ' + (id === 'upgradePack' ? '12–30' : MERCHANT_ITEMS[id].cost) + ' — ' + MERCHANT_ITEMS[id].text + (bought(id) ? ' <i>(sold)</i>' : '') + '</p>').join(''),
    stock.map((id, i) => ({ id: 'buy' + i, label: (bought(id) ? 'Sold · ' : id === 'upgradePack' ? 'Choose a card to upgrade · ◇ ' + cheapestUpgrade() : 'Buy ') + (id === 'upgradePack' ? '' : MERCHANT_ITEMS[id].name + ' · ◇ ' + MERCHANT_ITEMS[id].cost), disabled: bought(id) || state.shards < (id === 'upgradePack' ? cheapestUpgrade() : MERCHANT_ITEMS[id].cost) || (id === 'upgradePack' && !upgradeTargets().length), onclick: () => buyItem(p, id) })).concat([{ id: 'poiLeave', label: 'Leave', primary: true, onclick: closeMenu }]));
}
function buyItem(p, id) {
  const item = MERCHANT_ITEMS[id], tag = p.id + ':' + id;
  if (id === 'upgradePack') { if (upgradeTargets().length && state.shards >= cheapestUpgrade()) openUpgradePack(p); return; } // paid per card
  if ((!item.repeatable && state.poi.bought.includes(tag)) || state.shards < item.cost) return;
  state.shards -= item.cost; if (!item.repeatable) state.poi.bought.push(tag);
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
// Round 69: upgrades are unlimited and priced by the level they reach.
// The playthrough averaged ~1.5 Shards per regular fight and 150-180 per
// world, with hundreds left unspent; 12/20/30 makes a full 0→3 upgrade
// (62 Shards) roughly a third of a world's income.
const UPGRADE_PRICES = [12, 20, 30];
function upgradePrice(c) { return UPGRADE_PRICES[Math.min(2, c.level || 0)]; }
function cheapestUpgrade() { const t = upgradeTargets(); return t.length ? Math.min(...t.map(upgradePrice)) : UPGRADE_PRICES[0]; }
function openUpgradePack(p) {
  poiMenu('Card upgrade', '<p>Choose one Impermanent card to raise by one level. Its mastery progress starts fresh at the new level.</p><p>You have <b>◇ ' + state.shards + ' Shards</b>. Level 1 costs ◇ 12, level 2 ◇ 20, level 3 ◇ 30.</p><div class="cards" id="packCards"></div>', [{ id: 'packBack', label: 'Back to the merchant', primary: true, onclick: () => p ? openMerchant(p) : closeMenu() }]);
  const host = $('packCards');
  if (host && host.append) upgradeTargets().sort((a, b) => upgradePrice(a) - upgradePrice(b)).forEach(c => {
    const el = cardElement(c, () => buyUpgrade(c, p), state.shards < upgradePrice(c));
    const tag = document.createElement('div'); tag.className = 'actions'; tag.textContent = '◇ ' + upgradePrice(c) + ' → level ' + (c.level + 1); el.append(tag); host.append(el);
  });
}
function buyUpgrade(c, p) {
  const card = owned(c.uid) || c, price = upgradePrice(card);
  if (card.soulbound || card.level >= 3 || state.shards < price) return;
  state.shards -= price; applyUpgradePack(card);
  if (p && upgradeTargets().length && state.shards >= cheapestUpgrade()) openUpgradePack(p);
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

// =====================================================================
// Round 70: pacing for Elaris and Vespera — quiet rooms with events, and
// shortcuts. Quiet rooms have no enemies; each holds an event with
// a choice. (Round 70's waystone pair became Nexus Waypoints in Round 73:
// far stone once to attune it, then travel between the two from either end.
// =====================================================================
const QUIET_ROOMS = {
  elaris: ['2,2', '5,6', '10,7'],
  vespera: ['2,4', '6,4', '10,5']
};
// Round 73: Nexus Waypoints at the start and middle of every world (see below).
const NEXUS_POINTS = {
  city: { start: '0,5', mid: '5,6' },
  elaris: { start: '0,0', mid: '7,6' },
  vespera: { start: '0,0', mid: '8,2' }
};
const pct = f => Math.max(1, Math.ceil(state.maxHp * f));
function randomImpermanent() { const t = upgradeTargets().filter(c => state.deck.includes(c.uid)); const list = t.length ? t : upgradeTargets(); return list[Math.floor(Math.random() * list.length)] || null; }
const EVENTS = {
  // Elaris
  spring: { icon: '❦', name: 'Moonlit Spring', text: () => 'Cold, clear water pools between the roots. Nothing here wants to fight you.',
    choices: () => [{ label: 'Rest and drink · heal ' + pct(.5) + ' HP', run: () => { state.hp = Math.min(state.maxHp, state.hp + pct(.5)); return 'You rest by the spring: +' + pct(.5) + ' HP.'; } },
                    { label: 'Fill your flasks · +2 potions', run: () => { state.potions += 2; return 'You fill two flasks: +2 healing potions.'; } }] },
  ranger: { icon: '⚕', name: 'Wounded Ranger', text: () => 'A ranger leans against a tree, bleeding through a makeshift bandage.',
    choices: () => [{ label: 'Give a potion · she shares a side card', disabled: !state.potions, run: () => { state.potions--; const pool = sidePoolFor().filter(x => x !== 'stasis'), c = addSideCard(pool[Math.floor(Math.random() * pool.length)]); return 'The ranger thanks you with ' + SIDE_CARDS[c.id].name + ' (side deck).'; } },
                    { label: 'Bind the wound yourself · −' + pct(.1) + ' HP, +8 Shards', run: () => { state.hp = Math.max(1, state.hp - pct(.1)); state.shards += 8; return 'She presses 8 Shards into your hand.'; } }] },
  seedpod: { icon: '✿', name: 'Glowing Seedpod', text: () => 'A seedpod the size of a lantern pulses with Aether.',
    choices: () => [{ label: 'Absorb it · Aether Well blessing', run: () => { state.blessing = 'aether'; return 'Aether Well: start your next fight with 3 extra Aether.'; } },
                    { label: 'Crack it open · 60%: heal ' + pct(.4) + ' HP, 40%: −' + pct(.1) + ' HP', run: () => { if (Math.random() < .6) { state.hp = Math.min(state.maxHp, state.hp + pct(.4)); return 'Sweet sap: +' + pct(.4) + ' HP.'; } state.hp = Math.max(1, state.hp - pct(.1)); return 'Bitter spores: −' + pct(.1) + ' HP.'; } }] },
  vines: { icon: '❧', name: 'Strangling Vines', text: () => 'Vines have overgrown an old satchel. Something inside glints.',
    choices: () => [{ label: 'Cut through · −' + pct(.15) + ' HP, upgrade a random Impermanent card', disabled: !upgradeTargets().length, run: () => { state.hp = Math.max(1, state.hp - pct(.15)); const c = randomImpermanent(); applyUpgradePack(c); return stat(c).name + ' rose to level ' + c.level + '.'; } },
                    { label: 'Pry the satchel loose · +5 Shards', run: () => { state.shards += 5; return '+5 Shards.'; } }] },
  // Vespera
  shelter: { icon: '⛺', name: 'Storm Shelter', text: () => 'A glass dome keeps the storm out. The silence is almost loud.',
    choices: () => [{ label: 'Sleep · heal ' + pct(.5) + ' HP', run: () => { state.hp = Math.min(state.maxHp, state.hp + pct(.5)); return 'You sleep through the storm: +' + pct(.5) + ' HP.'; } },
                    { label: 'Search the lockers · +2 potions', run: () => { state.potions += 2; return '+2 healing potions.'; } }] },
  conduit: { icon: 'ϟ', name: 'Humming Conduit', text: () => 'Raw current arcs from a cracked conduit.',
    choices: () => [{ label: 'Channel it · −' + pct(.2) + ' HP, +15 Shards', run: () => { state.hp = Math.max(1, state.hp - pct(.2)); state.shards += 15; return 'The current crystallises: +15 Shards.'; } },
                    { label: 'Ground it safely · Surge Rite blessing', run: () => { state.blessing = 'surge'; return 'Surge Rite: next fight +1 energy and +1 card on turn 1.'; } }] },
  scavenger: { icon: '⚙', name: 'Glass Scavenger', text: () => 'A scavenger with mirrored goggles offers a trade.',
    choices: () => [{ label: 'Trade 10 Shards · upgrade a random Impermanent card', disabled: state.shards < 10 || !upgradeTargets().length, run: () => { state.shards -= 10; const c = randomImpermanent(); applyUpgradePack(c); return stat(c).name + ' rose to level ' + c.level + '.'; } },
                    { label: 'Trade a potion · +6 Shards', disabled: !state.potions, run: () => { state.potions--; state.shards += 6; return '+6 Shards.'; } }] },
  prism: { icon: '◈', name: 'Echoing Prism', text: () => 'Your reflection in the prism moves a moment before you do.',
    choices: () => [{ label: 'Study it · train your whole deck +10 uses', run: () => { active().forEach(c => { for (let k = 0; k < 10; k++) recordCardUse(owned(c.uid) || c); }); return 'Every card in your deck gains 10 mastery uses.'; } },
                    { label: 'Shatter it · Keen Edge blessing', run: () => { state.blessing = 'edge'; return 'Keen Edge: every attack deals +3 damage next fight.'; } }] }
};
const EVENT_POOLS = { elaris: ['spring', 'ranger', 'seedpod', 'vines'], vespera: ['shelter', 'conduit', 'scavenger', 'prism'] };
POI_INFO.event = { icon: '❖', name: 'Event' };
POI_INFO.nexus = { icon: '⟟', name: 'Nexus Waypoint' };
function isQuietRoom(key, region = activeRegion) { return (QUIET_ROOMS[region] || []).includes(key); }
// Quiet rooms never spawn enemies (bosses are never in them).
const roomSpawnsBeforeQuiet = roomSpawns;
roomSpawns = function (key) { const list = roomSpawnsBeforeQuiet(key); return isQuietRoom(key) ? list.filter(s => s.boss) : list; };
// Events and mid-world Nexus Waypoints take their rooms before the ordinary POIs are placed.
const poiEligibleBeforePacing = poiEligible;
poiEligible = function (key) { return poiEligibleBeforePacing(key) && !isQuietRoom(key) && !(NEXUS_POINTS[activeRegion] && NEXUS_POINTS[activeRegion].mid === key); };
const worldPOIsBeforePacing = worldPOIs;
worldPOIs = function (region = activeRegion) {
  const out = worldPOIsBeforePacing(region);
  if (out.__pacing) return out;
  Object.defineProperty(out, '__pacing', { value: true, enumerable: false });
  const quiet = QUIET_ROOMS[region] || [], pool = EVENT_POOLS[region] || [];
  if (quiet.length) {
    const rand = seeded(hashSeed(state.seed + region + 'events')), order = pool.slice().sort(() => rand() - .5);
    quiet.forEach((key, i) => { if (!rooms[key]) return; const spot = poiSpot(key) || [400, 250]; out[key] = { key, type: 'event', event: order[i % order.length], x: spot[0], y: spot[1], id: region + ':event:' + key }; });
  }
  const nx = NEXUS_POINTS[region];
  if (nx && rooms[nx.mid]) {
    const spot = poiSpot(nx.mid) || [400, 250];
    out[nx.mid] = { key: nx.mid, type: 'nexus', x: spot[0], y: spot[1], id: region + ':nexus:' + nx.mid };
  }
  return out;
};
// The start room's waypoint sits beside the landing (the start room is not an ordinary POI room).
const poiAtBeforePacing = poiAt;
poiAt = function (key) {
  const nx = NEXUS_POINTS[activeRegion];
  if (nx && key === nx.start) return { key, type: 'nexus', x: 250, y: 250, id: activeRegion + ':nexus:' + key };
  return poiAtBeforePacing(key);
};
const poiDisplayBeforePacing = poiDisplay;
poiDisplay = function (p) {
  if (p.type === 'event') { const e = EVENTS[p.event]; return { icon: e.icon, name: e.name }; }
  if (p.type === 'nexus') return { icon: '⟟', name: 'Nexus Waypoint' };
  return poiDisplayBeforePacing(p);
};
// Nexus Waypoints are never "used up"; events are.
const poiUsedBeforePacing = poiUsed;
poiUsed = function (p) { return p.type === 'nexus' ? false : poiUsedBeforePacing(p); };
const openPOIBeforePacing = openPOI;
openPOI = function (p) {
  if (p.type === 'event') {
    const e = EVENTS[p.event];
    if (poiUsed(p)) return poiMenu(e.icon + ' ' + e.name, '<p class="muted">You have already been here. The room is quiet.</p>', [{ id: 'poiLeave', label: 'Leave', primary: true, onclick: closeMenu }]);
    return poiMenu(e.icon + ' ' + e.name, '<p>' + e.text() + '</p><p class="muted">A quiet room: no enemies here. Choose one.</p>',
      e.choices().map((c, i) => ({ id: 'event' + i, label: c.label, primary: i === 0, disabled: !!c.disabled, onclick: () => { if (poiUsed(p)) return; const msg = c.run(); finishPOI(p, msg); } }))
        .concat([{ id: 'poiLeave', label: 'Not now', onclick: closeMenu }]));
  }
  if (p.type === 'nexus') { discoverNexus(); return openNexusMenu(); }
  return openPOIBeforePacing(p);
};

// =====================================================================
// Round 73: Nexus Waypoints. Every world has one at its start and one in
// its middle. Walking into a waypoint's room discovers it; after that you
// can teleport to any discovered waypoint — in any world — from the map or
// by stepping on a waypoint.
// =====================================================================
function nexusId(region, key) { return region + ':' + key; }
function nexusList() {
  ensureExplore();
  const out = [];
  for (const [region, nx] of Object.entries(NEXUS_POINTS)) for (const which of ['start', 'mid']) {
    const key = nx[which], id = nexusId(region, key);
    if (state.poi.nexus.includes(id)) out.push({ region, key, which, id });
  }
  return out;
}
const NEXUS_WORLD_NAMES = { city: 'Neon Aftermath', elaris: 'Elaris', vespera: 'Vespera' };
function nexusRoomName(region, key) {
  if (region === activeRegion) return rooms[key] ? rooms[key].name : key;
  const src = region === 'city' ? (typeof CITY_ROOMS !== 'undefined' ? CITY_ROOMS : null) : region === 'vespera' ? (typeof VESPERA_ROOM_DATA !== 'undefined' ? VESPERA_ROOM_DATA : null) : null;
  return (src && src[key] && src[key].name) || ({ elaris: { '0,0': 'Dawnroot Landing', '7,6': 'Mistbound Thicket' } }[region] || {})[key] || key;
}
function discoverNexus() {
  if (!state) return false; ensureExplore();
  const nx = NEXUS_POINTS[activeRegion]; if (!nx || ![nx.start, nx.mid].includes(state.room)) return false;
  // Older saves: an attuned Round 70 waystone counts as both of that world's points.
  const id = nexusId(activeRegion, state.room); if (state.poi.nexus.includes(id)) return false;
  state.poi.nexus.push(id); save();
  if (state.room === nx.mid) toast('⟟ Nexus Waypoint discovered: ' + rooms[state.room].name + '. Teleport here from the map.');
  return true;
}
function migrateWaystones() {
  ensureExplore();
  for (const region of state.poi.waystones || []) { const nx = NEXUS_POINTS[region]; if (!nx) continue; for (const key of [nx.start, nx.mid]) if (!state.poi.nexus.includes(nexusId(region, key))) state.poi.nexus.push(nexusId(region, key)); }
}
function nexusTravel(region, key) {
  if (!state || state.battle || !NEXUS_POINTS[region]) return;
  if (!state.poi.nexus.includes(nexusId(region, key))) return toast('You have not discovered that Nexus Waypoint yet.');
  if (typeof tickCooldowns === 'function') tickCooldowns();
  if (region !== activeRegion) {
    state.regionVisits[activeRegion] = state.visited;
    state.region = region; configureRegion(region);
    state.visited = state.regionVisits[region] || [key]; state.regionVisits[region] = state.visited;
  }
  state.room = key; state.pos = { x: 400, y: 300 };
  if (!state.visited.includes(key)) state.visited.push(key);
  poiArmed = null; closeMenu(); save(); renderWorld();
  toast('⟟ The Nexus carries you to ' + rooms[key].name + (region !== 'city' || activeRegion !== 'city' ? ' · ' + NEXUS_WORLD_NAMES[region] : '') + '.');
}
function nexusButtonsHTML() {
  const list = nexusList();
  if (!list.length) return '<p class="muted">No Nexus Waypoints discovered yet.</p>';
  return Object.keys(NEXUS_POINTS).filter(r => list.some(n => n.region === r)).map(r => '<div class="nexus-world"><b>' + NEXUS_WORLD_NAMES[r] + '</b><div class="nexus-buttons">' +
    list.filter(n => n.region === r).map(n => { const here = n.region === activeRegion && n.key === state.room; return '<button class="nexus-go' + (here ? ' here' : '') + '" data-region="' + n.region + '" data-key="' + n.key + '"' + (here ? ' disabled' : '') + '>⟟ ' + nexusRoomName(n.region, n.key) + ' <small>' + (n.which === 'start' ? 'start' : 'mid-world') + (here ? ' · you are here' : '') + '</small></button>'; }).join('') + '</div></div>').join('');
}
function wireNexusButtons(root) {
  const nodes = root && root.querySelectorAll ? root.querySelectorAll('.nexus-go') : [];
  for (const b of nodes) if (!b.disabled) b.onclick = () => nexusTravel(b.dataset.region, b.dataset.key);
}
function openNexusMenu() {
  poiMenu('⟟ Nexus Waypoint', '<p>The waypoint hums. Choose a discovered waypoint to teleport to — in any world you have reached. You can also teleport from the map.</p><div class="nexus-list">' + nexusButtonsHTML() + '</div>', [{ id: 'poiLeave', label: 'Stay', primary: true, onclick: closeMenu }]);
  wireNexusButtons($('menuModal'));
}
// Discover on arrival (any way you get there: walking, portals, loading a save).
const renderWorldBeforeNexus = renderWorld;
renderWorld = function () { if (state) { migrateWaystones(); discoverNexus(); } renderWorldBeforeNexus(); };
// The map lists every discovered waypoint as a teleport button.
const showMapBeforeNexus = showMap;
showMap = function () {
  showMapBeforeNexus(); if (!state) return;
  const box = document.createElement('div'); box.className = 'nexus-map';
  box.innerHTML = '<h3>⟟ Nexus Waypoints</h3>' + nexusButtonsHTML() + (state.battle ? '<p class="muted">Finish the fight before teleporting.</p>' : '');
  const ret = $('mapReturn'); if (ret && ret.before) ret.before(box);
  wireNexusButtons(box);
};
const nexusStyles = document.createElement('style');
nexusStyles.textContent = '.nexus-map,.nexus-list{margin:10px 0;padding:10px 12px;border:1px solid #5fd8ff55;border-radius:10px;background:linear-gradient(135deg,#0d2533,#0a1520)}.nexus-map h3{margin:0 0 6px;font:800 15px system-ui;color:#9fe8ff;letter-spacing:.04em}.nexus-world{margin:6px 0}.nexus-world>b{display:block;font:700 12px system-ui;color:#c9d6e2;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}.nexus-buttons{display:flex;flex-wrap:wrap;gap:6px}.nexus-go{padding:6px 12px;border-radius:8px;border:1px solid #5fd8ff;background:#0f3346;color:#e4f8ff;font:600 13px system-ui;cursor:pointer;box-shadow:0 0 8px #5fd8ff44}.nexus-go:hover{background:#15465f}.nexus-go small{color:#8fcbe0;font-weight:500;margin-left:4px}.nexus-go.here{opacity:.55;cursor:default;box-shadow:none}';
document.head.append(nexusStyles);
