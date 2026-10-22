// Round 164: Solaris landmark rooms used their own paintings (retired in Round 228); every tile in the plan exists.
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'assets/solaris-data.js'), 'utf8');
const plan = JSON.parse(src.match(/SOLARIS_PLAN = (\{.*?\});/)[1]);
const layout = JSON.parse(src.match(/SOLARIS_LAYOUT = (\{.*?\});\n/)[1]);
for (const [key, [tile]] of Object.entries(plan))
  assert(fs.existsSync(path.join(root, 'assets/environment/solaris', tile + '.webp')), 'missing art for ' + key + ': ' + tile);
// Round 228: the new look. The landmark paintings (old style) are retired, and those rooms use the
// owner's top-down tiles ('-s1', '-s2') like the rest. Only the rooms whose shapes the new set doesn't
// have yet keep an old painting: since Round 230 that is the T causeway room (5,1) alone.
const isNew = tile => /-s\d+$/.test(tile);
const old = Object.entries(plan).filter(([, [tile]]) => !isNew(tile)).map(([k]) => k).sort();
assert.deepStrictEqual(old, [], 'every room uses the new look (Round 231)');
for (const key of ['8,5', '5,2', '8,0', '0,2', '6,2', '5,5']) assert(isNew(plan[key][0]), key + ' (a landmark room) uses the new tiles');
// Round 230: the west dead end (4,5) is the second corner, its south street running off the map's bottom edge.
assert.deepStrictEqual(plan['4,5'].slice(0, 1), ['corner-s2'], '4,5 uses the corner whose extra street runs off the map');
assert(!layout['4,6'], 'the corner\'s extra street at 4,5 leads off the map');
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
