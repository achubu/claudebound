'use strict';
// Screen taps are converted through the same camera transform as rendering.
let touchRoute=null,touchFacing=null,selectedTouchCard=null;
const touchGridCache=new Map();
function touchMode(){const saved=localStorage.getItem('cardbound-touch-mode');return saved?saved==='on':innerWidth<=720||(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)}
function syncTouchMode(){document.body.classList.toggle('touch-mode',touchMode());const hint=document.querySelector('.hint');if(hint)hint.textContent=touchMode()?'Tap a path to move · Tap an enemy to approach':'Click a path to move · WASD / arrows · M: map'}
function cancelTouchRoute(){touchRoute=null;touchFacing=null;document.querySelector('.move-marker')?.remove()}
function touchWorldPoint(){const area=joinedArea(),offset=cellOffset(state.room,area);return{x:offset.x+state.pos.x,y:offset.y+state.pos.y}}
function touchGrid(area){
 const cacheKey=activeRegion+':'+area.cells.join('|');if(touchGridCache.has(cacheKey))return touchGridCache.get(cacheKey);
 const step=20,cols=area.width/step,rows=area.height/step,valid=new Uint8Array(cols*rows);
 for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
  const x=ix*step+10,y=iy*step+10,cx=Math.floor(x/800),cy=Math.floor(y/500),key=(area.left+cx)+','+(area.top+cy);
  valid[iy*cols+ix]=area.cells.includes(key)&&walkable(key,x-cx*800,y-cy*500,8)?1:0;
 }
 const grid={step,cols,rows,valid};touchGridCache.set(cacheKey,grid);return grid;
}
function findTouchPath(area,start,target){
 const {step,cols,rows,valid}=touchGrid(area),point=i=>({x:Math.max(12,Math.min(area.width-12,(i%cols)*step+10)),y:Math.max(12,Math.min(area.height-12,Math.floor(i/cols)*step+10))});
 function nearest(p){let best=-1,distance=Infinity;for(let i=0;i<valid.length;i++)if(valid[i]){const q=point(i),d=(q.x-p.x)**2+(q.y-p.y)**2;if(d<distance){best=i;distance=d}}return{index:best,distance}}
 const source=nearest(start),goal=nearest(target);if(source.index<0||goal.distance>90*90)return null;
 const previous=new Int32Array(valid.length);previous.fill(-2);previous[source.index]=-1;
 const queue=[source.index];for(let head=0;head<queue.length&&previous[goal.index]===-2;head++){
  const at=queue[head],x=at%cols,y=Math.floor(at/cols);
  for(const next of [x>0?at-1:-1,x<cols-1?at+1:-1,y>0?at-cols:-1,y<rows-1?at+cols:-1])if(next>=0&&valid[next]&&previous[next]===-2){previous[next]=at;queue.push(next)}
 }
 if(previous[goal.index]===-2)return null;
 const result=[];for(let at=goal.index;at!==-1;at=previous[at])result.push(point(at));return result.reverse();
}
function setTouchDestination(target,exit=null){
 if(!state||state.battle||!$('menuOverlay').classList.contains('hidden')||!$('startOverlay').classList.contains('hidden'))return false;
 const area=joinedArea(),points=findTouchPath(area,touchWorldPoint(),target);
 if(!points){cancelTouchRoute();toast('Tap an open path nearby.');return false}
 touchRoute={points,area:activeRegion+':'+area.cells.join('|'),exit,target:points.at(-1)};drawMoveMarker();return true;
}
function drawMoveMarker(){
 if(!touchRoute)return;let marker=document.querySelector('.move-marker');
 if(!marker){marker=document.createElement('span');marker.className='move-marker';marker.setAttribute('aria-hidden','true');$('world').append(marker)}
 marker.style.left=touchRoute.target.x+'px';marker.style.top=(touchRoute.target.y+25)+'px';
}
// Generous room-exit targeting. Exit labels are small, and on phones the
// zoomed camera crops the room so the side exits are often off screen
// entirely, which left keyboard arrows as the only reliable way between
// rooms. A tap now counts as "go through that exit" when it lands either
// in the outer band of a room side that has an exit, or in the outer band
// of the visible screen on that side (as long as the exit is reasonably
// close). Corner taps pick whichever side the tap is proportionally nearer.
const EXIT_DOOR={n:{x:400,y:15},s:{x:400,y:485},e:{x:785,y:250},w:{x:15,y:250}};
const EXIT_BAND={x:170,y:110},SCREEN_BAND=.2,SCREEN_REACH={x:560,y:360};
function externalExit(key,dir,area){const raw=rooms[key]?.exits?.[dir];if(!raw)return null;if(typeof raw==='string'&&area.cells.includes(raw))return null;return raw}
function edgeExitFor(t,clientX,clientY,area,bounds,scale){
 const cx=Math.floor(t.x/800),cy=Math.floor(t.y/500),key=(area.left+cx)+','+(area.top+cy);
 if(!area.cells.includes(key))return null;
 const o=cellOffset(key,area),lx=t.x-o.x,ly=t.y-o.y;
 // Visible part of the world element, in world units, for the screen bands.
 const visLeft=Math.max(bounds.left,0),visRight=Math.min(bounds.right,innerWidth),visTop=Math.max(bounds.top,0),visBottom=Math.min(bounds.bottom,innerHeight);
 const sw=Math.max(1,visRight-visLeft),sh=Math.max(1,visBottom-visTop);
 const screen={w:(clientX-visLeft)/sw,e:(visRight-clientX)/sw,n:(clientY-visTop)/sh,s:(visBottom-clientY)/sh};
 const dist={w:lx,e:800-lx,n:ly,s:500-ly},span={w:800,e:800,n:500,s:500};
 let best=null;
 for(const dir of ['n','s','e','w']){
  if(!externalExit(key,dir,area))continue;
  const horizontal=dir==='e'||dir==='w',band=horizontal?EXIT_BAND.x:EXIT_BAND.y,reach=horizontal?SCREEN_REACH.x:SCREEN_REACH.y;
  const inRoomBand=dist[dir]<=band,inScreenBand=screen[dir]<=SCREEN_BAND&&dist[dir]<=reach;
  if(!inRoomBand&&!inScreenBand)continue;
  const score=Math.min(dist[dir]/span[dir],screen[dir]);
  if(!best||score<best.score)best={dir,key,score};
 }
 if(!best)return null;
 return{dir:best.dir,key:best.key,point:{x:o.x+EXIT_DOOR[best.dir].x,y:o.y+EXIT_DOOR[best.dir].y}};
}
$('world').onclick=e=>{
 if(e.target.closest('button,a,input,select'))return;
 if(!state||state.battle)return;
 const area=joinedArea(),exit=e.target.closest('.city-exit');
 if(exit){
  if(exit.classList.contains('closed'))return toast('This path is closed.');
  const dir=['n','s','e','w'].find(d=>exit.classList.contains(d)),key=exit.closest('.area-cell')?.dataset.room||state.room,offset=cellOffset(key,area);
  const local={n:{x:400,y:15},s:{x:400,y:485},e:{x:785,y:250},w:{x:15,y:250}}[dir];
  if(local)setTouchDestination({x:offset.x+local.x,y:offset.y+local.y},{dir,key});return;
 }
 const enemy=e.target.closest('.enemy-node');
 if(enemy){for(const key of area.cells){const spawn=roomSpawns(key).find(s=>s.uid===enemy.dataset.spawn);if(spawn){const p=patrolFor(spawn),o=cellOffset(key,area);setTouchDestination({x:o.x+p.x,y:o.y+p.y});return}}}
 const bounds=$('world').getBoundingClientRect(),scale=bounds.width/area.width;
 const tap={x:(e.clientX-bounds.left)/scale,y:(e.clientY-bounds.top)/scale};
 const edge=edgeExitFor(tap,e.clientX,e.clientY,area,bounds,scale);
 if(edge){setTouchDestination(edge.point,{dir:edge.dir,key:edge.key});return}
 setTouchDestination({x:tap.x,y:tap.y-25});
};
const keyboardMove=move;
move=function(dt){
 if(!touchRoute)return keyboardMove(dt);
 if(!state||state.battle||!$('menuOverlay').classList.contains('hidden')||!$('startOverlay').classList.contains('hidden')){cancelTouchRoute();return}
 if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','w','a','s','d'].some(k=>keys[k])){cancelTouchRoute();return keyboardMove(dt)}
 const area=joinedArea();if(touchRoute.area!==activeRegion+':'+area.cells.join('|')){cancelTouchRoute();return}
 const pos=touchWorldPoint(),target=touchRoute.points[0];
 if(!target){const exit=touchRoute.exit;cancelTouchRoute();if(exit&&exit.key===state.room)transition(exit.dir);save();return}
 const dx=target.x-pos.x,dy=target.y-pos.y;
 if(Math.abs(dx)<1&&Math.abs(dy)<1){touchRoute.points.shift();return}
 const horizontal=Math.abs(dx)>=1,delta=horizontal?dx:dy,key=horizontal?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');
 touchFacing=key;const original=keys;keys={[key]:true};keyboardMove(Math.min(dt,Math.abs(delta)/175));keys=original;
 if(state.battle){cancelTouchRoute();return}
 const now=touchWorldPoint();if(Math.hypot(now.x-pos.x,now.y-pos.y)<.001){cancelTouchRoute();toast('Path blocked. Tap a different spot.');return}
 drawMoveMarker();
};
const originalTouchAnimation=animateHero;
animateHero=function(dt,moved){const original=keys;if(touchFacing&&moved)keys={[touchFacing]:true};originalTouchAnimation(dt,moved);keys=original};
addEventListener('blur',cancelTouchRoute);addEventListener('pagehide',cancelTouchRoute);
addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key))cancelTouchRoute()});
document.querySelectorAll('#touch button').forEach(button=>{const down=button.onpointerdown;button.onpointerdown=e=>{cancelTouchRoute();down(e)}});
const touchMenu=showMainMenu;
showMainMenu=function(){cancelTouchRoute();touchMenu();const toggle=document.createElement('button');toggle.textContent='Touch controls: '+(touchMode()?'On':'Off');toggle.onclick=()=>{localStorage.setItem('cardbound-touch-mode',touchMode()?'off':'on');syncTouchMode();showMainMenu()};$('menuModal').append(toggle)};
navMenu.onclick=showMainMenu;
const touchBattle=renderBattle;
renderBattle=function(){
 const handScroll=$('hand')?.scrollLeft||0;cancelTouchRoute();touchBattle();if(!state?.battle||state.battle.phase!=='fight'||!touchMode())return;
 const b=state.battle,selected=b.hand.find(c=>c.uid===selectedTouchCard);
 if(!selected)selectedTouchCard=null;
 const instruction=document.querySelector('.hand-title .muted');if(instruction)instruction.textContent='Swipe hand · tap to select · Play card';
 document.querySelectorAll('#hand .card').forEach((button,i)=>{
  const c=b.hand[i];button.disabled=false;button.classList.toggle('touch-selected',c.uid===selectedTouchCard);button.setAttribute('aria-pressed',String(c.uid===selectedTouchCard));
  button.onclick=()=>{selectedTouchCard=c.uid;renderBattle()};
 });
 const action=document.createElement('div');action.className='touch-card-action';
 const summary=document.createElement('span');summary.textContent=selected?stat(selected).name+' · '+stat(selected).cost+' energy':'Select a card from your hand';
 const play=document.createElement('button');play.className='primary';play.textContent=selected?'Play '+stat(selected).name:'Play selected card';play.disabled=!selected||stat(selected).cost>b.energy;
 if(selected&&stat(selected).cost>b.energy)summary.textContent+=' · Not enough energy';
 play.onclick=()=>{const index=state.battle?.hand.findIndex(c=>c.uid===selectedTouchCard);if(index>=0){selectedTouchCard=null;playCard(index)}};
 action.append(summary,play);$('battleModal').querySelector('.battle-footer')?.prepend(action);if($('hand'))$('hand').scrollLeft=handScroll;
};
addEventListener('resize',syncTouchMode);syncTouchMode();
