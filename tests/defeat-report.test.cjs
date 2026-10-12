const {run}=require('./expansion.test.cjs');
run(`{
newGame();state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
const count=state.pool.length,potions=state.potions,crystals=materials();
loseBattle();const b=state.battle;assert.equal(state.pool.length,count-1);assert(b.lostCard);assert.equal(state.potions,potions);assert.equal(materials(),crystals);
renderBattle();let html=document.getElementById('battleModal').innerHTML;
assert(html.includes(b.lostCard.name));assert(html.includes('permanently removed'));assert(html.includes(state.hp+'/'+state.maxHp+' HP'));assert(!html.includes('half health'));assert(html.includes('Acknowledge and return'));assert(html.includes('No potions'));
save();assert(load());assert(state.battle.lostCard);assert.equal(state.pool.length,count-1,'reload does not repeat penalty');
state.battle=null;state.room='1,5';state.pool.forEach(c=>c.soulbound=true);startBattle(roomSpawns('1,5')[0].uid);loseBattle();renderBattle();html=document.getElementById('battleModal').innerHTML;
assert(html.includes('No cards or items lost.'));assert(html.includes('Soulbound cards are protected.'));
console.log('PASS: explicit exact defeat losses, actual HP recovery, protected inventory, acknowledgment and reload persistence.');
}`);
