'use strict';
// =====================================================================
// Round 243 (owner request): PAIRS. From the Sky Isles on, some regular patrols are two enemies at
// once (a nearby species joins them; the map shows ×2). Round 247: 70% of regular patrols (was half),
// and on the map the two walk together: the partner full size, trailing right behind the leader on
// the side it walks away from, side by side with a small gap and never overlapping (Round 248). Both act every turn; you choose which one your
// cards hit by clicking its panel (the target), and when one falls the other fights on alone. Each of
// the two is weaker than a lone enemy (PAIR.hp, PAIR.attack), and the fight gives more XP.
//
// How it fits a one-enemy engine: the battle keeps the target in the usual fields (b.enemy, b.id and
// the effects on the enemy: Burn, Poison, Glitch, Weaken, Freeze, Empower, Rootbind, Daze, silence).
// The other enemy's fields wait in b.pair.other and are swapped in (withPairMate) to read its intent
// or to let it act. It acts first at the end of your turn, through pairMateActs (attacks, charged
// strikes, Block, afflictions, Swipe, Shear); then the turn resolves as usual for the target.
// The battle screen stays the same height: the enemy panel splits in two side by side, and the two
// intent bubbles show each enemy's next move. The first pair fight opens a short guide.
// =====================================================================
const PAIR_WORLDS = ['sky', 'wilds', 'vespera', 'chronospire'];
const PAIR = { chance: 0.7, hp: 0.72, attack: 0.8, xp: 1.5, world: { sky: [0.7, 0.78], wilds: [0.72, 0.8], vespera: [0.82, 0.87], chronospire: [0.72, 0.8] } }; // tuned with the Difficulty lab (CHANGES.md)
// Each world's pair strength (share of a lone enemy's HP and attack), as [hp, attack]; others use PAIR.hp/attack.
function pairScale(region = activeRegion) { const w = PAIR.world[region]; return w ? { hp: w[0], attack: w[1] } : { hp: PAIR.hp, attack: PAIR.attack }; }
const PAIR_FIELDS = ['enemy', 'id', 'patternShift', 'freeze', 'enemyDebuff', 'burn', 'burnTurns', 'poison', 'glitch', 'patch', 'crashes', 'empower', 'disrupted', 'silenceTurn', 'bind', 'staggerLock', 'dazeTurn'];
const PAIR_ZONES = () => ({ sky: typeof SKY_ZONE_ENEMY !== 'undefined' && SKY_ZONE_ENEMY, wilds: typeof WILDS_ZONE_ENEMY !== 'undefined' && WILDS_ZONE_ENEMY,
  vespera: typeof VESPERA_ZONE_ENEMY !== 'undefined' && VESPERA_ZONE_ENEMY, chronospire: typeof CHRONO_ZONE_ENEMY !== 'undefined' && CHRONO_ZONE_ENEMY });

// The species that joins a patrol, or null: regular patrols only, in the pair worlds, about PAIR.chance
// of them (fixed per patrol and journey). The partner comes from a neighbouring zone.
function pairMateFor(key, s) {
  if (!s || s.boss || s.elite || !PAIR_WORLDS.includes(activeRegion) || globalThis.NO_PAIRS || !state) return null;
  if (hashSeed(state.seed + activeRegion + ':pair:' + s.uid) % 100 >= PAIR.chance * 100) return null;
  const list = PAIR_ZONES()[activeRegion]; if (!list || !list.length) return null;
  const z = (rooms[key] && rooms[key].zone) || 1;
  for (const d of [-1, 1, -2, 2, -3, 3, -4, 4]) { const t = list[z - 1 + d]; if (t && t !== s.type && enemies[t]) return t; }
  return list.find(t => t !== s.type && enemies[t]) || null;
}
// Round 246 (owner request): the two run their move patterns out of step, so their charged strikes
// (and charges) never land on the same turn: the second enemy's pattern is offset by the first shift
// that keeps them apart over the next dozen turns (fewest shared charge turns if none is clean).
function staggerShift(b) {
  const kinds = (shift, mate) => { const out = []; const run = () => { const keep = b.patternShift; b.patternShift = shift; try { for (let t = 1; t <= 12; t++) out.push(enemyPlan(b, t).kind); } finally { b.patternShift = keep; } };
    if (mate) { swapPairFields(b); try { run(); } finally { swapPairFields(b); } } else run(); return out; };
  const mine = kinds(0, false); let best = 0, bestScore = Infinity;
  for (let s = 0; s < 6; s++) {
    const theirs = kinds(s, true); let score = 0;
    for (let t = 0; t < 12; t++) { if (mine[t] === 'elemental' && theirs[t] === 'elemental') score += 10; if (mine[t] === 'charge' && theirs[t] === 'charge') score += 3; }
    if (score < bestScore) { bestScore = score; best = s; }
    if (!score) break;
  }
  return best;
}
function pairOn(b = state && state.battle) { return !!(b && b.pair && b.pair.other && b.pair.other.enemy && b.pair.other.enemy.hp > 0); }
function swapPairFields(b) { const o = b.pair.other; for (const k of PAIR_FIELDS) { const t = b[k]; b[k] = o[k]; o[k] = t; } }
function withPairMate(b, fn) { swapPairFields(b); try { return fn(); } finally { swapPairFields(b); } }

