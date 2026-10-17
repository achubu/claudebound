// Round 173: a save in any room of any world loads (Chronospire rooms used to fail the Solaris room check).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const bad = JSON.parse(run(`(()=>{newGame();const base=JSON.parse(JSON.stringify(state));base.battle=null;const out=[];
 const worlds={city:Object.keys(CITY_ROOMS),elaris:ELARIS_ROOM_KEYS,vespera:VESPERA_ROOM_KEYS,chronospire:Object.keys(CHRONO_ROOM_DATA)};
 for(const [region,keys] of Object.entries(worlds))for(const room of keys){const s=JSON.parse(JSON.stringify(base));s.region=region;s.room=room;s.regionVisits[region]=[room];s.visited=[room];
  try{const v=validateImport(s);if(v.room!==room)out.push(region+':'+room+' moved to '+v.room)}catch(e){out.push(region+':'+room+' '+e.message)}}
 return JSON.stringify(out)})()`));
assert.deepStrictEqual(bad, [], 'rooms that fail to load: ' + bad.join(', '));
console.log('PASS: a save in any room of every world passes validation and keeps its room.');
