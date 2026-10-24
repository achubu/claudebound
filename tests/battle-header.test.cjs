'use strict';
// Round 225: the battle screen's top line holds both the encounter and the element, and the log
// line above the Aether panel shows only moves (hidden until the first one). Runs in Chromium
// against the real page, served from the repo.
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
      const look = () => page.evaluate(() => {
        const tops = [...document.querySelectorAll('#battleModal .combat-tools')], log = document.getElementById('combatLog');
        return { tops: tops.length, first: document.querySelector('#battleModal').firstElementChild === tops[0], text: tops[0] && tops[0].textContent.replace(/\s+/g, ' ').trim(),
          lines: tops[0] && Math.round(tops[0].getBoundingClientRect().height), log: log.textContent, logTip: log.dataset.tip || '', logShown: getComputedStyle(log).display !== 'none',
          el: (tops[0] && tops[0].querySelector('.fx-chip.element') || {}).dataset?.tip || '' };
      });
      // A fight with an element (Elaris) and one without (Neon Aftermath's first street).
      await page.evaluate(() => { newGame(); state.region = 'wilds'; configureRegion('wilds'); state.room = '1,0'; renderWorld(); startBattle(roomSpawns(state.room).find(s => spawnAvailable(s)).uid); });
      let r = await look();
      assert(r.tops === 1 && r.first, name + ': one top line, at the very top');
      assert(/^⚔ .+/.test(r.text) && /^Element: \w+/.test(r.el), name + ': encounter and element share it, the element as a chip (' + r.text + ' / ' + r.el + ')');
      assert(!r.logShown, name + ': no log line before the first move');
      await page.evaluate(() => { const b = state.battle; const i = b.hand.findIndex(c => stat(c).cost <= b.energy); playCard(i); });
      r = await look();
      assert(r.tops === 1 && /^⚔ /.test(r.text), name + ': still one top line after a move');
      assert(r.logShown && /Log/.test(r.log) && r.logTip && !/Encounter/.test(r.logTip), name + ': the log chip holds the move, not the encounter (' + r.logTip + ')');
      await page.evaluate(() => { state.battle = null; document.getElementById('battleOverlay').classList.add('hidden'); newGame(); state.region = 'city'; configureRegion('city'); state.room = '0,5'; renderWorld();
        const k = Object.keys(rooms).find(k => (state.room = k, roomSpawns(k).some(s => spawnAvailable(s) && !s.element))); state.room = k; renderWorld(); startBattle(roomSpawns(k).find(s => spawnAvailable(s) && !s.element).uid); });
      r = await look();
      assert(r.tops === 1 && /^⚔ \S/.test(r.text) && !r.el, name + ': a fight with no element still names the encounter at the top (' + r.text + ')');
      assert(errors.length === 0, name + ': no page errors ' + errors.join('; '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
