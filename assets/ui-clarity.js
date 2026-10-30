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
// Gear screen: the Aetherlink Gauntlet lives here now.
const showGearBeforeClarity = showGear;
showGear = function () {
  const out = showGearBeforeClarity.apply(this, arguments);
  const close = typeof $ === 'function' && $('gearClose');
  if (close && close.before && !$('gearDeviceBtn')) {
    const b = document.createElement('button'); b.id = 'gearDeviceBtn'; b.textContent = '⌚ Aetherlink Gauntlet'; b.title = 'Socket crystals into your wrist device';
    b.onclick = () => showDevice(); close.before(b); close.before(document.createTextNode(' '));
  }
  return out;
};
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
  if (end && end.classList) { const idle = uiNothingPlayable(b); end.classList.toggle('end-turn-ready', idle); end.title = idle ? 'Nothing left to play: end your turn' : 'End your turn'; }
  return out;
};
// World: the movement hint goes once you have found your feet.
const renderWorldBeforeClarity = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeClarity.apply(this, arguments);
  if (typeof document !== 'undefined' && document.body && document.body.classList && state) document.body.classList.toggle('hint-learned', (state.visited || []).length >= 3);
  return out;
};
uiTidyNav();
