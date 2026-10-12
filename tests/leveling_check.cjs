const fs=require('node:fs');
const vm=require('node:vm');
function node(){const classes=new Set(['hidden']);return {style:{setProperty(){}},dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,v){v?classes.add(x):classes.delete(x)}},append(){},prepend(){},setAttribute(){},remove(){},click(){},focus(){},querySelector:()=>node(),querySelectorAll:()=>[],getContext:()=>new Proxy({},{get:()=>()=>{}})}}
function makeContext(){
 const nodes=new Map(),storage=new Map();
 const context=vm.createContext({console,assert:require('node:assert/strict'),Image:class{constructor(){this.complete=false}},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector:()=>node(),querySelectorAll:()=>[],createElement:()=>node(),head:node(),body:node()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},addEventListener(){},innerWidth:1280,innerHeight:800,confirm:()=>true,Blob,URL});
 const run=s=>vm.runInContext(s,context);
 run(fs.readFileSync('assets/environment/neon-city.js','utf8'));
 run(fs.readFileSync('assets/cards.js','utf8'));
 for(const m of fs.readFileSync('index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))run(m[1]);
 run(fs.readFileSync('assets/elaris-wildlife.js','utf8'));
 run(fs.readFileSync('assets/expansion.js','utf8'));
 run(fs.readFileSync('assets/encounter-depth.js','utf8'));
 return {context,run};
}
const BOT=fs.readFileSync('tests/playtest.cjs','utf8').match(/const BOT=`([\s\S]*?)`;/)[1];

function playtest({room,deckIds,cardLevel,n}){
 let wins=0;
 for(let i=0;i<n;i++){
  const {context,run}=makeContext();
  run(BOT);
  run(`
   newGame();state.seed=${1000+i};state.playerLevel=1;state.talents={};
   state.pool=[${deckIds.map(id=>`make('${id}')`).join(',')}];
   state.pool.forEach(c=>c.level=${cardLevel});
   state.deck=state.pool.map(c=>c.uid);
   configureRegion('city');state.room=Object.keys(rooms).find(k=>regionDistance(k)===6&&roomSpawns(k).some(s=>!s.boss));assert(state.room,'city has a patrol six rooms from start');state.pos={x:400,y:300};
   const spawn=roomSpawns(state.room).filter(s=>!s.boss)[0];
   startBattle(spawn.uid);
   globalThis.__result=playOutBattle();
  `);
  if(context.__result.won)wins++;
 }
 return (wins/n*100).toFixed(1);
}

const CITY_DECK=['strike','strike','guard','guard','focus','mend'];
const GOOD_DECK=['strike','cleave','bastion','riposte','guard','focus'];
console.log('=== City patrol six rooms from start win rate by gear level ===');
console.log('Level 0, starter deck:      ', playtest({room:'5,2',deckIds:CITY_DECK,cardLevel:0,n:60})+'%');
console.log('Level 1, starter deck:      ', playtest({room:'5,2',deckIds:CITY_DECK,cardLevel:1,n:60})+'%');
console.log('Level 2, starter deck:      ', playtest({room:'5,2',deckIds:CITY_DECK,cardLevel:2,n:60})+'%');
console.log('Level 2, better deck (w/Cleave+Bastion):', playtest({room:'5,2',deckIds:GOOD_DECK,cardLevel:2,n:60})+'%');
console.log('Level 3, better deck:       ', playtest({room:'5,2',deckIds:GOOD_DECK,cardLevel:3,n:60})+'%');
