// Round 417: every Neon Aftermath patrol and boss stands, and walks (600 steps with the game's own step rule), only where its
// whole sprite is clear of buildings, cars, trees and the sea. Serve the repo on :8123 first (python3 -m http.server 8123).
// every city patrol and boss: its spot, and a long random walk with the game's own step rule, never on an object
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const page = await b.newPage(); await page.goto('http://localhost:8123/index.html?x=' + Date.now()); await page.waitForTimeout(1200);
  for (const seed of [77, 2026, 4242]) console.log(seed, await page.evaluate((seed) => { newGame(); state.seed = seed; configureRegion('city'); let spots = 0, badSpot = [], steps = 0, badStep = 0, stuck = 0;
    for (const key of Object.keys(CITY_ROOMS)) for (const s of roomSpawns(key)) { spots++; if (!cityEnemyOk(key, s.x, s.y)) badSpot.push(key + '@' + Math.round(s.x) + ',' + Math.round(s.y));
      let x = s.x, y = s.y, a = 0, moved = 0; for (let t = 0; t < 600; t++) { const nx = x + Math.cos(a) * 14 * 0.1, ny = y + Math.sin(a) * 14 * 0.1; if (walkable(key, nx, ny, 26) && Math.hypot(nx - s.x, ny - s.y) < 75) { x = nx; y = ny; moved++; } else a += 1.8; if (t % 30 === 0) a += 0.8; steps++; if (!cityEnemyOk(key, x, y)) badStep++; }
      if (!moved) stuck++; }
    return 'spots ' + spots + ', on objects ' + badSpot.length + ' ' + badSpot.slice(0, 3).join(' ') + ' | steps ' + steps + ', on objects ' + badStep + ' | never moved ' + stuck; }, seed));
  await b.close(); })();
