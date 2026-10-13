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
 // Old district rooms keep the strict rule: no loose crossing between two of them.
 out.strictStillStrict=!neonLoose('3,6','4,6');
 return JSON.stringify(out)})()`));
assert.deepEqual(res.missing,[],'every exit of a painted room has a usable door');
assert.deepEqual(res.noLand,[],'every such door lands on a street in the next room');
assert.deepEqual(res.oneWay,[],'every crossing works both ways');
assert(res.strictStillStrict,'old district rooms keep strict street-to-street crossings');
// The painting is drawn at full resolution, not squashed to 800x500.
const canvas=JSON.parse(run(`(()=>{const c={width:800,height:500,style:{},dataset:{},getContext:()=>({drawImage(){} })};
 const img=neonRoomImage('0,5');img.complete=true;img.naturalWidth=2000;img.naturalHeight=1250;
 paintNeonWorld(c,'0,5');return JSON.stringify({w:c.width,h:c.height,src:img.src})})()`));
assert.equal(canvas.w,2000);assert.equal(canvas.h,1250);assert(/rooms\/room-0-5\.webp$/.test(canvas.src));
console.log('PASS: '+art.length+' rooms with their own painting: images present, exits reachable, crossings land on streets both ways, drawn at full resolution.');
