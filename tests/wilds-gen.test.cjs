'use strict';
// Round 552: Elaris (the forest, region 'wilds') on the generator, theme GEN_THEMES.wilds. On a few seeds:
//  1. no diagonal exits; every room is reached from the start through the straight exits (and the links that stand in for
//     a dropped diagonal);
//  2. up to three lakes, apart from each other, none over the middle of the start room or a boss room;
//  3. every road over a lake is a clean crossing: one bridge, the road going on past the water at both ends, no two bridges
//     within 4 cells of each other (no corner of bridges, no road grazing the shore);
//  4. the generated rooms are painted and walked from the generator (the room's walk mask).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const seeds = [77, 1, 9];
for (const sd of seeds) {
  const r = JSON.parse(run(`(() => { newGame(); state.seed = ${sd}; state.region = 'wilds'; configureRegion('wilds'); cityGenEnsure();
    const T = GEN_THEMES.wilds, seed = chronoSeed(), set = T.rivers(seed), wl = genWith('wilds', () => genWorld(seed));
    const diag = Object.keys(rooms).filter(k => Object.keys(rooms[k].exits || {}).some(d => d.length > 1));
    const start = regionStartRoom(), seen = new Set([start]), q = [start], nb = k => Object.values(rooms[k].exits || {}).concat(Object.keys(rooms).filter(j => Object.values(rooms[j].exits || {}).includes(k))); /* (two-way: the boss gate's door is held back until it opens) */ while (q.length) { const k = q.pop(); for (const t of nb(k)) if (rooms[t] && !seen.has(t)) { seen.add(t); q.push(t); } }
    const lakes = []; { const left = new Set(set); while (left.size) { const k0 = left.values().next().value, st = [k0], g = []; left.delete(k0); while (st.length) { const k = st.pop(), [x, y] = k.split(',').map(Number); g.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (x + dx) + ',' + (y + dy); if (left.has(n)) { left.delete(n); st.push(n); } } } lakes.push(g); } }
    const wetLanding = T.landing().filter(k => { const [x, y] = k.split(',').map(Number); for (let b = 2; b < 8; b++) for (let a = 4; a < 12; a++) if (set.has((x * CG_COLS + a) + ',' + (y * CG_ROWS + b))) return true; return false; });
    const road = (X, Y) => X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH && wl.cell[Y * wl.CW + X] === 2, river = (X, Y) => set.has(Math.floor(X / 2) + ',' + Math.floor(Y / 2));
    const all = []; for (const k of T.keys()) { const [wx, wy] = k.split(',').map(Number); for (const b of genWith('wilds', () => cityBridgeSpans(road, river, wx * FG_COLS, wy * FG_ROWS))) if (!all.some(o => o.x0 === b.x0 && o.y0 === b.y0)) all.push(b); }
    let close = 0; for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j]; if (a.x0 <= b.x1 + 4 && a.x1 >= b.x0 - 4 && a.y0 <= b.y1 + 4 && a.y1 >= b.y0 - 4) close++; }
    // every road cell on the water lies under a bridge
    let bare = 0; for (let Y = 0; Y < wl.CH; Y++) for (let X = 0; X < wl.CW; X++) if (road(X, Y) && river(X, Y) && !all.some(b => X >= b.x0 && X < b.x1 && Y >= b.y0 && Y < b.y1)) bare++;
    const ends = all.filter(b => { const [ax, ay, bx, by] = b.horiz ? [b.x0 - 1, (b.y0 + b.y1) >> 1, b.x1, (b.y0 + b.y1) >> 1] : [(b.x0 + b.x1) >> 1, b.y0 - 1, (b.x0 + b.x1) >> 1, b.y1]; return !(road(ax, ay) || river(ax, ay)) || !(road(bx, by) || river(bx, by)); }).length;
    const live = genLive('wilds') && genTheme() === 'wilds', mask = !!cityRoomMask(...start.split(',').map(Number));
    return JSON.stringify({ rooms: Object.keys(rooms).length, reached: seen.size, diag, lakes: lakes.map(g => g.length), wetLanding, bridges: all.length, close, bare, ends, live, mask, diagTable: Object.keys(worldDiagTable()).length, onGround: itemsOnGround() }); })()`));
  assert.strictEqual(r.live, true, sd + ': Elaris is played on the generator');
  assert.deepStrictEqual(r.diag, [], sd + ': no diagonal exits');
  assert.strictEqual(r.diagTable, 0, sd + ': no diagonal walkways drawn');
  assert.strictEqual(r.reached, r.rooms, sd + ': every room is reached from the start (' + r.reached + '/' + r.rooms + ')');
  assert(r.lakes.length >= 2 && r.lakes.length <= 3 && r.lakes.every(n => n >= 20), sd + ': two or three lakes ' + JSON.stringify(r.lakes));
  assert.deepStrictEqual(r.wetLanding, [], sd + ': the start and boss rooms are dry in the middle');
  assert(r.bridges >= 1, sd + ': a boardwalk over a lake');
  assert.strictEqual(r.close, 0, sd + ': no two bridges meet');
  assert.strictEqual(r.bare, 0, sd + ': every road on the water is under a bridge');
  assert.strictEqual(r.ends, 0, sd + ': every bridge has road (or its own lake) at both ends');
  assert(r.mask, sd + ': rooms walk on the generated mask');
  assert.strictEqual(r.onGround, false, sd + ': objects are placed by the generator\'s rules');
  console.log('seed ' + sd + ': ' + r.rooms + ' rooms, lakes ' + JSON.stringify(r.lakes) + ', ' + r.bridges + ' bridges');
}
console.log('wilds-gen ok');
