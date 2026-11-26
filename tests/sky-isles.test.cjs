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
    const buildings = wl.lotsPx.filter(l => l.sprite && l.sprite.slot.startsWith('building-')).length, yards = wl.lotsPx.filter(l => l.use === 'yard').length, noSquare = keys.filter(k => !(wl.plazas[k] && wl.plazas[k].length));
    const start = regionStartRoom(), seen = new Set([start]), q = [start], nb = k => Object.values(rooms[k].exits || {}).concat(Object.keys(rooms).filter(j => Object.values(rooms[j].exits || {}).includes(k)));
    while (q.length) { const k = q.pop(); for (const t of nb(k)) if (rooms[t] && !seen.has(t)) { seen.add(t); q.push(t); } }
    return JSON.stringify({ land: landN / tot, bridges: all.length, bare, close, wetLanding, buildings, yards, noSquare, reached: seen.size, rooms: Object.keys(rooms).length }); })()`));
  assert(r.land < 0.55 && r.land > 0.25, sd + ': more sky than land (' + Math.round(r.land * 100) + '% land)');
  assert(r.bridges >= 20, sd + ': islands joined by bridges (' + r.bridges + ')');
  assert.strictEqual(r.bare, 0, sd + ': every road over the sky is under a bridge');
  assert.strictEqual(r.close, 0, sd + ': no two bridges meet');
  assert.deepStrictEqual(r.wetLanding, [], sd + ': the start and boss rooms stand on an island');
  assert(r.buildings >= 20, sd + ': buildings on the islands (' + r.buildings + ')');
  assert(r.buildings > r.yards, sd + ': more buildings than empty yards (Round 581: yard lots try a building first; ' + r.buildings + ' to ' + r.yards + ')');
  assert(r.noSquare.length <= 3, sd + ': almost every room has a square for its objects (none in ' + r.noSquare.join(' ') + ')');
  assert.strictEqual(r.reached, r.rooms, sd + ': every room is reached');
  console.log('seed ' + sd + ': ' + Math.round(r.land * 100) + '% land, ' + r.bridges + ' bridges, ' + r.buildings + ' buildings, ' + r.yards + ' yards, rooms without a square: ' + (r.noSquare.join(' ') || 'none'));
}
// (Round 583, owner: "theres no beach in sky isles ... create a new rule for sky edges") the Sky Isles are a sky-edge world: an
// island ends at its rail, never a beach; Elaris (which inherits the Sky Isles' settings) keeps its lake shores
assert.strictEqual(JSON.parse(run(`JSON.stringify([GEN_THEMES.sky.skyEdge, GEN_THEMES.sky.plainSea, (GEN_THEMES.sky.isleEdge || []).length > 0, GEN_THEMES.wilds.skyEdge])`)).join(), 'true,true,true,false', 'sky edges: no beach, plain sky, a rail round every island; not in Elaris');
// (Round 584, owner: "the bridge also extends too far onto the road ... only 100px over the edge") a bridge reaches at most 100px
// past the open water or sky on each side: a short crossing drops the extra half section, then the whole bridge is scaled down
{ const f = JSON.parse(run(`JSON.stringify([genBridgeFit(400, 300, 100), genBridgeFit(150, 300, 100), genBridgeFit(50, 300, 100)])`));
  assert(f[0].len === 440 && f[0].f === 1 && f[0].eA === 20 && f[0].eB === 20, 'a long crossing: the whole bridge, landing 20px onto each bank (Round 587) ' + JSON.stringify(f[0]));
  assert(f[1].len <= 150 + 200 && f[1].f === 1, 'a short one: no more than 100px past each side, the ends kept whole ' + JSON.stringify(f[1]));
  assert(f[2].len <= 50 + 200 && f[2].f < 1, 'a very short one: drawn smaller, by one factor ' + JSON.stringify(f[2])); }
// (Round 584, owner: "change the sky edges to clean straight cuts", "corners of the edges don't align") the sky is exactly the cells
// that aren't land (the walk mask too), and the island's edge is the flat deck rim with square, mitred corners
assert.strictEqual(JSON.parse(run(`JSON.stringify([GEN_THEMES.sky.isleEdge, !GEN_THEMES.sky.skyEdgeR])`)).join(), 'waterfront-edge,deck-rim,true', 'sky edges: the deck rim, square corners');
// (Round 587, owner: "lets not have the bridge overlap with other edges as a rule, it can overlap the road") a side reaches only
// along its own road's straight run (no side street), and a bridge is its road's width plus the kerbs
{ const g = JSON.parse(run(`JSON.stringify([genBridgeFit(150, 300, 100, { runA: 1, runB: 8 }), genBridgeWide(50)])`));
  assert(g[0].eA <= 25 && g[0].eB <= 100, 'each side held to its road\'s straight run ' + JSON.stringify(g[0]));
  assert.strictEqual(g[1], 60, 'a bridge is its road plus 5px of kerb each side'); }
console.log('sky-isles ok');
