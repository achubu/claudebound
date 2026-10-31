'use strict';
// =====================================================================
// Round 292 (owner request): a simpler, clearer interface.
// - The top bar keeps six buttons: Map, Deck, Character, Gear, Quests, Menu. The journey already saves itself, so
//   "Save now" moved into the Menu; the Aetherlink Gauntlet (a wrist device) opens from the Gear screen.
// - In battle, End turn glows when nothing in your hand or side deck can be played, so the next step is obvious.
// - The "Your hand" heading, the in-battle level/XP pill on phones and the movement hint (once you have found your
//   feet: three rooms visited) are gone; the screens keep only what you act on.
// =====================================================================
function uiNavButton(text) { const nav = typeof $ === 'function' && $('nav'); return nav && nav.querySelectorAll ? [...nav.querySelectorAll('button')].find(b => b.textContent.trim() === text) : null; }
function uiTidyNav() {
  for (const b of [typeof $ === 'function' && $('saveBtn'), uiNavButton('Aetherlink')]) if (b && b.classList) b.classList.add('nav-folded');
  const menu = uiNavButton('Menu'); if (menu) menu.onclick = () => showMainMenu(); // call the current menu (later files wrap it)
}
// Menu: Save now, with a note that saving is automatic.
const showMainMenuBeforeClarity = showMainMenu;
showMainMenu = function () {
  const out = showMainMenuBeforeClarity.apply(this, arguments);
  const modal = typeof $ === 'function' && $('menuModal'), back = $('backToGame');
  if (modal && back && back.before && !$('saveNowBtn')) {
    const row = document.createElement('p'); row.className = 'save-now-row';
    row.innerHTML = '<button id="saveNowBtn" class="primary">💾 Save now</button> <span class="muted">Your journey also saves by itself as you play.</span>';
    back.parentElement.before(row);
    $('saveNowBtn').onclick = () => { save(); toast('Journey saved in this browser.'); };
  }
  return out;
};
// Gear screen: the Aetherlink Gauntlet lives inside it (Round 295, at the end of this file).
// Battle: End turn glows when there is nothing left to play.
function uiNothingPlayable(b) {
  if (!b || b.phase !== 'fight') return false;
  const handPlayable = (b.hand || []).some(c => { const d = stat(c); return d && !d.unplayable && !d.rooted && (d.cost || 0) <= (b.energy || 0); });
  const sidePlayable = typeof sideAvailable === 'function' && typeof sideAetherCost === 'function' ? sideAvailable(b).some(c => (b.aether || 0) >= sideAetherCost(c.id) && (typeof sideUsable !== 'function' || sideUsable(b, c.id))) : false; // as the side deck's "N playable" count
  return !handPlayable && !sidePlayable;
}
const renderBattleBeforeClarity = renderBattle;
renderBattle = function () {
  const out = renderBattleBeforeClarity.apply(this, arguments);
  const b = state && state.battle, end = typeof $ === 'function' && $('endTurn');
  const bar = typeof document !== 'undefined' && document.querySelector && document.querySelector('#battleModal .compact-bar');
  if (bar && bar.children) for (const el of bar.children) if (el.classList && /^Lv \d/.test((el.textContent || '').trim())) el.classList.add('xp-pill');
  uiFoldEncounterBar();
  if (end && end.classList) { const idle = uiNothingPlayable(b); end.classList.toggle('end-turn-ready', idle); end.title = idle ? 'Nothing left to play: end your turn' : 'End your turn'; }
  return out;
};
// Battle (Round 293): the top bar only repeated the enemy's name. Its element badge moves into the enemy panel beside
// the name, and the bar folds away when nothing else is left in it.
function uiFoldEncounterBar() {
  if (typeof document === 'undefined' || !document.querySelector) return;
  const bar = document.querySelector('#battleModal .combat-tools.with-encounter'), head = document.querySelector('#battleModal .compact-side.enemy .compact-head');
  if (!bar || !head || !bar.querySelectorAll) return;
  // On a phone the enemy panel is narrow: the badge shrinks to its icon at the end of the name line (its bubble still explains it).
  const narrow = typeof innerWidth === 'number' && innerWidth <= 560, name = head.querySelector('b');
  const list = x => { try { return Array.from(x || []); } catch (e) { return []; } }; // the test harness's stand-in DOM has no real node lists
  for (const el of list(bar.querySelectorAll('.fx-el'))) {
    el.classList.add('fx-el-moved');
    if (narrow && name) { for (const chip of list(el.querySelectorAll('.fx-chip'))) { chip.textContent = (chip.textContent || '').trim().split(/\s+/)[0]; chip.classList.add('icon-only'); } name.append(el); }
    else head.append(el);
  }
  const rest = list(bar.childNodes).filter(n => !(n.classList && n.classList.contains('encounter-line')) && (n.textContent || '').trim());
  if (bar.classList) bar.classList.toggle('bar-folded', !rest.length);
}
// World: the movement hint goes once you have found your feet.
const renderWorldBeforeClarity = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeClarity.apply(this, arguments);
  if (typeof document !== 'undefined' && document.body && document.body.classList && state) document.body.classList.toggle('hint-learned', (state.visited || []).length >= 3);
  return out;
};
uiTidyNav();
// Round 294 (owner: nicer, friendlier menus; a shorter Character page).
// Every top-bar screen gets a ✕ in its top-right corner (Escape already closes menus), so a long screen can be
// closed without scrolling to its bottom.
function uiAddCloseX() {
  const modal = typeof $ === 'function' && $('menuModal'); if (!modal || !modal.prepend || (modal.querySelector && modal.querySelector('.menu-x'))) return;
  const x = document.createElement('button'); x.className = 'menu-x'; x.type = 'button'; x.title = 'Close (Esc)'; x.setAttribute('aria-label', 'Close'); x.textContent = '✕';
  x.onclick = () => closeMenu();
  const pin = document.createElement('div'); pin.className = 'menu-x-pin'; pin.append(x); modal.prepend(pin); // a zero-height sticky holder: the ✕ stays top-right while you scroll and takes no room
}
// The Character page has no portrait (Round 295, owner: "we don't need it"); the name and level head the page.
function uiCharacterHero() {
  const modal = typeof $ === 'function' && $('menuModal'); if (!modal || !modal.querySelector) return;
  const img = modal.querySelector('.sheet-portrait'); if (img && img.remove) img.remove();
}
// Deck: the greyed-out notice buttons under each card ("Locked · 0/50 uses", "Soulbound protected", "Auto-upgrade · 0/100
// uses") repeat what the card itself shows, so only buttons you can press stay (a greyed "+ Add" still says the deck is full).
function uiTidyDeck() {
  const modal = typeof $ === 'function' && $('menuModal'); if (!modal || !modal.querySelectorAll) return;
  for (const b of modal.querySelectorAll('.workshop .card-wrap .actions button')) if (b.disabled && !/^\+\s*Add/.test((b.textContent || '').trim())) b.classList.add('info-only');
}
for (const name of ['showMap', 'showDeck', 'showCharacter', 'showGear', 'showQuests', 'showMainMenu', 'showDevice']) {
  const before = globalThis[name]; if (typeof before !== 'function') continue;
  globalThis[name] = function () { const out = before.apply(this, arguments); try { if (name === 'showDeck') uiTidyDeck(); if (name === 'showCharacter') { uiCharacterHero(); if (typeof renderTalentConnectors === 'function') renderTalentConnectors(); /* the tree moved up: redraw its lines */ } uiAddCloseX(); } catch (e) { /* cosmetic only */ } return out; };
}
// Round 295 (owner: "Where is the aether link? Let's combine it with gear"): the Aetherlink Gauntlet is a section of the
// Gear screen. Its own screen is drawn as before (gauntlet painting, sockets wired to installCrystal), then moved into
// Gear; anything that used to open it (including socketing a crystal) shows the Gear screen, keeping your place.
const showDeviceAlone = showDevice, showGearAlone = showGear;
function uiEmbedDevice() {
  const modal = typeof $ === 'function' && $('menuModal'); if (!modal || !modal.replaceChildren || !modal.childNodes) return;
  const gearNodes = Array.from(modal.childNodes);
  showDeviceAlone();
  const dev = Array.from(modal.childNodes).filter(n => !(n.classList && (n.classList.contains('menu-x-pin') || n.classList.contains('eyebrow'))));
  modal.replaceChildren(...gearNodes);
  const section = document.createElement('section'); section.className = 'gear-aetherlink'; section.id = 'gearAetherlink';
  for (const n of dev) {
    if (n.querySelector && n.querySelector('#deviceClose')) { n.querySelector('#deviceClose').remove(); if (!(n.textContent || '').trim()) continue; }
    if (n.tagName === 'H1') { const h = document.createElement('h2'); h.textContent = '⌚ ' + n.textContent; section.append(h); continue; }
    section.append(n);
  }
  const stray = section.querySelector && section.querySelector('#deviceClose'); if (stray) { const holder = stray.parentElement; stray.remove(); if (holder && holder !== section && !(holder.textContent || '').trim()) holder.remove(); } // its own Return button: Gear has Close
  const close = $('gearClose'), at = close && close.closest ? close.closest('p') : null;
  if (at && at.before) at.before(section); else modal.append(section);
}
showGear = function () {
  const modal = typeof $ === 'function' && $('menuModal'), keep = modal && modal.querySelector && modal.querySelector('.gear-aetherlink') ? modal.scrollTop : null;
  const out = showGearAlone.apply(this, arguments);
  try { uiEmbedDevice(); } catch (e) { /* the test harness has no real DOM */ }
  if (keep != null && modal) modal.scrollTop = keep;
  return out;
};
showDevice = function () { return showGear(); };
// Round 296 (owner: "We don't need all the extra character info there either, just break down ability boosts from talents
// and gear, damage, armor penetration, health, armor, etc"). The Character page's four boxes become one table: each stat,
// its total, and where it comes from (base, level, talents, gear, Aetherlink, world).
function uiStatRows() {
  const g = typeof gearStat === 'function' ? gearStat : () => 0, dev = typeof deviceBonus === 'function' ? deviceBonus : () => 0, r = id => talentRank(id);
  const steps = typeof TALENT_STEPS !== 'undefined' ? TALENT_STEPS[Math.min(5, r('plating'))] || 0 : 0, armor = scaledRank('plating');
  const hpKnown = 30 + (state.playerLevel - 1) + r('vitality') * 2 + g('health');
  const crit = r('critical') * 3 + r('lethal') * 4, tm = typeof talentMatrix === 'object' ? talentMatrix : null;
  return [
    ['❤', 'Max health', state.maxHp, [['Base', 30], ['Levels', state.playerLevel - 1], ['Talents', r('vitality') * 2], ['Gear', g('health')], ['Other', state.maxHp - hpKnown]]],
    ['🛡', 'Armor', armor, [['Talents', steps], ['Gear', g('armor')], ['World', armor - steps - g('armor')]], 'Every enemy hit deals this much less.'],
    ['⚔', 'Attack damage', attackBonus() + g('attack') + dev('assault'), [['Talents', attackBonus()], ['Gear', g('attack')], ['Aetherlink', dev('assault')]], 'Added to every attack card.'],
    ['✦', 'Elemental damage', 3 * r('attunement') + g('elemental'), [['Talents', 3 * r('attunement')], ['Gear', g('elemental')]], 'Extra on fire, earth, air, water, ice and lightning attacks.'],
    ['⛏', 'Armor pierce', 2 * r('sunder') + g('pierce'), [['Talents', 2 * r('sunder')], ['Gear', g('pierce')]], 'Enemy Armor your hits ignore.'],
    ['◈', 'Block bonus', 2 * r('bulwark') + dev('aegis'), [['Talents', 2 * r('bulwark')], ['Aetherlink', dev('aegis')]], 'Added to Defense cards.'],
    ['✧', 'Critical chance', crit + '%', [['Talents', crit ? crit + '%' : 0]], 'Critical hits deal ×' + (tm ? Math.round(tm.critMultiplier() * 100) / 100 : 2) + ' damage.'],
    ['◎', 'Weakness bonus', '×' + (tm ? Math.round(tm.weaknessMultiplier() * 100) / 100 : 1.5), [], 'Damage when you hit an enemy\'s elemental weakness.'],
    ['⚡', 'Energy', maxEnergy(), [['Base', 3], ['Talents', maxEnergy() - 3]]],
    ['🂠', 'Opening hand', openingHand(), [['Base', 4], ['Talents', openingHand() - 4]]],
    ['▤', 'Deck size', maxDeckSize() + ' · ' + maxCopies() + ' copies', [], 'Bosses, talents and Capacity crystals raise it.'],
    ['⚗', 'Potion heal', potionHeal(), [['Base', 5], ['Talents', potionHeal() - 5]], 'Potions: ' + state.potions + '.']
  ];
}
function uiStatsHTML() {
  const part = ([k, v]) => (v && v !== '0%' ? '<span class="src src-' + k.toLowerCase() + '">' + k + ' ' + (typeof v === 'number' ? (v > 0 && k !== 'Base' ? '+' : '') + v : v) + '</span>' : '');
  const rows = uiStatRows().map(([icon, name, total, parts, note]) => '<tr><th><span class="st-icon">' + icon + '</span>' + name + '</th><td class="st-total">' + total + '</td><td class="st-from">' + (parts.map(part).join('') || '') + (note ? '<small>' + note + '</small>' : '') + '</td></tr>').join('');
  const rules = typeof GEAR_RULES === 'object' ? wornGear().filter(id => GEAR_RULES[id]).map(id => '<li>' + GEAR_RULES[id].icon + ' <b>' + GEAR_RULES[id].name + '</b> (' + GEAR[id].name + '): ' + GEAR_RULES[id].desc + '</li>').join('') : '';
  const atCap = state.playerLevel >= MAX_PLAYER_LEVEL;
  return '<div class="char-xp"><span>' + (atCap ? 'Maximum level' : state.xp + '/100 XP to level ' + (state.playerLevel + 1)) + '</span><div class="track"><span style="width:' + (atCap ? 100 : state.xp) + '%"></span></div></div>'
    + '<table class="char-stats"><tbody>' + rows + '</tbody></table>'
    + (rules ? '<div class="char-rules"><b>Gear rules in effect</b><ul>' + rules + '</ul></div>' : '');
}
function uiCharacterStats() {
  const modal = typeof $ === 'function' && $('menuModal'); if (!modal || !modal.querySelector) return;
  const grid = modal.querySelector('.sheet-grid'); if (!grid || !grid.replaceWith) return;
  const box = document.createElement('div'); box.className = 'char-stats-panel'; box.innerHTML = uiStatsHTML(); grid.replaceWith(box);
  for (const p of modal.querySelectorAll('p.notice')) if (/^Aetherlink:/.test(p.textContent || '')) p.remove(); // its crit and HP notes are in the table now
}
const showCharacterBeforeStats = showCharacter;
showCharacter = function () {
  const out = showCharacterBeforeStats.apply(this, arguments);
  try { uiCharacterStats(); if (typeof renderTalentConnectors === 'function') renderTalentConnectors(); } catch (e) { /* cosmetic only */ }
  return out;
};
// Round 296 (owner: "Quests can have exploration percentage details and objects found"): each world's quest log shows how
// much of it you have explored and what you have found there.
function uiExplorationHTML(world) {
  if (world !== activeRegion) {
    const seen = ((state.regionVisits || {})[world] || []).length, done = state.poi && (state.poi.completed || []).includes(world);
    return '<div class="quest-explore"><b>🗺 Exploration</b><span>' + (done ? '100% explored' : seen + ' room' + (seen === 1 ? '' : 's') + ' visited') + '</span><small>Details show while you are in this world.</small></div>';
  }
  const keys = Object.keys(rooms), discovered = state.visited.filter(k => rooms[k]).length;
  const chests = keys.map(chestFor).filter(Boolean), chestsFound = chests.filter(c => state.chests.includes(c.id)).length;
  const relics = Object.values(rooms).filter(r => r.relic && r.relic[0] !== 'material'), relicsFound = relics.filter(r => state.relics.includes(r.relic[0])).length;
  const pois = Object.values(worldPOIs()), poiSeen = pois.filter(p => areaSeen(p.key)).length, poiUsedN = pois.filter(poiUsed).length;
  const lore = (state.poi.lore || []).filter(id => id.startsWith(activeRegion + ':')).length;
  const nexus = typeof nexusList === 'function' ? nexusList().filter(n => n.region === activeRegion).length : 0;
  const pct = worldCompletion(), row = (icon, label, a, b) => '<li><span>' + icon + ' ' + label + '</span><b>' + a + (b != null ? '/' + b : '') + '</b></li>';
  return '<div class="quest-explore"><b>🗺 Exploration · ' + pct + '%</b><div class="track"><span style="width:' + pct + '%"></span></div><ul>'
    + row('🚪', 'Rooms explored', discovered, keys.length) + row('🎁', 'Hidden chests', chestsFound, chests.length) + (relics.length ? row('🧤', 'Gear and relics', relicsFound, relics.length) : '')
    + row('⛩', 'Points of interest found', poiSeen, pois.length) + row('✔', 'Points of interest used', poiUsedN, pois.length) + row('📜', 'Lore read', lore, typeof LORE_PER_WORLD !== 'undefined' ? LORE_PER_WORLD : null) + row('⟟', 'Nexus Waypoints', nexus, 2)
    + '</ul><small>' + (pct >= 100 ? 'Fully explored: the +' + (typeof COMPLETION_SHARDS !== 'undefined' ? COMPLETION_SHARDS : 35) + ' Shards reward is yours.' : 'Find every room, hidden chest and relic for +' + (typeof COMPLETION_SHARDS !== 'undefined' ? COMPLETION_SHARDS : 35) + ' Shards.') + '</small></div>';
}
const showQuestsBeforeExplore = showQuests;
showQuests = function (world = activeRegion) {
  const out = showQuestsBeforeExplore.apply(this, arguments);
  try {
    const modal = $('menuModal'), close = $('questsClose'), at = close && close.closest ? close.closest('p') : null;
    if (modal && at && at.before && !modal.querySelector('.quest-explore')) { const d = document.createElement('div'); d.innerHTML = uiExplorationHTML(world); at.before(d.firstChild); }
    uiAddCloseX();
  } catch (e) { /* cosmetic only */ }
  return out;
};
