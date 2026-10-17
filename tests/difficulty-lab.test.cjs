// Round 182: the Difficulty lab (assets/sim/lab.js) lists every encounter in every world with
// the gear a player has by then, and one encounter runs end to end on the real engine.
const assert = require('node:assert');
const { run } = require('./balance-sim.cjs');
const r = JSON.parse(run(`(()=>{const o={};for(const w of WORLD_ORDER){const list=simEncounters(w);o[w]={n:list.length,boss:list.filter(x=>x.kind==='boss').map(x=>[x.type,x.gear.length]),minis:list.filter(x=>x.kind==='mini').map(x=>x.gear.length),zoneGear:list.find(x=>x.kind==='zone').gear.length}}
 const enc=simEncounters('city')[0],runner=simEncounterRun('city',enc,1,{withGear:true});let steps=0;while(runner.step())steps++;o.row=runner.result();o.steps=steps+1;return JSON.stringify(o)})()`));
const order = ['city', 'elaris', 'sky', 'wilds', 'vespera', 'chronospire'];
order.forEach((w, i) => {
  const x = r[w];
  assert(x.n >= 6, w + ' lists its encounters');
  assert.strictEqual(x.boss.length, 1, w + ' has one final boss');
  assert.deepStrictEqual(x.minis, [i * 2, i * 2 + 1], w + ' mini-bosses: earlier worlds\' gear, then the first piece');
  assert.strictEqual(x.boss[0][1], i * 2 + 2, w + ' final boss: both of this world\'s pieces too');
  assert.strictEqual(x.zoneGear, i * 2, w + ' regular fights: earlier worlds\' gear');
});
assert.strictEqual(r.steps, 32, '16 builds x 2 play styles');
assert(r.row.name && r.row.typical >= 0 && r.row.typical <= 100 && r.row.verdict, 'a finished row');
console.log('PASS: the Difficulty lab lists every encounter with the gear available by then and runs one end to end.');
