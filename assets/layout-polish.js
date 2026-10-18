'use strict';
// =====================================================================
// Round 187: layout fixes from the playtest (styles in layout-polish.css).
//  - Phones: the room fills the screen between the HUD and the controls, instead of
//    sitting in the top half with a black band below it; the HUD no longer covers it.
//  - Desktop: the room sits below the top menu row, so the menu never covers the north
//    exit label. "Art credits" moves into the main menu.
//  - Phones in battle: the side deck folds into one row above the hand (tap to open), and
//    the enemy-move boxes are shorter (tap a box to read the rest).
// =====================================================================
const PHONE_WIDTH = 720, PHONE_CONTROLS = 150, PHONE_MIN_ROOM_WIDTH = 380;
let worldTopCache = null;
function phoneLayout() { return innerWidth <= PHONE_WIDTH; }
// Where the room may start: just below the HUD and the menu buttons (measured, then cached
// until the HUD redraws or the window changes size).
function worldTopEdge() {
  if (worldTopCache && worldTopCache.w === innerWidth && worldTopCache.h === innerHeight) return worldTopCache.top;
  const hud = $('hud'), nav = $('nav');
  const bottom = el => el && el.getBoundingClientRect ? el.getBoundingClientRect().bottom || 0 : 0;
  const top = Math.ceil(Math.max(phoneLayout() ? bottom(hud) : 0, bottom(nav))) + 6;
  worldTopCache = { w: innerWidth, h: innerHeight, top };
  return top;
}
function worldViewport() {
  const top = worldTopEdge();
  if (phoneLayout()) {
    const room = Math.max(250, innerHeight - top - PHONE_CONTROLS);
    const scale = Math.max(innerWidth / 480, Math.min(innerWidth / PHONE_MIN_ROOM_WIDTH, room / 500));
    return { scale, viewWidth: innerWidth / scale, viewHeight: Math.min(500, room / scale), left: 0, top };
  }
  const scale = Math.min(innerWidth / 800, (innerHeight - top - 6) / 500);
  return { scale, viewWidth: 800, viewHeight: 500, left: (innerWidth - 800 * scale) / 2, top: top + Math.max(0, (innerHeight - top - 6 - 500 * scale) / 2) };
}
updateAreaCamera = function () {
  if (!state) return;
  const area = joinedArea(), offset = cellOffset(state.room, area), v = worldViewport();
  const camera = cameraPosition(area, { x: offset.x + state.pos.x, y: offset.y + state.pos.y }, v.viewWidth, v.viewHeight);
  const world = $('world');
  world.style.width = area.width + 'px'; world.style.height = area.height + 'px';
  world.style.left = v.left + 'px'; world.style.top = v.top + 'px'; world.style.transformOrigin = '0 0';
  world.style.transform = 'scale(' + v.scale + ') translate(' + (-camera.x) + 'px,' + (-camera.y) + 'px)';
  // On short phones only part of the room fits: clip the rest so it never draws under the HUD or the controls.
  world.style.clipPath = v.viewHeight < area.height ? 'inset(' + camera.y + 'px 0 ' + Math.max(0, area.height - camera.y - v.viewHeight) + 'px 0)' : '';
  const player = $('player'); if (player) { player.style.left = (offset.x + state.pos.x) + 'px'; player.style.top = (offset.y + state.pos.y) + 'px'; }
};
const renderHUDBeforeLayout = renderHUD;
renderHUD = function () {
  const r = renderHUDBeforeLayout.apply(this, arguments);
  const before = worldTopCache && worldTopCache.top; worldTopCache = null;
  if (state && worldTopEdge() !== before) updateAreaCamera();
  return r;
};
if (typeof addEventListener === 'function') addEventListener('resize', () => { worldTopCache = null; });
// The menu row can wrap after more buttons are added: re-measure whenever the HUD or the menu changes size.
if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => { worldTopCache = null; if (state && !state.battle) updateAreaCamera(); }); for (const id of ['hud', 'nav']) { const el = $(id); if (el && el.nodeType) ro.observe(el); } }

// Art credits: in the main menu instead of the top row.
const showMainMenuBeforeLayout = showMainMenu;
showMainMenu = function () {
  showMainMenuBeforeLayout.apply(this, arguments);
  const m = $('menuModal'); if (!m || !m.append || m.querySelector('.menu-credits')) return;
  const p = document.createElement('p'); p.className = 'menu-credits';
  p.innerHTML = '<a href="assets/environment/credits.html" target="_blank" rel="noopener">Art credits</a>';
  m.append(p);
};

// Battle on phones: fold the side deck, shorten the enemy-move boxes.
const renderBattleBeforeLayout = renderBattle;
renderBattle = function () {
  renderBattleBeforeLayout.apply(this, arguments);
  const b = state && state.battle, m = $('battleModal'); if (!b || !m || !m.querySelector) return;
  const col = m.querySelector('.side-column'), head = col && col.querySelector('.side-col-head');
  if (col && head) {
    col.classList.add('foldable'); col.classList.toggle('open', !!b.sideOpen);
    head.setAttribute('role', 'button'); head.tabIndex = 0; head.setAttribute('aria-expanded', b.sideOpen ? 'true' : 'false');
    if (!head.querySelector('.side-fold')) { const t = document.createElement('span'); t.className = 'side-fold'; t.textContent = b.sideOpen ? 'Hide' : 'Show'; head.append(t); }
    head.onclick = () => { if (!phoneLayout()) return; b.sideOpen = !b.sideOpen; renderBattle(); };
  }
  m.querySelectorAll('.intent-bubble').forEach(el => {
    el.classList.toggle('expanded', !!(b.intentOpen && b.intentOpen[el.classList.contains('later') ? 'later' : 'now']));
    el.onclick = () => { if (!phoneLayout()) return; const k = el.classList.contains('later') ? 'later' : 'now'; b.intentOpen ||= {}; b.intentOpen[k] = !b.intentOpen[k]; el.classList.toggle('expanded', b.intentOpen[k]); };
  });
};
