// Round 169: the Sunwrapped Revenant (Solaris tech mummy) and its Entomb affliction.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{const o={};newGame();state.region='elaris';configureRegion('elaris');
 o.art=monsterArt('sunRevenant');o.aff=ENEMY_AFFLICTIONS.sunRevenant;
 let spawn=null;for(let seed=1;seed<40&&!spawn;seed++){state.seed=seed;spawnCatalog={};for(const k of Object.keys(rooms)){const s=roomSpawns(k).find(x=>x.type==='sunRevenant');if(s){spawn=s;state.room=k;break}}}
 o.spawns=!!spawn;
 state.battle=null;startBattle(spawn.uid);const b=state.battle;o.id=b.id;o.element=b.enemy.element;
 const big=make('cleave'),small=make('strike');b.hand=[small,big];applyHex(b,'entomb');o.target=b.entombed===big.uid;
 b.energy=3;playCard(1);o.blocked=b.hand.includes(big);
 ensureSide&&ensureSide();sideEffect(b,'purify');o.purified=!b.entombed;
 applyHex(b,'entomb');endTurn();o.clearedNextTurn=state.battle!==b||b.entombed!==big.uid||!b.hand.includes(big);
 o.desc=afflictionText('entomb');
 return JSON.stringify(o)})()`));
assert(r.art.includes('pose-sprite') && r.art.includes('has-walk') && r.art.includes('sun-revenant'), 'pose sprite art with the walk loop');
assert(require('fs').existsSync(require('path').join(__dirname, '../assets/monsters/elaris/sun-revenant-walk.png')), 'walk sheet ships');
assert.deepStrictEqual(r.aff, ['entomb']);
assert(r.spawns, 'the Revenant patrols Solaris');
assert.strictEqual(r.id, 'sunRevenant'); assert.strictEqual(r.element, 'earth');
assert(r.target, 'Entomb wraps the strongest card in hand');
assert(r.blocked, 'an entombed card cannot be played');
assert(r.purified, 'Purifying Light unwraps it');
assert(r.clearedNextTurn, 'the wrapping lasts one turn');
assert(/cannot be played/.test(r.desc));
console.log('PASS: Sunwrapped Revenant patrols Solaris; Entomb wraps the strongest card for a turn, Purify clears it.');
