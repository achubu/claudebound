'use strict';
// =====================================================================
// Round 262 (owner request): enemy Armor you can see and feel.
// - The enemy's Armor shield always sits right beside its health bar (0 shows dimmed), not only in the
//   tag row when it has some.
// - Every hit Armor softens shows a 🛡 −N popup over the enemy for the card just played (read from the
//   hit's log line, which the battle log chip hides), and the shield pulses.
// =====================================================================
const playCardBeforeArmorPop = playCard;
playCard = function (i) {
  const b = state && state.battle, logs = b && b.logs ? b.logs.length : 0;
  const r = playCardBeforeArmorPop.apply(this, arguments);
  if (b && state.battle === b && b.logs) {
    let n = 0; for (const line of b.logs.slice(logs)) { const m = / − (\d+) armor = /.exec(line); if (m) n += +m[1]; }
    if (n) { b.armorPop = { n, at: Date.now() }; if (b.phase === 'fight') renderBattle(); }
  }
  return r;
};
const renderBattleBeforeArmorPop = renderBattle;
renderBattle = function () {
  renderBattleBeforeArmorPop.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || !b.armorPop || typeof document === 'undefined' || !document.querySelector) return;
  if (Date.now() - b.armorPop.at > 1400) return;
  const host = document.querySelector('#battleModal .pair-target') || document.querySelector('#battleModal .compact-side.enemy');
  if (!host || !host.append) return;
  const pop = document.createElement('span'); pop.className = 'armor-pop'; pop.textContent = '🛡 −' + b.armorPop.n;
  pop.title = 'Armor blocked ' + b.armorPop.n + ' damage. Pierce cards, Sunder and Breach Spike get past it.';
  host.append(pop);
  const shield = host.querySelector('.armor-tag'); if (shield && shield.classList) shield.classList.add('armor-hit');
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .pair-target,#battleModal .compact-side.enemy{position:relative}'
    + '#battleModal .armor-pop{position:absolute;right:14px;top:6px;z-index:5;padding:2px 8px;border-radius:9px;background:#1c2a3cee;border:1px solid #9fc8ff;color:#d6ecff;font:800 13px/1.3 system-ui,sans-serif;pointer-events:none;animation:armorPop 1.3s ease-out forwards}'
    + '@keyframes armorPop{0%{opacity:0;transform:translateY(6px) scale(.8)}15%{opacity:1;transform:translateY(0) scale(1.08)}70%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}'
    + '#battleModal .armor-tag.armor-hit .hud-shield{animation:armorPulse .5s ease-out 2}@keyframes armorPulse{50%{filter:brightness(1.8) drop-shadow(0 0 6px #9fc8ff)}}';
  document.head.append(st);
}
// The shield beside the health bar, for the target and (in a pair) its partner's small panel too.
const renderBattleBeforeArmorHud = renderBattle;
renderBattle = function () {
  renderBattleBeforeArmorHud.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelector) return;
  const side = document.querySelector('#battleModal .pair-target') || document.querySelector('#battleModal .compact-side.enemy');
  const row = side && side.querySelector('.hp-row.enemy'); if (!row || row.querySelector('.armor-tag')) return;
  const n = b.enemy.armor || 0, tip = n ? 'Armor blocks ' + n + ' damage from every non-Pierce hit. Pierce cards, Sunder and Breach Spike get past it.' : 'No Armor: every hit lands in full.';
  let tag = side.querySelector('.compact-tags .armor-tag');
  if (!tag) { tag = document.createElement('b'); tag.className = 'armor-tag hud-stat armor'; tag.innerHTML = typeof hudShield === 'function' ? hudShield(n, tip) : '🛡 ' + n; tag.title = tip; }
  if (!n) tag.classList.add('no-armor');
  row.append(tag);
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .hp-row.enemy{display:flex;align-items:center;gap:6px}#battleModal .hp-row.enemy .meter{flex:1;min-width:0}'
    + '#battleModal .hp-row.enemy .armor-tag{flex:none;margin:0;display:inline-flex;align-items:center;gap:3px}#battleModal .hp-row.enemy .armor-tag.no-armor{opacity:.45}';
  document.head.append(st);
}
