// Not part of the shipped test suite — a scripted bot that plays real
// battles through the actual engine (startBattle/playCard/endTurn) to
// measure difficulty at different distances from each region's start room.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function node(){const classes=new Set(['hidden']);return {style:{setProperty(){}},dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,v){v?classes.add(x):classes.delete(x)}},append(){},prepend(){},setAttribute(){},remove(){},click(){},focus(){},querySelector:()=>node(),querySelectorAll:()=>[],getContext:()=>new Proxy({},{get:()=>()=>{}})}}
function makeContext(){
 const nodes=new Map(),storage=new Map();
 const context=vm.createContext({console,assert:require('node:assert/strict'),Image:class{constructor(){this.complete=false}},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector:()=>node(),querySelectorAll:()=>[],createElement:()=>node(),head:node(),body:node()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},addEventListener(){},innerWidth:1280,innerHeight:800,confirm:()=>true,Blob,URL});
 const run=s=>vm.runInContext(s,context);
 run(fs.readFileSync(path.join(root,'assets/environment/neon-city.js'),'utf8'));
 for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))run(m[1]);
 run(fs.readFileSync(path.join(root,'assets/elaris-wildlife.js'),'utf8'));
 run(fs.readFileSync(path.join(root,'assets/expansion.js'),'utf8'));
 run(fs.readFileSync(path.join(root,'assets/encounter-depth.js'),'utf8'));
 return {context,run};
}

// A reasonably competent bot: lethal check, block when threatened this turn,
// heal below 50%, otherwise best damage-per-energy, prefer arming the
// Prismatic Counter ahead of an elemental hit. No talents invested (worst
// case for the player — tests the raw numbers, not a min-maxed build).
const BOT=`
function botIntent(){try{return enemyPlan()}catch(e){return{kind:'attack',damage:intent()}}}
function botTurn(){
 const b=state.battle;if(!b||b.phase!=='fight')return 'no-battle';
 let guard=0;
 while(guard++<20){
  const plan=botIntent();
  const affordable=b.hand.map((c,i)=>({c,i,d:stat(c)})).filter(x=>x.d.cost<=b.energy);
  if(!affordable.length)break;
  const lethal=affordable.find(x=>(x.d.damage||0)>0&&(x.d.damage||0)+attackBonus()>=b.enemy.hp);
  if(lethal){playCard(lethal.i);continue}
  if(!b.armedThisFight&&(plan.kind==='attack'||plan.kind==='charge')){
   const cc=affordable.find(x=>x.d.counter);
   if(cc){playCard(cc.i);b.armedThisFight=true;continue}
  }
  const threat=(plan.kind==='elemental'&&b.counter)?0:(plan.damage||0);
  const needBlock=Math.max(0,threat-b.block);
  if(needBlock>0){
   const bc=affordable.filter(x=>x.d.block>0).sort((a,c)=>c.d.block-a.d.block)[0];
   if(bc){playCard(bc.i);continue}
  }
  if(state.hp<state.maxHp*.5){
   const hc=affordable.find(x=>x.d.heal>0);
   if(hc){playCard(hc.i);continue}
  }
  const atk=affordable.filter(x=>(x.d.damage||0)>0).sort((a,c)=>(c.d.damage/Math.max(1,c.d.cost))-(a.d.damage/Math.max(1,a.d.cost)))[0];
  if(atk){playCard(atk.i);continue}
  const zero=affordable.find(x=>x.d.cost===0);
  if(zero){playCard(zero.i);continue}
  break;
 }
 if(state.battle&&state.battle.phase==='fight')endTurn();
 if(state.battle)state.battle.armedThisFight=state.battle.armedThisFight||false;
 return state.battle?state.battle.phase:(state.hp>0?'won':'lost');
}
function playOutBattle(maxTurns=40){
 let t=0;
 while(state.battle&&state.battle.phase==='fight'&&t++<maxTurns){botTurn()}
 // Defeat heals to full HP by design now, so state.hp>0 is true after a
 // loss too — the phase itself (not HP) is the only reliable win signal.
 const won=!!(state.battle&&state.battle.phase==='reward');
 if(won){if(!state.battle.chestOpened)state.battle.chestOpened=true;finishBattle()}
 return {won,hp:state.hp,turns:t}
}
`;

function playtest({region, room, deckIds, cardLevel, playerLevel, n}){
 let wins=0,totalTurns=0,totalHp=0;
 for(let i=0;i<n;i++){
  const {context,run}=makeContext();
  run(BOT);
  run(`
   newGame();state.seed=${1000+i};state.playerLevel=${playerLevel};state.talents={};
   state.pool=[${deckIds.map(id=>`make('${id}')`).join(',')}];
   state.pool.forEach(c=>c.level=${cardLevel});
   state.deck=state.pool.map(c=>c.uid);
   configureRegion('${region}');state.room='${room}';state.pos={x:400,y:300};
   const spawns=roomSpawns(state.room).filter(s=>!s.boss);
   if(!spawns.length)throw new Error('no non-boss spawn in ${room}');
   const spawn=spawns[0];
   startBattle(spawn.uid);
   globalThis.__result=playOutBattle();
  `);
  const r=context.__result;
  if(r.won)wins++;
  totalTurns+=r.turns;totalHp+=Math.max(0,r.hp);
 }
 return {winRate:(wins/n*100).toFixed(1),avgTurns:(totalTurns/n).toFixed(1),avgHp:(totalHp/n).toFixed(1)};
}

// Starter-ish deck, no talent investment: the floor-case a fresh explorer sees.
const CITY_DECK=['strike','strike','strike','guard','guard','focus'];
const ELEMENTAL_DECK=['strike','cleave','bastion','cinder','venom','counter'];

console.log('=== CITY: difficulty by distance from Afterlight Refuge (Level 0 cards, no talents) ===');
for(const [label,room] of [['dist 0-1 (Burnout Ave)','0,1'],['dist 2 (Cable Market)','2,0'],['dist 3 (Furnace District)','3,2'],['dist 4-5 (Memory Annex)','5,2']]){
 const r=playtest({region:'city',room,deckIds:CITY_DECK,cardLevel:0,playerLevel:1,n:60});
 console.log(label.padEnd(28), 'win%='+r.winRate.padStart(5), ' avgTurns='+r.avgTurns.padStart(5), ' avgHpLeft='+r.avgHp.padStart(5));
}

console.log('\n=== ELARIS: near entry vs near the Bloom Tyrant (Level 1 cards) ===');
for(const [label,room] of [['near entry (Sunpetal Plains)','1,0'],['near boss (Mistfall Basin)','2,2']]){
 const r=playtest({region:'elaris',room,deckIds:ELEMENTAL_DECK,cardLevel:1,playerLevel:5,n:60});
 console.log(label.padEnd(28), 'win%='+r.winRate.padStart(5), ' avgTurns='+r.avgTurns.padStart(5), ' avgHpLeft='+r.avgHp.padStart(5));
}

console.log('\n=== VESPERA: near entry vs far corner (Level 2 cards) ===');
for(const [label,room] of [['near entry (Prism Coast)','1,0'],['far corner (Resonant Spires)','1,1']]){
 const r=playtest({region:'vespera',room,deckIds:ELEMENTAL_DECK,cardLevel:2,playerLevel:10,n:60});
 console.log(label.padEnd(28), 'win%='+r.winRate.padStart(5), ' avgTurns='+r.avgTurns.padStart(5), ' avgHpLeft='+r.avgHp.padStart(5));
}
