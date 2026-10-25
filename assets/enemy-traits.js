'use strict';
// =====================================================================
// Round 265 (owner request): no two enemies fight the same way. Every species has its own move pattern
// and a signature trait, and inside a world no two enemies share a pattern or a trait, and no two
// regular enemies share an affliction. A trait can come back in another world, never with the same
// pattern and afflictions. The trait shows as a chip by the enemy's name (its bubble explains it).
// Loaded after enemy-pairs.js (a pair's partner keeps its own trait on its enemy object) and armor-hud.js.
// =====================================================================
const ENEMY_TRAITS = {
  frenzy: { name: 'Frenzy', icon: '😤', desc: 'Every time it attacks, its attack rises by 8% of its starting attack.' },
  thorns: { name: 'Thorns', icon: '🌵', desc: 'Each card that damages it costs you HP equal to 12% of its attack.' },
  stoneskin: { name: 'Stoneskin', icon: '🪨', desc: 'At the end of each of its turns it gains Block equal to 25% of its attack.' },
  drill: { name: 'Drill', icon: '🔩', desc: 'Its hits ignore your Armor.' },
  phasing: { name: 'Phasing', icon: '👻', desc: 'The first card that damages it each turn deals half.' },
  aetherDrain: { name: 'Aether drain', icon: '🌀', desc: 'Each time it hits you, you lose 2 Aether.' },
  punisher: { name: 'Punisher', icon: '⚖', desc: 'Its hits deal 25% more if you have no Block when it attacks.' },
  wrath: { name: 'Wrath', icon: '💢', desc: 'Below half health its hits deal 30% more.' },
  rally: { name: 'Rally', icon: '📯', desc: 'After a turn without attacking (guarding or charging), its next hit deals 30% more.' },
  staticField: { name: 'Static field', icon: '⚡', desc: 'The first card you play each turn costs 1 more energy.' },
  regen: { name: 'Regeneration', icon: '💚', desc: 'At the end of each of its turns it heals 5% of its health.' },
  twinStrike: { name: 'Twin strike', icon: '⚔', desc: 'After its plain Strike it strikes again for 40% (Armor applies).' },
  undying: { name: 'Undying', icon: '💀', desc: 'The first time it would fall, it gets back up with 20% of its health.' },
  resistant: { name: 'Resistant', icon: '🛡', desc: 'Non-elemental cards deal 25% less to it.' },
  bloodthirst: { name: 'Bloodthirst', icon: '🩸', desc: 'It heals half of the HP damage it deals.' },
  overcharged: { name: 'Overcharged', icon: '🔋', desc: 'Its charged strikes deal 25% more.' },
  purging: { name: 'Purging', icon: '🫧', desc: 'At the end of each of its turns, the Poison and Burn on it are halved.' },
  menacing: { name: 'Menacing', icon: '👁', desc: 'You start the fight with 1 less energy.' },
  hardened: { name: 'Hardened', icon: '🧱', desc: 'It has 50% more Armor (at least 2 more).' },
  brittle: { name: 'Brittle', icon: '🧊', desc: 'Each card that damages it cracks 1 Armor until the end of its turn.' }
};
// Species → trait. Inside a world no trait repeats.
const SPECIES_TRAIT = {
  // Neon Aftermath
  emberling: 'frenzy', thornling: 'thorns', vineguard: 'stoneskin', burrower: 'drill', shade: 'phasing', cryptWisp: 'aetherDrain',
  crownEye: 'punisher', forgeBeast: 'wrath', moonKnight: 'rally', crownSentinel: 'staticField', thornWarden: 'regen',
  // Solaris
  cinderFox: 'twinStrike', sunRevenant: 'undying', blightAntler: 'resistant', drownedHeron: 'phasing', stormMoth: 'aetherDrain',
  bloomTyrant: 'regen', tidewardenElaris: 'stoneskin', galeSovereign: 'overcharged',
  // Sky Isles
  skyDrake: 'frenzy', skyWisp: 'purging', skyHarpy: 'twinStrike', skyRam: 'drill', zenithRoc: 'rally', stormbellWarden: 'staticField', featherMatriarch: 'bloodthirst',
  // Elaris
  elarisFox: 'punisher', elarisAntler: 'thorns', elarisHeron: 'bloodthirst', elarisMoth: 'phasing', elarisTyrant: 'regen', tideboundWarden: 'stoneskin', galeSovereignElaris: 'wrath',
  // Vespera
  vespFox: 'frenzy', vespThorn: 'thorns', vespMoth: 'twinStrike', vespShade: 'phasing', vespStag: 'hardened', vespHeron: 'purging', vespMauler: 'wrath',
  vespWisp: 'aetherDrain', stormTyrant: 'overcharged', arcSentinel: 'brittle', resonantPhantom: 'staticField',
  // Chronospire
  chronoHound: 'rally', chronoSentry: 'hardened', chronoHeron: 'bloodthirst', chronoWisp: 'menacing', chronoWraith: 'phasing', chronoStag: 'punisher',
  chronoMoth: 'aetherDrain', chronoMauler: 'wrath', chronarch: 'undying', clockwarden: 'stoneskin', paradoxTwin: 'twinStrike'
};
// Move patterns, one per species (bosses keep theirs from encounter-depth.js and chronospire.js).
// Neon Aftermath's patrols have no element, so no charged strike; the others keep charge → strike together.
const SPECIES_PATTERN = {
  emberling: ['attack', 'attack', 'heavy'], thornling: ['attack', 'guard', 'heavy'], vineguard: ['guard', 'attack', 'guard', 'heavy'],
  burrower: ['heavy', 'attack', 'guard'], shade: ['attack', 'heavy', 'attack', 'guard'], cryptWisp: ['attack', 'attack', 'guard', 'heavy'],
  crownEye: ['guard', 'heavy', 'attack'], forgeBeast: ['attack', 'heavy', 'heavy', 'guard'],
  cinderFox: ['attack', 'charge', 'elemental', 'guard'], sunRevenant: ['guard', 'attack', 'charge', 'elemental'], blightAntler: ['attack', 'heavy', 'charge', 'elemental'],
  drownedHeron: ['charge', 'elemental', 'attack', 'attack'], stormMoth: ['attack', 'attack', 'charge', 'elemental', 'guard'],
  skyDrake: ['attack', 'charge', 'elemental', 'guard'], skyWisp: ['charge', 'elemental', 'guard', 'attack', 'heavy'], skyHarpy: ['attack', 'guard', 'attack', 'charge', 'elemental'],
  skyRam: ['heavy', 'charge', 'elemental', 'attack'],
  elarisFox: ['attack', 'charge', 'elemental', 'heavy', 'guard'], elarisAntler: ['guard', 'charge', 'elemental', 'attack', 'attack'], elarisHeron: ['attack', 'attack', 'charge', 'elemental', 'guard'],
  elarisMoth: ['charge', 'elemental', 'attack', 'attack'],
  vespFox: ['attack', 'attack', 'heavy', 'charge', 'elemental'], vespThorn: ['guard', 'attack', 'charge', 'elemental'], vespMoth: ['attack', 'attack', 'charge', 'elemental', 'guard'],
  vespShade: ['charge', 'elemental', 'attack', 'attack'], vespStag: ['attack', 'heavy', 'charge', 'elemental'], vespHeron: ['charge', 'elemental', 'guard', 'attack', 'heavy'],
  vespMauler: ['heavy', 'charge', 'elemental', 'attack'], vespWisp: ['attack', 'guard', 'attack', 'charge', 'elemental'],
  chronoHound: ['attack', 'charge', 'elemental', 'guard'], chronoSentry: ['guard', 'attack', 'charge', 'elemental'], chronoHeron: ['attack', 'attack', 'charge', 'elemental', 'guard'],
  chronoWisp: ['charge', 'elemental', 'attack', 'attack'], chronoWraith: ['attack', 'heavy', 'charge', 'elemental'], chronoStag: ['charge', 'elemental', 'guard', 'attack', 'heavy'],
  chronoMoth: ['attack', 'guard', 'attack', 'charge', 'elemental'], chronoMauler: ['heavy', 'attack', 'charge', 'elemental', 'guard'],
  // Chronospire's bosses used the default pattern.
  chronarch: ['guard', 'charge', 'elemental', 'attack', 'heavy', 'charge', 'elemental', 'attack'],
  clockwarden: ['guard', 'attack', 'guard', 'charge', 'elemental', 'heavy'],
  paradoxTwin: ['attack', 'charge', 'elemental', 'attack', 'charge', 'elemental', 'heavy']
};
for (const [id, p] of Object.entries(SPECIES_PATTERN)) if (enemies[id] && !(BOSS_PATTERNS[id] && !['chronarch', 'clockwarden', 'paradoxTwin'].includes(id))) BOSS_PATTERNS[id] = p;
// Chronospire's patrols all brought Rewind; two get other afflictions.
if (ENEMY_AFFLICTIONS.chronoWisp) ENEMY_AFFLICTIONS.chronoWisp = ['static'];
if (ENEMY_AFFLICTIONS.chronoWraith) ENEMY_AFFLICTIONS.chronoWraith = ['shackle'];

