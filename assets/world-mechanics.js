'use strict';
// =====================================================================
// Round 185: every world has its own card mechanic, like Chronospire's ⏳ Suspend.
//   Neon Aftermath  ⌁ Hack        cards add Glitch to the enemy; at the limit it crashes and skips its next action.
//   Solaris         ☀ Heat        cards build Heat; your next attack sears for 2 per Heat.
//   Sky Isles       🪶 Tailwind   cards hit harder for every card you already played this turn.
//   Elaris          🌱 Growth     cards grow stronger each time you play them in a fight.
//   Vespera         ⚡ Stormcharge cards store lightning; it strikes back when the enemy attacks you.
//   Chronospire     ⏳ Suspend    (assets/chronospire.js).
// Each world drops its own mechanic cards, gives two of them when you first arrive (Neon
// Aftermath: after your first win), shows a tray in battle with a short guide, and has enemies
// with an affliction that works against it.
// =====================================================================
const HACK_LIMIT = 5, HACK_PATCH = 2; // a crash patches the enemy: the next crash needs 2 more Glitch
const HEAT_MAX = 6, HEAT_SEAR = 2;
const TAILWIND_MAX = 4;
const GROW_MAX = 4;
const STORMCHARGE_MAX = 20;

// --- Cards ---
// Neon Aftermath: Hack
tieredCard('packetSniff', 'Packet Sniff', 1, 'Attack', '⌁', [{ damage: 5, hack: 2 }, { damage: 6, hack: 2 }, { damage: 8, hack: 2 }, { damage: 9, hack: 3 }]);
tieredCard('logicBomb', 'Logic Bomb', 2, 'Attack', '✷', [{ damage: 9, hack: 3 }, { damage: 11, hack: 3 }, { damage: 13, hack: 3 }, { damage: 15, hack: 4 }]);
tieredCard('ghostProtocol', 'Ghost Protocol', 1, 'Defense', '◌', [{ block: 6, hack: 1 }, { block: 7, hack: 1 }, { block: 9, hack: 2 }, { block: 11, hack: 2 }]);
tieredCard('zeroDay', 'Zero Day', 0, 'Skill', '⌘', [{ hack: 2 }, { hack: 2, draw: 1 }, { hack: 3 }, { hack: 3, draw: 1 }], { exhaust: true });
// Solaris: Heat
tieredCard('sunstoke', 'Sunstoke', 1, 'Skill', '♨', [{ heat: 2, block: 3 }, { heat: 2, block: 4 }, { heat: 3, block: 4 }, { heat: 3, block: 6 }]);
tieredCard('scorchingSands', 'Scorching Sands', 1, 'Fire Attack', '☀', [{ damage: 4, heat: 2 }, { damage: 5, heat: 2 }, { damage: 6, heat: 3 }, { damage: 7, heat: 3 }], { element: 'fire' });
tieredCard('heatwave', 'Heatwave', 0, 'Skill', '〰', [{ heat: 1, draw: 1 }, { heat: 2, draw: 1 }, { heat: 2, draw: 1 }, { heat: 3, draw: 1 }]);
tieredCard('noonBlaze', 'Noon Blaze', 2, 'Fire Attack', '✺', [{ damage: 9, sear: 3 }, { damage: 11, sear: 3 }, { damage: 13, sear: 3 }, { damage: 15, sear: 4 }], { element: 'fire' });
// Sky Isles: Tailwind
tieredCard('gustChain', 'Gust Chain', 1, 'Air Attack', '🌪', [{ damage: 4, tailwind: { damage: 2 } }, { damage: 5, tailwind: { damage: 2 } }, { damage: 6, tailwind: { damage: 3 } }, { damage: 7, tailwind: { damage: 3 } }], { element: 'air' });
tieredCard('slipstream', 'Slipstream', 0, 'Skill', '〜', [{ draw: 1 }, { draw: 1, block: 2 }, { draw: 2 }, { draw: 2, block: 3 }], { hint: '🪶 Free, and it still adds Tailwind.' });
tieredCard('windWall', 'Wind Wall', 1, 'Defense', '⌓', [{ block: 4, tailwind: { block: 2 } }, { block: 5, tailwind: { block: 2 } }, { block: 6, tailwind: { block: 3 } }, { block: 7, tailwind: { block: 3 } }]);
tieredCard('skydive', 'Skydive', 2, 'Air Attack', '⇩', [{ damage: 8, tailwind: { damage: 3 } }, { damage: 9, tailwind: { damage: 3 } }, { damage: 11, tailwind: { damage: 4 } }, { damage: 13, tailwind: { damage: 4 } }], { element: 'air' });
// Elaris: Growth
tieredCard('saplingStrike', 'Sapling Strike', 1, 'Earth Attack', '🌱', [{ damage: 5, grow: { damage: 3 } }, { damage: 6, grow: { damage: 3 } }, { damage: 7, grow: { damage: 4 } }, { damage: 8, grow: { damage: 5 } }], { element: 'earth' });
tieredCard('barkskin', 'Barkskin', 1, 'Defense', '🛡', [{ block: 5, grow: { block: 3 } }, { block: 6, grow: { block: 3 } }, { block: 7, grow: { block: 4 } }, { block: 8, grow: { block: 5 } }]);
tieredCard('bloomMend', 'Bloom Mend', 1, 'Healing', '✿', [{ heal: 3, grow: { heal: 2 } }, { heal: 4, grow: { heal: 2 } }, { heal: 5, grow: { heal: 3 } }, { heal: 6, grow: { heal: 3 } }]);
tieredCard('ancientOak', 'Ancient Oak', 2, 'Earth Attack', '🌲', [{ damage: 8, grow: { damage: 4 } }, { damage: 9, grow: { damage: 5 } }, { damage: 11, grow: { damage: 5 } }, { damage: 12, grow: { damage: 6 } }], { element: 'earth' });
// Vespera: Stormcharge
tieredCard('staticCoil', 'Static Coil', 1, 'Defense', '➰', [{ block: 5, stormcharge: 4 }, { block: 6, stormcharge: 5 }, { block: 7, stormcharge: 6 }, { block: 9, stormcharge: 7 }]);
tieredCard('capacitorSpark', 'Capacitor Spark', 1, 'Lightning Attack', '⚡', [{ damage: 4, stormcharge: 3 }, { damage: 5, stormcharge: 4 }, { damage: 6, stormcharge: 5 }, { damage: 7, stormcharge: 6 }], { element: 'lightning' });
tieredCard('thunderhead', 'Thunderhead', 2, 'Skill', '☁', [{ stormcharge: 9, block: 4 }, { stormcharge: 11, block: 4 }, { stormcharge: 13, block: 5 }, { stormcharge: 15, block: 6 }]);
tieredCard('lightningRod', 'Lightning Rod', 1, 'Lightning Attack', '⫯', [{ discharge: 2 }, { discharge: 3 }, { discharge: 4 }, { discharge: 6 }], { element: 'lightning', pierce: true });

