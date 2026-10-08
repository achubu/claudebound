// Talent-build win-rate simulation across the first world (Neon Aftermath).
// Not part of the shipped test suite. Plays real battles through the game's
// own engine (startBattle / playCard / endTurn / enemyPlan) with a heuristic
// bot that also USES the active talents (Weaken, Power Boost, Retain).
// Usage: node tests/talent-sim.cjs [fightsPerCell]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const N = Number(process.argv[2]) || 100;

function node() { const classes = new Set(['hidden']); return { style: { setProperty() {} }, dataset: {}, classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, v) { v ? classes.add(x) : classes.delete(x) } }, append() {}, prepend() {}, setAttribute() {}, remove() {}, click() {}, focus() {}, querySelector: () => node(), querySelectorAll: () => [], getContext: () => new Proxy({}, { get: () => () => {} }) } }
function makeContext() {
  const nodes = new Map(), storage = new Map();
  const context = vm.createContext({ console, assert: require('node:assert/strict'), Image: class { constructor() { this.complete = false } }, document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id) }, querySelector: () => node(), querySelectorAll: () => [], createElement: () => node(), head: node(), body: node() }, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {}, addEventListener() {}, innerWidth: 1280, innerHeight: 800, confirm: () => true, Blob, URL, Math });
  const run = s => vm.runInContext(s, context);
  run(fs.readFileSync(path.join(root, 'assets/environment/neon-city.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/cards.js'), 'utf8'));
  for (const m of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)) run(m[1]);
  run(fs.readFileSync(path.join(root, 'assets/elaris-wildlife.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/expansion.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/encounter-depth.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/talent-matrix.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/aether-deck.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/card-variety.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/battle-hud.js'), 'utf8'));
  return { context, run };
}

const BOT = `
function botIntent(){try{return enemyPlan()}catch(e){return{kind:'attack',damage:intent()}}}
function useTalentsAtStart(){
 const b=state.battle;
 if(hasTalent('weakenCore')&&!b.debuffUsed&&!b.enemyDebuff){b.weakenUses=(b.weakenUses||0)+1;b.debuffUsed=b.weakenUses>=weakenCharges();b.enemyDebuff=weakenAmount()}
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
 chooseBoosts();
 botSide();if(!state.battle||state.battle.phase!=='fight')return;
 let guard=0;
 while(guard++<20&&state.battle&&state.battle.phase==='fight'){
  const plan=botIntent();
  let affordable=b.hand.map((c,i)=>({c,i,d:stat(c)})).filter(x=>x.d.cost<=b.energy&&!x.d.unplayable&&!(x.d.xCost&&b.energy<1));
  if(affordable.some(x=>!x.d.xCost))affordable=affordable.filter(x=>!x.d.xCost); // X-cost cards spend the leftover energy last
  if(!affordable.length)break;
  const rawOf=x=>(x.d.damage||0)+((x.d.damage||0)>0?attackBonus():0)+(boostedCardUids(b).includes(x.c.uid)?boostAmount():0);
  const dmgOf=x=>{const r=rawOf(x);return r>0?(x.d.pierce?r:Math.max(0,r-(b.enemy.armor||0)))*(x.d.hits||1)+(x.d.burn?x.d.burn*2:0)+(x.d.poison?x.d.poison*2:0)+(x.d.kindle?x.d.kindle*2:0):0};
  const lethal=affordable.find(x=>dmgOf(x)>0&&dmgOf(x)>=b.enemy.hp+(b.enemy.guard||0));
  if(lethal){playCard(lethal.i);continue}
  if((plan.kind==='charge'||plan.kind==='elemental')&&!b.counter){const cc=affordable.find(x=>x.d.counter);if(cc){playCard(cc.i);continue}}
  const threat=(plan.kind==='elemental'&&b.counter)?0:Math.max(0,(plan.damage||0)-talentRank('plating'));
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
`;

