// Round 153: every world has a Cardsmith at its start room selling card upgrades and Soulbinding.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{const out={};newGame();ensureExplore();
 for(const reg of ['city','elaris','vespera','chronospire']){state.region=reg;configureRegion(reg);const s=cardsmithFor();out[reg]={key:s.key,start:NEXUS_POINTS[reg].mid,near:roomSpawns(s.key).every(q=>Math.hypot(q.x-s.x,q.y-s.y)>100)}}
 configureRegion('city');state.region='city';const c=make('cleave');state.pool.push(c);state.shards=600;
 openCardsmith();const html=document.getElementById('menuModal').innerHTML;
 out.menu=/Cardsmith/.test(html)&&/Upgrade a card/.test(html)&&/Make Soulbound/.test(html);
 out.bind=soulbindCard(c)&&c.soulbound&&state.shards===100;out.targets=soulbindTargets().includes(c);
 return JSON.stringify(out)})()`));
for(const reg of ['city','elaris','vespera','chronospire'])assert(r[reg].key===r[reg].start&&r[reg].near,'a Cardsmith stands in the middle waypoint room of '+reg+', clear of patrols');
assert(r.menu,'the Cardsmith sells upgrades and Soulbinding');assert(r.bind&&!r.targets,'Soulbinding costs 500 and the card leaves the list');
console.log('PASS: a Cardsmith in every world sells card upgrades and Make Soulbound (◇ 500).');
// Round 154: Solaris has its own sprites for the merchant, Cardsmith, Sun Dials and chests.
{ const fs=require('node:fs'),path=require('node:path');
  for(const n of ['sol-merchant','sol-cardsmith','sol-sundial','sol-chest'])assert(fs.existsSync(path.join(__dirname,'../assets/items/poi/'+n+'.webp')),'sprite '+n);
  const a=JSON.parse(run(`(()=>{const o={};configureRegion('elaris');o.sol=['merchant','cardsmith','lore'].map(t=>poiArt({type:t}));configureRegion('city');o.city=['merchant','cardsmith','lore'].map(t=>poiArt({type:t}));return JSON.stringify(o)})()`));
  assert.deepEqual(a,{sol:['sol-merchant','sol-cardsmith','sol-sundial'],city:['merchant',null,'terminal']},'Solaris sprites are used in Solaris only');
  console.log('PASS: Solaris merchant, Cardsmith, Sun Dial and chest sprites (Solaris only).'); }
