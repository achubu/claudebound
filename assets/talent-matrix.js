'use strict';
// =====================================================================
// Neural Talent Matrix — expanded trees (Round 40).
//
// Each tree roughly doubles in depth (5 -> 9 rows) and width (2-3 -> 4-6
// columns), with several distinct build paths per tree. Existing talent
// ids, ranks and prerequisites are unchanged, so saved builds stay valid;
// only their row (tier) moves to fit the deeper grid.
//
// Row thresholds (points spent in that tree): 0 1 3 5 7 10 13 16 20.
// With 29 points in total, no build can take everything.
//
// Effects hook into the battle engine through `talentMatrix` (used by
// cardEffect() in expansion.js) and by wrapping playCard / endTurn /
// enemyPlan / startBattle / loseBattle / stat below.
// =====================================================================

TALENT_TIERS.splice(0, TALENT_TIERS.length, 0, 1, 3, 5, 7, 10, 13, 16, 20);
{
  const remap = { 0: 0, 1: 1, 2: 3, 3: 5, 4: 7 };
  for (const branch of Object.values(TALENT_BRANCHES)) for (const node of branch.nodes) node.tier = remap[node.tier] ?? node.tier;
}

TALENT_BRANCHES.surge.nodes.push(
  // Critical path (from Precision Strike)
  { id: 'lethal', name: 'Lethal Focus', icon: '✶', max: 2, tier: 3, req: ['critical', 2], desc: 'Per rank: +4% critical chance, and critical strikes deal +50% more (×2 becomes ×2.5, then ×3).' },
  { id: 'adrenaline', name: 'Adrenaline Loop', icon: '⟳', max: 1, tier: 5, req: ['lethal', 1], desc: 'Once per turn, a critical strike refunds 1 energy.' },
  { id: 'executioner', name: 'Executioner Protocol', icon: '☠', max: 1, tier: 8, req: ['adrenaline', 1], desc: 'Your attacks deal +75% damage to enemies below 30% health.' },
  // Elemental path
  { id: 'attunement', name: 'Elemental Attunement', icon: '♨', max: 3, tier: 1, desc: 'Elemental attack cards (fire, earth, air, water, ice, lightning) deal +3 damage per rank.' },
  { id: 'kindle', name: 'Kindling Matrix', icon: '🔥', max: 2, tier: 3, req: ['attunement', 2], desc: 'Burn and Poison you apply are +2 stronger per rank.' },
  { id: 'weakpoint', name: 'Exploit Weakness', icon: '◎', max: 2, tier: 5, req: ['kindle', 1], desc: 'Hitting an elemental weakness deals +30% more per rank: +50% becomes +80%, then +110%.' },
  { id: 'stormcaller', name: 'Stormcaller', icon: 'ϟ', max: 1, tier: 8, req: ['weakpoint', 2], desc: 'The first elemental card you play each turn costs 0 energy.' },
  // Momentum path (from Edge Calibration)
  { id: 'momentum', name: 'Momentum', icon: '»', max: 2, tier: 3, req: ['edge', 1], desc: 'Every attack after your first in a turn deals +3 damage per rank.' },
  { id: 'flurry', name: 'Flurry', icon: '≫', max: 1, tier: 7, req: ['momentum', 2], desc: 'The first 1-energy attack you play each turn costs 0.' },
  // Armor-break path
  { id: 'sunder', name: 'Sunder', icon: '⚒', max: 2, tier: 1, desc: 'Your attacks ignore 2 enemy Armor per rank.' },
  { id: 'shatterpoint', name: 'Shatterpoint', icon: '✸', max: 1, tier: 7, req: ['sunder', 2], desc: 'Pierce cards deal +6 damage.' }
);

