const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../assets/organic-paths.js'),'utf8'));
run(`{
// Round 88: a synthetic winding-path district proves the engine end to end.
// Round 149: world 2 is now Solaris (a painted tile world), so this runs on Vespera's 2x2 Foundry district.
newGame();state.region='vespera';configureRegion('vespera');
const W=400,H=250,bits=new Uint8Array(W*H),dot=(cx,cy,r)=>{for(let y=Math.max(0,cy-r);y<Math.min(H,cy+r);y++)for(let x=Math.max(0,cx-r);x<Math.min(W,cx+r);x++)if((x-cx)**2+(y-cy)**2<=r*r)bits[y*W+x]=1};
const stroke=(pts,r)=>{for(let i=1;i<pts.length;i++){const [a,b]=[pts[i-1],pts[i]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let t=0;t<=n;t++)dot(Math.round(a[0]+(b[0]-a[0])*t/n),Math.round(a[1]+(b[1]-a[1])*t/n),r)}};
// Area px /4: north door at area x≈400 (cell 8,3), east door at area y≈750 (cell 9,4).
stroke([[100,0],[90,40],[120,70],[200,110],[260,150],[330,180],[399,187]],6); // north → winding → east
stroke([[200,110],[150,170],[90,200]],6);                                    // dead-end branch
const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let s='';for(let i=0;i<bits.length;i+=6){let v=0;for(let j=0;j<6;j++)v=v<<1|(bits[i+j]||0);s+=abc[v]}
const realFoundry=ORGANIC_AREAS['vespera:foundry'];for(const c of [organicDoorCache,organicBits,spawnCatalog])for(const k in c)delete c[k];
ORGANIC_AREAS['vespera:foundry']={src:'test-organic',mask:s};
const cells=JOINED_AREAS.vespera.find(g=>g.art==='foundry').cells;
const plain=Object.keys(rooms).find(k=>!JOINED_AREAS.vespera.some(g=>g.cells.includes(k)));
assert(organicDef('8,3')&&organicDef('9,4')&&!organicDef(plain),'only the district is organic');
// Doors are found where the paths meet the edges.
const n=organicDoor('8,3','n'),e=organicDoor('9,4','e');
assert(n&&Math.abs(n.along-400)<30,'north door sits on the path ('+(n&&n.along)+')');
assert(e&&Math.abs(e.along-250)<40,'east door ('+(e&&e.along)+')');
assert(walkable('8,3',n.inward.x,n.inward.y)&&walkable('9,4',e.inward.x,e.inward.y),'arrival point is on the path');
// Off-path ground is solid, the path is open.
assert(!walkable('8,3',700,80)&&walkable('8,3',n.inward.x,n.inward.y));
// Patrols end up on paths.
for(const k of cells)for(const sp of roomSpawns(k))assert(walkable(k,sp.x,sp.y),'patrol on path in '+k);
// Arriving from the north neighbour lands at the door.
state.room='8,2';state.pos={x:n.along,y:470};assert(transition('s'));assert.equal(state.room,'8,3');
assert.deepEqual(state.pos,n.inward,'arrive at the north door');
ORGANIC_AREAS['vespera:foundry']=realFoundry;for(const c of [organicDoorCache,spawnCatalog])for(const k in c)delete c[k];
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
assert.equal(checked,3,'three organic districts, all in Vespera (Crown Mainframe joined the city in Round 91; the two Elaris districts left with Solaris in Round 149)');
console.log('PASS: six organic districts: every door on a connected path, arrivals and patrols on paths.');
}`);
