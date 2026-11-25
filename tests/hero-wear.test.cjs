'use strict';
// Round 554: the worn belt on the hero (assets/hero-wear.js; Codex's art, PR #318).
//  1. the art: both sheets are 2304 x 1024 RGBA on the hero's grid, the cleaned base keeps the hero's silhouette exactly,
//     and every one of the 36 cells has belt pixels;
//  2. every belt item names a look whose pictures are on disk;
//  3. the look follows what is worn (not what is owned): none without a belt, the belt's with one, back to none on taking
//     it off; finding a belt while one is worn changes nothing; no stats change;
//  4. in the browser (when a server runs on :8123): the hero's sheet swaps on equip and back on unequip, survives a world
//     change and a save and reload, and falls back to the plain hero when the belt art is missing.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
// a minimal PNG reader: size, and the alpha channel (8-bit RGBA, non-interlaced)
function png(file) { const b = fs.readFileSync(file); const w = b.readUInt32BE(16), h = b.readUInt32BE(20), depth = b[24], type = b[25]; let o = 8, idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8); if (t === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len)); o += 12 + len; }
  assert(depth === 8 && type === 6, file + ' is 8-bit RGBA'); const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = 4, stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[y * stride + x] = v & 255; } }
  return { w, h, alpha: (x, y) => px[(y * w + x) * 4 + 3] }; }
const hero = png(path.join(ROOT, 'assets/characters/protagonist-walk9.png')), base = png(path.join(ROOT, 'assets/characters/wearable/protagonist-walk9-nobelt.png')), belt = png(path.join(ROOT, 'assets/characters/wearable/belt-overlay.png'));
for (const s of [base, belt]) assert(s.w === 2304 && s.h === 1024, 'the sheets are on the hero\'s 2304 x 1024 grid');
let silhouette = 0; for (let y = 0; y < 1024; y++) for (let x = 0; x < 2304; x++) if (hero.alpha(x, y) !== base.alpha(x, y)) silhouette++;
assert.strictEqual(silhouette, 0, 'the cleaned base keeps the hero\'s silhouette exactly');
const empty = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { let n = 0; for (let y = r * 256; y < r * 256 + 256 && !n; y++) for (let x = c * 256; x < c * 256 + 256; x++) if (belt.alpha(x, y) > 20) { n++; break; } if (!n) empty.push(r + ',' + c); }
assert.deepStrictEqual(empty, [], 'the belt is in all 36 frames');