// --- Starting a pair fight ---
const startBattleBeforePairs = startBattle;
startBattle = function (spawnId) {
  const spawn = state && rooms[state.room] ? roomSpawns(state.room).find(s => s.uid === spawnId) : null, mate = spawn && pairMateFor(state.room, spawn);
  const r = startBattleBeforePairs.apply(this, arguments), b = state && state.battle;
  if (!mate || !b || b.spawnId !== spawnId || b.pair) return r;
  const level = b.enemy.level, stats = enemyStats(mate, { level }), cut = e => { const k = pairScale(); e.maxHp = e.hp = Math.max(1, Math.round(e.hp * k.hp)); e.attack = Math.max(1, Math.round(e.attack * k.attack)); return e; };
  cut(b.enemy);
  const other = { enemy: cut({ ...enemies[mate], boss: false, elite: false, element: enemies[mate].element || null, level, name: enemies[mate].name, hp: stats.hp, maxHp: stats.hp, attack: stats.attack }), id: mate,
    freeze: 0, enemyDebuff: 0, burn: 0, burnTurns: 0, poison: 0 };
  b.pair = { other, names: [b.enemy.name, other.enemy.name] };
  b.patternShift = 0; other.patternShift = staggerShift(b);
  b.logs[0] = 'Encounter: ' + b.enemy.name + ' and ' + other.enemy.name;
  save(); renderBattle();
  if (!(state.tips || {}).pairs) pairGuide();
  return r;
};
function pairGuideHTML() {
  return '<div class="eyebrow">NEW · TWO ENEMIES AT ONCE</div><h2>⚔⚔ A pair</h2>'
    + '<p>From the Sky Isles on, some patrols travel in pairs (×2 on the map). Each of the two is weaker than a lone enemy, and the fight gives more XP.</p><ul>'
    + '<li><b>Both act every turn.</b> The two bubbles at the top show each one\'s next move.</li>'
    + '<li><b>Your cards hit your target</b> (gold outline). Click the other enemy\'s panel to switch target; you can switch any time on your turn.</li>'
    + '<li>Burn, Poison, Weaken, Freeze, Hack and the Prismatic Counter work on the target.</li>'
    + '<li>Block and Armor protect you from both. Defeat both to win; when one falls, the other fights on alone.</li></ul>'
    + '<p><button id="pairGuideOk" class="primary">Got it</button></p>';
}
function pairGuide() {
  state.tips = state.tips || {}; state.tips.pairs = true; save();
  if (typeof openMenu !== 'function') return;
  openMenu(pairGuideHTML()); const ok = typeof $ === 'function' && $('pairGuideOk'); if (ok) ok.onclick = closeMenu;
}

// --- Choosing the target ---
function pairSwitch() {
  const b = state && state.battle; if (!pairOn(b) || b.phase !== 'fight') return false;
  if (typeof siftPending === 'function' && siftPending(b)) { toast('Choose a card to discard first.'); return false; }
  swapPairFields(b); b.logs.push('🎯 Target: ' + b.enemy.name + '.'); save(); renderBattle(); return true;
}

