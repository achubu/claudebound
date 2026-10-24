'use strict';
// Round 254: the battle screen shows every effect as a chip of one or two words; hovering or tapping it
// opens a bubble with the full description. Runs in Chromium against the real page.
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
// At most an icon, two words and a number ("🗡 Swipe 9", "⚔ No Pressure", "◇8" rewards aside).
const short = t => { const words = t.replace(/[^\p{L}\p{N}\s+−-]/gu, ' ').split(/\s+/).filter(w => w && !/^[+−-]?\d+$/.test(w)); return words.length <= 2; };
server.listen(0, async () => {
  const url = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  try {
    for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 820 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => typeof compactBattle === 'function');
      // Solaris's final boss: a charged strike with an affliction, Swipe and a counter window; two turns in.
      const look = await page.evaluate(() => {
        newGame(); state.region = 'elaris'; configureRegion('elaris'); state.hp = state.maxHp = 300; state.playerLevel = 30; state.tips = {};
        const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => spawnAvailable(s) && s.type === 'bloomTyrant')); state.room = k; renderWorld();
        startBattle(roomSpawns(k).find(s => spawnAvailable(s) && s.type === 'bloomTyrant').uid); closeMenu();
        state.battle.hand = []; endTurn(); if (typeof siftPending === 'function' && siftPending(state.battle)) siftDiscard(0); closeMenu(); renderBattle();
        const m = document.getElementById('battleModal'), chips = [...m.querySelectorAll('.fx-chip')];
        return { chips: chips.map(c => [c.textContent.trim(), c.dataset.tip || '']), lines: m.querySelectorAll('.intent-bubble p.affliction').length,
          whats: [...m.querySelectorAll('.intent-bubble .what')].map(w => w.textContent.trim()), whens: [...m.querySelectorAll('.intent-bubble .when')].map(w => w.textContent.trim()),
          log: (m.querySelector('#combatLog') || {}).textContent || '' };
      });
      assert(look.lines === 0, name + ': no effect sentences left in the intent');
      assert(look.chips.length >= 4, name + ': effects show as chips (' + look.chips.map(c => c[0]).join(' | ') + ')');
      const long = look.chips.filter(([t]) => !short(t));
      assert(!long.length, name + ': every chip is one or two words (' + long.map(c => c[0]).join(' | ') + ')');
      assert(look.chips.every(([t, tip]) => tip.length > t.length), name + ': every chip carries a longer description');
      assert(look.whats.every(short) && look.whens.every(w => w.length <= 24), name + ': short move names and turn labels (' + look.whats.join(' | ') + ' / ' + look.whens.join(' | ') + ')');
      assert(/📜 Log/.test(look.log), name + ': the log is one chip');
      // The bubble: hover on desktop, tap on a phone.
      const chip = page.locator('#battleModal .intent-bubble .fx-chip, #battleModal .fx-chip.element').first(), label = await chip.getAttribute('data-tip');
      if (mobile) await chip.tap(); else await chip.hover();
      await page.waitForTimeout(200);
      const tip = await page.evaluate(() => { const t = document.getElementById('fxTip'), r = t && t.getBoundingClientRect(); return t && { show: t.classList.contains('show'), text: t.textContent, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 }; });
      assert(tip && tip.show && tip.text === label && tip.inside, name + ': the chip opens its full description in a bubble, on screen');
      if (mobile) { await page.mouse.click(5, viewport.height - 5); await page.waitForTimeout(100); }
      else await page.mouse.move(2, viewport.height - 2);
      await page.waitForTimeout(150);
      assert(!(await page.evaluate(() => document.getElementById('fxTip').classList.contains('show'))), name + ': it closes again');
      assert(errors.length === 0, name + ': no page errors ' + errors.join('; '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
});
