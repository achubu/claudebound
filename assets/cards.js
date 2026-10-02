// Extracted from index.html (Round 37) so an external page (compendium.html)
// can read card data via a shared <script src>, without needing access to
// index.html's own inline script scope. Loaded before index.html's main
// inline script, so `defs` is a plain global by the time anything else
// references it -- nothing about how the game itself uses `defs` changed,
// only where it's declared. expansion.js's addCard() still extends this
// same object afterward exactly as before.
const defs={
 strike:{name:'Ember Blade',cost:1,kind:'Attack',icon:'⚔',tiers:[{damage:6},{damage:9},{damage:12},{damage:16}]},
 guard:{name:'Crystal Ward',cost:1,kind:'Defense',icon:'◈',tiers:[{block:5},{block:7},{block:9},{block:12}]},
 focus:{name:'Starlit Focus',cost:0,kind:'Skill',icon:'✦',exhaust:true,tiers:[{draw:2},{draw:2,block:2},{draw:3,block:2},{draw:3,block:3,energy:1}]},
 cleave:{name:'Sundering Arc',cost:2,kind:'Attack',icon:'☄',tiers:[{damage:13},{damage:17},{damage:21},{damage:26}]},
 riposte:{name:'Silver Riposte',cost:1,kind:'Attack',icon:'⟡',tiers:[{damage:4,block:3},{damage:5,block:4},{damage:7,block:5},{damage:9,block:7}]},
 bastion:{name:'Winter Bastion',cost:2,kind:'Defense',icon:'❄',tiers:[{block:11},{block:14},{block:17},{block:21}]},
 mend:{name:'Bloom of Life',cost:0,kind:'Healing',icon:'❀',exhaust:true,tiers:[{heal:7},{heal:9},{heal:12},{heal:16}]},
 spark:{name:'Astral Needle',cost:0,kind:'Attack',icon:'✧',exhaust:true,tiers:[{damage:3},{damage:4},{damage:6},{damage:8}]},
 shatter:{name:'Shatter Lance',cost:2,kind:'Attack',icon:'⚒',pierce:true,tiers:[{damage:10},{damage:13},{damage:16},{damage:20}]},
 phoenix:{name:'Phoenix Covenant',cost:2,kind:'Soulbound Attack',icon:'♨',soulbound:true,tiers:[{damage:14,heal:2},{damage:17,heal:3},{damage:21,heal:4},{damage:26,heal:6}]},
 oath:{name:'Oath of the First Star',cost:2,kind:'Soulbound Defense',icon:'✵',soulbound:true,tiers:[{block:14,draw:1},{block:17,draw:1},{block:20,draw:2},{block:25,draw:2}]},
 verdict:{name:'Eternal Verdict',cost:3,kind:'Soulbound Attack',icon:'⚜',soulbound:true,tiers:[{damage:24},{damage:29},{damage:35},{damage:43}]}
};
// Moved alongside `defs` (Round 37) so compendium.html can generate the
// exact same card text the game itself shows, instead of a separate page
// guessing at a description format that doesn't actually exist on `defs`
// entries (there's no flat description string -- the real effect lives
// in `tiers`, and `rules()` is what turns that into readable text).
const stat=c=>({...defs[c.id],...defs[c.id].tiers[c.level]});
function rules(c){const d=stat(c),p=[];if(d.damage)p.push('Deal '+d.damage+' damage.'+(d.pierce?' Pierce: ignores enemy armor.':''));if(d.block)p.push('Gain '+d.block+' block.');if(d.heal)p.push('Heal '+d.heal+' HP.');if(d.draw)p.push('Draw '+d.draw+'.');if(d.energy)p.push('Gain '+d.energy+' energy.');if(d.exhaust)p.push('Exhaust.');return p.join(' ')}
function cardArtPath(id,level){return 'assets/cards/level'+level+'/'+id+'.png'}
// `const`/function declarations at top level create lexical globals
// (plain `defs`/`stat`/`rules`/`cardArtPath` all work fine from index.
// html's own inline script, in the same document) but do NOT create
// `window.X` properties -- and compendium.html's own detection script
// only checks `window.X` names. Explicitly mirroring these onto `window`
// is what actually makes them visible to that page. Guarded for the test
// harness, which has no `window` at all.
if(typeof window!=='undefined'){window.defs=defs;window.stat=stat;window.rules=rules;window.cardArtPath=cardArtPath}
