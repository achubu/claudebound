'use strict';
// Round 60: picking up an Upgrade Crystal shows the crystal, the same way a
// card reward shows the card. Uses the up-arrow crystal from
// assets/items/upgrade-crystals.png.
function upgradeCrystalHTML(count = 1) {
  return '<div class="crystal-reward upgrade-pickup"><span class="upgrade-crystal-art" role="img" aria-label="Upgrade Crystal"></span><b>Upgrade Crystal' + (count > 1 ? ' ×' + count : '') + '</b><small>You now have ' + materials() + ' · spend one to level up a mastered Soulbound card</small></div>';
}
function showCrystalPickup(count, where) {
  keys = {};
  openMenu('<div class="eyebrow">ITEM FOUND</div><h2>◆ Upgrade Crystal</h2><p>' + where + '</p>' + upgradeCrystalHTML(count) + '<p><button id="crystalOk" class="primary">Continue</button></p>');
  const ok = $('crystalOk'); if (ok) ok.onclick = closeMenu;
}

// Battle rewards: loot-chest crystals and mini-boss crystals.
const winBattleBeforePickups = winBattle;
winBattle = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  const before = materials();
  winBattleBeforePickups();
  if (state.battle === b) b.crystalGain = Math.max(0, materials() - before);
};
const renderBattleBeforePickups = renderBattle;
renderBattle = function () {
  renderBattleBeforePickups();
  const b = state && state.battle;
  if (!b || b.phase !== 'reward' || !b.chestOpened || !b.crystalGain) return;
  const host = $('randomReward');
  if (host && host.insertAdjacentHTML) host.insertAdjacentHTML('afterbegin', upgradeCrystalHTML(b.crystalGain));
};

// In the world: hidden crystal chests and the Broadcast Row crystal (moved from Lighthouse Pier in Round 98).
const checkWorldInteractionsBeforePickups = checkWorldInteractions;
checkWorldInteractions = function () {
  const before = state ? materials() : 0, room = state && state.room;
  checkWorldInteractionsBeforePickups();
  if (!state || state.battle) return;
  const gained = materials() - before;
  if (gained > 0) showCrystalPickup(gained, 'Found in ' + (rooms[room] ? rooms[room].name : 'the ruins') + '.');
};

const pickupStyles = document.createElement('style');
pickupStyles.textContent = '.upgrade-pickup{display:flex;flex-direction:column;align-items:center;gap:4px;margin:10px auto;padding:12px 18px;max-width:320px;border:1px solid #f2c94c;border-radius:12px;background:radial-gradient(circle at 50% 30%,#f2c94c33,transparent 70%),#151022;text-align:center}.upgrade-pickup b{font:800 16px system-ui;color:#ffe9a8;letter-spacing:.04em}.upgrade-pickup small{font:12px system-ui;color:#d8c9a0}.upgrade-crystal-art{display:block;width:120px;height:120px;background:url(assets/items/upgrade-crystals.png) no-repeat 50% 0/300% 100%;filter:drop-shadow(0 0 12px #ffb340) drop-shadow(0 0 4px #fff3);animation:crystalPop .7s cubic-bezier(.2,1.6,.4,1) both,crystalFloat 2.6s ease-in-out .7s infinite}.cards .upgrade-pickup{align-self:start;justify-content:center;height:auto;width:240px;margin:0}@keyframes crystalPop{from{transform:scale(.2) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}@keyframes crystalFloat{50%{transform:translateY(-6px)}}';
document.head.append(pickupStyles);

