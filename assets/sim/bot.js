// Round 182: the balance sim's player bot, shared by tests/talent-sim.cjs (Node) and the
// compendium's Difficulty lab (browser). It plays real battles through the game's own
// functions (startBattle, playCard, endTurn, enemyPlan) and uses the active talents.
function botIntent(){try{return enemyPlan()}catch(e){return{kind:'attack',damage:intent()}}}
function useTalentsAtStart(){
 const b=state.battle;
 if(hasTalent('weakenCore')&&!b.debuffUsed&&!b.enemyDebuff){b.weakenUses=(b.weakenUses||0)+1;b.debuffUsed=b.weakenUses>=weakenCharges();b.enemyDebuff=weakenAmount()}
}
// Round 259: Weaken waits for a big hit (it lasts until the enemy's next real attack), and Jammer
// Reserve's extra charges get used: any attack is worth one while two or more charges remain.
function useWeakenNow(){
 const b=state.battle;if(!b||!hasTalent('weakenCore')||b.enemyDebuff||b.debuffUsed||typeof useWeaken!=='function')return;
 const p=botIntent(),left=weakenCharges()-(b.weakenUses||0);
 if(p.kind==='elemental'||p.kind==='heavy'||(p.damage>0&&left>=2)||(p.kind==='charge'))useWeaken();
}
function chooseBoosts(){
 const b=state.battle;if(!hasTalent('powerCore'))return;
 const chosen=boostedCardUids(b);if(chosen.length>=boostCharges())return;
 const best=b.hand.filter(c=>!chosen.includes(c.uid)&&(stat(c).damage||0)>0).sort((x,y)=>stat(y).damage-stat(x).damage)[0];
 if(best){b.boostedUids=[...chosen,best.uid];b.boostedUid=null;b.boostUses=b.boostedUids.length}
}
function chooseRetain(){
 const b=state.battle;if(!b||b.phase!=='fight')return;
 const next=botIntentFor(b.turn+1);
 const pick=b.hand.filter(c=>stat(c).counter).concat(b.hand.filter(c=>next.damage>0&&(stat(c).block||0)>0).sort((x,y)=>stat(y).block-stat(x).block),b.hand.filter(c=>(stat(c).damage||0)>0).sort((x,y)=>stat(y).damage-stat(x).damage))[0];
 b.savedUid=pick&&(hasTalent('retainCore')||stat(pick).counter)?pick.uid:null;
}
// Round 44: a simple side-deck player. Pitches leftover cards toward the next
// side draw (keeping at least 5 cards cycling), draws when it can, and plays
// side cards that answer what is telegraphed. NO_SIDE=1 disables it.
function sideOn(){return typeof drawSide==='function'&&!globalThis.NO_SIDE}
function sideWant(id,plan){
 const b=state.battle,r=plan.rider,dmg=(plan.damage||0)*(plan.hits||1),net=dmg-talentRank('plating')*(plan.hits||1)-b.block,big=net>=state.maxHp*.2;
 switch(id){
  case 'purify':return b.bleed>=2||b.frail>0||b.shackledNow||(b.playerPoison||0)>=2||b.playerBurn>0||[...b.hand,...b.draw,...b.discard].filter(isJunk).length>=2;
  case 'restore':return state.hp<state.maxHp*.55||b.bleed>=3;
  case 'dispel':return (b.empower||0)>0||(b.enemy.barrier||0)>0||b.enemy.hp<=dispelDamage();
  case 'aegis':return (r==='rend'&&!b.rendProof)||net>0;
  case 'anchor':return !!r&&!b.anchor;
  case 'ground':return plan.kind==='elemental'&&!b.counter;
  case 'mirror':case 'phase':return big&&!b.mirror&&!b.veil;
  case 'overflow':return true;
  case 'stasis':return big||!!r;
 }
 return false;
}
function botSide(){
 const b=state.battle;if(!b||b.phase!=='fight'||!sideOn())return;aetherInit(b);
 const plan=botIntent(),next=botIntentFor(b.turn+1),score=c=>c?(sideWant(c.id,plan)?3:sideWant(c.id,next)?2:1):0;
 // Round 67: the side deck is always open; side cards cost Aether only.
 for(let k=0;k<3;k++){const p=botIntent(),c=sideAvailable(b).find(c=>b.aether>=sideAetherCost(c.id)&&sideWant(c.id,p)&&sideUsable(b,c.id));if(!c)break;playSideCard(c.uid);if(!state.battle||state.battle.phase!=='fight')return}
}
function botPitch(){
 const b=state.battle;if(!b||b.phase!=='fight'||!sideOn())return;aetherInit(b);
 for(const j of b.hand.filter(isJunk))if(b.aether>=STATIC_CLEANSE_COST)cleanseStatic(j.uid);
 for(const c of b.hand.slice().sort((x,y)=>pitchValue(x)-pitchValue(y))){
  if(c.uid===b.savedUid||b.pitch.includes(c.uid))continue;
  if(isJunk(c))continue;
  if(!sideAvailable(b).length||b.aether+pendingAether(b)+Math.max(0,b.energy)>=SIDE_DRAW_COST)continue;
  const marked=b.hand.filter(h=>b.pitch.includes(h.uid)&&!isJunk(h)).length;
  if(cycleCount(b)-marked-1>=5&&canPitch(b,c))b.pitch.push(c.uid);
 }
}
function botIntentFor(t){try{return enemyPlan(state.battle,t)}catch(e){return{kind:'attack',damage:0}}}
function botTurn(){
 const b=state.battle;if(!b||b.phase!=='fight')return;
 // Round 77: suspend expensive Suspend cards (free now, charged later).
 if(typeof suspendCard==='function'&&!globalThis.NO_SUSPEND)for(const c of b.hand.slice()){if((b.suspended||[]).length>=3)break;const info=suspendInfo(c);if(info&&stat(c).cost>=2)suspendCard(c.uid)}
 chooseBoosts();
 useWeakenNow();
 botSide();if(!state.battle||state.battle.phase!=='fight')return;
 let guard=0;
 while(guard++<20&&state.battle&&state.battle.phase==='fight'){
  if(typeof siftPending==='function'&&siftPending(b)){siftDiscard(siftDefaultIndex(b));continue} // Round 236: Sift's discard
  const plan=botIntent();
  let affordable=b.hand.map((c,i)=>({c,i,d:stat(c)})).filter(x=>x.d.cost<=b.energy&&!x.d.unplayable&&!(x.d.xCost&&b.energy<1));
  if(affordable.some(x=>!x.d.xCost))affordable=affordable.filter(x=>!x.d.xCost); // X-cost cards spend the leftover energy last
  if(!affordable.length)break;
  const rawOf=x=>(x.d.damage||0)+((x.d.damage||0)>0?attackBonus():0)+(boostedCardUids(b).includes(x.c.uid)?boostAmount():0);
  const dmgOf=x=>{const r=rawOf(x);return r>0?(x.d.pierce?r:Math.max(0,r-(b.enemy.armor||0)))*(x.d.hits||1)+(x.d.burn?x.d.burn*2:0)+(x.d.poison?x.d.poison*2:0)+(x.d.kindle?x.d.kindle*2:0):0};
  const lethal=affordable.find(x=>dmgOf(x)>0&&dmgOf(x)>=b.enemy.hp+(b.enemy.guard||0));
  if(lethal){playCard(lethal.i);continue}
  if((plan.kind==='charge'||plan.kind==='elemental')&&!b.counter){const cc=affordable.find(x=>x.d.counter);if(cc){playCard(cc.i);continue}}
  const threat=(plan.kind==='elemental'&&b.counter)?0:Math.max(0,(plan.damage||0)-(plan.shear?0:talentRank('plating'))); // Round 237: a Sky Isles Shear ignores Plating
  const mustBlock=globalThis.POLICY==='race'?(threat-b.block>=state.hp||threat>=state.maxHp*.4):threat-b.block>0;
  if(mustBlock&&threat-b.block>0){const bc=affordable.filter(x=>x.d.block>0).sort((a,c)=>c.d.block-a.d.block)[0];if(bc){playCard(bc.i);continue}}
  if(state.hp<state.maxHp*.5){const hc=affordable.find(x=>x.d.heal>0);if(hc){playCard(hc.i);continue}}
  const draw=affordable.find(x=>x.d.cost===0&&!(x.d.damage||x.d.block||x.d.heal));
  if(draw){playCard(draw.i);continue}
  const atk=affordable.filter(x=>dmgOf(x)>0).sort((a,c)=>(dmgOf(c)/Math.max(1,c.d.cost))-(dmgOf(a)/Math.max(1,a.d.cost)))[0];
  if(atk){playCard(atk.i);continue}
  const any=affordable.find(x=>(x.d.block>0&&threat>b.block)||(x.d.heal>0&&state.hp<state.maxHp));if(any){playCard(any.i);continue}
  break;
 }
 if(state.battle&&state.battle.phase==='fight'){chooseRetain();botPitch();endTurn()}
}
function playOutBattle(maxTurns=40){
 useTalentsAtStart();
 let t=0;while(state.battle&&state.battle.phase==='fight'&&t++<maxTurns)botTurn();
 const won=!!(state.battle&&state.battle.phase==='reward');
 return {won,hp:state.hp,maxHp:state.maxHp,turns:t};
}
function allocate(plan){
 state.talents={};let progress=true;
 while(progress&&talentPoints()>0){progress=false;
  for(const [id,target] of plan){
   const branch=Object.keys(TALENT_BRANCHES).find(k=>TALENT_BRANCHES[k].nodes.some(n=>n.id===id)),node=TALENT_BRANCHES[branch].nodes.find(n=>n.id===id);
   if(talentRank(id)<target&&talentAvailable(branch,node)){state.talents[id]=talentRank(id)+1;progress=true;break}
  }
 }
 return JSON.stringify(state.talents);
}
