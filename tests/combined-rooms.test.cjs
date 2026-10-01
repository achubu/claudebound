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
assert.equal(joinedArea('1,7').height,1000);
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
  if(joinedArea(key).cells.length===1)assert(roomSpawns(key).length<=3,'single rooms now scale 1-3 patrols with distance from the start room');
  for(const spawn of roomSpawns(key))assert(walkable(key,spawn.x,spawn.y,28));
 }
}
// These specifically exercise joinedExit()'s seamless continuous-
// coordinate transition between two cells of the SAME joined area (not a
// standard room-to-room transition, which resets to a fixed entry point
// instead) — so the replacement rooms must also be a real joined pair.
// Promenade Market (1,0/2,0) and Crown Mainframe District (4,1/4,2) are
// kept from the original 28-room map for exactly this reason.
configureRegion('city');state.room='1,7';state.pos={x:795,y:250};state.cooldowns={'test':3};keys={ArrowRight:true};move(.14);
assert.equal(state.room,'2,7');assert.equal(state.pos.x,19.5);assert.equal(state.cooldowns.test,3);assert(state.visited.includes('2,7'));
keys={ArrowLeft:true};move(.14);assert.equal(state.room,'1,7');assert.equal(state.pos.x,795);
state.room='1,7';state.pos={x:400,y:495};keys={ArrowDown:true};move(.14);assert.equal(state.room,'1,8');assert.equal(state.pos.y,19.5);
keys={ArrowUp:true};move(.14);assert.equal(state.room,'1,7');assert.equal(state.pos.y,495);
// City's rooms no longer use relic-gated exits at all (Round 26 replaced
// that with pure linear topology — no shortcuts means no gate needed) —
// but the underlying doorLocked()/move() gate-blocking mechanism is still
// real code, so it's exercised directly here with a synthetic gate rather
// than depending on the live map happening to have one.
const _origNExit=rooms['2,1'].exits.n;
rooms['2,1'].exits.n={to:'2,2',requires:'__testRelic'};
state.room='2,1';state.pos={x:400,y:12};state.relics=[];keys={ArrowUp:true};move(.14);assert.equal(state.room,'2,1','Locked gate bypassed');
if(_origNExit===undefined)delete rooms['2,1'].exits.n;else rooms['2,1'].exits.n=_origNExit; // restore exactly what was there before (2,1 has no real n exit)
const area=joinedArea('1,7');assert.equal(cameraPosition(area,{x:800,y:500}).x,400);assert.equal(cameraPosition(area,{x:800,y:500}).y,250);assert.equal(cameraPosition(area,{x:1600,y:1000}).x,800);assert.equal(cameraPosition(area,{x:1600,y:1000}).y,500);
console.log('PASS: joined footprints, all internal routes, patrol density, bidirectional movement, continuous coordinates, cooldowns, gates and camera clamps.');
`);
