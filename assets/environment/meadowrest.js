/* Tile composition uses unmodified LPC atlases; attribution: credits.html. */
const Meadowrest = (() => {
 const sources={terrain:'terrain.png',trees:'trees.png',cottage:'cottage.png',roof:'roof.png'},images={};
 let ready=null,renderTicket=0;
 const trees=[[-22,-46,0],[64,-64,1],[244,-60,0],[440,-66,1],[698,-64,0],[746,32,1],[-52,52,1],[-50,310,0],[22,366,1],[300,396,0],[410,410,1],[562,390,0],[692,346,1],[744,312,0],[668,20,1],[48,62,0]];
 const houses=[[160,70],[120,340]];
 const solids=[...houses.map(([x,y])=>[x,y+25,112,65]),[589,49,150,103],...trees.map(([x,y])=>[x+54,y+104,23,20])];
 function load(){return ready||(ready=Promise.all(Object.entries(sources).map(([k,file])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[k]=im;resolve()};im.onerror=()=>reject(Error('Could not load '+file));im.src='assets/environment/'+file}))))}
 function tile(ctx,sx,sy,x,y){ctx.drawImage(images.terrain,sx,sy,32,32,x,y,32,32)}
 function patch(ctx,cells,sx,sy){const has=(x,y)=>cells.has(x+','+y);for(const key of cells){const [x,y]=key.split(',').map(Number);const col=!has(x-1,y)?0:!has(x+1,y)?2:1,row=!has(x,y-1)?0:!has(x,y+1)?2:1;tile(ctx,sx+col*32,sy+row*32,x*32,y*32)}}
 function rect(set,x,y,w,h){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)set.add(i+','+j)}
 function ground(ctx){
 ctx.imageSmoothingEnabled=false;
 for(let y=0;y<16;y++)for(let x=0;x<25;x++)tile(ctx,32,((x*7+y*11)%4===0?384:320),x*32,y*32);
 // Curving lane with broad intersections and branches to the cottages and pond.
 const lane=new Set();rect(lane,0,7,7,3);rect(lane,5,8,7,3);rect(lane,10,7,7,3);rect(lane,15,6,6,3);rect(lane,19,7,6,3);rect(lane,11,0,3,9);rect(lane,7,5,5,4);rect(lane,5,10,3,3);rect(lane,16,4,3,4);
 patch(ctx,lane,0,64);
 const pond=new Set();rect(pond,18,1,5,4);rect(pond,19,0,3,1);patch(ctx,pond,96,512);
 // Scattered grass tufts, flowers and stones, all from the same LPC atlas.
 for(let i=0;i<85;i++){const x=(i*137+51)%780,y=(i*83+43)%475;if(lane.has(Math.floor(x/32)+','+Math.floor(y/32))||pond.has(Math.floor(x/32)+','+Math.floor(y/32))||solids.some(([l,t,w,h])=>x>l-25&&x<l+w+20&&y>t-60&&y<t+h+15))continue;ctx.drawImage(images.terrain, i%4===0?96:0,i%4===0?1024:224,32,32,x,y,24,24)}
 // Timber landing at the spring and copper plumbing inset in its bank.
 ctx.fillStyle='#473627';ctx.fillRect(545,146,54,43);for(let y=148;y<188;y+=8){ctx.fillStyle='#aa824d';ctx.fillRect(546,y,51,6);ctx.fillStyle='#ddbd78';ctx.fillRect(547,y,49,1)}
 ctx.strokeStyle='#573a25';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(563,153);ctx.lineTo(563,126);ctx.lineTo(595,126);ctx.stroke();ctx.strokeStyle='#c59b50';ctx.lineWidth=5;ctx.stroke();
 }
 function tree(ctx,variant){ctx.imageSmoothingEnabled=false;ctx.drawImage(images.trees,variant?160:0,512,160,192,0,0,128,154)}
 function house(ctx){ctx.imageSmoothingEnabled=false;ctx.drawImage(images.cottage,0,0,96,96,8,39,112,84);ctx.drawImage(images.roof,88,0,120,108,0,0,128,78);
 ctx.fillStyle='#352b27';ctx.fillRect(53,83,25,39);ctx.fillStyle='#84623d';ctx.fillRect(57,86,17,33);ctx.fillStyle='#e1b966';ctx.fillRect(69,102,3,3);
 for(const x of [21,88]){ctx.fillStyle='#433927';ctx.fillRect(x,84,18,23);ctx.fillStyle='#77cbd0';ctx.fillRect(x+3,87,12,17);ctx.fillStyle='#cbb67a';ctx.fillRect(x+8,87,2,17);ctx.fillRect(x+3,94,12,2)}
 // Brass flue and steam distinguish the settlement from a generic medieval village.
 ctx.fillStyle='#503a2d';ctx.fillRect(92,9,12,37);ctx.fillStyle='#ba8647';ctx.fillRect(95,10,6,34);ctx.fillStyle='#ebc77e';ctx.fillRect(90,8,16,5);
 }
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
 async function render(world){
 const ticket=++renderTicket;world.dataset.environment='meadowrest';world.innerHTML='<div class="environment-loading">Loading Meadowrest…</div>';
 try{await load()}catch(e){if(world.dataset.environment==='meadowrest'){world.innerHTML='<div class="environment-loading">Environment art could not load. Refresh to retry.</div>';ready=null}return}
 if(world.dataset.environment!=='meadowrest'||ticket!==renderTicket)return;
 world.querySelector('.environment-loading')?.remove();
 const floor=canvas(800,500);floor.className='meadow-ground';ground(floor.getContext('2d'));world.prepend(floor);
 function object(x,y,w,h,depth,paint){const c=canvas(w,h);c.className='meadow-object';c.style.left=x+'px';c.style.top=y+'px';c.dataset.depth=depth;paint(c.getContext('2d'));world.append(c)}
 trees.forEach(([x,y,v])=>object(x,y,128,154,y+124,c=>tree(c,v)));houses.forEach(([x,y])=>object(x-8,y-33,128,124,y+90,house));
 for(const [x,y,label] of [[66,276,'EMBER HOLLOW ←'],[663,281,'ROOTWAY →'],[408,36,'↑ CANOPY'],[545,205,'HEALING SPRING']]){const sign=document.createElement('span');sign.className='way-sign';sign.textContent=label;sign.style.left=x+'px';sign.style.top=y+'px';world.append(sign)}
 const ripple=document.createElement('div');ripple.className='spring-ripple';world.append(ripple);
 depth(world,300);
 }
 function depth(world,y){world.querySelectorAll('.meadow-object').forEach(c=>c.style.zIndex=Number(c.dataset.depth)>y+32?'10':'4')}
 function blocked(x,y){return solids.some(([l,t,w,h])=>x>l-13&&x<l+w+13&&y+26>t-7&&y+26<t+h+7)}
 return{render,depth,blocked,ground,house,tree,load,solids};
})();
