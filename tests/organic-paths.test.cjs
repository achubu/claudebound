// Round 88-90: organic districts (traced paths with doors where paths meet the edges).
// Round 179: the last joined districts left with Vespera's old map; every world outside the city
// is now a painted tile world, which runs on the same organic engine through its world mask
// (ORGANIC_AREAS['world:<id>']). This checks that engine in every tile world: each room is
// organic, its doors sit on the path, arrivals land on the path, and patrols stand on it.
const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/organic-areas.js'),'utf8'));
run(`{
newGame();let doors=0;
for(const region of WORLD_ORDER){state.region=region;configureRegion(region);
 assert.equal((JOINED_AREAS[region]||[]).length,0,region+' has no joined districts left');
 if(region==='city')continue;
 for(const k of Object.keys(rooms)){
  assert(organicDef(k),region+' '+k+' walks on its painted path');
  for(const d of ['n','s','e','w'])if(organicExternalExit(k,d)){const door=organicDoor(k,d);assert(door,'door for '+region+' '+k+' '+d);
   const n=organicNormalize(k,door.inward);assert(walkable(n.key,n.pos.x,n.pos.y),'arrival on path '+region+' '+k+' '+d);doors++}
  for(const sp of roomSpawns(k))assert(walkable(k,sp.x,sp.y),region+' '+k+': patrol on path');
 }}
assert(doors>500,'doors checked: '+doors);
console.log('PASS: painted worlds walk on traced paths: '+doors+' doors on the path, arrivals and patrols on paths; no joined districts remain.');
}`);
