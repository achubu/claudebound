const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(`
// Round 87: ordinary city rooms are painted crossroads quarters.
newGame();configureRegion('city');
const painted=Object.keys(rooms).filter(usesCityPainting);
assert(painted.length>=8,'most plain city rooms get a painting ('+painted.length+')');
assert(!painted.some(isDiagonalRoom),'diagonal rooms keep their roundabout art');
assert(!painted.some(k=>joinedArea(k).cells.length>1),'districts keep their own painting');
const tiles=new Set(painted.map(k=>{const t=cityBlockTile(k);return t.art.src+t.qx+t.qy}));
assert(tiles.size>=5,'rooms use a variety of tiles ('+tiles.size+')');
for(const k of painted){
 const t=cityBlockTile(k);for(const b of [t.bx,t.by]){assert.equal(b[0],0);assert.equal(b[3],1);assert(b[1]>0&&b[1]<b[2]&&b[2]<1,'road band inside the quarter')}
 assert(!NeonCity.blocked(k,400,250)&&!NeonCity.blocked(k,30,240)&&!NeonCity.blocked(k,770,240)&&!NeonCity.blocked(k,400,20)&&!NeonCity.blocked(k,400,470),'streets open in '+k);
 assert(NeonCity.blocked(k,120,60)&&NeonCity.blocked(k,680,440),'corner blocks solid in '+k);
 for(const s of roomSpawns(k))assert(walkable(k,s.x,s.y,8),'spawn on the street in '+k);
}
configureRegion('elaris');const ep=Object.keys(rooms).filter(usesCityPainting);assert(ep.length>=5,'plain Elaris rooms are painted too ('+ep.length+')');
for(const k of ep){assert(cityBlockTile(k).art.src.includes('elaris'),'Elaris uses its jungle painting');assert(!NeonCity.blocked(k,400,250)&&NeonCity.blocked(k,120,60))}
configureRegion('vespera');assert(!Object.keys(rooms).some(usesCityPainting),'Vespera keeps its own art');
console.log('PASS: painted city blocks cover plain city rooms on the existing street corridor.');
`);
