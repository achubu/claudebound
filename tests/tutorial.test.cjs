'use strict';
// Round 226: a new journey opens a tutorial that ends with picking the 6 starting cards (the first
// copy of each Soulbound), Nano Mend among them. Escape doesn't skip it, and a reload mid-way reopens
// the pick. Runs in Chromium against the real page, served from the repo.
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
      await page.goto(url); await page.waitForFunction(() => typeof showTutorial === 'function');
      await page.evaluate(() => localStorage.clear());
      await page.click('#newBtn');
      const titles = [];
      while (await page.$('#tutNext')) { titles.push(await page.textContent('#menuModal h2')); await page.click('#tutNext'); }
      assert(titles.length >= 5 && titles.some(t => /Pressure|press/i.test(t)) && titles.some(t => /Hack/.test(t)) && titles.some(t => /Aether/.test(t)), name + ': the pages cover the Neon Aftermath mechanics (' + titles.join(' / ') + ')');
      const offer = await page.$$eval('#tutorialCards .card', els => els.map(e => e.textContent));
      assert(offer.length === 10 && offer.some(t => /Nano Mend/.test(t) && /Heal 7/.test(t)), name + ': the pick offers 10 cards, Nano Mend (heal 7) among them');
      assert(await page.$eval('#tutStart', b => b.disabled), name + ': Start waits for 6 picks');
      await page.keyboard.press('Escape');
      assert(await page.evaluate(() => !document.getElementById('menuOverlay').classList.contains('hidden')), name + ': Escape does not skip the tutorial');
      for (const k of [0, 1, 3, 6, 8, 9]) await (await page.$$('#tutorialCards .card'))[k].click();
      assert(await page.$eval('#tutorialCards', g => [...g.querySelectorAll('.card')].filter(c => c.disabled).length === 4), name + ': with 6 picked, the rest are greyed out');
      // A reload before starting reopens the pick.
      await page.evaluate(() => save()); await page.reload(); await page.waitForFunction(() => typeof showTutorial === 'function');
      await page.click('#resumeBtn');
      assert(!!(await page.$('#tutorialCards')), name + ': continuing a journey mid-tutorial reopens the pick');
      for (const k of [0, 1, 3, 6, 8, 9]) await (await page.$$('#tutorialCards .card'))[k].click();
      await page.click('#tutStart');
      const s = await page.evaluate(() => ({ pool: state.pool.map(c => c.id + (c.soulbound ? '+' : '-')), deck: state.deck.length, pending: !!state.tutorialPending, open: !document.getElementById('menuOverlay').classList.contains('hidden'), nano: rules(state.pool.find(c => c.id === 'nanoMend')), cost: stat(state.pool.find(c => c.id === 'nanoMend')).cost }));
      assert(s.deck === 6 && JSON.stringify(s.pool) === JSON.stringify(['strike+', 'strike-', 'guard+', 'riposte+', 'mend+', 'nanoMend+']), name + ': the deck is the 6 picked, first copies Soulbound (' + s.pool.join(' ') + ')');
      assert(!s.pending && !s.open, name + ': the tutorial closes and is done');
      assert(s.cost === 1 && s.nano === 'Heal 7 HP.', name + ': Nano Mend costs 1 and heals 7, and is not Exhaust');
      assert(errors.length === 0, name + ': no page errors ' + errors.join('; '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
