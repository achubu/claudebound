'use strict';
// Round 354: drawing the world never writes to the save, so a save reloads unchanged whatever the seed puts in the room.
process.env.HARNESS_ONLY = '1';
const fs=require('node:fs');const {run}=require('./expansion.test.cjs');
run(fs.readFileSync(require('path').join(__dirname,'../assets/combined-rooms.js'),'utf8'));
let bad=0;
for (let s=0;s<12;s++) for (const region of ['city','elaris','vespera']) {
run(`newGame();state.seed=${s*7919+13};state.mechGifts={'${region}':true};state.region='${region}';configureRegion(state.region);state.room=state.region==='city'?'3,7':'1,1';state.pos={x:400,y:280};if(organicDef(state.room)&&!walkable(state.room,400,280))state.pos=organicSpot(state.room,400,280);state.visited=[state.room];save();`);
const a=run('JSON.stringify(state)');run('state=null;load()');const b=run('JSON.stringify(state)');
if(a!==b){bad++;const A=JSON.parse(a),B=JSON.parse(b);for(const k of new Set([...Object.keys(A),...Object.keys(B)]))if(JSON.stringify(A[k])!==JSON.stringify(B[k]))console.log(s,region,k);}
}
require('assert').strictEqual(bad,0,'saves change when only reloaded'); console.log('save-stable ok');
