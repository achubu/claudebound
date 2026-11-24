// Round 536: browser checks for the Solaris travel stall and failed art (Codex's worldgen review, findings 2 and 3).
//   python3 -m http.server 8123 &   then   node tests/travel-stall.cjs
// 1. In God Mode every room is explored. Arriving in Solaris used to build all 51 map tiles for the minimap, and redraw
//    the whole map once for every tile that finished loading. Only the rooms around the window may be built now, and
//    the redraws are merged.
// 2. A room whose art fails to load (one picture refused) is still painted, instead of waiting for ever.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
let fails = 0; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  const open = async block => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    if (block) await ctx.route(block, r => r.abort());
    const page = await ctx.newPage(); page.setDefaultTimeout(0); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
    await page.goto('http://localhost:8123/index.html'); await page.waitForTimeout(800);
    await page.click('#newBtn'); await page.waitForTimeout(300);
    return page;
  };
  const frames = n => new Promise(res => { let i = 0; const f = () => (++i > n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // 1
  let page = await open();
  const r = await page.evaluate(async frames => {
    state.seed = 9; cityGenEnsure(); configureRegion('city'); renderWorld(); enterGodMode(); save();
    const n = { redraw: 0, tiles: new Set() }; const D = drawMapTerrain, C = chronoMapTile;
    drawMapTerrain = function () { n.redraw++; return D.apply(this, arguments); };
    chronoMapTile = function (k) { n.tiles.add(k); return C.apply(this, arguments); };
    const t0 = performance.now(); nexusTravel('elaris', '4,2'); const travel = performance.now() - t0;
    await new Promise(res => { let i = 0; const f = () => (++i > 30 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    return { travel, redraw: n.redraw, tiles: n.tiles.size, region: activeRegion, room: state.room, explored: state.visited.length };
  });
  console.log(JSON.stringify(r));
  check(r.region === 'elaris' && r.room === '4,2', 'God Mode travel reaches Solaris 4,2');
  check(r.explored > 40, 'every Solaris room counts as explored in God Mode (' + r.explored + ')');
  check(r.tiles <= 25, 'the minimap builds only the rooms near its window (' + r.tiles + ' tiles)');
  check(r.redraw <= 6, 'tile arrivals are merged into a few redraws (' + r.redraw + ')');
  check(!page.errors.length, 'no page errors ' + page.errors.slice(0, 2).join(' | '));
  await page.context().close();
  // 2: one ground picture of Solaris refused
  page = await open(/solaris-gen\/surfaces\/.*\.webp/);
  const p = await page.evaluate(async () => {
    state.seed = 9; cityGenEnsure(); state.region = 'elaris'; configureRegion('elaris'); state.room = '4,2'; state.pos = { x: 400, y: 300 }; renderWorld();
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) { const c = document.querySelector('#world canvas'); if (c && c.dataset && !c.dataset.pending && c.width > 800) return { painted: true, ms: performance.now() - t0 }; await new Promise(r => setTimeout(r, 200)); }
    const c = document.querySelector('#world canvas'); return { painted: false, pending: c && c.dataset && c.dataset.pending, w: c && c.width };
  });
  console.log(JSON.stringify(p));
  check(p.painted, 'a room with refused ground art is still painted');
  check(!page.errors.length, 'no page errors with refused art ' + page.errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
