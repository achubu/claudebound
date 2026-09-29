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
assert(html.includes('assets/cards/strike-lv2.png'),'cardHTML references the correct id+level art path');
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
  const file=path.join(cardsDir,`${id}-lv${level}.png`);
  if(!fs.existsSync(file))missing.push(`${id}-lv${level}.png`);
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
state.pos={x:400,y:145};
checkWorldInteractions();
assert.equal(materials(),materialsBeforeWalk+1,'walking to the Reactor Causeway chest grants an Upgrade Crystal');
assert.equal(state.potions,potionsBeforeWalk,'it does NOT also grant a potion');
assert(state.chests.includes('city:3,3'),'the chest is marked collected so it cannot be farmed repeatedly');

console.log('PASS: 2 new hidden Upgrade Crystal chests added to the city map, existing potion caches untouched, and the new crystal chest actually grants a crystal (not a potion) when collected.');
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

// --- Locked-route hint never appears for an unvisited room (would spoil
// content the player hasn't reached yet)
newGame();configureRegion('city');state.room='1,1';state.visited=['1,1'];
showMap();
const mapHtml=document.getElementById('menuModal').innerHTML;
assert(!/Unknown[^<]*<i class="lock-hint"/.test(mapHtml),'an unvisited ("Unknown") room never shows a locked-route hint');
console.log('PASS: joined areas render meaningfully bigger than single rooms on both map screens, single-room sizes are deterministically varied not uniform, locked routes are correctly flagged, room-type tags work, completion % is sane and reaches 100%, and locked-route hints never leak into unvisited rooms.');
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

