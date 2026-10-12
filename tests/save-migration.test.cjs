// Round 97: renaming Cardbound to Aethercede moves every localStorage key from
// `cardbound-` to `aethercede-`; old saves must carry over without being lost.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../assets/save-migration.js'),'utf8');
function storage(entries){const m=new Map(entries);return {map:m,get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))}}
const ls=storage([['cardbound-expansion-v3','{"version":3}'],['cardbound-upgrade-materials-v2','{"air":4}'],['cardbound-touch-mode','on'],['aethercede-map-zoom','2'],['cardbound-map-zoom','1'],['other-game','x']]);
vm.runInNewContext(src,{localStorage:ls});
assert.equal(ls.getItem('aethercede-expansion-v3'),'{"version":3}','adventure save carried over');
assert.equal(ls.getItem('aethercede-upgrade-materials-v2'),'{"air":4}','upgrade materials carried over');
assert.equal(ls.getItem('aethercede-touch-mode'),'on','settings carried over');
assert.equal(ls.getItem('aethercede-map-zoom'),'2','an existing new key is never overwritten');
assert.equal(ls.getItem('cardbound-expansion-v3'),'{"version":3}','old keys are kept');
assert.equal(ls.getItem('aethercede-other-game'),null,'unrelated keys are ignored');
vm.runInNewContext(src,{get localStorage(){throw Error('denied')}});
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(html.indexOf('assets/save-migration.js')<html.indexOf('<script>'),'migration runs before the game reads storage');
assert(fs.readFileSync(path.join(__dirname,'../arena.html'),'utf8').includes('assets/save-migration.js'),'Battle Lab migrates too');
const exp=fs.readFileSync(path.join(__dirname,'../assets/expansion.js'),'utf8');
assert(exp.includes("format:'aethercede-save'")&&exp.includes("['aethercede-save','cardbound-save'].includes(payload.format)"),'exports use the new format; old save files still import');
console.log('PASS: Cardbound saves, materials and settings migrate to the Aethercede keys; old export files still import.');
