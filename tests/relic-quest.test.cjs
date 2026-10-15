// Round 136: playtest of the first world's unlock items. Every relic can be reached, is shown
// (dimmed and locked while guarded), says how many guards are left, is collected once its room
// is cleared, and opens its locked doors.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{const out={rooms:{}};
 for(const k of ['5,4','5,7','0,9']){newGame();configureRegion('city');state.playerLevel=30;state.room=k;const q=rooms[k].relic;
  const o=out.rooms[k]={guarded:relicGuarded(k),guards:relicGuards(k)};
  // A walkable, reachable spot within pickup range.
  let stand=null;for(let y=10;y<495&&!stand;y+=4)for(let x=10;x<795;x+=4){if(Math.hypot(x-q[3],y-q[4])<40&&walkable(k,x,y)&&organicReachableAt(k,{x,y})){stand={x,y};break}}
  o.stand=!!stand;state.pos=stand;state.battle=null;checkWorldInteractions();o.tooEarly=state.relics.includes(q[0]);
  for(const s of roomSpawns(k)){if(!spawnAvailable(s))continue;startBattle(s.uid);state.battle.enemy.hp=0;winBattle();finishBattle();state.room=k}
  o.afterGuarded=relicGuarded(k);state.pos=stand;state.battle=null;checkWorldInteractions();o.got=state.relics.includes(q[0])}
 // From the start, the three relics are reachable without any of them; with all three, every room is.
 const reach=have=>{const seen=new Set(['0,5']),q=['0,5'];while(q.length){const k=q.shift();for(const raw of Object.values(rooms[k].exits)){const to=typeof raw==='string'?raw:raw.to;if(!rooms[to]||seen.has(to))continue;if(typeof raw==='object'&&raw.requires&&!have.includes(raw.requires))continue;seen.add(to);q.push(to)}}return seen};
 const r0=reach([]);out.startReach=['5,4','5,7','0,9'].every(k=>r0.has(k));out.allReach=reach(['lens','ember','boots']).size===Object.keys(rooms).length;
 return JSON.stringify(out)})()`));
for(const [k,o] of Object.entries(r.rooms)){
 assert(o.guarded&&o.guards>0,k+': relic starts guarded');assert(o.stand,k+': you can stand next to the relic');
 assert(!o.tooEarly,k+': guarded relic is not taken early');assert(!o.afterGuarded&&o.got,k+': clearing the room lets you take it');}
assert(r.startReach,'all three relic rooms are reachable from the start');assert(r.allReach,'with all relics, every room is reachable');
const fs=require('node:fs'),js=fs.readFileSync(require('node:path').join(__dirname,'../assets/pickups.js'),'utf8');
assert(/relic-guarded/.test(js)&&/is guarded\. Defeat the/.test(js),'guarded relics are shown and explained');
console.log('PASS: first-world relics: reachable, shown while guarded, collected after clearing the room, open every locked door.');
