const fs=require('node:fs');const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../assets/touch-controls.js'),'utf8'));
run(`
{
newGame();state.playerLevel=30;
assert.equal(rollUpgradeCrystal('assault',.79).rarity,'uncommon');assert.equal(rollUpgradeCrystal('aegis',.80).rarity,'rare');assert.equal(rollUpgradeCrystal('capacity',.97).rarity,'epic');
state.device.crystals=Array.from({length:5},(_,i)=>({uid:'crystal-'+(i+1),type:'assault',rarity:'epic'}));state.device.slots=state.device.crystals.map(c=>c.uid);
state.device.next=1;assert(!state.device.crystals.some(c=>c.uid===rollUpgradeCrystal('capacity',.5).uid),'new drops must not reuse imported IDs');assert.equal(deviceBonus('assault'),3);assert.equal(crystalOpeningBlock(),2,'rarity shields never stack');
state.device.crystals.forEach(c=>c.type='capacity');assert.equal(deviceBonus('capacity'),5);
state.device.crystals[0].rarity='invalid';assert.throws(()=>validateImport(JSON.parse(JSON.stringify(state))));state.device.crystals[0].rarity='epic';
save();state=null;assert(load());assert.equal(crystalOpeningBlock(),2);
// A reserved counter survives a quiet turn; normal attacks are not counter windows.
configureRegion('elaris');state.region='elaris';state.room='1,0';state.hp=59;state.maxHp=59;startBattle(roomSpawns(state.room)[0].uid);
let b=state.battle;b.enemy.hp=300;b.enemy.maxHp=300;b.enemy.element='fire';b.hand=[make('counter')];b.savedUid=b.hand[0].uid;const counterUid=b.savedUid;
endTurn();assert(b.hand.some(c=>c.uid===counterUid));assert.equal(enemyPlan().kind,'charge');
b.hand=[b.hand.find(c=>c.uid===counterUid)];b.energy=3;playCard(0);const beforeCharge=state.hp;endTurn();assert.equal(state.hp,beforeCharge);assert(b.counter,'counter stays armed through charging');
const beforeStrike=state.hp,enemyBefore=b.enemy.hp;endTurn();assert.equal(state.hp,beforeStrike);assert.equal(b.enemy.hp,enemyBefore-6);assert(!b.playerBurn,'counter blocks status');
b.turn=3;b.enemy.element='water';b.disrupted=true;b.block=0;b.enemy.hp=300;b.playerPoison=0;const hpBeforeShock=state.hp,shockDamage=Math.ceil(enemyPlan().damage/2);endTurn();assert.equal(state.hp,hpBeforeShock-shockDamage);assert(!b.disrupted);
// Boss unlock and reward happen once, then both regions round-trip through the portal.
state.battle=null;state.room='10,9';assert.equal(portalTarget(),null);const boss=roomSpawns('10,9').find(s=>s.boss);assert.equal(boss.type,'bloomTyrant');startBattle(boss.uid);winBattle();
assert(state.bosses.includes('bloomTyrant'));assert.equal(state.pool.filter(c=>c.id==='stormglass').length,1);assert(state.pool.find(c=>c.id==='stormglass').soulbound);
finishBattle();assert.equal(portalTarget().region,'vespera');travelPortal();assert.equal(state.region,'vespera');assert.equal(Object.keys(rooms).length,4);assert.equal(joinedArea().cells.length,4);
save();state=null;assert(load());assert.equal(state.region,'vespera');validateImport(JSON.parse(JSON.stringify(state)));travelPortal();assert.equal(state.region,'elaris');assert.equal(state.room,'10,9');
// Touch route crosses joined room seams using normal collision and movement.
state.room='1,0';state.pos={x:760,y:250};state.battle=null;keys={};assert(setTouchDestination({x:860,y:250}));
for(let i=0;i<200&&touchRoute;i++)move(.033);
assert.equal(state.room,'2,0');assert(Math.abs(state.pos.x-50)<=1);assert(!touchRoute);
state.room='5,4';state.pos={x:400,y:450};assert(setTouchDestination({x:400,y:550}));for(let i=0;i<250&&touchRoute;i++)move(.033);assert.equal(state.room,'5,5');assert(!touchRoute);
assert(setTouchDestination({x:400,y:700}));keys={ArrowLeft:true};move(.033);assert.equal(touchRoute,null);keys={};
console.log('PASS: bounded crystal rarities, counter reservation/timing/status prevention, Lightning disruption, boss unlock, third-region saves, touch seams and manual override.');
}
`);
