// Round 94: every card level points at an image that exists, and the refreshed
// pixel-art illustrations (assets/cards/art-refresh.md) are used where painted.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
const {run}=require('./expansion.test.cjs');
const list=JSON.parse(run(`JSON.stringify(Object.keys(defs).flatMap(id=>[0,1,2,3].map(l=>[id,l,cardArtPath(id,l)])))`));
const missing=list.filter(([, , p])=>!fs.existsSync(path.join(__dirname,'..',p)));
assert.deepEqual(missing,[],'card art files exist');
// Round 236: Sift's stand-in emblem (no painting yet) is listed like a painting so every level finds it.
// Round 180: 36 more paintings from achubu/Cardbound (13 cards now have all four stages).
const refreshed={nanoMend:[0],sift:[0],accelerate:[0,1,2,3],chronoSpike:[0,1,2,3],clockworkVolley:[0,1,2,3],delayedBulwark:[0,1,2,3],futureSight:[0,1,2,3],rewindMend:[0,1,2,3],temporalBarrage:[0,1,2,3],arcBulwark:[0,1,2,3],arcJab:[0,1,2,3],breachSpike:[0,1,2,3],bulwarkBash:[0,1,2,3],chainLightning:[0,1,2,3],lunarEdict:[0,1,2,3],mirrorguard:[0,1,2,3],overclock:[0,1,2,3],phantomResonance:[0,1,2,3],prismLance:[0,1,2,3],rootbind:[0,1,2,3],sovereignGale:[0,1,2,3],static:[0,1,2,3],staticShield:[0,1,2,3],stormBattery:[0,1,2,3],tempestSurge:[0,1,2,3],thornlash:[0,1,2,3],tidebound:[0,1,2,3],tidecall:[0,1,2,3],verdantPact:[0,1,2,3],wildfire:[0,1,2,3]};
assert.deepEqual(JSON.parse(run(`JSON.stringify(refreshedCardArt)`)),refreshed,'every painting is wired in');
for(const [id,stages] of Object.entries(refreshed)){
 for(const l of stages)assert.equal(run(`cardArtPath(${JSON.stringify(id)},${l})`),`assets/cards/level${l}/${id}.webp`,id+' level '+l+' uses its new painting');
 for(const l of [0,1,2,3])assert(/\.webp$/.test(run(`cardArtPath(${JSON.stringify(id)},${l})`)),id+' level '+l+' borrows a new painting');
}
assert.equal(run(`cardArtPath('accelerate',3)`),'assets/cards/level3/accelerate.webp','Round 205: Accelerate has all four paintings');
assert.equal(run(`cardArtPath('strike',2)`),'assets/cards/level2/strike.png','other cards keep their art');
const sides=JSON.parse(run(`JSON.stringify(Object.keys(SIDE_CARDS).map(sideArtPath))`));assert(sides.every(p=>p.endsWith('.webp')&&fs.existsSync(path.join(__dirname,'..',p))),'all side cards use their refreshed paintings');
console.log('PASS: '+list.length/4+' cards x 4 levels have art; '+Object.values(refreshed).flat().length+' refreshed card paintings and '+sides.length+' side-card paintings wired in.');
