'use strict';
// =====================================================================
// Round 153: the CARDSMITH. Every world has one; since Round 156 it stands in the
// room of the world's middle Nexus Waypoint, about halfway in. The cardsmith sells:
//   - card upgrades for Impermanent cards (◇ 36 / 60 / 90, the merchant's prices)
//   - making an Impermanent card Soulbound (◇ 500, keeps its level and mastery)
// =====================================================================
POI_INFO.cardsmith = { icon: '⚒', name: 'Cardsmith' };
const cardsmithCache = {};
function cardsmithSpot(key) {
  const ck = activeRegion + ':' + key; if (ck in cardsmithCache) return cardsmithCache[ck];
  const nexus = typeof poiAt === 'function' ? poiAt(key) : null, avoid = nexus ? [{ x: nexus.x, y: nexus.y }] : [];
  const spawns = typeof roomSpawns === 'function' ? roomSpawns(key).map(q => ({ x: q.x, y: q.y })) : [];
  const clear = (x, y) => avoid.every(a => Math.hypot(a.x - x, a.y - y) > 110) && spawns.every(a => Math.hypot(a.x - x, a.y - y) > 120); // away from the waypoint and the patrols
  for (const [tx, ty] of [[560, 330], [560, 170], [240, 380], [640, 250], [300, 140]]) {
    const q = typeof organicItemSpot === 'function' ? organicItemSpot(key, tx, ty, avoid.concat(spawns), 110) : null;
    if (q && clear(q.x, q.y)) return cardsmithCache[ck] = { x: q.x, y: q.y };
  }
  for (let r = 0; r < 320; r += 12) for (let a = 0; a < 16; a++) {
    const x = Math.round(560 + r * Math.cos(a * Math.PI / 8)), y = Math.round(300 + r * .6 * Math.sin(a * Math.PI / 8));
    if (x > 40 && x < 760 && y > 40 && y < 460 && walkable(key, x, y, 20) && clear(x, y)) return cardsmithCache[ck] = { x, y };
  }
  return cardsmithCache[ck] = { x: 560, y: 300 };
}
function cardsmithFor(region = activeRegion) {
  const start = typeof NEXUS_POINTS !== 'undefined' && NEXUS_POINTS[region] ? NEXUS_POINTS[region].mid : Object.keys(rooms).find(isStartRoom);
  if (!start || !rooms[start]) return null;
  const s = cardsmithSpot(start);
  return { key: start, x: s.x, y: s.y, type: 'cardsmith', id: region + ':cardsmith' };
}
function soulbindTargets() { return state.pool.filter(c => !c.soulbound && !(defs[c.id] && defs[c.id].soulbound)); }
function openCardsmith() {
  const up = typeof upgradeTargets === 'function' ? upgradeTargets().sort((a, b) => upgradePrice(a) - upgradePrice(b)) : [], bind = soulbindTargets();
  poiMenu('⚒ Cardsmith', '<p>"Bring me a card and I\'ll make it stronger, or bind it to you for good."</p><p>You have <b>◇ ' + state.shards + ' Shards</b>.</p>'
    + '<h3>Upgrade a card</h3><p class="muted">Raise one Impermanent card by a level: ◇ 36 to level 1, ◇ 60 to level 2, ◇ 90 to level 3. Its mastery starts fresh.</p><div class="cards" id="smithUpgrade"></div>'
    + '<h3>Make Soulbound · ◇ ' + SOULBIND_COST + '</h3><p class="muted">A Soulbound card is protected (never lost) and levels up with mastery and Upgrade Crystals. It keeps its level and mastery.</p><div class="cards" id="smithBind"></div>',
    [{ id: 'smithLeave', label: 'Leave', primary: true, onclick: closeMenu }]);
  const hu = $('smithUpgrade'), hb = $('smithBind');
  const tag = (el, text) => { const t = document.createElement('div'); t.className = 'actions'; t.textContent = text; el.append(t); return el; };
  if (hu && hu.append) {
    if (!up.length) hu.insertAdjacentHTML && hu.insertAdjacentHTML('beforeend', '<p class="muted">No Impermanent card can be upgraded right now.</p>');
    up.forEach(c => hu.append(tag(cardElement(c, () => { const card = owned(c.uid) || c, price = upgradePrice(card); if (state.shards < price || card.soulbound || card.level >= 3) return; state.shards -= price; card.level++; card.uses = 0; save(); toast(stat(card).name + ' upgraded to level ' + card.level + '.'); openCardsmith(); }, state.shards < upgradePrice(c)), '◇ ' + upgradePrice(c) + ' → level ' + (c.level + 1))));
  }
  if (hb && hb.append) {
    if (!bind.length) hb.insertAdjacentHTML && hb.insertAdjacentHTML('beforeend', '<p class="muted">You have no Impermanent cards to bind.</p>');
    bind.forEach(c => hb.append(tag(cardElement(c, () => { if (soulbindCard(owned(c.uid) || c)) { save(); openCardsmith(); } }, state.shards < SOULBIND_COST), '◇ ' + SOULBIND_COST + ' · make Soulbound')));
  }
}
const openPOIBeforeCardsmith = openPOI;
openPOI = function (p) { if (p && p.type === 'cardsmith') return openCardsmith(); return openPOIBeforeCardsmith.apply(this, arguments); };
const renderWorldBeforeCardsmith = renderWorld;
renderWorld = function () {
  renderWorldBeforeCardsmith.apply(this, arguments);
  if (!state || state.battle) return;
  const s = cardsmithFor(), world = $('world'); if (!s || s.key !== state.room || !world || !world.append) return;
  world.append(poiNode(s));
};
let cardsmithArmed = false;
const checkWorldInteractionsBeforeCardsmith = checkWorldInteractions;
checkWorldInteractions = function () {
  checkWorldInteractionsBeforeCardsmith.apply(this, arguments);
  if (!state || state.battle || !$('menuOverlay').classList.contains('hidden')) return;
  const s = cardsmithFor(), near = s && s.key === state.room && Math.hypot(state.pos.x - s.x, state.pos.y - s.y) < 40;
  if (!near) { cardsmithArmed = false; return; }
  if (cardsmithArmed) return; cardsmithArmed = true; openCardsmith();
};
const cardsmithStyles = document.createElement('style');
cardsmithStyles.textContent = '.poi-node.poi-cardsmith{width:30px!important;height:30px!important;border-color:#ffb35a!important;box-shadow:0 0 10px #ffb35acc!important;background:radial-gradient(circle,#4a2c14ee,#1c120bee)!important}.poi-node.poi-cardsmith .poi-glyph{font-size:17px}';
document.head.append(cardsmithStyles);

// Round 154: Solaris sprites for its merchant, Cardsmith, Sun Dial lore points and map chests.
const SOLARIS_POI_ART = { merchant: 'sol-merchant', cardsmith: 'sol-cardsmith', lore: 'sol-sundial' };
if (typeof poiArt === 'function') {
  const poiArtBeforeSolaris = poiArt;
  poiArt = function (p) { return (activeRegion === 'elaris' && p && SOLARIS_POI_ART[p.type]) || poiArtBeforeSolaris(p); };
}
const solarisSpriteStyles = document.createElement('style');
solarisSpriteStyles.textContent = '.poi-node.poi-art.poi-cardsmith{width:56px!important;height:56px!important;border:0!important;box-shadow:none!important;background:var(--poi-art) no-repeat center bottom/contain!important;filter:drop-shadow(0 0 6px #ffb35acc) drop-shadow(0 0 2px #000)}.poi-node.poi-art.poi-cardsmith::after{top:58px!important}'
  + '#world[data-environment="solaris"] .map-chest.elaris-chest{background-image:url(assets/items/poi/sol-chest.webp)!important}';
document.head.append(solarisSpriteStyles);