// Round 125: every piece of loot on the victory screen shows up as a picture,
// not just a line of text. Cards (including covenant, boss and side deck
// cards) show as cards; crystals keep their art; everything else (potions,
// Shards, bounties, healing, XP, level-ups, side deck slots, an empty chest)
// gets a small illustrated tile. The text lines those tiles replace are removed.
const LOOT_ICONS = {
  potion: '<svg viewBox="0 0 64 64"><defs><linearGradient id="lpL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a8a"/><stop offset="1" stop-color="#b3122e"/></linearGradient></defs><rect x="25" y="6" width="14" height="7" rx="2" fill="#9a6b3c"/><path d="M27 13h10v10l12 16a14 14 0 0 1-11 21H26a14 14 0 0 1-11-21l12-16z" fill="#cfe9ff22" stroke="#bfe6ff" stroke-width="2"/><path d="M17 42h30a12 12 0 0 1-10 16H27a12 12 0 0 1-10-16z" fill="url(#lpL)"/><circle cx="28" cy="48" r="2.5" fill="#fff8"/><circle cx="36" cy="52" r="1.6" fill="#fff6"/></svg>',
  shards: '<svg viewBox="0 0 64 64"><path d="M32 4l14 20-14 36-14-36z" fill="#3fd4ff" stroke="#c8f6ff" stroke-width="2"/><path d="M18 24h28M32 4v56" stroke="#c8f6ff88" stroke-width="1.5"/><path d="M12 30l8 6-4 14-8-12z" fill="#2aa7d8" stroke="#c8f6ff" stroke-width="1.5"/><path d="M52 30l-8 6 4 14 8-12z" fill="#2aa7d8" stroke="#c8f6ff" stroke-width="1.5"/></svg>',
  bounty: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#3a2a08" stroke="#f2c94c" stroke-width="3"/><path d="M32 14l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#f2c94c" stroke="#fff3c4" stroke-width="1.5"/></svg>',
  heal: '<svg viewBox="0 0 64 64"><path d="M32 56S8 41 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 32-24 32z" fill="#ff5a7a" stroke="#ffd0da" stroke-width="2"/><path d="M28 24h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#fff" opacity=".9"/></svg>',
  xp: '<svg viewBox="0 0 64 64"><path d="M32 4l7 17 18 2-14 12 4 18-15-9-15 9 4-18L7 23l18-2z" fill="#ffd27a" stroke="#fff3c4" stroke-width="2"/><text x="32" y="38" text-anchor="middle" font="800 12px system-ui" font-family="system-ui" font-weight="800" font-size="12" fill="#5a3b00">XP</text></svg>',
  level: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#0f3a2a" stroke="#6dffb0" stroke-width="3"/><path d="M32 14l14 16h-8v18H26V30h-8z" fill="#6dffb0" stroke="#e0fff0" stroke-width="1.5"/></svg>',
  slot: '<svg viewBox="0 0 64 64"><rect x="10" y="12" width="26" height="38" rx="4" fill="#1b2d4a" stroke="#9fb8ff" stroke-width="2" transform="rotate(-8 23 31)"/><rect x="26" y="12" width="26" height="38" rx="4" fill="#24204a" stroke="#c9a2ff" stroke-width="2" transform="rotate(8 39 31)"/><path d="M39 22v18M30 31h18" stroke="#e8dcff" stroke-width="4" stroke-linecap="round"/></svg>',
  empty: '<svg viewBox="0 0 64 64"><g fill="#c9a27a" opacity=".85"><ellipse cx="20" cy="40" rx="5" ry="6"/><circle cx="13" cy="31" r="2.6"/><circle cx="19" cy="28" r="2.6"/><circle cx="26" cy="30" r="2.6"/><ellipse cx="42" cy="22" rx="5" ry="6"/><circle cx="35" cy="13" r="2.6"/><circle cx="41" cy="10" r="2.6"/><circle cx="48" cy="12" r="2.6"/></g></svg>',
};
function lootTileHTML(kind, label, sub) {
  return '<div class="loot-tile loot-' + kind + '"><span class="loot-icon" role="img" aria-label="' + label.replace(/"/g, '') + '">' + LOOT_ICONS[kind] + '</span><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
}
// Which reward lines become tiles (the rest, like a portal opening, stay as text).
function lootTileFor(line) {
  let m;
  if ((m = /^◇ \+(\d+) Shards \((\d+) total\)/.exec(line))) return lootTileHTML('shards', '+' + m[1] + (m[1] === '1' ? ' Shard' : ' Shards'), m[2] + ' total');
  if ((m = /^★ Bounty complete — (.+): \+(\d+) Shards/.exec(line))) return lootTileHTML('bounty', '+' + m[2] + ' Shards', 'Bounty: ' + m[1]);
  if ((m = /^✧ Vigil: healed (\d+) HP/.exec(line))) return lootTileHTML('heal', '+' + m[1] + ' HP', 'Vigil blessing');
  if ((m = /^✦ Side deck expanded: room for (\d+) of (\d+)/.exec(line))) return lootTileHTML('slot', 'Side deck slot', m[1] + ' of ' + m[2] + ' side cards');
  if (/^✦ Side deck card: /.test(line) || /^Soulbound boss card: /.test(line)) return ''; // shown as the card itself
  if (/^Mini-boss defeated: guaranteed Upgrade Crystal/.test(line) || / crystal found! Slot it into the Aetherlink\.$/.test(line)) return ''; // crystal art is already shown
  return null;
}
const winBattleBeforeLootArt = winBattle;
winBattle = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return winBattleBeforeLootArt();
  const before = new Set(state.pool.map(c => c.uid));
  winBattleBeforeLootArt();
  if (state.battle === b && b.phase === 'reward') b.newCards = state.pool.filter(c => !before.has(c.uid)).map(c => c.uid);
};
const renderBattleBeforeLootArt = renderBattle;
renderBattle = function () {
  renderBattleBeforeLootArt();
  const b = state && state.battle, m = $('battleModal');
  if (!b || b.phase !== 'reward' || !b.chestOpened || !m || !m.querySelector || !document.createElement) return;
  let host = $('randomReward');
  if (!host) {
    const offers = $('cardOffers'); if (!offers || !offers.after) return;
    host = document.createElement('div'); host.id = 'randomReward'; host.className = 'cards'; offers.after(host);
  }
  if (!host.insertAdjacentHTML || (host.dataset && host.dataset.lootArt)) return; if (host.dataset) host.dataset.lootArt = '1';
  const tiles = [];
  // Cards that came with the win but aren't on screen yet (covenant, boss and mini-boss cards).
  const shown = new Set([b.reward && b.reward.uid, b.uniqueDrop].filter(Boolean));
  for (const uid of b.newCards || []) { if (shown.has(uid)) continue; const c = state.pool.find(x => x.uid === uid); if (c) host.append(cardElement(c, () => {}, true)); }
  if (b.sideDrop && typeof sideCardElement === 'function' && state.side && !host.querySelector('.side-card')) { const c = state.side.pool.find(x => x.uid === b.sideDrop); if (c) host.append(sideCardElement(c, () => {}, true)); }
  if (b.potionDrop) tiles.push(lootTileHTML('potion', 'Healing Potion', 'You have ' + state.potions));
  if (b.lootType === 'empty') tiles.push('<div class="loot-tile loot-empty"><span class="loot-icon loot-open-chest" role="img" aria-label="Empty chest">' + LOOT_ICONS.empty + '</span><b>Empty chest</b><small>' + (b.thief || 'something') + ' took it all</small></div>');
  // Reward lines: turn the ones we can draw into tiles and drop their text.
  for (const p of Array.from(m.querySelectorAll('p.notice'))) { const t = lootTileFor(p.textContent.trim()); if (t === null) continue; if (t) tiles.push(t); p.remove(); }
  if (b.xpGain) { tiles.push(lootTileHTML('xp', '+' + b.xpGain + ' XP', 'Experience')); const p = m.querySelector('p.xp-gain'), note = p && p.querySelector('.muted'); if (note) p.replaceChildren(note); else if (p) p.remove(); }
  if (b.levels && b.levels.length) { for (const p of Array.from(m.querySelectorAll('p'))) if (p.textContent.startsWith('Level ' + state.playerLevel + '! +')) p.remove(); }
  if (b.levels && b.levels.length) tiles.push(lootTileHTML('level', 'Level ' + state.playerLevel + '!', '+' + b.levels.length + ' max HP · +' + b.levels.length + ' talent point' + (b.levels.length > 1 ? 's' : '')));
  if (tiles.length) host.insertAdjacentHTML('beforeend', '<div class="loot-tiles">' + tiles.join('') + '</div>');
};
const lootArtStyles = document.createElement('style');
lootArtStyles.textContent = '#randomReward{flex-wrap:wrap;justify-content:center;align-items:flex-start}.loot-tiles{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;width:100%;margin:8px 0}'
  + '.loot-tile{display:flex;flex-direction:column;align-items:center;gap:3px;width:108px;padding:10px 6px 8px;border:1px solid #5d86a0;border-radius:12px;background:radial-gradient(circle at 50% 30%,#38d6ff22,transparent 70%),#0c1624;text-align:center;animation:crystalPop .6s cubic-bezier(.2,1.6,.4,1) both}'
  + '.loot-tile b{font:800 13px system-ui;color:#e8f6ff}.loot-tile small{font:10px system-ui;color:#9fb6c8;line-height:1.25}'
  + '.loot-icon{display:block;width:58px;height:58px;filter:drop-shadow(0 0 8px #38d6ff66)}.loot-icon svg{width:100%;height:100%}'
  + '.loot-potion{border-color:#ff7a8a}.loot-shards{border-color:#3fd4ff}.loot-bounty,.loot-xp{border-color:#f2c94c}.loot-heal{border-color:#ff5a7a}.loot-level{border-color:#6dffb0}.loot-slot{border-color:#c9a2ff}'
  + '.loot-empty{border-color:#8a6a4a}.loot-open-chest{background:url(assets/items/loot-chest.png) no-repeat center/contain;filter:grayscale(.7) brightness(.7)}';
