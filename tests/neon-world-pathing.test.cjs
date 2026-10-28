const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/touch-controls.js'),'utf8'));
// Round 92: a pathing playtest of the painted Neon Aftermath with the real controls.
// 1) Walk across every street that reaches a room edge, then straight back.
run(`{newGame();configureRegion('city');state.relics=['ember','boots','lens'];for(const k of Object.keys(rooms))for(const s of roomSpawns(k))state.cooldowns[s.uid]=999;state.bosses=['thornWarden','crownSentinel','moonKnight'];
checkWorldInteractions=()=>{};
const KEY={n:'ArrowUp',s:'ArrowDown',e:'ArrowRight',w:'ArrowLeft'},OPP={n:'s',s:'n',e:'w',w:'e'};
const hold=(d,sec)=>{keys={[KEY[d]]:true};for(let t=0;t<sec;t+=.033)move(.033);keys={}};
let tried=0,noCross=[],noBack=[],stuckInWall=[],bounce=[];
for(const k of Object.keys(rooms))for(const d of Object.keys(rooms[k].exits)){
 const horiz=d==='e'||d==='w',len=horiz?500:800;
 for(let t=20;t<len-20;t+=24){
  const p=horiz?{x:d==='e'?770:30,y:t-22}:{x:t,y:d==='s'?458:26};
  if(!walkable(k,p.x,p.y)||!organicReachableAt(k,p))continue; // Round 93: only street you can actually get to
  // is the street open all the way to the edge here?
  let open=true;for(let s=0;s<=26;s+=2){if((horiz&&(d==='e'?p.x+s>788:p.x-s<12))||(!horiz&&(d==='s'?p.y+s>488:p.y-s<12)))break;const q=horiz?{x:d==='e'?p.x+s:p.x-s,y:p.y}:{x:p.x,y:d==='s'?p.y+s:p.y-s};if(!walkable(k,q.x,q.y)){open=false;break}}if(!open)continue;
  tried++;neonArrival=null;state.room=k;state.pos={...p};hold(d,.35);
  if(state.room===k){const raw=rooms[k].exits[d],to=typeof raw==='string'?raw:raw.to;const m=horiz?{x:d==='e'?14:786,y:p.y}:{x:p.x,y:d==='s'?14:486};noCross.push(k+' '+d+'@'+t+(walkable(to,m.x,m.y)?' FAR-SIDE-OPEN':''));continue}
  const to=state.room,arrived={...state.pos};
  if(!walkable(to,arrived.x,arrived.y))stuckInWall.push(k+'>'+to);
  // keep walking a moment: must not bounce straight back
  hold(d,.25);if(state.room===k)bounce.push(k+' '+d+'@'+t);
  // now come back
  neonArrival=null;state.room=to;state.pos={...arrived};let back=false;keys={[KEY[OPP[d]]]:true};for(let tt=0;tt<3&&!back;tt+=.033){move(.033);if(state.room===k)back=true}keys={};
  if(!back)noBack.push(k+' '+d+'@'+t+' (in '+state.room+' '+Math.round(state.pos.x)+','+Math.round(state.pos.y)+')');
 }}
console.log('crossings tried',tried);
console.log('street reaches the edge but no crossing ('+noCross.length+'):',noCross.join(', '));
console.log('crossed but cannot walk straight back ('+noBack.length+'):',noBack.join(', '));
console.log('landed inside scenery:',stuckInWall.join(', '));
console.log('bounced back:',bounce.join(', '));;assert.equal(noBack.length,0,'every crossing can be walked straight back: '+noBack.join(', '));assert.equal(stuckInWall.length,0,'never land inside scenery');assert.equal(bounce.length,0,'no bounce-backs');assert(tried>600,'sampled '+tried+' crossings')}`);
// 2) Tap-to-move from every exit to every other exit, enemy, point of interest, relic and chest in the same patch of street.
run(`{newGame();configureRegion('city');state.relics=['ember','boots','lens'];for(const k of Object.keys(rooms))for(const s of roomSpawns(k))state.cooldowns[s.uid]=999;state.bosses=['thornWarden','crownSentinel','moonKnight'];checkWorldInteractions=()=>{};
const fails=[],noRoute=[],slow=[];let n=0;
for(const k of Object.keys(rooms))for(let pi=0;pi<organicPockets(k).length;pi++){if(organicPockets(k)[pi].size<60)continue;const inP=p=>organicPocketAt(k,p)===pi;const ds=Object.keys(rooms[k].exits).flatMap(d=>organicDoors(k,d,pi).filter(x=>x.inPocket!==false).map(x=>[d,x])).filter(x=>inP(x[1].inward));
 const targets=ds.map(([d,door])=>({name:'door '+d,p:{x:door.edge.x,y:door.edge.y-22},exit:{dir:d,key:k}}));
 for(const s of roomSpawns(k))if(inP(s))targets.push({name:'enemy',p:{x:s.x,y:s.y}});const po=poiAt(k);if(po&&inP(po))targets.push({name:'poi '+po.type,p:{x:po.x,y:po.y}});
 const r=rooms[k];if(r.relic&&inP({x:r.relic[3],y:r.relic[4]}))targets.push({name:'relic',p:{x:r.relic[3],y:r.relic[4]}});const c=chestFor(k);if(c&&inP(c))targets.push({name:'chest',p:{x:c.x,y:c.y}});
 for(const [d,door] of ds){for(const t of targets){if(t.name==='door '+d)continue;n++;
  neonArrival=null;state.room=k;state.pos={...door.inward};touchRoute=null;
  const ok=setTouchDestination(t.p,t.exit||null);if(!ok){noRoute.push(k+' from '+d+' to '+t.name);continue}
  let i=0;for(;i<600&&touchRoute&&state.room===k;i++)move(.033);
  if(t.exit){if(state.room===k)fails.push(k+' '+d+'->'+t.name+' stayed ('+Math.round(state.pos.x)+','+Math.round(state.pos.y)+')')}
  else if(touchRoute||Math.hypot(state.pos.x-t.p.x,state.pos.y-t.p.y)>40)fails.push(k+' '+d+'->'+t.name+' ended '+Math.round(state.pos.x)+','+Math.round(state.pos.y)+' target '+t.p.x+','+t.p.y);
  if(i>400)slow.push(k+' '+d+'->'+t.name);
 }}}
console.log('routes tried',n);console.log('NO ROUTE ('+noRoute.length+'):',noRoute.join('; '));console.log('FAILED ('+fails.length+'):',fails.join('; '));console.log('slow:',slow.join('; '));assert.equal(noRoute.length,0,'tap routes: '+noRoute.join('; '));assert.equal(fails.length,0,'tap routes: '+fails.join('; '))}`);
// 3) Random keyboard walks and taps: never inside scenery, never unable to move. (Round 275: an item's walkable pad counts as ground.)
run(`{newGame();configureRegion('city');state.relics=['ember','boots','lens'];for(const k of Object.keys(rooms))for(const s of roomSpawns(k))state.cooldowns[s.uid]=999;state.bosses=['thornWarden','crownSentinel','moonKnight'];checkWorldInteractions=()=>{};renderWorld();
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const dirs=[['ArrowUp'],['ArrowDown'],['ArrowLeft'],['ArrowRight'],['ArrowUp','ArrowLeft'],['ArrowUp','ArrowRight'],['ArrowDown','ArrowLeft'],['ArrowDown','ArrowRight']];
const seen=new Set([state.room]);let inWall=0,frozen=0,steps=0,taps=0,tapFail=0;const wallRooms=new Set(),frozenAt=new Set();
for(let ep=0;ep<1200;ep++){
 if(rnd()<.25){ // tap a random street spot in the room
  const pts=organicGrid(state.room);const i=Math.floor(rnd()*pts.length/2)*2;taps++;if(!setTouchDestination({x:pts[i],y:pts[i+1]}))tapFail++;for(let j=0;j<300&&activeTouchRoute();j++){move(.033);steps++}
 } else {const d=dirs[Math.floor(rnd()*8)];keys=Object.fromEntries(d.map(k=>[k,true]));const n=5+Math.floor(rnd()*40);for(let j=0;j<n;j++){move(.033);steps++;seen.add(state.room);if(!walkable(state.room,state.pos.x,state.pos.y)&&!itemPadAt(state.room,state.pos.x,state.pos.y)){inWall++;wallRooms.add(state.room+'@'+Math.round(state.pos.x)+','+Math.round(state.pos.y))}}keys={}}
 seen.add(state.room);
 // frozen check: can we move in at least one direction?
 const p={...state.pos},r=state.room;let can=false;for(const d of dirs.slice(0,4)){keys={[d[0]]:true};move(.033);keys={};if(state.room!==r||Math.hypot(state.pos.x-p.x,state.pos.y-p.y)>.5)can=true;neonArrival=null;state.room=r;state.pos={...p};}
 if(!can){frozen++;frozenAt.add(r+'@'+Math.round(p.x)+','+Math.round(p.y))}
}
console.log('steps',steps,'rooms visited',seen.size+'/54','taps',taps,'tap failed (unreachable spot in another pocket)',tapFail);
console.log('inside scenery',inWall,[...wallRooms].slice(0,10).join(' '));console.log('frozen',frozen,[...frozenAt].slice(0,10).join(' '));assert.equal(inWall,0,'never inside scenery');assert.equal(frozen,0,'never frozen')}`);
// 4) Tap exit labels only: every room can be reached from the start.
run(`{newGame();configureRegion('city');state.relics=['ember','boots','lens'];for(const k of Object.keys(rooms))for(const s of roomSpawns(k))state.cooldowns[s.uid]=999;state.bosses=['thornWarden','crownSentinel','moonKnight'];checkWorldInteractions=()=>{};
renderWorld();const start={room:state.room,pos:{...state.pos}};const seen=new Map();const q=[start];const id=s=>s.room+'#'+organicPocketAt(s.room,s.pos);seen.set(id(start),start);const fails=[];
while(q.length){const s=q.shift();const pi=organicPocketAt(s.room,s.pos);for(const d of Object.keys(rooms[s.room].exits))for(const door of organicDoors(s.room,d,pi)){if(!door||door.inPocket===false)continue;
 state.room=s.room;state.pos={...s.pos};neonArrival=null;if(!setTouchDestination({x:door.edge.x,y:door.edge.y-22},{dir:d,key:s.room})){fails.push('noroute '+id(s)+' '+d);continue}
 for(let i=0;i<800&&activeTouchRoute()&&state.room===s.room;i++)move(.033);
 if(state.room===s.room){fails.push('stayed '+id(s)+' '+d+' at '+Math.round(state.pos.x)+','+Math.round(state.pos.y));continue}
 const n={room:state.room,pos:{...state.pos}};if(!seen.has(id(n))){seen.set(id(n),n);q.push(n)}}}
const rooms_=new Set([...seen.keys()].map(k=>k.split('#')[0]));console.log('rooms reachable by tapping exit labels',rooms_.size+'/54');console.log('missing',Object.keys(rooms).filter(k=>!rooms_.has(k)).join(' '));console.log('fails',fails.join('; '));assert.equal(rooms_.size,54,'every room can be reached by tapping exit labels: missing '+Object.keys(rooms).filter(k=>!rooms_.has(k)).join(' '));assert.equal(fails.length,0,fails.join('; '))}`);
console.log('PASS: Neon Aftermath pathing playtest: every room reachable by tapping exits; reversible crossings, tap routes to every exit and point of interest, no wall clipping or freezes.');
