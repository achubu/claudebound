'use strict';
// =====================================================================
// Round 284 (owner request): every gear piece keeps its boost and also changes a rule, so finding a mini-boss's
// piece changes how you play. The rule shows on the Gear screen and as a chip in battle when it fires.
// Rules come from worn gear only (wornGear()).
// =====================================================================
const GEAR_RULES = {
  ember:           { icon: '🔥', name: 'Kindle', desc: 'Your first attack each turn also Burns the enemy for 2.' },
  boots:           { icon: '🌿', name: 'Briar Guard', desc: 'When your Block stops an enemy hit completely, the enemy takes 3 damage.' },
  sunwovenShirt:   { icon: '☀', name: 'Sunwell', desc: 'Healing past your max HP becomes Block.' },
  scarabBelt:      { icon: '🪲', name: 'Scarab Swarm', desc: 'The first 0-energy card you play each turn draws a card.' },
  galeweavePants:  { icon: '🪶', name: 'Gale Rhythm', desc: 'Your 4th card each turn gets +4 damage or +4 Block.' },
  cloudstepBoots:  { icon: '☁', name: 'Cloudstep', desc: 'The first enemy hit of each fight is halved.' },
  thornhideGloves: { icon: '🩸', name: 'Thirst', desc: 'Each attack you play heals 1 HP (up to 4 a fight).' },
  mossweavePants:  { icon: '🌱', name: 'Moss Mend', desc: 'Heal 1 HP at the start of each of your turns (up to 6 a fight).' },
  stormglassBelt:  { icon: '⚡', name: 'Stormglass', desc: 'Every 7th card you play in a fight deals 6 more damage (or gains 6 Block if it deals none).' },
  tempestGloves:   { icon: '🌩', name: 'Arc Chain', desc: 'Elemental attacks strike again for 3 damage.' },
  timewornShirt:   { icon: '⏳', name: 'Second Chance', desc: 'Once per fight, a single hit that would take you from above half health to 0 leaves you at 1 HP instead.' },
  hourglassBelt:   { icon: '⌛', name: 'Saved Moment', desc: 'Up to 1 energy you leave unspent carries over to your next turn.' }
};
function gearRule(id) { return wornGear().includes(id); }
function gearRuleLog(b, id, text) { const g = GEAR_RULES[id]; b.logs.push(g.icon + ' ' + g.name + ': ' + text); b.gearFired = b.gearFired || {}; b.gearFired[id] = b.turn; }
const ELEMENTS_FOR_RULES = ['fire', 'earth', 'air', 'water', 'ice', 'lightning'];

