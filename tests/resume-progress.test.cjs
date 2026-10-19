const {run}=require('./expansion.test.cjs');
run(`{
// Round 171: the start button must run the full newGame chain, so a resumed
// journey keeps its Neon Aftermath room and explored map.
$('newBtn').onclick();assert.equal(state.cityWorld,1,'new games are marked as the current map');
const next=Object.values(rooms['0,5'].exits)[0];state.room=next;state.visited.push(next);state.pos={x:400,y:250};save();
assert.equal(JSON.parse(localStorage.getItem('aethercede-expansion-v3')).cityWorld,1,'the save carries the mark');
state=null;$('resumeBtn').onclick();
assert.equal(state.room,next,'resume keeps the room');assert(state.visited.includes(next),'resume keeps the explored map');
console.log('PASS: the start and resume buttons keep Neon Aftermath progress across a reload.');
}`);