document.head.append(lootArtStyles);

// Round 136: a relic used to stay invisible until every enemy in its room was beaten, so the
// unlock items were hard to find. Now a guarded relic is always shown, dimmed with a lock, and
// walking up to it says how many guards are left. Beating them works as before.
function relicGuards(key) { return typeof roomSpawns === 'function' ? roomSpawns(key).filter(s => spawnAvailable(s)).length : 0; }
function relicGuarded(key) {
  const r = rooms[key], q = r && r.relic; if (!q) return false;
  const owned = q[0] === 'material' ? state.cleared.includes('material') : hasRelic(q[0]);
  return !owned && relicGuards(key) > 0;
}
const renderWorldBeforeGuardedRelic = renderWorld;
renderWorld = function () {
  renderWorldBeforeGuardedRelic();
  if (!state || state.battle || !relicGuarded(state.room)) return;
  const world = $('world'), q = room().relic; if (!world || !world.append || !document.createElement) return;
  const n = relicGuards(state.room), node = document.createElement('div');
  node.className = 'relic relic-guarded'; node.textContent = q[2]; node.dataset.name = q[1] + ' · guarded';
  node.title = q[1] + ': defeat the ' + n + ' enem' + (n === 1 ? 'y' : 'ies') + ' in this area to claim it';
  node.style.left = q[3] + 'px'; node.style.top = q[4] + 'px'; world.append(node);
};
let guardedRelicWarned = null;
const checkWorldInteractionsBeforeGuardedRelic = checkWorldInteractions;
checkWorldInteractions = function () {
  checkWorldInteractionsBeforeGuardedRelic();
  if (!state || state.battle || !relicGuarded(state.room)) return;
  const q = room().relic, near = Math.hypot(state.pos.x - q[3], state.pos.y - q[4]) < 48, key = state.room + ':' + relicGuards(state.room);
  if (!near) { if (guardedRelicWarned && guardedRelicWarned.startsWith(state.room + ':')) guardedRelicWarned = null; return; }
  if (guardedRelicWarned === key) return; guardedRelicWarned = key;
  const n = relicGuards(state.room);
  toast(q[1] + ' is guarded. Defeat the ' + n + ' enem' + (n === 1 ? 'y' : 'ies') + ' in this area to claim it.');
};
const guardedRelicStyles = document.createElement('style');
guardedRelicStyles.textContent = '.relic.relic-guarded{filter:grayscale(.6) brightness(.75);opacity:.85;animation:none}.relic.relic-guarded:after{content:"🔒";position:absolute;right:-8px;bottom:-6px;font-size:11px;line-height:1;filter:none}';
document.head.append(guardedRelicStyles);

