const {run}=require('./expansion.test.cjs');

run(`
newGame();
state.talents.powerCore=1;
state.room='0,1';let spawn=roomSpawns(state.room)[0];startBattle(spawn.uid);
state.battle.enemy.armor=0;
let strike=owned(state.deck.find(id=>owned(id).id==='strike')),strikeUid=strike.uid;
state.battle.boostedUids=[strikeUid];
let enemyHp=state.battle.enemy.hp;
state.battle.hand=[{...strike}];state.battle.energy=3;playCard(0);
assert.equal(state.battle.enemy.hp,enemyHp-7,'first use receives the boost');
assert.deepEqual(boostedCardUids(state.battle),[strikeUid],'boost target remains selected');
save();state=null;assert(load(),'active encounter reloads');
assert.deepEqual(boostedCardUids(state.battle),[strikeUid],'boost target survives a save reload');
state.battle.hand=[{...owned(strikeUid)}];state.battle.energy=3;playCard(0);
assert.equal(state.battle.enemy.hp,enemyHp-14,'later uses in the same encounter stay boosted');
state.battle=null;

configureRegion('city');state.room=Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type==='emberling'));spawn=roomSpawns(state.room).find(s=>s.type==='emberling');startBattle(spawn.uid);
const cityHp=state.battle.enemy.hp,cityAttack=state.battle.enemy.attack;state.battle=null;
configureRegion('elaris');state.room=Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type==='blightAntler'));spawn=roomSpawns(state.room).find(s=>s.type==='blightAntler');startBattle(spawn.uid);
assert(state.battle.enemy.hp>cityHp,'Elaris enemies have more health');
assert(state.battle.enemy.attack>cityAttack,'Elaris enemies hit harder');

for(const element of ELEMENTS){
 state.battle.turn=3;state.battle.enemy.element=element;state.battle.enemy.hp=100;
 state.battle.hand=[make('counter')];state.battle.energy=3;state.battle.block=0;
 const playerHp=state.hp;playCard(0);
 assert.equal(state.battle.counter,COUNTERS[element]);
 const enemyBefore=state.battle.enemy.hp;endTurn();
 assert.equal(state.hp,playerHp,'elemental counter blocks the incoming hit');
 assert.equal(state.battle.enemy.hp,enemyBefore-6,'elemental counter returns damage');
}

state.maxHp=31;state.hp=0;state.room='1,1';state.battle={phase:'fight',enemy:{hp:1},logs:[]};
loseBattle();assert.equal(state.hp,31,'defeat recovery restores full health');

function lootRoll(roll){newGame();state.talents={};state.battle={id:'test',spawnId:'test',phase:'fight',enemy:{hp:0,boss:false,elite:false},logs:[]};const old=Math.random;Math.random=()=>roll;winBattle();Math.random=old;return state.battle}
assert.equal(lootRoll(.005).lootType,'soulbound','under 1% rolls the Soulbound jackpot');
assert.equal(lootRoll(.15).lootType,'empty','1%-26% rolls an empty (looted) chest');
assert.equal(lootRoll(.40).lootType,'potion','26%-63% rolls a potion');
assert.equal(lootRoll(.40).potionDrop,true);
assert.equal(lootRoll(.75).lootType,'card','63%+ rolls a card');
assert(lootRoll(.75).reward,'a card roll actually grants a card');

const legacy={pool:[],deck:[],battle:null};
for(const element of ELEMENTS){const card=make('counter_'+element);legacy.pool.push(card);legacy.deck.push(card.uid)}
for(let i=0;i<4;i++){const card=make('strike');legacy.pool.push(card);if(i<2)legacy.deck.push(card.uid)}
normalizeElementalCards(legacy);
assert.equal(legacy.pool.filter(c=>c.id==='counter').length,1);
assert(!legacy.pool.some(c=>c.id.startsWith('counter_')));
assert.equal(legacy.deck.length,4);
console.log('PASS: encounter-long boosts, half-health defeat recovery, rarer potions, one adaptive counter card, and tougher Elaris enemies.');
`);
