// Round 129: the copy count on a deck card opens every copy, with level and mastery, and lets
// you choose which copy goes in the deck and which one to upgrade.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path');
const {run}=require('./expansion.test.cjs');
const r=JSON.parse(run(`(()=>{newGame();
 const a=make('strike');a.uses=40;const s=make('strike');s.soulbound=true;s.level=1;s.uses=masteryUses(s);state.pool.push(a,s);setMaterials(1);
 const list=cardCopies('strike'),order=list.map(c=>(c.soulbound?'S':'I')+c.level);
 // Swap which copy is in the deck: take one out, put the chosen one in.
 const out=list.find(c=>!state.deck.includes(c.uid)),inn=list.find(c=>state.deck.includes(c.uid));
 const removed=removeCopyFromDeck(inn),added=addCopyToDeck(out);
 const lv=s.level,up=upgradeCopy(s),noMore=upgradeCopy(s);
 const lockedImp=upgradeCopy(a);
 let threw=false;try{showCardCopies('strike')}catch(e){threw=e.message}
 return JSON.stringify({order,removed,added,swapped:state.deck.includes(out.uid)&&!state.deck.includes(inn.uid),lv,up,after:s.level,uses:s.uses,mat:materials(),noMore,lockedImp,threw})})()`));
assert.equal(r.order[0],'S1','soulbound and higher-level copies list first');
assert(r.removed&&r.added&&r.swapped,'you choose exactly which copy is in the deck');
assert(r.up&&r.after===r.lv+1&&r.uses===0&&r.mat===0,'upgrading the chosen copy spends a crystal and raises that copy');
assert(!r.noMore,'no second upgrade without mastery and a crystal');
assert(!r.lockedImp,'Impermanent copies upgrade themselves');
assert.equal(r.threw,false,'the copies window opens');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(/badge\.onclick=e=>\{e\.stopPropagation\(\);showCardCopies\(c\.id\)\}/.test(html),'tapping the copy count opens the window');
console.log('PASS: the copy count opens every copy with level and mastery; choose which goes in the deck and which to upgrade.');
// Round 141: destroying a card salvages Shards: 5 x (level + 1).
const sv=JSON.parse(run(`JSON.stringify([0,1,2,3].map(l=>destroySalvage({level:l})))`));
assert.deepEqual(sv,[5,20,50,100],'destroy salvage: 5 / 20 / 50 / 100 Shards by level');
assert(/const salvage=destroySalvage\(victim\);state\.shards=\(state\.shards\|\|0\)\+salvage/.test(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')),'destroying a card adds the Shards');
console.log('PASS: destroying a card gives 5/20/50/100 Shards for Level 0/1/2/3.');
// Round 152: an Impermanent card can be made Soulbound for 500 Shards.
const sb=JSON.parse(run(`(()=>{newGame();const c=make('cleave');c.level=2;c.uses=40;state.pool.push(c);state.shards=499;const poor=soulbindCard(c);state.shards=520;const ok=soulbindCard(c),again=soulbindCard(c);return JSON.stringify({poor,ok,again,soul:c.soulbound,level:c.level,uses:c.uses,shards:state.shards})})()`));
assert.deepEqual(sb,{poor:false,ok:true,again:false,soul:true,level:2,uses:40,shards:20},'500 Shards makes a card Soulbound, keeping its level and mastery; only once');
console.log('PASS: Make Soulbound costs 500 Shards and keeps level and mastery.');
