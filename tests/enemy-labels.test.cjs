const fs=require('node:fs');
const path=require('node:path');
const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname,'../assets/enemy-labels.js'),'utf8'));
run(`
// Round 84: an enemy 2+ levels above the player gets a red name.
newGame();state.playerLevel=5;
const mk=name=>{const c=new Set();return{dataset:{name},classList:{toggle:(k,v)=>v?c.add(k):c.delete(k),contains:k=>c.has(k)}}};
const nodes=[mk('Tunnel Borehound · Lv.7'),mk('★ ELITE · Cinder Fox · Lv.6'),mk('Rat · Lv.4'),mk('Relic')];
markDangerousEnemies({querySelectorAll:()=>nodes});
assert.deepEqual(nodes.map(n=>n.classList.contains('enemy-overlevel')),[true,false,false,false]);
state.playerLevel=8;markDangerousEnemies({querySelectorAll:()=>nodes});
assert(!nodes[0].classList.contains('enemy-overlevel'),'the warning clears once you catch up');
console.log('PASS: enemies 2+ levels above you are flagged red.');
`);
