const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/touch-controls.js'),'utf8'));
run(`{
// Round 91: Neon Aftermath is one continuous painted city of 54 rooms.
newGame();configureRegion('city');
const allKeys=Object.keys(rooms);assert.equal(allKeys.length,54,'9x6 rooms');
assert(allKeys.every(k=>organicDef(k)&&rooms[k].world),'every city room is a window on the painted world');
assert.equal(state.room,'0,5');renderWorld();assert(walkable('0,5',state.pos.x,state.pos.y),'you start on the street');
// Every exit has a street door; arriving through it lands on the street; neighbours line up.
for(const k of allKeys)for(const [d,raw] of Object.entries(rooms[k].exits)){
 const to=typeof raw==='string'?raw:raw.to,door=organicDoor(k,d);assert(door,'door '+k+' '+d);
 const back=Object.entries(rooms[to].exits).find(([,r])=>(typeof r==='string'?r:r.to)===k);assert(back,'two-way link '+k+'>'+to);
 const land=neonLanding(to,neonMirror(d,{x:door.edge.x,y:door.edge.y-22}),d);assert(land&&walkable(to,land.x,land.y),'continuous street '+k+' '+d);
}
// Progression: with no relics, the Citadel and the Junkyard are sealed; collecting them opens everything.
const reach=held=>{const seen=new Set(['0,5']),q=['0,5'];while(q.length){const k=q.shift();for(const raw of Object.values(rooms[k].exits)){const to=typeof raw==='string'?raw:raw.to;if(typeof raw==='object'&&raw.requires&&!held.includes(raw.requires))continue;if(!seen.has(to)){seen.add(to);q.push(to)}}}return seen};
const r0=reach([]);assert(!r0.has('8,4')&&!r0.has('8,9'),'both far districts start sealed');
for(const [relic,k] of [['boots','0,9'],['ember','5,7'],['lens','5,4']])assert.equal(rooms[k].relic[0],relic);
assert(r0.has('0,9')&&r0.has('5,7')&&r0.has('5,4'),'Briarstep Boots, the Ember Sigil and the Moon Lens are reachable without other relics');
assert(reach(['ember']).has('8,4'),'the Ember Sigil opens the Crystal Citadel');assert(!reach(['ember']).has('8,9'),'but not the Junkyard');
assert(reach(['boots']).has('8,9'),'Briarstep Boots open the Junkyard');assert.equal(reach(['ember','boots','lens']).size,54,'everything is reachable with all three');
// Bosses and patrols stand on the streets; relics and chests just beside them (Round 93).
assert.equal(rooms['8,4'].enemy[0],'thornWarden');assert.equal(rooms['8,9'].enemy[0],'crownSentinel');assert.equal(rooms['5,7'].enemy[0],'moonKnight');
for(const k of allKeys){
 for(const s of roomSpawns(k))assert(walkable(k,s.x,s.y),'patrol on the street in '+k);
 const r=rooms[k];if(r.relic)assert(organicBesideStreet(k,{x:r.relic[3],y:r.relic[4]}),'relic beside the street in '+k);
 const c=chestFor(k);if(c)assert(organicBesideStreet(k,c),'chest beside the street in '+k);
}
// Walking off the edge along a street carries you into the next room at the matching spot.
state.room='0,5';const door=organicDoor('0,5','e');state.pos={x:786,y:door.edge.y-22};keys={ArrowRight:true};move(.05);keys={};
assert.equal(state.room,'1,5','walked east into Floodgate Plaza');assert(state.pos.x<60&&Math.abs(state.pos.y-(door.edge.y-22))<=90,'arrived at the matching spot');
// Gates hold until the relic is found.
state.room='5,5';state.relics=[];const g=organicDoor('5,5','e');state.pos={x:786,y:g.edge.y-22};keys={ArrowRight:true};move(.05);keys={};assert.equal(state.room,'5,5','the Citadel gate is sealed');
state.relics=['ember'];state.pos={x:786,y:g.edge.y-22};keys={ArrowRight:true};move(.05);keys={};assert.equal(state.room,'6,5','the Ember Sigil opens it');
// The Thorn Warden's arena holds the portal to Elaris.
state.room='8,4';state.bosses.push('thornWarden');assert.equal(portalTarget().region,'elaris');
// Round 92: everything you can interact with is on a patch of street you can reach, and every such patch shows its exits.
for(const k of allKeys){
 const at=p=>organicReachableAt(k,p);
 for(const s of roomSpawns(k))assert(at(s),'patrol on a reachable street in '+k);
 const po=poiAt(k);if(po)assert(organicBesideStreet(k,po),'point of interest beside a reachable street in '+k);
 const reach=organicReachable(k);organicPockets(k).forEach((set,i)=>{const some=[...set][0];if(reach&&!reach.has(some))return;assert(Object.keys(rooms[k].exits).some(d=>{const door=organicDoor(k,d,i);return door&&door.inPocket!==false})||k==='0,5'&&i===organicPocketAt(k,{x:400,y:300}),'every reachable patch of '+k+' has a labelled exit')});
}
const m=merchantRoom();assert(organicBesideStreet(m.key,m),'the merchant stands beside a reachable street');
console.log('PASS: continuous 54-room Neon Aftermath: two-way street doors, seamless edges, relic gates and progression, bosses and patrols on the streets, relics/chests/POIs beside them, portal.');
}`);
