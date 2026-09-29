const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(`
newGame();
assert.equal(joinedArea('1,1').width,800);
assert.equal(joinedArea('0,1').width,1600);
assert.equal(joinedArea('2,2').height,1000);
for(const region of ['city','elaris']){
 configureRegion(region);
 for(const group of JOINED_AREAS[region]){
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
  if(joinedArea(key).cells.length===1)assert(roomSpawns(key).length<=1);
  for(const spawn of roomSpawns(key))assert(walkable(key,spawn.x,spawn.y,28));
 }
}
configureRegion('city');state.room='-1,1';state.pos={x:795,y:250};state.cooldowns={'test':3};keys={ArrowRight:true};move(.14);
assert.equal(state.room,'0,1');assert.equal(state.pos.x,19.5);assert.equal(state.cooldowns.test,3);assert(state.visited.includes('0,1'));
keys={ArrowLeft:true};move(.14);assert.equal(state.room,'-1,1');assert.equal(state.pos.x,795);
state.room='2,2';state.pos={x:400,y:495};keys={ArrowDown:true};move(.14);assert.equal(state.room,'2,3');assert.equal(state.pos.y,19.5);
keys={ArrowUp:true};move(.14);assert.equal(state.room,'2,2');assert.equal(state.pos.y,495);
state.room='2,1';state.pos={x:788,y:250};state.relics=[];keys={ArrowRight:true};move(.14);assert.equal(state.room,'2,1','Locked gate bypassed');
const area=joinedArea('2,2');assert.equal(cameraPosition(area,{x:800,y:500}).x,400);assert.equal(cameraPosition(area,{x:800,y:500}).y,250);assert.equal(cameraPosition(area,{x:1600,y:1000}).x,800);assert.equal(cameraPosition(area,{x:1600,y:1000}).y,500);
console.log('PASS: joined footprints, all internal routes, patrol density, bidirectional movement, continuous coordinates, cooldowns, gates and camera clamps.');
`);
