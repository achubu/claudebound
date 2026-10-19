'use strict';
// =====================================================================
// Round 198: God Mode, for trying things out.
// - Nothing is saved: entering saves the journey where it stands, then nothing in God Mode is
//   written anywhere (the game's save and material keys ignore writes, export and import are
//   off). Leaving God Mode, or reloading the page, rolls back to that last save.
// - Playing any card (hand or side deck) wins the fight at once.
// - Every Nexus Waypoint in every world is unlocked, and every map is fully revealed.
// =====================================================================
const GOD_KEYS = ['aethercede-expansion-v3', 'aethercede-upgrade-materials-v2', 'aethercede-integrated-v2'];
let godSession = false;
if (typeof Storage !== 'undefined' && Storage.prototype) {
  const set = Storage.prototype.setItem, del = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) { if (godSession && GOD_KEYS.includes(k)) return; return set.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (godSession && GOD_KEYS.includes(k)) return; return del.call(this, k); };
}
function godModeOn() { return godSession; }

// Unlock every waypoint and reveal every room, in every world.
function godFill() {
  if (!godSession || !state) return;
  state.godMode = true;
  state.poi = state.poi || {}; if (!Array.isArray(state.poi.nexus)) state.poi.nexus = [];
  for (const [region, nx] of Object.entries(NEXUS_POINTS)) for (const key of [nx.start, nx.mid]) {
    const id = nexusId(region, key); if (key && !state.poi.nexus.includes(id)) state.poi.nexus.push(id);
  }
  state.regionVisits = state.regionVisits || {};
  for (const region of WORLD_ORDER) {
    let all = []; try { all = regionRoomKeys(region) || []; } catch (e) { continue; }
    const list = state.regionVisits[region] = Array.isArray(state.regionVisits[region]) ? state.regionVisits[region] : [];
    for (const k of all) if (!list.includes(k)) list.push(k);
  }
  if (state.regionVisits[state.region]) {
    for (const k of state.visited || []) if (!state.regionVisits[state.region].includes(k)) state.regionVisits[state.region].push(k);
    state.visited = state.regionVisits[state.region];
  }
}
const saveBeforeGod = save;
save = function () { if (godSession) { godFill(); return; } return saveBeforeGod.apply(this, arguments); };

// Any card wins.
function godWin() {
  const b = state && state.battle; if (!godSession || !b || b.phase !== 'fight') return false;
  b.enemy.hp = 0; b.logs.push('⚡ God Mode: ' + b.enemy.name + ' falls.');
  winBattle(); save(); renderBattle();
  return true;
}
const playCardBeforeGod = playCard;
playCard = function () { return godWin() || playCardBeforeGod.apply(this, arguments); };
if (typeof playSideCard === 'function') {
  const playSideCardBeforeGod = playSideCard;
  playSideCard = function () { return godWin() || playSideCardBeforeGod.apply(this, arguments); };
}
// Cards you couldn't afford are greyed out and can't be clicked; in God Mode they all can.
const cardElementBeforeGod = cardElement;
cardElement = function (c, fn, disabled) {
  const fight = godSession && state && state.battle && state.battle.phase === 'fight';
  return cardElementBeforeGod.call(this, c, fn, fight ? false : disabled, ...[].slice.call(arguments, 3));
};

// No save files in or out of God Mode.
const exportSaveBeforeGod = exportSave;
exportSave = function () { if (godSession) return toast('Saving is off in God Mode.'); return exportSaveBeforeGod.apply(this, arguments); };
const importSaveBeforeGod = importSave;
importSave = function () { if (godSession) return toast('Leave God Mode to import a save.'); return importSaveBeforeGod.apply(this, arguments); };

function enterGodMode() {
  if (godSession) return;
  if (state && state.battle) return toast('Finish this encounter first.');
  if (state) save(); // the journey is saved where it stands; God Mode rolls back to this
  godSession = true; markGodMode();
  if (!state) newGame(); // from the start screen: a fresh journey, kept in memory only
  godFill(); renderWorld();
  if (typeof closeMenu === 'function') closeMenu();
  toast('⚡ God Mode: any card wins, every waypoint is open and every map is revealed. Nothing is saved; leaving rolls back to your last save.');
}
function leaveGodMode() {
  if (!godSession) return;
  if (state && state.battle) return toast('Finish this encounter first.');
  // Reloading starts from the last save, made just before God Mode began.
  if (typeof location !== 'undefined' && location.reload) location.reload();
}
function markGodMode() {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.body.classList) document.body.classList.toggle('god-mode', godSession);
  let badge = document.getElementById('godBadge');
  if (godSession && !badge && document.createElement) {
    badge = document.createElement('div'); badge.id = 'godBadge'; badge.textContent = '⚡ GOD MODE';
    badge.title = 'Any card wins, all waypoints open, all maps revealed. Nothing is saved.';
    document.body.append(badge);
  }
}

// The main menu: enter or leave God Mode.
const showMainMenuBeforeGod = showMainMenu;
showMainMenu = function () {
  showMainMenuBeforeGod.apply(this, arguments);
  const m = $('menuModal'); if (!m || !m.append || !document.createElement) return;
  const box = document.createElement('div'); box.className = 'god-menu';
  box.innerHTML = godSession
    ? '<p><b>⚡ God Mode is on.</b> Nothing is being saved. Leaving rolls back to your journey as it was before God Mode.</p><button id="leaveGod">Leave God Mode</button>'
    : '<p><b>⚡ God Mode</b>: any card wins the fight, every Nexus Waypoint is open and every map is revealed. Nothing in God Mode is saved: leaving it (or reloading) rolls back to your journey as it is now.</p><button id="enterGod">Enter God Mode</button>';
  m.append(box);
  const enter = $('enterGod'), leave = $('leaveGod');
  if (enter) enter.onclick = enterGodMode;
  if (leave) leave.onclick = leaveGodMode;
};
// The start screen too, so God Mode is one click from a fresh page.
if (typeof document !== 'undefined' && document.getElementById) {
  const start = document.getElementById('startOverlay'), sec = start && start.querySelector && start.querySelector('section');
  if (sec && sec.append && document.createElement) {
    const b = document.createElement('button'); b.id = 'godStartBtn'; b.textContent = '⚡ God Mode'; b.title = 'Try the game with every fight won; nothing is saved';
    b.onclick = enterGodMode; sec.append(b);
  }
  const st = document.createElement('style');
  st.textContent = '#godBadge{position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:60;padding:3px 12px;border-radius:999px;background:#2a1d00e6;border:1px solid #ffd24a;color:#ffe48a;font:700 12px system-ui;letter-spacing:.08em;pointer-events:none;box-shadow:0 0 12px #ffd24a66}'
    + '.god-menu{margin-top:12px;padding:10px 12px;border:1px solid #ffd24a66;border-radius:10px;background:#ffd24a0f}.god-menu p{margin:0 0 8px;font:13px/1.4 system-ui}#godStartBtn{border-color:#ffd24a;color:#ffe48a}';
  if (document.head && document.head.append) document.head.append(st);
}
