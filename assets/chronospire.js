'use strict';
// =====================================================================
// Round 77: CHRONOSPIRE — the fourth world — and the SUSPEND mechanic
// (borrowed from Magic: The Gathering).
//
// SUSPEND, in one sentence: a card marked ⏳ Suspend N can be set aside
// for FREE instead of being played; it then plays itself, for free and
// with a charged bonus, at the start of your turn N turns later.
// The battle screen shows a "⏳ Suspended" tray with a countdown on each
// card, and a "How Suspend works" guide that opens automatically the
// first time you hold a Suspend card.
// =====================================================================
const CHRONO_ROOM_DATA = {"0,0":{"name":"Chronospire Gate","exits":{"e":"1,0","s":"0,1"},"district":1,"landmark":"GATE","cityIndex":0},"0,1":{"name":"Brass Stair","exits":{"n":"0,0","e":"1,1"},"district":0,"landmark":"ZONE 1","cityIndex":1,"zone":1,"level":28},"1,0":{"name":"Brass Vault","exits":{"w":"0,0","s":"1,1"},"district":0,"landmark":"ZONE 1","cityIndex":2,"zone":1,"level":28},"1,1":{"name":"Brass Arcade","exits":{"n":"1,0","w":"0,1","e":"2,1"},"district":0,"landmark":"ZONE 1","cityIndex":3,"zone":1,"level":28},"2,1":{"name":"Gearwork Hall","exits":{"w":"1,1","e":"3,1","s":"2,2"},"district":1,"landmark":"ZONE 2","cityIndex":4,"zone":2,"level":29},"2,2":{"name":"Gearwork Walk","exits":{"n":"2,1","s":"2,3","e":"3,2"},"district":1,"landmark":"ZONE 2","cityIndex":5,"zone":2,"level":29},"3,1":{"name":"Gearwork Spindle","exits":{"w":"2,1","e":"4,1"},"district":1,"landmark":"ZONE 2","cityIndex":6,"zone":2,"level":29},"2,3":{"name":"Pendulum Atrium","exits":{"n":"2,2","w":"1,3"},"district":2,"landmark":"ZONE 3","cityIndex":7,"zone":3,"level":30},"3,2":{"name":"Pendulum Cloister","exits":{"w":"2,2","e":"4,2"},"district":2,"landmark":"ZONE 3","cityIndex":8,"zone":3,"level":30},"4,1":{"name":"Pendulum Bridge","exits":{"w":"3,1","s":"4,2"},"district":2,"landmark":"ZONE 3","cityIndex":9,"zone":3,"level":30},"1,3":{"name":"Pendulum Gallery","exits":{"e":"2,3","w":"0,3"},"district":2,"landmark":"ZONE 3","cityIndex":10,"zone":3,"level":30},"4,2":{"name":"Pendulum Stair","exits":{"w":"3,2","n":"4,1","e":"5,2"},"district":2,"landmark":"ZONE 3","cityIndex":11,"zone":3,"level":30},"0,3":{"name":"The Stopped Hour","exits":{"e":"1,3"},"district":3,"landmark":"ZONE 4","cityIndex":12,"zone":4,"level":30,"enemy":["clockwarden",400,250]},"5,2":{"name":"Hourglass Arcade","exits":{"w":"4,2","e":"6,2","s":"5,3"},"district":3,"landmark":"ZONE 4","cityIndex":13,"zone":4,"level":31},"5,3":{"name":"Hourglass Hall","exits":{"n":"5,2","s":"5,4","e":"6,3"},"district":3,"landmark":"ZONE 4","cityIndex":14,"zone":4,"level":31},"6,2":{"name":"Hourglass Walk","exits":{"w":"5,2","e":"7,2"},"district":3,"landmark":"ZONE 4","cityIndex":15,"zone":4,"level":31},"5,4":{"name":"Escapement Spindle","exits":{"n":"5,3","w":"4,4"},"district":0,"landmark":"ZONE 5","cityIndex":16,"zone":5,"level":32},"6,3":{"name":"Escapement Atrium","exits":{"e":"7,3","w":"5,3"},"district":0,"landmark":"ZONE 5","cityIndex":17,"zone":5,"level":32},"7,2":{"name":"Escapement Cloister","exits":{"w":"6,2","s":"7,3"},"district":0,"landmark":"ZONE 5","cityIndex":18,"zone":5,"level":32},"4,4":{"name":"Escapement Bridge","exits":{"e":"5,4","w":"3,4"},"district":0,"landmark":"ZONE 5","cityIndex":19,"zone":5,"level":32},"7,3":{"name":"Escapement Gallery","exits":{"n":"7,2","w":"6,3","e":"8,3"},"district":0,"landmark":"ZONE 5","cityIndex":20,"zone":5,"level":32},"3,4":{"name":"Paradox Stair","exits":{"e":"4,4","s":"3,5"},"district":1,"landmark":"ZONE 6","cityIndex":21,"zone":6,"level":33},"8,3":{"name":"Paradox Vault","exits":{"w":"7,3","s":"8,4"},"district":1,"landmark":"ZONE 6","cityIndex":22,"zone":6,"level":33},"3,5":{"name":"Paradox Arcade","exits":{"n":"3,4"},"district":1,"landmark":"ZONE 6","cityIndex":23,"zone":6,"level":33},"8,4":{"name":"Paradox Hall","exits":{"n":"8,3","w":"7,4","e":"9,4"},"district":1,"landmark":"ZONE 6","cityIndex":24,"zone":6,"level":33},"7,4":{"name":"Clocktower Walk","exits":{"e":"8,4","s":"7,5"},"district":2,"landmark":"ZONE 7","cityIndex":25,"zone":7,"level":34},"9,4":{"name":"Clocktower Spindle","exits":{"w":"8,4","s":"9,5"},"district":2,"landmark":"ZONE 7","cityIndex":26,"zone":7,"level":34},"7,5":{"name":"Clocktower Atrium","exits":{"n":"7,4","w":"6,5"},"district":2,"landmark":"ZONE 7","cityIndex":27,"zone":7,"level":34},"9,5":{"name":"Clocktower Cloister","exits":{"n":"9,4","s":"9,6"},"district":2,"landmark":"ZONE 7","cityIndex":28,"zone":7,"level":34},"6,5":{"name":"Epoch Bridge","exits":{"e":"7,5","s":"6,6"},"district":3,"landmark":"ZONE 8","cityIndex":29,"zone":8,"level":35},"9,6":{"name":"Epoch Gallery","exits":{"n":"9,5","w":"8,6"},"district":3,"landmark":"ZONE 8","cityIndex":30,"zone":8,"level":35},"6,6":{"name":"Mirror of Moments","exits":{"n":"6,5"},"district":3,"landmark":"ZONE 8","cityIndex":31,"zone":8,"level":33,"enemy":["paradoxTwin",400,250]},"8,6":{"name":"Epoch Vault","exits":{"e":"9,6","s":"8,7"},"district":3,"landmark":"ZONE 8","cityIndex":32,"zone":8,"level":35},"8,7":{"name":"The Last Second","exits":{"n":"8,6"},"district":3,"landmark":"ZONE 8","cityIndex":33,"zone":8,"level":36,"enemy":["chronarch",400,250]}};
const CHRONO_TINT = 'sepia(.75) saturate(1.8) hue-rotate(-12deg) brightness(1.06)';
const CHRONO_GROUND_FILTER = 'sepia(.7) hue-rotate(-10deg) saturate(1.35) brightness(.74) contrast(1.1)';
const CHRONO_ENEMIES = {
  chronoHound:  { name: 'Gearhound', icon: '⚙', hp: 48, attack: 10, element: 'fire', art: 'cinderFox', tint: CHRONO_TINT },
  chronoMoth:   { name: 'Tick Moth', icon: '≋', hp: 50, attack: 10, element: 'air', art: 'stormMoth', tint: CHRONO_TINT },
  chronoSentry: { name: 'Brass Sentry', icon: '♜', hp: 54, attack: 10, armor: 2, element: 'earth', art: 'vineguard', tint: CHRONO_TINT },
  chronoWraith: { name: 'Lag Wraith', icon: '☾', hp: 54, attack: 11, armor: 1, element: 'air', art: 'shade', tint: CHRONO_TINT },
  chronoHeron:  { name: 'Hourglass Heron', icon: '⏳', hp: 56, attack: 11, element: 'water', art: 'drownedHeron', tint: CHRONO_TINT },
  chronoStag:   { name: 'Pendulum Stag', icon: '◆', hp: 58, attack: 11, armor: 2, element: 'earth', art: 'blightAntler', tint: CHRONO_TINT },
  chronoWisp:   { name: 'Rust Wisp', icon: '✧', hp: 60, attack: 11, armor: 2, element: 'water', art: 'cryptWisp', tint: CHRONO_TINT },
  chronoMauler: { name: 'Cog Mauler', icon: '♨', hp: 62, attack: 12, armor: 2, element: 'fire', art: 'forgeBeast', tint: CHRONO_TINT },
  clockwarden:  { name: 'The Clockwarden', icon: '🕰', hp: 90, attack: 12, armor: 4, boss: true, miniBoss: true, element: 'earth', art: 'crownEye', tint: CHRONO_TINT },
  paradoxTwin:  { name: 'The Paradox Twin', icon: '♊', hp: 86, attack: 13, armor: 3, boss: true, miniBoss: true, element: 'air', art: 'shade', tint: 'sepia(.6) saturate(2) hue-rotate(160deg) brightness(1.1)' },
  chronarch:    { name: 'The Chronarch', icon: '⌛', hp: 160, attack: 12, armor: 3, boss: true, element: 'water', shift: ['water', 'fire'], shiftEvery: 4, art: 'bloomTyrant', tint: CHRONO_TINT }
};
Object.assign(enemies, CHRONO_ENEMIES);
Object.assign(BALANCE.perEnemy, { clockwarden: { hp: .95 }, paradoxTwin: { hp: 1.05 }, chronarch: { hp: .72 } });
const CHRONO_ZONE_ENEMY = ['chronoHound', 'chronoMoth', 'chronoSentry', 'chronoWraith', 'chronoHeron', 'chronoStag', 'chronoWisp', 'chronoMauler'];
function chronoTierTypes(key) { const z = rooms[key] && rooms[key].zone; return [CHRONO_ZONE_ENEMY[(z || 1) - 1]]; }

