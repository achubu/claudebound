'use strict';
// =====================================================================
// Round 211: the victory screens open on the moment the fight ended, so the finishing card was
// never seen. They now start with a "Final turn" box: the cards you played on your last turn,
// what each did (damage dealt, Block gained) and which one finished the enemy.
// =====================================================================
function recapLine(name, dmg, block, finisher) {
  const bits = [];
  if (dmg > 0) bits.push(dmg + ' damage');
  if (block > 0) bits.push('+' + block + ' Block');
  return { name, what: bits.join(' · '), finisher: !!finisher };
}
const playCardBeforeRecap = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i];
  if (!b || !c || b.phase !== 'fight') return playCardBeforeRecap.apply(this, arguments);
  if (b.recapTurn !== b.turn) { b.recapTurn = b.turn; b.recap = []; }
  const hp = b.enemy.hp, block = b.block, name = stat(c).name;
  b.recapPlaying = true;
  let r; try { r = playCardBeforeRecap.apply(this, arguments); } finally { b.recapPlaying = false; }
  if (!b.hand.includes(c) && b.recap) b.recap.push(recapLine(name, hp - Math.max(0, b.enemy.hp), b.block - block, b.enemy.hp <= 0));
  if (b.phase === 'reward') { b.recapFinal = b.recap.slice(-6); if (state.battle === b) renderBattle(); } // the win came from this card
  return r;
};
// The finishing blow can also come from a side card or damage over time; note it if no card did.
const winBattleBeforeRecap = winBattle;
winBattle = function () {
  const b = state && state.battle;
  if (b && b.phase === 'fight' && !b.recapPlaying) { // a win from a side card or damage over time
    if (b.recapTurn !== b.turn) { b.recapTurn = b.turn; b.recap = []; }
    if (!b.recap.some(l => l.finisher)) {
      const last = b.logs.slice().reverse().find(l => /damage|Burn|poison|Poison/.test(l));
      if (last) b.recap.push({ name: last.replace(/^[^A-Za-z]*/, ''), what: '', finisher: true });
    }
    b.recapFinal = b.recap.slice(-6);
  }
  return winBattleBeforeRecap.apply(this, arguments);
};
function recapHTML(b) {
  const lines = (b && b.recapFinal) || []; if (!lines.length) return '';
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  return '<div class="battle-recap"><b>Final turn</b><ul>' + lines.map(l => '<li' + (l.finisher ? ' class="finisher"' : '') + '>' + esc(l.name)
    + (l.what ? ' <span>' + esc(l.what) + '</span>' : '') + (l.finisher ? ' <em>✦ finishing blow</em>' : '') + '</li>').join('') + '</ul></div>';
}
const renderBattleBeforeRecap = renderBattle;
renderBattle = function () {
  renderBattleBeforeRecap.apply(this, arguments);
  const b = state && state.battle, m = typeof $ === 'function' && $('battleModal');
  if (!b || b.phase !== 'reward' || !m || !m.querySelector || m.querySelector('.battle-recap')) return;
  const html = recapHTML(b); if (!html) return;
  const anchor = m.querySelector('h1, h2');
  if (anchor && anchor.insertAdjacentHTML) anchor.insertAdjacentHTML('afterend', html);
  else if (m.insertAdjacentHTML) m.insertAdjacentHTML('afterbegin', html);
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.battle-recap{margin:6px 0 10px;padding:8px 12px;border:1px solid #3d6f86;border-radius:10px;background:#0b1a26cc;font:13px/1.45 system-ui;color:#d8eef7}'
    + '.battle-recap ul{margin:4px 0 0;padding-left:18px}.battle-recap span{color:#9fd3e6}.battle-recap .finisher{color:#ffe7a8}.battle-recap em{font-style:normal;color:#ffd36a;font-weight:700}';
  document.head.append(st);
}
// Round 227: Esc closes the victory screens. It opens the loot chest first if it is still shut, so
// the loot is never lost, then continues back to the map.
if (typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.repeat) return;
  const b = state && state.battle, ov = typeof $ === 'function' && $('battleOverlay');
  if (!b || b.phase !== 'reward' || !ov || ov.classList.contains('hidden')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const chest = $('openChest'); if (chest && !chest.disabled) chest.click();
  const go = $('continueReward'); if (go && !go.disabled) go.click();
}, true);
