'use strict';
// Round 251: the hero walks with the owner's 9-frame sheets: a standing pose and an 8-frame walk per
// direction; keys and tap routes both turn him and step through the cycle. Runs in Chromium.
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url); await page.waitForFunction(() => typeof startBattle === 'function');
    await page.evaluate(() => { newGame(); if (state.tutorialPending && typeof tutorialFinish === 'function') tutorialFinish(state.pool.slice(0, 6)); closeMenu(); startBattle = function () {}; state.pos = { x: 400, y: 250 }; renderWorld(); });
    const read = () => page.evaluate(() => document.querySelector('#player .hero-sprite').style.backgroundPosition);
    const size = await page.evaluate(() => getComputedStyle(document.querySelector('#player .hero-sprite')).backgroundSize);
    assert(size === '756px 336px', 'the sheet has 9 columns and 4 rows (' + size + ')');
    const rows = { ArrowDown: '0px', ArrowRight: '-168px', ArrowUp: '-252px' };
    for (const [key, row] of Object.entries(rows)) {
      await page.evaluate(() => { state.pos = { x: 400, y: 250 }; renderWorld(); });
      await page.keyboard.down(key); const seen = new Set();
      for (let i = 0; i < 14; i++) { await page.waitForTimeout(60); seen.add(await read()); }
      await page.keyboard.up(key);
      const frames = [...seen].filter(p => p.endsWith(' ' + row));
      assert(frames.length >= 5, key + ': walks through the cycle on its own row (' + [...seen].join(', ') + ')');
      await page.waitForTimeout(300);
    }
    assert((await read()) .startsWith('0px '), 'standing again when he stops');
    const pb = await page.locator('#player').boundingBox(); await page.evaluate(() => { state.pos = { x: 300, y: 250 }; renderWorld(); });
    const p2 = await page.locator('#player').boundingBox(); await page.mouse.click(p2.x + p2.width / 2 + 220, p2.y + p2.height / 2);
    const seen = new Set(); for (let i = 0; i < 10; i++) { await page.waitForTimeout(70); seen.add(await read()); }
    assert([...seen].filter(p => p.endsWith(' -168px') && !p.startsWith('0px ')).length >= 3, 'a tap route turns him and steps through the cycle (' + [...seen].join(', ') + ')');
    await page.close();
  } finally { await browser.close(); server.close(); }
});