// --- Rewind: Chronospire's own enemy affliction ---
AFFLICTIONS.rewind = { name: 'Rewind', icon: '⟲', type: 'hex', desc: () => 'Rewind: every suspended card waits 1 more turn. If nothing is suspended, you lose 1 Aether.', answer: ['purify', 'anchor'] };
Object.assign(ENEMY_AFFLICTIONS, {
  chronoHound: ['rewind'], chronoMoth: ['fog'], chronoSentry: ['barrier'], chronoWraith: ['rewind'], chronoHeron: ['siphon'], chronoStag: ['frail'], chronoWisp: ['rewind'], chronoMauler: ['crush'],
  clockwarden: ['rewind', 'barrier'], paradoxTwin: ['rewind', 'siphon'], chronarch: ['rewind', 'empower', 'barrage']
});
const applyHexBeforeRewind = applyHex;
applyHex = function (b, id) {
  if (id !== 'rewind') return applyHexBeforeRewind(b, id);
  if (b.suspended && b.suspended.length) { b.suspended.forEach(s => { s.turns++; }); b.logs.push('⟲ Rewind: your suspended cards each wait 1 more turn.'); }
  else { b.aether = Math.max(0, (b.aether || 0) - 1); b.logs.push('⟲ Rewind: nothing suspended — you lose 1 Aether.'); }
};