TALENT_BRANCHES.disruption.nodes.push(
  // Suppression path (from Deep Interference)
  { id: 'suppression', name: 'Suppression Field', icon: '▼', max: 3, tier: 3, req: ['jammer', 2], desc: 'Enemy heavy attacks and charged strikes deal 7% less damage per rank.' },
  { id: 'silence', name: 'Static Silence', icon: '⊘', max: 1, tier: 7, req: ['suppression', 3], desc: 'Once per encounter: cancel the enemy\'s next action.' },
  { id: 'reserve', name: 'Jammer Reserve', icon: '⌁', max: 2, tier: 3, req: ['jammer', 3], desc: '+1 Weaken charge per encounter for every rank (up to 3 charges). One Weaken at a time: a new charge is ready once the last one wears off.' },
  { id: 'dominion', name: 'Dominion', icon: '♛', max: 1, tier: 8, req: ['silence', 1], desc: 'While Weaken is active, the enemy also loses 2 Armor.' },
  // Draw-engine path (from Predictive Draw)
  { id: 'foresight', name: 'Foresight', icon: '◈', max: 1, tier: 5, req: ['quickdraw', 1], desc: 'Draw 1 extra card at the start of each turn after the first.' },
  { id: 'cycle', name: 'Recycler', icon: '♻', max: 3, tier: 7, req: ['foresight', 1], desc: 'Playing a 0-energy card draws 1 card, once per turn per rank.' },
  // Energy path (from Flux Capacitor)
  { id: 'battery', name: 'Surge Battery', icon: '🔋', max: 1, tier: 7, req: ['capacitor', 1], desc: 'Carry up to 1 unspent energy into your next turn.' },
  // Counter path
  { id: 'counterWeave', name: 'Counter Weave', icon: '◇', max: 3, tier: 1, desc: 'A successful Prismatic Counter deals +2 damage per rank.' },
  { id: 'resonance', name: 'Resonant Rebound', icon: '↺', max: 1, tier: 3, req: ['counterWeave', 2], desc: 'A successful counter gives you +1 energy next turn.' },
  { id: 'reflux', name: 'Reflux', icon: '♥', max: 3, tier: 5, req: ['resonance', 1], desc: 'A successful counter heals 2 HP per rank.' },
  { id: 'nullField', name: 'Null Field', icon: '∅', max: 1, tier: 8, req: ['reflux', 1], desc: 'Enemy charged strikes can no longer burn, poison, drain or expose you.' }
);

TALENT_BRANCHES.resolve.nodes.push(
  // Block path
  { id: 'bulwark', name: 'Bulwark Doctrine', icon: '▣', max: 3, tier: 1, desc: 'Defense cards grant +1 more Block per rank.' },
  { id: 'thorns', name: 'Retaliation Coil', icon: '✺', max: 3, tier: 3, req: ['bulwark', 2], desc: 'When your Block absorbs an enemy hit, deal 1 damage back per rank.' },
  { id: 'fortress', name: 'Fortress Protocol', icon: '⛫', max: 1, tier: 5, req: ['thorns', 1], desc: 'Keep half of your unused Block (up to 6) into the next turn.' },
  { id: 'unbreakable', name: 'Unbreakable', icon: '⬢', max: 1, tier: 8, req: ['fortress', 1], desc: 'Begin every encounter with 6 Block.' },
  // Sustain path (from Vital Mesh)
  { id: 'leech', name: 'Siphon Edge', icon: '❦', max: 2, tier: 3, req: ['vitality', 1], desc: 'Your first attack each turn heals 1 HP per rank.' },
  { id: 'secondWind', name: 'Second Wind', icon: '❂', max: 1, tier: 5, req: ['leech', 2], desc: 'The first time you fall below half health in an encounter, heal 6 HP.' },
  { id: 'undying', name: 'Undying Core', icon: '✚', max: 1, tier: 8, req: ['secondWind', 1], desc: 'Once per encounter, a hit that would defeat you leaves you at 1 HP instead.' },
  // Retain path (from Memory Buffer)
  { id: 'preparation', name: 'Preparation', icon: '⌛', max: 1, tier: 3, req: ['retainCore', 1], desc: 'Your retained card gains +2 damage and +2 Block when you play it next turn.' },
  { id: 'recall', name: 'Total Recall', icon: '⧗', max: 2, tier: 5, req: ['preparation', 1], desc: 'Your retained card gains +1 damage and +1 Block per rank next turn.' },
  { id: 'steadyMind', name: 'Steady Mind', icon: '☯', max: 1, tier: 7, req: ['recall', 1], desc: 'Start every encounter with +1 energy on the first turn.' }
);

