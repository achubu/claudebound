// Round 100: Neon Aftermath rooms painted one image at a time (assets/environment/rooms/).
// Each listed room has its image, its traced streets reach every exit, and every crossing
// to or from it works both ways even where the two paintings' streets don't line up exactly.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
// Round 389: the painted rooms are retired; Neon Aftermath is generated (assets/city-gen.js). The crossings still have to work.
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
 return JSON.stringify(out)})()`));
assert.deepEqual(res.missing,[],'every exit of a painted room has a usable door');
assert.deepEqual(res.noLand,[],'every such door lands on a street in the next room');
assert.deepEqual(res.oneWay,[],'every crossing works both ways');
// Round 389: the city's rooms are generated from the journey's seed, drawn by the generator, and its objects stand on the generated squares.
const gen=JSON.parse(run(`(()=>{newGame();configureRegion('city');const o={};o.loose=Object.keys(rooms).every(k=>neonLoose(k,k));o.squares=Object.keys(rooms).every(k=>plazaSpots(k)&&plazaSpots(k).length>=1);
 const a=Array.from(cityGenPlan('2,6').floor).join('');state.seed=12345;const b=Array.from(cityGenPlan('2,6').floor).join('');o.differs=a!==b;o.noPainting=!Object.keys(rooms).some(k=>neonRoomArt(k));return JSON.stringify(o)})()`));
assert(gen.loose&&gen.squares&&gen.differs&&gen.noPainting,'Round 389: generated city rooms, loose crossings, a square in every room: '+JSON.stringify(gen));
console.log('PASS: Neon Aftermath crossings work both ways, and its rooms are generated from the journey seed with a square for objects in each.');
