'use strict';
// Round 291 (playtest): card names readable on every frame, the ×N copies badge clear of the cost, and a pair
// leader's health bar visible on a phone. Runs in Chromium.
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
const lum = rgb => { const [r, g, b] = rgb.match(/\d+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
server.listen(0, async () => {
  const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  try {
    const start = async (page) => { await page.goto(url); await page.waitForFunction(() => typeof startBattle === 'function');
      await page.evaluate(() => { newGame(); if (state.tutorialPending && typeof tutorialFinish === 'function') tutorialFinish(state.pool.slice(0, 6)); closeMenu(); document.getElementById('startOverlay').classList.add('hidden'); }); };
    // Desktop: names and the copies badge.
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); await start(page);
    await page.evaluate(() => { for (let i = 0; i < 2; i++) state.pool.push(make('strike', 0, false)); showDeck(); }); await page.waitForTimeout(300);
    const deck = await page.evaluate(() => {
      const names = [...document.querySelectorAll('#menuModal .card .card-name')].slice(0, 6).map(n => { const s = getComputedStyle(n); return { fill: s.webkitTextFillColor, soul: !!n.closest('.soulbound') }; });
      const badge = document.querySelector('#menuModal .stack-count-badge'), card = badge.closest('.card') || badge.parentElement.querySelector('.card') || badge.parentElement;
      const b = badge.getBoundingClientRect(), costEl = card.querySelector('.cost, .card-cost, .energy-cost') || [...card.querySelectorAll('*')].find(e => /^\d$/.test(e.textContent.trim()) && e.getBoundingClientRect().top - card.getBoundingClientRect().top < 40);
      const c = costEl.getBoundingClientRect(); const overlap = !(b.right <= c.left || b.left >= c.right || b.bottom <= c.top || b.top >= c.bottom);
      return { names, overlap };
    });
    assert(deck.names.length && deck.names.every(n => lum(n.fill) > .75), 'card names are a light fill on gold and Soulbound frames (' + deck.names.map(n => n.fill).join(', ') + ')');
    assert(!deck.overlap, 'the ×N copies badge does not cover the energy cost');
    await page.close();
    // Phone: a pair fight's leader keeps a visible health bar.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const phone = await ctx.newPage(); await start(phone);
    const w = await phone.evaluate(() => { state.region = 'sky'; configureRegion('sky'); state.tips = { ...(state.tips || {}), pairs: true };
      state.room = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss && pairMateFor(k, s))); renderWorld();
      startBattle(roomSpawns(state.room).find(s => !s.boss && pairMateFor(state.room, s)).uid); closeMenu(); renderBattle();
      return document.querySelector('#battleModal .compact-side.enemy .hp-row .meter').getBoundingClientRect().width; });
    assert(w >= 40, 'on a phone a pair leader\'s health bar is ' + Math.round(w) + 'px wide (was 0)');
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
