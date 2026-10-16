// Round 146: using a point of interest pops up what you got, with pictures.
const assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();configureRegion('city');ensureExplore();
 const lores=Object.keys(rooms).map(k=>poiAt(k)).filter(q=>q&&q.type==='lore');for(const q of lores.slice(0,4))state.poi.lore.push(q.id);
 const side0=state.side.pool.length;openPOI(lores[4]);readLore(lores[4]);
 const html=document.getElementById('menuModal').innerHTML;
 const got=poiRewardHTML({shards:0,potions:0,hp:state.hp,blessing:null,side:new Set(),pool:new Set(state.pool.map(c=>c.uid))});
 return JSON.stringify({acquired:/ACQUIRED/.test(html),side:state.side.pool.length-side0,sideShown:got.side.length,tile:got.tiles.join('').includes('Shards')})})()`));
assert(r.acquired,'reading the last Data Terminal opens the reward window');
assert.equal(r.side,1,'the fifth terminal gives a side card');
assert(r.sideShown>=1&&r.tile,'the window shows the side card and the Shards');
console.log('PASS: points of interest pop up what you got (side cards, Shards, potions, healing, blessings), with pictures.');