const WORLD_MECHANICS = {
  city: { key: 'hack', name: 'Hack', icon: '⌁', color: '#5ff2e0', cards: ['packetSniff', 'logicBomb', 'ghostProtocol', 'zeroDay'], gift: ['packetSniff', 'ghostProtocol'], world: 'Neon Aftermath',
    tagline: 'A RUINED CITY STILL RUNNING ON BROKEN CODE',
    steps: ['<b>⌁ Hack cards add Glitch to the enemy.</b> The tray shows how much it has.', '<b>At ' + HACK_LIMIT + ' Glitch it crashes</b> and skips its next action.', '<b>Each crash patches it:</b> the next crash needs ' + HACK_PATCH + ' more Glitch.'],
    tip: 'Enemies with <b>🛡 Firewall</b> wipe their Glitch and patch themselves.' },
  elaris: { key: 'heat', name: 'Heat', icon: '☀', color: '#ffb347', cards: ['sunstoke', 'scorchingSands', 'heatwave', 'noonBlaze'], gift: ['sunstoke', 'scorchingSands'], world: 'Solaris',
    tagline: 'A DESERT UNDER A SUN THAT NEVER SETS',
    steps: ['<b>☀ Heat cards build Heat</b>, up to ' + HEAT_MAX + '. It lasts between turns.', '<b>Your next attack sears</b> for ' + HEAT_SEAR + ' extra damage per Heat and uses it all up.', '<b>Build first, then strike:</b> 6 Heat is 12 extra damage on one hit.'],
    tip: 'Enemies with <b>🥵 Sunstroke</b> burn off your Heat and hurt you for it.' },
  sky: { key: 'tailwind', name: 'Tailwind', icon: '🪶', color: '#9fd8ff', cards: ['gustChain', 'slipstream', 'windWall', 'skydive'], gift: ['gustChain', 'slipstream'], world: 'the Sky Isles',
    tagline: 'ISLANDS RIDING THE WIND ABOVE THE CLOUDS',
    steps: ['<b>Every card you play adds 1 Tailwind</b> for the rest of the turn.', '<b>🪶 Tailwind cards get a bonus</b> for each card you already played this turn (up to ' + TAILWIND_MAX + ').', '<b>Play cheap cards first</b>, then finish with a Tailwind card.'],
    tip: 'Enemies with <b>🌬 Headwind</b> make your first 2 cards next turn add no Tailwind.' },
  wilds: { key: 'growth', name: 'Growth', icon: '🌱', color: '#8be36b', cards: ['saplingStrike', 'barkskin', 'bloomMend', 'ancientOak'], gift: ['saplingStrike', 'barkskin'], world: 'Elaris',
    tagline: 'AN OLD FOREST THAT KEEPS ON GROWING',
    steps: ['<b>🌱 Growth cards grow each time you play them</b> in a fight.', '<b>They keep their growth for the whole fight</b>, up to ' + GROW_MAX + ' times.', '<b>Play them early and often:</b> they get stronger every time they come back.'],
    tip: 'Enemies with <b>🍂 Blight</b> wither your most-grown card back to its start.' },
  vespera: { key: 'stormcharge', name: 'Stormcharge', icon: '⚡', color: '#c5a8ff', cards: ['staticCoil', 'capacitorSpark', 'thunderhead', 'lightningRod'], gift: ['staticCoil', 'capacitorSpark'], world: 'Vespera',
    tagline: 'A STORM COAST WHERE THE AIR CRACKLES',
    steps: ['<b>⚡ Stormcharge cards store charge</b>, up to ' + STORMCHARGE_MAX + '. It lasts between turns.', '<b>When the enemy attacks you, it all strikes back</b> as damage that ignores Armor.', '<b>Lightning Rod</b> lets it out on your own turn instead.'],
    tip: 'Enemies with <b>⏚ Dampen</b> drain half your Stormcharge.' }
};
function worldMechanic(region = activeRegion) { return WORLD_MECHANICS[region] || null; }
function mechanicOfCard(id) { return Object.values(WORLD_MECHANICS).find(m => m.cards.includes(id)) || null; }

