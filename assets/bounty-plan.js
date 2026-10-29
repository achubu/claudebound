'use strict';
// =====================================================================
// Round 286 (owner request): bounties you can plan for. Each patrol's bounty is decided before the fight and shown
// on its map label (★ name) and in its tooltip, so you can pick fights and decks for them. Three new kinds join the
// four from Round 76, and a completed bounty now also pays XP: +8 (regular), +15 (elite), +25 (boss).
// A spawn keeps its bounty until it is fought; then it rolls a new one (state.bountyGen).
// =====================================================================
Object.assign(BOUNTIES, {
  bareKnuckle: { name: 'Bare-knuckle', text: () => 'Win without gaining Block from a card', check: b => !b.bountyBlocked },
  combo:       { name: 'Combo', text: () => 'Play 4+ cards in one turn', check: b => (b.bountyCombo || 0) >= 4 },
  exploit:     { name: 'Exploit', text: () => 'Hit its elemental weakness twice', check: b => (b.bountyWeak || 0) >= 2 }
});
function bountyXP(b) { const base = b.enemy.boss ? 25 : b.enemy.elite ? 15 : 8; return b.enemy.level && typeof xpMultiplier === 'function' ? Math.max(1, Math.round(base * xpMultiplier(b.enemy.level))) : base; } // scaled by level gap like battle XP
function spawnBounty(s) {
  if (!s || !state) return null;
  const ids = Object.keys(BOUNTIES).filter(id => id !== 'exploit' || s.element), gen = (state.bountyGen || {})[s.uid] || 0;
  return ids[hashSeed(state.seed + ':bounty:' + s.uid + ':' + gen) % ids.length];
}
function bountyFailed(b) {
  return (b.bounty === 'swift' && b.turn > bountyTurns(b)) || (b.bounty === 'untouched' && b.bountyHurt) || (b.bounty === 'selfReliant' && b.bountySide) || (b.bounty === 'bareKnuckle' && b.bountyBlocked);
}
function bountyMet(b) { return ['overkill', 'combo', 'exploit'].includes(b.bounty) && !!BOUNTIES[b.bounty].check(b); }
// The fight takes the spawn's bounty (instead of a random one).
const startBattleBeforePlannedBounty = startBattle;
startBattle = function (spawnId) {
  const r = startBattleBeforePlannedBounty.apply(this, arguments), b = state && state.battle;
  if (!b || b.phase !== 'fight' || b.bountyPlanned) return r;
  const s = roomSpawns(state.room).find(x => x.uid === spawnId); const id = spawnBounty(s);
  if (id) { b.bounty = id; b.bountyPlanned = true; b.bountyBlocked = false; b.bountyCombo = 0; b.bountyWeak = 0; save(); renderBattle(); }
  return r;
};
const playCardBeforePlannedBounty = playCard;
playCard = function (i) {
  const b = state && state.battle; if (!b || b.phase !== 'fight') return playCardBeforePlannedBounty.apply(this, arguments);
  const n = b.hand.length, block = b.block || 0, logs = (b.logs || []).length;
  const r = playCardBeforePlannedBounty.apply(this, arguments);
  if (state.battle !== b || b.hand.length >= n) return r;
  if ((b.block || 0) > block) b.bountyBlocked = true;
  if (b.bountyComboTurn !== b.turn) { b.bountyComboTurn = b.turn; b.bountyComboNow = 0; }
  b.bountyComboNow++; b.bountyCombo = Math.max(b.bountyCombo || 0, b.bountyComboNow);
  if ((b.logs || []).slice(logs).some(l => /Elemental weakness/.test(l))) b.bountyWeak = (b.bountyWeak || 0) + 1;
  return r;
};
// A completed bounty also pays XP; the spawn rolls a new bounty for next time.
const winBattleBeforePlannedBounty = winBattle;
winBattle = function () {
  const b = state && state.battle; if (!b || b.phase !== 'fight') return winBattleBeforePlannedBounty.apply(this, arguments);
  const r = winBattleBeforePlannedBounty.apply(this, arguments);
  if (b.spawnId) { state.bountyGen = state.bountyGen || {}; state.bountyGen[b.spawnId] = (state.bountyGen[b.spawnId] || 0) + 1; }
  if (b.bountyPaid > 0 && !b.bountyXP) {
    b.bountyXP = bountyXP(b); gainXP(b.bountyXP);
    if (Array.isArray(b.special)) { const k = b.special.findIndex(x => /Bounty complete/.test(x)); if (k >= 0) b.special[k] = b.special[k].replace(/\.$/, '') + ' and +' + b.bountyXP + ' XP.'; }
  }
  save(); return r;
};
// The chip in the fight, redrawn so every kind shows met / missed.
const renderBattleBeforePlannedBounty = renderBattle;
renderBattle = function () {
  renderBattleBeforePlannedBounty.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || !b.bounty || typeof document === 'undefined' || !document.querySelector) return;
  const chip = document.querySelector('#battleModal .bounty-chip'), def = BOUNTIES[b.bounty]; if (!chip || !def) return;
  const failed = bountyFailed(b), met = bountyMet(b);
  chip.className = 'bounty-chip' + (failed ? ' failed' : met ? ' met' : '');
  chip.title = 'Bounty: ' + def.text(b) + ' for +' + bountyReward(b) + ' Shards and +' + bountyXP(b) + ' XP.';
  chip.innerHTML = (failed ? '☆' : '★') + ' <b>' + def.name + '</b> · ◇' + bountyReward(b) + ' +' + bountyXP(b) + 'XP' + (failed ? ' · missed' : met ? ' · done' : '');
};
// On the map: the bounty in the patrol's name label and tooltip.
function bountyLabel(s) {
  const id = s && spawnBounty(s), def = id && BOUNTIES[id]; if (!def) return null;
  const fake = { enemy: { boss: !!s.boss, elite: !!s.elite } };
  return { name: ' ·★' + def.name, tip: 'Bounty: ' + def.text(fake) + ' (+' + bountyReward(fake) + ' Shards, +' + bountyXP(fake) + ' XP)' };
}
const renderWorldBeforePlannedBounty = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforePlannedBounty.apply(this, arguments);
  if (!state || typeof document === 'undefined' || !document.querySelectorAll) return out;
  const spawns = roomSpawns(state.room);
  for (const node of document.querySelectorAll('#world .enemy-node[data-spawn]')) {
    const l = bountyLabel(spawns.find(x => x.uid === node.dataset.spawn)); if (!l || (node.dataset.name || '').includes(l.name)) continue;
    node.dataset.name = (node.dataset.name || '') + l.name; node.title = l.tip;
  }
  return out;
};
