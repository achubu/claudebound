const {run}=require('./expansion.test.cjs');

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
configureRegion('city');
const types=new Set();
for(const key of Object.keys(rooms))for(const s of roomSpawns(key))types.add(s.type);
for(const t of ['emberling','thornling','burrower','vineguard','shade','cryptWisp','forgeBeast','crownEye'])
 assert(types.has(t),t+' now appears in the city spawn pool');

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
assert.equal(forceRoll(.01).lootType,'empty','exactly 1% rolls over into the empty-chest band');
assert.equal(forceRoll(.2599).lootType,'empty','just under 26% is still empty');
assert.equal(forceRoll(.26).lootType,'potion','exactly 26% rolls over into potion');
assert.equal(forceRoll(.6299).lootType,'potion','just under 63% is still potion');
assert.equal(forceRoll(.63).lootType,'card','exactly 63% rolls over into card');
forceRoll(0);assert(state.pool.some(c=>['phoenix','oath','verdict'].includes(c.id)),'Soulbound jackpot actually grants a Soulbound card');
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

console.log('PASS: armor/pierce mechanics, Elaris reward-pool fix, revived enemy types, raised region scaling, full-HP defeat recovery, loot chest odds, and distance-based enemy tiering all verified.');
`);
