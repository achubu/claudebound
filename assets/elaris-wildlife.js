'use strict';
// Four-frame generated wildlife sheets. Elements are part of each species' identity.
const ELARIS_WILDLIFE={
 cinderFox:{name:'Cinder Fox',icon:'♨',hp:38,attack:7,element:'fire',sheet:'cinder-fox',cycle:'.95s'},
 drownedHeron:{name:'Drowned Heron',icon:'≈',hp:55,attack:9,element:'water',sheet:'drowned-heron',cycle:'1.4s'},
 blightAntler:{name:'Blight Antler',icon:'◆',hp:44,attack:8,element:'earth',sheet:'blight-antler',cycle:'1.2s'},
 stormMoth:{name:'Storm Moth',icon:'≋',hp:52,attack:9,element:'air',sheet:'storm-moth',cycle:'.7s'},
 // Round 22 mini-bosses: reuse an existing species' sprite sheet under a
 // new id/name/boss-tier stat block — same "new identity, borrowed art"
 // pattern as the city's crownSentinel.
 tidewardenElaris:{name:'The Tidebound Warden',icon:'≈',hp:70,attack:11,armor:3,element:'water',sheet:'drowned-heron',cycle:'1.4s',boss:true,miniBoss:true},
 galeSovereign:{name:'The Gale Sovereign',icon:'≋',hp:66,attack:11,armor:3,element:'air',sheet:'storm-moth',cycle:'.7s',boss:true,miniBoss:true}
};
Object.assign(enemies,ELARIS_WILDLIFE);
const cityMonsterArt=monsterArt;
monsterArt=function(id){const animal=ELARIS_WILDLIFE[id];if(!animal)return cityMonsterArt(id);return '<span class="monster-sprite wildlife-sprite" role="img" aria-label="'+animal.name+'" style="background-image:url(assets/monsters/elaris/'+animal.sheet+'.png);--wildlife-cycle:'+animal.cycle+'"></span>'};
const wildlifeStyle=document.createElement('style');
wildlifeStyle.textContent=`
.enemy-node .wildlife-sprite,.battle-monster .wildlife-sprite{display:block;background-repeat:no-repeat;background-size:400% 100%;background-position:0 0;image-rendering:pixelated;animation:wildlifeFrames var(--wildlife-cycle,1s) steps(1,end) infinite;transform:scaleX(var(--enemy-facing,1));transform-origin:center;filter:drop-shadow(0 5px 3px #0009)}
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
