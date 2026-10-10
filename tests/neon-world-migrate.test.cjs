const {run}=require('./expansion.test.cjs');
run(`{
// Round 91: a save from the old 42-room city loads into the new continuous map.
newGame();state.playerLevel=7;state.relics=['boots'];state.bosses=['moonKnight'];save();
const old=JSON.parse(localStorage.getItem('cardbound-expansion-v3'));delete old.cityWorld;old.room='2,1';old.visited=['0,5','1,5','2,1'];old.regionVisits.city=old.visited;old.cooldowns={'city:2,1:0':3};
localStorage.setItem('cardbound-expansion-v3',JSON.stringify(old));state=null;
assert(load(),'the old save still loads');assert.equal(state.room,'0,5');assert.deepEqual(state.visited,['0,5']);assert.equal(state.playerLevel,7);assert.deepEqual(state.relics,['boots']);assert(state.bosses.includes('moonKnight'));assert.equal(state.cityWorld,1);
const imp=JSON.parse(JSON.stringify(old));const v=validateImport(imp);assert.equal(v.room,'0,5','imports migrate too');
console.log('PASS: old-city saves keep the character and restart Neon Aftermath exploration.');
}`);
