// Round 125: every piece of loot on the victory screen is shown as a picture.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();configureRegion('city');
 const lines=['◇ +1 Shards (5 total).','◇ +10 Shards (18 total).','★ Bounty complete — Untouched: +3 Shards.','✧ Vigil: healed 9 HP.','✦ Side deck expanded: room for 6 of 8 side cards.','✦ Side deck card: Verdant Restore — added to your side deck.','Soulbound boss card: Phoenix','Mini-boss defeated: guaranteed Upgrade Crystal! (2 total)','Glacial Covenant: guaranteed Soulbound Ice card. The Elaris portal is now open!','☆ Bounty missed — Overkill (deal 15+ damage with a single card).'];
 const out=lines.map(l=>{const t=lootTileFor(l);return t===null?'text':t===''?'shown':(t.match(/loot-tile loot-(\\w+)/)||[])[1]+':'+/<svg/.test(t)+':'+(t.match(/<b>([^<]*)/)||[])[1]});
 // A win records the cards it added, so covenant and boss cards can be shown as cards.
 state.room='8,4';const boss=roomSpawns(state.room).find(x=>x.boss);startBattle(boss.uid);winBattle();
 const glacial=state.pool.find(c=>c.id==='glacial');
 return JSON.stringify({out,newCards:state.battle.newCards,glacial:glacial&&glacial.uid,potion:/<svg/.test(lootTileHTML('potion','Healing Potion'))})})()`));
assert.deepEqual(r.out,['shards:true:+1 Shard','shards:true:+10 Shards','bounty:true:+3 Shards','heal:true:+9 HP','slot:true:Side deck slot','shown','shown','shown','text','text'],'reward lines become illustrated tiles (or are already shown as a card or crystal)');
assert(r.newCards.includes(r.glacial),'cards won in the fight are tracked so they show as cards');
assert(r.potion,'potions have a picture');
const js=fs.readFileSync(path.join(__dirname,'../assets/pickups.js'),'utf8');
for(const k of ['potion','shards','bounty','heal','xp','level','slot','empty'])assert(new RegExp('\\n  '+k+": '<svg").test(js),'icon for '+k);
console.log('PASS: victory loot shows as pictures: cards, crystals, potions, Shards, bounties, healing, XP, level-ups, side deck slots and empty chests.');
