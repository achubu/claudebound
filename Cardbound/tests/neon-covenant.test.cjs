const {run}=require('./expansion.test.cjs');
run(`{
newGame();state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
const b=state.battle;b.id='crownSentinel';b.enemy={...enemies.crownSentinel,hp:0,maxHp:88};
const realRandom=Math.random;Math.random=()=>0.1; // below the 25% Soulbound roll
winBattle();Math.random=realRandom;const c=state.pool.find(c=>c.id==='neonCovenant');assert(c&&c.soulbound,'a roll under 25% drops it Soulbound');assert(b.special.some(x=>x.includes('Neon Covenant')));
assert.deepEqual(state.miniDrops,['crownSentinel'],'the unique drop is recorded so it can only happen once');
assert.equal(grantNeonCovenant(),false);assert.equal(state.pool.filter(c=>c.id==='neonCovenant').length,1);
for(let level=0;level<4;level++){
 c.level=level;b.phase='fight';b.enemy.hp=100;b.energy=0;b.block=0;b.hand=[{...c}];b.draw=[make('guard')];b.discard=[];b.exhaust=[];
 playCard(0);assert.equal(b.energy,1);assert.equal(b.hand.length,1);assert.equal(b.hand[0].id,'guard');assert.equal(b.block,level*2);assert.equal(b.discard[0].id,'neonCovenant');
}
c.level=0;c.uses=49;recordCardUse(c);assert.equal(c.level,0);assert.equal(c.uses,50);assert.equal(masteryUses(c),50);
save();assert(load());assert.equal(state.pool.filter(c=>c.id==='neonCovenant').length,1);
// Existing players who already beat this one-time boss receive the new reward.
newGame();state.bosses.push('crownSentinel');save();assert(load());assert.equal(state.pool.filter(c=>c.id==='neonCovenant').length,1);
save();assert(load());assert.equal(state.pool.filter(c=>c.id==='neonCovenant').length,1);
// Round 38: the other 75% of the time the same card drops Impermanent.
newGame();state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
{const b2=state.battle;b2.id='crownSentinel';b2.enemy={...enemies.crownSentinel,hp:0,maxHp:88};Math.random=()=>0.9;winBattle();Math.random=realRandom;
 const imp=state.pool.find(c=>c.id==='neonCovenant');assert(imp&&!imp.soulbound,'a roll over 25% drops it Impermanent');assert(b2.special.some(x=>x.includes('Impermanent')));}
console.log('PASS: Crown Sentinel unique drop (Soulbound under 25%, Impermanent otherwise), no duplicates, all four combat tiers at zero energy, Soulbound mastery, and old-save reward migration.');
}`);