const BUILDS = {
  'No talents': [],
  'Surge (offense)': [['powerCore', 1], ['amplifier', 5], ['edge', 5], ['overcharge', 1]],
  'Disruption (control)': [['weakenCore', 1], ['jammer', 5], ['quickdraw', 2], ['capacitor', 1]],
  'Resolve (defense)': [['retainCore', 1], ['plating', 5], ['vitality', 5], ['recovery', 3]],
  'Hybrid': [['weakenCore', 1], ['retainCore', 1], ['powerCore', 1], ['plating', 2], ['jammer', 2], ['amplifier', 2], ['plating', 5], ['jammer', 5], ['amplifier', 5]]
};
// Decks a player plausibly has at each stage. Victory rewards offer
// cleave/riposte/bastion/mend/spark/shatter; Prismatic Counter comes from the
// expansion. Impermanent cards auto-upgrade every 100 uses, so card level 1
// is assumed only in the later zones.
function deckFor(L) {
  if (L <= 2) return { ids: ['strike', 'strike', 'guard', 'guard', 'focus', 'mend'], level: 0 };
  if (L <= 4) return { ids: ['strike', 'cleave', 'guard', 'bastion', 'focus', 'mend'], level: 0 };
  return { ids: ['strike', 'cleave', 'riposte', 'bastion', 'counter', 'mend'], level: L >= 6 ? 1 : 0 };
}

const { context, run } = makeContext();
run(BOT);
run(`newGame();configureRegion('city');`);
// Group city spawns: normal patrols by enemy level, plus the three bosses.
const targets = JSON.parse(run(`(()=>{const t={};for(const k of Object.keys(rooms)){for(const s of roomSpawns(k)){const key=s.boss?('BOSS:'+s.type):('Lv '+enemyLevel(k));(t[key]=t[key]||[]).push([k,s.uid,enemyLevel(k),s.elite,s.type])}}return JSON.stringify(t)})()`));
const order = Object.keys(targets).filter(k => k.startsWith('Lv')).sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)))
  .concat(['BOSS:moonKnight', 'BOSS:crownSentinel', 'BOSS:thornWarden'].filter(k => targets[k]));
const BOSS_NAMES = { 'BOSS:moonKnight': 'Lunar Enforcer (mini)', 'BOSS:crownSentinel': 'Crown Sentinel (mini)', 'BOSS:thornWarden': 'Thorn Warden (boss)' };

const results = {};
let seedBase = 1;
for (const area of order) {
  results[area] = {};
  const pool = targets[area];
  for (const [build, plan] of Object.entries(BUILDS)) {
    let best = null;
    for (const policy of ['careful', 'race']) {
    run(`globalThis.POLICY='${policy}'`);
    let wins = 0, hpLeft = 0, turns = 0, talents = '';
    for (let i = 0; i < N; i++) {
      const [room, uid, enemyLv] = pool[i % pool.length];
      const L = Math.max(1, enemyLv); // player at the enemy's level: the game's own "green / ready" signal
      const deck = deckFor(L);
      run(`Math.random=(()=>{let s=${(seedBase + i) * 7919};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
        newGame();configureRegion('city');state.playerLevel=${L};
        globalThis.__t=allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
        state.pool=${JSON.stringify(deck.ids)}.slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${deck.level};return c});
        state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.cleared=[];
        state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
        globalThis.__r=state.battle?playOutBattle():{won:false,hp:0,turns:0,aborted:true};`);
      const r = context.__r; talents = context.__t;
      if (r.aborted) throw new Error('battle did not start in ' + room + ' ' + uid);
      if (r.won) { wins++; hpLeft += r.hp / r.maxHp; }
      turns += r.turns;
    }
    const res = { win: Math.round(wins / N * 100), hp: wins ? Math.round(hpLeft / wins * 100) : 0, turns: +(turns / N).toFixed(1), talents, policy };
    if (!best || res.win > best.win || (res.win === best.win && res.hp > best.hp)) best = res;
    }
    results[area][build] = best;
    seedBase += N;
  }
}

const builds = Object.keys(BUILDS);
const label = a => BOSS_NAMES[a] || ('Zone enemies ' + a);
console.log(`\nNeon Aftermath — win % by talent build (player level = enemy level, ${N} fights per cell, full HP each fight)\n`);
console.log('Area'.padEnd(26) + builds.map(b => b.split(' ')[0].padStart(11)).join(''));
for (const a of order) console.log(label(a).padEnd(26) + builds.map(b => (results[a][b].win + '%').padStart(11)).join(''));
console.log('\nAverage HP left after a win:');
for (const a of order) console.log(label(a).padEnd(26) + builds.map(b => (results[a][b].hp + '%').padStart(11)).join(''));
fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify({ N, order, builds, results, targets: Object.fromEntries(order.map(a => [a, targets[a].length])) }, null, 1));

