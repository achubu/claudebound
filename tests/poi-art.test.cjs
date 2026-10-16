// Round 137: points of interest use painted sprites where art exists.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();configureRegion('city');const o={};for(const t of ['nexus','lore','sealed','cache','shrine','campfire','merchant'])o[t]=poiArt({type:t});configureRegion('elaris');o.elarisLore=poiArt({type:'lore'});configureRegion('city');return JSON.stringify(o)})()`));
assert.deepEqual(r,{nexus:'nexus',lore:'terminal',sealed:'sealed',cache:'cache',shrine:'shrine',campfire:'campfire',merchant:'merchant',elarisLore:'sol-sundial'});
for(const n of ['nexus','terminal','sealed','cache','shrine','merchant','campfire','event','elaris-chest'])assert(fs.existsSync(path.join(__dirname,'../assets/items/poi/'+n+'.webp')),'sprite '+n);
assert(/elaris-chest\.webp/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'Elaris map chests use their own sprite');
assert(/\.poi-node\.poi-art\.poi-merchant\{width:72px/.test(fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8')),'the merchant is drawn larger');
console.log('PASS: points of interest use painted sprites (Nexus Waypoint, Data Terminal, Sealed and Supply Caches, Aether Shrine).');
// Round 148: the Aetherlink interface is drawn on the gauntlet's screen.
assert(fs.existsSync(path.join(__dirname,'../assets/items/aetherlink-gauntlet.webp')),'gauntlet image');
{ const js=fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8');
  assert(/g\.querySelector\('\.g-screen'\)\.append\(grid\)/.test(js),'the socket panels move onto the gauntlet screen');
  assert(/GAUNTLET_SCREEN = \{ left: 29\.28/.test(js),'screen position matches the painting'); }
console.log('PASS: the Aetherlink interface sits on the gauntlet screen.');
// Round 151: Solaris's portal home shows the neon city; all portals are half size and glow.
{ const js=fs.readFileSync(path.join(__dirname,'../assets/solaris.js'),'utf8');
  assert(fs.existsSync(path.join(__dirname,'../assets/environment/solaris-portal.webp')),'Solaris portal art');
  assert(/t\.region === 'city'/.test(js)&&/solaris-portal\.webp/.test(js),'the Solaris portal home uses its own art');
  assert(/\.portal-art\{width:48px!important;height:72px!important;animation:portalPulse/.test(js),'portals are half size and pulse');
  console.log('PASS: Solaris sun-gate portal; portals half size with a pulsing glow.'); }
// Round 155: the Neon Aftermath portal into Solaris shows the desert city inside a steel-and-neon gate.
{ const js=fs.readFileSync(path.join(__dirname,'../assets/solaris.js'),'utf8');
  assert(fs.existsSync(path.join(__dirname,'../assets/environment/city-solaris-portal.webp')),'city-side portal art');
  assert(/activeRegion === 'city' && t\.region === 'elaris'/.test(js)&&/city-solaris-portal\.webp/.test(js),'the city portal into Solaris uses it');
  console.log('PASS: the city portal into Solaris shows the desert city.'); }
