// Round 164: Solaris landmark rooms used their own paintings (retired in Round 228); every tile in the plan exists.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets/solaris-data.js'), 'utf8');
const plan = JSON.parse(src.match(/SOLARIS_PLAN = (\{.*?\});/)[1]);
const layout = JSON.parse(src.match(/SOLARIS_LAYOUT = (\{.*?\});\n/)[1]);
for (const [key, [tile]] of Object.entries(plan))
  assert(fs.existsSync(path.join(root, 'assets/environment/solaris', tile + '.webp')), 'missing art for ' + key + ': ' + tile);
// Round 228: the new look. The landmark paintings (old style) are retired, and those rooms use the
// owner's top-down tiles ('-s1') like the rest. Only the rooms whose shapes the new set doesn't have yet
// keep an old painting: the west dead end (4,5) and two diagonal shapes (0,4 and 8,4; 5,1).
const old = Object.entries(plan).filter(([, [tile]]) => !tile.endsWith('-s1')).map(([k]) => k).sort();
assert.deepStrictEqual(old, ['0,4', '4,5', '5,1', '8,4'], 'only the rooms awaiting new paintings keep old ones');
for (const key of ['8,5', '5,2', '8,0', '0,2', '6,2', '5,5']) assert(plan[key][0].endsWith('-s1'), key + ' (a landmark room) uses the new tiles');
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
