// Round 162: Solaris rooms spawn one fewer regular patrol than the shared
// distance formula; boss rooms keep their boss and other worlds are unchanged.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{newGame();const out={};
for(const region of ['elaris','city']){configureRegion(region);spawnCatalog={};const rows=[];
 for(const k of Object.keys(rooms)){const list=roomSpawns(k);rows.push({k,regular:list.filter(s=>!s.boss).length,boss:list.filter(s=>s.boss).length,base:areaPatrolCount(k),quiet:typeof isQuietRoom==='function'&&isQuietRoom(k),bossRoom:list.some(s=>s.boss)})}
 out[region]=rows}
return JSON.stringify(out)})()`));
const safe = { elaris: '0,0', city: '0,5' };
for (const row of r.elaris) {
  if (row.k === safe.elaris || row.k === '1,2' || row.quiet || row.bossRoom) continue; // Round 229: 1,2 holds the first waypoint, alone
  assert.strictEqual(row.regular, row.base > 1 ? row.base - 1 : row.base, 'Solaris ' + row.k + ' patrol count');
}
for (const k of ['5,2', '8,0', '8,5']) assert.strictEqual(r.elaris.find(x => x.k === k).boss, 1, 'boss kept in ' + k);
for (const row of r.city) {
  if (row.k === safe.city || row.k === '1,7' || row.quiet || row.bossRoom) continue; // Round 229: 1,7 holds the first waypoint, alone
  assert.strictEqual(row.regular, row.base, 'city ' + row.k + ' unchanged');
}
console.log('solaris-patrols ok');
