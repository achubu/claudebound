'use strict';
// ---------------------------------------------------------------------
// BALANCE — every knob that decides how strong an enemy is, in one place.
// Enemy level is the main difficulty driver; it climbs across the worlds
// (city 1-9, Elaris 10-18 via hand-set room levels, Vespera from
// regionLevelBase). regionHp / regionAttack are extra per-world
// multipliers on top of level; heavy attacks scale with distance from the
// region's start room. tests/balance-sim.cjs measures the effect of any
// change here across all three worlds.
// ---------------------------------------------------------------------
// Any knob below may also be a per-world object, e.g. bossHp:{city:.7,elaris:1}.
const BALANCE={
 // Per level above 1. Gentle in the city (few talents, un-upgraded cards);
 // steeper in Elaris; Vespera grows mostly through health, because cards
 // are maxed by then and a steep attack climb turns fights into cliffs.
 hpPerLevel:{city:.04,elaris:.06,vespera:.05},
 attackPerLevel:{city:.4,elaris:1.1,vespera:.25},
 // Extra per-world strength on top of level (Round 38: about 5-10 points harder).
 regionHp:{city:1.08,elaris:1.8,vespera:2.35},
 regionAttack:{city:0,elaris:5,vespera:16},
 // Level of a region's start rooms when a room has no hand-set level.
 // Elaris rooms are hand-set to 10-18 and Vespera's to 19-27.
 regionLevelBase:{city:1,elaris:1,vespera:19},
 eliteHp:{city:1.15,elaris:1.25,vespera:1.25},eliteAttack:2,
 bossHp:1,bossAttack:0,         // extra for region bosses only
 miniBossHp:1,miniBossAttack:0, // extra for mini-bosses only
 // Round 43: regular and elite enemies have 10% more health; bosses and mini-bosses unchanged.
 // Round 49: city regulars eased to 0.95 (early city fights ran ~23 turns).
 // (+10% attack as well was simulated and proved far too steep: ~+21% total strength.)
 normalHp:{city:.95,elaris:1.1,vespera:1.1},normalAttack:1,
 // Round 51: regular enemies in a world's first levels ease in instead of
 // jumping at the portal (you arrive with your old world's deck).
 entryRamp:{elaris:{10:{hp:.9,attack:-1},11:{hp:.88,attack:-1},12:{hp:.9,attack:-1},13:{hp:.95,attack:0}}},
 // Heavy hit = attack x (heavyBase + heavyDistance x distance from start, 0..1).
 heavyBase:1.5,heavyDistance:.25,
 bossHeavyMax:1.3,              // bosses' heavy hits are capped, so one hit can't decide the fight
 elementalMult:1.8,             // charged elemental strike
 bossElementalMult:1.5,         // same, for bosses and mini-bosses
 // Individual health tuning, set with tests/balance-sim.cjs so that at a
 // fair-fight level (player level = boss level) a typical build beats each
 // final boss about 28 times in 100 and each mini-boss about 40, with every
 // Round 44 affliction active, the bot using pitch + side deck, and (Round 49)
 // decks that include the new reward cards. "Typical" is the average over 16
 // builds covering every talent path.
 perEnemy:{
  moonKnight:{hp:0.73},crownSentinel:{hp:0.72},thornWarden:{hp:0.95},
  tidewardenElaris:{hp:1.4},galeSovereign:{hp:0.79},bloomTyrant:{hp:0.77},
  arcSentinel:{hp:0.72},resonantPhantom:{hp:0.82},stormTyrant:{hp:0.46},
  // Round 51: the Drowned Heron (water, Siphon) was the worst early Elaris fight.
  drownedHeron:{hp:0.85},stormMoth:{hp:0.9}
 }
};


