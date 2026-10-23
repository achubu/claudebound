'use strict';
// Round 249: no creature on the map is drawn stretched. Every enemy sprite (bosses, mini-bosses and both
// of a pair included) keeps its frame's shape (3:4 sprite sheets). Runs in Chromium against the real page.
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
    const rows = await page.evaluate(async () => {
      newGame(); startBattle = function () {}; const rows = [], imgs = {};
      const ratio = u => new Promise(res => { if (imgs[u]) return res(imgs[u]); const im = new Image(); im.onload = () => res(imgs[u] = im.naturalWidth / 4 / im.naturalHeight); im.onerror = () => res(0); im.src = u; });
      for (const w of WORLD_ORDER) { state.region = w; configureRegion(w);
        for (const k of Object.keys(rooms)) { state.room = k; state.pos = { x: 5, y: 5 }; renderWorld();
          for (const el of document.querySelectorAll('#world .enemy-node .wildlife-sprite')) { const r = el.getBoundingClientRect(); if (!r.width) continue;
            const m = /url\("?([^")]+)/.exec(getComputedStyle(el).backgroundImage); const f = m ? await ratio(m[1]) : 0; if (!f) continue;
            rows.push({ who: w + ' ' + el.closest('.enemy-node').dataset.name + (el.closest('.pair-ghost') ? ' (partner)' : ''), stretch: (r.width / r.height) / f }); } } }
      return rows; });
    const bad = rows.filter(r => Math.abs(r.stretch - 1) > 0.06);
    assert(rows.length > 100, rows.length + ' creature sprites measured');
    assert(bad.length === 0, 'none is stretched ' + bad.slice(0, 4).map(b => b.who + ' x' + b.stretch.toFixed(2)).join('; '));
    assert(rows.some(r => /partner/.test(r.who)) && rows.some(r => /The Zenith Roc/.test(r.who)), 'pair partners and bosses are among them');
    await page.close();
  } finally { await browser.close(); server.close(); }
});
