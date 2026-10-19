// Round 175: the Sky Isles (world 3) and Elaris (world 4) are tile-built like Solaris.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{newGame();const o={order:WORLD_ORDER.slice(),worlds:{}};
 for(const id of ['sky','wilds','vespera','chronospire']){state.region=id;configureRegion(id);const w={rooms:Object.keys(rooms).length,errors:[],bosses:[],offPath:[],tiles:[],levels:[]};
  for(const k of Object.keys(rooms)){let list=[];try{list=roomSpawns(k)}catch(e){w.errors.push(k+' '+e.message)}
   for(const s of list){if(s.boss)w.bosses.push(s.type);if(!NeonCity.blocked||NeonCity.blocked(k,s.x,s.y))w.offPath.push(k+' '+s.type)}
   w.tiles.push(TILE_WORLD_DATA[id].plan[k][0]);if(rooms[k].level)w.levels.push(rooms[k].level)}
  w.startSafe=roomSpawns(TILE_REGIONS[id].start).length===0;
  w.quiet=QUIET_ROOMS[id].map(k=>roomSpawns(k).length);w.events=EVENT_POOLS[id].every(e=>EVENTS[e]);w.lore=LORE[id].length;
  o.worlds[id]=w}
 const hop=[];const go=(region,room,boss)=>{state.region=region;configureRegion(region);state.room=room;if(boss)state.bosses.push(boss);const t=portalTarget();hop.push(region+'>'+(t?t.region:'none'))};
 go('elaris',SOLARIS_BOSS_ROOM,'bloomTyrant');go('sky',WORLD_BOSS_ROOMS.sky[0],'zenithRoc');go('wilds',WORLD_BOSS_ROOMS.wilds[0],'elarisTyrant');
 go('sky',TILE_REGIONS.sky.start);go('wilds',TILE_REGIONS.wilds.start);go('vespera',TILE_REGIONS.vespera.start);go('vespera',WORLD_BOSS_ROOMS.vespera[0],'stormTyrant');go('chronospire',TILE_REGIONS.chronospire.start);o.hops=hop;
 o.names=[enemies.zenithRoc.name,enemies.elarisTyrant.name,enemies.elarisFox.name];o.art=monsterArt('elarisFox');o.skyArt=monsterArt('skyDrake');o.skyAll=['skyDrake','skyWisp','skyHarpy','skyRam','stormbellWarden','featherMatriarch','zenithRoc'].map(id=>monsterArt(id));
 state.region='wilds';configureRegion('wilds');o.objective=objective();
 state.region='chronospire';configureRegion('chronospire');o.spire=[1+Math.max(...Object.values(rooms).map(x=>x.world[0])),1+Math.max(...Object.values(rooms).map(x=>x.world[1]))];
 return JSON.stringify(o)})()`));
assert.deepStrictEqual(r.order, ['city', 'elaris', 'sky', 'wilds', 'vespera', 'chronospire']);
for (const [id, w] of Object.entries(r.worlds)) {
  assert.strictEqual(w.rooms, id === 'sky' ? 51 : 54, id + ' room count (Round 197: the Sky Isles cut three for diagonals)');
  assert.deepStrictEqual(w.errors, [], id + ' every room places its enemies');
  assert.deepStrictEqual(w.offPath, [], id + ' enemies stand on the path');
  assert.strictEqual(w.bosses.length, 3, id + ' has two mini-bosses and a final boss');
  assert(w.startSafe, id + ' start room is safe');
  assert(w.quiet.every(n => n === 0) && w.quiet.length === 3, id + ' quiet rooms are quiet');
  assert(w.events && w.lore === 5);
  for (const t of new Set(w.tiles)) assert(fs.existsSync(path.join(__dirname, '../assets/environment', id, t + '.webp')), id + ' tile ' + t + ' ships');
}
assert.deepStrictEqual([Math.min(...r.worlds.sky.levels), Math.max(...r.worlds.sky.levels)], [19, 27]);
assert.deepStrictEqual([Math.min(...r.worlds.wilds.levels), Math.max(...r.worlds.wilds.levels)], [28, 36]);
assert.deepStrictEqual(r.hops, ['elaris>sky', 'sky>wilds', 'wilds>vespera', 'sky>elaris', 'wilds>sky', 'vespera>wilds', 'vespera>chronospire', 'chronospire>vespera'], 'portal chain');
// Round 179: Vespera and Chronospire are tile-built too; Chronospire is a tall 6x9 spire.
assert.deepStrictEqual([Math.min(...r.worlds.vespera.levels), Math.max(...r.worlds.vespera.levels)], [37, 45]);
assert.deepStrictEqual([Math.min(...r.worlds.chronospire.levels), Math.max(...r.worlds.chronospire.levels)], [46, 54]);
assert.deepStrictEqual(r.spire, [6, 9], 'Chronospire is 6 rooms wide and 9 tall');
assert.deepStrictEqual(r.names, ['The Zenith Roc', 'The Bloom Tyrant', 'Cinder Fox']);
assert(r.art.includes('cinder-fox.png') && !r.art.includes('filter:hue'), 'Elaris shows the forest sprites untinted');
// Round 196: the Sky Isles creatures have their own untinted sheets in assets/monsters/sky/.
assert(r.skyArt.includes('assets/monsters/sky/sunfeather-drake.png') && !r.skyArt.includes('hue-rotate'), 'sky enemies use their own art, untinted');
for (const html of r.skyAll) { const m = html.match(/monsters\/(sky\/[a-z-]+)\.png/); assert(m, 'own sky sheet: ' + html.slice(0, 120)); const png = require('fs').readFileSync(require('path').join(__dirname, '../assets/' + 'monsters/' + m[1] + '.png')); const w = png.readUInt32BE(16), h = png.readUInt32BE(20); assert(w % 4 === 0 && Math.abs(w / 4 / h - .75) < .02, m[1] + ' has four 3:4 frames'); }
assert(r.skyAll[6].includes('bloom-tyrant'), 'the Zenith Roc is drawn in the big boss box');
assert(/portal to Vespera/.test(r.objective), 'after the Bloom Tyrant, Elaris points to Vespera');
console.log('PASS: Sky Isles, Elaris, Vespera and Chronospire are tile worlds (51 or 54 rooms) with their own rosters, levels and portals.');
