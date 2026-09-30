const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(`
const observed=new Set();
for(const seed of [1,1234,98765]){state.seed=seed;configureRegion('elaris');for(const key of Object.keys(rooms))for(const spawn of roomSpawns(key)){if(spawn.boss){assert(['bloomTyrant','tidewardenElaris','galeSovereign'].includes(spawn.type),'boss spawn must be the region boss or one of its two designated mini-bosses, got '+spawn.type);continue}assert(ELARIS_WILDLIFE[spawn.type],'City enemy leaked into Elaris');assert.equal(spawn.element,ELARIS_WILDLIFE[spawn.type].element);observed.add(spawn.type)}}
assert.equal(observed.size,4);
for(const id of Object.keys(ELARIS_WILDLIFE)){assert(monsterArt(id).includes('wildlife-sprite'));assert(monsterArt(id).includes('aria-label="'+enemies[id].name+'"'))}
configureRegion('city');assert(!monsterArt('shade').includes('wildlife-sprite'));
console.log('PASS: all four wildlife species spawn, elements match, animated markup and city art preserved.');
`);
for(const name of ['cinder-fox','drowned-heron','blight-antler','storm-moth']){
 const png=fs.readFileSync(path.join(__dirname,'../assets/monsters/elaris/'+name+'.png'));
 if(png.readUInt32BE(16)!==2172||png.readUInt32BE(20)!==724)throw Error('Unexpected frame layout '+name);
}
console.log('PASS: all four sprite sheets have four 543×724 frames.');