// --- World look ---
const chronoStyle = document.createElement('style');
chronoStyle.textContent = `
#world[data-environment="chronospire"]:before{content:'';position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(ellipse at 50% 40%,transparent 40%,#2a1a0566 100%),repeating-radial-gradient(circle at 50% 50%,transparent 0 46px,#ffd27a0d 47px 48px);animation:chronoPulse 6s ease-in-out infinite}
#world[data-environment="chronospire"] .wildlife{color:#ffd98a;text-shadow:0 0 8px #ffb840}
#world[data-environment="chronospire"] .city-landmark{color:#ffe2a0}
@keyframes chronoPulse{50%{opacity:.6}}
@media (prefers-reduced-motion:reduce){#world[data-environment="chronospire"]:before{animation:none}}`;
document.head.append(chronoStyle);

// --- Exploration tables ---
NEXUS_POINTS.chronospire = { start: '0,0', mid: '5,3' };
QUIET_ROOMS.chronospire = ['3,5', '6,3', '9,5'];
NEXUS_WORLD_NAMES.chronospire = 'Chronospire';
LORE_NAMES.chronospire = ['🕰', 'Chrono Inscription'];
LORE.chronospire = [
  'The clockmakers built the Spire to keep one perfect moment forever. The moment held. Everything else broke.',
  'Every gear here turns at a different speed. Walk fast enough and you can hear yesterday.',
  'The Clockwarden was a caretaker once. Now it only remembers how to stop things.',
  'The Paradox Twin met itself on the stairs and neither would step aside. They are still arguing.',
  'The Chronarch sits in The Last Second, holding it shut. When it falls, time will start again.'
];
Object.assign(EVENTS, {
  clockmaker: { icon: '⚙', name: "Clockmaker's Bench", text: () => 'A workbench covered in tiny gears, still warm.',
    choices: () => [{ label: 'Tune a card · a random deck card gains 25 mastery uses', run: () => { const list = active(); const c = list[Math.floor(Math.random() * list.length)]; if (!c) return 'Nothing to tune.'; for (let k = 0; k < 25; k++) recordCardUse(owned(c.uid) || c); return stat(c).name + ' gains 25 mastery uses.'; } },
                    { label: 'Sell spare gears · +8 Shards', run: () => { state.shards += 8; return '+8 Shards.'; } }] },
  paradoxPool: { icon: '◎', name: 'Paradox Pool', text: () => 'The water shows you, a minute from now, already healed.',
    choices: () => [{ label: 'Drink · heal ' + Math.ceil(state.maxHp * .5) + ' HP', run: () => { const h = Math.ceil(state.maxHp * .5); state.hp = Math.min(state.maxHp, state.hp + h); return '+' + h + ' HP.'; } },
                    { label: 'Gaze · Surge Rite blessing', run: () => { state.blessing = 'surge'; return 'Surge Rite: next fight +1 energy and +1 card on turn 1.'; } }] },
  sandglass: { icon: '⌛', name: 'Giant Hourglass', text: () => 'An hourglass taller than a house, its sand glowing.',
    choices: () => [{ label: 'Turn it over · 60%: heal 40%, 40%: −10% HP', run: () => { if (Math.random() < .6) { const h = Math.ceil(state.maxHp * .4); state.hp = Math.min(state.maxHp, state.hp + h); return 'Time runs back: +' + h + ' HP.'; } const l = Math.ceil(state.maxHp * .1); state.hp = Math.max(1, state.hp - l); return 'Time runs forward: −' + l + ' HP.'; } },
                    { label: 'Scoop the sand · +2 potions', run: () => { state.potions += 2; return '+2 healing potions.'; } }] },
  echoes: { icon: '◌', name: 'Echoing Corridor', text: () => 'Your footsteps come back a moment late, and slightly louder.',
    choices: () => [{ label: 'Listen · train your whole deck +10 uses', run: () => { active().forEach(c => { for (let k = 0; k < 10; k++) recordCardUse(owned(c.uid) || c); }); return 'Every card in your deck gains 10 mastery uses.'; } },
                    { label: 'Shout back · −' + Math.ceil(state.maxHp * .15) + ' HP, upgrade a random Impermanent card', disabled: !upgradeTargets().length, run: () => { state.hp = Math.max(1, state.hp - Math.ceil(state.maxHp * .15)); const c = randomImpermanent(); applyUpgradePack(c); return stat(c).name + ' rose to level ' + c.level + '.'; } }] }
});
EVENT_POOLS.chronospire = ['clockmaker', 'paradoxPool', 'sandglass', 'echoes'];

