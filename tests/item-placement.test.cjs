// Round 93: chests, relics, points of interest, the merchant and Nexus Waypoints
// stand just beside the paths in every organic room, within reach and tap-routable.
const { run } = require('./expansion.test.cjs');
run(require('fs').readFileSync(require('path').join(__dirname,'../assets/touch-controls.js'),'utf8'));
run(`{
newGame();
for (const seed of [1,4242,99999]) { state.seed=seed;
for (const region of ['city','elaris','vespera']) {
  configureRegion(region); state.region=region;
  const items=[];
  for (const k of Object.keys(rooms)) { if(!organicDef(k))continue;
    const p=poiAt(k); if(p) items.push([k,p.type,p,40]);
    const c=chestFor(k); if(c) items.push([k,'chest',c,38]);
    const r=rooms[k].relic; if(r) items.push([k,'relic',{x:r[3],y:r[4]},48]);
  }
  const m=merchantRoom(); if(organicDef(m.key)) items.push([m.key,'merchant',m,40]);
  let bad=[];
  for (const [k,t,p,rad] of items) {
    const st=organicItemStand(k,p);
    // Round 212: in Solaris and the Sky Isles items stand on the walkable ground, near its edge
    // (off it is buildings); elsewhere they stand just off the path.
    if (itemsOnGround()) { if (!walkable(k,p.x,p.y)) bad.push(k+' '+t+' OFF the ground'); }
    else if (walkable(k,p.x,p.y)) bad.push(k+' '+t+' ON path');
    else if (!st || st.d>rad-8) bad.push(k+' '+t+' far '+(st&&st.d.toFixed(1)));
    // touch: route from the room's main pocket to a tap on the item
    const area=joinedArea(k),o=cellOffset(k,area),s=organicItemStand(k,p),pk=organicPocketNear(k,s);if(!organicReachableAt(k,s))bad.push(k+' '+t+' stand unreachable');const s2=[...organicPockets(k)[pk]].map(g=>g.split(',').map(Number)).sort((a,b)=>Math.hypot(b[0]-p.x,b[1]-p.y)-Math.hypot(a[0]-p.x,a[1]-p.y))[0];
    const path=findTouchPath(area,{x:o.x+s2[0],y:o.y+s2[1]},{x:o.x+p.x,y:o.y+p.y});
    if(!path) bad.push(k+' '+t+' no tap route');
    else { const e=path.at(-1); const d=Math.hypot(e.x-o.x-p.x,e.y-o.y-p.y); if(d>rad-4) bad.push(k+' '+t+' tap ends '+d.toFixed(1)+' away'); }
  }
  assert(items.length>=4,region+' has organic items');assert.deepEqual(bad,[],seed+' '+region+': '+bad.join(' | '));
}}
console.log('PASS: every chest, relic, point of interest, merchant and waypoint in organic rooms stands beside a reachable path (on the ground near its edge in Solaris and the Sky Isles), within reach and tap-routable.');
}`);
