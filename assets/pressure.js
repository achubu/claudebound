'use strict';
// =====================================================================
// Round 226: ⚔ Pressure. Block was essential: one enemy hit takes about half your HP or more,
// so a deck that didn't block died in two hits long before it could win a race. Now attacking is
// a defence too. On a turn where you gain no Block from a card, every few damage you deal to the
// enemy (the world's rate, pressurePer()) takes 1 off its attack at the end of that turn, up to
// PRESSURE_CAP of it.
// Gaining Block from any card (Counters included) that turn means no Pressure: you either
// defend or press. Tuned with the Difficulty lab (assets/sim/lab.js).
// =====================================================================
// Damage per point taken off, by world: late decks deal far more per energy, so pressing costs more there.
const PRESSURE_PER_BY_WORLD = { city: 2, elaris: 2, sky: 3, wilds: 4, vespera: 6, chronospire: 6 }, PRESSURE_CAP = 0.5;
function pressurePer() { return PRESSURE_PER_BY_WORLD[typeof activeRegion === 'string' ? activeRegion : 'city'] || 3; }

function pressureDealt(b) { return b && b.pressureTurn === b.turn ? b.pressureDmg || 0 : 0; }
function pressureGuarded(b) { return !!b && b.guardTurn === b.turn; }
// How much comes off each hit of this turn's attack.
function pressureOff(b, plan) {
  if (!b || pressureGuarded(b) || !(plan && plan.damage > 0)) return 0;
  return Math.min(Math.floor(pressureDealt(b) / pressurePer() / (plan.hits || 1)), Math.floor(plan.damage * PRESSURE_CAP));
}

// The enemy's attack this turn (the one it makes when you end your turn) is lowered; its intent
// shows the lower number while you play.
const enemyPlanBeforePressure = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforePressure(b, turn);
  if (!b || turn !== b.turn) return plan;
  const off = pressureOff(b, plan);
  return off > 0 ? { ...plan, damage: plan.damage - off, pressure: off } : plan;
};

// Count damage dealt and Block gained by cards played this turn (hand and side deck alike).
function pressureTrack(before) {
  return function () {
    const b = state && state.battle, hp = b && b.enemy.hp + (b.enemy.guard || 0), block = b && b.block;
    const r = before.apply(this, arguments);
    if (b && state.battle === b) {
      if (b.block > block) b.guardTurn = b.turn;
      const dealt = hp - Math.max(0, b.enemy.hp) - (b.enemy.guard || 0);
      if (dealt > 0) { if (b.pressureTurn !== b.turn) { b.pressureTurn = b.turn; b.pressureDmg = 0; } b.pressureDmg += dealt; }
      if (b.phase === 'fight' && (dealt > 0 || b.block > block)) renderBattle();
    }
    return r;
  };
}
playCard = pressureTrack(playCard);
if (typeof playSideCard === 'function') playSideCard = pressureTrack(playSideCard);

// The "next turn" bubble says what Pressure is doing (or why it isn't).
const intentBubbleBeforePressure = intentBubble;
intentBubble = function (plan, cls, label, frozen) {
  let html = intentBubbleBeforePressure(plan, cls, label, frozen);
  const b = state && state.battle;
  if (cls !== 'now' || frozen || !b || !(plan.damage > 0)) return html;
  const line = plan.pressure ? '⚔ Pressure: −' + plan.pressure + (plan.hits > 1 ? ' per hit' : '') + ' (you dealt ' + pressureDealt(b) + ' this turn)'
    : pressureGuarded(b) ? '⚔ No Pressure: you gained Block this turn'
    : '⚔ Pressure: every ' + pressurePer() + ' damage you deal this turn takes 1 off, up to half (not if you gain Block)';
  return html.replace(/<\/div>$/, '<p class="affliction pressure-line' + (plan.pressure ? ' on' : '') + '">' + line + '</p></div>');
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.intent-bubble .pressure-line{color:#c9d6e0;font-size:11px;margin:4px 0 0}.intent-bubble .pressure-line.on{color:#ffcf7a;font-weight:700}';
  document.head.append(st);
}
