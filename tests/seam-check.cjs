'use strict';
// Round 489: room seams in the generated worlds, checked by their pixels. Each room is painted on its own, but its ground,
// buildings, rims and sprites run on across the room's edge, so the last column of a room and the first column of the room
// beside it should look alike (the same for rows across north-south seams). A run of pixels that change sharply across a
// seam is something drawn on one side only: a sprite, roof, rim or texture cut off at the room's edge.
//   node tests/seam-check.cjs [city|elaris] [seed] [crops-dir]
// Prints each bad stretch (room pair, where along the seam, how long) and, with a crops dir, writes a picture of each.
// Needs the page served on :8123.
const { chromium } = require('playwright');
(async () => {
  const region = process.argv[2] || 'city', seed = process.argv[3] || '77', crops = process.argv[4] || null;
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8123/index.html?x=' + Date.now()); await page.waitForTimeout(1200);
  const out = await page.evaluate(async ({ region, seed, wantCrops }) => {
    newGame(); state.seed = isNaN(+seed) ? seed : +seed; state.region = region; configureRegion(region); cityGenEnsure();
    const theme = genTheme(), keys = Object.keys(rooms), cells = {}, at = (x, y) => cells[x + ',' + y];
    for (const k of keys) { const [x, y] = GEN_THEMES[theme].world(k); cells[x + ',' + y] = k; }
    const pics = {}; const paint = async k => { if (pics[k]) return pics[k]; const c = document.createElement('canvas'); document.body.append(c);
      for (let t = 0; t < 300; t++) { if (genWith(theme, () => paintChronoRoom(c, k))) break; await new Promise(r => setTimeout(r, 30)); }
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height); c.remove(); return pics[k] = { w: d.width, h: d.height, d: d.data }; };
    const px = (p, x, y) => { const i = (y * p.w + x) * 4; return [p.d[i], p.d[i + 1], p.d[i + 2]]; };
    const diff = (a, b2) => Math.abs(a[0] - b2[0]) + Math.abs(a[1] - b2[1]) + Math.abs(a[2] - b2[2]);
    const bad = [];
    for (const k of keys) { const [x, y] = GEN_THEMES[theme].world(k);
      for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = at(x + dx, y + dy); if (!n) continue; const A = await paint(k), B = await paint(n);
        const L = dx ? A.h : A.w, step = 2, run = []; // compare 2px in from each side against the edge pixels' own neighbours
        for (let i = 0; i < L; i += step) {
          const a0 = dx ? px(A, A.w - 1, i) : px(A, i, A.h - 1), a1 = dx ? px(A, A.w - 3, i) : px(A, i, A.h - 3);
          const b0 = dx ? px(B, 0, i) : px(B, i, 0), b1 = dx ? px(B, 2, i) : px(B, i, 2);
          const across = diff(a0, b0), within = Math.max(diff(a0, a1), diff(b0, b1));
          run.push(across > 90 && across > within * 2.2 ? 1 : 0); }
        // a stretch of 8+ mismatching samples (16px canvas, 8px room) in a window of 12 is a cut
        let s = -1; for (let i = 0; i <= run.length; i++) { const on = i < run.length && run.slice(i, i + 12).reduce((p, q) => p + q, 0) >= 8;
          if (on && s < 0) s = i; if (!on && s >= 0) { const len = (i - s) * step / 2; if (len >= 10) bad.push({ a: k, b: n, dir: dx ? 'e' : 's', from: s * step / 2, len }); s = -1; } } } }
    const shots = [];
    if (wantCrops) for (const f of bad.slice(0, 40)) { const A = pics[f.a], B = pics[f.b], c = document.createElement('canvas'), W = 160, H = 160; c.width = W * 2; c.height = H * 2; const g = c.getContext('2d');
      const ia = new ImageData(new Uint8ClampedArray(A.d), A.w, A.h), ib = new ImageData(new Uint8ClampedArray(B.d), B.w, B.h);
      const ca = document.createElement('canvas'); ca.width = A.w; ca.height = A.h; ca.getContext('2d').putImageData(ia, 0, 0); const cb = document.createElement('canvas'); cb.width = B.w; cb.height = B.h; cb.getContext('2d').putImageData(ib, 0, 0);
      const m = (f.from + f.len / 2) * 2;
      if (f.dir === 'e') { g.drawImage(ca, A.w - W, m - H, W, 2 * H, 0, 0, W, 2 * H); g.drawImage(cb, 0, m - H, W, 2 * H, W, 0, W, 2 * H); }
      else { g.drawImage(ca, m - W, A.h - H, 2 * W, H, 0, 0, 2 * W, H); g.drawImage(cb, m - W, 0, 2 * W, H, 0, H, 2 * W, H); }
      shots.push(c.toDataURL('image/png')); }
    return { bad, shots, rooms: keys.length };
  }, { region, seed, wantCrops: !!crops });
  console.log(region + ' seed ' + seed + ': ' + out.rooms + ' rooms, ' + out.bad.length + ' cut stretches' + (errs.length ? ' | page errors: ' + errs.slice(0, 2).join('; ') : ''));
  for (const f of out.bad) console.log('  ' + f.a + ' ' + f.dir + ' ' + f.b + ' at ' + f.from + 'px, ' + f.len + 'px');
  if (crops) { require('fs').mkdirSync(crops, { recursive: true }); out.shots.forEach((u, i) => require('fs').writeFileSync(crops + '/cut-' + i + '.png', Buffer.from(u.split(',')[1], 'base64'))); }
  await b.close(); process.exitCode = out.bad.length ? 1 : 0;
})();
