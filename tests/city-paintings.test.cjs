const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(`
// Round 87 painted crossroads; since Round 91 Neon Aftermath is one continuous
// painted map instead, so only Elaris's plain rooms use the crossroads quarters.
newGame();configureRegion('city');assert(!Object.keys(rooms).some(usesCityPainting),'the city uses its continuous map');
const painted=[];
configureRegion('elaris');const ep=Object.keys(rooms).filter(usesCityPainting);
for(const k of ep){const t=cityBlockTile(k);for(const b of [t.bx,t.by]){assert.equal(b[0],0);assert.equal(b[3],1);assert(b[1]>0&&b[1]<b[2]&&b[2]<1,'road band inside the quarter')}for(const s of roomSpawns(k))assert(walkable(k,s.x,s.y,8),'spawn on the path in '+k)}
assert(ep.length>=5,'plain Elaris rooms are painted too ('+ep.length+')');
for(const k of ep){assert(cityBlockTile(k).art.src.includes('elaris'),'Elaris uses its jungle painting');assert(!NeonCity.blocked(k,400,250)&&NeonCity.blocked(k,120,60))}
configureRegion('vespera');assert(!Object.keys(rooms).some(usesCityPainting),'Vespera keeps its own art');
console.log('PASS: painted city blocks cover plain city rooms on the existing street corridor.');
`);
