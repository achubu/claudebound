// Round 136: playtest of the first world's unlock items. Round 176: every world now has two gear
// pieces, one guarded by each mini-boss. Each can be reached, is shown (dimmed and locked while
// guarded), is collected once its room is cleared, and both together open the final boss room.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{const out={};
 for(const w of WORLD_ORDER){newGame();state.region=w;configureRegion(w);const W=out[w]={rooms:{}};
  const gearRoomKeys=Object.keys(rooms).filter(k=>rooms[k].relic&&GEAR[rooms[k].relic[0]]);W.count=gearRoomKeys.length;
  for(const k of gearRoomKeys){newGame();state.region=w;configureRegion(w);state.playerLevel=60;state.room=k;const q=rooms[k].relic;
   const o=W.rooms[k]={guarded:relicGuarded(k),guards:relicGuards(k),mini:!!(rooms[k].enemy&&enemies[rooms[k].enemy[0]].miniBoss)};
   let stand=null;for(let y=10;y<495&&!stand;y+=4)for(let x=10;x<795;x+=4){if(Math.hypot(x-q[3],y-q[4])<40&&walkable(k,x,y)&&(typeof organicReachableAt!=='function'||organicReachableAt(k,{x,y}))){stand={x,y};break}}
   o.stand=!!stand;state.pos=stand||{x:q[3],y:q[4]};state.battle=null;checkWorldInteractions();o.tooEarly=state.relics.includes(q[0]);
   for(const s of roomSpawns(k)){if(!spawnAvailable(s))continue;startBattle(s.uid);state.battle.enemy.hp=0;winBattle();finishBattle();state.room=k}
   o.afterGuarded=relicGuarded(k);state.pos=stand||{x:q[3],y:q[4]};state.battle=null;checkWorldInteractions();o.got=state.relics.includes(q[0]);o.worn=wornGear().includes(q[0])}
  const start=regionStartRoom(w),boss=WORLD_BOSS_ROOMS[w][0];
  const reach=have=>{const seen=new Set([start]),q=[start];while(q.length){const k=q.shift();for(const raw of Object.values(rooms[k].exits)){const to=typeof raw==='string'?raw:raw.to;if(!rooms[to]||seen.has(to))continue;if(typeof raw==='object'&&raw.requires&&!have.includes(raw.requires))continue;seen.add(to);q.push(to)}}return seen};
  const r0=reach([]);W.startReach=gearRoomKeys.every(k=>r0.has(k));W.bossSealed=!r0.has(boss);W.allReach=reach(['gate:'+w]).size===Object.keys(rooms).length}
 return JSON.stringify(out)})()`));
for(const [w,W] of Object.entries(r)){
 assert.equal(W.count,2,w+' has two gear pieces');
 for(const [k,o] of Object.entries(W.rooms)){
  assert(o.mini,w+' '+k+': a mini-boss guards it');assert(o.guarded&&o.guards>0,w+' '+k+': gear starts guarded');assert(o.stand,w+' '+k+': you can stand next to it');
  assert(!o.tooEarly,w+' '+k+': guarded gear is not taken early');assert(!o.afterGuarded&&o.got,w+' '+k+': beating the mini-boss lets you take it');assert(o.worn,w+' '+k+': it goes on at once when its slot is empty');}
 assert(W.startReach,w+': both gear rooms are reachable from the start');assert(W.bossSealed,w+': the final boss room starts sealed');assert(W.allReach,w+': with both pieces every room is reachable');
}
const fs=require('node:fs'),js=fs.readFileSync(require('node:path').join(__dirname,'../assets/pickups.js'),'utf8');
assert(/relic-guarded/.test(js)&&/is guarded\. Defeat the/.test(js),'guarded relics are shown and explained');
console.log('PASS: in all six worlds, two mini-boss-guarded gear pieces are reachable, collected after the fight, worn, and open the final boss room.');