// =====================================================================
// SUSPEND
// =====================================================================
const SUSPEND_MAX = 3;
// Cards: tiers carry 'charge' — the bonus the card gets when it plays itself.
tieredCard('temporalBarrage', 'Temporal Barrage', 3, 'Attack', '⏳', [{ damage: 14, charge: { damage: 8 } }, { damage: 17, charge: { damage: 9 } }, { damage: 20, charge: { damage: 10 } }, { damage: 24, charge: { damage: 12 } }], { suspend: 2 });
tieredCard('delayedBulwark', 'Delayed Bulwark', 2, 'Defense', '⛨', [{ block: 9, charge: { block: 6 } }, { block: 11, charge: { block: 7 } }, { block: 13, charge: { block: 8 } }, { block: 16, charge: { block: 10 } }], { suspend: 1 });
tieredCard('clockworkVolley', 'Clockwork Volley', 2, 'Attack', '⚙', [{ damage: 4, hits: 3, charge: { damage: 2 } }, { damage: 5, hits: 3, charge: { damage: 2 } }, { damage: 6, hits: 3, charge: { damage: 3 } }, { damage: 6, hits: 4, charge: { damage: 3 } }], { suspend: 2 });
tieredCard('futureSight', 'Future Sight', 1, 'Skill', '👁', [{ draw: 2, charge: { draw: 1 } }, { draw: 2, block: 3, charge: { draw: 1 } }, { draw: 3, charge: { draw: 1 } }, { draw: 3, block: 4, charge: { draw: 2 } }], { suspend: 1 });
tieredCard('rewindMend', 'Rewind Mend', 2, 'Healing', '↺', [{ heal: 7, charge: { heal: 6 } }, { heal: 9, charge: { heal: 7 } }, { heal: 11, charge: { heal: 8 } }, { heal: 14, charge: { heal: 10 } }], { suspend: 2, exhaust: true });
tieredCard('chronoSpike', 'Chrono Spike', 1, 'Attack', '⟟', [{ damage: 7, charge: { damage: 4 } }, { damage: 8, charge: { damage: 5 } }, { damage: 10, charge: { damage: 6 } }, { damage: 12, charge: { damage: 7 } }], { suspend: 1, pierce: true });
tieredCard('accelerate', 'Accelerate', 0, 'Skill', '⏩', [{ accelerate: 1 }, { accelerate: 1, draw: 1 }, { accelerate: 1, draw: 1, block: 3 }, { accelerate: 2, draw: 1 }]);
const CHRONO_CARDS = ['temporalBarrage', 'delayedBulwark', 'clockworkVolley', 'futureSight', 'rewindMend', 'chronoSpike', 'accelerate'];
VARIETY_POOLS.chronospire = [...CHRONO_CARDS, 'prismLance', 'mirrorguard', 'chainLightning', 'counter', 'bastion'];