Object.assign(VARIETY_POOLS, {
  city: [...VARIETY_POOLS.city, ...WORLD_MECHANICS.city.cards],
  elaris: [...VARIETY_POOLS.elaris, ...WORLD_MECHANICS.elaris.cards],
  sky: [...VARIETY_POOLS.sky, ...WORLD_MECHANICS.sky.cards],
  wilds: [...VARIETY_POOLS.wilds, ...WORLD_MECHANICS.wilds.cards],
  vespera: [...VARIETY_POOLS.vespera, ...WORLD_MECHANICS.vespera.cards]
});
for (const [w, m] of Object.entries(WORLD_MECHANICS)) for (const id of m.cards) NEW_CARD_WORLD[id] = w;

// --- Battle state ---
function hackLimit(b) { return HACK_LIMIT + (b.patch || 0); }
function tailwindCount(b, c) { const self = c && b.playingUid != null && b.playingUid === c.uid ? 1 : 0; return Math.max(0, Math.min(TAILWIND_MAX, (b.tailwind || 0) - self - (b.headwindNow || 0))); }
function growthOf(b, c) { const self = b && b.playingUid != null && b.playingUid === c.uid ? 1 : 0; return Math.max(0, Math.min(GROW_MAX, (((b && b.growth) || {})[c.uid] || 0) - self)); }
function addBonus(out, bonus, n) { for (const [k, v] of Object.entries(bonus)) out[k] = (out[k] || 0) + v * n; }

