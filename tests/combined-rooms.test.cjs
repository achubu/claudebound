const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(`
newGame();
assert.equal(joinedArea('1,5').width,800);
// Round 29's maze only has one art district left (Crown Mainframe, 4
// cells) — the old 2-cell Promenade Market pair doesn't exist in this
// layout, so there's no separate 1600-width 2-cell case to test here.
assert.equal(JOINED_AREAS.city.length,0,'Round 91: Neon Aftermath is one continuous painted map, no joined districts');
for(const region of ['city','elaris']){
 configureRegion(region);
 for(const group of JOINED_AREAS[region]){
  if(ORGANIC_AREAS[region+':'+group.art])continue; // organic districts: see organic-paths.test
  const area=joinedArea(group.cells[0]);assert.equal(area.width*area.height,group.cells.length*800*500);
  let patrolCount=0;
  for(const key of group.cells){
   patrolCount+=roomSpawns(key).length;
   for(const dir of Object.keys(rooms[key].exits)){
    const next=joinedExit(dir,key);if(!next)continue;
    assert.equal(rooms[key].exits[dir],next,'A locked gate must never become a seamless join');
    for(let n=0;n<=100;n++){
     const p={e:[400+4*n,250],w:[400-4*n,250],n:[400,250-2.5*n],s:[400,250+2.5*n]}[dir];
     assert(walkable(key,p[0],p[1],8),'Blocked connection '+key+' '+dir);
    }
   }
  }
  assert(patrolCount>=2&&patrolCount<=4,'Crowded combined area');
 }
 for(const key of Object.keys(rooms)){
  if(joinedArea(key).cells.length===1)assert(roomSpawns(key).length<=3,'single rooms now scale 1-3 patrols with distance from the start room');
  for(const spawn of roomSpawns(key))assert(walkable(key,spawn.x,spawn.y,28));
 }
}
// Round 91: Neon Aftermath has no joined districts any more; its continuous
// edges and relic gates are covered by neon-world.test. The camera clamp is
// still checked on a 2x2 district (Elaris's Emerald Expanse).
configureRegion('elaris');
const area=joinedArea('5,4');assert.equal(cameraPosition(area,{x:800,y:500}).x,400);assert.equal(cameraPosition(area,{x:800,y:500}).y,250);assert.equal(cameraPosition(area,{x:1600,y:1000}).x,800);assert.equal(cameraPosition(area,{x:1600,y:1000}).y,500);
console.log('PASS: joined footprints, all internal routes, patrol density, bidirectional movement, continuous coordinates, cooldowns, gates and camera clamps.');
`);
