// Round 540 (owner: "make sure the room text is not over the road, have it above a road in all rooms"): a browser check that
// every room label on the Map screen, in every world, found a spot (placeMapLabels in assets/map-terrain.js) and that the
// spot is off the road.   python3 -m http.server 8123 &   then   node tests/map-labels.cjs
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8123/index.html'); await page.waitForTimeout(800); await page.click('#newBtn'); await page.waitForTimeout(300);
  await page.evaluate(sd => { state.seed = sd; cityGenEnsure(); enterGodMode(); save(); }, +(process.env.SEED || 77));
  let fails = 0;
  for (const w of ['city', 'elaris', 'sky', 'wilds', 'vespera', 'chronospire']) for (const zoom of [1, 0.6]) {
    const r = await page.evaluate(([w, zoom]) => { closeMenu(); state.regionVisits[activeRegion] = state.visited; state.region = w; configureRegion(w); state.visited = state.regionVisits[w]; state.room = regionStartRoom(); renderWorld(); showMap();
      const map = document.querySelector('#menuModal .map-canvas'), scroller = map && map.parentElement; if (zoom !== 1 && map) applyMapZoom(map, scroller, zoom);
      const ps = [...document.querySelectorAll('#menuModal .panel[data-cells]')].filter(p => p.dataset.cells.split(' ').length === 1);
      const miss = ps.filter(p => !p.dataset.labelSpot).map(p => p.dataset.cells), onRoad = ps.filter(p => { if (!p.dataset.labelSpot) return false; const [x, y] = p.dataset.labelSpot.split(',').map(Number), rd = mapLabelRoad(p.dataset.cells); return rd && rd.at(x, y); }).map(p => p.dataset.cells);
      return { w, zoom, labels: ps.length, miss, onRoad }; }, [w, zoom]);
    const ok = !r.miss.length && !r.onRoad.length && r.labels > 20; if (!ok) fails++;
    console.log((ok ? 'ok   ' : 'FAIL ') + JSON.stringify(r));
  }
  if (errors.length) { fails++; console.log('FAIL page errors', errors.slice(0, 3)); }
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
