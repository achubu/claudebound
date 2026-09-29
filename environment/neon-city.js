/* Background atlas generated for Cardbound. Stable room IDs preserve existing saves. */
const NeonCity=(()=>{
 const districts=[{name:'REFUGE',color:'#52ead7',light:'#14313c'},{name:'NEON STRIP',color:'#f279e7',light:'#291830'},{name:'TRANSIT',color:'#a5cce7',light:'#182734'},{name:'FLOODLINE',color:'#58ceff',light:'#102b37'},{name:'POWER GRID',color:'#ffb46e',light:'#382319'},{name:'CITADEL',color:'#b0a2ff',light:'#242039'}];
 const places={
 '1,1':['Afterlight Refuge',0,'MEDICAL / SAFE ZONE'], '0,1':['Burnout Avenue',1,'ARCADE 09'], '-1,1':['West Service Road',0,'EVACUATION ROUTE'], '-1,0':['Emergency Clinic',0,'TRAUMA UNIT'], '0,0':['Glassfall Junction',1,'SHATTERED MARKET'], '1,0':['Overgrown Promenade',1,'BOTANICAL WALK'], '2,0':['Cable Market',1,'BLACKOUT BAZAAR'], '3,0':['Skyrail Approach',2,'LINE 03 / UPTOWN'], '4,0':['Signal Observatory',5,'UPLINK / OFFLINE'], '2,1':['Central Interchange',2,'TRANSFER / ALL LINES'], '3,1':['Vault Station',2,'RESTRICTED PLATFORM'], '4,1':['Crown Boulevard',5,'EXECUTIVE QUARTER'], '5,1':['Ashfall Substation',4,'HIGH VOLTAGE'], '2,2':['Underpass Zero',2,'LOWER TRANSIT'], '1,2':['Drowned Archive',3,'RECORDS / SUBMERGED'], '0,2':['Canal Pump House',3,'RECOVERY STATION'], '0,3':['Overflow Basin',3,'DRAINAGE SECTOR'], '1,3':['Hydro Turbine',3,'FLOOD CONTROL'], '2,3':['Dead Grid Foundry',4,'GENERATOR HALL'], '3,3':['Reactor Causeway',4,'COOLING NETWORK'], '3,2':['Furnace District',4,'SALVAGE YARD'], '4,2':['Warden Mainframe',5,'SECURITY CORE'], '5,2':['Memory Annex',5,'DATA / CORRUPTED'], '4,3':['Lastlight Shelter',0,'SURVIVOR OUTPOST']
 };
 const atlas=new Image();let loaded=false,current=null;
 atlas.onload=()=>{loaded=true;if(current?.canvas.isConnected){paint(current.canvas,current.key);const status=current.world.querySelector('.city-status');if(status)status.textContent=''}};
 atlas.onerror=()=>{if(current?.canvas.isConnected){const status=current.world.querySelector('.city-status');if(status)status.textContent='Art download failed — refresh to retry'}};
 atlas.src='assets/environment/neon-city.webp';
 const hash=key=>[...key].reduce((a,c)=>a*31+c.charCodeAt(0),17)>>>0;
 function configure(rooms){Object.entries(places).forEach(([key,[name,district,landmark]],i)=>{const r=rooms[key];r.name=name;r.district=district;r.landmark=landmark;r.cityIndex=i;r.restPoint=[440,325];if(r.enemy){const spots=[[500,250],[400,185],[300,250],[400,350]];[r.enemy[1],r.enemy[2]]=spots[i%4]}if(r.relic){[r.relic[3],r.relic[4]]=r.relic[0]==='material'?[690,285]:[400,110]}})}
 // Solid corner blocks use the same street envelope in every district.
 function props(key){const i=hash(key)%4;return i===0?[[198,206,38,24],[557,282,32,18]]:i===1?[[248,287,42,16]]:i===2?[[541,205,35,21],[198,281,36,20]]:[[190,203,36,19]]}
 function solids(key){return [[0,0,292,157],[500,0,300,157],[0,322,292,178],[500,322,300,178],...props(key)]}
 function blocked(key,x,y){return solids(key).some(([l,t,w,h])=>x>l-12&&x<l+w+12&&y+25>t-5&&y+25<t+h+5)}
 function paint(canvas,key){const ctx=canvas.getContext('2d'),p=places[key],district=p[1],d=districts[district];ctx.imageSmoothingEnabled=false;ctx.fillStyle=d.light;ctx.fillRect(0,0,800,500);
 if(loaded){const sw=atlas.naturalWidth/2,sh=atlas.naturalHeight/3;ctx.drawImage(atlas,(district%2)*sw,Math.floor(district/2)*sh,sw,sh,0,0,800,500)}
 // Raised pedestrian service bridge across flooded streets.
 if(district===3){for(const [x,w] of [[0,302],[495,305]]){ctx.fillStyle='#101d28';ctx.fillRect(x,223,w,72);for(let j=x;j<x+w;j+=16){ctx.fillStyle='#4b6571';ctx.fillRect(j,227,14,60);ctx.fillStyle='#74858b';ctx.fillRect(j,227,14,2);ctx.fillStyle='#2c424e';for(let k=233;k<282;k+=7)ctx.fillRect(j+3,k,8,2)}ctx.fillStyle=d.color;ctx.fillRect(x,222,w,2);ctx.fillRect(x,293,w,2)}}
 // District-specific utility barriers, bolts, damaged covers and warning tape.
 props(key).forEach(([x,y,w,h],i)=>{ctx.fillStyle='#0009';ctx.fillRect(x+3,y+5,w,h);ctx.fillStyle='#344452';ctx.fillRect(x,y,w,h);ctx.fillStyle='#71818a';ctx.fillRect(x,y,w,3);ctx.fillStyle=d.color;for(let j=4;j<w-2;j+=10)ctx.fillRect(x+j,y+5,5,3);ctx.fillStyle='#142632';ctx.fillRect(x+5,y+12,w-10,6);ctx.fillStyle='#a1a6a3';ctx.fillRect(x+2,y+2,2,2);ctx.fillRect(x+w-4,y+h-4,2,2)});
 ctx.save();ctx.globalAlpha=.44;ctx.fillStyle=d.color;ctx.font='bold 17px monospace';ctx.translate(367,390);ctx.rotate(-Math.PI/2);ctx.fillText('BLOCK '+String(Object.keys(places).indexOf(key)+1).padStart(2,'0'),0,0);ctx.restore();
 }
 function render(world,key,room,rooms,hasRelic){const d=districts[room.district];world.dataset.environment='neon';world.style.setProperty('--district',d.color);world.innerHTML='';const canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;canvas.className='city-ground';world.append(canvas);current={canvas,key,world};paint(canvas,key);
 const label=document.createElement('div');label.className='city-landmark';label.innerHTML='<small>'+d.name+' / '+String(room.cityIndex+1).padStart(2,'0')+'</small><b>'+room.landmark+'</b>';world.append(label);
 for(const dir of ['n','s','e','w']){const raw=room.exits[dir],info=typeof raw==='string'?{to:raw}:raw;const node=document.createElement('div');node.className='city-exit '+dir;if(!info){node.classList.add('closed');node.textContent='ROAD CLOSED'}else{const locked=info.requires&&!hasRelic(info.requires);node.classList.toggle('sealed',!!locked);node.textContent=(locked?'LOCKED · ':'')+rooms[info.to].name;node.title=locked?'Requires '+({ember:'Ember Sigil',boots:'Briarstep Boots',lens:'Moon Lens'}[info.requires]):'Travel to '+rooms[info.to].name}world.append(node)}
 const rain=document.createElement('div');rain.className='city-rain';rain.setAttribute('aria-hidden','true');world.append(rain);const glow=document.createElement('div');glow.className='city-glow';world.append(glow);
 const status=document.createElement('span');status.className='city-status';status.textContent=loaded?'':'Loading city textures…';world.append(status);
 }
 return{configure,render,blocked,solids,places,districts,paint};
})();
