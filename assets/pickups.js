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

// In the world: hidden crystal chests and the Memory Annex crystal.
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
