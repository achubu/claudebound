// Round 182: difficulty of every enemy in the game, each fought at the player's own level.
// Not part of the shipped suite. Runs assets/sim/lab.js (the same code as the compendium's
// Difficulty lab) on the balance sim's engine and bot: 16 talent builds x 2 play styles, talent
// points spent up to the player's level, earlier bosses' side cards and deck slots, and every
// gear piece available by then worn. Regular enemies per species and level (no elites).
// Usage: node tests/difficulty-report.cjs [fightsPerBuildAndStyle] [region]
//   Writes tests/difficulty-report-<region>.json; runs per region can go in parallel.
const fs = require('node:fs'), path = require('node:path');
const { run } = require('./balance-sim.cjs');
const M = Number(process.argv[2]) || 6, only = process.argv[3];
for (const region of JSON.parse(run('JSON.stringify(Object.keys(SIM_REGION_NAMES))'))) {
  if (only && region !== only) continue;
  const n = Number(run(`(globalThis.__enc = simEncounters('${region}')).length`)), rows = [];
  for (let i = 0; i < n; i++) {
    const row = JSON.parse(run(`(()=>{const r=simEncounterRun('${region}',__enc[${i}],${M},{withGear:true});while(r.step());return JSON.stringify(r.result())})()`));
    rows.push(row);
    console.log([run(`SIM_REGION_NAMES['${region}']`), row.kind, row.name, 'Lv' + row.level, row.typical + '%', 'best ' + row.best.win + '% ' + row.best.build, 'worst ' + row.worst.win + '% ' + row.worst.build, row.avgTurns + ' turns', (row.hpLeftWhenWon ?? '-') + '% HP left', 'gear ' + row.gear, row.verdict].join(' | '));
  }
  fs.writeFileSync(path.join(__dirname, 'difficulty-report-' + region + '.json'), JSON.stringify({ M, region, rows }, null, 1));
}