Object.assign(TALENT_BRANCHES.surge, { subtitle: 'Offense: burst turns and big hits', paths: ['Boost & Overdrive', 'Critical strikes', 'Elemental burn & poison', 'Momentum combos', 'Armor breaking'] });
Object.assign(TALENT_BRANCHES.disruption, { subtitle: 'Control: tempo, cards and enemy pressure', paths: ['Weaken & Silence', 'Card draw engine', 'Energy', 'Deck size & copies', 'Counter mastery'] });
Object.assign(TALENT_BRANCHES.resolve, { subtitle: 'Defense: survive, retain and recover', paths: ['Armor, Echo & Mirror', 'Block & retaliation', 'Life steal & survival', 'Retained-card tempo'] });

Object.assign(TALENT_ART, {
  lethal: 'precision', adrenaline: 'precision', executioner: 'precision', momentum: 'precision', flurry: 'precision', sunder: 'precision', shatterpoint: 'precision',
  attunement: 'power', kindle: 'power', weakpoint: 'power', stormcaller: 'power',
  suppression: 'jammer', reserve: 'jammer', silence: 'jammer', dominion: 'jammer', foresight: 'cards', cycle: 'cards', battery: 'clockwork',
  counterWeave: 'mirror', resonance: 'mirror', reflux: 'mirror', nullField: 'mirror',
  bulwark: 'aegis', thorns: 'aegis', fortress: 'aegis', unbreakable: 'aegis', leech: 'aegis', secondWind: 'aegis', undying: 'aegis',
  preparation: 'cards', recall: 'cards', steadyMind: 'clockwork'
});

const ELEMENTAL_KINDS = ['fire', 'earth', 'air', 'water', 'ice', 'lightning'];
const isElemental = d => ELEMENTAL_KINDS.includes(d.element);
const turnFlags = b => (b.tm && b.tm.turn === b.turn) ? b.tm : (b.tm = { turn: b.turn, attacks: 0, crits: 0, leech: false, flurry: false, storm: false, cycle: 0 });

// ---------------------------------------------------------------------
// Hooks used by cardEffect() in expansion.js
// ---------------------------------------------------------------------
const talentMatrix = {
  flatDamage(c, d, b) {
    if (!d.damage) return 0;
    const f = turnFlags(b);
    let bonus = 0;
    if (isElemental(d)) bonus += 3 * talentRank('attunement');
    if (f.attacks > 0) bonus += 3 * talentRank('momentum');
    if (d.pierce && hasTalent('shatterpoint')) bonus += 6;
    if (b.preparedUid === c.uid) bonus += talentRank('recall') + (hasTalent('preparation') ? 2 : 0);
    return bonus;
  },
  critMultiplier() { return 2 + talentRank('lethal') * .5; },
  onCrit(b) {
    const f = turnFlags(b);
    if (hasTalent('adrenaline') && !f.crits) { b.energy += 1; b.logs.push('Adrenaline Loop: +1 energy.'); }
    f.crits++;
  },
  weaknessMultiplier() { return 1.5 + talentRank('weakpoint') * .3; },
  finalDamage(damage, b) {
    if (hasTalent('executioner') && b.enemy.hp < b.enemy.maxHp * .3) { b.logs.push('Executioner Protocol: +75% damage.'); return Math.round(damage * 1.75); }
    return damage;
  },
  armorIgnore(b) { return 2 * talentRank('sunder') + (hasTalent('dominion') && b.enemyDebuff > 0 ? 2 : 0); },
  blockBonus(c, d, b) { return (/Defense/.test(d.kind || '') ? talentRank('bulwark') : 0) + (b.preparedUid === c.uid ? talentRank('recall') + (hasTalent('preparation') ? 2 : 0) : 0); },
  dotBonus() { return 2 * talentRank('kindle'); },
  afterCard(c, d, b, damage) {
    const f = turnFlags(b);
    if (d.damage) {
      if (!f.leech && hasTalent('leech')) { const heal = talentRank('leech'); state.hp = Math.min(state.maxHp, state.hp + heal); b.logs.push('Siphon Edge: +' + heal + ' HP.'); f.leech = true; }
      f.attacks++;
    }
    checkSecondWind(b);
  }
};

