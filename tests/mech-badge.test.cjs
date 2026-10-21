'use strict';
// Round 229: a world mechanic's badge (🪶 Tailwind and the others) sits above its card, not on it,
// and the hand stays level. Runs in Chromium against the real page, served from the repo.
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
    for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 820 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof startBattle === 'function');
      const r = await page.evaluate(() => { newGame(); state.region = 'sky'; configureRegion('sky'); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && !s.boss)); state.room = k; renderWorld(); startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.boss).uid);
        const b = state.battle; b.hand = [make('gustChain'), make('strike'), make('skydive'), make('guard')]; renderBattle(); renderBattle();
        return [...document.querySelectorAll('#hand .card-wrap')].map(w => { const card = w.querySelector('.card'), badges = w.querySelectorAll('.mech-badge:not(.mech-badge-space)'), bd = badges[0];
          return { top: Math.round(card.getBoundingClientRect().top), badges: badges.length, onCard: !!(bd && card.contains(bd)), above: !!(bd && bd.getBoundingClientRect().bottom <= card.getBoundingClientRect().top + 1), text: bd ? bd.textContent : '' }; }); });
      assert(r[0].badges === 1 && r[2].badges === 1 && r[1].badges === 0 && r[3].badges === 0, name + ': the two Tailwind cards have one badge each, after two redraws');
      assert(r.filter(x => x.badges).every(x => !x.onCard && x.above && /TAILWIND/.test(x.text)), name + ': the badge sits above its card, not on it');
      assert(new Set(r.map(x => x.top)).size === 1, name + ': the hand stays level (' + r.map(x => x.top).join(', ') + ')');
      assert(errors.length === 0, name + ': no page errors ' + errors.join('; '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
