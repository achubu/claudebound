const fs=require('node:fs');
const path=require('node:path');
const {context,run}=require('./expansion.test.cjs');

// A competent-but-not-perfect heuristic bot playing one full fight with the
// REAL engine functions (startBattle/playCard/endTurn), not a re-implemented
// model. Mirrors a sensible human: block when a hit is coming, otherwise
// spend energy on the best available damage, retreat via loss if it drags on.
run(`
function playOneFight(spawnUid, roomKey, deckIds, cardLevel, talents){
  state.room = roomKey;
  state.pool = deckIds.map(id=>{const c=make(id); c.level=cardLevel; return c});
  state.deck = state.pool.map(c=>c.uid);
  state.talents = talents || {};
  syncTalentVitals(false);
  state.hp = state.maxHp;
  startBattle(spawnUid);
  if(!state.battle) return {aborted:true};
  let guard=0;
  while(state.battle && state.battle.phase==='fight' && guard<40){
    guard++;
    const b=state.battle;
    let played=true, playGuard=0;
    while(played && playGuard<20){
      playGuard++;
      played=false;
      const hand=b.hand;
      for(let i=0;i<hand.length;i++){
        const c=hand[i], d=stat(c);
        if(d.cost>b.energy) continue;
        // lethal check
        let dmg=(d.damage||0)+ (d.damage?attackBonus():0);
        if(dmg>0 && dmg>=b.enemy.hp){ playCard(i); played=true; break }
      }
      if(played) continue;
      // block if we're under half HP or energy is otherwise idle and a block card exists
      if(state.hp < state.maxHp*0.6){
        for(let i=0;i<hand.length;i++){
          const c=hand[i], d=stat(c);
          if(d.cost<=b.energy && d.block>0){ playCard(i); played=true; break }
        }
        if(played) continue;
      }
      // heal if low
      if(state.hp < state.maxHp*0.4){
        for(let i=0;i<hand.length;i++){
          const c=hand[i], d=stat(c);
          if(d.cost<=b.energy && d.heal>0){ playCard(i); played=true; break }
        }
        if(played) continue;
      }
      // otherwise best damage-per-cost attack
      let bestI=-1, bestScore=-1;
      for(let i=0;i<hand.length;i++){
        const c=hand[i], d=stat(c);
        if(d.cost>b.energy) continue;
        const score=(d.damage||0)/Math.max(1,d.cost);
        if(score>bestScore && d.damage>0){ bestScore=score; bestI=i }
      }
      if(bestI>=0){ playCard(bestI); played=true; continue }
      // spend leftover block/utility cards
      for(let i=0;i<hand.length;i++){
        const c=hand[i], d=stat(c);
        if(d.cost<=b.energy){ playCard(i); played=true; break }
      }
    }
    if(state.battle && state.battle.phase==='fight') endTurn();
  }
  if(!state.battle) return {won:true, hpLeft: state.hp};
  if(state.battle.phase==='reward'){ const hp=state.hp; finishBattle(); return {won:true, hpLeft: hp} }
  if(state.battle.phase==='lost'){ finishBattle(); return {won:false, hpLeft:0} }
  return {aborted:true};
}
globalThis.__playOneFight = playOneFight;
`);

module.exports={context,run,playOneFight:(spawnUid,roomKey,deckIds,cardLevel,talents)=>run(`__playOneFight(${JSON.stringify(spawnUid)},${JSON.stringify(roomKey)},${JSON.stringify(deckIds)},${JSON.stringify(cardLevel)},${JSON.stringify(talents)})`)};
