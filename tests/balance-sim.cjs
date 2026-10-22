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
// Round 182: builds, decks and earlier progress live in assets/sim/lab.js (shared with the compendium).
const { context, run } = makeContext();
run(BOT);if(process.env.NO_SIDE)run('globalThis.NO_SIDE=1');if(process.env.NO_SUSPEND)run('globalThis.NO_SUSPEND=1');
run(fs.readFileSync(path.join(root, 'assets/sim/lab.js'), 'utf8'));
const TARGET = JSON.parse(run('JSON.stringify(SIM_TARGET)'));
let BUILDS = JSON.parse(run('JSON.stringify(SIM_BUILDS)'));
if (process.env.BUILDS_JSON) { BUILDS = JSON.parse(require('node:fs').readFileSync(process.env.BUILDS_JSON, 'utf8')); run('SIM_BUILDS=' + JSON.stringify(BUILDS)); }
const cardLevelFor = L => Math.min(3, Math.floor((L - 1) / 6));
const deckFor = (region, L) => JSON.parse(run(`JSON.stringify(simDeckFor('${region}', ${L}, ${!!process.env.BASIC_DECKS}))`));
const PRIOR_BOSSES = JSON.parse(run('JSON.stringify(SIM_PRIOR_BOSSES)')), PRIOR_SIDE = JSON.parse(run('JSON.stringify(SIM_PRIOR_SIDE)'));
const REGIONS = JSON.parse(run('JSON.stringify(SIM_REGION_NAMES)'));
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
          state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=${JSON.stringify(PRIOR_BOSSES[region]||[])};ensureSide();for(const id of ${JSON.stringify(PRIOR_SIDE[region]||[])})state.side.pool.push({uid:'s'+(state.side.next++),id});for(const c of state.side.pool){if(state.side.deck.length>=sideDeckMax())break;if(!state.side.deck.includes(c.uid))state.side.deck.push(c.uid)}state.cleared=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
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
module.exports = { evaluate, run, setM: n => { M = n }, BUILDS, deckFor, cardLevelFor, PRIOR_BOSSES, PRIOR_SIDE, REGIONS, context };
if (require.main === module) {
  const r = evaluate(overrides, process.env.ONLY_REGIONS ? { regions: process.env.ONLY_REGIONS.split(',') } : null);
  require('node:fs').writeFileSync(require('node:path').join(__dirname, 'balance-sim-results.json'), JSON.stringify({ M, overrides, report: r.report }, null, 1));
}