// --- Sweep: how far above the enemy's level does a player need to be? ---
if (process.argv.includes('sweep')) {
  const M = Math.max(30, Math.round(N / 2));
  const areas = ['Lv 5', 'Lv 6', 'Lv 7', 'Lv 8', 'BOSS:moonKnight', 'BOSS:crownSentinel', 'BOSS:thornWarden'].filter(a => targets[a]);
  const sweep = {};
  console.log(`\nLevel needed for a 50%+ win rate (best of all builds and both play styles, ${M} fights per test)`);
  console.log('Area'.padEnd(26) + 'Lv1 cards'.padStart(14) + 'Lv2 cards'.padStart(14));
  for (const area of areas) {
    sweep[area] = {};
    const row = [];
    for (const cardLevel of [1, 2]) {
      let found = null;
      for (let L = 5; L <= 30 && !found; L += (L < 14 ? 1 : 2)) {
        let bestWin = 0, bestBuild = '';
        for (const [build, plan] of Object.entries(BUILDS)) {
          for (const policy of ['careful', 'race']) {
            run(`globalThis.POLICY='${policy}'`);
            let wins = 0;
            for (let i = 0; i < M; i++) {
              const [room, uid] = targets[area][i % targets[area].length];
              run(`Math.random=(()=>{let s=${(i + 1) * 104729};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
                newGame();configureRegion('city');state.playerLevel=${L};allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
                state.pool=['strike','cleave','riposte','bastion','counter','mend'].slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${cardLevel};return c});
                state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
                globalThis.__r=playOutBattle();`);
              if (context.__r.won) wins++;
            }
            const w = Math.round(wins / M * 100);
            if (w > bestWin) { bestWin = w; bestBuild = build.split(' ')[0]; }
          }
        }
        if (bestWin >= 50) found = { L, win: bestWin, build: bestBuild };
      }
      sweep[area][cardLevel] = found;
      row.push(found ? `Lv ${found.L} (${found.build})` : 'not by 30');
    }
    console.log(label(area).padEnd(26) + row.map(r => r.padStart(14)).join(''));
  }
  const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'talent-sim-results.json'), 'utf8'));
  out.sweep = sweep; fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify(out, null, 1));
}

// --- Card-level effect at a matched player level ---
if (process.argv.includes('cards')) {
  const M = N;
  console.log(`\nWin % at player level = enemy level, by card level (best build & play style, ${M} fights each)`);
  console.log('Area'.padEnd(26) + 'EnemyLv'.padStart(8) + ['Lv0 cards', 'Lv1 cards', 'Lv2 cards', 'Lv3 cards'].map(s => s.padStart(12)).join(''));
  const cardTable = {};
  for (const area of order) {
    const lv = targets[area][0][2]; cardTable[area] = { enemyLevel: lv };
    const cells = [];
    for (const cardLevel of [0, 1, 2, 3]) {
      let bestWin = 0, bestBuild = '';
      for (const [build, plan] of Object.entries(BUILDS)) for (const policy of ['careful', 'race']) {
        run(`globalThis.POLICY='${policy}'`);
        let wins = 0;
        for (let i = 0; i < M; i++) {
          const [room, uid, enemyLv] = targets[area][i % targets[area].length];
          run(`Math.random=(()=>{let s=${(i + 1) * 15485863};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
            newGame();configureRegion('city');state.playerLevel=${'${enemyLv}'};allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
            state.pool=['strike','cleave','riposte','bastion','counter','mend'].slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${cardLevel};return c});
            state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
            globalThis.__r=playOutBattle();`.replace('${enemyLv}', enemyLv));
          if (context.__r.won) wins++;
        }
        const w = Math.round(wins / M * 100); if (w > bestWin) { bestWin = w; bestBuild = build.split(' ')[0]; }
      }
      cardTable[area][cardLevel] = { win: bestWin, build: bestBuild };
      cells.push(`${bestWin}%`.padStart(5) + ` ${bestBuild.slice(0, 6)}`.padEnd(7));
    }
    console.log(label(area).padEnd(26) + String(lv).padStart(8) + cells.map(c => c.padStart(12)).join(''));
  }
  const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'talent-sim-results.json'), 'utf8'));
  out.cardTable = cardTable; fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify(out, null, 1));
}
