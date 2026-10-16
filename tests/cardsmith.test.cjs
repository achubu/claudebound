// Round 153: every world has a Cardsmith at its start room selling card upgrades and Soulbinding.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{const out={};newGame();ensureExplore();
 for(const reg of ['city','elaris','vespera','chronospire']){state.region=reg;configureRegion(reg);const s=cardsmithFor();out[reg]={key:s.key,start:NEXUS_POINTS[reg].start,near:Math.hypot(s.x-400,s.y-250)>60}}
 configureRegion('city');state.region='city';const c=make('cleave');state.pool.push(c);state.shards=600;
 openCardsmith();const html=document.getElementById('menuModal').innerHTML;
 out.menu=/Cardsmith/.test(html)&&/Upgrade a card/.test(html)&&/Make Soulbound/.test(html);
 out.bind=soulbindCard(c)&&c.soulbound&&state.shards===100;out.targets=soulbindTargets().includes(c);
 return JSON.stringify(out)})()`));
for(const reg of ['city','elaris','vespera','chronospire'])assert(r[reg].key===r[reg].start&&r[reg].near,'a Cardsmith stands in the start room of '+reg);
assert(r.menu,'the Cardsmith sells upgrades and Soulbinding');assert(r.bind&&!r.targets,'Soulbinding costs 500 and the card leaves the list');
console.log('PASS: a Cardsmith in every world sells card upgrades and Make Soulbound (◇ 500).');