// Round 137: painted sprites for points of interest (assets/items/poi/), replacing the round
// emoji badges. Types without art yet (campfire, merchant, other worlds' lore stones) keep theirs.
const POI_ART = { nexus: 'nexus', sealed: 'sealed', cache: 'cache', shrine: 'shrine', merchant: 'merchant', campfire: 'campfire', event: 'event' }; // Round 138: merchant, campfire, event
function poiArt(p) { return p && (p.type === 'lore' ? (activeRegion === 'city' ? 'terminal' : null) : POI_ART[p.type]) || null; }
if (typeof poiNode === 'function') {
  const poiNodeBeforeArt = poiNode;
  poiNode = function (p) {
    const node = poiNodeBeforeArt(p), art = poiArt(p);
    if (art && node && node.classList) { node.classList.add('poi-art'); node.style.setProperty('--poi-art', 'url(assets/items/poi/' + art + '.webp)'); }
    return node;
  };
}
const poiArtStyles = document.createElement('style');
poiArtStyles.textContent = '.poi-node.poi-art{width:44px!important;height:44px!important;background:var(--poi-art) no-repeat center bottom/contain!important;border:0!important;border-radius:0!important;box-shadow:none!important;transform:translate(-50%,-78%)!important;filter:drop-shadow(0 0 4px #b48cff88)}'
  + '.poi-node.poi-art .poi-glyph{display:none}.poi-node.poi-art::after{top:46px!important}.poi-node.poi-art.used{filter:grayscale(.8) brightness(.7)}';
document.head.append(poiArtStyles);

// Round 138: map chests in Elaris use their own chest sprite; every other world keeps the
// original loot-chest image, and the encounter loot chest is unchanged.
const renderWorldBeforeElarisChest = renderWorld;
renderWorld = function () {
  renderWorldBeforeElarisChest();
  if (activeRegion !== 'elaris' || !document.querySelectorAll) return;
  for (const c of document.querySelectorAll('#world .map-chest')) c.classList.add('elaris-chest');
};
const elarisChestStyles = document.createElement('style');
elarisChestStyles.textContent = '.map-chest.elaris-chest{background-image:url(assets/items/poi/elaris-chest.webp)!important;width:30px!important;height:30px!important}';
document.head.append(elarisChestStyles);
