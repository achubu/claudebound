// Round 176: gear. Two pieces per world, five slots, small boosts, the Gear screen, saves.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{const o={};newGame();
 o.ids=Object.keys(GEAR);o.perWorld=WORLD_ORDER.map(w=>gearOf(w).length);o.slots=[...new Set(Object.values(GEAR).map(g=>g.slot))].sort();
 o.stats=[...new Set(Object.values(GEAR).map(g=>g.stat))].sort();
 // Boosts
 const base=JSON.parse(JSON.stringify(state));
 state.relics=Object.keys(GEAR);ensureGear();o.emptyAtFirst=wornGear().length===0;
 const hp0=state.maxHp;equipGear('shirt','timewornShirt');o.hp=state.maxHp-hp0;equipGear('shirt','');o.hpOff=state.maxHp-hp0;
 equipGear('boots','boots');o.armor=scaledRank('plating');
 equipGear('gloves','ember');equipGear('belt','scarabBelt');equipGear('pants','galeweavePants');
 const b={turn:1,enemy:{armor:0}};o.flatStrike=talentMatrix.flatDamage({uid:1},{damage:5},b);o.flatFire=talentMatrix.flatDamage({uid:1},{damage:5,element:'fire'},b);o.flatBlock=talentMatrix.flatDamage({uid:1},{block:5},b);
 o.pierce=talentMatrix.armorIgnore(b);
 equipGear('gloves','boots');o.wrongSlot=state.gear.gloves;
 // Free cleanse in battle
 equipGear('boots','cloudstepBoots');state.room='1,5';const s=roomSpawns('1,5').find(x=>!x.boss);startBattle(s.uid);const bt=state.battle;bt.frail=2;bt.enemyDebuffs=bt.enemyDebuffs;o.left=gearCleansesLeft(bt);useGearCleanse();o.leftAfter=gearCleansesLeft(bt);o.log=bt.logs.join(' ');
 o.lockedInFight=(()=>{const before=state.gear.boots;equipGear('boots','boots');return state.gear.boots===before})();
 state.battle=null;
 // Saves: gear survives a round trip; junk is rejected; a slot holding gear you don't own is emptied
 save();state=null;load();o.kept=state.gear.boots==='cloudstepBoots'&&state.gear.belt==='scarabBelt';
 const bad=JSON.parse(JSON.stringify(state));bad.gear='x';try{validateImport(bad);o.junk='accepted'}catch(e){o.junk='rejected'}
 const odd=JSON.parse(JSON.stringify(state));odd.relics=['ember'];odd.gear={gloves:'ember',boots:'cloudstepBoots',shirt:'nope'};const v=validateImport(odd);o.cleaned=JSON.stringify(v.gear);
 // Old save: Ember Sigil + Briarstep Boots carry over as gear and open the city's boss door; the taken crystal's chest is open
 const old=JSON.parse(JSON.stringify(base));delete old.gear;old.relics=['ember','boots','lens'];old.cleared=['material'];old.chests=[];localStorage.setItem('aethercede-expansion-v3',JSON.stringify(old));state=null;load();
 o.oldGate=hasRelic('gate:city');o.oldChest=state.chests.includes('city:4,4');o.oldWorn=wornGear().length;
 // A beaten world boss opens its door even without that world's gear (saves from before gear)
 state.bosses.push('bloomTyrant');o.bossOpens=hasRelic('gate:elaris');
 // Gear screen
 showGear();o.menu=document.getElementById('menuModal').innerHTML||'';
 return JSON.stringify(o)})()`));
assert.strictEqual(r.ids.length, 12); assert.deepStrictEqual(r.perWorld, [2, 2, 2, 2, 2, 2], 'two pieces per world');
assert.deepStrictEqual(r.slots, ['belt', 'boots', 'gloves', 'pants', 'shirt']);
assert.deepStrictEqual(r.stats, ['armor', 'attack', 'cleanse', 'elemental', 'health', 'pierce']);
for (const id of r.ids) assert(fs.existsSync(path.join(__dirname, '../assets/items/gear', id + '.png')), id + ' icon ships');
assert(r.emptyAtFirst, 'old relics are carried but nothing is worn until equipped');
assert.strictEqual(r.hp, 12, 'Timeworn Shirt +12 max HP'); assert.strictEqual(r.hpOff, 0, 'and it comes off again');
assert.strictEqual(r.armor, 1, 'Briarstep Boots +1 Armor');
assert.strictEqual(r.flatStrike, 1, 'Ember Gloves +1 on attacks'); assert.strictEqual(r.flatFire, 2, 'Galeweave Pants +1 more on elemental attacks'); assert.strictEqual(r.flatBlock, 0, 'no damage boost on non-attacks');
assert.strictEqual(r.pierce, 1, 'Scarab Belt Pierce 1');
assert.strictEqual(r.wrongSlot, 'ember', 'a piece only goes in its own slot');
assert.strictEqual(r.left, 1); assert.strictEqual(r.leftAfter, 0, 'one free cleanse per fight'); assert(/Gear cleanse/.test(r.log));
assert(r.lockedInFight, 'gear cannot change mid-fight');
assert(r.kept, 'worn gear survives save and load');
assert.strictEqual(r.junk, 'rejected');
assert.deepStrictEqual(JSON.parse(r.cleaned), { boots: null, shirt: null, pants: null, belt: null, gloves: 'ember' }, 'unowned or unknown gear is taken off');
assert(r.oldGate, 'an old save with the Ember Sigil and Briarstep Boots opens the Warden\'s Crown');
assert(r.oldChest, 'the hidden crystal already taken leaves its new chest open');
assert(r.bossOpens, 'a beaten world boss keeps its door open');
assert(/Gear collection/.test(r.menu) && /Ember Gloves/.test(r.menu) && /data-gear-slot="boots"/.test(r.menu), 'the Gear screen lists slots and the collection');
console.log('PASS: 12 gear pieces (2 per world) in 5 slots: boosts, one free cleanse, equip rules, saves, old-save carry-over and the Gear screen.');
