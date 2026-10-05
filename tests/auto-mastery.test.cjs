const {run}=require('./expansion.test.cjs');
run(`{
newGame();state.room='1,5';startBattle(roomSpawns(state.room)[0].uid);
const card=state.pool.find(c=>!c.soulbound),soul=state.pool.find(c=>c.soulbound),b=state.battle;
const crystals=materials();b.enemy.hp=b.enemy.maxHp=100000;b.enemy.armor=0;b.enemy.element=null;
function use(c){b.hand=[{...c}];b.energy=100;playCard(0)}
card.uses=98;use(card);assert.equal(card.level,0);assert.equal(card.uses,99);
assert(cardHTML(card).includes('99/100'));
use(card);assert.equal(card.level,1);assert.equal(card.uses,0);assert.equal(materials(),crystals);
assert.equal(b.discard.find(c=>c.uid===card.uid).level,1,'encounter copies get upgraded');
for(const next of [2,3]){card.uses=99;use(card);assert.equal(card.level,next);assert.equal(card.uses,0)}
use(card);assert.equal(card.level,3);assert.equal(card.uses,0,'maximum level stops mastery');
soul.uses=49;use(soul);assert.equal(soul.level,0);assert.equal(soul.uses,50);
use(soul);assert.equal(soul.level,0);assert.equal(soul.uses,50,'Soulbound mastery caps until crystal upgrade');
assert(cardHTML(soul).includes('50/50'));assert.equal(materials(),crystals);
const temporary={...card,uid:999999,level:0,uses:99};recordCardUse(temporary);assert.equal(temporary.level,0,'temporary clones gain no permanent mastery');
card.level=1;card.uses=75;save();assert(load());assert.equal(owned(card.uid).uses,75);
state.battle=null;const transferred=JSON.parse(JSON.stringify(state));assert.equal(validateImport(transferred).pool.find(c=>c.uid===card.uid).uses,75);
transferred.pool.find(c=>c.uid===card.uid).uses=101;assert.throws(()=>validateImport(transferred));
console.log('PASS: 100-use automatic upgrades, all levels, encounter sync, crystal preservation, Soulbound cap, and save/import above 50 uses.');
}`);
