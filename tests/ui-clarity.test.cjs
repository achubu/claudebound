'use strict';
// Round 292: a simpler interface. Six top-bar buttons (Save in the Menu, Aetherlink in Gear), End turn glows when
// nothing is playable, no "Your hand" heading, the movement hint goes after three rooms, phones drop the battle XP pill.
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
    const start = async (page) => { const errs = []; page.on('pageerror', e => errs.push(e.message)); await page.goto(url); await page.waitForFunction(() => typeof startBattle === 'function');
      await page.evaluate(() => { newGame(); if (state.tutorialPending && typeof tutorialFinish === 'function') tutorialFinish(state.pool.slice(0, 6)); closeMenu(); document.getElementById('startOverlay').classList.add('hidden'); }); return errs; };
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = await start(page);
    const nav = await page.evaluate(() => [...document.querySelectorAll('#nav button')].filter(b => b.offsetParent).map(b => b.textContent.trim()));
    assert(JSON.stringify(nav) === JSON.stringify(['Map', 'Deck', 'Character', 'Gear', 'Quests', 'Menu']), 'six top-bar buttons: ' + nav.join(', '));
    const saved = await page.evaluate(() => { document.querySelector('#nav button:not(.nav-folded):last-of-type'); [...document.querySelectorAll('#nav button')].find(b => b.textContent.trim() === 'Menu').click();
      const btn = document.getElementById('saveNowBtn'); state.shards = 4242; btn.click(); const raw = Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v && v.includes('"shards":4242')); closeMenu(); return !!btn && !!raw; });
    assert(saved, 'Menu → Save now saves the journey');
    const device = await page.evaluate(() => { showGear(); const b = document.getElementById('gearDeviceBtn'); b.click(); const t = (document.querySelector('#menuModal h1,#menuModal h2') || {}).textContent || ''; closeMenu(); return t; });
    assert(/Aetherlink/.test(device), 'Gear → Aetherlink Gauntlet opens the device (' + device + ')');
    const battle = await page.evaluate(() => { configureRegion('city'); state.room = '1,5'; renderWorld(); startBattle(roomSpawns('1,5').find(x => !x.boss).uid); const b = state.battle; b.hand = [make('strike'), make('guard')]; b.energy = 3; renderBattle();
      const end = () => document.getElementById('endTurn').classList.contains('end-turn-ready'); const withEnergy = end(); b.energy = 0; b.aether = 0; renderBattle(); const without = end();
      const head = document.querySelector('#battleModal .hand-title'); return { withEnergy, without, headH: head ? head.getBoundingClientRect().height : 0 }; });
    assert(!battle.withEnergy && battle.without, 'End turn glows only when nothing is playable');
    assert(battle.headH <= 1, 'no "Your hand" heading');
    const hint = await page.evaluate(() => { state.battle = null; document.getElementById('battleOverlay').classList.add('hidden'); state.visited = ['0,5']; renderWorld(); const h = document.querySelector('.hint'); const shown = h && getComputedStyle(h).display !== 'none'; state.visited = ['0,5', '1,5', '2,5']; renderWorld(); const gone = h && getComputedStyle(h).display === 'none'; return { shown, gone }; });
    assert(hint.shown && hint.gone, 'the movement hint shows at first and goes after three rooms');
    assert(!errs.length, 'no page errors (' + errs.join(' | ') + ')');
    await page.close();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const phone = await ctx.newPage(); await start(phone);
    const pill = await phone.evaluate(() => { configureRegion('city'); state.room = '1,5'; renderWorld(); startBattle(roomSpawns('1,5').find(x => !x.boss).uid); const p = document.querySelector('#battleModal .compact-bar .xp-pill'); return p ? getComputedStyle(p).display : 'missing'; });
    assert(pill === 'none', 'phones hide the battle XP pill');
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