function balanceFor(key,region=activeRegion){const v=BALANCE[key];return v!==null&&typeof v==='object'?(v[region]??v.city):v}
// The single source of truth for an enemy's health and attack: used by
// startBattle() and by compendium.html, so the two can never disagree.
function enemyStats(id,{region=activeRegion,level=1,elite=false,boss=!!enemies[id]?.boss}={}){
 const base=enemies[id],mini=boss&&!!base.miniBoss,final=boss&&!base.miniBoss,tune=BALANCE.perEnemy[id]||{},get=k=>balanceFor(k,region);
 const hp=base.hp*(get('regionHp')??1)*(elite?get('eliteHp'):1)*(1+(level-1)*get('hpPerLevel'))*(tune.hp??1)*(final?get('bossHp'):mini?get('miniBossHp'):get('normalHp')??1);
 const attack=base.attack+(get('regionAttack')??0)+(elite?get('eliteAttack'):0)+Math.round((level-1)*get('attackPerLevel'))+(final?get('bossAttack'):mini?get('miniBossAttack'):0)+(tune.attack??0);
 const ramp=!boss&&BALANCE.entryRamp&&BALANCE.entryRamp[region]&&BALANCE.entryRamp[region][level]||{hp:1,attack:0};
 return{hp:Math.round(hp*ramp.hp),attack:boss?attack:Math.max(1,Math.round(attack*(get('normalAttack')??1))+ramp.attack)};
}
// Elaris expansion: world generation and combat share the adventure's existing state.
const EXPANSION_VERSION=3;
const CITY_ROOMS=JSON.parse(JSON.stringify(rooms));
// Round 30: Elaris's maze isn't a clean grid (unlike Vespera's), so
// validateImport() needs the real key list rather than a formula.
const ELARIS_ROOM_KEYS=['0,0','1,0','0,1','2,0','1,1','0,2','2,1','1,2','2,2','3,2','4,2','4,3','4,4','5,4','6,4','5,5','6,5','5,6','6,6','7,6','8,6','8,7','9,6','8,8','9,7','10,6','9,8','10,7','10,8','10,9'];
// Exits-only snapshot of the Round 30 Elaris maze, used purely for the
// BFS distance function below — Elaris's `rooms` object only exists once
// configureRegion('elaris') has been called, so this is captured as a
// standalone literal (same shape as CITY_ROOMS) rather than read live.
const ELARIS_ROOMS={'0,0':{exits:{s:'0,1',e:'1,0'}},'1,0':{exits:{s:'1,1',w:'0,0',e:'2,0'}},'0,1':{exits:{n:'0,0',s:'0,2',e:'1,1'}},'2,0':{exits:{s:'2,1',w:'1,0'}},'1,1':{exits:{n:'1,0',s:'1,2',w:'0,1',e:'2,1'}},'0,2':{exits:{n:'0,1',e:'1,2'}},'2,1':{exits:{n:'2,0',s:'2,2',w:'1,1'}},'1,2':{exits:{n:'1,1',w:'0,2',e:'2,2'}},'2,2':{exits:{n:'2,1',w:'1,2',e:'3,2'}},'3,2':{exits:{w:'2,2',e:'4,2'}},'4,2':{exits:{s:'4,3',w:'3,2'}},'4,3':{exits:{n:'4,2',s:'4,4'}},'4,4':{exits:{n:'4,3',e:'5,4'}},'5,4':{exits:{s:'5,5',w:'4,4',e:'6,4'}},'6,4':{exits:{s:'6,5',w:'5,4'}},'5,5':{exits:{n:'5,4',s:'5,6',e:'6,5'}},'6,5':{exits:{n:'6,4',s:'6,6',w:'5,5'}},'5,6':{exits:{n:'5,5',e:'6,6'}},'6,6':{exits:{n:'6,5',w:'5,6',e:'7,6'}},'7,6':{exits:{w:'6,6',e:'8,6'}},'8,6':{exits:{s:'8,7',w:'7,6',e:'9,6'}},'8,7':{exits:{n:'8,6',s:'8,8',e:'9,7'}},'9,6':{exits:{s:'9,7',w:'8,6',e:'10,6'}},'8,8':{exits:{n:'8,7',e:'9,8'}},'9,7':{exits:{n:'9,6',s:'9,8',w:'8,7',e:'10,7'}},'10,6':{exits:{s:'10,7',w:'9,6'}},'9,8':{exits:{n:'9,7',w:'8,8',e:'10,8'}},'10,7':{exits:{n:'10,6',s:'10,8',w:'9,7'}},'10,8':{exits:{n:'10,7',s:'10,9',w:'9,8'}},'10,9':{exits:{n:'10,8'}}};
// ---------------------------------------------------------------------
// VESPERA — world 3, rebuilt at the city's scale: 42 rooms, 8 zones
// (levels 19-26), two mini-bosses on side branches, and a final boss at
// the far end. Generated from a hand-designed maze graph (42 cells, 45
// links, 4 loops, every room reachable) — see CHANGES.md.
// ---------------------------------------------------------------------
const VESPERA_ROOM_DATA={
 '0,0':{name:"Stormglass Landing",exits:{s:"0,1",e:"1,0"},district:2,landmark:"ZONE 1",cityIndex:0},
 '1,0':{name:"Prism Coast",exits:{s:"1,1",w:"0,0"},district:2,landmark:"ZONE 1",cityIndex:1,zone:1,level:19},
 '0,1':{name:"Thunderfen",exits:{n:"0,0",s:"0,2",e:"1,1"},district:2,landmark:"ZONE 1",cityIndex:2,zone:1,level:19},
 '1,1':{name:"Resonant Spires",exits:{n:"1,0",e:"2,1",w:"0,1"},district:2,landmark:"ZONE 1",cityIndex:3,zone:1,level:19},
 '0,2':{name:"Prism Shore Shoals",exits:{n:"0,1",s:"0,3"},district:2,landmark:"ZONE 1",cityIndex:4,zone:1,level:19},
 '2,1':{name:"Prism Shore Causeway",exits:{e:"3,1",w:"1,1"},district:2,landmark:"ZONE 1",cityIndex:5,zone:1,level:19},
 '0,3':{name:"Prism Shore Reach",exits:{n:"0,2",e:"1,3"},district:2,landmark:"ZONE 1",cityIndex:6,zone:1,level:19},
 '3,1':{name:"Brinelight Shoals",exits:{s:"3,2",e:"4,1",w:"2,1"},district:2,landmark:"ZONE 2",cityIndex:7,zone:2,level:20},
 '1,3':{name:"Brinelight Causeway",exits:{e:"2,3",w:"0,3"},district:2,landmark:"ZONE 2",cityIndex:8,zone:2,level:20},
 '4,1':{name:"Brinelight Reach",exits:{e:"5,1",w:"3,1"},district:2,landmark:"ZONE 2",cityIndex:9,zone:2,level:20},
 '3,2':{name:"Brinelight Hollow",exits:{n:"3,1",s:"3,3"},district:2,landmark:"ZONE 2",cityIndex:10,zone:2,level:20},
 '2,3':{name:"Brinelight Flats",exits:{s:"2,4",e:"3,3",w:"1,3"},district:2,landmark:"ZONE 2",cityIndex:11,zone:2,level:20},
 '5,1':{name:"Galefen Shoals",exits:{s:"5,2",e:"6,1",w:"4,1"},district:0,landmark:"ZONE 3",cityIndex:12,zone:3,level:21},
 '3,3':{name:"Galefen Causeway",exits:{n:"3,2",e:"4,3",w:"2,3"},district:0,landmark:"ZONE 3",cityIndex:13,zone:3,level:21},
 '2,4':{name:"Galefen Reach",exits:{n:"2,3",s:"2,5"},district:0,landmark:"ZONE 3",cityIndex:14,zone:3,level:21},
 '6,1':{name:"Galefen Hollow",exits:{e:"7,1",w:"5,1"},district:0,landmark:"ZONE 3",cityIndex:15,zone:3,level:21},
 '5,2':{name:"Galefen Flats",exits:{n:"5,1",s:"5,3"},district:0,landmark:"ZONE 3",cityIndex:16,zone:3,level:21},
 '4,3':{name:"Prism Bazaar West",exits:{e:"5,3",w:"3,3"},district:0,landmark:"ZONE 3",cityIndex:17,zone:3,level:21},
 '2,5':{name:"Galefen Ridge",exits:{n:"2,4",w:"1,5"},district:0,landmark:"ZONE 3",cityIndex:18,zone:3,level:21},
 '7,1':{name:"Galefen Steps",exits:{e:"8,1",w:"6,1"},district:0,landmark:"ZONE 3",cityIndex:19,zone:3,level:21},
 '5,3':{name:"Prism Bazaar East",exits:{n:"5,2",e:"6,3",w:"4,3"},district:0,landmark:"ZONE 3",cityIndex:20,zone:3,level:21},
 '1,5':{name:"Shattered Vault",exits:{e:"2,5"},district:0,landmark:"ZONE 3",cityIndex:21,zone:3,level:21,enemy:["arcSentinel",400,250]},
 '8,1':{name:"Glasswind Shoals",exits:{s:"8,2",w:"7,1"},district:0,landmark:"ZONE 4",cityIndex:22,zone:4,level:22},
 '6,3':{name:"Glasswind Causeway",exits:{s:"6,4",w:"5,3"},district:0,landmark:"ZONE 4",cityIndex:23,zone:4,level:22},
 '8,2':{name:"Glasswind Reach",exits:{n:"8,1",s:"8,3"},district:0,landmark:"ZONE 4",cityIndex:24,zone:4,level:22},
 '6,4':{name:"Glasswind Hollow",exits:{n:"6,3",s:"6,5"},district:0,landmark:"ZONE 4",cityIndex:25,zone:4,level:22},
 '8,3':{name:"Stormforge Gate",exits:{n:"8,2",s:"8,4",e:"9,3"},district:1,landmark:"ZONE 5",cityIndex:26,zone:5,level:23},
 '6,5':{name:"Ion Marsh Shoals",exits:{n:"6,4"},district:1,landmark:"ZONE 5",cityIndex:27,zone:5,level:23},
 '9,3':{name:"Stormforge Works",exits:{s:"9,4",w:"8,3"},district:1,landmark:"ZONE 5",cityIndex:28,zone:5,level:23},
 '8,4':{name:"Stormforge Yard",exits:{n:"8,3",e:"9,4"},district:1,landmark:"ZONE 5",cityIndex:29,zone:5,level:23},
 '9,4':{name:"Stormforge Crucible",exits:{n:"9,3",e:"10,4",w:"8,4"},district:1,landmark:"ZONE 5",cityIndex:30,zone:5,level:23},
 '10,4':{name:"Resonant Shoals",exits:{n:"10,3",s:"10,5",w:"9,4"},district:1,landmark:"ZONE 6",cityIndex:31,zone:6,level:24},
 '10,3':{name:"Resonant Causeway",exits:{n:"10,2",s:"10,4"},district:1,landmark:"ZONE 6",cityIndex:32,zone:6,level:24},
 '10,5':{name:"Resonant Reach",exits:{n:"10,4",s:"10,6"},district:1,landmark:"ZONE 6",cityIndex:33,zone:6,level:24},
 '10,2':{name:"Tempest Shoals",exits:{s:"10,3",e:"11,2"},district:3,landmark:"ZONE 7",cityIndex:34,zone:7,level:25},
 '10,6':{name:"Tempest Causeway",exits:{n:"10,5",w:"9,6"},district:3,landmark:"ZONE 7",cityIndex:35,zone:7,level:25},
 '11,2':{name:"Resonance Chamber",exits:{w:"10,2"},district:3,landmark:"ZONE 7",cityIndex:36,zone:7,level:25,enemy:["resonantPhantom",400,250]},
 '9,6':{name:"Tempest Reach",exits:{e:"10,6",w:"8,6"},district:3,landmark:"ZONE 7",cityIndex:37,zone:7,level:25},
 '8,6':{name:"Tempest Hollow",exits:{e:"9,6",w:"7,6"},district:3,landmark:"ZONE 7",cityIndex:38,zone:7,level:25},
 '7,6':{name:"Stormeye Shoals",exits:{e:"8,6",w:"6,6"},district:3,landmark:"ZONE 8",cityIndex:39,zone:8,level:26},
 '6,6':{name:"Stormeye Causeway",exits:{s:"6,7",e:"7,6"},district:3,landmark:"ZONE 8",cityIndex:40,zone:8,level:26},
 '6,7':{name:"Eye of the Tempest",exits:{n:"6,6"},district:3,landmark:"ZONE 8",cityIndex:41,level:27,enemy:["stormTyrant",400,250]}
};
const VESPERA_ROOM_KEYS=Object.keys(VESPERA_ROOM_DATA);
// Storm-touched creatures. Each borrows an existing sprite (art) and is
// recolored with the Vespera tint so it reads as a distinct species.
const VESPERA_ENEMIES={
 vespFox:{name:'Static Fox',icon:'ϟ',hp:44,attack:9,element:'fire',art:'cinderFox'},
 vespThorn:{name:'Prism Thornling',icon:'✦',hp:46,attack:9,armor:1,element:'earth',art:'thornling'},
 vespMoth:{name:'Tempest Moth',icon:'≋',hp:48,attack:9,element:'air',art:'stormMoth'},
 vespHeron:{name:'Brinewing Heron',icon:'≈',hp:50,attack:10,element:'water',art:'drownedHeron'},
 vespShade:{name:'Ion Shade',icon:'☄',hp:52,attack:10,armor:2,element:'air',art:'shade'},
 vespStag:{name:'Rimeglass Stag',icon:'◆',hp:54,attack:10,armor:2,element:'earth',art:'blightAntler'},
 vespWisp:{name:'Arc Wisp',icon:'✧',hp:56,attack:10,armor:2,element:'water',art:'cryptWisp'},
 vespMauler:{name:'Thunder Mauler',icon:'♨',hp:58,attack:11,armor:2,element:'fire',art:'forgeBeast'},
 arcSentinel:{name:'The Arc Sentinel',icon:'⚡',hp:84,attack:11,armor:4,boss:true,miniBoss:true,element:'water',art:'vineguard'},
 resonantPhantom:{name:'The Resonant Phantom',icon:'☄',hp:80,attack:12,armor:3,boss:true,miniBoss:true,element:'air',art:'shade'},
 stormTyrant:{name:'The Tempest Colossus',icon:'🌩',hp:150,attack:11,armor:2,boss:true,element:'water',shift:['water','air'],shiftEvery:4,art:'bloomTyrant'}
};
Object.assign(enemies,VESPERA_ENEMIES);
const VESPERA_ZONE_ENEMY=['vespFox','vespThorn','vespMoth','vespHeron','vespShade','vespStag','vespWisp','vespMauler'];
const VESPERA_TINT='hue-rotate(205deg) saturate(1.3) brightness(1.08)';
const VESPERA_GROUND_FILTER='hue-rotate(205deg) saturate(.8) brightness(.8) contrast(1.06)';
// Borrowed-art enemies render their source sprite, recolored and renamed.
// Calls the *current* global monsterArt so later wrappers (e.g. the Bloom
// Tyrant's sprite in encounter-depth.js) still apply to the source art.
const vesperaPreviousArt=monsterArt;
monsterArt=function(id){
 const e=enemies[id];if(!e||!e.art)return vesperaPreviousArt(id);
 let html=monsterArt(e.art).replace(/(alt|aria-label)="[^"]*"/,'$1="'+e.name+'"');
 if(html.startsWith('<img'))return html.replace('<img','<img style="filter:'+VESPERA_TINT+' drop-shadow(0 12px 7px #000b)"');
 return html.includes('style="')?html.replace('style="','style="filter:'+VESPERA_TINT+';'):html.replace(/^<(\w+)/,'<$1 style="filter:'+VESPERA_TINT+'"');
};
const vesperaStyle=document.createElement('style');
vesperaStyle.textContent=`
#world[data-environment="vespera"]:before{content:'';position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(180deg,#1d2b6a33,#3a1d6a26),repeating-linear-gradient(105deg,transparent 0 13px,#b9d8ff14 13px 14px);background-size:auto,60px 120px;animation:vesperaRain .7s linear infinite}
#world[data-environment="vespera"]:after{content:'';position:absolute;inset:0;z-index:4;pointer-events:none;background:#d9ecff;opacity:0;animation:vesperaFlash 11s infinite}
#world[data-environment="vespera"] .joined-scenery{filter:saturate(.85) brightness(.9)}
#world[data-environment="vespera"] .wildlife{color:#bfe3ff;text-shadow:0 0 8px #7fc4ff}
@keyframes vesperaRain{to{background-position:0 0,-30px 120px}}
@keyframes vesperaFlash{0%,93%,100%{opacity:0}94%{opacity:.18}95%{opacity:0}96.5%{opacity:.1}}
@media (prefers-reduced-motion:reduce){#world[data-environment="vespera"]:before,#world[data-environment="vespera"]:after{animation:none}}`;
document.head.append(vesperaStyle);
function vesperaTierTypes(key){const z=rooms[key]&&rooms[key].zone;return z?[VESPERA_ZONE_ENEMY[z-1]]:['vespFox']}
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
// Aetherlink socket unlock levels, spread every 12 levels across the level-60 cap.
const AETHERLINK_SOCKET_LEVELS=[1,12,24,36,48];
function deviceSlots(){return AETHERLINK_SOCKET_LEVELS.filter(l=>state.playerLevel>=l).length}
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
  return '<section class="panel crystal-socket"><h3>Socket '+(i+1)+'</h3>'+(locked?'<div class="empty-crystal">◇</div><p>Unlocks at level '+AETHERLINK_SOCKET_LEVELS[i]+'</p>':(crystal?crystalArt(crystal)+'<b class="rarity-text rarity-'+crystalRarity(crystal)+'">'+crystalLabel(crystal)+'</b><p>'+CRYSTALS[crystal.type].text+'</p>':'<div class="empty-crystal">◇</div><p>Empty socket</p>')+'<label>Slot crystal<select aria-label="Crystal for socket '+(i+1)+'" data-socket="'+i+'"><option value="">Empty</option>'+state.device.crystals.map(c=>'<option value="'+c.uid+'" '+(crystal?.uid===c.uid?'selected':'')+'>'+crystalLabel(c)+' · '+c.uid+'</option>').join('')+'</select></label>')+'</section>';
 }).join('');
 const collection=state.device.crystals.map(c=>'<article class="crystal-item rarity-'+crystalRarity(c)+'">'+crystalArt(c)+'<div><b>'+crystalLabel(c)+'</b><p>'+CRYSTALS[c.type].text+'</p><small>'+c.uid+(state.device.slots.includes(c.uid)?' · Slotted':' · Available')+'</small></div></article>').join('');
 openMenu('<div class="eyebrow">WRIST DEVICE · AETHERLINK</div><h1>Aetherlink Gauntlet</h1><p>'+deviceSlots()+'/5 sockets · +'+deviceBonus('capacity')+' deck size · +'+deviceBonus('assault')+' damage · +'+deviceBonus('aegis')+' Block</p><p class="notice">Opening shield: '+crystalOpeningBlock()+' Block · highest slotted rarity only</p><div class="crystal-sockets">'+sockets+'</div><h2>Crystal collection</h2><div class="crystal-collection">'+(collection||'<p>Defeat elite monsters for a chance to find a crystal.</p>')+'</div><p class="muted">Elite drops: 8% chance. Of crystals found: 80% Uncommon, 17% Rare, 3% Epic. Every crystal gives its listed +1 upgrade. Rare adds 1 opening Block; Epic adds 2. Rarity shields do not stack. Crystal damage and defense bonuses each cap at +3. Capacity adds +1 per socket.</p><p class="muted">Crystals can be moved between encounters. Removing Capacity may require removing cards from your deck.</p><button id="deviceClose">Return</button>');
 document.querySelectorAll('[data-socket]').forEach(s=>s.onchange=()=>installCrystal(Number(s.dataset.socket),s.value));$('deviceClose').onclick=closeMenu;
}