function checkSecondWind(b) {
  if (hasTalent('secondWind') && !b.secondWindUsed && state.hp > 0 && state.hp < state.maxHp / 2) {
    b.secondWindUsed = true; state.hp = Math.min(state.maxHp, state.hp + 6); b.logs.push('Second Wind: +6 HP.');
  }
}

// ---------------------------------------------------------------------
// Cost reductions (Flurry, Stormcaller). Applied through
// stat() so the card in hand shows its real cost and every cost check
// (playCard, touch controls, the bot) agrees.
// ---------------------------------------------------------------------
function costDiscountSource(c, base) {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight' || !Array.isArray(b.hand) || !b.hand.some(h => h.uid === c.uid)) return null;
  const f = turnFlags(b);
  if (hasTalent('stormcaller') && !f.storm && isElemental(base) && base.cost > 0) return 'storm';
  if (hasTalent('flurry') && !f.flurry && base.damage && base.cost === 1) return 'flurry';
  return null;
}
const statBeforeTalents = stat;
stat = function (c) {
  const d = statBeforeTalents(c);
  if (!c || c.uid == null || !state || !state.battle) return d;
  const source = costDiscountSource(c, d);
  if (!source) return d;
  return { ...d, cost: 0 };
};

const playCardBeforeTalents = playCard;
playCard = function (i) {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  const c = b.hand[i]; if (!c) return;
  const source = costDiscountSource(c, statBeforeTalents(c)), cost = stat(c).cost;
  const f = turnFlags(b);
  playCardBeforeTalents(i);
  if (b.hand.some(h => h.uid === c.uid)) return; // not played (e.g. not enough energy)
  if (source === 'storm') { f.storm = true; b.logs.push('Stormcaller: elemental card played for free.'); }
  if (source === 'flurry') { f.flurry = true; b.logs.push('Flurry: attack played for free.'); }
  if (b.preparedUid === c.uid) b.preparedUid = null;
  if (cost === 0 && hasTalent('cycle') && f.cycle < talentRank('cycle') && b.phase === 'fight') { f.cycle++; drawCards(1); b.logs.push('Recycler: drew 1 card.'); }
  if (state.battle === b) { save(); renderBattle(); }
};

// ---------------------------------------------------------------------
// Enemy actions: Suppression Field, Static Silence
// ---------------------------------------------------------------------
const enemyPlanBeforeTalents = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeTalents(b, turn);
  if (!b) return plan;
  if (b.silenceTurn === turn) return { kind: 'silenced', element: plan.element, damage: 0, name: 'Silenced', enraged: plan.enraged };
  const rank = talentRank('suppression');
  let out = plan;
  if (rank && (plan.kind === 'heavy' || plan.kind === 'elemental') && plan.damage) out = { ...out, damage: Math.round(plan.damage * (1 - .07 * rank)) };
  if (plan.kind === 'elemental' && hasTalent('nullField')) out = { ...out, noStatus: true };
  return out;
};

