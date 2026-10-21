'use strict';
// Round 227: Esc closes the victory screens (opening the loot chest first, so nothing is lost) and
// does nothing during a fight. Runs in Chromium against the real page, served from the repo.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
server.listen(0, async () => {
  const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => typeof startBattle === 'function');
    await page.evaluate(() => { newGame(); state.region = 'city'; configureRegion('city'); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && !s.boss)); state.room = k; renderWorld(); startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.boss).uid); });
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => state.battle && state.battle.phase === 'fight'), 'Esc does nothing during a fight');
    const before = await page.evaluate(() => { const b = state.battle; b.enemy.hp = 1; b.hand = [make('strike')]; b.energy = 3; playCard(0); window.__won = b; return { phase: b.phase, chest: !!document.getElementById('openChest'), potions: state.potions, pool: state.pool.length, wins: state.wins }; });
    assert(before.phase === 'reward' && before.chest, 'a win shows the loot chest');
    await page.keyboard.press('Escape');
    const after = await page.evaluate(() => ({ opened: !!window.__won.chestOpened, battle: !!state.battle, overlay: !document.getElementById('battleOverlay').classList.contains('hidden'), potions: state.potions, pool: state.pool.length }));
    assert(!after.battle && !after.overlay, 'Esc closes the victory screens and returns to the map');
    assert(after.opened, 'the chest was opened on the way, so its loot was kept');
    assert(errors.length === 0, 'no page errors ' + errors.join('; '));
  } finally { await browser.close(); server.close(); }
});
