const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// DOM adapter only: execute the real shipped scripts, not duplicated game formulas.
function node(){const classes=new Set(['hidden']);return {style:{setProperty(){}},dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,v){v?classes.add(x):classes.delete(x)}},append(){},prepend(){},setAttribute(){},remove(){},click(){},focus(){},querySelector:()=>node(),querySelectorAll:()=>[],getContext:()=>new Proxy({},{get:()=>()=>{}})}}
const nodes=new Map(),storage=new Map();
const context=vm.createContext({console,assert,Image:process.env.CARDBOUND_RENDER?require('@napi-rs/canvas').Image:class{constructor(){this.complete=false}},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector:()=>node(),querySelectorAll:()=>[],createElement:()=>node(),head:node(),body:node()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},addEventListener(){},innerWidth:1280,innerHeight:800,confirm:()=>true,Blob,URL});
const run=s=>vm.runInContext(s,context);
run(fs.readFileSync(path.join(root,'assets/environment/neon-city.js'),'utf8'));
// Round 37: `defs` moved out of index.html's inline script into its own
// externally-sourced file (assets/cards.js), so it's loaded here
// separately, in the same order the real page loads it in (before the
// inline script) -- the regex below only ever captured inline <script>
// blocks, never <script src>, so without this `defs` would silently be
// undefined for every test.
run(fs.readFileSync(path.join(root,'assets/cards.js'),'utf8'));
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))run(m[1]);
run(fs.readFileSync(path.join(root,'assets/elaris-wildlife.js'),'utf8'));
run(fs.readFileSync(path.join(root,'assets/expansion.js'),'utf8'));
run(fs.readFileSync(path.join(root,'assets/encounter-depth.js'),'utf8'));run(fs.readFileSync(path.join(root,'assets/talent-matrix.js'),'utf8'));
run(`
newGame();
assert.equal(state.pool.length,6);assert(active().some(c=>c.id==='mend'));
assert.equal(maxDeckSize(),6);assert.equal(deviceSlots(),1);
state.hp=10;gainXP(100);assert.equal(state.hp,15);assert.equal(state.maxHp,31);
gainXP(200);assert.equal(state.hp,25);assert.equal(state.maxHp,33);
state.playerLevel=30;syncTalentVitals();assert.equal(state.maxHp,59);assert.equal(deviceSlots(),3,'sockets unlock at 1/12/24/36/48');state.playerLevel=47;assert.equal(deviceSlots(),4);state.playerLevel=48;assert.equal(deviceSlots(),5);state.playerLevel=30;
state.device.crystals=[{uid:'crystal-1',type:'capacity'},{uid:'crystal-2',type:'assault'},{uid:'crystal-3',type:'aegis'}];
state.device.slots=['crystal-1','crystal-2','crystal-3',null,null];
assert.equal(maxDeckSize(),7);assert.equal(deviceBonus('assault'),1);assert.equal(deviceBonus('aegis'),1);
state.room='1,5';const s=roomSpawns(state.room)[0];startBattle(s.uid);assert(state.battle);assert.equal(state.battle.spawnId,s.uid);
state.battle.hand=[make('glacial')];state.battle.energy=3;playCard(0);const hp=state.hp;endTurn();assert.equal(state.hp,hp);assert.equal(state.battle.freeze,0);
state.battle.turn=3;state.battle.enemy.element='fire';state.battle.hand=[make('counter_water')];state.battle.energy=3;playCard(0);const ehp=state.battle.enemy.hp;endTurn();assert.equal(state.hp,hp);assert.equal(state.battle.enemy.hp,ehp-6);assert.equal(state.battle.counter,null);
state.talents.echo=1;state.battle.echoArmed=true;state.battle.hand=[make('guard')];state.battle.energy=3;state.battle.block=0;playCard(0);assert.equal(state.battle.block,12);assert.equal(state.battle.energy,2);assert(state.battle.echoUsed);
state.talents.doublePower=1;state.battle.doubleArmed=true;state.battle.enemy.hp=100;state.battle.enemy.armor=0;state.battle.hand=[make('strike')];state.battle.energy=3;playCard(0);assert.equal(state.battle.enemy.hp,86);assert(state.battle.doubleUsed);
state.battle.hand=[make('venom')];state.battle.energy=3;playCard(0);assert.equal(state.battle.poison,2);
const before=state.pool.length;const _r=Math.random;Math.random=()=>.9;winBattle();Math.random=_r;assert.equal(state.pool.length,before+1);assert(state.battle.reward);assert.equal(state.cooldowns[s.uid],3);
finishBattle();state.battle=null;state.talents={};save();assert(load());assert.equal(state.room,'1,5');
startBattle(roomSpawns(state.room)[1].uid);const turn=state.battle.turn;save();assert(load());assert.equal(state.battle.turn,turn);assert.equal(state.battle.phase,'fight');
state.battle=null;state.room='10,6';const boss=roomSpawns(state.room).find(x=>x.boss);assert(boss);startBattle(boss.uid);winBattle();assert(state.pool.some(c=>c.id==='glacial'));assert(state.bosses.includes('thornWarden'));finishBattle();travelPortal();assert.equal(state.region,'elaris');assert.equal(Object.keys(rooms).length,30);assert.equal(maxDeckSize(),11);assert.equal(state.pool.filter(c=>c.id==='counter').length,1);assert(!state.pool.some(c=>c.id.startsWith('counter_')));
const giftCount=state.pool.length;travelPortal();travelPortal();assert.equal(state.pool.length,giftCount);
state.battle=null;const imported=validateImport(JSON.parse(JSON.stringify(state)));assert.equal(imported.region,'elaris');assert.throws(()=>validateImport({version:3}));
const invalid=JSON.parse(JSON.stringify(state));invalid.pool[0].id='<script>';assert.throws(()=>validateImport(invalid));
invalid.pool[0].id='__proto__';assert.throws(()=>validateImport(invalid));
assert(imported.pool.find(c=>c.id==='glacial').soulbound,'Import must preserve Soulbound protection');
const ch=chestFor('0,2');state.room='0,2';state.pos={x:ch.x,y:ch.y};const potions=state.potions;checkWorldInteractions();assert.equal(state.potions,potions+1);checkWorldInteractions();assert.equal(state.potions,potions+1);
// Sample every generated room and all four portals/door axes over several seeds.
for(const region of ['city','elaris'])for(const seed of [1,1234,98765]){state.seed=seed;state.region=region;configureRegion(region);for(const key of Object.keys(rooms)){assert(walkable(key,400,250));for(const dir of Object.keys(rooms[key].exits)){const target={n:[400,5],s:[400,495],w:[5,250],e:[795,250]}[dir];for(let i=0;i<=50;i++)assert(walkable(key,400+(target[0]-400)*i/50,250+(target[1]-250)*i/50,8),'Disconnected exit '+key+' '+dir)}for(const spawn of roomSpawns(key))assert(walkable(key,spawn.x,spawn.y,8),'Blocked spawn '+key)}}
console.log('PASS: real-script integration tests for level healing, sockets, freeze, counters, Echo, Overdrive, poison, random rewards, local combat reload, guaranteed boss Ice, portal round-trip, import validation, chests, and generated-room routes.');
`);
module.exports={context,run};
