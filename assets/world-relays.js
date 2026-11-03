'use strict';
// =====================================================================
// Round 345 (owner: "add the breaker switch mechanic but customize it for each other world, I liked that feature in
// Neon City"). Neon Aftermath's Blackout (Round 298: three breaker boxes power the Afterlight Vault in the Refuge)
// now has a version in every other world. Three switches stand in rooms near, mid-way and far from the world's start
// (placed from the journey's seed, in rooms with nothing else in them); setting all three opens a sealed vault in the
// start room: Shards (more in later worlds), an Upgrade Crystal and one of that world's cards.
// =====================================================================
const WORLD_RELAYS = {
  elaris: {
    sw: { type: 'sunMirror', icon: '☀', name: 'Sun Mirror' }, vault: { type: 'sunVault', icon: '🏺', name: 'Sunvault' }, shards: 70,
    swText: 'A tall bronze mirror on a pivot, knocked askew by a sandstorm. Turned true, it throws a beam of sunlight toward Dawnfire Gate.',
    act: '☀ Turn the mirror to the sun', onText: 'The mirror holds its beam steady', grid: 'mirrors aligned', home: 'Dawnfire Gate',
    lockedText: 'A sealed sandstone vault, its sun-disc lock dark.', openText: 'Three beams meet on the sun-disc and the stone rolls aside. Inside: tribute the old city sealed away.',
    toastOn: '☀ Mirror aligned', toastAll: '☀ All three beams meet! The Sunvault at Dawnfire Gate is open.'
  },
  sky: {
    sw: { type: 'windVane', icon: '🌀', name: 'Wind Vane' }, vault: { type: 'galeStrongbox', icon: '🎁', name: 'Gale Strongbox' }, shards: 90,
    swText: 'A great brass weather vane, jammed facing the wrong way. Freed, it turns into the wind and pulls a current toward the landing.',
    act: '🌀 Free the vane', onText: 'The vane spins free in the wind', grid: 'vanes turning', home: 'the landing',
    lockedText: 'A brass strongbox chained to the deck, its wind-lock still.', openText: 'Three winds meet and the wind-lock spins open. Inside: cargo lost in the storms.',
    toastOn: '🌀 Vane freed', toastAll: '🌀 The winds meet! The Gale Strongbox at the landing is open.'
  },
  wilds: {
    sw: { type: 'spiritLantern', icon: '🏮', name: 'Spirit Lantern' }, vault: { type: 'heartHollow', icon: '🌳', name: 'Heartwood Hollow' }, shards: 110,
    swText: 'An old wardens\' lantern on a root-wrapped post, its flame long out. Relit, its light runs along the roots toward the grove.',
    act: '🏮 Relight the lantern', onText: 'The lantern burns green-gold', grid: 'lanterns lit', home: 'the grove',
    lockedText: 'A great hollow tree, its bark grown shut over the opening.', openText: 'The three lights reach the old tree and its bark peels open. Inside: the wardens\' hidden stores.',
    toastOn: '🏮 Lantern lit', toastAll: '🏮 All three lanterns burn! The Heartwood Hollow in the grove is open.'
  },
  vespera: {
    sw: { type: 'stormRod', icon: '⚡', name: 'Lightning Rod' }, vault: { type: 'stormStrongroom', icon: '⛈', name: 'Stormlocked Strongroom' }, shards: 130,
    swText: 'A toppled iron lightning rod, its cable snapped. Raised again, it catches the storm and sends the charge down the coast.',
    act: '⚡ Raise the rod', onText: 'The rod crackles with stormlight', grid: 'rods raised', home: 'the harbour',
    lockedText: 'A slate strongroom with a storm-lock, cold and dead.', openText: 'Three bolts strike and the storm-lock bursts open. Inside: salvage the harbour kept from the sea.',
    toastOn: '⚡ Rod raised', toastAll: '⚡ The storm answers! The Stormlocked Strongroom at the harbour is open.'
  },
  chronospire: {
    sw: { type: 'stoppedClock', icon: '🕰', name: 'Stopped Clock' }, vault: { type: 'chronoVault', icon: '⌛', name: 'Chrono Vault' }, shards: 150,
    swText: 'A great standing clock, its hands frozen. Wound again, its ticking joins the spire\'s heartbeat.',
    act: '🕰 Wind the clock', onText: 'The clock ticks in time again', grid: 'clocks wound', home: 'the gate',
    lockedText: 'A bronze vault with a clock-face lock, its hands still.', openText: 'Three clocks strike as one and the lock\'s hands turn to open. Inside: a hoard from a moment that never ended.',
    toastOn: '🕰 Clock wound', toastAll: '🕰 The clocks strike together! The Chrono Vault at the gate is open.'
  }
};
const RELAY_TYPES = {};
for (const [w, d] of Object.entries(WORLD_RELAYS)) { POI_INFO[d.sw.type] = { icon: d.sw.icon, name: d.sw.name }; POI_INFO[d.vault.type] = { icon: d.vault.icon, name: d.vault.name }; RELAY_TYPES[d.sw.type] = w; RELAY_TYPES[d.vault.type] = w; }

