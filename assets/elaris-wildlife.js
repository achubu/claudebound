'use strict';
// Four-frame generated wildlife sheets. Elements are part of each species' identity.
const ELARIS_WILDLIFE={
 // Round 172: Solaris is a sun-scorched brass desert city, so its creatures were renamed and
 // reworked to match. Ids stay the same so saves carry over. Rounds 193-195 gave them the owner's
 // own sheets (see ELARIS-ART.md).
 cinderFox:{name:'Solar Scarab',icon:'☼',hp:38,attack:7,element:'fire',sheet:'solar-scarab',cycle:'.8s'}, // Round 269: the owner's eight-frame walk (four frames used)
 drownedHeron:{name:'Mirage Ibis',icon:'≈',hp:55,attack:9,element:'water',sheet:'mirage-ibis',cycle:'.8s'}, // Round 270: the owner's eight-frame walk (four frames used)
 blightAntler:{name:'Dune Scorpion',icon:'◆',hp:44,attack:8,element:'earth',sheet:'dune-scorpion',cycle:'.8s'}, // Round 271: the owner's eight-frame walk (four frames used)
 stormMoth:{name:'Dust Devil',icon:'≋',hp:52,attack:9,element:'air',sheet:'dust-devil',cycle:'.8s'}, // Round 272: the owner's eight-frame spin (four frames used)
 // Round 22 mini-bosses (own sheets since Round 195).
 tidewardenElaris:{name:'The Cistern Warden',icon:'≈',hp:70,attack:11,armor:3,element:'water',sheet:'cistern-warden',cycle:'1.4s',boss:true,miniBoss:true},
 galeSovereign:{name:'The Noon Toller',icon:'🔔',hp:66,attack:11,armor:3,element:'air',sheet:'noon-toller',cycle:'1.2s',boss:true,miniBoss:true}
};
Object.assign(enemies,ELARIS_WILDLIFE);
// Round 172: art-only keys for the old forest sheets. Vespera and Chronospire recolor these,
// so Solaris species can get their own art without changing the other worlds.
const WILDLIFE_ART={
 forestFox:{name:'Cinder Fox',sheet:'cinder-fox',cycle:'.95s'},
 forestHeron:{name:'Drowned Heron',sheet:'drowned-heron',cycle:'1.4s'},
 forestStag:{name:'Blight Antler',sheet:'blight-antler',cycle:'1.2s'},
 forestMoth:{name:'Storm Moth',sheet:'storm-moth',cycle:'.7s'},
 // Round 234: Neon Aftermath's Briar Sentinel is animated: stand, shield up, slash (poses: sun-revenant.js),
 // and a walk on the map. The Arc Sentinel and the Brass Sentry borrow it.
 vineguard:{name:'Briar Sentinel',sheet:'city/briar-sentinel',cycle:'1.6s',poses:{attack:2,hurt:1,walk:'city/briar-sentinel-walk'}},
 // Round 252: the Ember Jackal is animated too: stand, rear back when hit, lunge with a raised paw.
 emberling:{name:'Ember Jackal',sheet:'city/ember-jackal',cycle:'1.2s',poses:{attack:2,hurt:1,walk:'city/ember-jackal-walk'}},
 // Round 255: the Circuit Thornling scuttles (four of the owner's eight walk frames; no battle poses yet).
 thornling:{name:'Circuit Thornling',sheet:'city/circuit-thornling',cycle:'.8s'},
 // Round 258: the Tunnel Borehound walks (four of the owner's eight frames; no battle poses yet).
 burrower:{name:'Tunnel Borehound',sheet:'city/tunnel-borehound',cycle:'.8s'},
 // Round 264: the Phase Shade glides (four of the owner's eight frames; no battle poses yet).
 shade:{name:'Phase Shade',sheet:'city/phase-shade',cycle:'.8s'},
 // Round 266: the Crown Observer hovers (four of the owner's eight frames; no battle poses yet). The Clockwarden borrows it.
 crownEye:{name:'Crown Observer',sheet:'city/crown-observer',cycle:'.8s'},
 // Round 267: Neon Aftermath's final boss, the Thorn Warden, strides (four of the owner's eight side-walk frames).
 thornWarden:{name:'Thorn Warden',sheet:'city/thorn-warden',cycle:'1.1s'},
 // Round 268: the mini-boss Lunar Enforcer glides (four of the owner's eight frames; no battle poses yet).
 moonKnight:{name:'Lunar Enforcer',sheet:'city/lunar-enforcer',cycle:'.8s'},
 // Round 273: the Data Wisp's fragments orbit its core (four of the owner's eight frames). Vespera's Arc Wisp and
 // Chronospire's Rust Wisp borrow it.
 cryptWisp:{name:'Data Wisp',sheet:'city/data-wisp',cycle:'.8s'}
};
const cityMonsterArt=monsterArt;
// Round 196: a sheet name with a folder ('sky/zenith-roc') is read from assets/monsters/<folder>/;
// big:true draws it in the larger boss box.
// Round 200: bump SPRITE_VERSION when sheets are re-cut, so browsers fetch the new images.
const SPRITE_VERSION='273';
function wildlifeSheetUrl(sheet){return 'assets/monsters/'+(sheet.includes('/')?sheet:'elaris/'+sheet)+'.png?v='+SPRITE_VERSION}
monsterArt=function(id){const animal=ELARIS_WILDLIFE[id]||WILDLIFE_ART[id];if(!animal)return cityMonsterArt(id);return '<span class="monster-sprite wildlife-sprite'+(animal.big?' bloom-tyrant':'')+'" role="img" aria-label="'+animal.name+'" style="background-image:url('+wildlifeSheetUrl(animal.sheet)+');--wildlife-cycle:'+animal.cycle+'"></span>'};
// Round 249: a boss node's sprite box was square (142px, sized for Neon Aftermath's boss pictures), which
// stretched the 3:4 sheet frames of every tile-world boss and mini-boss. Boss creature sprites keep 3:4.
const wildlifeBossStyle=document.createElement('style');
wildlifeBossStyle.textContent='.enemy-node.boss .monster-sprite.wildlife-sprite{width:128px;height:170.667px;position:absolute;left:50%;top:-44px;margin-left:-64px}';
document.head.append(wildlifeBossStyle);
const wildlifeStyle=document.createElement('style');
wildlifeStyle.textContent=`
.enemy-node .wildlife-sprite,.battle-monster .wildlife-sprite{display:block;background-repeat:no-repeat;background-size:400% 100%;background-position:0 0;image-rendering:auto;animation:wildlifeFrames var(--wildlife-cycle,1s) steps(1,end) infinite;transform:scaleX(var(--enemy-facing,1));transform-origin:center;filter:drop-shadow(0 5px 3px #0009)}
.enemy-node .wildlife-sprite{width:88px;height:117.333px;position:absolute;left:50%;top:-28px;margin-left:-44px}
.enemy-node:has(.wildlife-sprite){animation:none;transform:translate(-50%,-50%)}
.enemy-node:has(.wildlife-sprite):after{top:98px}
.enemy-node.elite .wildlife-sprite{filter:drop-shadow(0 0 5px #e9ba65)}
.battle-monster .wildlife-sprite{width:150px;height:200px;--enemy-facing:-1}
@keyframes wildlifeFrames{0%,100%{background-position:0% 0}25%{background-position:33.333333% 0}50%{background-position:66.666667% 0}75%{background-position:100% 0}}
#world .region-portal{left:348px;top:310px;width:104px;height:165px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;animation:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
.region-portal .portal-art{width:96px;height:144px;object-fit:contain;image-rendering:pixelated;animation:gatewayGlow 3s ease-in-out infinite;pointer-events:none}
#world .region-portal small{font:10px system-ui;white-space:nowrap;padding:3px 7px;color:#d7fff0;background:#071f2ee8;border:1px solid #62c5ca;border-radius:4px}
#world .region-portal:hover .portal-art{filter:drop-shadow(0 0 10px #64ffdf)}
#world .region-portal:focus-visible{outline:2px solid #c4fff2;outline-offset:3px}
@keyframes gatewayGlow{0%,100%{filter:drop-shadow(0 0 4px #42bdd8)}50%{filter:drop-shadow(0 0 9px #86fff0)}}
@media(prefers-reduced-motion:reduce){.enemy-node .wildlife-sprite,.battle-monster .wildlife-sprite,.region-portal .portal-art{animation:none}}
`;
document.head.append(wildlifeStyle);
