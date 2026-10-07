// Real-browser playtest: drives the actual UI with clicks/keys in Chromium.
// Usage: serve repo root on :8123, then `node tests/browser-playtest.cjs`.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/playtest';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8123/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function session(name, ctxOpts) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const issues = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') issues.push(`[console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => issues.push(`[pageerror] ${e.message}`));
  page.on('response', r => { if (r.status() >= 400) issues.push(`[http ${r.status()}] ${r.url()}`); });
  page.on('dialog', d => { issues.push(`[dialog] ${d.message()}`); d.accept(); });
  const shot = async n => page.screenshot({ path: `${OUT}/${name}-${n}.png` });
  const overflow = async label => {
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    if (o.sw > o.w + 1) issues.push(`[layout] horizontal overflow on ${label}: ${o.sw}px > ${o.w}px`);
  };
  const log = [];
  try {
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    await shot('00-start'); await overflow('start screen');
    await page.click('#newBtn'); await sleep(800);
    await shot('01-world'); await overflow('world');

    // Movement: hold a direction key and verify the player moves.
    const p0 = await page.evaluate(() => ({ ...state.pos, room: state.room }));
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.down(k); await sleep(600); await page.keyboard.up(k);
    }
    const p1 = await page.evaluate(() => ({ ...state.pos, room: state.room, battle: !!state.battle }));
    log.push(`movement: ${JSON.stringify(p0)} -> ${JSON.stringify(p1)}`);
    if (p0.x === p1.x && p0.y === p1.y && p0.room === p1.room && !p1.battle) issues.push('[gameplay] player did not move with arrow keys');
    if (p1.battle) { await page.evaluate(() => { state.battle = null; $('battleOverlay').classList.add('hidden'); renderWorld(); }); }

    // Menus
    for (const [btn, label] of [['#mapBtn', 'map'], ['#deckBtn', 'deck'], ['#charBtn', 'character']]) {
      await page.click(btn); await sleep(400);
      const open = await page.evaluate(() => !$('menuOverlay').classList.contains('hidden'));
      if (!open) issues.push(`[ui] ${label} menu did not open`);
      await shot(`02-${label}`); await overflow(label + ' menu');
      const ret = await page.$('#mapReturn');
      if (ret) { const vis = await ret.evaluate(e => { const r = e.getBoundingClientRect(), m = document.getElementById('menuModal').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), modalBottom: Math.round(m.bottom), vh: innerHeight, modalScroll: document.getElementById('menuModal').scrollHeight - document.getElementById('menuModal').clientHeight }; }); log.push(label + ' return button: ' + JSON.stringify(vis)); if (vis.bottom > vis.vh || vis.bottom > vis.modalBottom) issues.push(`[ui] ${label} Return button is off-screen without scrolling ${JSON.stringify(vis)}`); await ret.click(); await sleep(250); continue; }
      const closer = await page.$('#closeMenu');
      if (closer) await closer.click(); else { issues.push(`[ui] ${label} menu has no #closeMenu button`); await page.evaluate(() => closeMenu()); }
      await sleep(250);
    }

    // Fight up to 3 battles with real clicks.
    for (let fight = 1; fight <= 3; fight++) {
      const spawn = await page.evaluate(() => {
        window.__used = window.__used || [];
        for (const k of Object.keys(rooms)) { if (__used.includes(k)) continue; const s = roomSpawns(k).find(s => !s.boss); if (s) { __used.push(k); state.room = k; return s.uid; } }
        return null;
      });
      if (!spawn) { issues.push('[gameplay] no enemy spawn found'); break; }
      await page.evaluate(id => startBattle(id), spawn); await sleep(500);
      const inBattle = await page.evaluate(() => !!state.battle && !$('battleOverlay').classList.contains('hidden'));
      if (!inBattle) { issues.push(`[gameplay] fight ${fight}: battle overlay did not open`); break; }
      await shot(`03-battle${fight}-start`); await overflow('battle');
      // progress bar visibility in hand
      const tracks = await page.$$eval('#hand .track', els => els.map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { h: r.height, w: r.width, d: cs.display }; }));
      if (!tracks.length || tracks.some(t => t.d === 'none' || t.h < 3)) issues.push(`[ui] fight ${fight}: card progress bar not visible in hand ${JSON.stringify(tracks)}`);
      let turns = 0;
      while (turns < 40) {
        const phase = await page.evaluate(() => state.battle && state.battle.phase);
        if (phase !== 'fight') break;
        // Play every affordable card by clicking it.
        for (let g = 0; g < 12; g++) {
          const btn = await page.$('#hand .card:not([disabled])');
          if (!btn) break;
          const before = await page.evaluate(() => state.battle && state.battle.hand.length + ':' + state.battle.energy);
          await btn.click(); await sleep(120);
          const playSel = await page.$('.touch-card-action button.primary:not([disabled])');
          if (playSel) { await playSel.click(); await sleep(120); }
          const after = await page.evaluate(() => state.battle && state.battle.phase === 'fight' ? state.battle.hand.length + ':' + state.battle.energy : 'done');
          if (after === 'done') break;
          if (after === before) { issues.push(`[gameplay] fight ${fight}: clicking an enabled card did nothing (${before})`); break; }
        }
        const still = await page.evaluate(() => state.battle && state.battle.phase === 'fight');
        if (!still) break;
        await page.click('#endTurn'); await sleep(200); turns++;
      }
      const res = await page.evaluate(() => ({ phase: state.battle && state.battle.phase, hp: state.hp, maxHp: state.maxHp, lvl: state.playerLevel, xp: state.xp, pool: state.pool.length }));
      log.push(`fight ${fight}: ${turns} turns -> ${JSON.stringify(res)}`);
      await shot(`04-battle${fight}-end`); await overflow('battle end');
      if (res.phase === 'fight') issues.push(`[gameplay] fight ${fight} did not finish within 40 turns`);
      // Leave the result screen via whatever button exists.
      for (const sel of ['#battleModal button:has-text("Open Chest")', '#offers .card', '#cardOffers .card', '#randomReward .card', '#skipReward', '#continueReward', '#returnWorld', '#closeMenu', '#battleModal button.primary']) {
        const el = await page.$(sel);
        if (el && await el.isVisible()) { await el.click().catch(() => {}); await sleep(400); await shot(`05-after-${fight}-${sel.replace(/[^a-z]/gi,'')}`); }
        if (await page.evaluate(() => !state.battle)) break;
        const more = await page.$$eval('#battleModal button', bs => bs.filter(b => b.offsetParent && !b.disabled).map(b => b.id || b.textContent.trim()));
        log.push(`fight ${fight} result buttons after ${sel}: ${JSON.stringify(more)}`);
      }
      const left = await page.evaluate(() => !state.battle && $('battleOverlay').classList.contains('hidden'));
      if (!left) { issues.push(`[ui] fight ${fight}: could not leave result screen via buttons`); await shot(`05-stuck${fight}`); await page.evaluate(() => { if (typeof finishBattle === 'function') finishBattle(); }); }
      await sleep(300);
    }

    // Save / reload / resume
    await page.click('#saveBtn').catch(() => issues.push('[ui] save button not clickable'));
    const before = await page.evaluate(() => JSON.stringify({ lvl: state.playerLevel, xp: state.xp, pool: state.pool.length, room: state.room }));
    await page.reload({ waitUntil: 'networkidle' });
    const resumeVisible = await page.isVisible('#resumeBtn');
    if (!resumeVisible) issues.push('[save] Continue button not shown after reload');
    else {
      await page.click('#resumeBtn'); await sleep(600);
      const after = await page.evaluate(() => JSON.stringify({ lvl: state.playerLevel, xp: state.xp, pool: state.pool.length, room: state.room }));
      log.push(`save: ${before} -> ${after}`);
      if (before !== after) issues.push(`[save] state changed across save/reload: ${before} vs ${after}`);
    }
    await shot('06-resumed');
  } catch (e) { issues.push(`[script] ${e.message.split('\n')[0]}`); await shot('99-error'); }

  for (const extra of ['arena.html', 'compendium.html']) {
    const p = await ctx.newPage();
    p.on('pageerror', e => issues.push(`[${extra} pageerror] ${e.message}`));
    p.on('response', r => { if (r.status() >= 400) issues.push(`[${extra} http ${r.status()}] ${r.url()}`); });
    await p.goto(BASE + extra, { waitUntil: 'networkidle' }).catch(e => issues.push(`[${extra}] ${e.message}`));
    await p.screenshot({ path: `${OUT}/${name}-${extra}.png` }); await p.close();
  }
  await browser.close();
  return { name, log, issues: [...new Set(issues)] };
}

(async () => {
  const results = [];
  results.push(await session('desktop', { viewport: { width: 1280, height: 800 } }));
  results.push(await session('phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }));
  console.log(JSON.stringify(results, null, 1));
})();
