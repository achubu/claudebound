'use strict';
// =====================================================================
// Round 189: ✸ Daze, on Cinder Lance.
// Play two Cinder Lances in the same turn and the enemy is dazed: its attack this turn deals
// STAGGER_DAZE less damage (all enemies, bosses too). An enemy can be dazed at most once every
// 3 turns. Needing two in one turn means you need more than one copy, and a third copy makes
// the chain come up more often.
// =====================================================================
const STAGGER_CHAIN = 2, STAGGER_RECOVERY = 3;
let STAGGER_DAZE = 0.5; // share of the attack removed; tuned with the Difficulty lab (Round 189)
tieredCard('cinder', 'Cinder Lance', 1, 'Fire Attack', '♨', [{ damage: 6, burn: 2 }, { damage: 7, burn: 2 }, { damage: 9, burn: 2 }, { damage: 11, burn: 3 }], { element: 'fire', stagger: true });

function staggerReady(b) { return !(b.staggerLock > b.turn); }
function staggerTurnsLeft(b) { return Math.max(0, (b.staggerLock || 0) - b.turn); }
function lancesThisTurn(b) { return b.lanceTurn === b.turn ? b.lanceCount || 0 : 0; }
function dazedNow(b) { return !!b && b.dazeTurn === b.turn; }
function dazePercent() { return Math.round(STAGGER_DAZE * 100); }

const rulesBeforeStagger = rules;
rules = function (c) {
  const text = rulesBeforeStagger(c), def = defs[c && c.id];
  if (!def || !def.stagger) return text;
  return text + ' ✸ Chain: play ' + STAGGER_CHAIN + ' Cinder Lances in one turn to daze the enemy: its attack this turn deals ' + dazePercent() + '% less. Once every ' + STAGGER_RECOVERY + ' turns.';
};

// The daze lowers the enemy's attack for the turn it was applied (its intent shows the lower number).
const enemyPlanBeforeStagger = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeStagger(b, turn);
  if (!b || b.dazeTurn !== turn || !(plan.damage > 0)) return plan;
  return { ...plan, damage: Math.ceil(plan.damage * (1 - STAGGER_DAZE)), dazed: dazePercent() };
};

const playCardBeforeStagger = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i];
  const r = playCardBeforeStagger(i);
  if (b && c && defs[c.id] && defs[c.id].stagger && !b.hand.includes(c) && state.battle === b && b.phase === 'fight' && b.enemy.hp > 0) {
    if (b.lanceTurn !== b.turn) { b.lanceTurn = b.turn; b.lanceCount = 0; }
    b.lanceCount++;
    if (b.lanceCount === STAGGER_CHAIN) {
      if (staggerReady(b)) {
        b.dazeTurn = b.turn; b.staggerLock = b.turn + STAGGER_RECOVERY; b.staggers = (b.staggers || 0) + 1;
        b.logs.push('✸ Chain! ' + b.enemy.name + ' is dazed: its attack this turn deals ' + dazePercent() + '% less.');
      } else b.logs.push('✸ Chain, but ' + b.enemy.name + ' is still recovering (' + staggerTurnsLeft(b) + ' more turn' + (staggerTurnsLeft(b) > 1 ? 's' : '') + ').');
    } else if (b.lanceCount < STAGGER_CHAIN) b.logs.push('✸ Chain ' + b.lanceCount + '/' + STAGGER_CHAIN + ' this turn.');
    save(); renderBattle();
  }
  return r;
};

// Battle tray: shown while you hold a Cinder Lance, or while the enemy is dazed or recovering.
const renderBattleBeforeStagger = renderBattle;
renderBattle = function () {
  renderBattleBeforeStagger.apply(this, arguments);
  const b = state && state.battle, m = $('battleModal'); if (!b || b.phase !== 'fight' || !m || !m.querySelector) return;
  const holding = b.hand.some(c => defs[c.id] && defs[c.id].stagger);
  if (!holding && !dazedNow(b) && !staggerTurnsLeft(b)) return;
  const box = document.createElement('div'); box.className = 'mech-tray'; box.dataset.mechanic = 'stagger'; box.style.setProperty('--mc', '#ff8a4c');
  const left = staggerTurnsLeft(b);
  const note = dazedNow(b) ? 'dazed: its attack this turn deals ' + dazePercent() + '% less' : left ? 'recovering: can be dazed again in ' + left + ' turn' + (left > 1 ? 's' : '') : 'play ' + STAGGER_CHAIN + ' in one turn to daze (−' + dazePercent() + '% damage)';
  box.innerHTML = '<div class="mt-head"><span class="mt-count">' + lancesThisTurn(b) + '/' + STAGGER_CHAIN + '</span><div class="mt-text"><b>✸ Chain · Cinder Lance</b><small>' + note + '</small></div></div>';
  const anchor = m.querySelector('.hand-title'); if (anchor && anchor.before) anchor.before(box); else m.append(box);
};