// Card effects: Kindle, Sunwell, Scarab Swarm, Gale Rhythm, Thirst, Stormglass, Arc Chain.
const cardEffectBeforeGearRules = cardEffect;
cardEffect = function (c, empowered, doubleAttack) {
  const b = state.battle; if (!b || b.phase !== 'fight') return cardEffectBeforeGearRules.apply(this, arguments);
  const d = stat(c), hp0 = state.hp, block0 = b.block || 0, ehp0 = b.enemy.hp;
  if (b.gearTurn !== b.turn) { b.gearTurn = b.turn; b.gearCards = 0; b.gearKindle = false; b.gearScarab = false; }
  b.gearCards++; b.gearFightCards = (b.gearFightCards || 0) + 1;
  const r = cardEffectBeforeGearRules.apply(this, arguments);
  if (state.battle !== b) return r;
  const dealt = ehp0 - b.enemy.hp, gainedBlock = (b.block || 0) - block0, attack = (d.damage || 0) > 0;
  if (attack && gearRule('ember') && !b.gearKindle && b.enemy.hp > 0) { b.gearKindle = true; b.burn = Math.max(b.burn || 0, 2); b.burnTurns = Math.max(b.burnTurns || 0, 2); gearRuleLog(b, 'ember', 'Burn 2.'); }
  if (d.heal && gearRule('sunwovenShirt')) { const over = hp0 + d.heal - state.maxHp; if (over > 0) { b.block = (b.block || 0) + over; gearRuleLog(b, 'sunwovenShirt', '+' + over + ' Block.'); } }
  if ((d.cost || 0) === 0 && gearRule('scarabBelt') && !b.gearScarab) { b.gearScarab = true; drawCards(1); gearRuleLog(b, 'scarabBelt', 'draw 1.'); }
  if (b.gearCards === 4 && gearRule('galeweavePants')) {
    if (attack && b.enemy.hp > 0) { const hit = Math.min(4, b.enemy.hp); b.enemy.hp -= hit; gearRuleLog(b, 'galeweavePants', hit + ' more damage.'); }
    else { b.block = (b.block || 0) + 4; gearRuleLog(b, 'galeweavePants', '+4 Block.'); }
  }
  if (attack && gearRule('thornhideGloves') && (b.gearThirst || 0) < 4 && state.hp < state.maxHp) { b.gearThirst = (b.gearThirst || 0) + 1; state.hp = Math.min(state.maxHp, state.hp + 1); gearRuleLog(b, 'thornhideGloves', '+1 HP.'); }
  if (b.gearFightCards % 7 === 0 && gearRule('stormglassBelt')) {
    if (dealt > 0 && b.enemy.hp > 0) { const hit = Math.min(6, b.enemy.hp); b.enemy.hp -= hit; gearRuleLog(b, 'stormglassBelt', hit + ' more damage.'); }
    else if (!(dealt > 0)) { b.block = (b.block || 0) + 6; gearRuleLog(b, 'stormglassBelt', '+6 Block.'); }
  }
  if (attack && gearRule('tempestGloves') && ELEMENTS_FOR_RULES.includes(d.element) && b.enemy.hp > 0) { const hit = Math.min(3, b.enemy.hp); b.enemy.hp -= hit; gearRuleLog(b, 'tempestGloves', hit + ' more damage.'); }
  return r;
};
// The enemy's turn: Cloudstep, Briar Guard; the start of yours: Moss Mend, Saved Moment.
const endTurnBeforeGearRules = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight' || !wornGear().length) return endTurnBeforeGearRules.apply(this, arguments);
  b.gearHpBefore = state.hp; const turn = b.turn, hp0 = state.hp, block0 = b.block || 0, plan = enemyPlan(b), spare = Math.min(1, Math.max(0, b.energy || 0));
  const halve = gearRule('cloudstepBoots') && !b.gearCloudUsed && plan && plan.damage > 0 && !['guard', 'charge'].includes(plan.kind);
  if (halve) b.gearCloudBlock = Math.ceil(plan.damage / 2), b.block = block0 + b.gearCloudBlock; // half the hit is soaked up as Block
  const r = endTurnBeforeGearRules.apply(this, arguments);
  if (state.battle !== b) return r;
  if (halve) { b.gearCloudUsed = true; gearRuleLog(b, 'cloudstepBoots', 'the first hit is halved.'); }
  const hitLanded = plan && plan.damage > 0 && !['guard', 'charge'].includes(plan.kind) && !(b.freeze > 0);
  if (gearRule('boots') && hitLanded && block0 > 0 && state.hp >= hp0 && b.enemy.hp > 0) { const hit = Math.min(3, b.enemy.hp); b.enemy.hp -= hit; gearRuleLog(b, 'boots', 'the enemy takes ' + hit + '.'); if (!b.enemy.hp && typeof winBattle === 'function') { winBattle(); return r; } }
  if (b.phase === 'fight' && b.turn > turn) {
    if (gearRule('mossweavePants') && state.hp < state.maxHp && (b.gearMoss || 0) < 6) { const h = 1; b.gearMoss = (b.gearMoss || 0) + h; state.hp += h; gearRuleLog(b, 'mossweavePants', '+' + h + ' HP.'); }
    if (gearRule('hourglassBelt') && spare > 0) { b.energy += spare; gearRuleLog(b, 'hourglassBelt', '+' + spare + ' energy carried over.'); }
  }
  if (state.battle === b && b.phase === 'fight') { save(); renderBattle(); }
  return r;
};
// Second Chance: survive one big lethal hit (from above half health), once per fight.
const loseBattleBeforeGearRules = loseBattle;
loseBattle = function () {
  const b = state.battle;
  if (b && b.phase === 'fight' && gearRule('timewornShirt') && !b.gearSecondUsed && (b.gearHpBefore || 0) > state.maxHp / 2) {
    b.gearSecondUsed = true; state.hp = 1; gearRuleLog(b, 'timewornShirt', 'you hold on at 1 HP.');
    b.turn++; b.energy = Math.max(1, maxEnergy() - (b.drained ? 1 : 0)); b.drained = false; drawCards(4);
    save(); renderBattle(); return;
  }
  return loseBattleBeforeGearRules.apply(this, arguments);
};
// Bosses are a little tougher once you wear gear, so the rules don't make them easy (Difficulty lab, Round 284).
const GEAR_RULE_BOSS_HP = { city: 1.14, elaris: 1.1, sky: 1.025, wilds: 1.045, vespera: 1.1, chronospire: 1.1 };
const startBattleBeforeGearRules = startBattle;
startBattle = function () {
  const r = startBattleBeforeGearRules.apply(this, arguments), b = state && state.battle;
  const f = b && b.phase === 'fight' && b.enemy && b.enemy.boss && !b.gearBossHp && wornGear().length ? GEAR_RULE_BOSS_HP[activeRegion] || 1 : 1;
  if (f > 1) { b.gearBossHp = f; b.enemy.maxHp = Math.round(b.enemy.maxHp * f); b.enemy.hp = Math.round(b.enemy.hp * f); }
  return r;
};
// The Gear screen and pickups show the rule beside the boost.
const gearTextBeforeRules = gearText;
gearText = function (id) { const r = GEAR_RULES[id]; return gearTextBeforeRules(id) + (r ? ' · ' + r.icon + ' ' + r.name + ': ' + r.desc : ''); };
