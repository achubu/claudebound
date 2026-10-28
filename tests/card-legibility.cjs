// Round 277: browser check that nothing covers card text. Serve the repo (python3 -m http.server 8123), then
// node tests/card-legibility.cjs [phone]. Renders every card at level 3 in the hand and reports any type icon,
// cost circle or ownership strip lying over a line of text (or the strip under the cost).
const { chromium } = require('playwright');
const phone = process.argv[2] === 'phone';
(async () => { const b = await chromium.launch(); const p = await b.newPage(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
await p.goto('http://localhost:8123/index.html'); await p.waitForTimeout(1500);
const res = await p.evaluate(async () => { newGame(); configureRegion('city'); state.room = '8,4'; startBattle(roomSpawns(state.room)[0].uid);
  const ids = Object.keys(defs), bad = []; let checked = 0;
  const hit = (a, r) => a.left < r.right - 1 && a.right > r.left + 1 && a.top < r.bottom - 1 && a.bottom > r.top + 1;
  for (let i = 0; i < ids.length; i += 4) { const b = state.battle; b.hand = ids.slice(i, i + 4).map(id => { const c = make(id); c.level = 3; return c; }); renderBattle();
    for (const el of document.querySelectorAll('#hand .card')) { checked++;
      const blockers = ['.kind-badge', '.cost', '.ownership'].map(s => el.querySelector(s)).filter(Boolean);
      const texts = ['.card-name', '.rules', '.upgrade-row', '.mastery-label'].map(s => el.querySelector(s)).filter(Boolean);
      for (const t of texts) { const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim() || (n.parentElement && n.parentElement.closest('.kind-badge'))) continue; const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) for (const bl of blockers) { if (bl.contains(n)) continue; if (hit(bl.getBoundingClientRect(), r)) bad.push(el.querySelector('.card-name').textContent + ': ' + bl.className + ' over "' + n.textContent.trim().slice(0, 24) + '"'); } } }
      const o = el.querySelector('.ownership'), c = el.querySelector('.cost'); if (o && c && hit(o.getBoundingClientRect(), c.getBoundingClientRect())) bad.push(el.querySelector('.card-name').textContent + ': ownership under cost'); } }
  return { checked, bad: [...new Set(bad)] }; });
console.log(res.checked + ' cards, ' + res.bad.length + ' overlaps' + (res.bad.length ? ':\n' + res.bad.join('\n') : '')); await b.close(); process.exitCode = res.bad.length ? 1 : 0; })();