// --- The other enemy acts (before the target, at the end of your turn) ---
function pairMateActs(b) {
  let lost = 0, swipe = false;
  withPairMate(b, () => {
    const e = b.enemy, dot = (b.poison || 0) + (b.burnTurns > 0 ? b.burn : 0);
    if (dot) { e.hp = Math.max(0, e.hp - dot); b.logs.push(e.name + ': Burn / poison ' + dot + '.'); }
    if (b.burnTurns > 0) b.burnTurns--;
    if (!(e.hp > 0)) { b.logs.push(e.name + ' falls.'); return; }
    if (b.freeze > 0) { b.freeze--; b.logs.push(e.name + ' is frozen and skips its move.'); return; }
    const plan = enemyPlan(b), shear = !!plan.shear, armor = shear ? 0 : scaledRank('plating');
    const hit = per => { const net = Math.max(0, per - armor), soak = Math.min(b.block || 0, net); b.block = (b.block || 0) - soak; return net - soak; };
    if (plan.kind === 'silenced') b.logs.push(e.name + ' is silenced.');
    else if (plan.kind === 'charge') {
      b.logs.push(e.name + ': ' + plan.name + '. A charged strike is coming.');
      if (plan.swipe) { const l = hit(plan.swipe); lost += l; swipe = true; b.swipeBy = { name: e.name, hurt: l }; b.logs.push('🗡 ' + e.name + ' swipes: ' + l + ' HP.'); }
    } else if (plan.kind === 'guard') { e.guard = 5; b.logs.push(e.name + ': Block 5 from next turn.'); }
    else if (plan.damage > 0) {
      if (plan.kind === 'elemental' && b.counter && COUNTERS[plan.element] === b.counter) { e.hp = Math.max(0, e.hp - 6); b.counter = null; b.logs.push('Prismatic Counter cancels ' + e.name + '\'s charged strike. 6 damage returned.'); }
      else {
        if (plan.rider === 'rend' && !b.rendProof) b.block = Math.floor((b.block || 0) / 2);
        let l = 0; for (let k = 0; k < (plan.hits || 1); k++) l += hit(plan.damage);
        lost += l; b.logs.push(e.name + ': ' + plan.name + ', ' + l + ' HP.');
        if (plan.rider === 'siphon' && l) e.hp = Math.min(e.maxHp, e.hp + l);
        if (plan.kind === 'elemental' && l > 0) {
          if (plan.element === 'fire') b.playerBurn = Math.max(b.playerBurn || 0, 2);
          if (plan.element === 'earth') b.playerPoison = Math.min(3, (b.playerPoison || 0) + 1);
          if (plan.element === 'water') b.drained = true;
          if (plan.element === 'air') b.exposed = 2;
        }
      }
    }
    if (plan.rider && AFFLICTIONS[plan.rider] && AFFLICTIONS[plan.rider].type === 'hex' && plan.kind !== 'silenced') applyHex(b, plan.rider);
    b.enemyDebuff = 0;
  });
  state.hp = Math.max(0, state.hp - lost);
  return { swipe };
}
const endTurnBeforePairs = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!pairOn(b) || b.phase !== 'fight') return endTurnBeforePairs.apply(this, arguments);
  const turn = b.turn, { swipe } = pairMateActs(b);
  if (!(b.pair.other.enemy.hp > 0)) b.logs.push('One down: ' + b.enemy.name + ' fights on alone.');
  if (!state.hp) { loseBattle(); save(); renderBattle(); return; }
  const r = endTurnBeforePairs.apply(this, arguments);
  if (swipe && state.battle === b && b.phase === 'fight' && b.turn > turn && b.hand.length) {
    b.siftPick = (b.siftPick || 0) + 1; b.siftDrawn = []; b.siftReason = 'swipe'; save(); renderBattle(); if (typeof swipePopup === 'function') swipePopup(b);
  }
  return r;
};
// The target falls: the other steps in, or the pair is beaten.
const winBattleBeforePairs = winBattle;
winBattle = function () {
  const b = state && state.battle;
  if (pairOn(b) && b.phase === 'fight' && !(b.enemy.hp > 0)) {
    const fallen = b.enemy.name; swapPairFields(b); b.pair.other.enemy.hp = 0;
    b.logs.push(fallen + ' falls! ' + b.enemy.name + ' fights on alone.'); save(); if (typeof renderBattle === 'function') renderBattle(); return;
  }
  return winBattleBeforePairs.apply(this, arguments);
};
const xpRewardBeforePairs = xpReward;
xpReward = function (b) { const xp = xpRewardBeforePairs.apply(this, arguments); return b && b.pair ? Math.round(xp * PAIR.xp) : xp; };