// Reading never writes to the save (so drawing the world doesn't change it); pass create to start this world's entry.
function worldRelayState(world = activeRegion, create) {
  if (!state || !WORLD_RELAYS[world]) return null;
  const saved = state.worldRelays && typeof state.worldRelays === 'object' && state.worldRelays[world];
  if (!saved && !create) return { on: [], vault: false };
  const all = state.worldRelays && typeof state.worldRelays === 'object' ? state.worldRelays : (state.worldRelays = {});
  const s = all[world] && typeof all[world] === 'object' ? all[world] : (all[world] = {});
  if (!Array.isArray(s.on)) s.on = []; s.vault = !!s.vault;
  return s;
}
// The three switch rooms: ordinary rooms with nothing else in them, one near, one mid-way and one far from the start.
const relayRoomCache = {};
function worldRelayRooms() {
  if (!state || !WORLD_RELAYS[activeRegion]) return [];
  const ck = activeRegion + ':' + state.seed; if (relayRoomCache[ck]) return relayRoomCache[ck];
  const smith = typeof cardsmithRoom === 'function' ? cardsmithRoom() : null, frac = k => typeof regionDistanceFrac === 'function' ? regionDistanceFrac(k) : .5;
  const keys = Object.keys(rooms).filter(k => poiEligibleBeforeRelays(k) && k !== smith && !isStartRoom(k));
  const rand = seeded(hashSeed(state.seed + 'relays' + activeRegion)), out = [];
  for (const [lo, hi] of [[0, .4], [.4, .7], [.7, 1.01]]) {
    const band = keys.filter(k => frac(k) >= lo && frac(k) < hi && !out.includes(k)).sort();
    if (band.length) out.push(band[Math.floor(rand() * band.length)]);
  }
  return relayRoomCache[ck] = out;
}
const poiEligibleBeforeRelays = poiEligible;
poiEligible = function (key) { return poiEligibleBeforeRelays(key) && !(WORLD_RELAYS[activeRegion] && state && worldRelayRooms().includes(key)); };
// A clear spot for an item: beside the paths, away from the room's patrols and other objects.
const relaySpotCache = {};
function relaySpot(key, id, avoid) {
  const ck = activeRegion + ':' + state.seed + ':' + id; if (ck in relaySpotCache) return relaySpotCache[ck];
  const all = avoid.concat(roomSpawns(key).map(q => ({ x: q.x, y: q.y }))), clear = (x, y) => all.every(a => Math.hypot(a.x - x, a.y - y) > 110);
  for (const [tx, ty] of [[560, 330], [240, 330], [560, 170], [240, 170], [640, 250], [160, 250]]) {
    const q = typeof organicItemSpot === 'function' ? organicItemSpot(key, tx, ty, all, 110) : null;
    if (q && clear(q.x, q.y)) return relaySpotCache[ck] = { x: q.x, y: q.y };
  }
  for (let r = 0; r < 320; r += 12) for (let a = 0; a < 16; a++) {
    const x = Math.round(400 + r * Math.cos(a * Math.PI / 8)), y = Math.round(250 + r * .6 * Math.sin(a * Math.PI / 8));
    if (x > 40 && x < 760 && y > 40 && y < 460 && walkable(key, x, y, 20) && clear(x, y)) return relaySpotCache[ck] = { x, y };
  }
  return relaySpotCache[ck] = { x: 400, y: 250 };
}
function worldRelayItems(key = state && state.room) {
  const d = WORLD_RELAYS[activeRegion]; if (!d || !state || !rooms[key]) return [];
  const out = [];
  if (isStartRoom(key)) {
    const taken = [{ x: 400, y: 300 }], p = typeof poiAt === 'function' ? poiAt(key) : null, shop = typeof merchantRoom === 'function' ? merchantRoom() : null;
    if (p) taken.push(p); if (shop && shop.key === key) taken.push(shop);
    if (typeof cardsmithRoom === 'function' && cardsmithRoom() === key && typeof cardsmithSpot === 'function') taken.push(cardsmithSpot(key));
    const v = relaySpot(key, 'vault', taken); out.push({ key, type: d.vault.type, id: activeRegion + ':relayVault', x: v.x, y: v.y });
  }
  const i = worldRelayRooms().indexOf(key);
  if (i >= 0) { const s = relaySpot(key, 'relay' + i, []); out.push({ key, type: d.sw.type, id: activeRegion + ':relay:' + i, index: i, x: s.x, y: s.y }); }
  return out;
}
// Set switches and an emptied vault count as used (dimmed on the map and in the room).
const poiUsedBeforeRelays = poiUsed;
poiUsed = function (p) {
  const w = p && RELAY_TYPES[p.type]; if (!w) return poiUsedBeforeRelays.apply(this, arguments);
  const s = worldRelayState(w); return !!s && (p.type === WORLD_RELAYS[w].vault.type ? s.vault : s.on.includes(p.index));
};
const poiNodeBeforeRelays = poiNode;
poiNode = function (p) {
  const node = poiNodeBeforeRelays.apply(this, arguments), w = p && RELAY_TYPES[p.type];
  if (!w || !node || !node.dataset) return node;
  const d = WORLD_RELAYS[w], s = worldRelayState(w);
  if (p.type === d.vault.type) node.dataset.name = d.vault.name + ' · ' + (s.vault ? 'emptied' : s.on.length >= 3 ? 'open' : s.on.length + '/3');
  else if (s.on.includes(p.index)) node.dataset.name = d.sw.name + ' · done';
  return node;
};
function relayMenu(title, body, buttons) { poiMenu(title, body, buttons.concat([{ id: 'relayLeave', label: 'Leave', onclick: closeMenu }])); }
function openRelay(p) {
  const d = WORLD_RELAYS[activeRegion], s = worldRelayState(activeRegion, true); if (!d || !s) return;
  const title = d.sw.icon + ' ' + d.sw.name;
  if (s.on.includes(p.index)) return relayMenu(title, '<p>' + d.onText + '. <b>' + s.on.length + '/3</b> ' + d.grid + '.</p>', []);
  relayMenu(title, '<p>' + d.swText + '</p><p class="muted">' + s.on.length + '/3 ' + d.grid + '. All three open the ' + d.vault.name + ' at ' + d.home + '.</p>',
    [{ id: 'relayAct', label: d.act, primary: true, onclick: () => {
      if (!s.on.includes(p.index)) s.on.push(p.index);
      save(); closeMenu(); renderWorld();
      toast(s.on.length >= 3 ? d.toastAll : d.toastOn + ': ' + s.on.length + '/3.');
    } }]);
}
function relayVaultCard(world = activeRegion) {
  const pool = (typeof VARIETY_POOLS !== 'undefined' && VARIETY_POOLS[world]) || [];
  return pool.length ? pool[hashSeed(state.seed + 'relayVault' + world) % pool.length] : null;
}
function openRelayVault() {
  const d = WORLD_RELAYS[activeRegion], s = worldRelayState(activeRegion, true); if (!d || !s) return;
  const shut = d.vault.icon + ' ' + d.vault.name;
  if (s.vault) return relayMenu(shut, '<p>It stands open and empty. You took what was left.</p>', []);
  if (s.on.length < 3) return relayMenu(shut, '<p>' + d.lockedText + '</p><p class="notice"><b>' + s.on.length + '/3</b> ' + d.grid + '. Look for the ' + d.sw.name + 's (' + d.sw.icon + ') out in the world.</p>', []);
  const cardId = relayVaultCard(), card = cardId && defs[cardId];
  relayMenu(shut, '<p>' + d.openText + '</p><p class="notice">◇' + d.shards + ' Shards · an Upgrade Crystal' + (card ? ' · ' + card.name : '') + '</p>',
    [{ id: 'relayLoot', label: 'Take it all', primary: true, onclick: () => {
      if (s.vault) return; s.vault = true; state.shards += d.shards; if (typeof setMaterials === 'function') setMaterials(materials() + 1);
      if (card) { const c = make(cardId); c.soulbound = false; state.pool.push(c); }
      save(); closeMenu(); renderWorld(); toast(d.vault.name + ': +' + d.shards + ' Shards, an Upgrade Crystal' + (card ? ' and ' + card.name + ' (in your collection)' : '') + '.');
    } }]);
}
function openRelayItem(p) { const d = WORLD_RELAYS[activeRegion]; if (!d) return; if (p.type === d.vault.type) return openRelayVault(); return openRelay(p); }
const openPOIBeforeRelays = openPOI;
openPOI = function (p) { if (p && RELAY_TYPES[p.type] === activeRegion) return openRelayItem(p); return openPOIBeforeRelays.apply(this, arguments); };
// Drawing and walking up to them.
const renderWorldBeforeRelays = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeRelays.apply(this, arguments);
  if (!state || state.battle || !WORLD_RELAYS[activeRegion] || typeof document === 'undefined' || !document.querySelectorAll) return out;
  const world = $('world'); if (world && world.append) for (const it of worldRelayItems()) world.append(poiNode(it));
  return out;
};
let relayArmed = null;
const checkWorldInteractionsBeforeRelays = checkWorldInteractions;
checkWorldInteractions = function () {
  checkWorldInteractionsBeforeRelays.apply(this, arguments);
  if (!state || state.battle || !WORLD_RELAYS[activeRegion] || !$('menuOverlay').classList.contains('hidden')) return;
  const near = worldRelayItems().find(it => Math.hypot(state.pos.x - it.x, state.pos.y - it.y) < 40);
  if (!near) { relayArmed = null; return; }
  if (relayArmed === near.id) return;
  if (typeof touchPassingBy === 'function' && touchPassingBy(near)) return; // only a tap on it opens it while passing (Round 184)
  relayArmed = near.id; openRelayItem(near);
};
if (typeof itemPadsFor === 'function') {
  const itemPadsForBeforeRelays = itemPadsFor;
  itemPadsFor = function (key) {
    const pads = itemPadsForBeforeRelays.apply(this, arguments);
    if (WORLD_RELAYS[activeRegion] && !pads.relays) { for (const it of worldRelayItems(key)) pads.push({ x: it.x, y: it.y, r: 40 + ITEM_PAD_EXTRA }); Object.defineProperty(pads, 'relays', { value: true }); }
    return pads;
  };
}
