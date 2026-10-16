// Round 168: never two things in one room. Every point of interest (lore, shrine, campfire, cache,
// sealed vault, event, Nexus Waypoint), the merchant, the Cardsmith, relics and hidden chests each
// get a room of their own, in every world and for any seed.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const clash = JSON.parse(run(`(()=>{const out=[];for(const seed of [1,7,42,1234,99999]){newGame();state.seed=seed;
 for(const region of ['city','elaris','vespera','chronospire']){state.region=region;configureRegion(region);
  for(let moves=0;moves<4;moves++){state.poi.merchantMoves=moves;const items={};const add=(k,w)=>{(items[k]=items[k]||[]).push(w)};
   for(const k of Object.keys(rooms)){const p=poiAt(k);if(p)add(k,p.type);if(rooms[k].relic)add(k,'relic');if(chestFor(k))add(k,'chest')}
   add(merchantRoom().key,'merchant');const c=cardsmithFor();if(c)add(c.key,'cardsmith');
   for(const [k,v] of Object.entries(items))if(v.length>1)out.push(seed+' '+region+' '+k+': '+v.join(' + '))}}}
 return JSON.stringify([...new Set(out)])})()`));
assert.deepStrictEqual(clash, [], 'rooms with more than one item:\n' + clash.join('\n'));
console.log('PASS: one item per room in every world (5 seeds, 4 merchant moves).');