TALENT_BRANCHES.surge.nodes.push(
 {id:'critical',name:'Precision Strike',icon:'✧',max:5,tier:1,req:['powerCore',1],desc:'+3% critical chance per rank. Critical attacks deal double damage.'},
 {id:'doublePower',name:'Overdrive Pulse',icon:'⚡',max:1,tier:3,req:['overcharge',1],desc:'Once per encounter: double the next attack card\'s damage.'});
TALENT_BRANCHES.resolve.nodes.push({id:'echo',name:'Echo Protocol',icon:'⟳',max:1,tier:3,req:['recovery',3],desc:'Once per encounter: play the next card twice for one energy payment.'});
// Final capstone of the Resolve tree — requires Echo Protocol itself
// (not just points spent), so it's a genuine "end of the line" talent.
TALENT_BRANCHES.resolve.nodes.push({id:'cloneCore',name:'Mirror Array',icon:'⧉',max:1,tier:4,req:['echo',1],desc:'Once per encounter: clone a card in your hand. The copy shuffles into your draw pile and lasts for the rest of the encounter only.'});
function addCard(id,name,cost,kind,icon,base){defs[id]={name,cost,kind,icon,...(base.soulbound?{soulbound:true}:{}),tiers:[0,1,2,3].map(level=>({...base,...(base.damage?{damage:base.damage+level*2}:{}),...(base.block?{block:base.block+level*2}:{})}))}}
addCard('glacial','Glacial Covenant',1,'Soulbound Ice','❄',{damage:4,freeze:1,element:'ice',soulbound:true,exhaust:true});
addCard('cinder','Cinder Lance',1,'Fire Attack','♨',{damage:5,burn:2,element:'fire'});
addCard('venom','Venom Bloom',1,'Poison Attack','☠',{damage:3,poison:2,element:'earth'});
addCard('gale','Gale Cut',1,'Air Attack','≋',{damage:5,draw:1,element:'air'});
addCard('counter','Prismatic Counter',1,'Elemental Counter','◈',{block:3,counter:true,exhaust:true});
for(const element of ELEMENTS)addCard('counter_'+element,element[0].toUpperCase()+element.slice(1)+' Reversal',1,'Elemental Counter',ELEMENT_ICONS[element],{block:3,counter:element,exhaust:true});
// Round 38: every mini-boss drops its own unique card on defeat — Soulbound
// (protected forever) 25% of the time, otherwise the same card as an
// Impermanent copy. The card's definition is neither; each copy's
// `soulbound` flag decides.
const MINI_BOSS_SOULBOUND_CHANCE=.25;
const MINI_BOSS_CARDS={moonKnight:'lunarEdict',crownSentinel:'neonCovenant',tidewardenElaris:'tidebound',galeSovereign:'sovereignGale',arcSentinel:'arcBulwark',resonantPhantom:'phantomResonance'};
addCard('lunarEdict','Lunar Edict',1,'Unique Attack','☾',{damage:6,block:4,element:'water'});
addCard('tidebound','Tidebound Aegis',1,'Unique Defense','≈',{block:8,heal:3,element:'water'});
addCard('sovereignGale','Sovereign Gale',1,'Unique Attack','≋',{damage:7,draw:1,pierce:true,element:'air'});
addCard('arcBulwark','Arc Bulwark',2,'Unique Defense','ϟ',{block:12,shock:true,element:'lightning'});
addCard('phantomResonance','Phantom Resonance',2,'Unique Attack','☄',{damage:14,draw:1,element:'air'});
defs.tidebound.tiers.forEach((t,level)=>t.heal=3+level);
defs.neonCovenant.kind='Unique Skill';delete defs.neonCovenant.soulbound;
for(const [boss,id] of Object.entries(MINI_BOSS_CARDS))defs[id].unique=boss;
function dropMiniBossCard(b,roll=Math.random()){
 const id=MINI_BOSS_CARDS[b.id];if(!id)return null;
 state.miniDrops=Array.isArray(state.miniDrops)?state.miniDrops:[];
 if(state.miniDrops.includes(b.id))return null;
 state.miniDrops.push(b.id);if(b.id==='crownSentinel')state.neonGift=true;
 const soul=roll<MINI_BOSS_SOULBOUND_CHANCE,card=make(id,0,soul);state.pool.push(card);b.uniqueDrop=card.uid;
 b.special.push(soul?'◆ SOULBOUND unique drop: '+stat(card).name+'! It can never be lost. Find it in the Deck Workshop.':'◇ Unique drop: '+stat(card).name+' (Impermanent). Mini-boss cards are Soulbound 25% of the time. Find it in the Deck Workshop.');
 return card;
}
const originalRules=rules;
rules=function(c){const d=stat(c);return originalRules(c)+(d.freeze?' Freeze: enemy skips its next attack.':'')+(d.burn?' Burn: 2 damage for 2 turns.':'')+(d.poison?' Poison: +2 stacking damage each turn.':'')+(d.counter===true?' Counter a charged elemental strike and deal 6 damage. Reserve this card for free between turns.':d.counter?' Arm '+d.counter+' to counter '+Object.keys(COUNTERS).find(e=>COUNTERS[e]===d.counter)+'.':'')};
syncTalentVitals=function(heal=false){const old=state.maxHp,next=30+state.playerLevel-1+talentRank('vitality')*2;state.maxHp=next;state.hp=Math.min(next,state.hp+(heal?Math.max(0,next-old):0))};
gainXP=function(n){const gained=[];if(state.playerLevel>=MAX_PLAYER_LEVEL){state.xp=0;return gained}state.xp+=n;while(state.xp>=100&&state.playerLevel<MAX_PLAYER_LEVEL){state.xp-=100;state.playerLevel++;gained.push(state.playerLevel);syncTalentVitals(false);state.hp=Math.min(state.maxHp,state.hp+5)}if(state.playerLevel>=MAX_PLAYER_LEVEL)state.xp=0;return gained};

