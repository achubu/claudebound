// Difficulty curve across all three worlds. Not part of the shipped suite.
// Plays real fights through the game's engine with a talent-using bot and
// reports win rates against targets, at "fair fight" settings: player level
// equal to the enemy's level, card level growing with player level, and a
// deck built from the cards each world actually rewards.
//
// Usage: node tests/balance-sim.cjs [fightsPerTest] ['{"heavyDistance":0.5}']
//   The optional JSON overrides fields of BALANCE (assets/expansion.js) so
//   tuning ideas can be measured before editing the game.
const src = require('node:fs').readFileSync(require('node:path').join(__dirname, 'talent-sim.cjs'), 'utf8');
const head = src.split('const BUILDS')[0].replace("const N = Number(process.argv[2]) || 100;", '')
  .replace('const fs', 'var fs').replace('const root', 'var root').replace('const BOT', 'var BOT');
eval(head);

let M = Number(process.argv[2]) || 40;
const overrides = require.main === module && process.argv[3] ? JSON.parse(process.argv[3]) : {};
// Judged on the AVERAGE win rate across all 16 talent builds and both play
// styles (a typical player), not the single best combination.
const TARGET = { zone: [45, 100], mini: [44, 60], boss: [32, 46] };

const SPILL = [['plating', 5], ['jammer', 5], ['amplifier', 5], ['vitality', 5], ['edge', 5], ['quickdraw', 2], ['capacitor', 1], ['overcharge', 1], ['recovery', 3], ['deckMatrix', 4]];
// 16 builds: the 4 original archetypes plus 4 per tree covering every
// Round 40 talent path. Each ends with a spill list so no point is wasted.
let BUILDS = {
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
if (process.env.BUILDS_JSON) BUILDS = JSON.parse(require('node:fs').readFileSync(process.env.BUILDS_JSON, 'utf8'));
const cardLevelFor = L => Math.min(3, Math.floor((L - 1) / 6));
function deckFor(region, L) {
  if (region === 'city') return L <= 3 ? ['strike', 'strike', 'guard', 'guard', 'focus', 'mend'] : ['strike', 'cleave', 'riposte', 'bastion', 'shatter', 'mend', 'cleave', 'bastion', 'riposte', 'shatter'];
  return ['cleave', 'counter', 'bastion', 'cinder', 'venom', 'riposte', 'shatter', 'cleave', 'bastion', 'counter', 'mend', 'strike'];
}

const { context, run } = makeContext();
run(BOT);
const REGIONS = { city: 'Neon Aftermath', elaris: 'Elaris', vespera: 'Vespera' };
function evaluate(over, only = null, quiet = false) {
const log = quiet ? () => {} : console.log;
run(`Object.assign(BALANCE, JSON.parse(JSON.stringify(globalThis.__BASE_BALANCE ||= JSON.parse(JSON.stringify(BALANCE)))), ${JSON.stringify(over)})`);
const report = {};
let failures = 0;
for (const [region, regionName] of Object.entries(REGIONS)) {
  if (only && !only.regions.includes(region)) continue;
  run(`newGame();configureRegion('${region}');state.region='${region}';`);
  const groups = JSON.parse(run(`(()=>{const g={};for(const k of Object.keys(rooms))for(const s of roomSpawns(k)){const L=enemyLevel(k),e=enemies[s.type];const key=s.boss?(e.miniBoss?'mini:':'boss:')+s.type:'zone:'+L;(g[key]=g[key]||[]).push([k,s.uid,L])}return JSON.stringify(g)})()`));
  const keys = Object.keys(groups).sort((a, b) => {
    const rank = k => k.startsWith('zone') ? 0 : k.startsWith('mini') ? 1 : 2;
    return rank(a) - rank(b) || groups[a][0][2] - groups[b][0][2];
  });
  log(`\n=== ${regionName} ===`);
  log('Area'.padEnd(30) + 'Lv'.padStart(4) + 'Cards'.padStart(7) + 'Typical'.padStart(9) + 'Best'.padStart(6) + '  Best build'.padEnd(14) + 'Target');
  report[region] = [];
  for (const key of keys) {
    if (only && only.keys && !only.keys.includes(key)) continue;
    const pool = groups[key], kind = key.split(':')[0], L = pool[0][2], cl = cardLevelFor(L);
    let best = { win: -1 }, sum = 0, combos = 0; const perBuild = {};
    for (const [build, plan] of Object.entries(BUILDS)) for (const policy of ['careful', 'race']) {
      run(`globalThis.POLICY='${policy}'`);
      let wins = 0;
      for (let i = 0; i < M; i++) {
        const [room, uid, lv] = pool[i % pool.length];
        run(`Math.random=(()=>{let s=${(i + 1 + Number(process.env.SEED || 0) * 1000) * 48271 + lv};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
          newGame();configureRegion('${region}');state.region='${region}';state.playerLevel=${Math.max(1, lv + Number(process.env.LEVEL_DELTA || 0))};allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
          state.pool=${JSON.stringify(deckFor(region, L))}.slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${cardLevelFor(Math.max(1, lv + Number(process.env.LEVEL_DELTA || 0)))};return c});
          state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.cleared=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
          globalThis.__r=state.battle?playOutBattle():{won:false,aborted:true};`);
        if (context.__r.aborted) throw new Error('fight did not start: ' + region + ' ' + room);
        if (context.__r.won) wins++;
      }
      const win = Math.round(wins / M * 100);
      sum += win; combos++; perBuild[build] = Math.max(perBuild[build] ?? 0, win);
      if (win > best.win) best = { win, build, policy };
    }
    const name = kind === 'zone' ? `Regular enemies Lv ${L}` : run(`enemies['${key.split(':')[1]}'].name`) + (kind === 'mini' ? ' (mini-boss)' : ' (BOSS)');
    const [lo, hi] = TARGET[kind];
    const avg = Math.round(sum / combos), ok = avg >= lo && avg <= hi;
    if (!ok) failures++;
    report[region].push({ key, name, kind, level: L, cardLevel: cl, ...best, avg: Math.round(sum / combos), perBuild, target: [lo, hi], ok });
    log(name.padEnd(30) + String(L).padStart(4) + String(cl).padStart(7) + `${avg}%`.padStart(9) + `${best.win}%`.padStart(6) + `  ${best.build}`.padEnd(14) + `${lo}-${hi}%` + (ok ? '' : (avg < lo ? '  ✗ too hard' : '  ✗ too easy')));
  }
}
log(`\n${failures} area(s) outside target. Overrides: ${JSON.stringify(over)}`);
return { report, failures };
}
module.exports = { evaluate, run, setM: n => { M = n } };
if (require.main === module) {
  const r = evaluate(overrides);
  require('node:fs').writeFileSync(require('node:path').join(__dirname, 'balance-sim-results.json'), JSON.stringify({ M, overrides, report: r.report }, null, 1));
}
