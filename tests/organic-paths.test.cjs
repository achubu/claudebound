const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../assets/organic-paths.js'),'utf8'));
run(`{
// Round 88: a synthetic winding-path district proves the engine end to end.
newGame();state.region='elaris';configureRegion('elaris');
const W=400,H=250,bits=new Uint8Array(W*H),dot=(cx,cy,r)=>{for(let y=Math.max(0,cy-r);y<Math.min(H,cy+r);y++)for(let x=Math.max(0,cx-r);x<Math.min(W,cx+r);x++)if((x-cx)**2+(y-cy)**2<=r*r)bits[y*W+x]=1};
const stroke=(pts,r)=>{for(let i=1;i<pts.length;i++){const [a,b]=[pts[i-1],pts[i]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let t=0;t<=n;t++)dot(Math.round(a[0]+(b[0]-a[0])*t/n),Math.round(a[1]+(b[1]-a[1])*t/n),r)}};
// Area px /4: west door at area y≈300 (cell 5,4), south doors at area x≈250 and x≈1300.
stroke([[0,75],[60,90],[120,70],[200,110],[260,150],[330,170],[325,249]],6); // west → winding → south-east
stroke([[200,110],[150,170],[90,200],[62,249]],6);                        // branch → south-west
const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let s='';for(let i=0;i<bits.length;i+=6){let v=0;for(let j=0;j<6;j++)v=v<<1|(bits[i+j]||0);s+=abc[v]}
ORGANIC_AREAS['elaris:emerald']={src:'test-organic',mask:s};
const cells=JOINED_AREAS.elaris.find(g=>g.art==='emerald').cells;
assert(organicDef('5,4')&&organicDef('6,5')&&!organicDef('0,0'),'only the district is organic');
// Doors are found where the paths meet the edges.
const w=organicDoor('5,4','w'),s1=organicDoor('5,5','s'),s2=organicDoor('6,5','s');
assert(w&&Math.abs(w.along-300)<30,'west door sits on the path ('+(w&&w.along)+')');
assert(s1&&Math.abs(s1.along-250)<40,'south-west door ('+(s1&&s1.along)+')');
assert(s2&&Math.abs(s2.along-500)<40,'south-east door ('+(s2&&s2.along)+')');
for(const d of [w,s1,s2]){assert(walkable(d===w?'5,4':d===s1?'5,5':'6,5',d.inward.x,d.inward.y),'arrival point is on the path')}
// Off-path ground is solid, the path is open.
assert(!walkable('5,4',400,80)&&walkable('5,4',w.inward.x,w.inward.y));
// Patrols and chests end up on paths.
for(const k of cells)for(const sp of roomSpawns(k))assert(walkable(k,sp.x,sp.y),'patrol on path in '+k);
// Arriving from the west neighbour lands at the door, and walking back out leaves.
state.room='4,4';state.pos={x:770,y:250};assert(transition('e'));assert.equal(state.room,'5,4');
assert.deepEqual(state.pos,w.inward,'arrive at the west door');
state.pos={x:14,y:w.along-22};move(0);assert.equal(state.room,'4,4','walking into the door leaves the district');
delete ORGANIC_AREAS['elaris:emerald'];
console.log('PASS: organic districts walk on traced paths with doors where paths meet the edges.');
}`);
// Round 89/90: every real organic painting — each door has a path, arrivals land on a path, all doors connect.
run(fs.readFileSync(path.join(__dirname,'../assets/organic-areas.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../assets/touch-controls.js'),'utf8'));
run(`{
for(const c of [organicDoorCache,organicBits,spawnCatalog])for(const k in c)delete c[k];
newGame();let checked=0;
for(const region of ['city','elaris','vespera']){state.region=region;configureRegion(region);
 for(const g of JOINED_AREAS[region]){if(!ORGANIC_AREAS[region+':'+g.art])continue;checked++;
  const area=joinedArea(g.cells[0]),doors=[];
  for(const k of area.cells)for(const d of ['n','s','e','w'])if(organicExternalExit(k,d)){
   const door=organicDoor(k,d);assert(door,'door for '+region+' '+k+' '+d);
   const n=organicNormalize(k,door.inward);assert(walkable(n.key,n.pos.x,n.pos.y),'arrival on path '+region+' '+k+' '+d);
   const o=cellOffset(k,area);doors.push({x:o.x+door.inward.x,y:o.y+door.inward.y});
  }
  assert(doors.length>=2,g.name+' has doors');
  for(let i=0;i<doors.length;i++)for(let j=i+1;j<doors.length;j++)assert(findTouchPath(area,doors[i],doors[j]),g.name+': doors '+i+' and '+j+' connect');
  for(const k of area.cells)for(const sp of roomSpawns(k))assert(walkable(k,sp.x,sp.y),g.name+': patrol on path');
 }}
assert.equal(checked,6,'six organic districts');
console.log('PASS: six organic districts: every door on a connected path, arrivals and patrols on paths.');
}`);