function traitOf(e) { return e && e.trait && ENEMY_TRAITS[e.trait] ? e.trait : null; }
function hasTrait(b, id) { return !!(b && b.enemy && b.enemy.trait === id); }
function giveTrait(e, id) {
  if (!e || e.trait !== undefined) return;
  e.trait = SPECIES_TRAIT[id] || null; e.baseAttack = e.attack;
  if (e.trait === 'hardened') e.armor = (e.armor || 0) + Math.max(2, Math.round((e.armor || 0) * .5));
}
const startBattleBeforeTraits = startBattle;
startBattle = function (spawnId) {
  const r = startBattleBeforeTraits.apply(this, arguments), b = state && state.battle;
  if (!b || b.phase !== 'fight' || b.spawnId !== spawnId || b.traited) return r;
  b.traited = true; giveTrait(b.enemy, b.id);
  if (b.pair && b.pair.other && b.pair.other.enemy) giveTrait(b.pair.other.enemy, b.pair.other.id);
  if (b.turn === 1 && [b.enemy, b.pair && b.pair.other && b.pair.other.enemy].some(e => e && e.trait === 'menacing')) { b.energy = Math.max(0, b.energy - 1); b.logs.push('👁 Menacing: 1 less energy this turn.'); }
  save(); renderBattle();
  return r;
};
// Hits it makes: Punisher, Wrath, Rally, Overcharged (in the intent, so the number shown is the real one).
const enemyPlanBeforeTraits = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeTraits(b, turn), t = b && traitOf(b.enemy);
  if (!t || !plan || !(plan.damage > 0)) return plan;
  let m = 1;
  if (t === 'punisher' && turn === b.turn && !(b.block > 0)) m *= 1.25;
  if (t === 'wrath' && b.enemy.hp < b.enemy.maxHp / 2) m *= 1.3;
  if (t === 'overcharged' && plan.kind === 'elemental') m *= 1.25;
  if (t === 'rally' && turn > 1) { const prev = enemyPlanBeforeTraits(b, turn - 1); if (prev && ['guard', 'charge'].includes(prev.kind)) m *= 1.3; }
  return m === 1 ? plan : { ...plan, damage: Math.round(plan.damage * m), trait: t };
};
// Drill: its hits ignore your Armor (as Shear does).
const scaledRankBeforeTraits = scaledRank;
scaledRank = function (id) {
  const b = typeof state === 'object' && state && state.battle;
  if (id === 'plating' && b && b.phase === 'fight' && b.enemyActing && hasTrait(b, 'drill')) return 0;
  return scaledRankBeforeTraits.apply(this, arguments);
};
// Static field: the first card each turn costs 1 more.
function staticFieldOn(b) { return !!(b && b.phase === 'fight' && [b.enemy, b.pair && b.pair.other && b.pair.other.enemy].some(e => e && e.trait === 'staticField' && e.hp > 0) && b.staticTurn !== b.turn); }
const statBeforeTraits = stat;
stat = function (c) {
  const d = statBeforeTraits(c), b = typeof state === 'object' && state && state.battle;
  if (!d || !b || !staticFieldOn(b) || !Array.isArray(b.hand) || !b.hand.some(h => h.uid === c.uid)) return d;
  return { ...d, cost: (d.cost || 0) + 1 };
};
// Cards you play: Thorns, Phasing, Resistant, Brittle, Static field.
const playCardBeforeTraits = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand && b.hand[i];
  if (!b || b.phase !== 'fight' || !c) return playCardBeforeTraits.apply(this, arguments);
  const e = b.enemy, t = traitOf(e), d = statBeforeTraits(c), hp = e.hp, wasStatic = staticFieldOn(b);
  const r = playCardBeforeTraits.apply(this, arguments);
  if (state.battle !== b || b.hand.includes(c)) return r;
  if (wasStatic) b.staticTurn = b.turn;
  const dealt = hp - e.hp;
  if (t && dealt > 0 && e.hp > 0) {
    if (t === 'phasing' && b.phaseTurn !== b.turn) { const back = Math.floor(dealt / 2); e.hp = Math.min(e.maxHp, e.hp + back); b.phaseTurn = b.turn; b.logs.push('👻 Phasing: ' + back + ' of that hit passes through.'); }
    if (t === 'resistant' && !(d && ['fire', 'earth', 'air', 'water', 'ice', 'lightning'].includes(d.element))) { const back = Math.floor(dealt * .25); if (back) { e.hp = Math.min(e.maxHp, e.hp + back); b.logs.push('🛡 Resistant: ' + back + ' shrugged off.'); } }
    if (t === 'thorns') { const hurt = Math.max(1, Math.round((e.baseAttack || e.attack) * .12)); state.hp = Math.max(1, state.hp - hurt); b.logs.push('🌵 Thorns: you take ' + hurt + '.'); }
    if (t === 'brittle' && e.armor > 0) { e.armor--; b.cracked = (b.cracked || 0) + 1; b.logs.push('🧊 Brittle: 1 Armor cracks.'); }
  }
  if (b.phase === 'fight') renderBattle();
  return r;
};
// Its turn: Twin strike, Bloodthirst, Aether drain, Frenzy, Stoneskin, Regeneration, Purging, Brittle's
// Armor growing back. Each enemy of a pair applies its own trait.
function traitEnemies(b) { const out = [[b.enemy, false]]; if (b.pair && b.pair.other && b.pair.other.enemy && b.pair.other.enemy.hp > 0) out.push([b.pair.other.enemy, true]); return out; }
const endTurnBeforeTraits = endTurn;
endTurn = function () {
  const b = state && state.battle;
  if (!b || b.phase !== 'fight') return endTurnBeforeTraits.apply(this, arguments);
  const plans = traitEnemies(b).map(([e, mate]) => [e, mate ? (typeof withPairMate === 'function' ? withPairMate(b, () => enemyPlan(b)) : null) : enemyPlan(b)]);
  const hp0 = state.hp, turn = b.turn;
  b.enemyActing = true;
  let r; try { r = endTurnBeforeTraits.apply(this, arguments); } finally { b.enemyActing = false; }
  if (state.battle !== b || b.phase !== 'fight' || b.turn <= turn) return r;
  const lost = Math.max(0, hp0 - state.hp);
  for (const [e, plan] of plans) {
    const t = traitOf(e); if (!t || !(e.hp > 0)) continue;
    const attacked = !!(plan && plan.damage > 0 && !['charge', 'guard', 'silenced'].includes(plan.kind)) && !(b.freeze > 0);
    if (t === 'twinStrike' && attacked && plan.kind === 'attack') { const hit = Math.max(0, Math.round(plan.damage * .4) - scaledRank('plating')); state.hp = Math.max(0, state.hp - hit); b.logs.push('⚔ Twin strike: ' + hit + ' more.'); }
    if (t === 'bloodthirst' && lost > 0) { const heal = Math.ceil(lost / 2); e.hp = Math.min(e.maxHp, e.hp + heal); b.logs.push('🩸 Bloodthirst: it heals ' + heal + '.'); }
    if (t === 'aetherDrain' && attacked && lost > 0 && b.aether > 0) { const n = Math.min(2, b.aether); b.aether -= n; b.logs.push('🌀 Aether drain: −' + n + ' Aether.'); }
    if (t === 'frenzy' && attacked) { const up = Math.max(1, Math.round((e.baseAttack || e.attack) * .08)); e.attack += up; b.logs.push('😤 Frenzy: its attack rises by ' + up + '.'); }
    if (t === 'stoneskin') { const g = Math.round(e.attack * .25); e.guard = (e.guard || 0) + g; b.logs.push('🪨 Stoneskin: +' + g + ' Block.'); }
    if (t === 'regen' && e.hp < e.maxHp) { const h = Math.max(1, Math.round(e.maxHp * .05)); e.hp = Math.min(e.maxHp, e.hp + h); b.logs.push('💚 Regeneration: +' + h + ' HP.'); }
    if (t === 'purging' && e === b.enemy && (b.poison > 0 || b.burn > 0)) { b.poison = Math.floor((b.poison || 0) / 2); b.burn = Math.floor((b.burn || 0) / 2); b.logs.push('🫧 Purging: its Poison and Burn are halved.'); }
    if (t === 'brittle' && b.cracked) { e.armor += b.cracked; b.cracked = 0; }
  }
  if (state.hp <= 0 && typeof loseBattle === 'function') loseBattle();
  else if (state.battle === b) { save(); renderBattle(); }
  return r;
};
// Undying: the first time it would fall, it gets back up.
const winBattleBeforeTraits = winBattle;
winBattle = function () {
  const b = state && state.battle;
  if (b && b.phase === 'fight' && hasTrait(b, 'undying') && !b.enemy.undyingUsed && !(b.enemy.hp > 0)) {
    b.enemy.undyingUsed = true; b.enemy.hp = Math.max(1, Math.round(b.enemy.maxHp * .2)); b.logs.push('💀 Undying: ' + b.enemy.name + ' gets back up.');
    save(); renderBattle(); return;
  }
  return winBattleBeforeTraits.apply(this, arguments);
};
// The trait chip by the enemy's name (and on a pair's partner).
const renderBattleBeforeTraits = renderBattle;
renderBattle = function () {
  renderBattleBeforeTraits.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelector) return;
  const put = (host, e) => {
    const t = traitOf(e); if (!host || !t || !host.append || host.querySelector('.trait-chip')) return;
    const x = ENEMY_TRAITS[t], chip = document.createElement('span'); chip.className = 'fx-chip trait-chip'; chip.tabIndex = 0;
    chip.textContent = x.icon + ' ' + x.name; chip.dataset.tip = x.name + ': ' + x.desc; host.append(chip);
  };
  const side = document.querySelector('#battleModal .pair-target') || document.querySelector('#battleModal .compact-side.enemy');
  put(side && side.querySelector('.compact-head'), b.enemy);
  if (b.pair && b.pair.other) put(document.querySelector('#battleModal .pair-mate .pm-info'), b.pair.other.enemy);
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '#battleModal .trait-chip{color:#ffd9a8;margin-left:6px;font-size:10px}#battleModal .pair-mate .trait-chip{margin:2px 0 0}';
  document.head.append(st);
}
