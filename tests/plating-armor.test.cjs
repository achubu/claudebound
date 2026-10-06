const {run}=require('./expansion.test.cjs');
run(`{ 
newGame();state.playerLevel=10;state.talents={retainCore:1,plating:3};
state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
assert.equal(state.battle.block,crystalOpeningBlock(),'Plating no longer grants opening Block');
ENEMY_AFFLICTIONS[state.battle.id]=[];state.battle.enemy.element=null;state.hp=state.maxHp=100;
for(let turn=0;turn<3;turn++){
 const b=state.battle,raw=enemyPlan(b).damage,block=turn===1?2:0;
 b.block=block;const before=state.hp;endTurn();
 assert.equal(before-state.hp,Math.max(0,raw-3-block),'Armor reduces every attack and stacks with Block');
 assert.equal(state.battle.block,0,'temporary Block still expires');
}
save();assert(load());assert.equal(talentRank('plating'),3);
const before=state.hp,raw=enemyPlan().damage;endTurn();
assert.equal(before-state.hp,Math.max(0,raw-3),'Armor still applies after a mid-battle reload');
renderBattle();assert(document.getElementById('battleModal').innerHTML.includes('3 Armor'),'combat displays player Armor');
state.battle=null;showCharacter();assert(document.getElementById('menuModal').innerHTML.includes('Armor 3'));
assert(TALENT_BRANCHES.resolve.nodes.find(n=>n.id==='plating').desc.includes('+1 Armor per rank'));
console.log('PASS: Reactive Plating provides persistent Armor, stacks with Block, survives reload, and displays correctly.');
}`);
