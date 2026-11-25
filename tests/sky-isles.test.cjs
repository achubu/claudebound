'use strict';
// Round 553 (owner: "sky isles needs to be more sky than land ... buildings need to be floating in the clouds with land
// bridges and some open areas and space for interactable objects"): the generated Sky Isles are floating islands in open
// sky. On a few seeds:
//  1. more sky than land: under 55% of the rooms' ground is island;
//  2. every road over the sky lies under a bridge, and no two bridges meet;
//  3. the start and boss rooms stand on an island at their middle;
//  4. buildings stand on the islands (some dozens), and almost every room has a square for its objects;
//  5. every room is still reached from the start.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
for (const sd of [77, 1, 9]) {
  const r = JSON.parse(run(`(() => { newGame(); state.seed = ${sd}; state.region = 'sky'; configureRegion('sky'); cityGenEnsure();
    const T = GEN_THEMES.sky, seed = chronoSeed(), set = T.rivers(seed), wl = genWith('sky', () => genWorld(seed)), keys = T.keys();
    let landN = 0, tot = 0; for (const k of keys) { const [x, y] = k.split(',').map(Number); for (let b = 0; b < CG_ROWS; b++) for (let a = 0; a < CG_COLS; a++) { tot++; if (!set.has((x * CG_COLS + a) + ',' + (y * CG_ROWS + b))) landN++; } }
    const road = (X, Y) => X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH && wl.cell[Y * wl.CW + X] === 2, sky = (X, Y) => set.has(Math.floor(X / 2) + ',' + Math.floor(Y / 2));
    const all = []; for (const k of keys) { const [wx, wy] = k.split(',').map(Number); for (const b of genWith('sky', () => cityBridgeSpans(road, sky, wx * FG_COLS, wy * FG_ROWS))) if (!all.some(o => o.x0 === b.x0 && o.y0 === b.y0)) all.push(b); }
    let bare = 0; for (let Y = 0; Y < wl.CH; Y++) for (let X = 0; X < wl.CW; X++) if (road(X, Y) && sky(X, Y) && !all.some(b => X >= b.x0 && X < b.x1 && Y >= b.y0 && Y < b.y1)) bare++;
    let close = 0; for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j]; if (a.x0 <= b.x1 + 2 && a.x1 >= b.x0 - 2 && a.y0 <= b.y1 + 2 && a.y1 >= b.y0 - 2) close++; }
    const wetLanding = T.landing().filter(k => { const [x, y] = k.split(',').map(Number); return set.has((x * CG_COLS + 8) + ',' + (y * CG_ROWS + 5)); });
    const buildings = wl.lotsPx.filter(l => l.sprite && l.sprite.slot.startsWith('building-')).length, noSquare = keys.filter(k => !(wl.plazas[k] && wl.plazas[k].length));
    const start = regionStartRoom(), seen = new Set([start]), q = [start], nb = k => Object.values(rooms[k].exits || {}).concat(Object.keys(rooms).filter(j => Object.values(rooms[j].exits || {}).includes(k)));
    while (q.length) { const k = q.pop(); for (const t of nb(k)) if (rooms[t] && !seen.has(t)) { seen.add(t); q.push(t); } }
    return JSON.stringify({ land: landN / tot, bridges: all.length, bare, close, wetLanding, buildings, noSquare, reached: seen.size, rooms: Object.keys(rooms).length }); })()`));
  assert(r.land < 0.55 && r.land > 0.25, sd + ': more sky than land (' + Math.round(r.land * 100) + '% land)');
  assert(r.bridges >= 20, sd + ': islands joined by bridges (' + r.bridges + ')');
  assert.strictEqual(r.bare, 0, sd + ': every road over the sky is under a bridge');
  assert.strictEqual(r.close, 0, sd + ': no two bridges meet');
  assert.deepStrictEqual(r.wetLanding, [], sd + ': the start and boss rooms stand on an island');
  assert(r.buildings >= 20, sd + ': buildings on the islands (' + r.buildings + ')');
  assert(r.noSquare.length <= 3, sd + ': almost every room has a square for its objects (none in ' + r.noSquare.join(' ') + ')');
  assert.strictEqual(r.reached, r.rooms, sd + ': every room is reached');
  console.log('seed ' + sd + ': ' + Math.round(r.land * 100) + '% land, ' + r.bridges + ' bridges, ' + r.buildings + ' buildings, rooms without a square: ' + (r.noSquare.join(' ') || 'none'));
}
console.log('sky-isles ok');
