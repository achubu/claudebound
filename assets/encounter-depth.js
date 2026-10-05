'use strict';
// The region boss and new card are registered before a journey is restored.
enemies.bloomTyrant={name:'The Bloom Tyrant',icon:'❃',hp:150,attack:10,boss:true,element:'earth',shift:['earth','air'],shiftEvery:3};
addCard('stormglass','Stormglass Covenant',1,'Soulbound Lightning','ϟ',{damage:7,shock:true,element:'lightning',soulbound:true,exhaust:true});
const depthRules=rules;
rules=function(c){return depthRules(c)+(stat(c).shock?' Disrupt: halve the next enemy attack.':'')};
const depthMonsterArt=monsterArt;
monsterArt=function(id){return id==='bloomTyrant'?'<span class="monster-sprite wildlife-sprite bloom-tyrant" role="img" aria-label="The Bloom Tyrant" style="background-image:url(assets/monsters/elaris/bloom-tyrant.png);--wildlife-cycle:1.8s"></span>':depthMonsterArt(id)};
// Round 22 gave every boss an element (for the telegraphed elemental
// strike + status effect), but all 4 mini-bosses still shared the exact
// same 4-turn attack/charge/elemental/guard template, differing only in
// which element colored their one signature hit — mechanically
// indistinguishable from each other and from any ordinary elemental
// enemy. Each boss now has its own real sequence: different length,
// different cadence of attack/guard/heavy/charge/elemental, so two bosses
// sharing an element (moonKnight/tidewardenElaris both water,
// crownSentinel/galeSovereign both air) still feel nothing alike to
// fight. bloomTyrant's own dual-element 6-turn cycle (below) predates
// this table and already had real identity, so it's untouched.
const BOSS_PATTERNS={
 // Thorn Warden — the city's actual final boss: a slow, defensive wall
 // that punishes patience with a heavy hit right before its own charge.
 thornWarden:['guard','attack','heavy','guard','charge','elemental','attack'],
 // Lunar Enforcer — an aggressive ambusher: minimal guard, back-to-back
 // strikes bracketing its one burst, over quickly.
 moonKnight:['attack','attack','charge','elemental','attack'],
 // The Crown Sentinel — a patient marksman: charges early and often,
 // guards to reset rather than trading blows.
 crownSentinel:['charge','elemental','guard','attack','charge','elemental'],
 // The Tidebound Warden — a tank, not an ambusher like its fellow water
 // boss: guards on both sides of its burst instead of attacking into it.
 tidewardenElaris:['guard','attack','charge','elemental','guard','attack'],
 // The Gale Sovereign — a storm, not a marksman like its fellow air boss:
 // back-to-back charges with a heavy hit wedged between them.
 galeSovereign:['attack','charge','elemental','heavy','charge','elemental'],
 // The Bloom Tyrant — Elaris's final boss (formerly special-cased inline).
 bloomTyrant:['guard','charge','elemental','attack','charge','elemental'],
 // Vespera (Round 38). The Arc Sentinel — an armored bulwark that guards
 // first, then follows its charged strike straight into a heavy blow.
 arcSentinel:['guard','charge','elemental','attack','heavy','attack'],
 // The Resonant Phantom — two charged strikes per cycle, so a single
 // Prismatic Counter can't cover both; plan which one to cancel.
 resonantPhantom:['attack','charge','elemental','attack','charge','elemental','guard'],
 // The Tempest Colossus — Vespera's final boss. Shifts between water and
 // air every 4 turns (see enemies.stormTyrant.shift), 8-turn cycle.
 stormTyrant:['charge','elemental','attack','guard','heavy','charge','elemental','attack']
};
// Any enemy with a `shift` list cycles its element every `shiftEvery` turns.
function shiftingElement(id,turn){const e=enemies[id];if(!e||!e.shift)return null;return e.shift[Math.floor((turn-1)/(e.shiftEvery||3))%e.shift.length]}
function enemyPlan(b=state.battle,turn=b?.turn){
 if(!b)return{kind:'attack',name:'Attack',damage:0,element:null};
 // Only the region's main boss cycles a fixed earth/air element on its own
 // 6-turn pattern — every other enemy (city, Elaris, Vespera, mini-boss or
 // plain patrol alike) just uses whatever element its own enemies[] entry
 // has. That means giving any boss-tier enemy an `element` field is enough
 // to give it the full telegraphed attack/charge/elemental/guard pattern
 // and status-effect special ability, with zero new AI code — this is how
 // the Round 22 mini-bosses get a real signature move each.
 const shifted=shiftingElement(b.id,turn),isShifter=!!shifted,element=shifted||b.enemy.element;
 const pattern=BOSS_PATTERNS[b.id]||(element?['attack','charge','elemental','guard']:['attack','guard','heavy']);
 const kind=pattern[(turn-1)%pattern.length],enraged=b.enemy.boss&&b.enemy.hp<=b.enemy.maxHp/2;
 const base=Math.max(1,b.enemy.attack-(b.enemyDebuff||0))+(enraged?2:0);
 // Heavy hits scale from 1.5x near the region's start room up to 2.5x at its
 // farthest edge, so a fully-stacked Block turn that comfortably absorbs an
 // early heavy attack can no longer just as comfortably absorb a late-map
 // one — encourages coming back stronger rather than tanking every hit
 // forever with the same starter-tier block cards.
 const heavyFrac=(typeof regionDistanceFrac==='function')?regionDistanceFrac(state.room):0,heavyMult=Math.min(balanceFor('heavyBase')+balanceFor('heavyDistance')*heavyFrac,b.enemy.boss?balanceFor('bossHeavyMax'):Infinity);
 const damage=['charge','guard'].includes(kind)?0:Math.round(base*(kind==='elemental'?balanceFor(b.enemy.boss?'bossElementalMult':'elementalMult'):kind==='heavy'?heavyMult:1))+(b.exposed||0);
 return{kind,element,damage,name:kind==='charge'?'Gathering '+element+' energy':kind==='guard'?'Rootguard':kind==='elemental'?(isShifter?'Cataclysm':'Charged')+' '+element+' strike':kind==='heavy'?'Heavy attack':'Strike',enraged};
}
intent=function(){return enemyPlan().damage};
const depthCardEffect=cardEffect;
cardEffect=function(c,empowered,doubleAttack){
 const b=state.battle,d=stat(c),before=b.enemy.hp;
 // Adaptive counter follows the telegraphed element, including the boss's shifts.
 if(enemies[b.id]&&enemies[b.id].shift)b.enemy.element=enemyPlan(b).element;
 depthCardEffect(c,empowered,doubleAttack);
 const dealt=before-b.enemy.hp,absorbed=Math.min(b.enemy.guard||0,dealt);
 if(absorbed){
  b.enemy.hp+=absorbed;b.enemy.guard-=absorbed;
  const net=dealt-absorbed,last=b.logs[b.logs.length-1];
  if(last!==undefined)b.logs[b.logs.length-1]=last+' − '+absorbed+' block = '+net+' dealt';
  else b.logs.push('Enemy Block absorbs '+absorbed+' damage.');
 }
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
 else if(plan.kind==='guard'){b.enemy.guard=enemies[b.id]&&enemies[b.id].shift?8:5;
  // Every enemy action, guard included, resolves at the END of the turn
  // that telegraphs it — same timing as charge->elemental — so this Block
  // only becomes active starting the NEXT turn, protecting the enemy from
  // your following attacks (which is why it can still show up later
  // alongside a totally different intent, like a Heavy attack, once that
  // next turn's own plan has moved on). The old message ("Rootguard: 5
  // enemy Block.") read as if it had already happened, which is exactly
  // what made that carried-over Block look unexplained.
  b.logs.push('Rootguard primed: '+b.enemy.guard+' Block will protect the enemy starting next turn.');b.counter=null}
 else if(plan.kind==='elemental'&&b.counter&&COUNTERS[plan.element]===b.counter){b.enemy.hp=Math.max(0,b.enemy.hp-6);b.logs.push('Prismatic Counter cancels the charged strike and its status effect. 6 damage returned.');b.counter=null;b.exposed=0}
 else{
  let incoming=plan.damage;if(b.disrupted){incoming=Math.ceil(incoming/2);b.disrupted=false;b.logs.push('Lightning disruption halves the attack.')}
  const damage=Math.max(0,incoming-talentRank('plating')-b.block);state.hp=Math.max(0,state.hp-damage);b.logs.push(plan.name+': '+damage+' HP damage.');b.exposed=0;b.counter=null;
  if(plan.kind==='elemental'&&damage>0&&!plan.noStatus){
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
 const statusText=(plan.enraged?'ENRAGED · ':'')+(b.enemy.guard?'Enemy Block '+b.enemy.guard+' · ':'')+(b.disrupted?'Lightning disruption armed · ':'')+(b.playerPoison?'Poison '+b.playerPoison+' · ':'')+(b.playerBurn?'Burn '+b.playerBurn+' · ':'');
 if(statusText){const status=document.createElement('p');status.className='encounter-status';status.textContent=statusText.replace(/ · $/,'');box?.append(status)}
 const tips=$('battleModal').querySelector('.battle-footer>.muted');if(tips)tips.textContent='Reserve one counter for a charged elemental strike. Other cards need Memory Buffer.';
 document.querySelectorAll('#hand .card-wrap').forEach((wrap,i)=>{
  const c=b.hand[i];if(!stat(c).counter||hasTalent('retainCore'))return;
  const reserve=document.createElement('button');reserve.className='ability'+(b.savedUid===c.uid?' selected':'');reserve.textContent=b.savedUid===c.uid?'✓ Counter reserved':'Reserve counter';
  reserve.onclick=()=>{b.savedUid=b.savedUid===c.uid?null:c.uid;save();renderBattle()};wrap.append(reserve);
 });
};
