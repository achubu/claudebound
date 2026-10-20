// Round 153: every world has a Cardsmith at its start room selling card upgrades and Soulbinding.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{const out={};newGame();ensureExplore();
 for(const reg of ['city','elaris','vespera','chronospire']){state.region=reg;configureRegion(reg);const s=cardsmithFor();out[reg]={key:s.key,start:NEXUS_POINTS[reg].mid,frac:regionDistanceFrac(s.key),near:roomSpawns(s.key).every(q=>Math.hypot(q.x-s.x,q.y-s.y)>100)}}
 configureRegion('city');state.region='city';const c=make('cleave');state.pool.push(c);state.shards=600;
 openCardsmith();const html=document.getElementById('menuModal').innerHTML;
 out.menu=/Cardsmith/.test(html)&&/Upgrade a card/.test(html)&&/Make Soulbound/.test(html);
 out.bind=soulbindCard(c)&&c.soulbound&&state.shards===100;out.targets=soulbindTargets().includes(c);
 return JSON.stringify(out)})()`));
for(const reg of ['city','elaris','vespera','chronospire'])assert(r[reg].key!==r[reg].start&&r[reg].frac>.3&&r[reg].frac<.7&&r[reg].near,'Round 168: the Cardsmith has its own room about halfway into '+reg+', not the waypoint room, clear of patrols');
assert(r.menu,'the Cardsmith sells upgrades and Soulbinding');assert(r.bind&&!r.targets,'Soulbinding costs 500 and the card leaves the list');
console.log('PASS: a Cardsmith in every world sells card upgrades and Make Soulbound (◇ 500).');
// Round 154: Solaris has its own sprites for the merchant, Cardsmith, Sun Dials and chests.
{ const fs=require('node:fs'),path=require('node:path');
  for(const n of ['sol-merchant','sol-cardsmith','sol-sundial','sol-chest'])assert(fs.existsSync(path.join(__dirname,'../assets/items/poi/'+n+'.webp')),'sprite '+n);
  const a=JSON.parse(run(`(()=>{const o={};configureRegion('elaris');o.sol=['merchant','cardsmith','lore'].map(t=>poiArt({type:t}));configureRegion('city');o.city=['merchant','cardsmith','lore'].map(t=>poiArt({type:t}));return JSON.stringify(o)})()`));
  assert.deepEqual(a,{sol:['sol-merchant','sol-cardsmith','sol-sundial'],city:['merchant',null,'terminal']},'Solaris sprites are used in Solaris only');
  console.log('PASS: Solaris merchant, Cardsmith, Sun Dial and chest sprites (Solaris only).'); }
// Round 212: a Cardsmith upgrade keeps the card's progress toward its next level.
{ const u = JSON.parse(run(`(()=>{newGame();const c=make('strike',0,false);state.pool.push(c);c.uses=42;state.shards=999;const ok=cardsmithUpgrade(c);return JSON.stringify({ok,level:c.level,uses:c.uses,soul:cardsmithUpgrade(make('strike',0,true))})})()`));
  assert.deepEqual(u, { ok: true, level: 1, uses: 42, soul: false }, 'upgraded one level, progress kept, Soulbound refused'); }
// Round 213: both Cardsmith actions ask first; Cancel changes nothing.
{ const q = JSON.parse(run(`(()=>{newGame();const c=make('strike',0,false);state.pool.push(c);state.shards=999;
  askUpgrade(c);const asked=c.level;document.getElementById('smithNo').onclick();const cancelled=c.level;
  askUpgrade(c);document.getElementById('smithYes').onclick();const upgraded=c.level;
  askSoulbind(c);const notYet=!!c.soulbound;document.getElementById('smithYes').onclick();
  return JSON.stringify({asked,cancelled,upgraded,notYet,bound:!!c.soulbound})})()`));
  assert.deepEqual(q, { asked: 0, cancelled: 0, upgraded: 1, notYet: false, bound: true }, 'asking changes nothing; Cancel keeps the card; Yes upgrades or binds'); }
console.log('PASS: Cardsmith upgrades keep progress toward the next level, and both actions ask for confirmation first.');
