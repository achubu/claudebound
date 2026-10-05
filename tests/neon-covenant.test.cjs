const {run}=require('./expansion.test.cjs');
run(`{
newGame();state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
const b=state.battle;b.id='crownSentinel';b.enemy={...enemies.crownSentinel,hp:0,maxHp:88};
winBattle();const c=state.pool.find(c=>c.id==='neonCovenant');assert(c&&c.soulbound);assert(b.special.some(x=>x.includes('Neon Covenant')));
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
console.log('PASS: guaranteed Crown Sentinel reward, no duplicates, all four combat tiers at zero energy, Soulbound mastery, and old-save reward migration.');
}`);
