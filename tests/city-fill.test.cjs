'use strict';
// Round 428: every block of the top-down city is filled (odd corners left by the splitting become lots) and every room is
// scored for bare paving; a city whose worst room is too bare is split again from a new draw. On three seeds: the city is
// at most 20% bare paving and no room more than 35% (it was 29% and up to 54% before), with every room still reachable.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
for (const seed of [77, 4242, 2026]) {
  const r = JSON.parse(run(`(() => { newGame(); state.seed = ${seed}; configureRegion('city'); cityGenEnsure(); return genWith('city', () => { const wl = genWorld(chronoSeed()); let tot = 0, bare = 0, worst = 0, hubsOpen = 0; const keys = Object.keys(CITY_ROOMS);
    for (const k of keys) { const p = cityGenPlan(k), [wx, wy] = GEN.world(k), ox = wx * 800, oy = wy * 500, t = chronoTerrain(chronoSeed(), k); let b = 0;
      for (let y = 5; y < 500; y += 10) for (let x = 5; x < 800; x += 10) { tot++; if (p.floor[Math.floor(y / FG_CELL) * FG_COLS + Math.floor(x / FG_CELL)]) continue; if (wl.lotsPx.some(l => x + ox >= l.r[0] && x + ox < l.r[2] && y + oy >= l.r[1] && y + oy < l.r[3])) continue; if (t.chasm(Math.floor(x / 50), Math.floor(y / 50))) continue; b++; }
      bare += b; worst = Math.max(worst, b / 4000); if (walkable(k, p.hub[0], p.hub[1])) hubsOpen++; }
    return JSON.stringify({ share: bare / tot, worst, score: genWorldScore['city:' + chronoSeed()], hubsOpen, rooms: keys.length }); }); })()`));
  assert(r.share <= 0.2, seed + ': the city is at most 20% bare paving: ' + JSON.stringify(r));
  assert(r.worst <= 0.35, seed + ': no room is more than 35% bare paving: ' + JSON.stringify(r));
  assert(r.score && r.score.worst <= 0.2, seed + ': the generator scored its rooms: ' + JSON.stringify(r));
  assert.strictEqual(r.hubsOpen, r.rooms, seed + ': every room\'s crossing is open');
  console.log(seed + ': ' + Math.round(r.share * 100) + '% bare, worst room ' + Math.round(r.worst * 100) + '%');
}
console.log('PASS: every block filled; rooms scored and the city re-drawn when one is too bare.');
