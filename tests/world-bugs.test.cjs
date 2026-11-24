'use strict';
// Round 535: three placement bugs in the generated worlds (the city and Solaris), found by a reviewer.
// 1. Item pads (Round 275, item-reach.js) let the hero walk onto buildings and the sea round an object, and stayed round
//    chests already opened. Generated worlds have no pads; elsewhere an opened chest's pad is gone.
// 2. The object-placement caches in city-gen.js were keyed by seed and room only, and room keys exist in both worlds, so
//    an object could be checked against the other world's buildings. They carry the theme now.
// 3. cityFixSpot kept an object's own spot without looking at the patrols, and an answer worked out from inside
//    roomSpawns (no patrol list) was cached. Off the street an object keeps 70px from every patrol (60px in a room
//    with no such ground, before it goes onto the street).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const harness = require.resolve('./expansion.test.cjs');
const fresh = () => { delete require.cache[harness]; return require(harness).run; };
const SEED = 3;

// --- 1. pads ---
{
  const run = fresh();
  const r = JSON.parse(run(`(() => { newGame(); state.seed = ${SEED}; const out = { gen: {}, sky: null };
  for (const W of ['city', 'elaris']) { state.region = W; configureRegion(W); cityGenEnsure(); let pts = 0, padHits = 0, offGround = [];
    for (const key of Object.keys(rooms)) { state.room = key; const its = []; const c = chestFor(key); if (c) its.push(c); const p = poiAt(key); if (p) its.push(p);
      for (const i of its) for (let a = 0; a < 360; a += 15) for (let d = 8; d <= 72; d += 8) { const x = i.x + d * Math.cos(a * Math.PI / 180), y = i.y + d * Math.sin(a * Math.PI / 180);
        if (x < 12 || x > 788 || y < 12 || y > 488) continue; pts++; if (itemPadAt(key, x, y)) padHits++;
        if (!walkable(key, x, y) && !collides(x, y)) offGround.push(key + '@' + Math.round(x) + ',' + Math.round(y)); } }
    out.gen[W] = { pts, padHits, offGround: offGround.slice(0, 5), n: offGround.length }; }
  // a painted world: an opened chest's pad goes
  state.region = 'wilds'; configureRegion('wilds'); const keys = Object.keys(rooms).filter(k => organicDef(k));
  for (const k of keys) { const c = chestFor(k); if (!c) continue; const others = [poiAt(k), rooms[k].relic && { x: rooms[k].relic[3], y: rooms[k].relic[4] }].filter(Boolean);
    if (others.some(o => Math.hypot(o.x - c.x, o.y - c.y) < 140)) continue; state.room = k;
    const before = itemPadAt(k, c.x, c.y); state.chests.push(c.id); const after = itemPadAt(k, c.x, c.y); state.chests = state.chests.filter(id => id !== c.id);
    out.sky = { k, before, after }; break; }
  return JSON.stringify(out); })()`));
  for (const [W, g] of Object.entries(r.gen)) {
    assert(g.pts > 1000, W + ': points round the objects were checked');
    assert.strictEqual(g.padHits, 0, W + ': no item pads in a generated world');
    assert.deepStrictEqual(g.offGround, [], W + ': every unwalkable point round an object blocks the hero (' + g.n + ' did not)');
  }
  assert(r.sky, 'a chest alone in its room in a tile world (Elaris; Round 548: the Sky Isles are generated, with no pads)');
  assert.strictEqual(r.sky.before, true, 'an unopened chest keeps its pad');
  assert.strictEqual(r.sky.after, false, 'an opened chest has no pad');
}

