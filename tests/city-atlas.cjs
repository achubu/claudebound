'use strict';
// Round 445: a stitched picture of Neon Aftermath as the game paints it, room by room, for checking the generator by eye
// (seams between rooms, the street network, how the blocks fill). Needs the page served on :8123.
//   node tests/city-atlas.cjs [seed] [out.png] [x0,y0,cols,rows] [scale]
// Rooms are in world cells (9 x 6); the default is the whole city at 0.25 scale.
const { chromium } = require('playwright');
(async () => {
  const seed = process.argv[2] || '77', out = process.argv[3] || 'city-atlas.png', [x0, y0, cols, rows] = (process.argv[4] || '0,0,9,6').split(',').map(Number), scale = Number(process.argv[5] || 0.25);
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8123/index.html?x=' + Date.now()); await page.waitForTimeout(1200);
  const data = await page.evaluate(async ({ seed, x0, y0, cols, rows, scale }) => {
    newGame(); state.seed = seed; state.region = 'city'; configureRegion('city'); cityGenEnsure();
    const big = document.createElement('canvas'); big.width = Math.round(cols * 800 * scale); big.height = Math.round(rows * 500 * scale); const g = big.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, big.width, big.height); g.imageSmoothingQuality = 'high';
    for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < cols; rx++) { const key = (x0 + rx) + ',' + (y0 + ry + 4); if (!CITY_ROOMS[key]) continue;
      const c = document.createElement('canvas'); document.body.append(c);
      for (let t = 0; t < 200; t++) { if (genWith('city', () => paintChronoRoom(c, key))) break; await new Promise(r => setTimeout(r, 50)); }
      g.drawImage(c, Math.round(rx * 800 * scale), Math.round(ry * 500 * scale), Math.round(800 * scale), Math.round(500 * scale)); c.remove(); }
    return big.toDataURL('image/png');
  }, { seed, x0, y0, cols, rows, scale });
  require('fs').writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote ' + out + (errs.length ? ' | page errors: ' + errs.slice(0, 3).join('; ') : ''));
  await b.close();
})();