// Tailwind and Growth change the card's numbers, so the card face shows the live value.
const statBeforeMechanics = stat;
stat = function (c) {
  const d = statBeforeMechanics(c), b = typeof state === 'object' && state && state.battle;
  if (!b || !c || !(d.tailwind || d.grow || d.discharge !== undefined)) return d;
  const out = { ...d };
  if (d.tailwind) addBonus(out, d.tailwind, tailwindCount(b, c));
  if (d.grow) addBonus(out, d.grow, growthOf(b, c));
  if (d.discharge !== undefined) out.damage = (b.stormcharge || 0) + d.discharge;
  return out;
};
const bonusWords = o => Object.entries(o).map(([k, v]) => '+' + v + ' ' + (k === 'damage' ? 'damage' : k === 'block' ? 'Block' : k === 'heal' ? 'healing' : k)).join(', ');
const rulesBeforeMechanics = rules;
rules = function (c) {
  let text = rulesBeforeMechanics(c);
  const def = defs[c && c.id]; if (!def || !def.tiers) return text;
  const t = def.tiers[c.level || 0] || def.tiers[0];
  if (t.discharge !== undefined) text = text.replace(/Deal \d+ damage\.( Pierce: ignores enemy armor\.)?/, '').trim() + ' ⚡ Discharge: deal your Stormcharge + ' + t.discharge + ' damage (ignores Armor), using it all up.';
  if (t.hack) text += ' ⌁ Hack ' + t.hack + ': the enemy gains ' + t.hack + ' Glitch (it crashes at ' + HACK_LIMIT + ').';
  if (t.heat) text += ' ☀ Heat ' + t.heat + ': your next attack sears for ' + HEAT_SEAR + ' per Heat.';
  if (t.sear) text += ' ☀ Sears for ' + t.sear + ' per Heat instead of ' + HEAT_SEAR + '.';
  if (t.tailwind) text += ' 🪶 Tailwind: ' + bonusWords(t.tailwind) + ' for each card you already played this turn (up to ' + TAILWIND_MAX + ').';
  if (t.grow) text += ' 🌱 Grows ' + bonusWords(t.grow) + ' each time you play it this fight (up to ' + GROW_MAX + ' times).';
  if (def.hint) text += ' ' + def.hint;
  if (t.stormcharge) text += ' ⚡ Stormcharge ' + t.stormcharge + ': strikes back when the enemy attacks you.';
  return text.replace(/\s+/g, ' ').trim();
};

const cardEffectBeforeMechanics = cardEffect;
cardEffect = function (c, empowered, doubleAttack) {
  const b = state.battle, d = stat(c);
  cardEffectBeforeMechanics(c, empowered, doubleAttack);
  if (state.battle !== b) return;
  // Heat: an attack spends the Heat built before it, then the card adds its own.
  if (d.damage > 0 && b.heat > 0 && b.enemy.hp > 0) {
    const sear = b.heat * (d.sear || HEAT_SEAR);
    b.enemy.hp = Math.max(0, b.enemy.hp - sear); b.logs.push('☀ Heat ' + b.heat + ': ' + d.name + ' sears for ' + sear + '.'); b.heat = 0;
  }
  if (d.heat) b.heat = Math.min(HEAT_MAX, (b.heat || 0) + d.heat);
  if (d.hack && b.enemy.hp > 0) {
    b.glitch = (b.glitch || 0) + d.hack;
    if (b.glitch >= hackLimit(b)) {
      b.freeze = Math.max(b.freeze || 0, 1); b.glitch = 0; b.patch = (b.patch || 0) + HACK_PATCH; b.crashes = (b.crashes || 0) + 1;
      b.logs.push('⌁ System crash! ' + b.enemy.name + ' skips its next action (next crash needs ' + hackLimit(b) + ' Glitch).');
    } else b.logs.push('⌁ Glitch ' + b.glitch + '/' + hackLimit(b) + '.');
  }
  if (d.discharge !== undefined) { if (b.stormcharge) b.logs.push('⚡ Discharge: ' + b.stormcharge + ' Stormcharge released.'); b.stormcharge = 0; }
  if (d.stormcharge) b.stormcharge = Math.min(STORMCHARGE_MAX, (b.stormcharge || 0) + d.stormcharge);
};

