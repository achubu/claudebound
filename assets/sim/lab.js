// Round 182: the Difficulty lab. Shared by tests/balance-sim.cjs, tests/difficulty-report.cjs
// (Node) and the compendium (browser), so all three measure the same thing: real battles
// through the game's own engine, played by the bot in assets/sim/bot.js, at "fair fight"
// settings (player level = enemy level, talent points spent up to that level, card level
// growing with player level, and the bosses, side cards and gear a player has by then).
// Not loaded by the game itself.
const SIM_TARGET = { zone: [30, 100], mini: [34, 50], boss: [22, 36] }; // Round 44: afflictions + side deck
// Round 183: Neon Aftermath's final boss aims at about 40% like its mini-bosses (owner request).
const SIM_TARGET_BY_WORLD = { city: { boss: [34, 50] } };
// 16 builds: the 4 original archetypes plus 4 per tree covering every Round 40 talent path.
// Each ends with a spill list so no point is wasted.
const SIM_SPILL = [['plating', 5], ['jammer', 5], ['amplifier', 5], ['vitality', 5], ['edge', 5], ['quickdraw', 2], ['capacitor', 1], ['overcharge', 1], ['recovery', 3], ['deckMatrix', 4]];
// 16 builds: the 4 original archetypes plus 4 per tree covering every
// Round 40 talent path. Each ends with a spill list so no point is wasted.
let SIM_BUILDS = {
  'Old·Surge': [["powerCore",1],["amplifier",5],["edge",5],["overcharge",1],["weakenCore",1],["retainCore",1],["plating",5],["jammer",5],["vitality",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'Old·Disrupt': [["weakenCore",1],["jammer",5],["quickdraw",2],["capacitor",1],["retainCore",1],["powerCore",1],["plating",5],["amplifier",5],["vitality",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'Old·Resolve': [["retainCore",1],["plating",5],["vitality",5],["recovery",3],["weakenCore",1],["powerCore",1],["jammer",5],["amplifier",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'Old·Hybrid': [["weakenCore",1],["retainCore",1],["powerCore",1],["plating",2],["jammer",2],["amplifier",2],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'S·Crit': [["powerCore",1],["critical",5],["lethal",2],["amplifier",3],["adrenaline",1],["amplifier",5],["edge",5],["executioner",1],["retainCore",1],["plating",5],["vitality",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'S·Elemental': [["attunement",3],["kindle",2],["powerCore",1],["amplifier",3],["weakpoint",2],["sunder",2],["amplifier",5],["edge",5],["stormcaller",1],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'S·Momentum': [["powerCore",1],["amplifier",3],["edge",2],["momentum",2],["sunder",2],["amplifier",5],["edge",5],["flurry",1],["shatterpoint",1],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'S·Sunder': [["sunder",2],["powerCore",1],["amplifier",5],["edge",3],["shatterpoint",1],["momentum",2],["retainCore",1],["plating",5],["vitality",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'D·Silence': [["weakenCore",1],["jammer",3],["suppression",3],["jammer",5],["silence",1],["quickdraw",2],["deckMatrix",4],["dominion",1],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'D·Draw': [["weakenCore",1],["jammer",5],["quickdraw",2],["deckMatrix",2],["foresight",1],["cycle",3],["capacitor",1],["battery",1],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'D·Counter': [["counterWeave",3],["resonance",1],["weakenCore",1],["jammer",3],["reflux",3],["suppression",3],["jammer",5],["nullField",1],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'D·Energy': [["weakenCore",1],["jammer",5],["quickdraw",2],["deckMatrix",2],["capacitor",1],["overload",1],["battery",1],["deckMatrix",4],["retainCore",1],["plating",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'R·Thorns': [["bulwark",3],["retainCore",1],["thorns",3],["plating",5],["fortress",1],["vitality",5],["unbreakable",1],["weakenCore",1],["jammer",5],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'R·Leech': [["retainCore",1],["plating",3],["vitality",1],["leech",3],["secondWind",1],["vitality",5],["plating",5],["undying",1],["recovery",3],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'R·Retain': [["retainCore",1],["preparation",1],["recall",3],["plating",3],["steadyMind",1],["plating",5],["vitality",5],["bulwark",3],["leech",2],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]],
  'R·Fortress': [["retainCore",1],["bulwark",3],["thorns",1],["plating",3],["fortress",1],["plating",5],["unbreakable",1],["vitality",5],["recovery",3],["plating",5],["jammer",5],["amplifier",5],["vitality",5],["edge",5],["quickdraw",2],["capacitor",1],["overcharge",1],["recovery",3],["deckMatrix",4],["weakenCore",1],["powerCore",1],["retainCore",1]]
};
const simCardLevelFor = L => Math.min(3, Math.floor((L - 1) / 6));
// Round 49: decks include the new cards a player would pick from card rewards
// (basic = the pre-Round-49 decks, for comparison).
// Round 185: the two mechanic cards a player gets on arriving in a world (Neon Aftermath: after
// the first win) join the deck only when it has room, as in the game, so they go last.
function simDeckFor(region, L, basic = false) {
  const base = simBaseDeck(region, L, basic), m = !basic && typeof WORLD_MECHANICS === 'object' && WORLD_MECHANICS[region];
  return m && !(region === 'city' && L <= 1) ? [...base, ...m.gift] : base;
}
function simBaseDeck(region, L, basic) {
  if (region === 'city') return L <= 3 ? ['strike', 'strike', 'guard', 'guard', 'focus', 'mend'] : basic ? ['strike', 'cleave', 'riposte', 'bastion', 'shatter', 'mend', 'cleave', 'bastion', 'riposte', 'shatter'] : ['strike', 'cleave', 'bastion', 'breachSpike', 'shatter', 'staticShield', 'riposte', 'mend', 'bulwarkBash', 'arcJab'];
  if (basic || region === 'elaris') return basic ? ['cleave', 'counter', 'bastion', 'cinder', 'venom', 'riposte', 'shatter', 'cleave', 'bastion', 'counter', 'mend', 'strike'] : ['cleave', 'counter', 'bastion', 'cinder', 'thornlash', 'rootbind', 'riposte', 'wildfire', 'shatter', 'bastion', 'mend', 'tidecall'];
  if (region === 'chronospire') return ['temporalBarrage', 'chronoSpike', 'delayedBulwark', 'counter', 'bastion', 'chainLightning', 'prismLance', 'mirrorguard', 'clockworkVolley', 'rewindMend', 'cleave', 'accelerate'];
  return ['cleave', 'counter', 'bastion', 'chainLightning', 'prismLance', 'cinder', 'mirrorguard', 'bastion', 'venom', 'counter', 'mend', 'stormBattery'];
}
// Round 75: fights see the progress a player would have by then: bosses already beaten (side
// deck capacity grows with them) and the side cards that drop along the way.
// Round 175: six worlds. Each world's fights see every boss of the worlds before it.
const SIM_WORLD_BOSS_SETS = { city: ['moonKnight', 'crownSentinel', 'thornWarden'], elaris: ['tidewardenElaris', 'galeSovereign', 'bloomTyrant'], sky: ['stormbellWarden', 'featherMatriarch', 'zenithRoc'], wilds: ['tideboundWarden', 'galeSovereignElaris', 'elarisTyrant'], vespera: ['arcSentinel', 'resonantPhantom', 'stormTyrant'], chronospire: [] };
const SIM_PRIOR_BOSSES = {}; { let seen = []; for (const r of Object.keys(SIM_WORLD_BOSS_SETS)) { SIM_PRIOR_BOSSES[r] = [...seen]; seen = seen.concat(SIM_WORLD_BOSS_SETS[r]); } }
const SIM_PRIOR_SIDE = { city: [], elaris: ['restore', 'anchor'], sky: ['restore', 'anchor', 'ground', 'mirror'], wilds: ['restore', 'anchor', 'ground', 'mirror', 'phase'], vespera: ['restore', 'anchor', 'ground', 'mirror', 'phase'], chronospire: ['restore', 'anchor', 'ground', 'mirror', 'phase'] };
const SIM_REGION_NAMES = { city: 'Neon Aftermath', elaris: 'Solaris', sky: 'Sky Isles', wilds: 'Elaris', vespera: 'Vespera', chronospire: 'Chronospire' };

// --- Per-enemy report (Round 182) --------------------------------------
// Every encounter in a world: regular enemies per species and level (elites left out), and
// each mini-boss and final boss. withGear: wear every gear piece available by then (earlier
// worlds' pieces; for the second mini-boss also the first one's; for the final boss both).
function simEncounters(region) {
  newGame(); configureRegion(region); state.region = region;
  const g = {};
  for (const k of Object.keys(rooms)) for (const s of roomSpawns(k)) {
    if (s.elite) continue;
    const L = enemyLevel(k), e = enemies[s.type], kind = s.boss ? (e.miniBoss ? 'mini' : 'boss') : 'zone', key = kind + ':' + s.type + (kind === 'zone' ? ':' + L : '');
    (g[key] = g[key] || { key, kind, type: s.type, level: L, pool: [] }).pool.push([k, s.uid, L]);
  }
  const list = Object.values(g).sort((a, b) => a.level - b.level || (a.kind === b.kind ? a.type.localeCompare(b.type) : a.kind === 'zone' ? -1 : 1));
  const minis = list.filter(x => x.kind === 'mini').sort((a, b) => a.level - b.level);
  const order = WORLD_ORDER.slice(0, WORLD_ORDER.indexOf(region)), here = typeof gearOf === 'function' ? gearOf(region) : [];
  const prior = typeof gearOf === 'function' ? order.flatMap(w => gearOf(w)) : [];
  for (const x of list) x.gear = [...prior, ...(x.kind === 'boss' ? here : x.kind === 'mini' && minis.indexOf(x) === 1 ? here.slice(0, 1) : [])];
  return list;
}
// One fight. Seeded like tests/balance-sim.cjs so Node and the browser agree.
function simFight(region, enc, plan, policy, i, opts = {}) {
  const [room, uid, lv] = enc.pool[i % enc.pool.length], level = Math.max(1, lv + (opts.levelDelta || 0));
  globalThis.POLICY = policy;
  let seed = (i + 1 + (opts.seed || 0) * 1000) * 48271 + lv; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  newGame(); configureRegion(region); state.region = region; state.playerLevel = level; allocate(plan); syncTalentVitals(false); state.hp = state.maxHp;
  state.pool = simDeckFor(region, enc.level, opts.basicDecks).slice(0, maxDeckSize()).map(id => { const c = make(id); c.level = simCardLevelFor(level); return c; });
  state.deck = state.pool.map(c => c.uid); state.cooldowns = {}; state.bosses = [...(SIM_PRIOR_BOSSES[region] || [])];
  ensureSide(); for (const id of SIM_PRIOR_SIDE[region] || []) state.side.pool.push({ uid: 's' + (state.side.next++), id }); if (typeof fillSideDeck === 'function') fillSideDeck();
  if (opts.withGear && typeof ensureGear === 'function') {
    state.relics = [...(enc.gear || [])]; ensureGear();
    for (const slot of GEAR_SLOTS) state.gear[slot] = state.relics.filter(g => GEAR[g] && GEAR[g].slot === slot).sort((a, b) => GEAR[b].value - GEAR[a].value)[0] || null;
    syncTalentVitals(false); state.hp = state.maxHp;
  }
  state.cleared = []; state.room = room; state.pos = { x: 400, y: 300 }; startBattle(uid);
  return state.battle ? playOutBattle() : { won: false, aborted: true };
}
// All builds x both play styles for one encounter; step() runs one build and style so a page
// can stay responsive between steps.
function simEncounterRun(region, enc, M, opts = {}) {
  const combos = []; for (const [build, plan] of Object.entries(SIM_BUILDS)) for (const policy of ['careful', 'race']) combos.push([build, plan, policy]);
  const acc = { sum: 0, n: 0, turns: 0, fights: 0, won: 0, hpLeft: 0, best: { win: -1 }, worst: { win: 101 } };
  let next = 0;
  return {
    total: combos.length, get done() { return next; },
    step() {
      const [build, plan, policy] = combos[next++]; let wins = 0;
      for (let i = 0; i < M; i++) { const r = simFight(region, enc, plan, policy, i, opts); if (r.aborted) throw Error('fight did not start: ' + region + ' ' + enc.key); acc.turns += r.turns; acc.fights++; if (r.won) { wins++; acc.won++; acc.hpLeft += r.hp / r.maxHp; } }
      const win = Math.round(wins / M * 100); acc.sum += win; acc.n++;
      if (win > acc.best.win) acc.best = { win, build, policy }; if (win < acc.worst.win) acc.worst = { win, build, policy };
      return next < combos.length;
    },
    result() {
      const e = enemies[enc.type], s = enemyStats(enc.type, { region, level: enc.level, boss: enc.kind !== 'zone' }), typical = Math.round(acc.sum / acc.n), [lo, hi] = (SIM_TARGET_BY_WORLD[region] || {})[enc.kind] || SIM_TARGET[enc.kind];
      return { key: enc.key, kind: enc.kind, type: enc.type, name: e.name, level: enc.level, hp: s.hp, attack: s.attack, armor: e.armor || 0, element: e.element || null,
        afflictions: (ENEMY_AFFLICTIONS[enc.type] || []).map(a => AFFLICTIONS[a] ? AFFLICTIONS[a].name : a), gear: (enc.gear || []).length,
        typical, best: acc.best, worst: acc.worst, avgTurns: +(acc.turns / acc.fights).toFixed(1), hpLeftWhenWon: acc.won ? Math.round(acc.hpLeft / acc.won * 100) : null,
        target: [lo, hi], verdict: typical < lo ? 'too hard' : typical > hi ? 'too easy' : 'on target' };
    }
  };
}
