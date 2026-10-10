const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/combined-rooms.js'),'utf8'));
for(const id of ['burnout','promenade','foundry','mainframe','sunpetal','emerald','stormglass']){
 const bytes=fs.readFileSync(path.join(__dirname,'../assets/environment/areas',id+'.webp'));
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid WebP: '+id);
}
run(`
newGame();
for(const region of ['city','elaris','vespera']){
 configureRegion(region);
 for(const group of JOINED_AREAS[region]){
  const area=joinedArea(group.cells[0]),draws=[];
  if(ORGANIC_AREAS[region+':'+area.art])continue; // organic districts: see organic-paths.test
  if(CROSSROAD_ARTS[area.art]){
   // Round 86: one mirrored crossroads painting per room.
   const ops=[];paintJoinedArea({getContext:()=>({save(){},restore(){},translate:(x,y)=>ops.push(['t',x,y]),scale:(a,b)=>ops.push(['s',a,b]),drawImage:(...a)=>ops.push(['d',...a]) })},area,{naturalWidth:2624,naturalHeight:1632});
   assert.equal(ops.filter(o=>o[0]==='d').length,area.cells.length,'every room gets its crossroads');
   for(const key of area.cells){
    assert(!NeonCity.blocked(key,400,250),'centre of the roundabout is open');
    assert(!NeonCity.blocked(key,30,240)&&!NeonCity.blocked(key,770,240)&&!NeonCity.blocked(key,400,20)&&!NeonCity.blocked(key,400,470),'all four roads run to the edges');
    assert(NeonCity.blocked(key,150,60)&&NeonCity.blocked(key,650,420),'building blocks are solid');
   }
   continue;
  }
  paintJoinedArea({getContext:()=>({drawImage:(...args)=>draws.push(args)})},area,{naturalWidth:2172,naturalHeight:1360});
  let sourceArea=0,destinationArea=0;
  for(const [image,sx,sy,sw,sh,x,y,w,h]of draws){
   assert(sw>0&&sh>0&&w>0&&h>0);sourceArea+=sw*sh;destinationArea+=w*h;
   assert(x>=0&&y>=0&&x+w<=area.width&&y+h<=area.height);
  }
  assert.equal(sourceArea,2172*1360,'Painting pixels dropped or repeated');
  assert.equal(destinationArea,area.width*area.height,'Unpainted world area');
  for(const axis of ['x','y']){
   const points=AREA_ART_GUIDES[area.art][axis];assert.equal(points[0],0);assert.equal(points.at(-1),1);
   points.slice(1).forEach((v,i)=>assert(v>points[i]));
  }
  for(const key of area.cells){
   assert(!NeonCity.blocked(key,400,250));
   assert(NeonCity.blocked(key,100,50),'Scenery island must remain solid');
   assert(!NeonCity.blocked(key,220,215),'Removed prop must not leave an invisible collision');
  }
 }
}
console.log('PASS: six real art assets, whole-image coverage, continuous calibration bands and scenery collisions.');
`);
