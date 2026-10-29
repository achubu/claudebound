'use strict';
// =====================================================================
// Round 283 (owner request): every boss has a signature twist, a mechanic you learn to play around, shown as a
// chip by its name with a countdown. At half health a boss enters Phase 2 (announced) and its twist comes
// more often; final bosses also go into Overdrive in their last third of health (their guard turns become attacks).
//
// Twists, keyed by boss id. A twist fires on turns that are a multiple of its period (period - 1 in Phase 2).
//   aegis      at the end of its turn it gains Block equal to 8% of its max HP
//   countdown  a charged blow: that turn's hit deals twice its base attack (or its own hit, if bigger), unless you "break" it by dealing 10% of its max HP that
//              turn (the intent shows the big number and how much breaks it; it drops as you hit)
//   roots      at the start of your turn a card in your hand is rooted and cannot be played
//   undertow   at the start of your turn a card is pulled from your hand back onto your draw pile
//   surcharge  your most expensive card in hand costs 1 more that turn
//   eclipse    Block you gain from cards that turn is halved
//   mirror     the first card that damages it that turn bounces 30% of the damage back to you
//   rewind     once, on reaching half health, it heals 15% and sheds your Poison and Burn
// The test harness turns twists off unless BOSS_TWISTS=1 (like traits), so older tests keep exact numbers.
// =====================================================================
const BOSS_TWIST_KINDS = {
  aegis:     { period: 3, desc: 'Every third turn it raises a shield: Block equal to 8% of its health.' },
  countdown: { period: 4, desc: 'Every fourth turn it unleashes a charged blow: twice its base attack. Break it by dealing enough damage that turn (the intent shows how much).' },
  roots:     { period: 3, desc: 'Every third turn one card in your hand is rooted and cannot be played that turn.' },
  undertow:  { period: 3, desc: 'Every third turn it pulls a card from your hand back onto your draw pile.' },
  surcharge: { period: 3, desc: 'Every third turn your most expensive card in hand costs 1 more.' },
  eclipse:   { period: 3, desc: 'Every third turn the Block you gain from cards is halved.' },
  mirror:    { period: 4, desc: 'Every fourth turn the first card that damages it bounces 30% of the damage back to you.' },
  rewind:    { period: 0, desc: 'Once, when it drops to half health, it rewinds: heals 15% and sheds your Poison and Burn.' }
};
const BOSS_TWISTS = {
  moonKnight:          { kind: 'aegis', icon: '🌕', name: 'Moonguard' },
  crownSentinel:       { kind: 'countdown', icon: '⚖', name: 'Judgement' },
  thornWarden:         { kind: 'roots', icon: '🌿', name: 'Strangling Roots' },
  tidewardenElaris:    { kind: 'undertow', icon: '🌊', name: 'Undertow' },
  galeSovereign:       { kind: 'countdown', icon: '🔔', name: 'Noon Bell' },
  bloomTyrant:         { kind: 'eclipse', icon: '🌑', name: 'Eclipse' },
  stormbellWarden:     { kind: 'surcharge', icon: '⚡', name: 'Surcharge' },
  featherMatriarch:    { kind: 'aegis', icon: '🪶', name: 'Featherfall' },
  zenithRoc:           { kind: 'mirror', icon: '🪞', name: 'Mirror Dive' },
  tideboundWarden:     { kind: 'undertow', icon: '🌊', name: 'Riptide' },
  galeSovereignElaris: { kind: 'surcharge', icon: '🌪', name: 'Crosswind' },
  elarisTyrant:        { kind: 'roots', icon: '🌿', name: 'Bramble Bind' },
  arcSentinel:         { kind: 'aegis', icon: '⚡', name: 'Arc Shield' },
  resonantPhantom:     { kind: 'mirror', icon: '🔊', name: 'Resonance' },
  stormTyrant:         { kind: 'countdown', icon: '🌀', name: 'Tempest' },
  clockwarden:         { kind: 'undertow', icon: '⏳', name: 'Unwind' },
  paradoxTwin:         { kind: 'rewind', icon: '⏪', name: 'Rewind' },
  chronarch:           { kind: 'eclipse', icon: '🌒', name: 'Time Eclipse' }
};
// Round 283: boss health re-tuned for the twists, to about 40% for the average build in the Difficulty lab.
const BOSS_TWIST_HP = {moonKnight:  0.465,  crownSentinel:  0.797,  thornWarden:  0.477,  tidewardenElaris:  0.878,  galeSovereign:  0.66,  bloomTyrant:  0.43,  arcSentinel:  1.126,  resonantPhantom:  1.488,  stormTyrant:  0.727,  clockwarden:  1.51,  paradoxTwin:  1.005,  chronarch:  0.476,  stormbellWarden:  1.278,  featherMatriarch:  1.54,  zenithRoc:  0.6,  tideboundWarden:  3.445,  galeSovereignElaris:  1.868,  elarisTyrant:  1.263};
if (typeof BALANCE === 'object' && BALANCE.perEnemy && !globalThis.NO_BOSS_TWISTS) for (const [id, h] of Object.entries(BOSS_TWIST_HP)) BALANCE.perEnemy[id] = { ...(BALANCE.perEnemy[id] || {}), hp: h };
function bossTwist(b = state && state.battle) {
  if (!b || globalThis.NO_BOSS_TWISTS || !b.enemy || !b.enemy.boss) return null;
  const t = BOSS_TWISTS[b.id]; return t ? { ...t, ...BOSS_TWIST_KINDS[t.kind] } : null;
}
function bossFinal(b) { return !!(b && b.enemy && b.enemy.boss && !(enemies[b.id] && enemies[b.id].miniBoss)); }
function twistPeriod(b, t = bossTwist(b)) { return t && t.period ? Math.max(2, t.period - (b.twistPhase2 ? 1 : 0)) : 0; }
function twistOn(b, turn, kind) { const t = bossTwist(b); return !!(t && t.kind === kind && t.period && turn > 1 && turn % twistPeriod(b, t) === 0); }
function twistNext(b) { const t = bossTwist(b), p = twistPeriod(b, t); if (!p) return null; const n = Math.max(2, Math.ceil(b.turn / p) * p); return n - b.turn; }
function countdownNeed(b) { return Math.max(6, Math.round(b.enemy.maxHp * .1)); }
function countdownBroken(b) { return typeof pressureDealt === 'function' && pressureDealt(b) >= countdownNeed(b); }

