'use strict';
// =====================================================================
// Round 254 (owner request): less text on the battle screen. Every effect is shown as a chip of one
// or two words; hovering it (or tapping it on a phone, or focusing it with the keyboard) opens a
// bubble with the full description. After each redraw of the fight, compactBattle() rewrites:
// - the intent bubbles: short "when" labels, short move names, "45 dmg", and one chip per effect line
//   (afflictions with their answers, Pressure, Swipe, Shear, temper...);
// - the top line: the encounter's name and an element chip;
// - the battle log: one "📜 Log" chip holding the last entries;
// - the Aether line, the bounty, the mechanic trays and the hand hints;
// - every title tooltip on the battle screen (outside the cards) becomes the same bubble.
// Loaded after every other battle-screen script except god-mode.js.
// =====================================================================
function fxEscape(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fxChip(label, tip, cls) { return '<span class="fx-chip' + (cls ? ' ' + cls : '') + '" tabindex="0" data-tip="' + fxEscape(tip) + '">' + label + '</span>'; }
// "🗡 Swipe: 9 damage (Block…)" → "🗡 Swipe 9"; "🔥 Burn 5 for 3 turns: lose…" → "🔥 Burn 5"; at most two words after the icon.
function fxLabel(text) {
  text = String(text).replace(/\s+/g, ' ').trim();
  const colon = text.indexOf(':');
  const head = colon > 0 && colon < 48 ? text.slice(0, colon) : text, rest = colon > 0 && colon < 48 ? text.slice(colon + 1).trim() : '';
  const m = head.match(/^([^\p{L}\p{N}]*)(.*)$/u), icon = (m[1] || '').trim(), words = m[2].split(' ').filter(Boolean);
  let label = words.slice(0, colon > 0 && colon < 48 ? 2 : 1).join(' ').replace(/[.,;—-]+$/, '');
  const num = rest.match(/^([+−-]?\d+)(?=[\s.,)]|$)/);
  if (num && words.length <= 1) label += ' ' + num[1];
  return (icon ? icon + ' ' : '') + label;
}
// Move names: "Gathering fire energy" → "Charging", "Cataclysm water strike" → "Cataclysm"…
const FX_ELEMENTS = /\b(fire|water|earth|air|ice|lightning|storm)\b\s*/gi;
function fxMove(name) {
  const main = String(name).split(' + ')[0].trim();
  const m = main.match(/^([^\p{L}\p{N}]*)(.*)$/u), icon = (m[1] || '').trim(); let s = m[2];
  if (/^Gathering .* energy/i.test(s)) s = 'Charging';
  else if (/^Cataclysm/i.test(s)) s = 'Cataclysm';
  else if (/^Shearing/i.test(s)) s = 'Shearing strike';
  else if (/^Charged .* strike/i.test(s)) s = 'Charged strike';
  else s = s.replace(FX_ELEMENTS, '').split(' ').filter(Boolean).slice(0, 2).join(' ');
  return (icon ? icon + ' ' : '') + s;
}
function fxWhen(text) {
  const t = String(text).replace(/:\s*$/, '').trim();
  if (/^Enemy move next turn/i.test(t)) return 'Next turn';
  if (/^Enemy move the turn after/i.test(t)) return 'Turn after';
  const pair = t.match(/^(.*?)( \(target\))?, (next turn|the turn after)$/i);
  if (pair) return pair[1].replace(/^[🔥🛡]\s*(Fierce|Hardy)\s+/u, '') + (pair[2] ? ' 🎯' : '');
  return t;
}
function fxDamage(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  const hits = t.match(/^(\d+) × (\d+) damage/); if (hits) return hits[1] + '×' + hits[2] + ' dmg';
  const dmg = t.match(/^(\d+) damage/); if (dmg) return dmg[1] + ' dmg';
  if (/^frozen/i.test(t)) return fxChip('❄ Frozen', 'Frozen: it skips its action.');
  if (/^countered/i.test(t)) return fxChip('◈ Countered', 'Your Prismatic Counter cancels this strike: no damage.');
  if (/^silenced/i.test(t)) return fxChip('⊘ Silenced', 'Silenced: no action this turn.');
  if (/Phase Veil/i.test(t)) return fxChip('◐ Veiled', 'Negated by Phase Veil.');
  return t;
}
const FX_ELEMENT_ICON = { fire: '🔥', water: '💧', earth: '🪨', air: '🌪', ice: '❄', lightning: '⚡', storm: '⚡' };
// Effect lines name themselves: the affliction a move carries ("+ Scorch") labels its line.
const afflictionLineBeforeChips = afflictionLine;
afflictionLine = function (plan, label) {
  const html = afflictionLineBeforeChips.apply(this, arguments);
  if (!html || !plan || !plan.rider || plan.anchored || !AFFLICTIONS[plan.rider]) return html;
  const a = AFFLICTIONS[plan.rider];
  return html.replace('<p class="affliction', '<p data-fx="' + fxEscape(a.icon + ' ' + a.name) + '" class="affliction');
};
function compactIntent(bubble) {
  if (bubble.dataset.fx === 'done') return;
  const when = bubble.querySelector('.when'), what = bubble.querySelector('.what'), dmg = bubble.querySelector('.dmg');
  if (when) { when.dataset.tip = when.textContent.trim(); when.textContent = fxWhen(when.textContent); }
  if (what) { const full = what.textContent.trim(), short = fxMove(full); if (short !== full) { what.dataset.tip = full; what.classList.add('has-tip'); what.tabIndex = 0; } what.textContent = short; }
  const chips = [];
  if (dmg) {
    const win = dmg.querySelector('em'), base = dmg.textContent.replace(/·\s*counter window/i, '').trim();
    dmg.innerHTML = fxDamage(base) + (win ? ' ' + fxChip('◈ Counter', 'Counter window: a Prismatic Counter armed for this element cancels this strike.', 'counter') : '');
  }
  for (const p of [...bubble.querySelectorAll('p.affliction')]) {
    const answer = p.querySelector('.answer'), answerText = answer ? answer.textContent.trim() : '';
    if (answer) answer.remove();
    const full = p.textContent.replace(/\s+/g, ' ').trim(), label = p.dataset.fx || fxLabel(full);
    const kinds = [...p.classList].filter(c => c !== 'affliction').join(' ');
    chips.push(fxChip(label, full + (answerText ? '\n' + answerText : ''), kinds));
    p.remove();
  }
  if (chips.length) { const row = document.createElement('div'); row.className = 'fx-row'; row.innerHTML = chips.join(''); bubble.append(row); }
  bubble.dataset.fx = 'done';
}
function compactBattle(m) {
  if (!m || !m.querySelectorAll) return;
  // Top line: the encounter's name, and its element as a chip.
  const tools = m.querySelector('.combat-tools');
  if (tools && !tools.dataset.fx) {
    const enc = tools.querySelector('.encounter-line'), el = tools.querySelector('p');
    if (enc) { const b = enc.querySelector('b'); if (b && /Encounter/i.test(b.textContent)) b.textContent = '⚔'; }
    if (el) {
      const full = el.textContent.replace(/\s+/g, ' ').trim(), kind = (el.querySelector('b') && el.querySelector('b').textContent.trim()) || '';
      const span = document.createElement('span'); span.className = 'fx-el';
      span.innerHTML = kind ? fxChip((FX_ELEMENT_ICON[kind.toLowerCase()] || '◈') + ' ' + kind[0].toUpperCase() + kind.slice(1), 'Element: ' + kind + '. Keep a Prismatic Counter for it: a counter cancels its charged strike.', 'element') : '';
      el.replaceWith(span);
      for (const n of [...tools.childNodes]) if (n.nodeType === 3 && n.textContent.trim() === '·') n.textContent = ' ';
    }
    tools.dataset.fx = '1';
  }
  for (const bubble of m.querySelectorAll('.intent-bubble')) compactIntent(bubble);
  // Battle log: one chip with the last entries.
  const log = m.querySelector('#combatLog');
  if (log && !log.dataset.fx && log.textContent.trim()) {
    const entries = log.textContent.split(' · ').map(s => s.trim()).filter(Boolean);
    log.dataset.tip = entries.join('\n'); log.innerHTML = fxChip('📜 Log', entries.join('\n'), 'log'); log.dataset.fx = '1';
  }
  // Aether: "+3 at end of turn (incl. …)" → "+3 / turn".
  for (const s of m.querySelectorAll('.aether-row small')) {
    if (s.dataset.fx) continue; const t = s.textContent.trim(), n = t.match(/^([+−-]?\d+)/);
    if (n) { s.innerHTML = fxChip(n[1] + ' / turn', t, 'aether'); s.dataset.fx = '1'; }
  }
  // Bounty: "★ Overkill · Deal 15+ damage… · ◇3 · best 0" → "★ Overkill ◇3".
  for (const c of m.querySelectorAll('.bounty-chip')) {
    if (c.dataset.fx) continue; const t = c.textContent.replace(/\s+/g, ' ').trim(), parts = t.split(' · ');
    const reward = parts.find(x => /^◇/.test(x)); c.dataset.tip = t; c.classList.add('has-tip'); c.tabIndex = 0;
    c.innerHTML = parts[0].replace(/^★\s*/, '★ ') + (reward ? ' ' + reward : ''); c.dataset.fx = '1';
  }
  // Mechanic trays: the note goes into the bubble; "How Heat works" becomes "?".
  for (const tray of m.querySelectorAll('.mech-tray:not(.mech-guide-box)')) {
    if (tray.dataset.fx) continue;
    const title = tray.querySelector('.mt-text b'), note = tray.querySelector('.mt-text small'), help = tray.querySelector('.mt-help');
    if (title && note) { title.dataset.tip = title.textContent + ': ' + note.textContent; title.classList.add('has-tip'); title.tabIndex = 0; title.textContent = title.textContent.split(' · ')[0]; note.remove(); }
    if (help) { help.setAttribute('aria-label', help.textContent); help.dataset.tip = help.textContent; help.textContent = '?'; }
    tray.dataset.fx = '1';
  }
  // Hand hints ("Click a card to play", "Reserve one counter…") become ⓘ chips.
  for (const s of m.querySelectorAll('span.muted')) {
    if (s.dataset.fx || s.closest('.card') || s.textContent.trim().length < 18) continue;
    s.innerHTML = fxChip('ⓘ', s.textContent.trim(), 'hint'); s.dataset.fx = '1';
  }
  // Native title tooltips outside the cards use the same bubble.
  for (const el of m.querySelectorAll('[title]')) {
    if (el.closest('.card, .side-card, button.card')) continue;
    el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); el.classList.add('has-tip');
  }
}
const renderBattleBeforeChips = renderBattle;
renderBattle = function () {
  const r = renderBattleBeforeChips.apply(this, arguments), b = state && state.battle;
  fxHide();
  const m = typeof document !== 'undefined' && document.getElementById('battleModal');
  if (b && b.phase === 'fight' && typeof HTMLElement !== 'undefined' && m instanceof HTMLElement) compactBattle(m); // real pages only (not the test harness's stub DOM)
  return r;
};
// --- The bubble ---------------------------------------------------------
let fxTipEl = null, fxTipFor = null, fxShownAt = 0;
function fxHide() { if (fxTipEl) fxTipEl.classList.remove('show'); fxTipFor = null; }
function fxShow(el) {
  if (typeof document === 'undefined' || !el || !el.dataset || !el.dataset.tip) return;
  if (!fxTipEl) { fxTipEl = document.createElement('div'); fxTipEl.id = 'fxTip'; fxTipEl.setAttribute('role', 'tooltip'); document.body.append(fxTipEl); }
  fxTipEl.textContent = el.dataset.tip; fxTipEl.classList.add('show'); if (fxTipFor !== el) fxShownAt = Date.now(); fxTipFor = el;
  const r = el.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 16); fxTipEl.style.maxWidth = w + 'px';
  const tw = fxTipEl.offsetWidth, th = fxTipEl.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2; x = Math.max(8, Math.min(window.innerWidth - tw - 8, x));
  let y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
  fxTipEl.style.left = x + 'px'; fxTipEl.style.top = y + 'px';
}
const fxTarget = e => e.target && e.target.closest && e.target.closest('#battleModal [data-tip]');
if (typeof document !== 'undefined' && document.addEventListener) {
  let fxTouchAt = 0; // a tap sends mouse events too; after a touch only taps open and close the bubble
  document.addEventListener('touchstart', () => { fxTouchAt = Date.now(); }, { capture: true, passive: true });
  document.addEventListener('mouseover', e => { if (Date.now() - fxTouchAt < 1000) return; const t = fxTarget(e); if (t && t !== fxTipFor) fxShow(t); else if (!t && fxTipFor) fxHide(); });
  document.addEventListener('focusin', e => { const t = fxTarget(e); if (t) fxShow(t); });
  document.addEventListener('focusout', () => fxHide());
  // Tap (phones): a chip toggles its bubble; tapping elsewhere closes it. A tap's own hover opens it a
  // moment before the click, so a click right after that keeps it open.
  document.addEventListener('click', e => { const t = fxTarget(e); if (t && t.classList.contains('fx-chip')) { if (fxTipFor === t && Date.now() - fxShownAt > 400) fxHide(); else fxShow(t); } else if (!t) fxHide(); }, true);
  document.addEventListener('scroll', () => fxHide(), true);
}
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .fx-chip{display:inline-flex;align-items:center;gap:3px;padding:1px 8px;margin:3px 4px 0 0;border-radius:10px;border:1px solid #ffffff38;background:#ffffff14;color:inherit;font-size:11px;font-weight:700;line-height:1.5;white-space:nowrap;cursor:help;vertical-align:middle}'
    + '#battleModal .fx-chip:hover,#battleModal .fx-chip:focus{background:#ffffff2a;outline:none;border-color:#ffffff70}'
    + '#battleModal .fx-chip.swipe{color:#ffb4a0}#battleModal .fx-chip.shear{color:#ffd27a}#battleModal .fx-chip.pressure-line{color:#c8d6ff}#battleModal .fx-chip.pressure-line.on{color:#9df0b0}'
    + '#battleModal .fx-chip.hex,#battleModal .fx-chip.dot{color:#ffb0d0}#battleModal .fx-chip.counter{color:#ffe08a}#battleModal .fx-chip.temper-line{color:#ffcf9a}#battleModal .fx-chip.hint{padding:1px 6px}'
    + '#battleModal .fx-row{display:flex;flex-wrap:wrap;margin-top:2px}#battleModal .has-tip{cursor:help}#battleModal .intent-bubble .when[data-tip]{cursor:help}'
    + '#battleModal #combatLog[data-fx]{padding:2px 6px;min-height:0}#battleModal .fx-el .fx-chip{margin:0 0 0 6px}'
    + '#fxTip{position:fixed;z-index:10000;max-width:300px;padding:8px 10px;border-radius:10px;background:#0b1424f2;border:1px solid #6fd3e0;color:#e8f6ff;font:12px/1.4 system-ui,sans-serif;white-space:pre-line;box-shadow:0 6px 22px #000a;pointer-events:none;opacity:0;transition:opacity .12s}'
    + '#fxTip.show{opacity:1}';
  document.head.append(st);
}