function configureRegion(region){activeRegion=region;for(const key of Object.keys(rooms))delete rooms[key];if(region==='city'){Object.assign(rooms,JSON.parse(JSON.stringify(CITY_ROOMS)))}else if(region==='vespera'){Object.assign(rooms,JSON.parse(JSON.stringify(VESPERA_ROOM_DATA)))}else{
 // Round 30: a fresh hand-designed maze (30 rooms), same concept as
 // City's Round 29 rebuild but a different shape (verified via BFS before
 // writing: 30 cells, 39 edges -- 10 more than a tree needs, confirming
 // real loops; zero unreachable cells). Elaris has only 4 wildlife types
 // (vs city's 8), so each spans 2 of the 8 zone levels. Levels continue
 // from where city left off (9-18, not restarting at 1). bloomTyrant's
 // room key changed from '3,2' to '10,9' -- every hardcoded reference
 // (roomSpawns' isBossRoom/regionBoss checks, portalTarget() both
 // directions) was updated alongside this room block.
 const elarisRooms={
 '0,0':{name:'Dawnroot Landing',exits:{s:'0,1',e:'1,0'},district:0,landmark:'FOREST',cityIndex:0},
 '1,0':{name:'Scorched Thicket',exits:{s:'1,1',w:'0,0',e:'2,0'},district:0,landmark:'FOREST',cityIndex:1,zone:1,level:10},
 '0,1':{name:'Ashen Hollow',exits:{n:'0,0',s:'0,2',e:'1,1'},district:0,landmark:'FOREST',cityIndex:2,zone:1,level:10},
 '2,0':{name:'Smoldering Grove',exits:{s:'2,1',w:'1,0'},district:0,landmark:'FOREST',cityIndex:3,zone:1,level:10},
 '1,1':{name:'Scorched Marsh',exits:{n:'1,0',s:'1,2',w:'0,1',e:'2,1'},district:0,landmark:'FOREST',cityIndex:4,zone:1,level:10},
 '0,2':{name:'Ashen Shallows',exits:{n:'0,1',e:'1,2'},district:0,landmark:'FOREST',cityIndex:5,zone:1,level:10,enemy:['tidewardenElaris',400,250]},
 '2,1':{name:'Embercoal Thicket',exits:{n:'2,0',s:'2,2',w:'1,1'},district:1,landmark:'RAINFOREST',cityIndex:6,zone:2,level:11},
 '1,2':{name:'Cinderroot Hollow',exits:{n:'1,1',w:'0,2',e:'2,2'},district:1,landmark:'RAINFOREST',cityIndex:7,zone:2,level:11},
 '2,2':{name:'Charred Grove',exits:{n:'2,1',w:'1,2',e:'3,2'},district:1,landmark:'RAINFOREST',cityIndex:8,zone:2,level:11},
 '3,2':{name:'Sunken Thicket',exits:{w:'2,2',e:'4,2'},district:2,landmark:'RIVERLAND',cityIndex:9,zone:3,level:12},
 '4,2':{name:'Silt Hollow',exits:{s:'4,3',w:'3,2'},district:2,landmark:'RIVERLAND',cityIndex:10,zone:3,level:12},
 '4,3':{name:'Brackish Grove',exits:{n:'4,2',s:'4,4'},district:2,landmark:'RIVERLAND',cityIndex:11,zone:3,level:12},
 '4,4':{name:'Drowned Thicket',exits:{n:'4,3',e:'5,4'},district:3,landmark:'PLAINS',cityIndex:12,zone:4,level:13},
 '5,4':{name:'Reedy Hollow',exits:{s:'5,5',w:'4,4',e:'6,4'},district:3,landmark:'PLAINS',cityIndex:13,zone:4,level:13},
 '6,4':{name:'Stormlit Thicket',exits:{s:'6,5',w:'5,4'},district:0,landmark:'FOREST',cityIndex:14,zone:5,level:14},
 '5,5':{name:'Galeward Hollow',exits:{n:'5,4',s:'5,6',e:'6,5'},district:0,landmark:'FOREST',cityIndex:15,zone:5,level:14},
 '6,5':{name:'Windswept Grove',exits:{n:'6,4',s:'6,6',w:'5,5'},district:0,landmark:'FOREST',cityIndex:16,zone:5,level:14},
 '5,6':{name:'Stormlit Marsh',exits:{n:'5,5',e:'6,6'},district:0,landmark:'FOREST',cityIndex:17,zone:5,level:14},
 '6,6':{name:'Galeward Shallows',exits:{n:'6,5',w:'5,6',e:'7,6'},district:0,landmark:'FOREST',cityIndex:18,zone:5,level:14},
 '7,6':{name:'Mistbound Thicket',exits:{w:'6,6',e:'8,6'},district:1,landmark:'RAINFOREST',cityIndex:19,zone:6,level:15},
 '8,6':{name:'Cloudrise Hollow',exits:{s:'8,7',w:'7,6',e:'9,6'},district:1,landmark:'RAINFOREST',cityIndex:20,zone:6,level:15},
 '8,7':{name:'Blighted Thicket',exits:{n:'8,6',s:'8,8',e:'9,7'},district:2,landmark:'RIVERLAND',cityIndex:21,zone:7,level:16},
 '9,6':{name:'Rotroot Hollow',exits:{s:'9,7',w:'8,6',e:'10,6'},district:2,landmark:'RIVERLAND',cityIndex:22,zone:7,level:16},
 '8,8':{name:'Witherbark Grove',exits:{n:'8,7',e:'9,8'},district:2,landmark:'RIVERLAND',cityIndex:23,zone:7,level:16},
 '9,7':{name:'Blighted Marsh',exits:{n:'9,6',s:'9,8',w:'8,7',e:'10,7'},district:2,landmark:'RIVERLAND',cityIndex:24,zone:7,level:16},
 '10,6':{name:'Rotroot Shallows',exits:{s:'10,7',w:'9,6'},district:2,landmark:'RIVERLAND',cityIndex:25,zone:7,level:16,enemy:['galeSovereign',400,250]},
 '9,8':{name:'Witherbark Rise',exits:{n:'9,7',w:'8,8',e:'10,8'},district:2,landmark:'RIVERLAND',cityIndex:26,zone:7,level:16},
 '10,7':{name:'Blighted Ridge',exits:{n:'10,6',s:'10,8',w:'9,7'},district:2,landmark:'RIVERLAND',cityIndex:27,zone:7,level:16},
 '10,8':{name:'Hollowed Thicket',exits:{n:'10,7',s:'10,9',w:'9,8'},district:3,landmark:'PLAINS',cityIndex:28,zone:8,level:17},
 '10,9':{name:'Ashfen Hollow',exits:{n:'10,8'},district:3,landmark:'PLAINS',cityIndex:29,level:18,enemy:['bloomTyrant',400,250]}
};
 Object.assign(rooms,elarisRooms);
}spawnCatalog={};patrolCatalog={}}
// Restore the original fixed street layout and collision boundaries.
// Elaris keeps its new scenery, using the same fixed room footprint.
function walkable(key,x,y,margin=0){
 if(x<0||x>800||y<0||y>500||NeonCity.blocked(key,x,y))return false;
 const padding=Math.max(0,margin-8);
 return !padding||[[padding,0],[-padding,0],[0,padding],[0,-padding]].every(([dx,dy])=>!NeonCity.blocked(key,x+dx,y+dy));
}
NeonCity.render=function(world,key,r){
 if(activeRegion==='city')return originalRoomRender(world,key,r,rooms,hasRelic);
 world.innerHTML='';world.dataset.environment=activeRegion;
 const canvas=document.createElement('canvas');canvas.className='city-ground';canvas.width=800;canvas.height=500;world.append(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#31553d';ctx.fillRect(0,0,800,500);
 if(natureTexture.complete&&natureTexture.naturalWidth){const v=r.district;ctx.drawImage(natureTexture,(v%2)*natureTexture.width/2,Math.floor(v/2)*natureTexture.height/2,natureTexture.width/2,natureTexture.height/2,0,0,800,500)}
 if(activeRegion==='vespera')canvas.style.filter=VESPERA_GROUND_FILTER;
 const title=document.createElement('div');title.className='city-landmark';title.textContent=(activeRegion==='vespera'?'VESPERA · ':'ELARIS · ')+r.name;world.append(title);
 for(const [dir,raw]of Object.entries(r.exits)){const to=typeof raw==='string'?raw:raw.to,node=document.createElement('div');node.className='city-exit '+dir;node.textContent=rooms[to].name;world.append(node)}
 for(let i=0;i<4;i++){const wildlife=document.createElement('span');wildlife.className='wildlife';wildlife.textContent=activeRegion==='vespera'?(i%2?'ϟ':'✦'):(i%2?'🦋':'✧');wildlife.style.left=(160+i*135)+'px';wildlife.style.top=(140+(i%2)*190)+'px';wildlife.style.animationDelay=(-i*2)+'s';world.append(wildlife)}
};
natureTexture.onload=()=>{if(state&&activeRegion!=='city'&&!state.battle)renderWorld()};

// Enemy strength ramps with distance from the start room, so exploring
// outward naturally leads from easy patrols toward the hardest non-boss
// types near the map's edges, closest to the boss rooms.
// Round 30: generalized from a city-only BFS into a real BFS for any
// region with a frozen room snapshot (city, now Elaris too). Elaris used
// to get a cheap Manhattan (x+y) distance approximation, which is exact
// on a plain rectangular grid but became flatly wrong once Elaris became
// a real maze with loops and branches (confirmed directly: the old
// shortcut gave near/far samples that weren't meaningfully different —
// 143.7 vs 160.7 average HP — because x+y doesn't track actual
// exploration depth once the path winds and loops). regionMaxDistance was
// also hardcoded to 5 for Elaris this whole time, never made dynamic like
// city's; both are now computed from the real graph. Vespera is still a
// plain 2x2 grid, so Manhattan distance stays exact there — no BFS
// needed.
const regionDistanceCache={};
function regionRoomDistances(region){
 if(regionDistanceCache[region])return regionDistanceCache[region];
 const source=region==='city'?CITY_ROOMS:region==='elaris'?ELARIS_ROOMS:region==='vespera'?VESPERA_ROOM_DATA:null;
 if(!source)return{};
 const startKey=region==='city'?'0,5':'0,0',dist={[startKey]:0},queue=[startKey];
 while(queue.length){
  const cur=queue.shift(),r=source[cur];
  for(const raw of Object.values(r.exits)){
   const to=typeof raw==='string'?raw:raw.to;
   if(!(to in dist)){dist[to]=dist[cur]+1;queue.push(to)}
  }
 }
 return regionDistanceCache[region]=dist;
}
function regionMaxDistance(region){return Math.max(...Object.values(regionRoomDistances(region)))}
function regionDistance(key,region=activeRegion){
 return regionRoomDistances(region)[key]||0;
}
function regionDistanceFrac(key,region=activeRegion){return Math.min(1,regionDistance(key,region)/regionMaxDistance(region))}
// Round 28: city rooms now carry an explicit zone (1-8), each with
// exactly one enemy type — real "waves of one enemy before the next",
// not a cumulative pool where 3-4 types could all show up at once. The
// zone number doubles as that area's enemy level.
const CITY_ZONE_ENEMY=['emberling','thornling','vineguard','burrower','shade','cryptWisp','forgeBeast','crownEye'];
function cityTierTypes(key){const z=rooms[key]&&rooms[key].zone;return z?[CITY_ZONE_ENEMY[z-1]]:['emberling']}
// enemyLevel() is the single source of truth for the number shown next to
// an enemy's name in battle, and (via startBattle()) for how much their
// HP/attack scale beyond their species' own base stats. City rooms carry
// an explicit level field; Elaris/Vespera (which don't have per-species
// zones) still derive it from distance, same spirit as the old
// distance-fraction scaling but expressed as a real level number now.
function enemyLevel(key){
 const r=rooms[key];
 if(r&&typeof r.level==='number')return r.level;
 return Math.max(1,(BALANCE.regionLevelBase[activeRegion]??1)+Math.round(regionDistanceFrac(key)*7));
}
// Color-codes how an enemy's level compares to the player's own — green
// means you're ready, amber means it'll be close, red means go level up
// first. This is the actual visual answer to "do I need to grind more
// before this fight."
function levelColor(enemyLv){const diff=enemyLv-state.playerLevel;return diff<=0?'#5ecb50':diff<=2?'#e0c34f':'#e0524f'}
function roomSpawns(key){
 const cache=activeRegion+':'+key;if(spawnCatalog[cache])return spawnCatalog[cache];
 const rand=seeded(hashSeed(state.seed+cache+'enemies')),r=rooms[key],safe=activeRegion==='city'?key==='0,5':key==='0,0';
 // A mini-boss or main-boss room is exclusively theirs — no extra random
 // patrols sharing the space, regardless of what the distance-based
 // density formula would otherwise put there.
 const isBossRoom=(r.enemy&&enemies[r.enemy[0]]&&enemies[r.enemy[0]].boss)||(activeRegion==='elaris'&&key==='10,9');
 const count=safe?0:isBossRoom?1:(typeof areaPatrolCount==='function'?areaPatrolCount(key):2),list=[];
 // Every room has 4 fixed static building blocks at its corners (see
 // solids() in neon-city.js), leaving only a narrow cross-shaped walkable
 // area — which sharply limits how far spawn "home" sectors can actually
 // move away from the room's entry points (35,250)/(765,250)/(400,35)/
 // (400,465)). (270,245) and (610,245) are the safest pair the geometry
 // allows (117px and 37px clear of the ~118px worst-case patrol-wander +
 // encounter-trigger danger zone) and are used first for the common
 // 1-2-patrol case. The rare 3-patrol (farthest-tier) rooms can't fit 3
 // mutually-230px-separated points AND stay clear of entries at the same
 // time — (610,245)+(400,130)+(400,385) is the only triple the cross shape
 // actually supports, verified against every room in both regions, so it's
 // used specifically (and only) when a third patrol is actually needed.
 const candidates=count>=3?[[610,245],[400,130],[400,385],[270,245],[400,250],[350,245],[450,245],[330,180],[330,320]]:[[270,245],[610,245],[350,245],[450,245],[400,250],[400,130],[400,385]];
 for(let i=0;i<count;i++){
  // Mini-bosses now live in ELARIS_WILDLIFE (so they can reuse a species'
  // sprite sheet), but must never be drawn as an ordinary random patrol —
  // only ever appear via their own designated room slot (r.enemy above).
  const types=activeRegion==='city'?cityTierTypes(key):activeRegion==='vespera'?vesperaTierTypes(key):Object.keys(ELARIS_WILDLIFE).filter(id=>!ELARIS_WILDLIFE[id].boss);
  // The region's own main boss (currently only bloomTyrant at Elaris 3,2)
  // keeps its special story-tied slot. Room-designated bosses (r.enemy,
  // e.g. mini-bosses) used to only work in the city — generalized so any
  // region's rooms can place one, which is how the Round 22 Elaris/Vespera
  // mini-bosses get placed without needing bespoke per-region logic.
  const regionBoss=activeRegion==='elaris'&&key==='10,9'&&i===0,roomBoss=i===0&&r.enemy&&enemies[r.enemy[0]]&&enemies[r.enemy[0]].boss,boss=regionBoss||roomBoss,type=regionBoss?'bloomTyrant':boss?r.enemy[0]:types[Math.floor(rand()*types.length)];
  let spot=candidates.find(([x,y])=>walkable(key,x,y,28)&&list.every(s=>Math.hypot(s.x-x,s.y-y)>230));
  if(!spot)throw Error('No clear patrol sector in '+key);
  // Element now comes straight from the enemy's own definition rather than
  // being unconditionally nulled out for city specifically — that hardcode
  // predated any city enemy ever having an element, but the Round 22
  // mini-bosses (crownSentinel, and moonKnight now) do, and need it to
  // actually reach their battle state for their signature elemental attack
  // pattern to trigger. Regular city enemies still have no `element` field
  // in their own definition, so this is a no-op for them (still null).
  const [x,y]=spot,eliteChance=.04+regionDistanceFrac(key)*.32,elite=!boss&&rand()<eliteChance,element=enemies[type].element||null;
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
// (400,145) sat right on the main north-south thoroughfare (x=400 is the
// straight line between the north and south entries) — a hidden chest
// should reward deliberately stepping off the main path to find it, not
// sit in the way of it like a patrol. (330,180) is off both the N-S and
// E-W through-lines, and verified walkable in every room of both regions.
// Round 26: relocated off the rooms removed in the city's linear rebuild.
// The 2 crystal chests now sit in the mini-boss branches specifically,
// rewarding taking the detour beyond just the boss's own guaranteed drop.
// Scarce and genuinely off the mandatory path: the previous 4 potion
// chests in city sat on the required spine (you'd pass them no matter
// what), which isn't "off the path" at all. Now every chest in both
// regions lives specifically in a mini-boss branch room — optional,
// found only by actually taking the detour, same reward logic as the
// mini-boss itself rather than scattered along the route you can't avoid.
function chestFor(key){const designated=activeRegion==='city'?{'2,9':'crystal','4,0':'crystal'}:activeRegion==='elaris'?{'0,2':'potion','10,6':'potion'}:activeRegion==='vespera'?{'1,5':'crystal','11,2':'crystal'}:null;if(!designated||!designated[key])return null;return{id:activeRegion+':'+key,x:330,y:180,reward:designated[key]}}
renderWorld=function(){if(!state)return;const r=room(),world=$('world');if(collides(state.pos.x,state.pos.y))state.pos={x:400,y:280};NeonCity.render(world,state.room,r);for(const s of roomSpawns(state.room)){if(!spawnAvailable(s))continue;const p=patrolFor(s),node=document.createElement('div');node.className='enemy-node monster-'+s.type+(s.boss?' boss':'')+(s.elite?' elite':'');node.dataset.spawn=s.uid;node.dataset.name=(s.elite?'★ ELITE · ':'')+(s.element?ELEMENT_ICONS[s.element]+' ':'')+enemies[s.type].name+' · Lv.'+enemyLevel(state.room);node.innerHTML=monsterArt(s.type);node.style.left=p.x+'px';node.style.top=p.y+'px';world.append(node)}if(r.relic&&relicAvailable(r.relic[0])){const q=r.relic,node=document.createElement('div');node.className='relic';node.textContent=q[2];node.dataset.name=q[1];node.style.left=q[3]+'px';node.style.top=q[4]+'px';world.append(node)}const chest=chestFor(state.room);if(chest&&!state.chests.includes(chest.id)){const node=document.createElement('div');node.className='map-chest';node.title=chest.reward==='crystal'?'Hidden loot chest — Upgrade Crystal':'Hidden loot chest';node.style.left=chest.x+'px';node.style.top=chest.y+'px';world.append(node)}if(portalTarget()){const portal=document.createElement('button');portal.className='region-portal';portal.innerHTML='<img class="portal-art" src="assets/environment/elaris-portal.png" alt=""><small>'+portalTarget().label+'</small>';portal.onclick=travelPortal;world.append(portal)}const player=document.createElement('div');player.id='player';player.style.left=state.pos.x+'px';player.style.top=state.pos.y+'px';player.innerHTML='<span class="hero-sprite"></span>';world.append(player);animateHero(0,false);renderHUD()};
animateEnemy=function(dt){if(!state||state.battle||!$('menuOverlay').classList.contains('hidden'))return;for(const s of roomSpawns(state.room)){if(!spawnAvailable(s))continue;const p=patrolFor(s),speed=s.boss?8:14;p.turn-=dt;if(p.turn<0){p.angle+=.8;p.turn=3}const nx=p.x+Math.cos(p.angle)*speed*dt,ny=p.y+Math.sin(p.angle)*speed*dt;if(walkable(state.room,nx,ny,26)&&Math.hypot(nx-s.x,ny-s.y)<75){p.x=nx;p.y=ny}else p.angle+=1.8;const node=document.querySelector('[data-spawn="'+s.uid+'"]');if(node){node.style.left=p.x+'px';node.style.top=p.y+'px';node.querySelector('.monster-sprite')?.style.setProperty('--enemy-facing',Math.cos(p.angle)<0?-1:1)}if(Math.hypot(state.pos.x-p.x,state.pos.y-p.y)<(s.boss?58:43)){startBattle(s.uid);if(state.battle)return}}};
checkWorldInteractions=function(){if(state.battle)return;const q=room().relic;if(q&&relicAvailable(q[0])&&Math.hypot(state.pos.x-q[3],state.pos.y-q[4])<48)collectRelic(q);const chest=chestFor(state.room);if(chest&&!state.chests.includes(chest.id)&&Math.hypot(state.pos.x-chest.x,state.pos.y-chest.y)<38){
 // An Upgrade Crystal chest sits in the same room as a mini-boss and now
 // requires actually defeating that boss first — you can walk straight
 // up to it, but it won't open while the room's enemy is still alive.
 // Potion chests (Elaris's branches) are unaffected; this is specifically
 // about crystal rewards, which sit next to a boss by design.
 const r=room();
 if(chest.reward==='crystal'&&r.enemy&&enemies[r.enemy[0]]&&enemies[r.enemy[0]].boss&&!state.bosses.includes(r.enemy[0])){
  toast('Defeat '+enemies[r.enemy[0]].name+' first to claim this chest.');
  return;
 }
 state.chests.push(chest.id);if(chest.reward==='crystal'){setMaterials(materials()+1);toast('Hidden loot chest: an Upgrade Crystal!')}else{state.potions+=1;toast('Hidden loot chest: a small healing potion!')}save();renderWorld()}};
function portalTarget(){
 if(activeRegion==='city'&&state.room==='10,6'&&state.bosses.includes('thornWarden'))return{region:'elaris',room:'0,0',label:'Enter Elaris'};
 if(activeRegion==='elaris'&&state.room==='0,0')return{region:'city',room:'10,6',label:'Return to city'};
 if(activeRegion==='elaris'&&state.room==='10,9'&&state.bosses.includes('bloomTyrant'))return{region:'vespera',room:'0,0',label:'Enter Vespera'};
 if(activeRegion==='vespera'&&state.room==='0,0')return{region:'elaris',room:'10,9',label:'Return to Elaris'};
 return null;
}
function travelPortal(){
 if(state.battle)return;const target=portalTarget();if(!target)return;
 state.region=target.region;configureRegion(target.region);state.room=target.room;state.pos={x:400,y:300};state.visited=state.regionVisits[target.region]||[target.room];state.regionVisits[target.region]=state.visited;
 if(target.region==='elaris'&&!state.elarisGift){state.elarisGift=true;state.pool.push(make('counter'));toast('Elaris attunement: +4 deck capacity and a Prismatic Counter. Open Deck to equip it.')}
 if(target.region==='vespera')toast('Vespera · Stormglass Reach. Your expanded deck capacity carries forward.');
 save();renderWorld();
}


startBattle=function(spawnId){const issue=deckIssue();if(issue)return toast(issue+' Open Deck to adjust.');if(!active().length)return toast('Equip a card before fighting.');const spawn=roomSpawns(state.room).find(s=>s.uid===spawnId);if(!spawn||!spawnAvailable(spawn))return;const base=enemies[spawn.type],level=enemyLevel(state.room),stats=enemyStats(spawn.type,{level,elite:spawn.elite,boss:spawn.boss}),health=stats.hp,attackBonus=stats.attack-base.attack;keys={};state.fight++;state.battle={id:spawn.type,spawnId:spawn.uid,enemy:{...base,boss:spawn.boss,elite:spawn.elite,element:spawn.element,level,name:(spawn.elite?'Elite ':'')+base.name,hp:health,maxHp:health,attack:base.attack+attackBonus},turn:1,energy:maxEnergy(),block:crystalOpeningBlock(),draw:shuffle(active().map(c=>({...c}))),hand:[],discard:[],exhaust:[],savedUid:null,boostedUid:null,boostedUids:[],boostUses:0,debuffUsed:false,enemyDebuff:0,phase:'fight',logs:['Encounter: '+base.name],freeze:0,burn:0,burnTurns:0,poison:0,counter:null,doubleUsed:false,doubleArmed:false,echoUsed:false,echoArmed:false,overloadUsed:false,overloadArmed:false,cloneUsed:false};drawCards(openingHand());$('battleOverlay').classList.remove('hidden');save();renderBattle()};
function boostedCardUids(b){return Array.isArray(b.boostedUids)?b.boostedUids:(b.boostedUid==null?[]:[b.boostedUid])}
// Talent hooks: talent-matrix.js defines `talentMatrix`; with it absent (or
// no talents learned) every hook is neutral and this behaves exactly as before.
function cardEffect(c,empowered,doubleAttack){
 const b=state.battle,d=stat(c),boost=empowered?boostAmount():0,tm=typeof talentMatrix==='object'?talentMatrix:null;
 let damage=d.damage?d.damage+attackBonus()+deviceBonus('assault')+boost+(tm?tm.flatDamage(c,d,b):0):0;
 if(damage&&doubleAttack)damage*=2;
 if(damage&&Math.random()<talentRank('critical')*.03+talentRank('lethal')*.04){damage=Math.round(damage*(tm?tm.critMultiplier():2));b.logs.push('Critical strike!');if(tm)tm.onCrit(b)}
 if(damage&&b.enemy.element&&COUNTERS[b.enemy.element]===(d.element==='ice'?'water':d.element)){const mult=tm?tm.weaknessMultiplier():1.5;damage=Math.round(damage*mult);b.logs.push('Elemental weakness: +'+Math.round((mult-1)*100)+'% damage.')}
 if(damage&&tm)damage=tm.finalDamage(damage,b);
 const armor=Math.max(0,(b.enemy.armor||0)-(tm?tm.armorIgnore(b):0)),preArmor=damage,armorBlocked=(damage&&armor&&!d.pierce)?Math.min(damage,armor):0;
 if(armorBlocked)damage=Math.max(0,damage-armor);
 b.enemy.hp=Math.max(0,b.enemy.hp-damage);
 if(d.block)b.block+=d.block+deviceBonus('aegis')+boost+(tm?tm.blockBonus(c,d,b):0);
 if(d.heal)state.hp=Math.min(state.maxHp,state.hp+d.heal+boost);
 b.energy+=d.energy||0;if(d.draw)drawCards(d.draw);if(d.freeze)b.freeze=Math.max(b.freeze,d.freeze);
 if(d.burn){b.burn=d.burn+(tm?tm.dotBonus():0);b.burnTurns=2}if(d.poison)b.poison+=d.poison+(tm?tm.dotBonus():0);
 if(d.counter){b.counter=d.counter===true?(COUNTERS[b.enemy.element]||null):d.counter;b.logs.push(b.counter?'Prismatic Counter armed for '+b.counter+'.':'No elemental attack to counter.')}
 b.logs.push(d.name+(preArmor?(armorBlocked?' · '+preArmor+' dmg − '+armorBlocked+' armor = '+damage+' dealt':' · '+damage+' damage'):''));
 if(tm)tm.afterCard(c,d,b,damage);
}
playCard=function(i){const b=state.battle;if(!b||b.phase!=='fight')return;const c=b.hand[i];if(!c)return;const d=stat(c);const overload=b.overloadArmed&&hasTalent('overload')&&!b.overloadUsed;if(!overload&&d.cost>b.energy)return;const boosted=hasTalent('powerCore')&&boostedCardUids(b).includes(c.uid),repeat=b.echoArmed&&hasTalent('echo')&&!b.echoUsed,overdrive=b.doubleArmed&&d.damage&&hasTalent('doublePower')&&!b.doubleUsed;b.energy-=overload?0:d.cost;b.hand.splice(i,1);if(b.savedUid===c.uid)b.savedUid=null;if(repeat){b.echoUsed=true;b.echoArmed=false}if(overdrive){b.doubleUsed=true;b.doubleArmed=false}if(overload){b.overloadUsed=true;b.overloadArmed=false;b.logs.push('Overload Surge: card played for free.')}cardEffect(c,boosted,overdrive);if(repeat&&b.enemy.hp>0){b.logs.push('Echo Protocol repeats the card.');cardEffect(c,false,false)}(d.exhaust?b.exhaust:b.discard).push(c);recordCardUse(c);if(!b.enemy.hp)winBattle();save();renderBattle()};
endTurn=function(){const b=state.battle;if(!b||b.phase!=='fight')return;const dot=b.poison+(b.burnTurns>0?b.burn:0);b.enemy.hp=Math.max(0,b.enemy.hp-dot);if(dot)b.logs.push('Burn / poison: '+dot+' damage.');if(b.burnTurns>0)b.burnTurns--;if(!b.enemy.hp){winBattle();save();renderBattle();return}if(b.freeze>0){b.freeze--;b.logs.push('Frozen: enemy skips its attack.')}else if(b.counter&&COUNTERS[b.enemy.element]===b.counter){b.enemy.hp=Math.max(0,b.enemy.hp-6);b.logs.push('Elemental counter: attack negated, 6 damage returned.');b.counter=null}else{const damage=Math.max(0,intent()-talentRank('plating')-b.block);state.hp=Math.max(0,state.hp-damage);b.logs.push(b.enemy.name+' attacks for '+damage+' HP.');b.counter=null}b.block=0;const keep=hasTalent('retainCore')?b.hand.filter(c=>c.uid===b.savedUid).slice(0,1):[];b.discard.push(...b.hand.filter(c=>!keep.includes(c)));b.hand=keep;b.savedUid=null;if(!state.hp)loseBattle();else if(!b.enemy.hp)winBattle();else{b.turn++;b.energy=maxEnergy();drawCards(4)}save();renderBattle()};
// Upgrade Crystals are needed (alongside the 50-use mastery grind) to
// actually spend a card's mastery on a level-up in the Deck Workshop, but
// the map only ever placed exactly one, ever (Memory Annex). That's a hard
// ceiling on card leveling for the rest of the run. A modest 4% chance per
// loot chest gives a renewable trickle without making crystals feel free —
// roughly comparable to the existing 8% elite device-crystal rate, but not
// gated behind fighting (rarer) elites specifically.
// Round 54: card choice 40% of chests, potions 35%, empty 20%.
const LOOT_CHEST_ODDS={soulbound:.01,crystal:.05,empty:.25,potion:.60};
const LOOT_THIEVES=['a scavenging fox','a wiry alley cat','a startled crow','a masked raccoon','a quick sewer rat','a one-eared stray dog'];
function rollLootChest(){const r=Math.random();return r<LOOT_CHEST_ODDS.soulbound?'soulbound':r<LOOT_CHEST_ODDS.crystal?'crystal':r<LOOT_CHEST_ODDS.empty?'empty':r<LOOT_CHEST_ODDS.potion?'potion':'card'}
// Round 70: less XP for enemies below your level, so you don't outgrow a
// world just by clearing it. Full XP at or above your level; each level you
// are above the enemy takes 20% off, down to 10% at 5+ levels.
const XP_BASE={regular:25,elite:40,boss:50},XP_GAP_MULT=[1,.8,.6,.4,.25,.1];
function xpMultiplier(enemyLevel,playerLevel=state.playerLevel){const gap=playerLevel-(Number(enemyLevel)||playerLevel);return gap<=0?1:XP_GAP_MULT[Math.min(gap,XP_GAP_MULT.length-1)]}
function xpReward(b){const base=b.enemy.boss?XP_BASE.boss:b.enemy.elite?XP_BASE.elite:XP_BASE.regular;return Math.max(1,Math.round(base*xpMultiplier(b.enemy.level)))}
winBattle=function(){const b=state.battle;if(b.phase!=='fight')return;b.phase='reward';state.wins++;const levels=gainXP(b.xpGain=xpReward(b));if(b.enemy.boss){if(!state.bosses.includes(b.id))state.bosses.push(b.id)}else state.cooldowns[b.spawnId]=3;
const isMiniBoss=b.enemy.boss&&enemies[b.id]&&enemies[b.id].miniBoss;
b.lootType=rollLootChest();
// A mini-boss already guarantees its own Upgrade Crystal below — if the
// independent loot-chest roll ALSO happens to land on 'crystal' (its own
// 4% chance, unrelated to the guarantee), that's a genuine double-grant
// from one kill, not "extra luck": the guarantee is supposed to mean
// exactly one, not one-or-sometimes-two. Redirect that specific
// coincidence to a card instead, rather than letting it silently stack.
if(isMiniBoss&&b.lootType==='crystal')b.lootType='card';
b.reward=null;b.potionDrop=false;b.chestOpened=false;
if(b.lootType==='card'){const rewardIds=activeRegion!=='city'?['cinder','venom','gale','counter','bastion','mend']:['cleave','riposte','bastion','mend','spark','shatter'];b.reward=make(rewardIds[Math.floor(Math.random()*rewardIds.length)]);state.pool.push(b.reward);if(state.deck.length<maxDeckSize()&&copiesInDeck(b.reward.id)<maxCopies())state.deck.push(b.reward.uid)}
else if(b.lootType==='potion'){state.potions++;b.potionDrop=true}
else if(b.lootType==='crystal'){setMaterials(materials()+1)}
else if(b.lootType==='soulbound'){b.reward=make(['phoenix','oath','verdict'][Math.floor(Math.random()*3)]);state.pool.push(b.reward)}
else{b.thief=LOOT_THIEVES[Math.floor(Math.random()*LOOT_THIEVES.length)]}
b.special=[];if(b.id==='thornWarden'&&!state.iceGift){state.iceGift=true;const ice=make('glacial');state.pool.push(ice);b.special.push('Glacial Covenant: guaranteed Soulbound Ice card. The Elaris portal is now open!')}else if(b.id==='bloomTyrant'&&!state.stormGift){state.stormGift=true;state.pool.push(make('stormglass'));b.special.push('Stormglass Covenant: guaranteed Soulbound Lightning card. The Vespera portal is now open!')}else if(b.enemy.boss&&b.lootType!=='soulbound'&&Math.random()<.10){const soul=make(['phoenix','oath','verdict'][Math.floor(Math.random()*3)]);state.pool.push(soul);b.special.push('Soulbound boss card: '+stat(soul).name)}
if(isMiniBoss)dropMiniBossCard(b);
if(b.id==='stormTyrant')b.special.push('The Tempest Colossus falls and Vespera\'s storm breaks. All three worlds are conquered!');
// Mini-bosses always drop exactly one Upgrade Crystal on defeat — true
// bosses can only ever be defeated once each (state.bosses), so this is a
// reliable one-time reward per mini-boss, never a farmable loop. The loot-
// chest roll above already can't also land on 'crystal' for a mini-boss,
// so this is genuinely the only source of it for this kill — exactly one,
// never two.
if(isMiniBoss){setMaterials(materials()+1);b.special.push('Mini-boss defeated: guaranteed Upgrade Crystal! ('+materials()+' total)')}
if(b.enemy.elite&&Math.random()<.08){const type=Object.keys(CRYSTALS)[Math.floor(Math.random()*3)],crystal=rollUpgradeCrystal(type);state.device.crystals.push(crystal);b.crystalDrop=crystal.uid;b.special.push(crystalLabel(crystal)+' crystal found! Slot it into the Aetherlink.')}b.levels=levels;b.logs.push(b.lootType==='soulbound'?'Loot chest: Soulbound card!':b.lootType==='potion'?'Loot chest: small healing potion.':b.lootType==='crystal'?'Loot chest: an Upgrade Crystal! ('+materials()+' total)':b.lootType==='empty'?'Loot chest: empty — '+b.thief+' bolted off with everything inside.':'Loot chest: one random card added to your collection.')};
const baseLoseBattle=loseBattle;
loseBattle=function(){const b=state.battle;baseLoseBattle();state.hp=state.maxHp;state.room=activeRegion!=='city'?'0,0':'0,5';state.pos={x:400,y:300};b.lastRegion=activeRegion;if(!active().length&&state.pool.length)state.deck=[state.pool[0].uid];b.defeatSummary={hp:state.hp,maxHp:state.maxHp,location:room()?.name||'safe zone',deckCount:state.deck.length}};
const baseRenderBattle=renderBattle;
renderBattle=function(){const b=state.battle;if(!b)return;if(b.phase==='reward'){const m=$('battleModal');
if(!b.chestOpened){
 m.innerHTML='<div class="eyebrow">VICTORY</div><h2>Loot Chest</h2><p>A loot chest dropped. Open it to see what\'s inside.</p><div class="loot-chest-wrap"><span class="loot-chest-graphic" role="img" aria-label="Closed loot chest"></span></div><button id="openChest" class="primary">Open Chest</button>';
 $('openChest').onclick=()=>{b.chestOpened=true;save();renderBattle()};
 return;
}
const head=b.lootType==='card'?'<h2>'+stat(b.reward).name+'</h2><p>The loot chest held a new Impermanent card.</p>':b.lootType==='potion'?'<h2>⚗ Small Healing Potion</h2><p>The loot chest held a potion. You now have '+state.potions+'.</p>':b.lootType==='crystal'?'<h2>◆ Upgrade Crystal</h2><p>The loot chest held an Upgrade Crystal — spend it in the Deck Workshop on a mastered card. You now have '+materials()+'.</p>':b.lootType==='soulbound'?'<h2>◆ '+stat(b.reward).name+'</h2><p class="notice">Jackpot! The loot chest held a rare Soulbound card (1% odds).</p>':'<h2>🐾 Empty Chest</h2><p>You open the chest to find '+b.thief+' already inside — it bolts off into the ruins with everything that was in there.</p>';
m.innerHTML='<div class="eyebrow">VICTORY · LOOT CHEST</div>'+head+'<div id="randomReward" class="cards"></div>'+b.special.map(s=>'<p class="notice">'+s+'</p>').join('')+((b.xpGain?'<p class="xp-gain">+'+b.xpGain+' XP'+(xpMultiplier(b.enemy.level,state.playerLevel-(b.levels||[]).length)<1?' <span class="muted">(reduced: this enemy is below your level)</span>':'')+'</p>':'')+b.levels.length?'<p>Level '+state.playerLevel+'! +'+b.levels.length+' maximum HP, +'+b.levels.length*5+' healing, and +'+b.levels.length+' talent point(s).</p>':'')+'<button id="continueReward" class="primary">Continue</button>';
if(b.lootType==='card'||b.lootType==='soulbound')$('randomReward').append(cardElement(b.reward,()=>{},true));
if(b.uniqueDrop){const u=state.pool.find(c=>c.uid===b.uniqueDrop);if(u)$('randomReward').append(cardElement(u,()=>{},true))}
if(b.crystalDrop){const c=state.device.crystals.find(c=>c.uid===b.crystalDrop);if(c){const art=document.createElement('div');art.className='crystal-reward';art.innerHTML=crystalArt(c)+'<b>'+crystalLabel(c)+'</b>';$('randomReward').append(art)}}
$('continueReward').onclick=finishBattle;return}baseRenderBattle();if(b.phase!=='fight')return;const tools=document.createElement('div');tools.className='combat-tools';
// Round 34: this used to always show "Enemy element: Neutral · Freeze 0 ·
// Burn 0 turns · Poison 0" even when literally nothing was active — pure
// wasted vertical space pushing the hand down further. Now only renders
// a status line when something is actually relevant (a real element, or
// any status effect genuinely active), and dropped the one-time "Elaris
// enemies are tougher" tip, which doesn't need repeating every battle.
const statusBits=[];
if(b.enemy.element)statusBits.push('Element: <b>'+b.enemy.element+'</b> · reserve Prismatic Counter');
// Round 64: Freeze, Burn and Poison now live in the always-visible debuff strips.
if(b.counter)statusBits.push('Armed: '+b.counter);
const talentButtons=(hasTalent('doublePower')?'<button id="overdrive" class="ability small" '+(b.doubleUsed?'disabled':'')+'>'+ (b.doubleUsed?'Overdrive spent':b.doubleArmed?'✓ Overdrive armed':'Overdrive ×2')+'</button>':'')+(hasTalent('echo')?'<button id="echoCard" class="ability small" '+(b.echoUsed?'disabled':'')+'>'+(b.echoUsed?'Echo spent':b.echoArmed?'✓ Echo armed':'Echo · play twice')+'</button>':'')+(hasTalent('overload')?'<button id="overloadCard" class="ability small" '+(b.overloadUsed?'disabled':'')+'>'+(b.overloadUsed?'Overload spent':b.overloadArmed?'✓ Overload armed':'Overload · free card')+'</button>':'');
if(statusBits.length||talentButtons)tools.innerHTML=(statusBits.length?'<p>'+statusBits.join(' · ')+'</p>':'')+talentButtons;
if(tools.innerHTML)$('battleModal').prepend(tools);if($('overdrive'))$('overdrive').onclick=()=>{b.doubleArmed=!b.doubleArmed;save();renderBattle()};if($('echoCard'))$('echoCard').onclick=()=>{b.echoArmed=!b.echoArmed;save();renderBattle()};if($('overloadCard'))$('overloadCard').onclick=()=>{b.overloadArmed=!b.overloadArmed;save();renderBattle()}};

newGame=function(){uid=1;const starterSeen=new Set();const pool=['strike','strike','guard','guard','focus','mend'].map(id=>{const first=!starterSeen.has(id);starterSeen.add(id);return make(id,0,first)});state={version:EXPANSION_VERSION,name:'Adventurer',characterId:'protagonist',seed:Math.floor(Math.random()*4294967295),region:'city',regionVisits:{city:['0,5'],elaris:['0,0']},playerLevel:1,xp:0,hp:30,maxHp:30,gold:0,potions:0,pool,deck:pool.map(c=>c.uid),room:'0,5',pos:{x:400,y:300},visited:['0,5'],relics:[],cleared:[],bosses:[],cooldowns:{},fight:0,wins:0,talents:{},battle:null,chests:[],device:{crystals:[],slots:[null,null,null,null,null],next:1}};state.visited=state.regionVisits.city;configureRegion('city');$('startOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');$('battleOverlay').classList.add('hidden');setMaterials(0);save();renderWorld()};
save=function(){if(!state)return;state.regionVisits[state.region]=state.visited;localStorage.setItem('cardbound-expansion-v3',JSON.stringify(state))};
load=function(){try{const parsed=JSON.parse(localStorage.getItem('cardbound-expansion-v3'));if(!parsed||parsed.version!==3)throw Error('No save');const battle=parsed.battle;parsed.battle=null;validateImport(parsed);parsed.battle=battle;restoreGame(parsed);if(battle){$('battleOverlay').classList.remove('hidden');renderBattle()}return true}catch(e){toast('No valid expansion save found. Begin a new journey.');return false}};
function validateImport(s){if(s&&s.miniDrops!==undefined&&(!Array.isArray(s.miniDrops)||s.miniDrops.some(id=>!Object.hasOwn(MINI_BOSS_CARDS,id))))throw Error('Invalid mini-boss drop record.');if(!s||s.version!==3||!['city','elaris','vespera'].includes(s.region)||!Number.isInteger(s.seed)||s.seed<0||!Array.isArray(s.pool)||s.pool.length>10000||!Array.isArray(s.deck)||s.deck.length>30)throw Error('Unsupported or malformed save.');const ids=new Set();for(const c of s.pool){if(!c||!Object.hasOwn(defs,c.id)||!Number.isInteger(c.uid)||c.uid<1||ids.has(c.uid)||!Number.isInteger(c.level)||c.level<0||c.level>3||!Number.isInteger(c.uses)||c.uses<0||c.uses>((defs[c.id].soulbound||c.soulbound)?USES*2**Math.min(2,c.level):USES*2))throw Error('Invalid card data.');ids.add(c.uid);c.soulbound=defs[c.id].soulbound?true:!!c.soulbound}if(new Set(s.deck).size!==s.deck.length||s.deck.some(id=>!ids.has(id)))throw Error('Invalid deck.');if(!Number.isInteger(s.playerLevel)||s.playerLevel<1||s.playerLevel>MAX_PLAYER_LEVEL||!Number.isFinite(s.hp)||s.hp<0||s.hp>1000||!Number.isFinite(s.maxHp)||s.maxHp<1||s.maxHp>1000||!Number.isFinite(s.xp)||s.xp<0||s.xp>=100||!Number.isInteger(s.potions)||s.potions<0)throw Error('Invalid player stats.');const validRooms=s.region==='city'?Object.keys(CITY_ROOMS):s.region==='vespera'?VESPERA_ROOM_KEYS:ELARIS_ROOM_KEYS;if(!validRooms.includes(s.room)||!s.pos||!Number.isFinite(s.pos.x)||!Number.isFinite(s.pos.y))throw Error('Invalid room.');for(const field of ['visited','relics','cleared','bosses','chests'])if(!Array.isArray(s[field])||s[field].some(x=>typeof x!=='string'||x.length>100||/[<>]/.test(x)))throw Error('Invalid world data.');if(!s.regionVisits||!Array.isArray(s.regionVisits.city)||!Array.isArray(s.regionVisits.elaris)||!s.cooldowns||!s.talents||!s.device||!Array.isArray(s.device.crystals)||s.device.crystals.length>1000||!Array.isArray(s.device.slots)||s.device.slots.length!==5)throw Error('Invalid progression data.');for(const [id,rank] of Object.entries(s.talents)){const node=Object.values(TALENT_BRANCHES).flatMap(b=>b.nodes).find(n=>n.id===id);if(!node||!Number.isInteger(rank)||rank<0||rank>node.max)throw Error('Invalid talent.')}const crystalIds=new Set();for(const c of s.device.crystals){if(!c||!Object.hasOwn(CRYSTALS,c.type)||typeof c.uid!=='string'||!/^crystal-\d+$/.test(c.uid)||crystalIds.has(c.uid))throw Error('Invalid crystal.');if(c.rarity!==undefined&&!Object.hasOwn(CRYSTAL_RARITIES,c.rarity))throw Error('Invalid crystal rarity.');crystalIds.add(c.uid)}if(s.device.slots.some(id=>id!==null&&!crystalIds.has(id))||new Set(s.device.slots.filter(Boolean)).size!==s.device.slots.filter(Boolean).length)throw Error('Invalid sockets.');if(s.battle)throw Error('Save transfer is available between encounters only.');s.name='Adventurer';return s}
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
// A save created before this protection existed (or one where it was
// otherwise lost) never gets it back just by loading — load()/
// validateImport() only PRESERVE an existing soulbound flag, they never
// retroactively grant one. Same one-time-migration pattern as the counter-
// card merge above: heal any starter type (Strike/Guard/Focus/Mend) that
// has at least one copy but none of them protected, by protecting its
// first copy — matching newGame()'s original "first occurrence" rule.
function healStarterProtection(s){
 let healed=false;
 for(const type of['strike','guard','focus','mend']){
  const copies=s.pool.filter(c=>c.id===type);
  if(copies.length&&!copies.some(c=>c.soulbound)){copies[0].soulbound=true;healed=true}
 }
 return healed;
}
function grantNeonCovenant(){
 if(state.neonGift)return false;
 state.neonGift=true;
 if(state.pool.some(c=>c.id==='neonCovenant'))return false;
 state.pool.push(make('neonCovenant',0,true));return true;
}
function restoreGame(s){const countersMigrated=normalizeElementalCards(s);const starterHealed=healStarterProtection(s);state=s;uid=Math.max(1,...s.pool.map(c=>c.uid+1));if(state.bosses.includes('crownSentinel'))grantNeonCovenant();configureRegion(state.region);state.regionVisits[state.region]=state.visited;keys={};$('startOverlay').classList.add('hidden');$('battleOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');save();renderWorld();if(countersMigrated)toast('Elemental counters combined into one Prismatic Counter type.');else if(starterHealed)toast('One of each starter card type is now protected from loss.')}
function exportSave(){if(!state)return toast('Begin or load a journey first.');if(state.battle)return toast('Finish the encounter before exporting.');const payload={format:'cardbound-save',version:3,state,materials:materials()},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cardbound-'+state.region+'-level-'+state.playerLevel+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Save exported.')}
async function importSave(file){try{if(!file||file.size>2000000)throw Error('Choose a save file smaller than 2 MB.');const payload=JSON.parse(await file.text());if(payload.format!=='cardbound-save'||payload.version!==3)throw Error('Not a Cardbound expansion save.');const s=validateImport(payload.state);if(!Number.isInteger(payload.materials)||payload.materials<0||payload.materials>100000)throw Error('Invalid material count.');if(state&&!confirm('Replace this journey with the imported save?'))return;restoreGame(s);setMaterials(payload.materials);save();renderWorld();toast('Save imported successfully.')}catch(e){toast(e.message||'Unable to import this save.')}}
function showMainMenu(){keys={};openMenu('<div class="eyebrow">CARDBOUND</div><h2>Main menu</h2><p>Save transfer is available between encounters.</p><button id="exportSave">Export save file</button> <button id="importSave">Import save file</button><p><button id="backToGame">Return to game</button> <button id="restartJourney" class="danger">New journey</button></p>');$('exportSave').onclick=exportSave;$('importSave').onclick=()=>$('saveFile').click();$('backToGame').onclick=closeMenu;$('restartJourney').onclick=()=>{if(confirm('Start a new journey? Export your current save first if you want to keep it.'))newGame()}}
const baseShowCharacter=showCharacter;
showCharacter=function(){baseShowCharacter();const portrait=document.querySelector('.sheet-portrait');if(portrait){portrait.src='assets/characters/character-portal.webp';portrait.style.maxHeight='none';portrait.style.aspectRatio='16 / 9';portrait.style.objectFit='cover'}const info=document.createElement('p');info.className='notice';info.textContent='Aetherlink: '+deviceSlots()+' sockets · Critical strike '+talentRank('critical')*3+'% · Every level grants +1 max HP and heals 5 HP.';$('menuModal').append(info)};
objective=function(){if(activeRegion==='vespera')return state.bosses.includes('stormTyrant')?'All three worlds are conquered. Vespera\'s storm has broken.':'Cross the storm to the Eye of the Tempest and defeat the Tempest Colossus. Reserve Prismatic Counter for charged strikes.';if(activeRegion==='elaris')return state.bosses.includes('bloomTyrant')?'The Vespera portal is open in Elderbloom Sanctuary.':'Defeat the Bloom Tyrant in Elderbloom Sanctuary. Reserve your counter for charged strikes.';if(state.bosses.includes('thornWarden'))return 'The Warden portal is open. Return to Warden Mainframe to enter Elaris.';if(!hasRelic('ember'))return state.room==='0,5'?'Head east into Scrapfire Alley to begin the search for the Ember Sigil.':'Explore the city to recover the Ember Sigil.';if(!hasRelic('boots'))return 'Clear Cable Market to recover the Briarstep Boots.';if(!hasRelic('lens'))return 'Find the Moon Lens in the Drowned Archive.';return 'Defeat the Thorn Warden to unlock Ice and Elaris.'};
function relicName(id){for(const r of Object.values(rooms))if(r.relic&&r.relic[0]===id)return r.relic[2]+' '+r.relic[1];return id}
// The map now reads as an actually-drawn map, not a data grid: only areas
// you've genuinely visited render at all (a real fog of war — the OLD
// version drew a same-shaped "Unknown" box at every undiscovered area's
// exact position and size, which quietly told you the whole map's layout
// before you'd earned it); rooms are organic hand-drawn-ish blobs (varied
// border-radius + a slight per-room rotation, both seeded deterministically
// off the room key so they're stable across renders) on a spaced-out,
// percentage-based canvas instead of touching CSS-grid cells; and an SVG
// layer draws slightly curved connector lines between rooms you've found —
// full lines between two you've both visited, short stubs fading into fog
// where a visited room's exit leads somewhere you haven't been yet.
function mapAreaFootprint(key,minX,maxX,minY,maxY){
 const area=getJoinedArea(key);
 const axs=area.cells.map(c=>Number(c.split(',')[0])),ays=area.cells.map(c=>Number(c.split(',')[1]));
 const aMinX=Math.min(...axs),aMaxX=Math.max(...axs),aMinY=Math.min(...ays),aMaxY=Math.max(...ays);
 const cols=maxX-minX+1,rows=maxY-minY+1,stepX=100/(cols+0.8),stepY=100/(rows+0.8),marginX=stepX*0.4,marginY=stepY*0.4;
 const centerCol=(aMinX+aMaxX)/2-minX,centerRow=(aMinY+aMaxY)/2-minY;
 const x=marginX+stepX*(centerCol+0.5),y=marginY+stepY*(centerRow+0.5);
 // Kept well under 1 step even for a multi-cell joined area — a rotated
 // organic blob's visual footprint reaches further than its own box, so
 // this leaves real breathing room for neighbors instead of crowding them.
 let width=stepX*0.44+(aMaxX-aMinX)*stepX*0.82,height=stepY*0.4+(aMaxY-aMinY)*stepY*0.82;
 const j=keyHash(key);
 if(area.cells.length===1){width*=0.8+((j%23)/22)*0.3;height*=0.8+(((j>>5)%23)/22)*0.3}
 return{x,y,width,height,area};
}
// Round 61: the map canvas is sized by grid cells (scrolls if large) so rooms never overlap.
const MAP_CELL_W=150,MAP_CELL_H=104;
showMap=function(){
 const keys=Object.keys(rooms);
 // The viewport frames only the explored bounding box (plus one ring of
 // padding for stubs to fade into), not the whole region's grid — early
 // in a run that's a handful of rooms in one corner, and reserving space
 // for the entire map left most of the canvas empty until deep into it.
 const visitedKeys=keys.filter(k=>state.visited.includes(k));
 const boundsKeys=visitedKeys.length?visitedKeys:[state.room];
 const bxs=boundsKeys.map(k=>Number(k.split(',')[0])),bys=boundsKeys.map(k=>Number(k.split(',')[1]));
 const minX=Math.max(Math.min(...bxs)-1,Math.min(...keys.map(k=>Number(k.split(',')[0])))),maxX=Math.min(Math.max(...bxs)+1,Math.max(...keys.map(k=>Number(k.split(',')[0]))));
 const minY=Math.max(Math.min(...bys)-1,Math.min(...keys.map(k=>Number(k.split(',')[1])))),maxY=Math.min(Math.max(...bys)+1,Math.max(...keys.map(k=>Number(k.split(',')[1]))));
 const drawn=new Set(),areas=[],footprints={};
 for(const k of keys){
  const area=getJoinedArea(k),areaId=area.cells.join('|');
  if(drawn.has(areaId))continue;drawn.add(areaId);
  areas.push(area);footprints[areaId]=mapAreaFootprint(k,minX,maxX,minY,maxY);footprints[areaId].id=areaId;footprints[areaId].primaryKey=area.cells[0];
 }
 const areaOf=key=>areas.find(a=>a.cells.includes(key)),seenArea=a=>a.cells.some(c=>state.visited.includes(c));
 const cellsHTML=[],linksSVG=[],doneLinks=new Set();
 for(const area of areas){
  const fp=footprints[area.cells.join('|')],seen=seenArea(area);
  if(!seen)continue;
  const current=area.cells.includes(state.room),cleared=area.cells.every(c=>roomCleared(c));
  const isBoss=area.cells.some(c=>{const r=rooms[c];return r.enemy&&enemies[r.enemy[0]]&&enemies[r.enemy[0]].boss&&!state.bosses.includes(r.enemy[0])});
  const tag=area.cells.map(roomTag).find(Boolean);
  const lockedExits=[...new Set(area.cells.flatMap(c=>Object.values(rooms[c].exits).filter(e=>typeof e==='object'&&e.requires&&!hasRelic(e.requires)).map(e=>e.requires)))];
  cellsHTML.push('<div class="panel'+(current?' current-room':'')+(isBoss?' boss-room':'')+'" style="left:'+fp.x+'%;top:'+fp.y+'%;width:'+fp.width+'%;height:'+fp.height+'%;transform:translate(-50%,-50%)">'+'<b>'+area.name+'</b>'+'<small>'+(current?'YOU ARE HERE':isBoss?'BOSS':cleared?'SECURE':'DANGER')+'</small>'+(tag?'<i class="room-tag-badge">'+tag.label+'</i>':'')+(lockedExits.length?'<i class="lock-hint">🔒 '+lockedExits.map(relicName).join(', ')+'</i>':'')+'</div>');
  // Connector lines/stubs: walk this area's real exits once each.
  for(const c of area.cells)for(const raw of Object.values(rooms[c].exits)){
   const to=typeof raw==='string'?raw:raw.to;if(!rooms[to])continue;
   const toArea=areaOf(to);if(!toArea||toArea===area)continue;
   const toFp=footprints[toArea.cells.join('|')],toSeen=seenArea(toArea);
   const linkId=[fp.id,toFp.id].sort().join('|');
   if(toSeen){
    if(doneLinks.has(linkId))continue;doneLinks.add(linkId);
    const locked=typeof raw==='object'&&raw.requires&&!hasRelic(raw.requires);
    // Straight line, no curve/jitter — rooms that are actually adjacent
    // should connect with a real straight line, not a wavy "hand-drawn"
    // one that can look diagonal even when the rooms sit in the same row
    // or column.
    linksSVG.push('<path d="M'+fp.x+' '+fp.y+' L '+toFp.x+' '+toFp.y+'" class="map-link'+(locked?' locked':'')+'"/>');
   }else{
    // Stub toward an undiscovered neighbor: a short curve that fades out,
    // hinting there's more here without revealing anything about it.
    const stubId=fp.id+'>'+to;if(doneLinks.has(stubId))continue;doneLinks.add(stubId);
    const dx=toFp.x-fp.x,dy=toFp.y-fp.y,len=Math.hypot(dx,dy)||1,horiz=Math.abs(dx)>=Math.abs(dy),stepX=100/(maxX-minX+1.8),stepY=100/(maxY-minY+1.8),stubLen=Math.min(len*0.5,(horiz?fp.width/2+stepX*0.22:fp.height/2+stepY*0.22));
    const sx=fp.x+dx/len*stubLen,sy=fp.y+dy/len*stubLen;
    // Round 61: a doorway marker shows there is a path, without revealing the room beyond it.
    cellsHTML.push('<i class="map-door '+(horiz?'h':'v')+'" style="left:'+sx+'%;top:'+sy+'%" title="Unexplored path"></i>');
    linksSVG.push('<path d="M'+fp.x+' '+fp.y+' L '+sx+' '+sy+'" class="map-link map-stub"/>');
   }
  }
 }
 const discovered=state.visited.filter(k=>rooms[k]).length;
 const allChests=keys.map(chestFor).filter(Boolean),chestsFound=allChests.filter(c=>state.chests.includes(c.id)).length;
 const allRelics=Object.values(rooms).filter(r=>r.relic&&r.relic[0]!=='material'),relicsFound=state.relics.length;
 const pct=Math.round(((discovered/keys.length)+(allChests.length?chestsFound/allChests.length:1)+(allRelics.length?relicsFound/allRelics.length:1))/3*100);
 openMenu('<div class="eyebrow">'+(activeRegion==='city'?'NEON AFTERMATH':activeRegion==='vespera'?'VESPERA':'ELARIS')+' · '+pct+'% COMPLETE</div><h2>Exploration map</h2><div class="map-scroll"><div class="map-canvas" style="width:'+Math.round((maxX-minX+1.8)*MAP_CELL_W)+'px;height:'+Math.round((maxY-minY+1.8)*MAP_CELL_H)+'px"><svg class="map-links" viewBox="0 0 100 100" preserveAspectRatio="none">'+linksSVG.join('')+'</svg>'+cellsHTML.join('')+'</div></div><p>'+discovered+' areas explored · '+chestsFound+' hidden chest'+(chestsFound===1?'':'s')+' found · '+relicsFound+' relic'+(relicsFound===1?'':'s')+' claimed.</p><button id="mapReturn">Return</button>');
 $('mapReturn').onclick=closeMenu;
 const here=document.querySelector&&document.querySelector('.map-canvas .current-room');if(here&&here.scrollIntoView)here.scrollIntoView({block:'center',inline:'center'});
};
const style=document.createElement('style');style.textContent='.device-core{font-size:90px;text-align:center;color:#78fff1;text-shadow:0 0 30px #41cdfc}.combat-tools{padding:6px 10px;border:1px solid #529baf;margin-bottom:6px;font-size:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.combat-tools p{margin:0}.region-portal{position:absolute;left:340px;top:340px;width:120px;height:95px;border:2px solid #9dffff;border-radius:50%;background:radial-gradient(#cdfff1,#215ca0,#22113d);box-shadow:0 0 35px #86e5e8;font-size:42px;z-index:7;animation:pulse 3s infinite}.region-portal small{display:block;font:12px system-ui}.elite .monster-sprite{filter:drop-shadow(0 0 8px #ffc958)}.map-scroll{overflow:auto;max-height:calc(94vh - 230px);border-radius:10px;border:1px solid #2c4356;background:#070d14}.map-door{position:absolute;transform:translate(-50%,-50%);z-index:1;background:#0f1c29;border:1px solid #6fb3c9;box-shadow:0 0 8px #4ac9cd55}.map-door.h{width:7px;height:20px;border-radius:3px}.map-door.v{width:20px;height:7px;border-radius:3px}.map-door::after{content:"";position:absolute;inset:2px;background:repeating-linear-gradient(45deg,#4ac9cd55 0 2px,transparent 2px 4px)}.map-canvas{position:relative;min-width:100%;margin:0 auto;background:radial-gradient(ellipse at 50% 40%,#16283a,#070d14 75%);border:1px solid #2c4356;border-radius:10px;overflow:hidden;box-shadow:inset 0 0 60px #00000066}.map-links{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.map-link{fill:none;stroke:#5c8fa8;stroke-width:.5;stroke-linecap:round;stroke-dasharray:1.2 1.6;opacity:.75}.map-link.locked{stroke:#c25a6a;stroke-dasharray:.5 1.1}.map-link.map-stub{stroke:#3c5468;opacity:.55;stroke-dasharray:.8 1.4}.map-canvas .panel{position:absolute;min-width:92px;min-height:66px;padding:12px 10px 8px;font:11px system-ui;background:linear-gradient(160deg,#1c3247,#0f1c29);border:1px solid #3f6178;border-radius:6px;box-shadow:0 0 0 1px #0009,0 4px 14px #0007;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:2px}.map-canvas .panel b{font-size:12px;text-shadow:0 0 6px #4aa3ff55}.map-canvas small{display:block;color:#9edcae;letter-spacing:.4px}.current-room{border-color:#fff189!important;box-shadow:0 0 0 1px #fff18988,0 0 22px #fff18966!important}.map-canvas .boss-room{border-color:#e0524f!important;box-shadow:0 0 0 1px #e0524f88,0 0 18px #e0524f55!important}.map-canvas .boss-room small{color:#ff9d9a}.map-canvas .room-tag-badge{position:absolute;top:-13px;right:10%;font:8px system-ui;letter-spacing:.3px;padding:2px 6px;border-radius:4px;background:#16283a;border:1px solid #3f6178;color:#fff;white-space:nowrap;z-index:2}.map-canvas .lock-hint{font-size:9px;color:#e0a0a0;white-space:nowrap}.wildlife{position:absolute;pointer-events:none;z-index:3;color:#ceffee;font-size:19px;animation:wildlifeDrift 12s ease-in-out infinite}@keyframes wildlifeDrift{50%{transform:translate(50px,-20px)}}select{max-width:100%;background:#152e40;color:#e3faf7;padding:10px}.loot-chest-wrap{text-align:center}.loot-chest-graphic{display:inline-block;width:170px;height:170px;background-image:url(\'assets/items/loot-chest.png\');background-repeat:no-repeat;background-size:contain;background-position:center;filter:drop-shadow(0 0 16px #7fd8ff99);animation:chestGlow 2.4s ease-in-out infinite}@keyframes chestGlow{50%{filter:drop-shadow(0 0 28px #a6e8ffcc);transform:scale(1.04)}}.armor-tag{color:#9dd6ff;text-shadow:0 0 6px #4aa3ff88}.armor-note{font-size:11px;margin:2px 0 0}.block-tag{color:#a8e6a1;text-shadow:0 0 6px #5ecb5088}.enemy-level{font-size:14px;font-weight:700;vertical-align:middle}.map-chest{position:absolute;transform:translate(-50%,-50%);width:46px;height:46px;background-image:url(\'assets/items/loot-chest.png\');background-repeat:no-repeat;background-size:contain;background-position:center;filter:drop-shadow(0 0 10px #7fd8ff99);z-index:5;animation:mapChestGlow 2.4s ease-in-out infinite;pointer-events:none}@keyframes mapChestGlow{50%{filter:drop-shadow(0 0 18px #a6e8ffcc);transform:translate(-50%,-50%) scale(1.04)}}';document.head.append(style);
const navDevice=document.createElement('button');navDevice.textContent='Aetherlink';navDevice.onclick=showDevice;$('nav').append(navDevice);const navMenu=document.createElement('button');navMenu.textContent='Menu';navMenu.onclick=showMainMenu;$('nav').append(navMenu);
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.id='saveFile';fileInput.hidden=true;fileInput.onchange=()=>{importSave(fileInput.files[0]);fileInput.value=''};document.body.append(fileInput);
const importButton=document.createElement('button');importButton.textContent='Import save file';importButton.onclick=()=>fileInput.click();$('startOverlay').querySelector('section').append(importButton);
$('newBtn').onclick=newGame;$('resumeBtn').onclick=load;$('mapBtn').onclick=showMap;$('charBtn').onclick=showCharacter;
$('resumeBtn').classList.toggle('hidden',!localStorage.getItem('cardbound-expansion-v3'));
