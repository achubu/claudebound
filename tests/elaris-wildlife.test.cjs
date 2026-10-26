const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(`
const observed=new Set();
for(const seed of [1,1234,98765]){state.seed=seed;configureRegion('elaris');for(const key of Object.keys(rooms))for(const spawn of roomSpawns(key)){if(spawn.boss){assert(['bloomTyrant','tidewardenElaris','galeSovereign'].includes(spawn.type),'boss spawn must be the region boss or one of its two designated mini-bosses, got '+spawn.type);continue}assert(ELARIS_WILDLIFE[spawn.type],'City enemy leaked into Elaris');assert.equal(spawn.element,ELARIS_WILDLIFE[spawn.type].element);observed.add(spawn.type)}}
assert.equal(observed.size,5,'Round 169: four wildlife species plus the Sunwrapped Revenant');
for(const id of Object.keys(ELARIS_WILDLIFE)){assert(monsterArt(id).includes('wildlife-sprite'));assert(monsterArt(id).includes('aria-label="'+enemies[id].name+'"'))}
configureRegion('city');assert(!monsterArt('forgeBeast').includes('wildlife-sprite')); // a city monster not yet animated (the Phase Shade and Data Wisp are, Rounds 264 and 273)
console.log('PASS: all five Solaris species spawn, elements match, animated markup and city art preserved.');
`);
for(const name of ['cinder-fox','drowned-heron','blight-antler','storm-moth','sun-revenant','sun-revenant-walk','solar-scarab','dust-devil','dune-scorpion','cistern-warden','noon-toller','sun-pharaoh','mirage-ibis']){
 const png=fs.readFileSync(path.join(__dirname,'../assets/monsters/elaris/'+name+'.png'));
 const w=png.readUInt32BE(16),h=png.readUInt32BE(20);
 // One row of four equal, upright frames (Round 193: owner sheets are 2000x667, the forest ones 2172x724).
 if(w%4||Math.abs(w/4/h-0.75)>0.02)throw Error('Unexpected frame layout '+name+' '+w+'x'+h);
}
run(`assert(monsterArt('cinderFox').includes('solar-scarab.png'),'the Solar Scarab has its own sheet');assert(monsterArt('stormMoth').includes('dust-devil.png'),'the Dust Devil has its own sheet');assert(monsterArt('forestMoth').includes('storm-moth.png'),'the moth sheet stays for the other worlds');assert(monsterArt('drownedHeron').includes('mirage-ibis.png'));assert(monsterArt('blightAntler').includes('dune-scorpion.png'));assert(monsterArt('tidewardenElaris').includes('cistern-warden.png'));assert(monsterArt('galeSovereign').includes('noon-toller.png'));assert(monsterArt('forestStag').includes('blight-antler.png'));assert(monsterArt('forestHeron').includes('drowned-heron.png'));assert(monsterArt('forestFox').includes('cinder-fox.png'),'the fox sheet stays for Vespera and Chronospire')`);
console.log('PASS: all thirteen sprite sheets have four upright frames; the Solaris species and mini-bosses use their own sheets.');
