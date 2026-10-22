'use strict';
// =====================================================================
// Round 237: 🌪 SHEAR. The Sky Isles fight back against turtling (owner request: a Plating-and-Block
// build found them harmless and slow; the simulator agreed, with fights of 8-14 turns at no HP lost).
// Every SKY_STORM.shearEvery-th turn's attack in the Sky Isles (the Zenith Roc's every
// shearEveryBoss-th) is a shearing gust that ignores your Armor (Reactive Plating). Block from cards
// still stops it, so the intent tells you when to raise it. The stronger damage-over-time afflictions
// that come with it are in status-dots.js.
// The outermost endTurn sets a flag while the turn resolves; every endTurn wrapper reads Plating
// through scaledRank, which then returns 0. Loaded late (after cycle-card) so its endTurn wraps the others.
// =====================================================================
const SKY_STORM = { shearEvery: 3, shearEveryBoss: 3 };
function skyStormOn(b = state && state.battle) { return !!(b && activeRegion === 'sky' && b.enemy && !globalThis.NO_SKY_STORM); } // NO_SKY_STORM: the simulator's off switch, for comparisons
function shearTurn(b, turn) {
  if (!skyStormOn(b)) return false;
  const boss = b.enemy.boss && !b.enemy.miniBoss;
  return turn % (boss ? SKY_STORM.shearEveryBoss : SKY_STORM.shearEvery) === 0;
}

const enemyPlanBeforeStorm = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeStorm(b, turn);
  if (!plan || !(plan.damage > 0) || !shearTurn(b, turn)) return plan;
  return { ...plan, shear: true, name: '🌪 Shearing ' + plan.name.replace(/^./, ch => ch.toLowerCase()) };
};
const scaledRankBeforeStorm = scaledRank;
scaledRank = function (id) {
  if (id === 'plating' && typeof state === 'object' && state && state.battle && state.battle.shearing) return 0;
  return scaledRankBeforeStorm.apply(this, arguments);
};
const endTurnBeforeStorm = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight' || !skyStormOn(b)) return endTurnBeforeStorm.apply(this, arguments);
  const plan = enemyPlan(b);
  b.shearing = !!plan.shear;
  if (plan.shear && !(b.freeze > 0)) b.logs.push('🌪 Shear: the gust tears past your Armor.');
  try { return endTurnBeforeStorm.apply(this, arguments); } finally { b.shearing = false; }
};
const intentBubbleBeforeStorm = intentBubble;
intentBubble = function (plan, cls, label, frozen) {
  const html = intentBubbleBeforeStorm(plan, cls, label, frozen);
  if (frozen || !plan || !(plan.damage > 0) || !plan.shear) return html;
  return html.replace(/<\/div>$/, '<p class="affliction storm-line shear">🌪 Shear: ignores your Armor (Plating). Block from cards still stops it.</p></div>');
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.intent-bubble .storm-line{font-size:11px;margin:4px 0 0}.intent-bubble .storm-line.shear{color:#ffd27a;font-weight:700}';
  document.head.append(st);
}