// ---------------------------------------------------------------------
// End of turn: Retaliation Coil, Fortress, Surge Battery, Foresight,
// Counter Weave / Resonant Rebound / Reflux, Preparation. (Null Field is
// applied in enemyPlan via plan.noStatus.)
// ---------------------------------------------------------------------
const endTurnBeforeTalents = endTurn;
endTurn = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  const plan = enemyPlan(b), startTurn = b.turn;
  const before = { block: b.block, energy: b.energy };
  const plating = talentRank('plating');
  const incoming = plan.kind === 'charge' || plan.kind === 'guard' || plan.kind === 'silenced' ? 0 : Math.max(0, (b.disrupted ? Math.ceil(plan.damage / 2) : plan.damage) - plating);
  const counterHit = plan.kind === 'elemental' && b.counter && COUNTERS[plan.element] === b.counter;
  const retainedUid = b.savedUid;
  b.undyingWatch = hasTalent('undying') && !b.undyingUsed;
  endTurnBeforeTalents();
  const live = state.battle === b && b.phase === 'fight' && b.turn > startTurn;
  if (state.battle !== b) return;
  if (!live) { if (b.phase === 'fight') { save(); renderBattle(); } return; }
  const absorbed = counterHit ? 0 : Math.min(before.block, incoming);
  // Retaliation Coil
  const thorns = talentRank('thorns');
  if (thorns && absorbed > 0 && b.enemy.hp > 0) { const dmg = thorns; b.enemy.hp = Math.max(0, b.enemy.hp - dmg); b.logs.push('Retaliation Coil: ' + dmg + ' damage back.'); }
  // Counter mastery
  if (counterHit) {
    const weave = talentRank('counterWeave');
    if (weave && b.enemy.hp > 0) { b.enemy.hp = Math.max(0, b.enemy.hp - 2 * weave); b.logs.push('Counter Weave: +' + 2 * weave + ' damage.'); }
    if (hasTalent('resonance')) { b.energy += 1; b.logs.push('Resonant Rebound: +1 energy.'); }
    const reflux = talentRank('reflux');
    if (reflux) { state.hp = Math.min(state.maxHp, state.hp + 2 * reflux); b.logs.push('Reflux: +' + 2 * reflux + ' HP.'); }
  }
  if (!b.enemy.hp) { winBattle(); save(); renderBattle(); return; }
  // Fortress Protocol: half of the Block left over after the hit.
  if (hasTalent('fortress')) { const kept = Math.min(6, Math.floor(Math.max(0, before.block - absorbed) / 2)); if (kept) { b.block += kept; b.logs.push('Fortress Protocol: ' + kept + ' Block carried over.'); } }
  // Surge Battery
  if (hasTalent('battery') && before.energy > 0) { b.energy += 1; b.logs.push('Surge Battery: +1 stored energy.'); }
  // Foresight
  if (hasTalent('foresight')) drawCards(1);
  // Preparation / Total Recall apply to the card that was retained.
  b.preparedUid = (hasTalent('preparation') || hasTalent('recall')) && retainedUid && b.hand.some(h => h.uid === retainedUid) ? retainedUid : null;
  checkSecondWind(b);
  save(); renderBattle();
};

// Undying Core: survive one lethal hit per encounter at 1 HP. endTurn
// calls loseBattle() instead of advancing the turn, so the turn advance
// is reproduced here.
const loseBattleBeforeTalents = loseBattle;
loseBattle = function () {
  const b = state.battle;
  if (b && b.phase === 'fight' && b.undyingWatch && !b.undyingUsed && hasTalent('undying')) {
    b.undyingUsed = true; state.hp = 1; b.logs.push('Undying Core: you refuse to fall (1 HP).');
    b.turn++; b.energy = Math.max(1, maxEnergy() - (b.drained ? 1 : 0)); b.drained = false; drawCards(4);
    return;
  }
  return loseBattleBeforeTalents();
};

// Encounter start: Unbreakable, Steady Mind.
const startBattleBeforeTalents = startBattle;
startBattle = function (spawnId) {
  startBattleBeforeTalents(spawnId);
  const b = state.battle;
  if (!b || b.phase !== 'fight' || b.turn !== 1 || b.tmStarted) return;
  b.tmStarted = true;
  if (hasTalent('unbreakable')) { b.block += 6; b.logs.push('Unbreakable: 6 Block.'); }
  if (hasTalent('steadyMind')) { b.energy += 1; b.logs.push('Steady Mind: +1 energy.'); }
  save(); renderBattle();
};

// Active: Static Silence button, next to the other once-per-encounter abilities.
const renderBattleBeforeTalents = renderBattle;
renderBattle = function () {
  renderBattleBeforeTalents();
  const b = state && state.battle;
  if (!b || b.phase !== 'fight' || !hasTalent('silence')) return;
  const bar = $('battleModal').querySelector('.compact-bar') || $('battleModal');
  const btn = document.createElement('button');
  btn.id = 'silenceEnemy'; btn.className = 'ability small';
  const armed = b.silenceTurn === b.turn;
  btn.textContent = b.silenceUsed ? (armed ? '✓ Enemy silenced' : 'Silence spent') : 'Silence · cancel next action';
  btn.disabled = !!b.silenceUsed;
  btn.onclick = () => { if (b.silenceUsed) return; b.silenceUsed = true; b.silenceTurn = b.turn; b.logs.push('Static Silence: the enemy\'s next action is cancelled.'); save(); renderBattle(); };
  bar.append(btn);
};