// Phase 2: the first time it drops to half health.
function checkBossPhase(b) {
  const t = bossTwist(b); if (!t || b.twistPhase2 || !(b.enemy.hp > 0) || b.enemy.hp > b.enemy.maxHp / 2) return;
  b.twistPhase2 = true;
  const extra = t.kind === 'rewind' ? '' : ' ' + t.name + ' comes more often.';
  b.logs.push('⚠ Phase 2: ' + b.enemy.name + ' is enraged.' + extra + (bossFinal(b) ? ' At a third of its health it goes into Overdrive and stops guarding.' : ''));
  if (t.kind === 'rewind') {
    const h = Math.round(b.enemy.maxHp * .15); b.enemy.hp = Math.min(b.enemy.maxHp, b.enemy.hp + h); b.poison = 0; b.burn = 0;
    b.logs.push(t.icon + ' ' + t.name + ': it heals ' + h + ' and sheds your Poison and Burn.');
  }
  if (typeof toast === 'function' && typeof document !== 'undefined' && document.getElementById) toast('⚠ Phase 2: ' + b.enemy.name + ' grows stronger!');
  b.phaseFlash = b.turn;
}

// Its hits: the countdown blow, and Overdrive.
const enemyPlanBeforeTwists = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  let plan = enemyPlanBeforeTwists(b, turn); const t = bossTwist(b);
  if (!t || !plan) return plan;
  if (bossFinal(b) && b.twistPhase2 && b.enemy.hp <= b.enemy.maxHp / 3 && plan.kind === 'guard') plan = { ...plan, kind: 'attack', damage: Math.max(1, b.enemy.attack - (b.enemyDebuff || 0)) + 2, name: 'Overdrive strike' };
  if (t.kind === 'countdown' && twistOn(b, turn, 'countdown') && plan.damage > 0 && !(turn === b.turn && countdownBroken(b))) {
    const left = Math.max(0, countdownNeed(b) - (turn === b.turn && typeof pressureDealt === 'function' ? pressureDealt(b) : 0));
    plan = { ...plan, damage: Math.max(plan.damage, Math.round((b.enemy.attack - (b.enemyDebuff || 0)) * 2)), name: t.icon + ' ' + t.name + ' (break: deal ' + left + ' more)', twist: true };
  }
  return plan;
};
// Your cards: roots, surcharge.
const statBeforeTwists = stat;
stat = function (c) {
  const d = statBeforeTwists(c), b = typeof state === 'object' && state && state.battle;
  if (!d || !b || b.phase !== 'fight' || !bossTwist(b) || !Array.isArray(b.hand) || !b.hand.some(h => h.uid === c.uid)) return d;
  let out = d;
  if ((b.rooted || []).includes(c.uid) && b.rootTurn === b.turn) out = { ...out, unplayable: true, rooted: true };
  if (twistOn(b, b.turn, 'surcharge')) {
    const top = b.hand.reduce((best, h) => { const x = statBeforeTwists(h); return !best || (x && x.cost > best.cost) ? { uid: h.uid, cost: x ? x.cost : 0 } : best; }, null);
    if (top && top.uid === c.uid) out = { ...out, cost: (out.cost || 0) + 1, surcharged: true };
  }
  return out;
};
const playCardBeforeTwists = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand && b.hand[i], t = bossTwist(b);
  if (!t || !c || b.phase !== 'fight') return playCardBeforeTwists.apply(this, arguments);
  if ((b.rooted || []).includes(c.uid) && b.rootTurn === b.turn) { if (typeof toast === 'function') toast(t.icon + ' ' + t.name + ': this card is rooted this turn.'); return; }
  const hp = b.enemy.hp, block = b.block || 0;
  const r = playCardBeforeTwists.apply(this, arguments);
  if (state.battle !== b || b.hand.includes(c)) return r;
  const gained = (b.block || 0) - block, dealt = hp - b.enemy.hp;
  if (gained > 0 && twistOn(b, b.turn, 'eclipse')) { const cut = Math.floor(gained / 2); b.block -= cut; if (cut) b.logs.push(t.icon + ' ' + t.name + ': −' + cut + ' Block.'); }
  if (dealt > 0 && twistOn(b, b.turn, 'mirror') && b.mirrorTurn !== b.turn) { b.mirrorTurn = b.turn; const back = Math.max(1, Math.round(dealt * .3)); state.hp = Math.max(1, state.hp - back); b.logs.push(t.icon + ' ' + t.name + ': ' + back + ' bounces back to you.'); }
  if (b.phase === 'fight') { checkBossPhase(b); renderBattle(); }
  return r;
};
// Its turn: aegis at the end of it; roots and undertow at the start of yours.
const endTurnBeforeTwists = endTurn;
endTurn = function () {
  const b = state && state.battle, t = bossTwist(b);
  if (!t || b.phase !== 'fight') return endTurnBeforeTwists.apply(this, arguments);
  const turn = b.turn, broke = t.kind === 'countdown' && twistOn(b, turn, 'countdown') && countdownBroken(b);
  const r = endTurnBeforeTwists.apply(this, arguments);
  if (state.battle !== b || b.phase !== 'fight' || b.turn <= turn) return r;
  if (broke) b.logs.push(t.icon + ' You broke the ' + t.name + '!');
  if (twistOn(b, turn, 'aegis') && b.enemy.hp > 0) { const g = Math.round(b.enemy.maxHp * .08); b.enemy.guard = (b.enemy.guard || 0) + g; b.logs.push(t.icon + ' ' + t.name + ': +' + g + ' Block.'); }
  const now = b.turn;
  if (twistOn(b, now, 'roots') && b.hand.length) {
    const pool = b.hand.filter(c => !(defs[c.id] && defs[c.id].unplayable)), n = Math.min(pool.length, 1);
    const rand = seeded(hashSeed(state.seed + ':' + b.id + ':' + now)); const picked = [];
    while (picked.length < n) { const c = pool[Math.floor(rand() * pool.length)]; if (!picked.includes(c.uid)) picked.push(c.uid); }
    b.rooted = picked; b.rootTurn = now; b.logs.push(t.icon + ' ' + t.name + ': ' + picked.map(u => stat(b.hand.find(c => c.uid === u)).name).join(' and ') + ' cannot be played this turn.');
  }
  if (twistOn(b, now, 'undertow') && b.hand.length > 1) {
    const rand = seeded(hashSeed(state.seed + ':' + b.id + ':u' + now)), k = Math.floor(rand() * b.hand.length), c = b.hand.splice(k, 1)[0];
    b.draw.push(c); b.logs.push(t.icon + ' ' + t.name + ': ' + stat(c).name + ' is pulled back onto your draw pile.');
  }
  checkBossPhase(b);
  save(); renderBattle();
  return r;
};
// The twist chip by its name: what it does, and how soon.
const renderBattleBeforeTwists = renderBattle;
renderBattle = function () {
  renderBattleBeforeTwists.apply(this, arguments);
  const b = state && state.battle, t = bossTwist(b);
  if (!t || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelector) return;
  const side = document.querySelector('#battleModal .compact-side.enemy'), head = side && side.querySelector('.compact-head');
  if (!head || !head.append || head.querySelector('.twist-chip')) return;
  const next = twistNext(b), now = t.period && next === 0 && b.turn > 1, chip = document.createElement('span');
  chip.className = 'fx-chip twist-chip' + (now ? ' twist-now' : '') + (b.twistPhase2 ? ' twist-p2' : ''); chip.tabIndex = 0;
  chip.textContent = t.icon + ' ' + t.name + (t.period ? (now ? ' · NOW' : ' · in ' + next) : (b.twistPhase2 ? ' · used' : '')) + (b.twistPhase2 ? ' · P2' : '');
  chip.dataset.tip = t.name + ': ' + t.desc + ' At half health it enters Phase 2: ' + (t.kind === 'rewind' ? 'the rewind happens.' : 'the twist comes more often.') + (bossFinal(b) ? ' As a final boss, below a third of its health it goes into Overdrive and stops guarding.' : '');
  head.append(chip);
  for (const w of document.querySelectorAll('#hand .card-wrap')) {
    const i = [...w.parentElement.children].indexOf(w), c = b.hand[i]; if (!c) continue;
    const d = stat(c); if (d.rooted) w.classList.add('twist-rooted'); if (d.surcharged) w.classList.add('twist-surcharged');
  }
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .twist-chip{margin-left:6px;font-size:10px;color:#ffe08a;border-color:#c99a2e}#battleModal .twist-chip.twist-now{background:#5a2a10;color:#fff3c4;box-shadow:0 0 10px #ff9a3c88;animation:twistPulse 1s ease-in-out infinite}'
    + '#battleModal .twist-chip.twist-p2{border-color:#ff5a5a}@keyframes twistPulse{50%{box-shadow:0 0 18px #ff9a3ccc}}'
    + '#hand .card-wrap.twist-rooted .card{filter:grayscale(.6) brightness(.7)}#hand .card-wrap.twist-rooted::after{content:"🌿 ROOTED";position:absolute;left:50%;top:40%;transform:translateX(-50%);z-index:5;padding:3px 10px;border-radius:999px;background:#1d3a14;color:#cfeaa8;font:900 12px system-ui;letter-spacing:.08em;box-shadow:0 0 10px #000}'
    + '#hand .card-wrap{position:relative}#hand .card-wrap.twist-surcharged .card .cost{background:#7a2c10!important;box-shadow:0 0 10px #ff7a3c}';
  document.head.append(st);
}
