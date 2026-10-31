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
    const device = await page.evaluate(() => { showGear(); const m = document.getElementById('menuModal'); const sec = m.querySelector('.gear-aetherlink');
      const r = { section: !!sec && /Aetherlink/.test((sec.querySelector('h2') || {}).textContent || ''), sockets: m.querySelectorAll('.gear-aetherlink [data-socket]').length, slots: m.querySelectorAll('[data-gear-slot]').length, returns: m.querySelectorAll('#deviceClose').length };
      closeMenu(); showDevice(); r.redirect = !!document.querySelector('#menuModal [data-gear-slot]') && !!document.querySelector('#menuModal .gear-aetherlink'); closeMenu(); return r; });
    assert(device.section && device.sockets > 0 && device.slots === 5 && device.returns === 0, 'Round 295: the Aetherlink Gauntlet is a section of the Gear screen (' + JSON.stringify(device) + ')');
    assert(device.redirect, 'opening the Aetherlink shows the Gear screen');
    const battle = await page.evaluate(() => { configureRegion('city'); state.room = '1,5'; renderWorld(); startBattle(roomSpawns('1,5').find(x => !x.boss).uid); const b = state.battle; b.hand = [make('strike'), make('guard')]; b.energy = 3; renderBattle();
      const end = () => document.getElementById('endTurn').classList.contains('end-turn-ready'); const withEnergy = end(); b.energy = 0; b.aether = 0; renderBattle(); const without = end();
      const head = document.querySelector('#battleModal .hand-title'); return { withEnergy, without, headH: head ? head.getBoundingClientRect().height : 0 }; });
    // Round 295: only big hits shake the screen.
    const shake = await page.evaluate(async () => { const m = document.getElementById('battleModal'), b = state.battle; b.energy = 3; renderBattle(); m.classList.remove('juice-shake', 'juice-shake-big');
      state.hp -= 2; renderBattle(); const small = m.classList.contains('juice-shake') || m.classList.contains('juice-shake-big');
      await new Promise(r => setTimeout(r, 500)); state.hp -= Math.ceil(state.maxHp * .3); renderBattle(); const big = m.classList.contains('juice-shake-big'); return { small, big }; });
    assert(!shake.small && shake.big, 'a small hit does not shake the screen; a big one does');
    assert(!battle.withEnergy && battle.without, 'End turn glows only when nothing is playable');
    assert(battle.headH <= 1, 'no "Your hand" heading');
    // Round 293: the encounter bar folds (its element badge moves beside the enemy's name), forecasts are one line, Pitch is slim.
    const slim = await page.evaluate(() => { configureRegion('city'); const k = Object.keys(rooms).find(k => roomSpawns(k).some(s => s.type === 'crownSentinel')); state.room = k; renderWorld(); startBattle(roomSpawns(k).find(s => s.type === 'crownSentinel').uid);
      const bar = document.querySelector('#battleModal .combat-tools.with-encounter'), el = document.querySelector('#battleModal .compact-side.enemy .fx-el-moved');
      const bubbles = [...document.querySelectorAll('#battleModal .intent-bubble')].map(x => x.getBoundingClientRect().height), pitch = document.querySelector('#battleModal .card-wrap .ability.pitch');
      return { barShown: bar && getComputedStyle(bar).display !== 'none', element: el ? el.textContent.trim() : '', bubbles, pitchH: pitch ? pitch.getBoundingClientRect().height : 0 }; });
    assert(!slim.barShown && /Air/.test(slim.element), 'the encounter bar folds and its element badge sits in the enemy panel (' + slim.element + ')');
    assert(slim.bubbles.length && slim.bubbles.every(h => h < 50), 'each forecast is one line (' + slim.bubbles.map(Math.round).join(', ') + 'px)');
    assert(slim.pitchH > 0 && slim.pitchH <= 30, 'Pitch buttons are slim (' + Math.round(slim.pitchH) + 'px)');
    const hint = await page.evaluate(() => { state.battle = null; document.getElementById('battleOverlay').classList.add('hidden'); state.visited = ['0,5']; renderWorld(); const h = document.querySelector('.hint'); const shown = h && getComputedStyle(h).display !== 'none'; state.visited = ['0,5', '1,5', '2,5']; renderWorld(); const gone = h && getComputedStyle(h).display === 'none'; return { shown, gone }; });
    assert(hint.shown && hint.gone, 'the movement hint shows at first and goes after three rooms');
    // Round 294: a ✕ on every top-bar screen, a shorter Character page, and only pressable buttons under deck cards.
    const r294 = await page.evaluate(() => {
      const out = { x: {} };
      for (const f of ['showMap', 'showDeck', 'showCharacter', 'showGear', 'showQuests', 'showMainMenu', 'showDevice']) { closeMenu(); window[f](); const x = document.querySelector('#menuModal .menu-x'); out.x[f] = !!x; if (x) x.click(); out.x[f] = out.x[f] && document.getElementById('menuOverlay').classList.contains('hidden'); }
      state.playerLevel = 8; showCharacter(); const m = document.getElementById('menuModal');
      out.hero = !m.querySelector('.sheet-portrait') && /Level/.test((m.querySelector('h2') || {}).textContent || ''); out.cols = getComputedStyle(m.querySelector('.sheet-grid')).gridTemplateColumns.split(' ').length;
      out.nodeH = Math.round(m.querySelector('.talent-node').getBoundingClientRect().height); out.charH = m.scrollHeight;
      const wires = [...m.querySelectorAll('.talent-connectors .connector-wire')].map(p => p.getAttribute('d')); out.wires = wires.length; out.curved = wires.filter(d => /[CcQqSsAa]/.test(d)).length;
      showDeck(); out.greyInfo = [...document.querySelectorAll('#menuModal .workshop .card-wrap .actions button')].filter(b => b.disabled && b.offsetParent && !/^\+\s*Add/.test(b.textContent.trim())).length;
      closeMenu(); return out; });
    assert(Object.values(r294.x).every(Boolean), 'every top-bar screen has a ✕ that closes it (' + JSON.stringify(r294.x) + ')');
    assert(r294.hero && r294.cols === 4 && r294.nodeH <= 92 && r294.charH < 2000, 'Character: no portrait (Round 295), stats in one row, smaller talents (' + r294.charH + 'px tall, was ~2440)');
    assert(r294.wires > 0 && r294.curved === 0, 'Round 295: talent lines are straight (' + r294.wires + ' lines, ' + r294.curved + ' curved)');
    assert(r294.greyInfo === 0, 'no greyed-out notice buttons under deck cards');
    assert(!errs.length, 'no page errors (' + errs.join(' | ') + ')');
    await page.close();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const phone = await ctx.newPage(); await start(phone);
    const pill = await phone.evaluate(() => { configureRegion('city'); state.room = '1,5'; renderWorld(); startBattle(roomSpawns('1,5').find(x => !x.boss).uid); const p = document.querySelector('#battleModal .compact-bar .xp-pill'); return p ? getComputedStyle(p).display : 'missing'; });
    assert(pill === 'none', 'phones hide the battle XP pill');
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