// Tailwind counts cards played this turn; Growth counts plays of each card this fight. Both are
// counted before the card resolves (so the tray is right when the battle redraws) and the card
// being played reads the count from before it (b.playingUid).
const playCardBeforeMechanics = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i];
  if (!c || b.playingUid != null) return playCardBeforeMechanics(i);
  const grows = !!(defs[c.id] && (defs[c.id].tiers[c.level || 0] || {}).grow), g0 = grows ? ((b.growth || {})[c.uid] || 0) : 0;
  b.tailwind = (b.tailwind || 0) + 1; if (grows) { b.growth ||= {}; b.growth[c.uid] = Math.min(GROW_MAX, g0 + 1); }
  b.playingUid = c.uid;
  let r; try { r = playCardBeforeMechanics(i); } finally { b.playingUid = null; }
  if (b.hand.includes(c)) { b.tailwind--; if (grows) b.growth[c.uid] = g0; } // not played after all
  return r;
};

// Stormcharge strikes back when an enemy attack lands; Tailwind resets each turn.
const endTurnBeforeMechanics = endTurn;
endTurn = function () {
  const b = state && state.battle; if (!b || b.phase !== 'fight') return endTurnBeforeMechanics();
  const plan = enemyPlan(b), turn = b.turn;
  const countered = plan.kind === 'elemental' && b.counter && COUNTERS[plan.element] === b.counter;
  const attacks = !(b.freeze > 0) && plan.kind !== 'silenced' && !countered && plan.damage > 0;
  endTurnBeforeMechanics();
  if (state.battle !== b || b.phase !== 'fight') return;
  if (b.turn > turn) { b.tailwind = 0; b.headwindNow = b.headwind || 0; b.headwind = 0; }
  if (attacks && b.stormcharge > 0 && b.enemy.hp > 0) {
    const zap = b.stormcharge; b.stormcharge = 0; b.enemy.hp = Math.max(0, b.enemy.hp - zap);
    b.logs.push('⚡ Stormcharge strikes back for ' + zap + '.'); b.zapped = { turn: b.turn, dealt: zap };
    if (!b.enemy.hp) winBattle();
    save(); renderBattle();
  }
};

// --- Afflictions that work against each mechanic ---
Object.assign(AFFLICTIONS, {
  firewall:  { name: 'Firewall', icon: '🛡', type: 'hex', desc: () => 'Firewall: the enemy wipes its Glitch and patches itself (its next crash needs 1 more Glitch).', answer: ['dispel', 'anchor'] },
  sunstroke: { name: 'Sunstroke', icon: '🥵', type: 'hex', amount: [2, 2, 3, 3, 4, 4], desc: n => 'Sunstroke: you lose all your Heat and 1 HP for each. With no Heat, you lose ' + n + ' HP.', answer: ['purify', 'anchor'] },
  headwind:  { name: 'Headwind', icon: '🌬', type: 'hex', desc: () => 'Headwind: your first 2 cards next turn add no Tailwind.', answer: ['purify', 'anchor'] },
  blight:    { name: 'Blight', icon: '🍂', type: 'hex', amount: [2, 2, 3, 3, 4, 4], desc: n => 'Blight: your most-grown card loses its Growth. If nothing has grown, you lose ' + n + ' HP.', answer: ['purify', 'anchor'] },
  dampen:    { name: 'Dampen', icon: '⏚', type: 'hex', desc: () => 'Dampen: half your Stormcharge drains away. With none stored, you lose 1 Aether.', answer: ['purify', 'anchor'] }
});
Object.assign(ENEMY_AFFLICTIONS, {
  crownEye: ['firewall'], crownSentinel: ['firewall', 'empower'],
  cinderFox: ['sunstroke'], galeSovereign: ['barrage', 'sunstroke'],
  skyWisp: ['headwind'], featherMatriarch: ['siphon', 'headwind'],
  elarisMoth: ['blight'], galeSovereignElaris: ['barrage', 'blight'],
  vespWisp: ['dampen'], resonantPhantom: ['dampen', 'siphon']
});
const applyHexBeforeMechanics = applyHex;
applyHex = function (b, id) {
  const n = AFFLICTIONS[id] && AFFLICTIONS[id].amount ? afflictionAmount(id) : 0, hurt = k => { const loss = Math.max(0, Math.min(k, state.hp - 1)); state.hp -= loss; return loss; };
  if (id === 'firewall') { b.glitch = 0; b.patch = (b.patch || 0) + 1; b.logs.push('🛡 Firewall: Glitch wiped; the next crash needs ' + hackLimit(b) + '.'); }
  else if (id === 'sunstroke') { const h = b.heat || 0; b.heat = 0; b.logs.push(h ? '🥵 Sunstroke: your ' + h + ' Heat burns off, −' + hurt(h) + ' HP.' : '🥵 Sunstroke: −' + hurt(n) + ' HP.'); }
  else if (id === 'headwind') { b.headwind = 2; b.logs.push('🌬 Headwind: your first 2 cards next turn add no Tailwind.'); }
  else if (id === 'blight') {
    const top = Object.entries(b.growth || {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])[0];
    if (top) { b.growth[top[0]] = 0; const card = [...b.hand, ...b.draw, ...b.discard].find(c => String(c.uid) === top[0]); b.logs.push('🍂 Blight: ' + (card ? stat(card).name : 'your card') + ' withers back to its start.'); }
    else b.logs.push('🍂 Blight: −' + hurt(n) + ' HP.');
  } else if (id === 'dampen') {
    if (b.stormcharge > 0) { const cut = Math.ceil(b.stormcharge / 2); b.stormcharge -= cut; b.logs.push('⏚ Dampen: ' + cut + ' Stormcharge drains away.'); }
    else { b.aether = Math.max(0, (b.aether || 0) - 1); b.logs.push('⏚ Dampen: no Stormcharge — you lose 1 Aether.'); }
  } else return applyHexBeforeMechanics(b, id);
};

