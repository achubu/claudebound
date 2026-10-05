'use strict';
// Save coordinates stay local; joined areas share one continuous illustrated background.
const JOINED_AREAS={
 // Round 38: Vespera grew to 42 rooms; the two parked art districts
 // (foundry 2x2, promenade 2-cell) found homes here.
 vespera:[
  {name:'Stormglass Reach',art:'stormglass',cells:['0,0','1,0','0,1','1,1']},
  {name:'Prism Bazaar',art:'promenade',cells:['4,3','5,3']},
  {name:'Stormforge Foundry',art:'foundry',cells:['8,3','9,3','8,4','9,4']}
 ],
 // Round 29: city rebuilt again to match the user's own hand-designed
 // maze layout (a long main corridor with two looping branches to mini-
 // bosses, not a simple spine). Crown Mainframe District is the only
 // existing art district that found a clean 2x2 block in the new shape;
 // Promenade Market has no matching slot this time and is parked for a
 // future region rather than forced in somewhere that wouldn't fit its
 // art calibration.
 city:[
  {name:'Crown Mainframe District',art:'mainframe',cells:['1,7','2,7','1,8','2,8']}
 ],
 // Round 30: relocated into the new maze — both districts' art is
 // percentage-based (not tied to specific coordinates), so only the cell
 // adjacency needed preserving. Sunpetal Wilds (2-cell E/W pair) sits
 // just past the start; Emerald Expanse (2x2 block) sits mid-path, near
 // the secondary loop pocket.
 elaris:[
  {name:'Sunpetal Wilds',art:'sunpetal',cells:['1,0','2,0']},
  {name:'Emerald Expanse',art:'emerald',cells:['5,4','6,4','5,5','6,5']}
 ]
};
function joinedArea(key=state.room){
 const group=JOINED_AREAS[activeRegion].find(g=>g.cells.includes(key))||{name:rooms[key].name,cells:[key]};
 const xs=group.cells.map(k=>Number(k.split(',')[0])),ys=group.cells.map(k=>Number(k.split(',')[1]));
 const left=Math.min(...xs),top=Math.min(...ys);
 return {...group,left,top,width:(Math.max(...xs)-left+1)*800,height:(Math.max(...ys)-top+1)*500};
}
function cellOffset(key,area=joinedArea()){const [x,y]=key.split(',').map(Number);return{x:(x-area.left)*800,y:(y-area.top)*500}}
function joinedExit(dir,key=state.room){const raw=rooms[key].exits[dir];return typeof raw==='string'&&joinedArea(key).cells.includes(raw)?raw:null}
// Joined-area density (2- and 4-cell districts) is left exactly as before —
// it's already tuned so each district's total patrol count stays sane, and
// a 4-cell district is already at that ceiling with zero room to add more.
// The actual flatness problem is in the 12 single, unjoined city rooms,
// which previously always got exactly 1 patrol no matter how far they were
// from the start. Those now scale 1 -> 2 -> 3 with distance from the
// region's start room (3 is the real practical ceiling for a single room:
// the 4 fixed patrol candidate positions in roomSpawns() are spaced such
// that only 3 of them can ever be mutually >230px apart at once).
function areaPatrolCount(key){
 const area=joinedArea(key);
 if(area.cells.length!==1)return area.cells.length===2&&key===area.cells[0]?2:1;
 const frac=(typeof regionDistanceFrac==='function')?regionDistanceFrac(key):0;
 return frac>=.7?3:frac>=.35?2:1;
}
function cameraPosition(area,pos,viewportWidth=800,viewportHeight=500){return{x:Math.max(0,Math.min(area.width-viewportWidth,pos.x-viewportWidth/2)),y:Math.max(0,Math.min(area.height-viewportHeight,pos.y-viewportHeight/2))}}
function updateAreaCamera(){
 if(!state)return;const area=joinedArea(),offset=cellOffset(state.room,area),mobile=innerWidth<=720,viewWidth=mobile?480:800,scale=Math.min(innerWidth/viewWidth,innerHeight/500),viewHeight=mobile?Math.min(area.height,Math.max(250,(innerHeight-160)/scale)):500,camera=cameraPosition(area,{x:offset.x+state.pos.x,y:offset.y+state.pos.y},viewWidth,viewHeight);
 const world=$('world');world.style.width=area.width+'px';world.style.height=area.height+'px';world.style.left=(innerWidth-viewWidth*scale)/2+'px';world.style.top=(mobile?124:(innerHeight-500*scale)/2)+'px';world.style.transformOrigin='0 0';world.style.transform='scale('+scale+') translate('+(-camera.x)+'px,'+(-camera.y)+'px)';
 const player=$('player');if(player){player.style.left=(offset.x+state.pos.x)+'px';player.style.top=(offset.y+state.pos.y)+'px'}
}
// Render only interactive cell overlays in joined areas. The scenery is one image
// attached to the whole world, so camera movement can never reveal atlas seams.
const originalAreaCellRender=NeonCity.render;
NeonCity.render=function(container,key,r){
 const area=joinedArea(key);
 if(!area.art)return originalAreaCellRender(container,key,r);
 container.innerHTML='';container.dataset.environment=activeRegion==='city'?'neon':activeRegion;
 for(const dir of ['n','s','e','w']){
  if(joinedExit(dir,key))continue;
  const raw=r.exits[dir],info=typeof raw==='string'?{to:raw}:raw;
  const node=document.createElement('div');node.className='city-exit '+dir;
  if(!info){node.classList.add('closed');node.textContent='PATH CLOSED'}
  else{const locked=info.requires&&!hasRelic(info.requires);node.classList.toggle('sealed',!!locked);node.textContent=(locked?'LOCKED · ':'')+rooms[info.to].name}
  container.append(node);
 }
};
// Painted road corridors match the original corner footprints. Remove old tiny
// procedural props, which are not present in the new full-area paintings.
const originalAreaBlocked=NeonCity.blocked;
NeonCity.blocked=function(key,x,y){
 if(!joinedArea(key).art)return originalAreaBlocked(key,x,y);
 return [[0,0,292,157],[500,0,300,157],[0,322,292,178],[500,322,300,178]]
  .some(([l,t,w,h])=>x>l-12&&x<l+w+12&&y+25>t-5&&y+25<t+h+5);
};
// Calibrate the continuous painting to the existing street footprints. Every
// source pixel is used once, in order; adjacent bands share exactly the same
// boundary. This fits painted roads to collision without introducing art seams.
const AREA_ART_GUIDES={
 stormglass:{x:[0,.21,.29,.71,.79,1],y:[0,.19,.30,.70,.80,1]},
 burnout:{x:[0,.205,.29,.71,.795,1],y:[0,.405,.605,1]},
 promenade:{x:[0,.195,.282,.716,.809,1],y:[0,.38,.61,1]},
 foundry:{x:[0,.20,.275,.73,.80,1],y:[0,.17,.27,.69,.80,1]},
 mainframe:{x:[0,.215,.285,.715,.785,1],y:[0,.19,.30,.70,.80,1]},
 sunpetal:{x:[0,.225,.275,.725,.775,1],y:[0,.42,.56,1]},
 emerald:{x:[0,.23,.29,.71,.77,1],y:[0,.16,.25,.75,.83,1]}
};
const areaPaintings={};
function areaArtBands(area){return {x:[0,292,500,1092,1300,1600],y:area.height===500?[0,157,322,500]:[0,157,322,657,822,1000]}}
function paintJoinedArea(canvas,area,texture){
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const from=AREA_ART_GUIDES[area.art],to=areaArtBands(area);
 const sx=from.x.map(v=>Math.round(v*texture.naturalWidth)),sy=from.y.map(v=>Math.round(v*texture.naturalHeight));
 for(let x=0;x<sx.length-1;x++)for(let y=0;y<sy.length-1;y++)
  ctx.drawImage(texture,sx[x],sy[y],sx[x+1]-sx[x],sy[y+1]-sy[y],to.x[x],to.y[y],to.x[x+1]-to.x[x],to.y[y+1]-to.y[y]);
}
function appendAreaPainting(world,area){
 const canvas=document.createElement('canvas');canvas.className='joined-scenery';canvas.width=area.width;canvas.height=area.height;
 canvas.setAttribute('aria-hidden','true');world.append(canvas);
 let texture=areaPaintings[area.art];
 if(!texture){texture=new Image();areaPaintings[area.art]=texture;texture.src='assets/environment/areas/'+area.art+'.webp'}
 const paint=()=>paintJoinedArea(canvas,area,texture);
 if(texture.complete&&texture.naturalWidth)paint();else texture.onload=paint;
}
const singleRenderWorld=renderWorld;
function appendPatrols(container,key){
 for(const spawn of roomSpawns(key)){if(!spawnAvailable(spawn))continue;const p=patrolFor(spawn),node=document.createElement('div');node.className='enemy-node monster-'+spawn.type+(spawn.boss?' boss':'')+(spawn.elite?' elite':'');node.dataset.spawn=spawn.uid;node.dataset.name=(spawn.elite?'★ ELITE · ':'')+(spawn.element?ELEMENT_ICONS[spawn.element]+' ':'')+enemies[spawn.type].name+' · Lv.'+enemyLevel(key);node.style.left=p.x+'px';node.style.top=p.y+'px';node.innerHTML=monsterArt(spawn.type);container.append(node)}
}
renderWorld=function(){
 if(!state)return;singleRenderWorld();const world=$('world'),area=joinedArea(),current=document.createElement('div');
 // Preserve local interaction coordinates over the full-area background.
 while(world.firstChild)current.append(world.firstChild);
 if(area.art)appendAreaPainting(world,area);
 for(const key of area.cells){
  const cell=key===state.room?current:document.createElement('div'),offset=cellOffset(key,area);cell.classList.add('area-cell');cell.style.left=offset.x+'px';cell.style.top=offset.y+'px';cell.dataset.room=key;
  if(key!==state.room){NeonCity.render(cell,key,rooms[key]);appendPatrols(cell,key);const q=rooms[key].relic;if(q&&!hasRelic(q[0])&&q[0]!=='material'){const relic=document.createElement('div');relic.className='relic';relic.textContent=q[2];relic.dataset.name=q[1];relic.style.left=q[3]+'px';relic.style.top=q[4]+'px';cell.append(relic)}const cache=chestFor(key);if(cache&&!state.chests.includes(cache.id)){const chest=document.createElement('div');chest.className='map-chest';chest.style.left=cache.x+'px';chest.style.top=cache.y+'px';cell.append(chest)}}
  for(const dir of ['n','s','e','w'])if(joinedExit(dir,key))cell.querySelector('.city-exit.'+dir)?.remove();
  world.append(cell);
 }
 // The hero belongs to the full area so its sprite cannot be clipped at a join.
 const hero=current.querySelector('#player');if(hero)world.append(hero);
 updateAreaCamera();
 const title=document.createElement('div');title.className='joined-area-title';title.textContent=area.name+(area.cells.length>1?' · '+area.cells.length+' connected blocks':'');$('hud').append(title);
};
fitWorld=function(){if(state)updateAreaCamera();else $('world').style.setProperty('--world-scale',Math.min(innerWidth/800,innerHeight/500))};
const singleTransition=transition;
transition=function(dir){
 const target=joinedExit(dir);if(!target)return singleTransition(dir);
 state.room=target;if(!state.visited.includes(target))state.visited.push(target);
 if(dir==='e')state.pos.x-=800;if(dir==='w')state.pos.x+=800;if(dir==='n')state.pos.y+=500;if(dir==='s')state.pos.y-=500;
 save();renderWorld();return true;
};
move=function(dt){
 if(!state||state.battle||!$('menuOverlay').classList.contains('hidden'))return;
 const dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),dy=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);if(!dx&&!dy)return;
 const len=Math.hypot(dx,dy),nx=state.pos.x+dx/len*175*dt,ny=state.pos.y+dy/len*175*dt;
 if(!collides(nx,state.pos.y))state.pos.x=nx;if(!collides(state.pos.x,ny))state.pos.y=ny;
 const v=state.pos.y>180&&state.pos.y<320,h=state.pos.x>330&&state.pos.x<470;
 const dir=state.pos.x<(joinedExit('w')?0:10)&&v?'w':state.pos.x>(joinedExit('e')?800:790)&&v?'e':state.pos.y<(joinedExit('n')?0:10)&&h?'n':state.pos.y>(joinedExit('s')?500:490)&&h?'s':null;
 if(dir&&transition(dir))return;
 state.pos.x=Math.max(joinedExit('w')?-24:12,Math.min(joinedExit('e')?824:788,state.pos.x));state.pos.y=Math.max(joinedExit('n')?-24:12,Math.min(joinedExit('s')?524:488,state.pos.y));
 const player=$('player');player.style.left=state.pos.x+'px';player.style.top=state.pos.y+'px';checkWorldInteractions();updateAreaCamera();
};
animateEnemy=function(dt){
 if(!state||state.battle||!$('menuOverlay').classList.contains('hidden'))return;
 // All patrols continue moving across the visible area. Each home sector stays clear.
 for(const key of joinedArea().cells)for(const spawn of roomSpawns(key)){
  if(!spawnAvailable(spawn))continue;const p=patrolFor(spawn);p.turn-=dt;if(p.turn<0){p.angle+=.8;p.turn=3}
  const nx=p.x+Math.cos(p.angle)*(spawn.boss?8:14)*dt,ny=p.y+Math.sin(p.angle)*(spawn.boss?8:14)*dt;
  if(walkable(key,nx,ny,26)&&Math.hypot(nx-spawn.x,ny-spawn.y)<55){p.x=nx;p.y=ny}else p.angle+=1.8;
  const node=document.querySelector('[data-spawn="'+spawn.uid+'"]');if(node){node.style.left=p.x+'px';node.style.top=p.y+'px';node.querySelector('.monster-sprite')?.style.setProperty('--enemy-facing',Math.cos(p.angle)<0?-1:1)}
  if(key===state.room&&Math.hypot(state.pos.x-p.x,state.pos.y-p.y)<(spawn.boss?58:43)){startBattle(spawn.uid);if(state.battle)return}
 }
};
// showMap() itself (assets/expansion.js) now natively draws each joined
// area as one grid-spanning cell, so this wrapper's old job — bolting on
// an extra "· joined area" label after the fact — is redundant.
$('mapBtn').onclick=showMap;
const areaStyles=document.createElement('style');areaStyles.textContent='#game{overflow:hidden}#world{border:0}.joined-scenery{position:absolute;left:0;top:0;max-width:none;pointer-events:none;user-select:none}.area-cell{position:absolute;width:800px;height:500px;overflow:visible}.joined-area-title{font:10px system-ui;color:#a5d7e0;margin-top:5px}';document.head.append(areaStyles);
