/* Background atlas generated for Cardbound. Stable room IDs preserve existing saves. */
const NeonCity=(()=>{
 const districts=[{name:'REFUGE',color:'#52ead7',light:'#14313c'},{name:'NEON STRIP',color:'#f279e7',light:'#291830'},{name:'TRANSIT',color:'#a5cce7',light:'#182734'},{name:'FLOODLINE',color:'#58ceff',light:'#102b37'},{name:'POWER GRID',color:'#ffb46e',light:'#382319'},{name:'CITADEL',color:'#b0a2ff',light:'#242039'}];
 // Round 29: rebuilt to match the user's own hand-designed maze
 // layout (42 rooms) — a long main corridor plus two looping branches to
 // mini-bosses, not a simple spine. configure() has a safety guard in
 // case of any future room/places mismatch.
const places={
 '0,5':['Afterlight Refuge',5,'MEDICAL / SAFE ZONE'], '1,5':['Scrapfire Alley',0,'ZONE 1 LV1'], '1,4':['Creeperline Alley',1,'ZONE 2 LV2'], '1,6':['Thornway Row',1,'ZONE 2 LV2'], '1,3':['Vinecoil Yard',1,'ZONE 2 LV2'], '2,6':['Bramblegate Junction',1,'ZONE 2 LV2'], '1,7':['Crown Boulevard',1,'ZONE 2 LV2'], '2,3':['Overgrown Alley',2,'ZONE 3 LV3'], '3,6':['Mossgate Row',2,'ZONE 3 LV3'], '2,7':['Ashfall Substation',2,'ZONE 3 LV3'], '1,8':['Warden Antechamber',2,'ZONE 3 LV3'], '2,2':['Undercroft Alley',3,'ZONE 4 LV4'], '3,5':['Borehound Row',3,'ZONE 4 LV4'], '4,6':['Tunnelworks Yard',3,'ZONE 4 LV4'], '2,8':['Memory Annex',3,'ZONE 4 LV4'], '2,1':['Undercroft Passage',3,'ZONE 4 LV4'], '3,4':['Borehound Den',3,'ZONE 4 LV4'], '5,6':['Tunnelworks Corridor',3,'ZONE 4 LV4'], '2,9':['Rootcellar Hollow',3,'ZONE 4 LV4'], '3,1':['Fractured Alley',4,'ZONE 5 LV5'], '4,4':['Shade Row',4,'ZONE 5 LV5'], '5,5':['Phasefall Yard',4,'ZONE 5 LV5'], '6,6':['Driftvault Junction',4,'ZONE 5 LV5'], '5,7':['Fractured Passage',4,'ZONE 5 LV5'], '4,1':['Shade Den',4,'ZONE 5 LV5'], '4,3':['Phasefall Corridor',4,'ZONE 5 LV5'], '7,6':['Driftvault Hollow',4,'ZONE 5 LV5'], '4,0':['Corrupted Alley',5,'ZONE 6 LV6'], '4,2':['Wisplight Row',5,'ZONE 6 LV6'], '7,5':['Databank Yard',5,'ZONE 6 LV6'], '8,6':['Cryptline Junction',5,'ZONE 6 LV6'], '7,7':['Corrupted Passage',5,'ZONE 6 LV6'], '7,4':['Slag Alley',6,'ZONE 7 LV7'], '9,6':['Reactor Row',6,'ZONE 7 LV7'], '7,8':['Foundry Yard',6,'ZONE 7 LV7'], '8,4':['Mauler Junction',6,'ZONE 7 LV7'], '9,5':['Slag Passage',6,'ZONE 7 LV7'], '10,6':['Reactor Den',5,'SECURITY CORE'], '9,7':['Foundry Corridor',6,'ZONE 7 LV7'], '8,8':['Mauler Hollow',6,'ZONE 7 LV7'], '9,4':['Crown Alley',7,'ZONE 8 LV8'], '9,8':['Mainframe Row',7,'ZONE 8 LV8']
};
 const atlas=new Image();let loaded=false,current=null;
 atlas.onload=()=>{loaded=true;if(current?.canvas.isConnected){paint(current.canvas,current.key);const status=current.world.querySelector('.city-status');if(status)status.textContent=''}};
 atlas.onerror=()=>{if(current?.canvas.isConnected){const status=current.world.querySelector('.city-status');if(status)status.textContent='Art download failed — refresh to retry'}};
 atlas.src='assets/environment/neon-city.webp';
 const hash=key=>[...key].reduce((a,c)=>a*31+c.charCodeAt(0),17)>>>0;
 function configure(rooms){Object.entries(places).forEach(([key,[name,district,landmark]],i)=>{const r=rooms[key];if(!r)return;r.name=name;r.district=district;r.landmark=landmark;r.cityIndex=i;r.restPoint=[440,325];if(r.enemy){const spots=[[500,250],[400,185],[300,250],[400,350]];[r.enemy[1],r.enemy[2]]=spots[i%4]}if(r.relic){[r.relic[3],r.relic[4]]=r.relic[0]==='material'?[690,285]:[400,110]}})}
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
