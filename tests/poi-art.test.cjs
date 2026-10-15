// Round 137: points of interest use painted sprites where art exists.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();configureRegion('city');const o={};for(const t of ['nexus','lore','sealed','cache','shrine','campfire','merchant'])o[t]=poiArt({type:t});configureRegion('elaris');o.elarisLore=poiArt({type:'lore'});configureRegion('city');return JSON.stringify(o)})()`));
assert.deepEqual(r,{nexus:'nexus',lore:'terminal',sealed:'sealed',cache:'cache',shrine:'shrine',campfire:'campfire',merchant:'merchant',elarisLore:null});
for(const n of ['nexus','terminal','sealed','cache','shrine','merchant','campfire','event','elaris-chest'])assert(fs.existsSync(path.join(__dirname,'../assets/items/poi/'+n+'.webp')),'sprite '+n);
assert(/elaris-chest\.webp/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'Elaris map chests use their own sprite');
assert(/\.poi-node\.poi-art\.poi-merchant\{width:72px/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'the merchant is drawn larger');
console.log('PASS: points of interest use painted sprites (Nexus Waypoint, Data Terminal, Sealed and Supply Caches, Aether Shrine).');