// --- 2. the caches carry the world ---
{
  const check = (run, first, second) => JSON.parse(run(`(() => { newGame(); state.seed = ${SEED};
  const go = W => { state.region = W; configureRegion(W); cityGenEnsure(); };
  const items = key => { const its = []; const c = chestFor(key); if (c) its.push(['chest', c]); const p = poiAt(key); if (p) its.push([p.type, p]);
    const m = merchantRoom(); if (m && m.key === key) its.push(['merchant', m]); const s = cardsmithFor(); if (s && s.key === key) its.push(['cardsmith', s]);
    if (typeof cityNightsItems === 'function' && activeRegion === 'city') for (const it of cityNightsItems(key)) its.push([it.type, it]); return its; };
  go('${first}'); for (const k of Object.keys(rooms)) items(k);
  go('${second}'); const th = genTheme(), bad = [];
  for (const key of Object.keys(rooms)) { const boxes = genWith(th, () => citySpriteBoxes(String(state.seed), key, cityGenPlan(key)));
    for (const [k, i] of items(key)) { const b = cityItemBox({ x: i.x, y: i.y, type: i.type || k, event: i.event }, i.type || k);
      const hit = boxes.filter(q => !q.kind.startsWith('edge:') && b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
      if (hit.length) bad.push(key + ' ' + k + ' overlaps ' + hit.map(h => h.kind).join(',')); } }
  return JSON.stringify(bad); })()`));
  assert.deepStrictEqual(check(fresh(), 'city', 'elaris'), [], 'Solaris objects after the city\'s were placed: clear of Solaris\'s sprites');
  assert.deepStrictEqual(check(fresh(), 'elaris', 'city'), [], 'city objects after Solaris\'s were placed: clear of the city\'s sprites');
}

// --- 3. objects keep 70px from patrols ---
{
  // a point of interest handed a spot that is good in every other way (open ground, clear of sprites, the HUD and the
  // margin, reachable) but 20-55px from a patrol is moved 60px or more away (it used to be kept as it was)
  const run = fresh();
  const r = JSON.parse(run(`(() => { const out = [];
    for (const W of ['elaris', 'city']) { newGame(); state.seed = ${SEED}; state.region = W; configureRegion(W); cityGenEnsure(); let tried = 0;
      for (const key of Object.keys(rooms)) { const p = poiAt(key), sp = roomSpawns(key); if (!p || !sp.length || tried >= 6) continue;
        let S = null;
        for (let cy = 72; cy <= 440 && !S; cy += 8) for (let cx = 64; cx <= 736 && !S; cx += 8) { const d = Math.min(...sp.map(q => Math.hypot(q.x - cx, q.y - cy)));
          if (d < 20 || d > 55 || !walkable(key, cx, cy) || cityItemOnStreet(key, cx, cy) || !cityItemSpotClear(key, cx, cy, p) || !organicReachableAt(key, { x: cx, y: cy })
            || [[0, 0], [-12, -12], [12, -12], [-12, 24], [12, 24]].some(([a, b]) => screenCovered(cx + a, cy + b))) continue;
          S = [cx, cy]; }
        if (!S) continue; tried++; p.x = S[0]; p.y = S[1]; delete p.cityClear;
        const q = poiAt(key); if (q !== p) continue;
        out.push([W + ' ' + key, S.join(','), Math.round(q.x) + ',' + Math.round(q.y), Math.round(Math.min(...sp.map(s => Math.hypot(s.x - q.x, s.y - q.y))))]); } }
    return JSON.stringify(out); })()`));
  assert(r.length >= 4, 'points of interest were tried (' + r.length + ')');
  for (const [k, S, at, d] of r) assert(d >= 60, k + ': a point of interest handed ' + S + ' stays at ' + at + ', ' + d + 'px from a patrol');
  // and in every room of both worlds, as placed
  const all = JSON.parse(fresh()(`(() => { const bad = [];
    for (const W of ['city', 'elaris']) { newGame(); state.seed = ${SEED}; state.region = W; configureRegion(W); cityGenEnsure();
      for (const key of Object.keys(rooms)) { const sp = roomSpawns(key), its = []; const c = chestFor(key); if (c) its.push(['chest', c]); const p = poiAt(key); if (p) its.push([p.type, p]);
        const m = merchantRoom(); if (m && m.key === key) its.push(['merchant', m]); const s = cardsmithFor(); if (s && s.key === key) its.push(['cardsmith', s]);
        for (const [k, i] of its) for (const q of sp) if (Math.hypot(q.x - i.x, q.y - i.y) < 70) bad.push(W + ' ' + key + ' ' + k + ' near ' + q.type); } }
    return JSON.stringify(bad); })()`));
  assert.deepStrictEqual(all, [], 'no object within 70px of a patrol');
}
console.log('PASS: no item pads in the generated worlds and none round opened chests; object placement is kept per world; objects keep their distance from patrols.');
