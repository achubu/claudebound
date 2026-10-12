const {context, run, playOneFight} = require('./playtest.js');

function batch(finderFn, deckIds, cardLevel, talents, n) {
  let w = 0, hpSum = 0, aborted = 0;
  for (let i = 0; i < n; i++) {
    run(`newGame();configureRegion('city');`);
    const found = run(`(function(){${finderFn}})()`);
    if (!found) { aborted++; continue; }
    const [spawnUid, roomKey] = found.split('||');
    const r = playOneFight(spawnUid, roomKey, deckIds, cardLevel, talents);
    if (r.aborted) { aborted++; continue; }
    if (r.won) w++;
    hpSum += r.hpLeft || 0;
  }
  return { win: (w / n * 100).toFixed(1), avgHp: (hpSum / n).toFixed(1), aborted };
}

const starterDeck = ['strike','strike','strike','guard','guard','focus'];
const midDeck = ['strike','strike','cleave','guard','riposte','focus'];
const lateDeck = ['strike','cleave','cleave','riposte','bastion','shatter'];

const finderNear = `const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>!s.boss&&regionDistance(k)<=1));if(!key)return null;const s=roomSpawns(key).find(s=>!s.boss);return s.uid+'||'+key;`;
const finderD2   = `const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>!s.boss&&regionDistance(k)===2));if(!key)return null;const s=roomSpawns(key).find(s=>!s.boss);return s.uid+'||'+key;`;
const finderD34  = `const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>!s.boss&&regionDistance(k)>=3&&regionDistance(k)<=4));if(!key)return null;const s=roomSpawns(key).find(s=>!s.boss);return s.uid+'||'+key;`;
const finderD5   = `const key=Object.keys(rooms).find(k=>roomSpawns(k).some(s=>!s.boss&&regionDistance(k)===5));if(!key)return null;const s=roomSpawns(key).find(s=>!s.boss);return s.uid+'||'+key;`;

const N = process.argv[2] ? parseInt(process.argv[2]) : 40;
const t0 = Date.now();
console.log('=== Tier A (distance 0-1): fresh Level-0 starter deck ===');
console.log(batch(finderNear, starterDeck, 0, {}, N), Date.now()-t0, 'ms');

console.log('=== Tier B (distance 2): starter deck STILL level 0 ===');
console.log(batch(finderD2, starterDeck, 0, {}, N), Date.now()-t0, 'ms');

console.log('=== Tier C (distance 3-4): starter deck level 0 (expect: hard/losing) ===');
console.log(batch(finderD34, starterDeck, 0, {}, N), Date.now()-t0, 'ms');

console.log('=== Tier C (distance 3-4): mid deck, card level 1 (expect: modest leveling helps) ===');
console.log(batch(finderD34, midDeck, 1, {}, N), Date.now()-t0, 'ms');

console.log('=== Tier D (distance 5): late deck, card level 2 (expect: hard but winnable) ===');
console.log(batch(finderD5, lateDeck, 2, {}, N), Date.now()-t0, 'ms');

console.log('=== Tier D (distance 5): starter deck level 0 (expect: near-unwinnable) ===');
console.log(batch(finderD5, starterDeck, 0, {}, N), Date.now()-t0, 'ms');
