// Round 137: points of interest use painted sprites where art exists.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();configureRegion('city');const o={};for(const t of ['nexus','lore','sealed','cache','shrine','campfire','merchant'])o[t]=poiArt({type:t});configureRegion('elaris');o.elarisLore=poiArt({type:'lore'});configureRegion('city');return JSON.stringify(o)})()`));
assert.deepEqual(r,{nexus:'nexus',lore:'terminal',sealed:'sealed',cache:'cache',shrine:'shrine',campfire:'campfire',merchant:'merchant',elarisLore:null});
for(const n of ['nexus','terminal','sealed','cache','shrine','merchant','campfire','event','elaris-chest'])assert(fs.existsSync(path.join(__dirname,'../assets/items/poi/'+n+'.webp')),'sprite '+n);
assert(/elaris-chest\.webp/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'Elaris map chests use their own sprite');
assert(/\.poi-node\.poi-art\.poi-merchant\{width:72px/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'the merchant is drawn larger');
console.log('PASS: points of interest use painted sprites (Nexus Waypoint, Data Terminal, Sealed and Supply Caches, Aether Shrine).');
// Round 147: the Aetherlink screen draws the gauntlet with crystals in their sockets.
const g=run(`(()=>{newGame();state.playerLevel=30;const a=rollUpgradeCrystal('assault',.1);state.device.crystals.push(a);state.device.slots=[a.uid,null,null,null,null];return gauntletHTML()})()`);
assert(fs.existsSync(path.join(__dirname,'../assets/items/aetherlink-gauntlet.webp')),'gauntlet image');
assert.equal((g.match(/g-socket/g)||[]).length,5,'five sockets');assert(/g-socket filled/.test(g)&&/crystal-art/.test(g),'a slotted crystal sits in its socket');
assert((g.match(/g-socket locked/g)||[]).length===5-run('deviceSlots()'),'locked sockets are marked');
console.log('PASS: the Aetherlink gauntlet shows its five sockets with slotted crystals.');