function suspendInfo(c) {
  const def = c && defs[c.id]; if (!def || !def.suspend) return null;
  const tier = def.tiers[c.level] || def.tiers[0];
  return { turns: def.suspend, charge: tier.charge || {} };
}
const CHARGE_WORDS = { damage: n => '+' + n + ' damage', block: n => '+' + n + ' Block', heal: n => '+' + n + ' healing', draw: n => '+' + n + ' card' + (n > 1 ? 's' : ''), energy: n => '+' + n + ' energy' };
function chargeText(charge) { return Object.entries(charge || {}).map(([k, v]) => (CHARGE_WORDS[k] || (n => '+' + n + ' ' + k))(v)).join(', '); }
function turnsText(n) { return n <= 1 ? 'at the start of your next turn' : 'in ' + n + ' turns'; }
// Rules text on every Suspend card spells the whole thing out.
const rulesBeforeSuspend = rules;
rules = function (c) {
  let text = rulesBeforeSuspend(c);
  const info = suspendInfo(c), d = defs[c && c.id];
  if (info) text += ' ⏳ Suspend ' + info.turns + ': or set it aside for 0 energy — it plays itself ' + turnsText(info.turns) + ', charged with ' + chargeText(info.charge) + '.';
  if (d && c) { const t = d.tiers[c.level] || d.tiers[0]; if (t.accelerate) text += ' Your suspended cards count down ' + t.accelerate + ' turn' + (t.accelerate > 1 ? 's' : '') + ' (any that reach 0 play now).'; }
  return text;
};
// While a suspended card plays itself it costs 0 and gets its charge.
const statBeforeSuspend = stat;
stat = function (c) {
  const d = statBeforeSuspend(c), b = state && state.battle;
  if (!b || !c || b.firingUid !== c.uid) return d;
  const info = suspendInfo(c); if (!info) return d;
  const out = { ...d, cost: 0 }; for (const [k, v] of Object.entries(info.charge)) out[k] = (out[k] || 0) + v;
  return out;
};
function suspendCard(uid) {
  const b = state && state.battle; if (!b || b.phase !== 'fight') return;
  const i = b.hand.findIndex(c => c.uid === uid), c = b.hand[i], info = suspendInfo(c); if (!info) return;
  b.suspended ||= [];
  if (b.suspended.length >= SUSPEND_MAX) return toast('You can only have ' + SUSPEND_MAX + ' suspended cards at once.');
  b.hand.splice(i, 1); if (b.pitch) b.pitch = b.pitch.filter(u => u !== uid); if (b.savedUid === uid) b.savedUid = null;
  b.suspended.push({ card: c, turns: info.turns, from: b.turn });
  b.logs.push('⏳ ' + stat(c).name + ' suspended for free — it plays itself ' + turnsText(info.turns) + ' (' + chargeText(info.charge) + ').');
  save(); renderBattle();
}
function fireReady(b) {
  if (!b.suspended) return;
  const ready = b.suspended.filter(s => s.turns <= 0); b.suspended = b.suspended.filter(s => s.turns > 0);
  if (!ready.length) return;
  b.firedTurn = b.turn; b.fired = b.fired && b.firedTurn === b.turn ? b.fired : [];
  for (const s of ready) {
    if (state.battle !== b || b.phase !== 'fight') break;
    const name = stat(s.card).name, info = suspendInfo(s.card);
    b.hand.push(s.card); const idx = b.hand.length - 1, hp = b.enemy.hp;
    b.firingUid = s.card.uid;
    try { playCard(idx); } finally { b.firingUid = null; }
    const stuck = b.hand.findIndex(c => c.uid === s.card.uid); if (stuck >= 0) { b.hand.splice(stuck, 1); b.discard.push(s.card); }
    b.fired.push({ name, charge: chargeText(info && info.charge), dealt: Math.max(0, hp - b.enemy.hp) });
    b.logs.push('⏳ ' + name + ' plays itself for free (charged: ' + chargeText(info && info.charge) + ').');
  }
  if (state.battle === b) { save(); renderBattle(); }
}
function tickSuspended(b, n = 1) {
  if (!b || !b.suspended || !b.suspended.length) return;
  b.suspended.forEach(s => { s.turns -= n; }); fireReady(b);
}
// Each new turn of yours counts every suspended card down by 1.
const endTurnBeforeSuspend = endTurn;
endTurn = function () {
  const b = state && state.battle, turn = b && b.turn;
  endTurnBeforeSuspend();
  if (b && state.battle === b && b.phase === 'fight' && b.turn > turn) tickSuspended(b, 1);
};
// Accelerate counts them down right away.
const playCardBeforeSuspend = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i], d = c && defs[c.id], t = d && (d.tiers[c.level] || d.tiers[0]);
  const r = playCardBeforeSuspend(i);
  if (b && state.battle === b && b.phase === 'fight' && t && t.accelerate && !b.hand.includes(c)) {
    if (b.suspended && b.suspended.length) { b.logs.push('⏩ Accelerate: suspended cards count down ' + t.accelerate + '.'); tickSuspended(b, t.accelerate); }
    else b.logs.push('⏩ Accelerate: nothing is suspended right now.');
  }
  return r;
};

