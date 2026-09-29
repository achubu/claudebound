'use strict';
// Elaris expansion: world generation and combat share the adventure's existing state.
const EXPANSION_VERSION=3;
const CITY_ROOMS=JSON.parse(JSON.stringify(rooms));
const ELEMENTS=['fire','water','earth','air'];
const COUNTERS={fire:'water',water:'air',earth:'fire',air:'earth'};
const ELEMENT_ICONS={fire:'♨',water:'≈',earth:'◆',air:'≋',ice:'❄',poison:'☠'};
const CRYSTAL_RARITIES={uncommon:{name:'Uncommon',chance:.80,shield:0},rare:{name:'Rare',chance:.17,shield:1},epic:{name:'Epic',chance:.03,shield:2}};
const CRYSTALS={capacity:{name:'Capacity',text:'+1 deck size',icon:'▥'},assault:{name:'Assault',text:'+1 attack-card damage',icon:'⚔'},aegis:{name:'Aegis',text:'+1 defense-card Block',icon:'◇'}};
let spawnCatalog={},patrolCatalog={},activeRegion='city';
const natureTexture=new Image();
natureTexture.src='assets/environment/elaris-atlas.webp';
const originalRoomRender=NeonCity.render;
const hashSeed=s=>[...String(s)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
function seeded(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function deviceSlots(){return [1,6,12,20,30].filter(l=>state.playerLevel>=l).length}
function crystalRarity(c){return Object.hasOwn(CRYSTAL_RARITIES,c?.rarity)?c.rarity:'uncommon'}
function slottedCrystals(){return(state?.device?.slots||[]).slice(0,deviceSlots()).map(id=>state.device.crystals.find(c=>c.uid===id)).filter(Boolean)}
function deviceBonus(type){const count=slottedCrystals().filter(c=>c.type===type).length;return type==='capacity'?count:Math.min(3,count)}
function crystalOpeningBlock(){return Math.max(0,...slottedCrystals().map(c=>CRYSTAL_RARITIES[crystalRarity(c)].shield))}
function rollUpgradeCrystal(type,roll=Math.random()){const used=state.device.crystals.map(c=>Number(c.uid.split('-')[1])).filter(Number.isSafeInteger);state.device.next=Math.max(1,Number.isSafeInteger(state.device.next)?state.device.next:1,...used.map(n=>n+1));return{uid:'crystal-'+state.device.next++,type,rarity:roll<.80?'uncommon':roll<.97?'rare':'epic'}}
function crystalArt(c){return '<span class="crystal-art crystal-'+c.type+' rarity-'+crystalRarity(c)+'" role="img" aria-label="'+CRYSTAL_RARITIES[crystalRarity(c)].name+' '+CRYSTALS[c.type].name+' crystal"></span>'}
function crystalLabel(c){return CRYSTAL_RARITIES[crystalRarity(c)].name+' '+CRYSTALS[c.type].name}

function installCrystal(slot,id){if(state.battle?.phase==='fight')return toast('Configure the Aetherlink between encounters.');if(slot<0||slot>=deviceSlots())return;if(id&&!state.device.crystals.some(c=>c.uid===id))return;state.device.slots=state.device.slots.map(x=>x===id?null:x);state.device.slots[slot]=id||null;save();showDevice()}
function showDevice(){
 if(!state)return;
 const sockets=Array.from({length:5},(_,i)=>{
  const crystal=state.device.crystals.find(c=>c.uid===state.device.slots[i]),locked=i>=deviceSlots();
  return '<section class="panel crystal-socket"><h3>Socket '+(i+1)+'</h3>'+(locked?'<div class="empty-crystal">◇</div><p>Unlocks at level '+[1,6,12,20,30][i]+'</p>':(crystal?crystalArt(crystal)+'<b class="rarity-text rarity-'+crystalRarity(crystal)+'">'+crystalLabel(crystal)+'</b><p>'+CRYSTALS[crystal.type].text+'</p>':'<div class="empty-crystal">◇</div><p>Empty socket</p>')+'<label>Slot crystal<select aria-label="Crystal for socket '+(i+1)+'" data-socket="'+i+'"><option value="">Empty</option>'+state.device.crystals.map(c=>'<option value="'+c.uid+'" '+(crystal?.uid===c.uid?'selected':'')+'>'+crystalLabel(c)+' · '+c.uid+'</option>').join('')+'</select></label>')+'</section>';
 }).join('');
 const collection=state.device.crystals.map(c=>'<article class="crystal-item rarity-'+crystalRarity(c)+'">'+crystalArt(c)+'<div><b>'+crystalLabel(c)+'</b><p>'+CRYSTALS[c.type].text+'</p><small>'+c.uid+(state.device.slots.includes(c.uid)?' · Slotted':' · Available')+'</small></div></article>').join('');
 openMenu('<div class="eyebrow">WRIST DEVICE · AETHERLINK</div><h1>Aetherlink Gauntlet</h1><p>'+deviceSlots()+'/5 sockets · +'+deviceBonus('capacity')+' deck size · +'+deviceBonus('assault')+' damage · +'+deviceBonus('aegis')+' Block</p><p class="notice">Opening shield: '+crystalOpeningBlock()+' Block · highest slotted rarity only</p><div class="crystal-sockets">'+sockets+'</div><h2>Crystal collection</h2><div class="crystal-collection">'+(collection||'<p>Defeat elite monsters for a chance to find a crystal.</p>')+'</div><p class="muted">Elite drops: 8% chance. Of crystals found: 80% Uncommon, 17% Rare, 3% Epic. Every crystal gives its listed +1 upgrade. Rare adds 1 opening Block; Epic adds 2. Rarity shields do not stack. Crystal damage and defense bonuses each cap at +3. Capacity adds +1 per socket.</p><p class="muted">Crystals can be moved between encounters. Removing Capacity may require removing cards from your deck.</p><button id="deviceClose">Return</button>');
 document.querySelectorAll('[data-socket]').forEach(s=>s.onchange=()=>installCrystal(Number(s.dataset.socket),s.value));$('deviceClose').onclick=closeMenu;
}


TALENT_BRANCHES.surge.nodes.push(
 {id:'critical',name:'Precision Strike',icon:'✧',max:5,tier:1,req:['powerCore',1],desc:'+3% critical chance per rank. Critical attacks deal double damage.'},
 {id:'doublePower',name:'Overdrive Pulse',icon:'⚡',max:1,tier:3,req:['overcharge',1],desc:'Once per encounter: double the next attack card\'s damage.'});
TALENT_BRANCHES.resolve.nodes.push({id:'echo',name:'Echo Protocol',icon:'⟳',max:1,tier:3,req:['recovery',3],desc:'Once per encounter: play the next card twice for one energy payment.'});
function addCard(id,name,cost,kind,icon,base){defs[id]={name,cost,kind,icon,...(base.soulbound?{soulbound:true}:{}),tiers:[0,1,2,3].map(level=>({...base,...(base.damage?{damage:base.damage+level*2}:{}),...(base.block?{block:base.block+level*2}:{})}))}}
addCard('glacial','Glacial Covenant',1,'Soulbound Ice','❄',{damage:4,freeze:1,element:'ice',soulbound:true,exhaust:true});
addCard('cinder','Cinder Lance',1,'Fire Attack','♨',{damage:5,burn:2,element:'fire'});
addCard('venom','Venom Bloom',1,'Poison Attack','☠',{damage:3,poison:2,element:'earth'});
addCard('gale','Gale Cut',1,'Air Attack','≋',{damage:5,draw:1,element:'air'});
addCard('counter','Prismatic Counter',1,'Elemental Counter','◈',{block:3,counter:true,exhaust:true});
for(const element of ELEMENTS)addCard('counter_'+element,element[0].toUpperCase()+element.slice(1)+' Reversal',1,'Elemental Counter',ELEMENT_ICONS[element],{block:3,counter:element,exhaust:true});
const originalRules=rules;
rules=function(c){const d=stat(c);return originalRules(c)+(d.freeze?' Freeze: enemy skips its next attack.':'')+(d.burn?' Burn: 2 damage for 2 turns.':'')+(d.poison?' Poison: +2 stacking damage each turn.':'')+(d.counter===true?' Counter a charged elemental strike and deal 6 damage. Reserve this card for free between turns.':d.counter?' Arm '+d.counter+' to counter '+Object.keys(COUNTERS).find(e=>COUNTERS[e]===d.counter)+'.':'')};
syncTalentVitals=function(heal=false){const old=state.maxHp,next=30+state.playerLevel-1+talentRank('vitality')*2;state.maxHp=next;state.hp=Math.min(next,state.hp+(heal?Math.max(0,next-old):0))};
gainXP=function(n){const gained=[];if(state.playerLevel>=30){state.xp=0;return gained}state.xp+=n;while(state.xp>=100&&state.playerLevel<30){state.xp-=100;state.playerLevel++;gained.push(state.playerLevel);syncTalentVitals(false);state.hp=Math.min(state.maxHp,state.hp+5)}if(state.playerLevel===30)state.xp=0;return gained};

function configureRegion(region){activeRegion=region;for(const key of Object.keys(rooms))delete rooms[key];if(region==='city'){Object.assign(rooms,JSON.parse(JSON.stringify(CITY_ROOMS)))}else if(region==='vespera'){const names=['Stormglass Landing','Prism Coast','Thunderfen','Resonant Spires'];for(let y=0;y<2;y++)for(let x=0;x<2;x++){const key=x+','+y,exits={};if(x)exits.w='0,'+y;else exits.e='1,'+y;if(y)exits.n=x+',0';else exits.s=x+',1';rooms[key]={name:names[y*2+x],exits,district:2,cityIndex:y*2+x}}}else{const names=['Dawnroot Landing','Sunpetal Plains','Orchid Rainforest','Jade River','Fernveil Grove','Wildheart Meadow','Moon Orchid Vale','Sapphire Falls','Canopy Cathedral','Amber Savannah','Mistfall Basin','Elderbloom Sanctuary'];for(let y=0;y<3;y++)for(let x=0;x<4;x++){const key=x+','+y,index=y*4+x,exits={};if(x)exits.w=(x-1)+','+y;if(x<3)exits.e=(x+1)+','+y;if(y)exits.n=x+','+(y-1);if(y<2)exits.s=x+','+(y+1);rooms[key]={name:names[index],exits,district:index%4,landmark:['FOREST','PLAINS','RAINFOREST','RIVERLAND'][index%4],cityIndex:index}}}spawnCatalog={};patrolCatalog={}}
// Restore the original fixed street layout and collision boundaries.
// Elaris keeps its new scenery, using the same fixed room footprint.
function walkable(key,x,y,margin=0){
 if(x<0||x>800||y<0||y>500||NeonCity.blocked(key,x,y))return false;
 const padding=Math.max(0,margin-8);
 return !padding||[[padding,0],[-padding,0],[0,padding],[0,-padding]].every(([dx,dy])=>!NeonCity.blocked(key,x+dx,y+dy));
}
NeonCity.render=function(world,key,r){
 if(activeRegion==='city')return originalRoomRender(world,key,r,rooms,hasRelic);
 world.innerHTML='';world.dataset.environment='elaris';
 const canvas=document.createElement('canvas');canvas.className='city-ground';canvas.width=800;canvas.height=500;world.append(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#31553d';ctx.fillRect(0,0,800,500);
 if(natureTexture.complete&&natureTexture.naturalWidth){const v=r.district;ctx.drawImage(natureTexture,(v%2)*natureTexture.width/2,Math.floor(v/2)*natureTexture.height/2,natureTexture.width/2,natureTexture.height/2,0,0,800,500)}
 const title=document.createElement('div');title.className='city-landmark';title.textContent='ELARIS · '+r.name;world.append(title);
 for(const [dir,raw]of Object.entries(r.exits)){const to=typeof raw==='string'?raw:raw.to,node=document.createElement('div');node.className='city-exit '+dir;node.textContent=rooms[to].name;world.append(node)}
 for(let i=0;i<4;i++){const wildlife=document.createElement('span');wildlife.className='wildlife';wildlife.textContent=i%2?'🦋':'✧';wildlife.style.left=(160+i*135)+'px';wildlife.style.top=(140+(i%2)*190)+'px';wildlife.style.animationDelay=(-i*2)+'s';world.append(wildlife)}
};
natureTexture.onload=()=>{if(state&&activeRegion==='elaris'&&!state.battle)renderWorld()};

let cityDistanceCache=null;
function cityRoomDistances(){
 if(cityDistanceCache)return cityDistanceCache;
 const dist={'1,1':0},queue=['1,1'];
 while(queue.length){
  const cur=queue.shift(),r=CITY_ROOMS[cur];
  for(const raw of Object.values(r.exits)){
   const to=typeof raw==='string'?raw:raw.to;
   if(!(to in dist)){dist[to]=dist[cur]+1;queue.push(to)}
  }
 }
 return cityDistanceCache=dist;
}
// Enemy strength ramps with distance from Afterlight Refuge (the start room),
// so exploring outward naturally leads from easy patrols toward the hardest
// non-boss types near the map's edges, closest to the boss rooms.
// Elaris and Vespera are plain rectangular grids generated in configureRegion
// (every cell connects to its in-bounds NSEW neighbors, no relic gates), so
// Manhattan distance from (0,0) is exact — no BFS needed for those regions.
function regionMaxDistance(region){return region==='vespera'?2:5}
function regionDistance(key,region=activeRegion){
 if(region==='city')return cityRoomDistances()[key]||0;
 const[x,y]=key.split(',').map(Number);return x+y;
}
function regionDistanceFrac(key,region=activeRegion){return Math.min(1,regionDistance(key,region)/regionMaxDistance(region))}
function cityTierTypes(key){
 const d=cityRoomDistances()[key]||0;
 if(d<=1)return['emberling','thornling'];
 if(d<=2)return['emberling','thornling','burrower','vineguard'];
 if(d<=3)return['burrower','vineguard','shade','cryptWisp'];
 return['shade','cryptWisp','forgeBeast','crownEye'];
}
function roomSpawns(key){
 const cache=activeRegion+':'+key;if(spawnCatalog[cache])return spawnCatalog[cache];
 const rand=seeded(hashSeed(state.seed+cache+'enemies')),r=rooms[key],safe=activeRegion==='city'?key==='1,1':key==='0,0';
 const count=safe?0:(typeof areaPatrolCount==='function'?areaPatrolCount(key):2),list=[];
 for(let i=0;i<count;i++){
  const types=activeRegion==='city'?cityTierTypes(key):Object.keys(ELARIS_WILDLIFE);
  const regionBoss=activeRegion==='elaris'&&key==='3,2'&&i===0,boss=regionBoss||(i===0&&activeRegion==='city'&&r.enemy&&enemies[r.enemy[0]].boss),type=regionBoss?'bloomTyrant':boss?r.enemy[0]:types[Math.floor(rand()*types.length)];
  // Fixed, widely separated home sectors leave the main crossing and doors clear.
  const candidates=[[400,130],[400,385],[270,245],[610,245]];
  let spot=candidates.find(([x,y])=>walkable(key,x,y,28)&&list.every(s=>Math.hypot(s.x-x,s.y-y)>230));
  if(!spot)throw Error('No clear patrol sector in '+key);
  const [x,y]=spot,eliteChance=.04+regionDistanceFrac(key)*.32,elite=!boss&&rand()<eliteChance,element=activeRegion!=='city'?enemies[type].element:null;
  list.push({uid:cache+':'+i,type,x,y,boss,elite,element});
 }
 return spawnCatalog[cache]=list;
}
function spawnAvailable(s){return s.boss?!state.bosses.includes(s.type):!(state.cooldowns[s.uid]>0)}
enemyAvailable=function(id){const s=roomSpawns(state.room).find(s=>s.uid===id||s.type===id);return s?spawnAvailable(s):false};
roomCleared=function(key){return roomSpawns(key).every(s=>!spawnAvailable(s))};
function patrolFor(s){return patrolCatalog[s.uid]||(patrolCatalog[s.uid]={x:s.x,y:s.y,angle:hashSeed(s.uid)%628/100,turn:2})}
// Each key maps to what the hidden chest holds. The two new city chests
// (Reactor Causeway, Lastlight Shelter) grant Upgrade Crystals — the map
// previously had exactly one, ever (Memory Annex's relic), which capped
// how many cards could ever be leveled up for an entire run.
function chestFor(key){const designated=activeRegion==='city'?{'-1,0':'potion','4,0':'potion','0,2':'potion','5,2':'potion','3,3':'crystal','4,3':'crystal'}:activeRegion==='elaris'?{'1,0':'potion','2,1':'potion','3,2':'potion'}:null;if(!designated||!designated[key])return null;return{id:activeRegion+':'+key,x:400,y:145,reward:designated[key]}}
renderWorld=function(){if(!state)return;const r=room(),world=$('world');if(collides(state.pos.x,state.pos.y))state.pos={x:400,y:280};NeonCity.render(world,state.room,r);for(const s of roomSpawns(state.room)){if(!spawnAvailable(s))continue;const p=patrolFor(s),node=document.createElement('div');node.className='enemy-node monster-'+s.type+(s.boss?' boss':'')+(s.elite?' elite':'');node.dataset.spawn=s.uid;node.dataset.name=(s.elite?'★ ELITE · ':'')+(s.element?ELEMENT_ICONS[s.element]+' ':'')+enemies[s.type].name;node.innerHTML=monsterArt(s.type);node.style.left=p.x+'px';node.style.top=p.y+'px';world.append(node)}if(r.relic&&relicAvailable(r.relic[0])){const q=r.relic,node=document.createElement('div');node.className='relic';node.textContent=q[2];node.dataset.name=q[1];node.style.left=q[3]+'px';node.style.top=q[4]+'px';world.append(node)}const chest=chestFor(state.room);if(chest&&!state.chests.includes(chest.id)){const node=document.createElement('div');node.className='map-chest';node.title=chest.reward==='crystal'?'Hidden loot chest — Upgrade Crystal':'Hidden loot chest';node.style.left=chest.x+'px';node.style.top=chest.y+'px';world.append(node)}if(portalTarget()){const portal=document.createElement('button');portal.className='region-portal';portal.innerHTML='<img class="portal-art" src="assets/environment/elaris-portal.png" alt=""><small>'+portalTarget().label+'</small>';portal.onclick=travelPortal;world.append(portal)}const player=document.createElement('div');player.id='player';player.style.left=state.pos.x+'px';player.style.top=state.pos.y+'px';player.innerHTML='<span class="hero-sprite"></span>';world.append(player);animateHero(0,false);renderHUD()};
animateEnemy=function(dt){if(!state||state.battle||!$('menuOverlay').classList.contains('hidden'))return;for(const s of roomSpawns(state.room)){if(!spawnAvailable(s))continue;const p=patrolFor(s),speed=s.boss?8:14;p.turn-=dt;if(p.turn<0){p.angle+=.8;p.turn=3}const nx=p.x+Math.cos(p.angle)*speed*dt,ny=p.y+Math.sin(p.angle)*speed*dt;if(walkable(state.room,nx,ny,26)&&Math.hypot(nx-s.x,ny-s.y)<75){p.x=nx;p.y=ny}else p.angle+=1.8;const node=document.querySelector('[data-spawn="'+s.uid+'"]');if(node){node.style.left=p.x+'px';node.style.top=p.y+'px';node.querySelector('.monster-sprite')?.style.setProperty('--enemy-facing',Math.cos(p.angle)<0?-1:1)}if(Math.hypot(state.pos.x-p.x,state.pos.y-p.y)<(s.boss?58:43)){startBattle(s.uid);if(state.battle)return}}};
checkWorldInteractions=function(){if(state.battle)return;const q=room().relic;if(q&&relicAvailable(q[0])&&Math.hypot(state.pos.x-q[3],state.pos.y-q[4])<48)collectRelic(q);const chest=chestFor(state.room);if(chest&&!state.chests.includes(chest.id)&&Math.hypot(state.pos.x-chest.x,state.pos.y-chest.y)<38){state.chests.push(chest.id);if(chest.reward==='crystal'){setMaterials(materials()+1);toast('Hidden loot chest: an Upgrade Crystal!')}else{state.potions+=1;toast('Hidden loot chest: a small healing potion!')}save();renderWorld()}};
function portalTarget(){
 if(activeRegion==='city'&&state.room==='4,2'&&state.bosses.includes('thornWarden'))return{region:'elaris',room:'0,0',label:'Enter Elaris'};
 if(activeRegion==='elaris'&&state.room==='0,0')return{region:'city',room:'4,2',label:'Return to city'};
 if(activeRegion==='elaris'&&state.room==='3,2'&&state.bosses.includes('bloomTyrant'))return{region:'vespera',room:'0,0',label:'Enter Vespera'};
 if(activeRegion==='vespera'&&state.room==='0,0')return{region:'elaris',room:'3,2',label:'Return to Elaris'};
 return null;
}
function travelPortal(){
 if(state.battle)return;const target=portalTarget();if(!target)return;
 state.region=target.region;configureRegion(target.region);state.room=target.room;state.pos={x:400,y:300};state.visited=state.regionVisits[target.region]||[target.room];state.regionVisits[target.region]=state.visited;
 if(target.region==='elaris'&&!state.elarisGift){state.elarisGift=true;state.pool.push(make('counter'));toast('Elaris attunement: +4 deck capacity and a Prismatic Counter. Open Deck to equip it.')}
 if(target.region==='vespera')toast('Vespera · Stormglass Reach. Your expanded deck capacity carries forward.');
 save();renderWorld();
}


startBattle=function(spawnId){const issue=deckIssue();if(issue)return toast(issue+' Open Deck to adjust.');if(!active().length)return toast('Equip a card before fighting.');const spawn=roomSpawns(state.room).find(s=>s.uid===spawnId);if(!spawn||!spawnAvailable(spawn))return;const base=enemies[spawn.type],regionScale=activeRegion==='vespera'?1.9:activeRegion==='elaris'?1.75:1,eliteScale=spawn.elite?1.25:1,
// Elaris/Vespera have no per-species tiering (unlike the city), so ramp
// difficulty smoothly with distance from that region's start room instead —
// enemies right by the portal in are the weakest, enemies near the region's
// boss room are the strongest.
distFrac=activeRegion==='city'?0:regionDistanceFrac(state.room),distScale=1+distFrac*.6,distAttack=Math.round(distFrac*5),
health=Math.round(base.hp*regionScale*eliteScale*distScale),attackBonus=(activeRegion==='vespera'?6:activeRegion==='elaris'?5:0)+(spawn.elite?2:0)+distAttack;keys={};state.fight++;state.battle={id:spawn.type,spawnId:spawn.uid,enemy:{...base,boss:spawn.boss,elite:spawn.elite,element:spawn.element,name:(spawn.elite?'Elite ':'')+base.name,hp:health,maxHp:health,attack:base.attack+attackBonus},turn:1,energy:maxEnergy(),block:talentRank('plating')+crystalOpeningBlock(),draw:shuffle(active().map(c=>({...c}))),hand:[],discard:[],exhaust:[],savedUid:null,boostedUid:null,boostedUids:[],boostUses:0,debuffUsed:false,enemyDebuff:0,phase:'fight',logs:['Encounter: '+base.name],freeze:0,burn:0,burnTurns:0,poison:0,counter:null,doubleUsed:false,doubleArmed:false,echoUsed:false,echoArmed:false,overloadUsed:false,overloadArmed:false};drawCards(openingHand());$('battleOverlay').classList.remove('hidden');save();renderBattle()};
function boostedCardUids(b){return Array.isArray(b.boostedUids)?b.boostedUids:(b.boostedUid==null?[]:[b.boostedUid])}
function cardEffect(c,empowered,doubleAttack){const b=state.battle,d=stat(c),boost=empowered?boostAmount():0;let damage=d.damage?d.damage+attackBonus()+deviceBonus('assault')+boost:0;if(damage&&doubleAttack)damage*=2;if(damage&&Math.random()<talentRank('critical')*.03){damage*=2;b.logs.push('Critical strike!')}if(damage&&b.enemy.element&&COUNTERS[b.enemy.element]===(d.element==='ice'?'water':d.element)){damage=Math.round(damage*1.5);b.logs.push('Elemental weakness: +50% damage.')}const preArmor=damage,armorBlocked=(damage&&b.enemy.armor&&!d.pierce)?Math.min(damage,b.enemy.armor):0;if(armorBlocked)damage=Math.max(0,damage-b.enemy.armor);b.enemy.hp=Math.max(0,b.enemy.hp-damage);if(d.block)b.block+=d.block+deviceBonus('aegis')+boost;if(d.heal)state.hp=Math.min(state.maxHp,state.hp+d.heal+boost);b.energy+=d.energy||0;if(d.draw)drawCards(d.draw);if(d.freeze)b.freeze=Math.max(b.freeze,d.freeze);if(d.burn){b.burn=d.burn;b.burnTurns=2}if(d.poison)b.poison+=d.poison;if(d.counter){b.counter=d.counter===true?(COUNTERS[b.enemy.element]||null):d.counter;b.logs.push(b.counter?'Prismatic Counter armed for '+b.counter+'.':'No elemental attack to counter.')} b.logs.push(d.name+(preArmor?(armorBlocked?' · '+preArmor+' dmg − '+armorBlocked+' armor = '+damage+' dealt':' · '+damage+' damage'):''))}
playCard=function(i){const b=state.battle;if(!b||b.phase!=='fight')return;const c=b.hand[i];if(!c)return;const d=stat(c);const overload=b.overloadArmed&&hasTalent('overload')&&!b.overloadUsed;if(!overload&&d.cost>b.energy)return;const boosted=hasTalent('powerCore')&&boostedCardUids(b).includes(c.uid),repeat=b.echoArmed&&hasTalent('echo')&&!b.echoUsed,overdrive=b.doubleArmed&&d.damage&&hasTalent('doublePower')&&!b.doubleUsed;b.energy-=overload?0:d.cost;b.hand.splice(i,1);if(b.savedUid===c.uid)b.savedUid=null;if(repeat){b.echoUsed=true;b.echoArmed=false}if(overdrive){b.doubleUsed=true;b.doubleArmed=false}if(overload){b.overloadUsed=true;b.overloadArmed=false;b.logs.push('Overload Surge: card played for free.')}const original=owned(c.uid);if(original&&original.level<3)original.uses=Math.min(USES,original.uses+1);cardEffect(c,boosted,overdrive);if(repeat&&b.enemy.hp>0){b.logs.push('Echo Protocol repeats the card.');cardEffect(c,false,false)}(d.exhaust?b.exhaust:b.discard).push(c);if(!b.enemy.hp)winBattle();save();renderBattle()};
endTurn=function(){const b=state.battle;if(!b||b.phase!=='fight')return;const dot=b.poison+(b.burnTurns>0?b.burn:0);b.enemy.hp=Math.max(0,b.enemy.hp-dot);if(dot)b.logs.push('Burn / poison: '+dot+' damage.');if(b.burnTurns>0)b.burnTurns--;if(!b.enemy.hp){winBattle();save();renderBattle();return}if(b.freeze>0){b.freeze--;b.logs.push('Frozen: enemy skips its attack.')}else if(b.counter&&COUNTERS[b.enemy.element]===b.counter){b.enemy.hp=Math.max(0,b.enemy.hp-6);b.logs.push('Elemental counter: attack negated, 6 damage returned.');b.counter=null}else{const damage=Math.max(0,intent()-b.block);state.hp=Math.max(0,state.hp-damage);b.logs.push(b.enemy.name+' attacks for '+damage+' HP.');b.counter=null}b.block=0;const keep=hasTalent('retainCore')?b.hand.filter(c=>c.uid===b.savedUid).slice(0,1):[];b.discard.push(...b.hand.filter(c=>!keep.includes(c)));b.hand=keep;b.savedUid=null;if(!state.hp)loseBattle();else if(!b.enemy.hp)winBattle();else{b.turn++;b.energy=maxEnergy();drawCards(4)}save();renderBattle()};
// Upgrade Crystals are needed (alongside the 50-use mastery grind) to
// actually spend a card's mastery on a level-up in the Deck Workshop, but
// the map only ever placed exactly one, ever (Memory Annex). That's a hard
// ceiling on card leveling for the rest of the run. A modest 4% chance per
// loot chest gives a renewable trickle without making crystals feel free —
// roughly comparable to the existing 8% elite device-crystal rate, but not
// gated behind fighting (rarer) elites specifically.
const LOOT_CHEST_ODDS={soulbound:.01,crystal:.05,empty:.29,potion:.645};
const LOOT_THIEVES=['a scavenging fox','a wiry alley cat','a startled crow','a masked raccoon','a quick sewer rat','a one-eared stray dog'];
function rollLootChest(){const r=Math.random();return r<LOOT_CHEST_ODDS.soulbound?'soulbound':r<LOOT_CHEST_ODDS.crystal?'crystal':r<LOOT_CHEST_ODDS.empty?'empty':r<LOOT_CHEST_ODDS.potion?'potion':'card'}
winBattle=function(){const b=state.battle;if(b.phase!=='fight')return;b.phase='reward';state.wins++;const levels=gainXP(b.enemy.boss?50:b.enemy.elite?40:25);if(b.enemy.boss){if(!state.bosses.includes(b.id))state.bosses.push(b.id)}else state.cooldowns[b.spawnId]=3;
b.lootType=rollLootChest();b.reward=null;b.potionDrop=false;b.chestOpened=false;
if(b.lootType==='card'){const rewardIds=activeRegion!=='city'?['cinder','venom','gale','counter','bastion','mend']:['cleave','riposte','bastion','mend','spark','shatter'];b.reward=make(rewardIds[Math.floor(Math.random()*rewardIds.length)]);state.pool.push(b.reward);if(state.deck.length<maxDeckSize()&&copiesInDeck(b.reward.id)<maxCopies())state.deck.push(b.reward.uid)}
else if(b.lootType==='potion'){state.potions++;b.potionDrop=true}
else if(b.lootType==='crystal'){setMaterials(materials()+1)}
else if(b.lootType==='soulbound'){b.reward=make(['phoenix','oath','verdict'][Math.floor(Math.random()*3)]);state.pool.push(b.reward)}
else{b.thief=LOOT_THIEVES[Math.floor(Math.random()*LOOT_THIEVES.length)]}
b.special=[];if(b.id==='thornWarden'&&!state.iceGift){state.iceGift=true;const ice=make('glacial');state.pool.push(ice);b.special.push('Glacial Covenant: guaranteed Soulbound Ice card. The Elaris portal is now open!')}else if(b.id==='bloomTyrant'&&!state.stormGift){state.stormGift=true;state.pool.push(make('stormglass'));b.special.push('Stormglass Covenant: guaranteed Soulbound Lightning card. The Vespera portal is now open!')}else if(b.enemy.boss&&b.lootType!=='soulbound'&&Math.random()<.10){const soul=make(['phoenix','oath','verdict'][Math.floor(Math.random()*3)]);state.pool.push(soul);b.special.push('Soulbound boss card: '+stat(soul).name)}if(b.enemy.elite&&Math.random()<.08){const type=Object.keys(CRYSTALS)[Math.floor(Math.random()*3)],crystal=rollUpgradeCrystal(type);state.device.crystals.push(crystal);b.crystalDrop=crystal.uid;b.special.push(crystalLabel(crystal)+' crystal found! Slot it into the Aetherlink.')}b.levels=levels;b.logs.push(b.lootType==='soulbound'?'Loot chest: Soulbound card!':b.lootType==='potion'?'Loot chest: small healing potion.':b.lootType==='crystal'?'Loot chest: an Upgrade Crystal! ('+materials()+' total)':b.lootType==='empty'?'Loot chest: empty — '+b.thief+' bolted off with everything inside.':'Loot chest: one random card added to your collection.')};
const baseLoseBattle=loseBattle;
loseBattle=function(){const b=state.battle;baseLoseBattle();state.hp=state.maxHp;state.room=activeRegion!=='city'?'0,0':'1,1';state.pos={x:400,y:300};b.lastRegion=activeRegion;if(!active().length&&state.pool.length)state.deck=[state.pool[0].uid]};
const baseRenderBattle=renderBattle;
renderBattle=function(){const b=state.battle;if(!b)return;if(b.phase==='reward'){const m=$('battleModal');
if(!b.chestOpened){
 m.innerHTML='<div class="eyebrow">VICTORY</div><h2>Loot Chest</h2><p>A loot chest dropped. Open it to see what\'s inside.</p><div class="loot-chest-wrap"><span class="loot-chest-graphic" role="img" aria-label="Closed loot chest"></span></div><button id="openChest" class="primary">Open Chest</button>';
 $('openChest').onclick=()=>{b.chestOpened=true;save();renderBattle()};
 return;
}
const head=b.lootType==='card'?'<h2>'+stat(b.reward).name+'</h2><p>The loot chest held a new Impermanent card.</p>':b.lootType==='potion'?'<h2>⚗ Small Healing Potion</h2><p>The loot chest held a potion. You now have '+state.potions+'.</p>':b.lootType==='crystal'?'<h2>◆ Upgrade Crystal</h2><p>The loot chest held an Upgrade Crystal — spend it in the Deck Workshop on a mastered card. You now have '+materials()+'.</p>':b.lootType==='soulbound'?'<h2>◆ '+stat(b.reward).name+'</h2><p class="notice">Jackpot! The loot chest held a rare Soulbound card (1% odds).</p>':'<h2>🐾 Empty Chest</h2><p>You open the chest to find '+b.thief+' already inside — it bolts off into the ruins with everything that was in there.</p>';
m.innerHTML='<div class="eyebrow">VICTORY · LOOT CHEST</div>'+head+'<div id="randomReward" class="cards"></div>'+b.special.map(s=>'<p class="notice">'+s+'</p>').join('')+(b.levels.length?'<p>Level '+state.playerLevel+'! +'+b.levels.length+' maximum HP, +'+b.levels.length*5+' healing, and +'+b.levels.length+' talent point(s).</p>':'')+'<button id="continueReward" class="primary">Continue</button>';
if(b.lootType==='card'||b.lootType==='soulbound')$('randomReward').append(cardElement(b.reward,()=>{},true));
if(b.crystalDrop){const c=state.device.crystals.find(c=>c.uid===b.crystalDrop);if(c){const art=document.createElement('div');art.className='crystal-reward';art.innerHTML=crystalArt(c)+'<b>'+crystalLabel(c)+'</b>';$('randomReward').append(art)}}
$('continueReward').onclick=finishBattle;return}baseRenderBattle();if(b.phase!=='fight')return;const tools=document.createElement('div');tools.className='combat-tools';tools.innerHTML='<p>Enemy element: <b>'+(b.enemy.element||'Neutral')+'</b>'+(b.enemy.element?' · Reserve Prismatic Counter for its charged strike.':'')+' · Freeze '+b.freeze+' · Burn '+b.burnTurns+' turns · Poison '+b.poison+(b.counter?' · Armed: '+b.counter:'')+'</p>'+(activeRegion==='elaris'?'<p class="muted">Elaris enemies have more health and hit harder than city enemies.</p>':'')+(hasTalent('doublePower')?'<button id="overdrive" '+(b.doubleUsed?'disabled':'')+'>'+ (b.doubleUsed?'Overdrive spent':b.doubleArmed?'✓ Overdrive armed':'Overdrive · next attack ×2')+'</button>':'')+(hasTalent('echo')?'<button id="echoCard" '+(b.echoUsed?'disabled':'')+'>'+(b.echoUsed?'Echo spent':b.echoArmed?'✓ Echo armed':'Echo · play next card twice')+'</button>':'')+(hasTalent('overload')?'<button id="overloadCard" '+(b.overloadUsed?'disabled':'')+'>'+(b.overloadUsed?'Overload spent':b.overloadArmed?'✓ Overload armed':'Overload · next card costs 0')+'</button>':'');$('battleModal').prepend(tools);if($('overdrive'))$('overdrive').onclick=()=>{b.doubleArmed=!b.doubleArmed;save();renderBattle()};if($('echoCard'))$('echoCard').onclick=()=>{b.echoArmed=!b.echoArmed;save();renderBattle()};if($('overloadCard'))$('overloadCard').onclick=()=>{b.overloadArmed=!b.overloadArmed;save();renderBattle()}};

newGame=function(){uid=1;const starterSeen=new Set();const pool=['strike','strike','guard','guard','focus','mend'].map(id=>{const first=!starterSeen.has(id);starterSeen.add(id);return make(id,0,first)});state={version:EXPANSION_VERSION,name:'Adventurer',characterId:'protagonist',seed:Math.floor(Math.random()*4294967295),region:'city',regionVisits:{city:['1,1'],elaris:['0,0']},playerLevel:1,xp:0,hp:30,maxHp:30,gold:0,potions:0,pool,deck:pool.map(c=>c.uid),room:'1,1',pos:{x:400,y:300},visited:['1,1'],relics:[],cleared:[],bosses:[],cooldowns:{},fight:0,wins:0,talents:{},battle:null,chests:[],device:{crystals:[],slots:[null,null,null,null,null],next:1}};state.visited=state.regionVisits.city;configureRegion('city');$('startOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');$('battleOverlay').classList.add('hidden');setMaterials(0);save();renderWorld()};
save=function(){if(!state)return;state.regionVisits[state.region]=state.visited;localStorage.setItem('cardbound-expansion-v3',JSON.stringify(state))};
load=function(){try{const parsed=JSON.parse(localStorage.getItem('cardbound-expansion-v3'));if(!parsed||parsed.version!==3)throw Error('No save');const battle=parsed.battle;parsed.battle=null;validateImport(parsed);parsed.battle=battle;restoreGame(parsed);if(battle){$('battleOverlay').classList.remove('hidden');renderBattle()}return true}catch(e){toast('No valid expansion save found. Begin a new journey.');return false}};
function validateImport(s){if(!s||s.version!==3||!['city','elaris','vespera'].includes(s.region)||!Number.isInteger(s.seed)||s.seed<0||!Array.isArray(s.pool)||s.pool.length>10000||!Array.isArray(s.deck)||s.deck.length>30)throw Error('Unsupported or malformed save.');const ids=new Set();for(const c of s.pool){if(!c||!Object.hasOwn(defs,c.id)||!Number.isInteger(c.uid)||c.uid<1||ids.has(c.uid)||!Number.isInteger(c.level)||c.level<0||c.level>3||!Number.isInteger(c.uses)||c.uses<0||c.uses>50)throw Error('Invalid card data.');ids.add(c.uid);c.soulbound=defs[c.id].soulbound?true:!!c.soulbound}if(new Set(s.deck).size!==s.deck.length||s.deck.some(id=>!ids.has(id)))throw Error('Invalid deck.');if(!Number.isInteger(s.playerLevel)||s.playerLevel<1||s.playerLevel>30||!Number.isFinite(s.hp)||s.hp<0||s.hp>1000||!Number.isFinite(s.maxHp)||s.maxHp<1||s.maxHp>1000||!Number.isFinite(s.xp)||s.xp<0||s.xp>=100||!Number.isInteger(s.potions)||s.potions<0)throw Error('Invalid player stats.');const validRooms=s.region==='city'?Object.keys(CITY_ROOMS):s.region==='vespera'?['0,0','1,0','0,1','1,1']:Array.from({length:12},(_,i)=>(i%4)+','+Math.floor(i/4));if(!validRooms.includes(s.room)||!s.pos||!Number.isFinite(s.pos.x)||!Number.isFinite(s.pos.y))throw Error('Invalid room.');for(const field of ['visited','relics','cleared','bosses','chests'])if(!Array.isArray(s[field])||s[field].some(x=>typeof x!=='string'||x.length>100||/[<>]/.test(x)))throw Error('Invalid world data.');if(!s.regionVisits||!Array.isArray(s.regionVisits.city)||!Array.isArray(s.regionVisits.elaris)||!s.cooldowns||!s.talents||!s.device||!Array.isArray(s.device.crystals)||s.device.crystals.length>1000||!Array.isArray(s.device.slots)||s.device.slots.length!==5)throw Error('Invalid progression data.');for(const [id,rank] of Object.entries(s.talents)){const node=Object.values(TALENT_BRANCHES).flatMap(b=>b.nodes).find(n=>n.id===id);if(!node||!Number.isInteger(rank)||rank<0||rank>node.max)throw Error('Invalid talent.')}const crystalIds=new Set();for(const c of s.device.crystals){if(!c||!Object.hasOwn(CRYSTALS,c.type)||typeof c.uid!=='string'||!/^crystal-\d+$/.test(c.uid)||crystalIds.has(c.uid))throw Error('Invalid crystal.');if(c.rarity!==undefined&&!Object.hasOwn(CRYSTAL_RARITIES,c.rarity))throw Error('Invalid crystal rarity.');crystalIds.add(c.uid)}if(s.device.slots.some(id=>id!==null&&!crystalIds.has(id))||new Set(s.device.slots.filter(Boolean)).size!==s.device.slots.filter(Boolean).length)throw Error('Invalid sockets.');if(s.battle)throw Error('Save transfer is available between encounters only.');s.name='Adventurer';return s}
function normalizeElementalCards(s){
 const legacy=s.pool.filter(c=>/^counter_(fire|water|earth|air)$/.test(c.id));
 if(!legacy.length)return false;
 const keeper=s.pool.find(c=>c.id==='counter')||legacy.find(c=>s.deck.includes(c.uid))||legacy[0];keeper.id='counter';
 const removed=new Set(legacy.filter(c=>c!==keeper).map(c=>c.uid));
 s.pool=s.pool.filter(c=>!removed.has(c.uid));s.deck=s.deck.filter(id=>!removed.has(id));
 while(s.deck.length<MIN_DECK){const next=s.pool.find(c=>!s.deck.includes(c.uid));if(!next)break;s.deck.push(next.uid)}
 for(const zone of ['draw','hand','discard','exhaust'])for(const card of s.battle?.[zone]||[])if(/^counter_(fire|water|earth|air)$/.test(card.id))card.id='counter';
 return true;
}
function restoreGame(s){const countersMigrated=normalizeElementalCards(s);state=s;uid=Math.max(1,...s.pool.map(c=>c.uid+1));configureRegion(state.region);state.regionVisits[state.region]=state.visited;keys={};$('startOverlay').classList.add('hidden');$('battleOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');save();renderWorld();if(countersMigrated)toast('Elemental counters combined into one Prismatic Counter type.')}
function exportSave(){if(!state)return toast('Begin or load a journey first.');if(state.battle)return toast('Finish the encounter before exporting.');const payload={format:'cardbound-save',version:3,state,materials:materials()},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cardbound-'+state.region+'-level-'+state.playerLevel+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Save exported.')}
async function importSave(file){try{if(!file||file.size>2000000)throw Error('Choose a save file smaller than 2 MB.');const payload=JSON.parse(await file.text());if(payload.format!=='cardbound-save'||payload.version!==3)throw Error('Not a Cardbound expansion save.');const s=validateImport(payload.state);if(!Number.isInteger(payload.materials)||payload.materials<0||payload.materials>100000)throw Error('Invalid material count.');if(state&&!confirm('Replace this journey with the imported save?'))return;restoreGame(s);setMaterials(payload.materials);save();renderWorld();toast('Save imported successfully.')}catch(e){toast(e.message||'Unable to import this save.')}}
function showMainMenu(){keys={};openMenu('<div class="eyebrow">CARDBOUND</div><h2>Main menu</h2><p>Save transfer is available between encounters.</p><button id="exportSave">Export save file</button> <button id="importSave">Import save file</button><p><button id="backToGame">Return to game</button> <button id="restartJourney" class="danger">New journey</button></p>');$('exportSave').onclick=exportSave;$('importSave').onclick=()=>$('saveFile').click();$('backToGame').onclick=closeMenu;$('restartJourney').onclick=()=>{if(confirm('Start a new journey? Export your current save first if you want to keep it.'))newGame()}}
const baseShowCharacter=showCharacter;
showCharacter=function(){baseShowCharacter();const portrait=document.querySelector('.sheet-portrait');if(portrait){portrait.src='assets/characters/character-portal.webp';portrait.style.maxHeight='none';portrait.style.aspectRatio='16 / 9';portrait.style.objectFit='cover'}const info=document.createElement('p');info.className='notice';info.textContent='Aetherlink: '+deviceSlots()+' sockets · Critical strike '+talentRank('critical')*3+'% · Every level grants +1 max HP and heals 5 HP.';$('menuModal').append(info)};
objective=function(){if(activeRegion==='vespera')return 'Explore Stormglass Reach. Reserve Prismatic Counter for charged attacks.';if(activeRegion==='elaris')return state.bosses.includes('bloomTyrant')?'The Vespera portal is open in Elderbloom Sanctuary.':'Defeat the Bloom Tyrant in Elderbloom Sanctuary. Reserve your counter for charged strikes.';if(state.bosses.includes('thornWarden'))return 'The Warden portal is open. Return to Warden Mainframe to enter Elaris.';if(!hasRelic('ember'))return 'Search west for the Ember Sigil.';if(!hasRelic('boots'))return 'Clear Cable Market to recover the Briarstep Boots.';if(!hasRelic('lens'))return 'Find the Moon Lens in the Drowned Archive.';return 'Defeat the Thorn Warden to unlock Ice and Elaris.'};
showMap=function(){const keys=Object.keys(rooms),xs=keys.map(k=>Number(k.split(',')[0])),ys=keys.map(k=>Number(k.split(',')[1])),minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);openMenu('<div class="eyebrow">'+(activeRegion==='city'?'NEON AFTERMATH':activeRegion==='vespera'?'VESPERA':'ELARIS')+'</div><h2>Exploration map</h2><div class="region-map" style="grid-template-columns:repeat('+(maxX-minX+1)+',1fr)">'+keys.map(k=>{const [x,y]=k.split(',').map(Number),seen=state.visited.includes(k);return '<div class="panel '+(k===state.room?'current-room':'')+'" style="grid-column:'+(x-minX+1)+';grid-row:'+(y-minY+1)+'">'+(seen?rooms[k].name:'Unknown')+'<small>'+(k===state.room?'You are here':seen&&roomCleared(k)?'Clear':'')+'</small></div>'}).join('')+'</div><p>'+state.visited.length+'/'+keys.length+' areas visited. Connections: N / S / E / W as marked in each room.</p><button id="mapReturn">Return</button>');$('mapReturn').onclick=closeMenu};
const style=document.createElement('style');style.textContent='.device-core{font-size:90px;text-align:center;color:#78fff1;text-shadow:0 0 30px #41cdfc}.combat-tools{padding:12px;border:1px solid #529baf;margin-bottom:12px}.region-portal{position:absolute;left:340px;top:340px;width:120px;height:95px;border:2px solid #9dffff;border-radius:50%;background:radial-gradient(#cdfff1,#215ca0,#22113d);box-shadow:0 0 35px #86e5e8;font-size:42px;z-index:7;animation:pulse 3s infinite}.region-portal small{display:block;font:12px system-ui}.elite .monster-sprite{filter:drop-shadow(0 0 8px #ffc958)}.region-map{display:grid;gap:5px}.region-map .panel{padding:8px;font:11px system-ui;min-height:60px}.region-map small{display:block;color:#9edcae}.current-room{outline:2px solid #fff189}.wildlife{position:absolute;pointer-events:none;z-index:3;color:#ceffee;font-size:19px;animation:wildlifeDrift 12s ease-in-out infinite}@keyframes wildlifeDrift{50%{transform:translate(50px,-20px)}}select{max-width:100%;background:#152e40;color:#e3faf7;padding:10px}.loot-chest-wrap{text-align:center}.loot-chest-graphic{display:inline-block;width:170px;height:170px;background-image:url(\'assets/items/loot-chest.png\');background-repeat:no-repeat;background-size:contain;background-position:center;filter:drop-shadow(0 0 16px #7fd8ff99);animation:chestGlow 2.4s ease-in-out infinite}@keyframes chestGlow{50%{filter:drop-shadow(0 0 28px #a6e8ffcc);transform:scale(1.04)}}.armor-tag{color:#9dd6ff;text-shadow:0 0 6px #4aa3ff88}.armor-note{font-size:11px;margin:2px 0 0}.block-tag{color:#a8e6a1;text-shadow:0 0 6px #5ecb5088}.map-chest{position:absolute;transform:translate(-50%,-50%);width:46px;height:46px;background-image:url(\'assets/items/loot-chest.png\');background-repeat:no-repeat;background-size:contain;background-position:center;filter:drop-shadow(0 0 10px #7fd8ff99);z-index:5;animation:chestGlow 2.4s ease-in-out infinite;pointer-events:none}';document.head.append(style);
const navDevice=document.createElement('button');navDevice.textContent='Aetherlink';navDevice.onclick=showDevice;$('nav').append(navDevice);const navMenu=document.createElement('button');navMenu.textContent='Menu';navMenu.onclick=showMainMenu;$('nav').append(navMenu);
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.id='saveFile';fileInput.hidden=true;fileInput.onchange=()=>{importSave(fileInput.files[0]);fileInput.value=''};document.body.append(fileInput);
const importButton=document.createElement('button');importButton.textContent='Import save file';importButton.onclick=()=>fileInput.click();$('startOverlay').querySelector('section').append(importButton);
$('newBtn').onclick=newGame;$('resumeBtn').onclick=load;$('mapBtn').onclick=showMap;$('charBtn').onclick=showCharacter;
$('resumeBtn').classList.toggle('hidden',!localStorage.getItem('cardbound-expansion-v3'));