// --- Battle UI: a tray for the mechanic you are using, with a short guide ---
function mechanicGuideHTML(m, closeId) {
  return '<div class="mech-guide" role="note"><div class="mg-head"><b>' + m.icon + ' How ' + m.name + ' works</b>' + (closeId ? '<button id="' + closeId + '" class="ability small">Got it</button>' : '') + '</div>'
    + '<ol class="mg-steps">' + m.steps.map((s, i) => '<li><span class="mg-n">' + (i + 1) + '</span><div>' + s + '</div></li>').join('') + '</ol><p class="mg-tip">' + m.tip + '</p></div>';
}
function mechanicReadout(m, b) {
  if (m.key === 'hack') return [(b.glitch || 0) + '/' + hackLimit(b), 'Glitch on the enemy', b.crashes ? 'crashed ' + b.crashes + '×' : 'crashes at ' + hackLimit(b)];
  if (m.key === 'heat') return [(b.heat || 0) + '/' + HEAT_MAX, 'Heat', b.heat ? 'next attack sears +' + b.heat * HEAT_SEAR : 'build Heat, then attack'];
  if (m.key === 'tailwind') return [String(tailwindCount(b)), 'Tailwind this turn', b.headwindNow && (b.tailwind || 0) < b.headwindNow ? '🌬 Headwind: ' + (b.headwindNow - (b.tailwind || 0)) + ' more card' + (b.headwindNow - (b.tailwind || 0) > 1 ? 's' : '') + ' add nothing' : 'resets when you end your turn'];
  if (m.key === 'growth') { const best = Math.max(0, ...Object.values(b.growth || {})); return [String(best), 'most growth', 'cards grow each time you play them'] }
  if (m.key === 'stormcharge') return [(b.stormcharge || 0) + '/' + STORMCHARGE_MAX, 'Stormcharge', b.zapped && b.zapped.turn === b.turn ? 'just struck back for ' + b.zapped.dealt : 'strikes back when you are attacked'];
  return ['', '', ''];
}
function mechanicActive(m, b) {
  if (b.hand.some(c => m.cards.includes(c.id))) return true;
  if (m.key === 'hack') return b.glitch > 0 || b.crashes > 0;
  if (m.key === 'heat') return b.heat > 0;
  if (m.key === 'tailwind') return false;
  if (m.key === 'growth') return Object.values(b.growth || {}).some(v => v > 0);
  if (m.key === 'stormcharge') return b.stormcharge > 0 || !!(b.zapped && b.zapped.turn === b.turn);
  return false;
}
const renderBattleBeforeMechanics = renderBattle;
renderBattle = function () {
  renderBattleBeforeMechanics();
  const b = state && state.battle; if (!b || b.phase !== 'fight') return;
  const m = $('battleModal'); if (!m || !m.querySelector) return;
  state.tips ||= {}; b.mechHelp ||= {};
  for (const mech of Object.values(WORLD_MECHANICS)) {
    if (!mechanicActive(mech, b)) continue;
    // One guide opens by itself at a time (the first time you hold that mechanic's cards).
    if (b.hand.some(c => mech.cards.includes(c.id)) && !state.tips[mech.key] && !Object.values(b.mechHelp).some(Boolean)) { state.tips[mech.key] = true; b.mechHelp[mech.key] = true; save(); }
    const [big, label, note] = mechanicReadout(mech, b), box = document.createElement('div');
    box.className = 'mech-tray'; box.style.setProperty('--mc', mech.color); box.dataset.mechanic = mech.key;
    box.innerHTML = '<div class="mt-head"><span class="mt-count">' + big + '</span><div class="mt-text"><b>' + mech.icon + ' ' + mech.name + ' · ' + label + '</b><small>' + note + '</small></div><button class="ability small mt-help">How ' + mech.name + ' works</button></div>';
    const anchor = m.querySelector('.hand-title'); if (anchor && anchor.before) anchor.before(box); else m.append(box);
    // Round 187: the guide goes below the hand, so the cards stay on screen (phones especially).
    if (b.mechHelp[mech.key]) {
      const guide = document.createElement('div'); guide.className = 'mech-tray mech-guide-box'; guide.style.setProperty('--mc', mech.color); guide.dataset.mechanicGuide = mech.key;
      guide.innerHTML = mechanicGuideHTML(mech, 'mechClose-' + mech.key);
      const handArea = m.querySelector('.hand-row') || ($('hand') && $('hand').parentNode === m ? $('hand') : null);
      if (handArea && handArea.after) handArea.after(guide); else m.append(guide);
    }
    const help = box.querySelector('.mt-help'); if (help) help.onclick = () => { const open = !b.mechHelp[mech.key]; for (const k in b.mechHelp) b.mechHelp[k] = false; b.mechHelp[mech.key] = open; renderBattle(); if (open) { const g = m.querySelector('[data-mechanic-guide="' + mech.key + '"]'); if (g && g.scrollIntoView) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
    const close = $('mechClose-' + mech.key); if (close) close.onclick = () => { b.mechHelp[mech.key] = false; renderBattle(); };
  }
  // Round 238: the mechanic tag now sits on the card itself, after its description (cardHTML below),
  // so it shows in the deck viewer too; it replaces Round 229's badge above the card.
};
// Round 238 (owner request): every mechanic card names its mechanic right after its description, as a
// small pill, wherever the card is drawn (hand, Deck screen, rewards). In battle a Growth card's pill
// shows how much it has grown.
const cardHTMLBeforeMechanics = cardHTML;
cardHTML = function (c) {
  const html = cardHTMLBeforeMechanics.apply(this, arguments), mech = c && mechanicOfCard(c.id);
  if (!mech) return html;
  const b = typeof state === 'object' && state && state.battle, g = b && mech.key === 'growth' && b.hand && b.hand.some(x => x.uid === c.uid) ? growthOf(b, c) : 0;
  const tag = '<span class="mech-tag" style="--mc:' + mech.color + '">' + mech.icon + ' ' + mech.name.toUpperCase() + (g ? ' +' + g : '') + '</span>';
  return html.replace('</span><span class="upgrade-row">', tag + '</span><span class="upgrade-row">');
};
const mechStyles = document.createElement('style');
mechStyles.textContent = '.mech-tray{margin:8px 0;padding:8px 10px;border:1px solid var(--mc);border-radius:12px;background:linear-gradient(135deg,#101a26,#0a1018);box-shadow:inset 0 0 0 1px #ffffff0d,0 0 14px color-mix(in srgb,var(--mc) 25%,transparent);color:#e6eef6}'
  + '.mt-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.mt-head button{margin-left:auto}.mt-count{display:grid;place-items:center;min-width:44px;height:34px;padding:0 8px;border-radius:999px;background:var(--mc);color:#0a1018;font:900 16px system-ui;box-shadow:0 0 10px color-mix(in srgb,var(--mc) 60%,transparent)}'
  + '.mt-text{display:flex;flex-direction:column;line-height:1.25}.mt-text b{font:800 13px system-ui;color:#fff}.mt-text small{font:600 11px system-ui;color:#b8c8d8}'
  + '.mech-guide{margin-top:8px;padding:10px 12px;border-radius:10px;background:#070c12;border:1px dashed var(--mc)}.mg-head{display:flex;align-items:center;justify-content:space-between}.mg-head b{color:var(--mc);font:800 14px system-ui}'
  + '.mg-steps{list-style:none;margin:8px 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}.mg-steps li{display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:8px;background:#121c28;font:13px/1.35 system-ui;color:#e6eef6}'
  + '.mg-n{flex:0 0 auto;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--mc);color:#0a1018;font:900 13px system-ui}.mg-tip{margin:0;font:12px/1.35 system-ui;color:#b8c8d8}'
  + '.mech-tag{display:inline-block;margin:2px 0 0 4px;padding:1px 6px;border-radius:999px;background:var(--mc);color:#0a1018;font:900 9px/1.4 system-ui;letter-spacing:.06em;vertical-align:middle;white-space:nowrap;box-shadow:0 0 6px color-mix(in srgb,var(--mc) 60%,transparent)}'
  + '.menu-mech .mech-guide{--mc:inherit}';
document.head.append(mechStyles);

// --- Arrival: two of the world's mechanic cards and the guide ---
function mechanicGift(region, withMenu = true) {
  const m = WORLD_MECHANICS[region]; if (!m || !state) return false;
  state.mechGifts ||= {}; if (state.mechGifts[region]) return false;
  state.mechGifts[region] = true;
  const placed = 0; // Round 233: gifts go to the collection; the player chooses what goes in the deck
  for (const id of m.gift) { const c = make(id); c.soulbound = false; state.pool.push(c); }
  save();
  if (withMenu) mechanicIntro(region, placed);
  else { state.pendingMechIntro = { region, placed }; save(); } // Round 187: shown once the reward screen closes
  return { placed };
}
// Where the gift went, in words (Round 233: always the collection; the player adds them from Deck).
function giftPlacement(m) {
  const names = m.gift.map(id => '<b>' + defs[id].name + '</b>').join(' and ');
  return 'You found ' + names + '. They are in your collection: open <b>Deck</b> to add them.';
}
function mechanicIntro(region, placed) {
  const m = WORLD_MECHANICS[region]; if (!m) return;
  state.tips ||= {}; state.tips[m.key] = true; save();
  openMenu('<div class="eyebrow">' + m.world.replace(/^the /, '').toUpperCase() + ' · ' + m.tagline + '</div><h2>' + m.icon + ' New mechanic: ' + m.name + '</h2><p>' + giftPlacement(m) + '</p><div class="menu-mech" style="--mc:' + m.color + '">' + mechanicGuideHTML(m) + '</div><p><button id="mechOk" class="primary">Got it</button></p>');
  const ok = $('mechOk'); if (ok) ok.onclick = closeMenu;
}
const finishBattleBeforeMechanics = finishBattle;
finishBattle = function () {
  finishBattleBeforeMechanics.apply(this, arguments);
  const p = state && !state.battle && state.pendingMechIntro;
  if (p) { state.pendingMechIntro = null; mechanicIntro(p.region, p.placed); }
};
const travelPortalBeforeMechanics = travelPortal;
travelPortal = function () {
  const from = state && state.region;
  travelPortalBeforeMechanics();
  if (state && state.region !== from && !state.battle) mechanicGift(state.region);
};
// Neon Aftermath: the Hack cards come with your first win.
const winBattleBeforeMechanics = winBattle;
winBattle = function () {
  const b = state.battle, fresh = b && b.phase === 'fight';
  winBattleBeforeMechanics();
  if (fresh && activeRegion === 'city' && !(state.mechGifts || {}).city && state.battle === b && b.phase === 'reward') {
    mechanicGift('city', false);
    b.logs.push('⌁ You found Packet Sniff and Ghost Protocol, two Hack cards. They are in your collection: open Deck to add them.');
  }
};
// Saves already past a world's entrance get its cards when they next load there.
const restoreGameBeforeMechanics = restoreGame;
restoreGame = function (s) {
  restoreGameBeforeMechanics(s);
  if (state && state.region !== 'city' && !state.battle) mechanicGift(state.region);
};
