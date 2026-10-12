const src = require('fs').readFileSync(require('path').join(__dirname,'talent-sim.cjs'), 'utf8');
const head = src.split('const BUILDS')[0].replace("const N = Number(process.argv[2]) || 100;", '').replace('const fs', 'var fs').replace('const root', 'var root').replace('const BOT', 'var BOT');
eval(head);
const { context, run } = makeContext(); run(BOT);
const boss = process.argv[2] || 'moonKnight', region = process.argv[3] || 'city', lv = +(process.argv[4] || 4), noAff = process.argv[5] === 'noaff';
let wins = 0, turns = 0;
for (let i = 0; i < 40; i++) {
  const r = JSON.parse(run(`(()=>{Math.random=(()=>{let s=${i * 48271 + 7};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
  newGame();configureRegion('${region}');state.region='${region}';state.playerLevel=${lv};allocate([["retainCore",1],["plating",5],["vitality",5],["recovery",3],["weakenCore",1],["powerCore",1],["jammer",5],["amplifier",5]]);syncTalentVitals(false);state.hp=state.maxHp;
  ${noAff ? "for(const k in ENEMY_AFFLICTIONS)ENEMY_AFFLICTIONS[k]=[];" : ''}
  const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>s.type==='${boss}'));const sp=roomSpawns(key).find(s=>s.type==='${boss}');
  state.pool=['strike','strike','guard','guard','focus','mend','cleave','riposte'].slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=Math.min(3,Math.floor((${lv}-1)/6));return c});state.deck=state.pool.map(c=>c.uid);state.bosses=[];state.room=key;startBattle(sp.uid);
  const res=playOutBattle();return JSON.stringify({...res,logs:${i === 0} ? state.battle.logs : [], ehp: state.battle.enemy.hp})})()`));
  if (r.won) wins++; turns += r.turns;
  if (i === 0) console.log(r.logs.join('\n'));
}
console.log(boss, 'wins', wins, '/40', 'avg turns', turns / 40);
