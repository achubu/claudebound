'use strict';
// Round 47: a readable battle HUD. Bigger, viewport-scaled numbers and
// graphics for health, energy, Armor and Block. Purely visual: it restyles
// the markup renderBattle() already produced, so game logic is untouched.
const HUD_ICONS = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3 1.8-1.9 3.3-3 5.4-3 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/><path class="shine" d="M6.5 7.2c-1.6.3-2.6 1.8-2.2 3.4" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>',
  fang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 3 5.8 3 10.5c0 2.8 1.3 4.6 3 5.7V20l2.5-1.5L10 21l2-2 2 2 1.5-2.5L18 20v-3.8c1.7-1.1 3-2.9 3-5.7C21 5.8 17.5 2 12 2z"/><circle class="eye" cx="8.6" cy="10.6" r="2.1"/><circle class="eye" cx="15.4" cy="10.6" r="2.1"/></svg>',
  weaken: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="blade" d="M14.5 2.5l7 7-9.5 9.5-2-2 7.5-7.5-3-3L7 14l-2-2z"/><path class="crack" d="M11 6l2 3-2 1 2.5 3" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path class="arrow" d="M5 15v6M2 18l3 3 3-3" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1 4 13.5h6.2L9 23l10-13.2h-6.4z"/></svg>'
};
function hudNumber(el) { const m = /(\d+)/.exec(el.textContent || ''); return m ? Number(m[1]) : 0; }
function hudShield(n, label) { return '<span class="hud-shield" title="' + label + '"><span class="rim"><span class="face"><b>' + n + '</b></span></span></span><span class="hud-cap">Armor</span>'; }
function hudBlock(n) { return '<span class="hud-crystal"><span class="gem"><b>' + n + '</b></span></span><span class="hud-cap">Block</span>'; }