// --- Battle UI: Suspend buttons on cards, the tray, and the guide ---
function suspendGuideHTML() {
  return '<div class="suspend-guide" role="note"><div class="sg-head"><b>⏳ How Suspend works</b><button id="suspendGuideClose" class="ability small">Got it</button></div>'
    + '<ol class="sg-steps">'
    + '<li><span class="sg-n">1</span><div><b>Suspend instead of playing.</b> Cards marked <span class="sg-tag">⏳ Suspend 2</span> have a <b>⏳ Suspend · free</b> button. Press it and the card leaves your hand for <b>0 energy</b>.</div></li>'
    + '<li><span class="sg-n">2</span><div><b>It waits on a countdown.</b> The card sits in the <b>⏳ Suspended</b> tray. Every time you end your turn, its number drops by 1.</div></li>'
    + '<li><span class="sg-n">3</span><div><b>At 0 it plays itself — free and charged.</b> At the start of your turn it fires automatically with a bonus, e.g. <i>Temporal Barrage: 14 + 8 = 22 damage</i>.</div></li>'
    + '</ol><p class="sg-tip">Tip: suspend big cards early, then spend your energy on other cards. Enemies with <b>⟲ Rewind</b> push your countdowns back by 1. <b>⏩ Accelerate</b> pulls them forward.</p></div>';
}
function suspendTrayHTML(b) {
  const list = b.suspended || [], fired = b.firedTurn === b.turn ? (b.fired || []) : [];
  const items = list.map(s => { const info = suspendInfo(s.card); return '<div class="st-item" title="' + stat(s.card).name + ' plays itself ' + turnsText(s.turns) + ' with ' + chargeText(info.charge) + '."><span class="st-count">' + s.turns + '</span><div class="st-text"><b>' + stat(s.card).name + '</b><small>plays itself ' + turnsText(s.turns) + '</small><small class="st-charge">charged: ' + chargeText(info.charge) + '</small></div></div>'; }).join('');
  const firedHTML = fired.length ? '<div class="st-fired">' + fired.map(f => '⏳ <b>' + f.name + '</b> just played itself' + (f.dealt ? ' — ' + f.dealt + ' damage' : '') + ' (charged: ' + f.charge + ')').join('<br>') + '</div>' : '';
  return '<div class="suspend-tray"><div class="st-head"><b>⏳ Suspended</b><small>' + list.length + '/' + SUSPEND_MAX + ' · they count down when you end your turn</small><button id="suspendHelp" class="ability small">How Suspend works</button></div>'
    + firedHTML + (items ? '<div class="st-list">' + items + '</div>' : '<p class="st-empty">Nothing suspended. Press <b>⏳ Suspend · free</b> under a ⏳ card to set it aside for 0 energy — it plays itself later.</p>')
    + (b.suspendHelp ? suspendGuideHTML() : '') + '</div>';
}
const renderBattleBeforeSuspend = renderBattle;
renderBattle = function () {
  renderBattleBeforeSuspend();
  const b = state && state.battle; if (!b || b.phase !== 'fight') return;
  const m = $('battleModal'); if (!m || !m.querySelector) return;
  const holdsSuspend = b.hand.some(c => suspendInfo(c));
  if (!holdsSuspend && !(b.suspended && b.suspended.length) && !(b.firedTurn === b.turn && b.fired && b.fired.length)) return;
  state.tips ||= {};
  if (holdsSuspend && !state.tips.suspend) { state.tips.suspend = true; b.suspendHelp = true; save(); }
  const tray = document.createElement('div'); tray.innerHTML = suspendTrayHTML(b);
  const anchor = m.querySelector('.hand-title'); if (anchor && anchor.before) anchor.before(tray.firstChild); else m.append(tray.firstChild);
  const help = $('suspendHelp'); if (help) help.onclick = () => { b.suspendHelp = !b.suspendHelp; renderBattle(); };
  const close = $('suspendGuideClose'); if (close) close.onclick = () => { b.suspendHelp = false; renderBattle(); };
  // Every Suspend card in hand gets a clear badge and its own button.
  const full = (b.suspended || []).length >= SUSPEND_MAX;
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const c = b.hand[i], info = suspendInfo(c); if (!info) return;
    const card = wrap.querySelector('.card');
    if (card && !card.querySelector('.suspend-badge')) { const badge = document.createElement('span'); badge.className = 'suspend-badge'; badge.textContent = '⏳ SUSPEND ' + info.turns; card.append(badge); }
    const btn = document.createElement('button'); btn.className = 'ability suspend-btn'; btn.disabled = full;
    btn.innerHTML = '⏳ Suspend · free<small>plays itself ' + turnsText(info.turns) + ' · ' + chargeText(info.charge) + '</small>';
    btn.title = full ? 'You already have ' + SUSPEND_MAX + ' suspended cards.' : 'Set aside for 0 energy. It plays itself ' + turnsText(info.turns) + ', charged with ' + chargeText(info.charge) + '.';
    btn.onclick = e => { e.stopPropagation(); suspendCard(c.uid); };
    wrap.append(btn);
  });
};
const suspendStyles = document.createElement('style');
suspendStyles.textContent = '.suspend-tray{margin:8px 0;padding:8px 10px;border:1px solid #e0b25a;border-radius:12px;background:linear-gradient(135deg,#2c1f08,#170f04);box-shadow:inset 0 0 0 1px #ffffff0d,0 0 14px #e0b25a33;color:#f6e3b8}'
  + '.st-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.st-head b{font:800 14px system-ui;color:#ffe2a0;letter-spacing:.04em}.st-head small{color:#cdb07a;font:600 11px system-ui}.st-head button{margin-left:auto}'
  + '.st-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.st-item{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 6px;border-radius:10px;border:1px solid #e0b25a88;background:#3a2a0c}'
  + '.st-count{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3cf,#e0b25a 60%,#7a5212);color:#2a1a02;font:900 18px system-ui;box-shadow:0 0 10px #ffcc6688}'
  + '.st-text{display:flex;flex-direction:column;line-height:1.2}.st-text b{font:800 13px system-ui;color:#fff1cc}.st-text small{font:600 11px system-ui;color:#e3c98f}.st-text .st-charge{color:#9fe0a0}'
  + '.st-empty{margin:6px 0 0;font:500 12px system-ui;color:#d8c08d}.st-fired{margin-top:6px;padding:6px 8px;border-radius:8px;background:#20380f;border:1px solid #8be36b;color:#dcffcf;font:600 12px system-ui}'
  + '.suspend-guide{margin-top:8px;padding:10px 12px;border-radius:10px;background:#120c03;border:1px dashed #e0b25a}.sg-head{display:flex;align-items:center;justify-content:space-between}.sg-head b{color:#ffe2a0;font:800 14px system-ui}'
  + '.sg-steps{list-style:none;margin:8px 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.sg-steps li{display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:8px;background:#2c1f08;font:13px/1.35 system-ui;color:#f6e3b8}'
  + '.sg-n{flex:0 0 auto;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#e0b25a;color:#2a1a02;font:900 13px system-ui}.sg-tag{padding:0 5px;border-radius:5px;background:#e0b25a;color:#2a1a02;font-weight:800;white-space:nowrap}.sg-tip{margin:0;font:12px/1.35 system-ui;color:#d8c08d}'
  + '.suspend-badge{position:absolute;left:6px;bottom:44px;z-index:3;padding:2px 7px;border-radius:999px;background:#e0b25a;color:#2a1a02;font:900 10px/1.3 system-ui;letter-spacing:.06em;box-shadow:0 0 8px #ffcc66aa}'
  + '.suspend-btn{display:flex;flex-direction:column;align-items:center;width:100%;margin-top:4px;border-color:#e0b25a!important;background:linear-gradient(135deg,#4a3410,#2a1c06)!important;color:#ffe9b8!important;font-weight:800}.suspend-btn small{font:600 10px/1.2 system-ui;color:#e3c98f}';
document.head.append(suspendStyles);

// --- Arrival: two Suspend cards and the guide ---
function chronoArrival() {
  if (state.chronoGift) return; state.chronoGift = true;
  for (const id of ['temporalBarrage', 'chronoSpike']) { const c = make(id); c.soulbound = false; state.pool.push(c); if (state.deck.length < maxDeckSize() && copiesInDeck(id) < maxCopies()) state.deck.push(c.uid); }
  save();
  openMenu('<div class="eyebrow">CHRONOSPIRE · A WORLD WHERE TIME IS BROKEN</div><h2>⏳ New mechanic: Suspend</h2><p>You found <b>Temporal Barrage</b> and <b>Chrono Spike</b>. They are now in your deck. Cards marked ⏳ can be <b>suspended</b>:</p>' + suspendGuideHTML().replace('<button id="suspendGuideClose" class="ability small">Got it</button>', '') + '<p><button id="chronoOk" class="primary">Got it</button></p>');
  const ok = $('chronoOk'); if (ok) ok.onclick = closeMenu;
  state.tips ||= {}; state.tips.suspend = true;
}
