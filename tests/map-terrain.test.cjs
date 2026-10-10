const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
run(fs.readFileSync(path.join(__dirname,'../assets/map-terrain.js'),'utf8'));
run(`
// Round 82: the map draws every explored room's art on a 16:10 grid.
newGame();
// A canvas whose 2D context accepts any drawing call (gradients included).
const deep=()=>new Proxy(function(){},{get:(t,k)=>k==='canvas'?undefined:deep(),apply:()=>deep(),set:()=>true});
const fakeCanvas=()=>({width:0,height:0,style:{},className:'',setAttribute(){},getContext:()=>deep()});
const realCreate=document.createElement;document.createElement=tag=>tag==='canvas'?fakeCanvas():realCreate(tag);
for(const region of ['city','elaris']){
 configureRegion(region);state.visited=Object.keys(rooms).slice(0,12);state.room=state.visited[0];
 const b=mapBounds();assert(b.minX<=b.maxX&&b.minY<=b.maxY);
 const c=document.createElement('canvas');drawMapTerrain(c);
 assert.equal(c.width,Math.round((b.maxX-b.minX+1.8)*MAP_TILE_W),'terrain canvas spans the map grid');
 assert.equal(MAP_TILE_W/MAP_TILE_H,1.6,'tiles keep the 800x500 room shape');
 showMap();
}
assert.equal(MAP_CELL_W/MAP_CELL_H,1.6,'map cells are 16:10 so the art is not squashed');
document.createElement=realCreate;
console.log('PASS: the exploration map is drawn from the explored rooms\\' own art.');
`);
