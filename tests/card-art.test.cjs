// Round 94: every card level points at an image that exists, and the refreshed
// pixel-art illustrations (assets/cards/art-refresh.md) are used where painted.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const list=JSON.parse(run(`JSON.stringify(Object.keys(defs).flatMap(id=>[0,1,2,3].map(l=>[id,l,cardArtPath(id,l)])))`));
const missing=list.filter(([, , p])=>!fs.existsSync(path.join(__dirname,'..',p)));
assert.deepEqual(missing,[],'card art files exist');
const refreshed={arcJab:[0,1,2,3],breachSpike:[0,1,2,3],bulwarkBash:[0,1,2,3],chainLightning:[0,1,2,3],overclock:[0,1,2,3],staticShield:[0,2,3],thornlash:[0,1,2],wildfire:[1]};
for(const [id,stages] of Object.entries(refreshed)){
 for(const l of stages)assert.equal(run(`cardArtPath(${JSON.stringify(id)},${l})`),`assets/cards/level${l}/${id}.webp`,id+' level '+l+' uses its new painting');
 for(const l of [0,1,2,3])assert(/\.webp$/.test(run(`cardArtPath(${JSON.stringify(id)},${l})`)),id+' level '+l+' borrows a new painting');
}
assert.equal(run(`cardArtPath('staticShield',1)`),'assets/cards/level0/staticShield.webp','unpainted stage reuses the nearest lower stage');
assert.equal(run(`cardArtPath('wildfire',0)`),'assets/cards/level1/wildfire.webp','no lower stage: first painted stage');
assert.equal(run(`cardArtPath('strike',2)`),'assets/cards/level2/strike.png','other cards keep their art');
console.log('PASS: '+list.length/4+' cards x 4 levels have art; 27 refreshed illustrations wired in.');
