'use strict';
// The region boss and new card are registered before a journey is restored.
enemies.bloomTyrant={name:'The Bloom Tyrant',icon:'❃',hp:150,attack:10,boss:true,element:'earth'};
addCard('stormglass','Stormglass Covenant',1,'Soulbound Lightning','ϟ',{damage:7,shock:true,element:'lightning',soulbound:true,exhaust:true});
const depthRules=rules;
rules=function(c){return depthRules(c)+(stat(c).shock?' Disrupt: halve the next enemy attack. Exhaust.':'')};
const depthMonsterArt=monsterArt;
monsterArt=function(id){return id==='bloomTyrant'?'<span class="monster-sprite wildlife-sprite bloom-tyrant" role="img" aria-label="The Bloom Tyrant" style="background-image:url(assets/monsters/elaris/bloom-tyrant.png);--wildlife-cycle:1.8s"></span>':depthMonsterArt(id)};
function enemyPlan(b=state.battle,turn=b?.turn){
 if(!b)return{kind:'attack',name:'Attack',damage:0,element:null};
 const boss=b.id==='bloomTyrant',element=boss?(Math.floor((turn-1)/3)%2?'air':'earth'):b.enemy.element;
 const pattern=boss?['guard','charge','elemental','attack','charge','elemental']:element?['attack','charge','elemental','guard']:['attack','guard','heavy'];
 const kind=pattern[(turn-1)%pattern.length],enraged=boss&&b.enemy.hp<=b.enemy.maxHp/2;
 const base=Math.max(1,b.enemy.attack-(b.enemyDebuff||0))+(enraged?2:0);
 const damage=['charge','guard'].includes(kind)?0:Math.round(base*(kind==='elemental'?1.8:kind==='heavy'?1.5:1))+(b.exposed||0);
 return{kind,element,damage,name:kind==='charge'?'Gathering '+element+' energy':kind==='guard'?'Rootguard':kind==='elemental'?(boss?'Cataclysm':'Charged')+' '+element+' strike':kind==='heavy'?'Heavy attack':'Strike',enraged};
}
intent=function(){return enemyPlan().damage};
const depthCardEffect=cardEffect;
cardEffect=function(c,empowered,doubleAttack){
 const b=state.battle,d=stat(c),before=b.enemy.hp;
 // Adaptive counter follows the telegraphed element, including the boss's shifts.
 if(b.id==='bloomTyrant')b.enemy.element=enemyPlan(b).element;
 depthCardEffect(c,empowered,doubleAttack);
 const dealt=before-b.enemy.hp,absorbed=Math.min(b.enemy.guard||0,dealt);
 if(absorbed){b.enemy.hp+=absorbed;b.enemy.guard-=absorbed;b.logs.push('Rootguard absorbs '+absorbed+' damage.')}
 if(d.shock)b.disrupted=true;
};
endTurn=function(){
 const b=state.battle;if(!b||b.phase!=='fight')return;
 const plan=enemyPlan(b),dot=b.poison+(b.burnTurns>0?b.burn:0);
 b.enemy.hp=Math.max(0,b.enemy.hp-dot);if(dot)b.logs.push('Burn / poison: '+dot+' damage.');if(b.burnTurns>0)b.burnTurns--;
 if(!b.enemy.hp){winBattle();save();renderBattle();return}
 b.enemy.guard=0;
 if(b.freeze>0){b.freeze--;b.logs.push('Frozen: enemy action skipped.')}
 else if(plan.kind==='charge'){b.logs.push(plan.name+'. A charged strike is coming—reserve or arm your counter.')}
 else if(plan.kind==='guard'){b.enemy.guard=b.id==='bloomTyrant'?8:5;b.logs.push('Rootguard: '+b.enemy.guard+' enemy Block.');b.counter=null}
 else if(plan.kind==='elemental'&&b.counter&&COUNTERS[plan.element]===b.counter){b.enemy.hp=Math.max(0,b.enemy.hp-6);b.logs.push('Prismatic Counter cancels the charged strike and its status effect. 6 damage returned.');b.counter=null;b.exposed=0}
 else{
  let incoming=plan.damage;if(b.disrupted){incoming=Math.ceil(incoming/2);b.disrupted=false;b.logs.push('Lightning disruption halves the attack.')}
  const damage=Math.max(0,incoming-b.block);state.hp=Math.max(0,state.hp-damage);b.logs.push(plan.name+': '+damage+' HP damage.');b.exposed=0;b.counter=null;
  if(plan.kind==='elemental'&&damage>0){
   if(plan.element==='fire')b.playerBurn=2;
   if(plan.element==='earth')b.playerPoison=Math.min(3,(b.playerPoison||0)+1);
   if(plan.element==='water')b.drained=true;
   if(plan.element==='air')b.exposed=2;
  }
 }
 const ailment=(b.playerBurn>0?2:0)+(b.playerPoison||0);if(ailment){state.hp=Math.max(0,state.hp-ailment);b.logs.push('Lingering corruption: '+ailment+' HP.')}if(b.playerBurn>0)b.playerBurn--;
 b.block=0;
 const keep=b.hand.filter(c=>c.uid===b.savedUid&&(hasTalent('retainCore')||stat(c).counter)).slice(0,1);
 b.discard.push(...b.hand.filter(c=>!keep.includes(c)));b.hand=keep;b.savedUid=null;
 if(!state.hp)loseBattle();else if(!b.enemy.hp)winBattle();else{b.turn++;b.energy=Math.max(1,maxEnergy()-(b.drained?1:0));b.drained=false;drawCards(4)}
 save();renderBattle();
};
const depthBattleRender=renderBattle;
renderBattle=function(){
 depthBattleRender();const b=state?.battle;if(!b||b.phase!=='fight')return;
 const plan=enemyPlan(b),next=enemyPlan(b,b.turn+1),box=$('battleModal').querySelector('.intent');
 if(box)box.innerHTML='<b>'+plan.name+'</b>'+(plan.damage?' · '+plan.damage+' damage':' · no attack')+(plan.kind==='elemental'?' · COUNTER WINDOW':'')+'<small>Next: '+next.name+(next.damage?' · '+next.damage+' damage':'')+'</small>';
 const status=document.createElement('p');status.className='encounter-status';status.textContent=(plan.enraged?'ENRAGED · ':'')+'Enemy Block '+(b.enemy.guard||0)+(b.disrupted?' · Lightning disruption armed':'')+(b.playerPoison?' · Poison '+b.playerPoison:'')+(b.playerBurn?' · Burn '+b.playerBurn:'');box?.append(status);
 const tips=$('battleModal').querySelector('.battle-footer>.muted');if(tips)tips.textContent='Reserve one counter for a charged elemental strike. Other cards need Memory Buffer.';
 document.querySelectorAll('#hand .card-wrap').forEach((wrap,i)=>{
  const c=b.hand[i];if(!stat(c).counter||hasTalent('retainCore'))return;
  const reserve=document.createElement('button');reserve.className='ability'+(b.savedUid===c.uid?' selected':'');reserve.textContent=b.savedUid===c.uid?'✓ Counter reserved':'Reserve counter';
  reserve.onclick=()=>{b.savedUid=b.savedUid===c.uid?null:c.uid;save();renderBattle()};wrap.append(reserve);
 });
};