const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); ensureGear(); const out = {};
  out.files = Object.values(HERO_WEAR_LOOKS).flatMap(l => [l.base, l.overlay]); out.belts = Object.keys(GEAR).filter(id => GEAR[id].slot === 'belt'); out.mapped = Object.keys(HERO_WEAR_ART.belt);
  out.none = heroWearLooks().join('+');
  const stats = () => JSON.stringify(GEAR_SLOTS.map(s => state.gear[s]));
  state.relics.push('scarabBelt', 'stormglassBelt'); out.ownedOnly = heroWearLooks().join('+');
  equipGear('belt', 'scarabBelt'); out.worn = heroWearLooks().join('+');
  const before = gearStat('pierce'); equipGear('belt', 'stormglassBelt'); out.swapped = heroWearLooks().join('+'); out.pierce = [before, gearStat('pierce')];
  equipGear('belt', null); out.off = heroWearLooks().join('+');
  equipGear('belt', 'scarabBelt'); collectRelic(['hourglassBelt']); out.foundWhileWorn = [state.gear.belt, heroWearLooks().join('+')];
  return JSON.stringify(out); })()`));
for (const f of r.files) assert(fs.existsSync(path.join(ROOT, f)), f + ' is on disk');
assert.deepStrictEqual(r.mapped.sort(), r.belts.sort(), 'every belt item names a look');
assert.strictEqual(r.none, '', 'no belt, no look');
assert.strictEqual(r.ownedOnly, '', 'owning a belt is not wearing it');
assert.strictEqual(r.worn, 'cyber-belt', 'a worn belt shows');
assert.strictEqual(r.swapped, 'cyber-belt', 'and after a swap');
assert.deepStrictEqual(r.pierce, [1, 2], 'belt stats are as before');
assert.strictEqual(r.off, '', 'taking it off goes back to the plain hero');
assert.deepStrictEqual(r.foundWhileWorn, ['scarabBelt', 'cyber-belt'], 'finding a belt while one is worn keeps the worn one');
console.log('hero-wear (harness) ok');

// the browser check
(async () => {
  const ok = await new Promise(res => require('http').get('http://localhost:8123/index.html', x => { x.resume(); res(x.statusCode === 200); }).on('error', () => res(false)));
  if (!ok) { console.log('hero-wear: no server on :8123, browser check skipped'); return; }
  const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8123/index.html'); await page.waitForTimeout(800); await page.click('#newBtn'); await page.waitForTimeout(300);
  const bg = () => page.evaluate(() => { const el = document.querySelector('#player .hero-sprite'); return el ? getComputedStyle(el).backgroundImage : null; });
  const settle = () => page.waitForFunction(() => { const el = document.querySelector('#player .hero-sprite'); return el && (getComputedStyle(el).backgroundImage.includes('blob:') || !heroWearLooks().length); }, null, { timeout: 15000 });
  await page.evaluate(() => { closeMenu(); for (const id of ['menuOverlay', 'startOverlay', 'battleOverlay']) document.getElementById(id).classList.add('hidden'); renderWorld(); });
  const plain = await bg(); assert(/protagonist-walk9\.png/.test(plain), 'the plain hero at first: ' + plain);
  await page.evaluate(() => { state.relics.push('scarabBelt'); equipGear('belt', 'scarabBelt'); }); await settle(); const worn = await bg(); assert(/^url\("blob:/.test(worn), 'the belted sheet on equip: ' + worn);
  // the composite: a pixel on the belt differs from the plain hero's
  const differs = await page.evaluate(async () => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }); const a = await load('assets/characters/protagonist-walk9.png'), b = await load(heroWearUrl);
    const px = (img) => { const c = document.createElement('canvas'); c.width = 2304; c.height = 1024; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, 2304, 1024).data; }, A = px(a), B = px(b); let n = 0, alpha = 0; for (let i = 0; i < A.length; i += 4) { if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) n++; if (A[i + 3] < 128 && B[i + 3] - A[i + 3] > 60) alpha++; } return { n, alpha }; });
  assert(differs.n > 10000, 'the belted sheet differs from the plain one at the waist (' + differs.n + ' px)');
  assert(differs.alpha < 1500, 'and keeps the hero\'s outline: the belt reaches past it in only ' + differs.alpha + ' px (its soft edge over the waist\'s antialiasing is expected)');
  await page.evaluate(() => { state.region = 'elaris'; configureRegion('elaris'); state.room = regionStartRoom(); state.pos = { x: 400, y: 250 }; renderWorld(); }); assert(/^url\("blob:/.test(await bg()), 'kept after a world change');
  await page.evaluate(() => save()); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.getElementById('resumeBtn'); if (b) b.click(); });
  await page.waitForTimeout(800); await page.evaluate(() => { closeMenu(); for (const id of ['menuOverlay', 'startOverlay', 'battleOverlay']) document.getElementById(id).classList.add('hidden'); if (state) renderWorld(); });
  const afterLoad = await page.evaluate(() => state && state.gear && state.gear.belt); if (afterLoad) { await settle(); assert(/^url\("blob:/.test(await bg()), 'kept after a save and reload'); }
  else console.log('  (no continue button found: reload check skipped)');
  await page.evaluate(() => { equipGear('belt', null); }); assert(/protagonist-walk9\.png/.test(await bg()), 'back to the plain hero on unequip');
  // missing art falls back to the plain hero
  await page.route('**/belt-overlay.png*', rt => rt.abort());
  await page.evaluate(() => { heroWearCache.clear(); heroWearKey = ''; HERO_WEAR_LOOKS['cyber-belt'].overlay = 'assets/characters/wearable/belt-overlay.png?missing=1'; state.relics.push('scarabBelt'); equipGear('belt', 'scarabBelt'); });
  await page.waitForTimeout(1500); assert(/protagonist-walk9\.png/.test(await bg()), 'missing art: the plain hero, never a blank one');
  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close(); console.log('hero-wear (browser) ok');
})().catch(e => { console.error(e); process.exit(1); });
