'use strict';
// Round 47: a readable battle HUD. Bigger, viewport-scaled numbers and
// graphics for health, energy, Armor and Block. Purely visual: it restyles
// the markup renderBattle() already produced, so game logic is untouched.
const HUD_ICONS = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3 1.8-1.9 3.3-3 5.4-3 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/><path class="shine" d="M6.5 7.2c-1.6.3-2.6 1.8-2.2 3.4" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg>',
  fang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 3 5.8 3 10.5c0 2.8 1.3 4.6 3 5.7V20l2.5-1.5L10 21l2-2 2 2 1.5-2.5L18 20v-3.8c1.7-1.1 3-2.9 3-5.7C21 5.8 17.5 2 12 2z"/><circle class="eye" cx="8.6" cy="10.6" r="2.1"/><circle class="eye" cx="15.4" cy="10.6" r="2.1"/></svg>',
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
  // Armor: a steel shield; Block: a glowing crystal.
  m.querySelectorAll('.compact-tags .armor-tag').forEach(t => { const n = hudNumber(t); t.classList.add('hud-stat', 'armor'); t.innerHTML = hudShield(n, t.title || ''); });
  m.querySelectorAll('.compact-tags .block-tag').forEach(t => { const n = hudNumber(t); t.classList.add('hud-stat', 'block'); t.innerHTML = hudBlock(n); });
};
