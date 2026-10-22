'use strict';
// =====================================================================
// Round 242 (owner request): while an enemy gathers energy for a charged strike it is no longer idle.
// 🗡 Swipe: on a charge turn it swipes at you for SWIPE_FRACTION of its attack (Block and Armor apply as
// usual), and at the start of your next turn you discard 1 card of your choice (Sift's discard screen,
// cycle-card.js; any card in hand may go). Both show in the intent a turn ahead. Frozen or silenced
// enemies don't swipe. Loaded after cycle-card.js and sky-storm.js.
// =====================================================================
const SWIPE_FRACTION = 0.3;
function swipeDamage(b) { return Math.max(1, Math.ceil(Math.max(1, b.enemy.attack - (b.enemyDebuff || 0)) * SWIPE_FRACTION)); }
const enemyPlanBeforeSwipe = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeSwipe(b, turn);
  if (!b || !b.enemy || !plan || plan.kind !== 'charge') return plan;
  return { ...plan, swipe: swipeDamage(b), name: plan.name + ' + 🗡 Swipe' };
};
const endTurnBeforeSwipe = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight') return endTurnBeforeSwipe.apply(this, arguments);
  const plan = enemyPlan(b), turn = b.turn;
  const swipes = plan.kind === 'charge' && plan.swipe > 0 && !(b.freeze > 0) && !b.enemy.silenced && b.silenceTurn !== turn;
  if (swipes) {
    const net = Math.max(0, plan.swipe - scaledRank('plating')), soak = Math.min(b.block || 0, net), hurt = net - soak;
    b.block = (b.block || 0) - soak; state.hp = Math.max(0, state.hp - hurt);
    b.logs.push('🗡 Swipe: ' + hurt + ' HP damage' + (soak ? ' (' + soak + ' blocked)' : '') + '. Discard a card next turn.');
  }
  const r = endTurnBeforeSwipe.apply(this, arguments);
  if (swipes && state.battle === b && b.phase === 'fight' && b.turn > turn && b.hand.length) {
    b.siftPick = (b.siftPick || 0) + 1; b.siftDrawn = []; b.siftReason = 'swipe';
    b.logs.push('🗡 Swipe: choose a card to discard.'); save(); renderBattle();
  }
  return r;
};
const intentBubbleBeforeSwipe = intentBubble;
intentBubble = function (plan, cls, label, frozen) {
  const html = intentBubbleBeforeSwipe(plan, cls, label, frozen);
  if (frozen || !plan || !plan.swipe) return html;
  return html.replace(/<\/div>$/, '<p class="affliction storm-line swipe">🗡 Swipe: ' + plan.swipe + ' damage (Block and Armor apply), then you discard 1 card of your choice next turn.</p></div>');
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.intent-bubble .storm-line.swipe{color:#ffb4a0;font-weight:700;font-size:11px;margin:4px 0 0}';
  document.head.append(st);
}
