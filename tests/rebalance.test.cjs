const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));

run(`
// --- Armor reduces non-pierce damage, Pierce ignores it ---
newGame();
state.room='0,1';let spawn=roomSpawns(state.room)[0];startBattle(spawn.uid);
state.battle.enemy.armor=3;state.battle.enemy.hp=100;
state.battle.hand=[make('strike')];state.battle.energy=3;playCard(0);
assert.equal(state.battle.enemy.hp,100-Math.max(0,6-3),'armor reduces a non-pierce hit');
state.battle.hand=[make('shatter')];state.battle.energy=3;const hpBeforeShatter=state.battle.enemy.hp;playCard(0);
assert.equal(state.battle.enemy.hp,hpBeforeShatter-10,'Shatter Lance ignores armor entirely');
state.battle=null;

// --- Armor of 0 (or undefined, e.g. wildlife/boss) never reduces damage ---
state.room='0,1';spawn=roomSpawns(state.room)[0];startBattle(spawn.uid);
state.battle.enemy.armor=0;state.battle.enemy.hp=100;
state.battle.hand=[make('strike')];state.battle.energy=3;playCard(0);
assert.equal(state.battle.enemy.hp,94,'zero armor leaves damage untouched');
state.battle=null;

// --- Elaris reward pool now includes a block and a heal card ---
const seen=new Set();
for(let i=0;i<8000;i++){
 state.battle={phase:'fight',enemy:{hp:0,boss:false,elite:false},logs:[]};
 activeRegion='elaris';
 winBattle();
 if(state.battle.reward)seen.add(state.battle.reward.id);
}
assert(seen.has('bastion'),'Elaris reward pool now offers Bastion (block)');
assert(seen.has('mend'),'Elaris reward pool now offers Mend (healing)');
assert(seen.has('cinder')||seen.has('venom')||seen.has('gale')||seen.has('counter'),'Elaris still offers elemental cards');
activeRegion='city';

// --- All 8 city enemy types (including the previously-unused 3) now spawn ---
// Types are distance-tiered (see below), so forgeBeast/crownEye only live in
// the small pool of far-edge rooms — checking a single random seed can miss
// them by chance. Average across many seeds instead.
const types=new Set();
for(let i=0;i<25;i++){
 newGame();configureRegion('city');
 for(const key of Object.keys(rooms))for(const s of roomSpawns(key))types.add(s.type);
}
for(const t of ['emberling','thornling','burrower','vineguard','shade','cryptWisp','forgeBeast','crownEye'])
 assert(types.has(t),t+' now appears in the city spawn pool across 25 seeds');

// --- Elaris/Vespera region scaling increased as intended ---
newGame();
configureRegion('city');state.room=Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type==='emberling'));
let s2=roomSpawns(state.room).find(s=>s.type==='emberling');startBattle(s2.uid);
const cityHp=state.battle.enemy.hp;state.battle=null;
configureRegion('elaris');state.room=Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type==='blightAntler'));
s2=roomSpawns(state.room).find(s=>s.type==='blightAntler');startBattle(s2.uid);
assert(state.battle.enemy.hp>=Math.round(44*1.7),'Elaris scaling is meaningfully higher than before (was 1.35x)');
state.battle=null;

// --- Death now heals to full, not half ---
newGame();state.maxHp=40;state.hp=1;state.room='1,1';
state.battle={phase:'fight',enemy:{hp:1},logs:[]};
loseBattle();
assert.equal(state.hp,40,'defeat now heals the player back to full HP');

// --- Loot chest: exact odds boundaries ---
function forceRoll(roll){newGame();state.talents={};state.battle={id:'test',spawnId:'test',phase:'fight',enemy:{hp:0,boss:false,elite:false},logs:[]};const old=Math.random;Math.random=()=>roll;winBattle();Math.random=old;return state.battle}
assert.equal(forceRoll(0).lootType,'soulbound','roll 0 is inside the 1% Soulbound band');
assert.equal(forceRoll(.0099).lootType,'soulbound','just under 1% is still Soulbound');
assert.equal(forceRoll(.01).lootType,'empty','exactly 1% rolls over into the empty-chest band');
assert.equal(forceRoll(.2599).lootType,'empty','just under 26% is still empty');
assert.equal(forceRoll(.26).lootType,'potion','exactly 26% rolls over into potion');
assert.equal(forceRoll(.6299).lootType,'potion','just under 63% is still potion');
assert.equal(forceRoll(.63).lootType,'card','exactly 63% rolls over into card');
forceRoll(0);assert(state.pool.some(c=>['phoenix','oath','verdict'].includes(c.id)),'Soulbound jackpot actually grants a Soulbound card');
assert(typeof forceRoll(.15).thief==='string'&&forceRoll(.15).thief.length,'an empty chest names the animal that looted it');
assert(!forceRoll(.15).reward,'an empty chest grants no card');

// --- Enemy tiering by distance from the start room ---
newGame();configureRegion('city');
const dist=cityRoomDistances();
const nearTypes=new Set(),farTypes=new Set();
for(const key of Object.keys(rooms)){
 const d=dist[key]||0;
 for(const s of roomSpawns(key)){
  if(s.boss)continue; // designated boss slots are untouched by tiering
  if(d<=1)nearTypes.add(s.type);
  if(d>=4)farTypes.add(s.type);
 }
}
assert(nearTypes.size,'rooms adjacent to the start actually have patrols to sample');
for(const t of nearTypes)assert(['emberling','thornling'].includes(t),'only the easiest enemies spawn right next to the start: got '+t);
assert(farTypes.has('forgeBeast')||farTypes.has('crownEye')||farTypes.has('shade')||farTypes.has('cryptWisp'),'the far edge of the map offers the hardest non-boss enemies');
assert(!farTypes.has('emberling')&&!farTypes.has('thornling'),'the easiest enemies no longer spawn at the far edge of the map');

// --- Talent tree balance: no dead ranks (every point spent does something) ---
newGame();
function noDeadEnds(fn,max){let prev=-1;for(let r=0;r<=max;r++){const v=fn(r);assert(v>=prev,'rank '+r+' must not be worse than rank '+(r-1));prev=v}assert(fn(1)>fn(0),'the FIRST point spent must always do something (was a dead rank before this fix)');assert(fn(max)>fn(max-1),'the LAST point spent must always do something (was a dead rank before this fix)')}
noDeadEnds(r=>{state.talents={edge:r};return attackBonus()},5);
noDeadEnds(r=>{state.talents={amplifier:r};return boostAmount()},5);
noDeadEnds(r=>{state.talents={jammer:r};return weakenAmount()},5);
let prevHand=-1;for(let r=0;r<=2;r++){state.talents={quickdraw:r};const v=openingHand();assert(v>prevHand,'quickdraw rank '+r+' must beat rank '+(r-1));prevHand=v}
state.talents={overcharge:0};assert.equal(boostCharges(),1);state.talents={overcharge:1};assert.equal(boostCharges(),2,'a single Overcharge point now grants the second boost slot');
state.talents={capacitor:0};assert.equal(maxEnergy(),3);state.talents={capacitor:1};assert.equal(maxEnergy(),4,'a single Capacitor point now grants +1 energy');

// --- Every branch now has a working once-per-encounter capstone ---
assert(TALENT_BRANCHES.disruption.nodes.some(n=>n.id==='overload'),'Disruption has a capstone node (previously it had none)');
newGame();state.talents={weakenCore:1,jammer:2,quickdraw:2,capacitor:1,overload:1};
state.room='0,1';const s3=roomSpawns(state.room)[0];startBattle(s3.uid);
state.battle.overloadArmed=true;
state.battle.hand=[make('strike')];state.battle.energy=0; // 0 energy: a normal play would be blocked
const enemyHpBefore=state.battle.enemy.hp;
playCard(0);
assert.equal(state.battle.energy,0,'Overload does not spend energy the player did not have');
assert(state.battle.enemy.hp<enemyHpBefore,'the free card still dealt its damage');
assert(state.battle.overloadUsed,'Overload is consumed after one use');
state.battle.hand=[make('strike')];const hpBefore2=state.battle.enemy.hp;playCard(0);
assert.equal(state.battle.enemy.hp,hpBefore2,'once spent, Overload does not let a second free play through with 0 energy');

// --- Branch full-clear costs are now close together (18/16/15) instead of 20/20/15-with-no-capstone ---
const totals=Object.fromEntries(Object.entries(TALENT_BRANCHES).map(([k,b])=>[k,b.nodes.reduce((n,node)=>n+node.max,0)]));
assert(Math.max(...Object.values(totals))-Math.min(...Object.values(totals))<=4,'full-clear costs across branches are within a small spread: '+JSON.stringify(totals));

// --- Elite spawn chance now scales with distance instead of a flat 22% everywhere ---
newGame();configureRegion('city');
assert(regionDistanceFrac('0,1')<regionDistanceFrac('4,2'),'distance fraction is higher near the map edge than near the start');
// deterministic large-sample check of the actual elite rate by distance band
function eliteRateAt(minD,maxD,samples){
 let elite=0,total=0;
 for(let i=0;i<samples;i++){
  newGame();configureRegion('city');
  for(const key of Object.keys(rooms)){
   const d=regionDistance(key);
   if(d<minD||d>maxD)continue;
   for(const s of roomSpawns(key)){if(s.boss)continue;total++;if(s.elite)elite++}
  }
 }
 return elite/total;
}
const eliteNear=eliteRateAt(0,1,60),eliteFar=eliteRateAt(4,5,60);
assert(eliteNear<0.15,'elites should be rare near the start (got '+(eliteNear*100).toFixed(1)+'%)');
assert(eliteFar>0.25,'elites should be common near the map edge (got '+(eliteFar*100).toFixed(1)+'%)');
assert(eliteFar>eliteNear*2,'elite rate should be meaningfully higher far from the start than near it');

// --- Patrol density now scales with distance for single (unjoined) rooms ---
newGame();configureRegion('city');
assert.equal(areaPatrolCount('0,1'),1,'distance-1 single room: base density');
assert.equal(areaPatrolCount('0,0'),2,'distance-2 single room: one bump');
assert.equal(areaPatrolCount('4,0'),3,'distance-4 single room: at the practical 3-patrol ceiling');
// joined-area math must be completely unaffected (still capped, still summing correctly)
for(const group of JOINED_AREAS.city){
 let total=0;for(const key of group.cells)total+=roomSpawns(key).length;
 assert(total>=2&&total<=4,'joined-area total patrol count must stay in its existing tested range: '+group.name+' = '+total);
}

// --- Elaris/Vespera enemies now scale with distance from their own start room (previously flat) ---
// Averaged over many seeds: a single sample can be misleading since the 4
// wildlife species have very different base HP (38-55) independent of
// distance, so one lucky/unlucky species pick could mask the multiplier.
function avgElarisHpAt(dist,samples){
 let sum=0,n=0;
 for(let i=0;i<samples;i++){
  newGame();configureRegion('elaris');
  const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>!s.boss&&regionDistance(k)===dist));
  if(!key)continue;
  state.room=key;
  const spawn=roomSpawns(key).find(s=>!s.boss);
  startBattle(spawn.uid);
  sum+=state.battle.enemy.hp;n++;state.battle=null;
 }
 return sum/n;
}
const nearAvg=avgElarisHpAt(1,50),farAvg=avgElarisHpAt(5,50);
assert(farAvg>nearAvg*1.2,'Elaris enemies near the region edge/boss should average meaningfully tougher than near the entry portal (near avg='+nearAvg.toFixed(1)+', far avg='+farAvg.toFixed(1)+')');

// --- Heavy-hit multiplier scales with distance from the city's start room ---
// (a real playtest with a scripted bot found that because the enemy attack
// pattern is fully deterministic and revealed via enemyPlan(), a patient
// blocking-focused player could fully no-damage every city fight regardless
// of armor/HP tuning. Scaling the 'heavy' hit itself with distance is what
// actually broke that — verified directly here, not just simulated.)
newGame();configureRegion('city');
const battleStub={turn:3,enemy:{attack:10,element:null},enemyDebuff:0};
state.room='0,1';const nearHeavy=enemyPlan(battleStub,3).damage;
state.room='5,2';const farHeavy=enemyPlan(battleStub,3).damage;
assert(farHeavy>nearHeavy,'a heavy hit does more damage far from the start than near it, same base attack (near='+nearHeavy+' far='+farHeavy+')');
assert(nearHeavy<=Math.round(10*1.7),'near the start, the heavy-hit multiplier stays close to its original 1.5x (got '+nearHeavy+')');
assert.equal(farHeavy,Math.round(10*2.5),'at the map edge, the heavy-hit multiplier reaches its full 2.5x (got '+farHeavy+')');

console.log('PASS: armor/pierce mechanics, Elaris reward-pool fix, revived enemy types, raised region scaling, full-HP defeat recovery, loot chest odds, distance-based enemy tiering, talent-tree balance, distance-scaled elite rate, distance-scaled patrol density, Elaris/Vespera distance-scaled enemy strength, and distance-scaled heavy-hit damage all verified.');
`);