const renderBattleBeforeHud = renderBattle;
renderBattle = function () {
  renderBattleBeforeHud();
  const b = state && state.battle; if (!b || b.phase !== 'fight') return;
  const m = $('battleModal'); if (!m || !m.querySelector) return;
  m.classList.add('hud-v2');
  // Energy: glowing orbs instead of a small "⚡ 2/3" badge.
  const badge = [...m.querySelectorAll('.compact-bar .badge')].find(x => (x.textContent || '').includes('⚡'));
  if (badge) {
    const max = maxEnergy(), n = b.energy, orbs = [];
    for (let k = 0; k < Math.max(max, n); k++) orbs.push('<i class="orb ' + (k < n ? (k >= max ? 'on bonus' : 'on') : 'off') + '"></i>');
    badge.className = 'energy-hud'; badge.title = n + ' energy of ' + max;
    badge.innerHTML = '<span class="bolt">' + HUD_ICONS.bolt + '</span><span class="orbs">' + orbs.join('') + '</span><b class="num">' + n + '<small>/' + max + '</small></b>';
  }
  // Health: tall bars with an icon and big numbers; the player's bar changes colour as it drops.
  m.querySelectorAll('.compact-combatants .meter').forEach(meter => {
    if (meter.dataset.hud) return; meter.dataset.hud = '1';
    const you = meter.classList.contains('you'), fill = meter.querySelector('span');
    const pct = parseFloat(fill && fill.style.width) || 0;
    meter.classList.add('hud-meter', pct <= 25 ? 'low' : pct <= 50 ? 'mid' : 'high');
    const row = document.createElement('div'); row.className = 'hp-row ' + (you ? 'you' : 'enemy');
    row.innerHTML = '<span class="hp-icon">' + (you ? HUD_ICONS.heart : HUD_ICONS.fang) + '</span>';
    meter.replaceWith(row); row.append(meter);
  });
  // Weaken: a big glowing hex button instead of a small text button.
  const weaken = m.querySelector('#weaken');
  if (weaken && !weaken.dataset.hud) {
    weaken.dataset.hud = '1'; weaken.className = 'weaken-hud';
    weaken.title = 'The enemy\'s next attack deals ' + weakenAmount() + ' less damage. Charges this fight: ' + (weakenCharges() - (b.weakenUses || 0)) + ' of ' + weakenCharges() + '.';
    weaken.innerHTML = '<span class="wk-icon">' + HUD_ICONS.weaken + '</span><span class="wk-text"><b>WEAKEN</b><small>Next enemy attack −' + weakenAmount() + ' · ' + (weakenCharges() > 1 ? (weakenCharges() - (b.weakenUses || 0)) + ' of ' + weakenCharges() + ' charges left' : 'once per fight') + '</small></span>';
  }
  // Round 64: an always-visible debuff strip on both sides, listing every
  // active debuff (or "None") plus the damage over time it deals each turn.
  const weakened = [...m.querySelectorAll('.compact-side.you .soul-legend')].find(x => /Weaken/.test(x.textContent || ''));
  if (weakened) { weakened.className = 'weaken-hud spent'; weakened.innerHTML = '<span class="wk-icon">' + HUD_ICONS.weaken + '</span><span class="wk-text">' + (b.enemyDebuff ? '<b>WEAKENED</b><small>Next enemy attack −' + b.enemyDebuff + (weakenCharges() > 1 ? ' · ' + (weakenCharges() - (b.weakenUses || 0)) + ' charge(s) left' : '') + '</small>' : '<b>WEAKEN USED</b><small>' + (weakenCharges() > 1 ? 'All ' + weakenCharges() + ' charges spent' : 'Once per fight') + '</small>') + '</span>'; }
  const t = s => s === 1 ? '1 turn' : s + ' turns';
  const youDebuffs = [
    b.bleed && ['🩸', 'Bleed ' + b.bleed, 'Lose ' + b.bleed + ' HP at the end of your turn; falls by 1 each turn.'],
    b.playerPoison && ['☣', 'Poison ' + b.playerPoison, 'Lose ' + b.playerPoison + ' HP at the end of each turn.'],
    b.playerBurn > 0 && ['🔥', 'Burn · ' + t(b.playerBurn), 'Lose 2 HP at the end of each turn for ' + t(b.playerBurn) + '.'],
    b.frail && ['⤓', 'Frail ' + b.frail, 'Your cards deal 25% less damage.'],
    b.shackledNow && ['⛓', 'Shackled', '1 less energy this turn.'],
    b.drained && ['💧', 'Drained', '1 less energy next turn.'],
    b.exposed && ['◎', 'Exposed +' + b.exposed, 'The next enemy hit deals ' + b.exposed + ' more damage.'],
    b.foggedNow && ['☁', 'Fogged', 'You drew 1 fewer card this turn.']
  ].filter(Boolean);
  const foeDebuffs = [
    b.poison && ['☣', 'Poison ' + b.poison, 'Takes ' + b.poison + ' damage at the end of each turn.'],
    b.burnTurns > 0 && b.burn && ['🔥', 'Burn ' + b.burn + ' · ' + t(b.burnTurns), 'Takes ' + b.burn + ' damage at the end of each turn for ' + t(b.burnTurns) + '.'],
    b.enemyDebuff && ['▼', 'Weakened −' + b.enemyDebuff, 'Its next attack deals ' + b.enemyDebuff + ' less damage.'],
    b.bind && ['🌿', 'Rootbind −' + b.bind, 'Its next attack deals ' + b.bind + ' less damage.'],
    b.freeze > 0 && ['❄', 'Frozen · ' + t(b.freeze), 'Skips its next ' + (b.freeze === 1 ? 'action' : b.freeze + ' actions') + '.'],
    b.silenceTurn === b.turn && ['🔇', 'Silenced', 'Its next action is cancelled.']
  ].filter(Boolean);
  const strip = (side, list, dot) => {
    const host = m.querySelector('.compact-side.' + side + ' .compact-tags'); if (!host || !host.after) return;
    const old = host.parentNode && host.parentNode.querySelector && host.parentNode.querySelector('.debuff-strip'); if (old) old.remove();
    const total = dot.reduce((n, p) => n + p[1], 0);
    const el = document.createElement('div'); el.className = 'debuff-strip ' + side;
    el.innerHTML = '<span class="ds-cap">Debuffs</span>' + (list.length ? list.map(d => '<b class="ds-item" title="' + d[2] + '"><i>' + d[0] + '</i>' + d[1] + '</b>').join('') : '<span class="ds-none">None</span>')
      + (total ? '<b class="dot-hud ' + side + '" title="' + dot.filter(p => p[1]).map(p => p[0] + ' ' + p[1]).join(' + ') + ' = ' + total + ' damage at the end of each turn"><span class="dot-drop">☠</span><span class="dot-num">−' + total + '</span><span class="dot-cap">HP / turn</span></b>' : '');
    host.after(el);
  };
  strip('you', youDebuffs, [['Bleed', b.bleed || 0], ['Burn', b.playerBurn > 0 ? 2 : 0], ['Poison', b.playerPoison || 0]]);
  strip('enemy', foeDebuffs, [['Poison', b.poison || 0], ['Burn', b.burnTurns > 0 ? (b.burn || 0) : 0]]);
  // Armor: a steel shield; Block: a glowing crystal.
  m.querySelectorAll('.compact-tags .armor-tag').forEach(t => { const n = hudNumber(t); t.classList.add('hud-stat', 'armor'); t.innerHTML = hudShield(n, t.title || ''); });
  m.querySelectorAll('.compact-tags .block-tag').forEach(t => { const n = hudNumber(t); t.classList.add('hud-stat', 'block'); t.innerHTML = hudBlock(n); });
};

// Round 66: Weaken is a one-shot. It lowers only the enemy's next attack
// (by 3x the old amount) and is then used up.
const endTurnBeforeWeaken = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight' || !b.enemyDebuff) return endTurnBeforeWeaken();
  let attacks = false;
  try { const p = enemyPlan(b); attacks = !(b.freeze > 0) && !['charge', 'guard', 'silenced'].includes(p.kind) && p.damage > 0; } catch (e) {}
  const turn = b.turn;
  endTurnBeforeWeaken();
  if (attacks && state.battle === b && b.turn > turn && b.enemyDebuff) { b.enemyDebuff = 0; b.logs.push('Weaken wears off.'); if (b.phase === 'fight') { save(); renderBattle(); } }
};