// --- The battle screen: two enemy panels side by side, one intent bubble each ---
const renderBattleBeforePairs = renderBattle;
renderBattle = function () {
  renderBattleBeforePairs.apply(this, arguments);
  const b = state && state.battle; if (!b || !b.pair || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelector) return;
  const m = document.getElementById('battleModal'), side = m && m.querySelector('.compact-side.enemy'); if (!side || !side.parentNode || !side.parentNode.insertBefore) return;
  side.classList.add('pair-target');
  const o = b.pair.other.enemy, alive = o.hp > 0;
  const mate = document.createElement('button'); mate.type = 'button'; mate.className = 'pair-mate' + (alive ? '' : ' fallen');
  mate.innerHTML = '<span class="pm-info"><b>' + o.name + '</b><span class="meter enemy"><span style="width:' + (o.hp / o.maxHp * 100) + '%"></span><i class="meter-label">' + o.hp + '/' + o.maxHp + '</i></span>'
    + '<small>' + (alive ? '<span class="pm-long">🎯 Click to target</span><span class="pm-short">🎯 Target</span>' + (o.armor ? ' · 🛡 ' + o.armor : '') + (o.guard ? ' · ◈ ' + o.guard : '') + (b.pair.other.poison ? ' · ☣ ' + b.pair.other.poison : '') + (b.pair.other.burnTurns > 0 ? ' · 🔥' : '') : 'Defeated') + '</small></span>';
  mate.disabled = !alive; mate.onclick = () => pairSwitch();
  const wrap = document.createElement('div'); wrap.className = 'pair-row'; side.parentNode.insertBefore(wrap, side); wrap.append(side, mate);
  if (alive) {
    const box = m.querySelector('.intent .intent-bubbles') || m.querySelector('.intent');
    const bubbles = box && box.querySelectorAll ? box.querySelectorAll('.intent-bubble') : [];
    if (bubbles.length >= 2) {
      const mine = intentBubble(enemyPlan(b), 'now', b.enemy.name + ' (target), next turn:', b.freeze > 0);
      const theirs = withPairMate(b, () => intentBubble(enemyPlan(b), 'now', b.enemy.name + ', next turn:', b.freeze > 0));
      bubbles[0].outerHTML = mine; bubbles[1].outerHTML = theirs;
    }
  }
};
// The map: a pair patrol shows its partner beside it and ×2 in its name.
const renderWorldBeforePairs = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforePairs.apply(this, arguments);
  if (!state || !rooms[state.room] || typeof document === 'undefined' || !document.querySelectorAll) return out;
  const spawns = roomSpawns(state.room);
  document.querySelectorAll('#world .enemy-node').forEach(node => {
    const s = spawns.find(x => x.uid === (node.dataset && node.dataset.spawn)), mate = s && pairMateFor(state.room, s);
    if (!mate || node.querySelector('.pair-ghost')) return;
    node.dataset.name = '×2 · ' + node.dataset.name.replace(/ · Lv\./, ' + ' + enemies[mate].name + ' · Lv.');
    const g = document.createElement('span'); g.className = 'pair-ghost'; g.innerHTML = monsterArt(mate); node.append(g); node.classList.add('pair-node');
  });
  return out;
};
// The patrol loop turns the leader's sprite (its --enemy-facing); the partner follows on the far side.
if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined' && document.querySelectorAll) {
  const followFacing = () => {
    document.querySelectorAll('#world .enemy-node.pair-node').forEach(n => {
      const lead = n.querySelector('.monster-sprite'), f = lead && lead.style.getPropertyValue('--enemy-facing');
      if (f && n.dataset.facing !== f) { n.dataset.facing = f; n.style.setProperty('--enemy-facing', f); }
    });
    requestAnimationFrame(followFacing);
  };
  requestAnimationFrame(followFacing);
}
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .pair-row{display:flex;gap:6px;min-width:0}#battleModal .pair-row>.compact-side.enemy{flex:1 1 60%;min-width:0;outline:2px solid #f5c86a;outline-offset:-2px;border-radius:10px}'
    + '#battleModal .pair-mate{flex:1 1 40%;min-width:0;display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid #6d4a4a;border-radius:10px;background:#1a1016cc;color:#f3e4e4;text-align:left;cursor:pointer;font:inherit}'
    + '#battleModal .pair-mate:hover:not(:disabled){border-color:#f5c86a}#battleModal .pair-mate.fallen{opacity:.45;cursor:default}'
    + '#battleModal .pair-mate .pm-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}#battleModal .pair-mate b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#battleModal .pair-mate small{font-size:10px;color:#e8c9a0}'
    + '#battleModal .pair-mate .meter{height:12px}#battleModal .pair-mate .pm-short{display:none}'
    + '@media(max-width:560px){#battleModal .pair-row>.compact-side.enemy{flex-basis:55%}#battleModal .pair-mate{flex-basis:45%;padding:4px}#battleModal .pair-mate b{font-size:11px;white-space:normal;line-height:1.15}#battleModal .pair-mate .pm-long{display:none}#battleModal .pair-mate .pm-short{display:inline}}'
    + '.enemy-node .pair-ghost{position:absolute;left:0;top:6%;width:100%;height:100%;pointer-events:none;transform:translateX(calc(var(--enemy-facing,1) * (-100% - 4px)));transition:transform .7s ease-in-out}' // Round 287: the partner walks round to its new side instead of jumping when the pair turns
    + '@media(prefers-reduced-motion:reduce){.enemy-node .pair-ghost{transition:none}}';
  document.head.append(st);
}
