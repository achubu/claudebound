const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {context,run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
(async()=>{
for(const region of ['city','elaris','vespera']){
 run(`newGame();state.region='${region}';configureRegion(state.region);state.room=state.region==='city'?'0,1':'1,1';state.pos={x:400,y:280};state.visited=[state.room];state.potions=4;state.playerLevel=12;state.talents={powerCore:1,critical:2};syncTalentVitals();state.hp=27;state.device={crystals:[{uid:'crystal-1',type:'assault'}],slots:['crystal-1',null,null,null,null],next:2};state.chests=[state.region+':1,0'];state.pool.push(make('glacial'));setMaterials(2);save();`);
 const before=run('JSON.stringify(state)');run('state=null;assert(load())');assert.equal(run('JSON.stringify(state)'),before);assert.equal(run('materials()'),2);
 let blob;context.URL={createObjectURL:b=>{blob=b;return 'blob:test-save'},revokeObjectURL(){}};run('exportSave()');const text=await blob.text();run('newGame()');context.saveFixture={size:text.length,text:async()=>text};await run('importSave(saveFixture)');assert.equal(run('JSON.stringify(state)'),before);assert.equal(run('materials()'),2);
 run('startBattle(roomSpawns(state.room)[0].uid);state.battle.freeze=1;state.battle.poison=2;state.battle.doubleArmed=true;save()');const battle=run('JSON.stringify(state.battle)');run('state=null;assert(load())');assert.equal(run('JSON.stringify(state.battle)'),battle);
}
console.log('PASS: city/Elaris save reload, actual export/import, position, inventory, talents, crystals, materials, Soulbound cards and active wildlife battle state.');
})().catch(e=>{console.error(e);process.exitCode=1});
