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
// Bosses, relics, patrols and chests stand on the streets.
assert.equal(rooms['8,4'].enemy[0],'thornWarden');assert.equal(rooms['8,9'].enemy[0],'crownSentinel');assert.equal(rooms['5,7'].enemy[0],'moonKnight');
for(const k of allKeys){
 for(const s of roomSpawns(k))assert(walkable(k,s.x,s.y),'patrol on the street in '+k);
 const r=rooms[k];if(r.relic)assert(walkable(k,r.relic[3],r.relic[4]),'relic on the street in '+k);
 const c=chestFor(k);if(c)assert(walkable(k,c.x,c.y),'chest on the street in '+k);
}
// Walking off the edge along a street carries you into the next room at the matching spot.
state.room='0,5';const door=organicDoor('0,5','e');state.pos={x:786,y:door.edge.y-22};keys={ArrowRight:true};move(.05);keys={};
assert.equal(state.room,'1,5','walked east into Floodgate Plaza');assert(state.pos.x<60&&Math.abs(state.pos.y-(door.edge.y-22))<=90,'arrived at the matching spot');
// Gates hold until the relic is found.
state.room='5,5';state.relics=[];const g=organicDoor('5,5','e');state.pos={x:786,y:g.edge.y-22};keys={ArrowRight:true};move(.05);keys={};assert.equal(state.room,'5,5','the Citadel gate is sealed');
state.relics=['ember'];state.pos={x:786,y:g.edge.y-22};keys={ArrowRight:true};move(.05);keys={};assert.equal(state.room,'6,5','the Ember Sigil opens it');
// The Thorn Warden's arena holds the portal to Elaris.
state.room='8,4';state.bosses.push('thornWarden');assert.equal(portalTarget().region,'elaris');
console.log('PASS: continuous 54-room Neon Aftermath: two-way street doors, seamless edges, relic gates and progression, bosses/relics/patrols/chests on the streets, portal.');
}`);
