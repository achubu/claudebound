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
    b.swipeBy = { name: b.enemy.name, hurt, blocked: soak };
  }
  const r = endTurnBeforeSwipe.apply(this, arguments);
  if (swipes && state.battle === b && b.phase === 'fight' && b.turn > turn && b.hand.length) {
    b.siftPick = (b.siftPick || 0) + 1; b.siftDrawn = []; b.siftReason = 'swipe';
    b.logs.push('🗡 Swipe: choose a card to discard.'); save(); renderBattle(); swipePopup(b);
  }
  return r;
};
// Round 245 (owner request: it wasn't clear when a Swipe happens): the turn after a Swipe opens with a
// pop-up that says who swiped and for how much, and shows your hand to pick the card to discard.
// Closing it leaves the choice on the battle screen as before. The simulator's bot skips it.
function swipePopupHTML(b) {
  const w = b.swipeBy || { name: b.enemy.name, hurt: 0 };
  return '<div class="eyebrow">🗡 SWIPE</div><h2>' + w.name + ' swiped at you</h2><p>While gathering energy it lashed out for <b>' + w.hurt + ' HP</b>'
    + (w.blocked ? ' (' + w.blocked + ' blocked)' : '') + '. <b>Choose a card to discard.</b> Then play your turn as usual.</p><div class="cards swipe-pick" id="swipePick"></div>';
}
function swipePopup(b = state && state.battle) {
  if (!b || globalThis.POLICY || typeof openMenu !== 'function' || typeof siftPending !== 'function' || !siftPending(b) || b.siftReason !== 'swipe') return false;
  openMenu(swipePopupHTML(b));
  const host = typeof $ === 'function' && $('swipePick'); if (!host || !host.append) return true;
  for (const i of siftChoices(b)) {
    const c = b.hand[i], uid = c.uid;
    host.append(cardElement(c, () => { const at = b.hand.findIndex(x => x.uid === uid); if (at >= 0 && siftDiscard(at)) closeMenu(); }));
  }
  return true;
}
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
