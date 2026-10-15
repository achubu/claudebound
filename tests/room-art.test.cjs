// Round 100: Neon Aftermath rooms painted one image at a time (assets/environment/rooms/).
// Each listed room has its image, its traced streets reach every exit, and every crossing
// to or from it works both ways even where the two paintings' streets don't line up exactly.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const art=JSON.parse(run(`newGame();configureRegion('city');JSON.stringify(NEON_ROOM_ART)`));
assert(art.length>=12,'the first painted rooms are wired in');
for(const k of art)assert(fs.existsSync(path.join(__dirname,'../assets/environment/rooms/room-'+k.replace(',','-')+'.webp')),'image for '+k);
const res=JSON.parse(run(`(()=>{
 const out={missing:[],oneWay:[],noLand:[],strictStillStrict:true};
 const OPP={n:'s',s:'n',e:'w',w:'e'};
 for(const k of Object.keys(rooms))for(const [d,raw] of Object.entries(rooms[k].exits)){
  const to=typeof raw==='string'?raw:raw.to;if(!neonLoose(k,to))continue;
  const door=organicDoors(k,d).find(x=>x.inPocket!==false)||[0,1,2,3].map(i=>organicDoor(k,d,i)).find(x=>x&&x.inPocket!==false);
  if(!door){out.missing.push(k+' '+d);continue}
  const land=neonLandingFrom(k,to,neonMirror(d,{x:door.edge.x,y:door.edge.y-22}),d);
  if(!land||!walkable(to,land.x,land.y)){out.noLand.push(k+' '+d);continue}
  const back=[0,1,2,3].map(i=>organicDoor(to,OPP[d],i)).find(x=>x&&x.inPocket!==false);
  if(!back)out.oneWay.push(k+'>'+to);
 }
 // Round 132: every Neon Aftermath room has its own painting, so every crossing is loose.
 out.strictStillStrict=Object.keys(rooms).every(k=>neonRoomArt(k));
 return JSON.stringify(out)})()`));
assert.deepEqual(res.missing,[],'every exit of a painted room has a usable door');
assert.deepEqual(res.noLand,[],'every such door lands on a street in the next room');
assert.deepEqual(res.oneWay,[],'every crossing works both ways');
assert(res.strictStillStrict,'all 54 Neon Aftermath rooms have their own painting');
// The painting is drawn at full resolution, not squashed to 800x500.
const canvas=JSON.parse(run(`(()=>{const c={width:800,height:500,style:{},dataset:{},getContext:()=>({drawImage(){} })};
 const img=neonRoomImage('0,5');img.complete=true;img.naturalWidth=2000;img.naturalHeight=1250;
 paintNeonWorld(c,'0,5');return JSON.stringify({w:c.width,h:c.height,src:img.src})})()`));
assert.equal(canvas.w,2000);assert.equal(canvas.h,1250);assert(/rooms\/room-0-5\.webp$/.test(canvas.src));
// Round 101: chests, relics and points of interest in painted rooms stand on hand-checked open
// ground off the road, each with its own footpath from the street; the markers are small.
const nk=JSON.parse(run(`(()=>{const out={bad:[],used:[],count:0};
 for(const k of NEON_ROOM_ART){for(const [x,y,ax,ay,ex,ey] of NEON_NOOKS[k]||[]){out.count++;
  const stand=organicItemStand(k,{x,y});
  if(walkable(k,x,y))out.bad.push(k+' on path');
  else if(!stand||stand.d>30)out.bad.push(k+' too far '+(stand&&stand.d));
  else if(!organicReachableAt(k,stand))out.bad.push(k+' unreachable');
  if(Math.hypot(x-ax,y+22-ay)<30)out.bad.push(k+' not off the road');}}
 for(const p of Object.values(worldPOIs()))if((neonNooks(p.key)||[]).length)out.used.push(NEON_NOOKS[p.key].some(n=>n[0]===p.x&&n[1]===p.y)?'nook':p.key+' not on a nook');
 const q=rooms['5,4'].relic;out.relic=NEON_NOOKS['5,4'].some(n=>n[0]===q[3]&&n[1]===q[4]);
 const nx=poiAt('0,5');out.nexus=NEON_NOOKS['0,5'].some(n=>n[0]===nx.x&&n[1]===nx.y);
 return JSON.stringify(out)})()`));
assert(nk.count>=24,'about two spots per painted room');
assert.deepEqual(nk.bad,[],'every spot is off the road, beside its own footpath, and reachable');
assert(nk.used.length&&nk.used.every(u=>u==='nook'),'points of interest in painted rooms use the spots: '+nk.used.join(', '));
assert(nk.relic,'the Moon Lens sits on a spot');assert(nk.nexus,'the start waypoint sits on a spot');
const css=fs.readFileSync(path.join(__dirname,'../assets/neon-world.js'),'utf8');
for(const sel of ['.map-chest{width:20px','.poi-node{width:20px','.relic{width:24px'])assert(css.includes(sel),'small marker: '+sel);
// Round 104: relaxed pathing. Streets are widened inside rooms (sidewalks, kerbs, plaza edges),
// room edges keep their exact crossings, object spots stay off the path, the hint bar doesn't
// swallow taps, only taps right at an edge mean "exit", and a tap on an unreachable spot walks
// to the nearest reachable one.
const rx=JSON.parse(run(`(()=>{let wider=0,total=0,edgeSlivers=[];
 for(const k of NEON_ROOM_ART){const [cx,cy]=k.split(',').map(Number);for(let y=24;y<476;y+=8)for(let x=24;x<776;x+=8){total++;}
  for(let y=30;y<470;y+=8){const l=walkable(k,14,y),l2=walkable(k,40,y);if(l&&!l2&&!walkable(k,22,y))edgeSlivers.push(k)}}
 return JSON.stringify({relax:NEON_RELAX,slivers:[...new Set(edgeSlivers)]})})()`));
assert(rx.relax>=2,'streets are widened');
const tc=fs.readFileSync(path.join(__dirname,'../assets/touch-controls.js'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(/EXIT_BAND=\{x:44,y:34\},SCREEN_BAND=\.05/.test(tc),'only taps right at the edge mean exit');
assert(/if\(previous\[end\]===-2\)\{end=-1/.test(tc),'unreachable taps go to the nearest reachable spot');
assert(/\.hint\{[^}]*pointer-events:none/.test(html),'the hint bar lets taps through');
console.log('PASS: relaxed pathing (streets widened by '+rx.relax+' cells inside rooms), forgiving taps.');
console.log('PASS: '+nk.count+' off-road spots with footpaths; points of interest, relic and waypoint use them; small markers.');
console.log('PASS: '+art.length+' rooms with their own painting: images present, exits reachable, crossings land on streets both ways, drawn at full resolution.');
// Round 127: objects standing on a road count as road (the Dragon Gate arch is walkable).
const gate=JSON.parse(run(`newGame();configureRegion('city');JSON.stringify([[415,60],[415,100],[415,140],[370,120],[460,120]].map(([x,y])=>walkable('4,7',x,y)))`));
assert(gate.every(Boolean),'you can walk straight through the Dragon Gate');
console.log('PASS: objects on the road (Dragon Gate arch) are walkable.');
// Round 128: the hero is drawn at 80% size, scaled from the feet.
assert(/#player \.hero-sprite\{[^}]*transform-origin:50% 90%;transform:scale\(\.8\)\}/.test(html),'the hero is 80% size');
assert(/@keyframes hero-breathe\{0%,100%\{transform:scale\(\.8\)\}/.test(html),'breathing keeps the 80% size');
console.log('PASS: the hero is drawn at 80% size.');
