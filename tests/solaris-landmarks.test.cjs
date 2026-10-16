// Round 164: Solaris landmark rooms use their own paintings, and every tile in the plan exists.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets/solaris-data.js'), 'utf8');
const plan = JSON.parse(src.match(/SOLARIS_PLAN = (\{.*?\});/)[1]);
const layout = JSON.parse(src.match(/SOLARIS_LAYOUT = (\{.*?\});\n/)[1]);
for (const [key, [tile]] of Object.entries(plan))
  assert(fs.existsSync(path.join(root, 'assets/environment/solaris', tile + '.webp')), 'missing art for ' + key + ': ' + tile);
const landmarks = { '8,5': 'sol-boss', '5,2': 'sol-miniboss', '8,0': 'sol-relic-ember', '0,2': 'sol-relic-boots', '6,2': 'sol-relic-crystal', '5,5': 'sol-relic-lens' };
for (const [key, tile] of Object.entries(landmarks)) assert.strictEqual(plan[key][0], tile, key + ' uses ' + tile);
const counts = {};
for (const [tile] of Object.values(plan)) counts[tile] = (counts[tile] || 0) + 1;
for (const tile of Object.values(landmarks)) assert.strictEqual(counts[tile], 1, tile + ' is used once');
assert.strictEqual(layout['0,2'].name, 'Statue Garden');
assert.strictEqual(layout['8,5'].name, 'The Solar Crown');
// Every room's walk mask still reaches each of its exits (checked through the real scripts).
process.env.HARNESS_ONLY = '1';
const { run } = require('./expansion.test.cjs');
const bad = JSON.parse(run(`(()=>{newGame();state.region='elaris';configureRegion('elaris');const bad=[];
 for(const k of Object.keys(rooms))for(const d of Object.keys(rooms[k].exits)){if(typeof organicDoor==='function'&&!organicDoor(k,d))bad.push(k+':'+d)}
 return JSON.stringify(bad)})()`));
assert.deepStrictEqual(bad, [], 'every exit has a door on the walk mask');
console.log('solaris-landmarks ok');
// Round 166: the crossroads and the west dead end are painted, so only the north dead end is a stand-in.
const placeholders = JSON.parse(src.match(/SOLARIS_PLACEHOLDERS = (\[.*?\]);/)[1]);
assert.deepStrictEqual(placeholders, [], 'Round 167: no stand-ins left');
for (const [key, [tile]] of Object.entries(plan)) if (['nesw', 'w'].includes(Object.keys(layout[key].exits).sort().join('').replace('ensw', 'nesw')))
  assert(!tile.endsWith('-ph'), key + ' uses a real painting');
console.log('solaris-landmarks round 166 ok');
