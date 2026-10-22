'use strict';
// Round 229: a world mechanic's badge (🪶 Tailwind and the others) and the hand stays level.
// Round 238: the badge is now a tag on the card, right after its description, so it also shows in the
// Deck screen. Runs in Chromium against the real page, served from the repo.
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
        const hand = [...document.querySelectorAll('#hand .card-wrap')].map(w => { const card = w.querySelector('.card'), tags = card.querySelectorAll('.rules .mech-tag'), tg = tags[0], rules = card.querySelector('.rules');
          return { top: Math.round(card.getBoundingClientRect().top), tags: tags.length, last: !!(tg && rules.lastElementChild === tg), above: w.querySelectorAll('.mech-badge').length, text: tg ? tg.textContent : '' }; });
        state.battle = null; const c = make('windWall'); state.pool.push(c); showDeck();
        const deck = [...document.querySelectorAll('#menuModal .card')].filter(x => /Wind Wall/i.test(x.textContent)).map(x => { const t = x.querySelector('.rules .mech-tag'); return t ? t.textContent : ''; });
        return { hand, deck }; });
      const h = r.hand;
      assert(h[0].tags === 1 && h[2].tags === 1 && h[1].tags === 0 && h[3].tags === 0, name + ': the two Tailwind cards have one tag each, after two redraws');
      assert(h.filter(x => x.tags).every(x => x.last && /TAILWIND/.test(x.text)) && h.every(x => !x.above), name + ': the tag follows the description, on the card (no badge above it)');
      assert(new Set(h.map(x => x.top)).size === 1, name + ': the hand stays level (' + h.map(x => x.top).join(', ') + ')');
      assert(r.deck.length && r.deck.every(t => /TAILWIND/.test(t)), name + ': the Deck screen shows it too');
      assert(errors.length === 0, name + ': no page errors ' + errors.join('; '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
