'use strict';
// Round 554: the worn belt on the hero (assets/hero-wear.js; Codex's art, PR #318).
//  1. the art: tools/wearable_add.py --check (Round 555);
//  2. every belt item names a look whose pictures are on disk;
//  3. the look follows what is worn (not what is owned): none without a belt, the belt's with one, back to none on taking
//     it off; finding a belt while one is worn changes nothing; no stats change;
//  4. in the browser (when a server runs on :8123): the hero's sheet swaps on equip and back on unequip, survives a world
//     change and a save and reload, and falls back to the plain hero when the belt art is missing.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
// (1, Round 555) every look in assets/characters/wearable/ passes tools/wearable_add.py --check (sizes, all 36 frames, inside
// the outline, clear patches opaque and inside the hero, items real and of the look's slot, no item in two looks) and the
// generated registry matches the look folders
{ const r = require('child_process').spawnSync('python3', [path.join(ROOT, 'tools/wearable_add.py'), '--check'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'wearable looks check:\n' + r.stdout + r.stderr); console.log(r.stdout.trim().split('\n').filter(l => !l.startsWith('wrote')).join('\n')); }
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); ensureGear(); const out = {};
  out.files = Object.values(HERO_WEAR_LOOKS).flatMap(l => [l.clear, l.overlay]).filter(Boolean); out.order = HERO_WEAR_SLOTS.join(','); out.belts = Object.keys(GEAR).filter(id => GEAR[id].slot === 'belt'); out.mapped = Object.keys(HERO_WEAR_ART.belt);
  out.none = heroWearLooks().join('+');
  const stats = () => JSON.stringify(GEAR_SLOTS.map(s => state.gear[s]));
  state.relics.push('scarabBelt', 'stormglassBelt'); out.ownedOnly = heroWearLooks().join('+');
  equipGear('belt', 'scarabBelt'); out.worn = heroWearLooks().join('+');
  const before = gearStat('pierce'); equipGear('belt', 'stormglassBelt'); out.swapped = heroWearLooks().join('+'); out.pierce = [before, gearStat('pierce')];
  equipGear('belt', null); out.off = heroWearLooks().join('+');
  state.relics.push('cloudstepBoots'); equipGear('belt', 'scarabBelt'); equipGear('boots', 'cloudstepBoots'); out.stacked = heroWearLooks().join('+'); equipGear('boots', null); /* (Round 557: boots and belt stack, boots first) */
  equipGear('belt', 'scarabBelt'); collectRelic(['hourglassBelt']); out.foundWhileWorn = [state.gear.belt, heroWearLooks().join('+')];
  return JSON.stringify(out); })()`));
for (const f of r.files) assert(fs.existsSync(path.join(ROOT, f)), f + ' is on disk');
assert.deepStrictEqual(r.mapped.sort(), r.belts.sort(), 'every belt item names a look');
assert.strictEqual(r.order, 'pants,boots,shirt,belt,gloves', 'looks stack in slot order');
assert.strictEqual(r.none, '', 'no belt, no look');
assert.strictEqual(r.ownedOnly, '', 'owning a belt is not wearing it');
assert.strictEqual(r.worn, 'cyber-belt', 'a worn belt shows');
assert.strictEqual(r.swapped, 'cyber-belt', 'and after a swap');
assert.deepStrictEqual(r.pierce, [1, 2], 'belt stats are as before');
assert.strictEqual(r.off, '', 'taking it off goes back to the plain hero');
assert.strictEqual(r.stacked, 'cyber-boots+cyber-belt', 'boots and belt worn together stack, in slot order');
assert.deepStrictEqual(r.foundWhileWorn, ['scarabBelt', 'cyber-belt'], 'finding a belt while one is worn keeps the worn one');
console.log('hero-wear (harness) ok');

// the browser check
(async () => {
  const ok = await new Promise(res => require('http').get('http://localhost:8123/index.html', x => { x.resume(); res(x.statusCode === 200); }).on('error', () => res(false)));
  if (!ok) { if (process.env.REQUIRE_BROWSER) { console.error('hero-wear: REQUIRE_BROWSER is set and there is no server on :8123'); process.exit(1); } console.log('hero-wear: no server on :8123, browser check skipped (REQUIRE_BROWSER=1 makes this a failure)'); return; }
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
  // (Round 559) the base is the beltless hero; with no belt worn the brown belt is drawn back: boots alone = the original hero
  // with the boots over it, to the pixel (rounding aside)
  await page.evaluate(() => { equipGear('belt', null); state.relics.push('cloudstepBoots'); equipGear('boots', 'cloudstepBoots'); }); await settle(); await page.waitForTimeout(300);
  const exact = await page.evaluate(async () => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }); const [a, o, b] = await Promise.all([load('assets/characters/protagonist-walk9.png'), load(HERO_WEAR_LOOKS['cyber-boots'].overlay), load(heroWearUrl)]);
    const c = document.createElement('canvas'); c.width = 2304; c.height = 1024; const g = c.getContext('2d'); g.drawImage(a, 0, 0); g.drawImage(o, 0, 0); const A = g.getImageData(0, 0, 2304, 1024).data;
    g.clearRect(0, 0, 2304, 1024); g.drawImage(b, 0, 0); const B = g.getImageData(0, 0, 2304, 1024).data; let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) > 3 || Math.abs(A[i + 1] - B[i + 1]) > 3 || Math.abs(A[i + 2] - B[i + 2]) > 3 || Math.abs(A[i + 3] - B[i + 3]) > 3) n++; return n; });
  assert(exact < 50, 'boots alone: the original hero, brown belt and all, with the boots over it (' + exact + ' px differ)');
  await page.evaluate(() => { equipGear('boots', null); equipGear('belt', 'scarabBelt'); }); await settle();
  await page.evaluate(() => { state.region = 'elaris'; configureRegion('elaris'); state.room = regionStartRoom(); state.pos = { x: 400, y: 250 }; renderWorld(); }); assert(/^url\("blob:/.test(await bg()), 'kept after a world change');
  await page.evaluate(() => save()); await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.getElementById('resumeBtn'); if (b) b.click(); });
  await page.waitForTimeout(800); await page.evaluate(() => { closeMenu(); for (const id of ['menuOverlay', 'startOverlay', 'battleOverlay']) document.getElementById(id).classList.add('hidden'); if (state) renderWorld(); });
  const afterLoad = await page.evaluate(() => state && state.gear && state.gear.belt); if (afterLoad) { await settle(); assert(/^url\("blob:/.test(await bg()), 'kept after a save and reload'); }
  else { assert(!process.env.REQUIRE_BROWSER, 'the reload check must run when REQUIRE_BROWSER is set'); console.log('  (no continue button found: reload check skipped)'); }
  await page.evaluate(() => { equipGear('belt', null); }); assert(/protagonist-walk9\.png/.test(await bg()), 'back to the plain hero on unequip');
  // (Round 564) a recipe file for a worn item: the game draws it in place of the item's drawn look
  const rdir = path.join(ROOT, 'gear/recipes'), rfile = path.join(rdir, 'mossweavePants.json'), hadDir = fs.existsSync(rdir);
  fs.mkdirSync(rdir, { recursive: true }); fs.writeFileSync(rfile, JSON.stringify({ v: 1, slot: 'pants', texture: 'carbon', tint: '#334455', shade: 0.9, trim: { color: '#111111', width: 2 } }));
  try { await page.evaluate(() => { state.relics.push('mossweavePants'); equipGear('pants', 'mossweavePants'); });
    await page.waitForFunction(() => /recipe:mossweavePants/.test(heroWearKey) && heroWearUrl, null, { timeout: 15000 });
    assert.match(await bg(), /^url\("blob:/, 'a recipe is drawn by the game');
    await page.evaluate(() => equipGear('pants', null)); }
  finally { fs.rmSync(rfile); if (!hadDir) fs.rmSync(rdir, { recursive: true }); }
  // missing art falls back to the plain hero
  
  await page.evaluate(() => { heroWearCache.clear(); heroWearKey = ''; HERO_WEAR_LOOKS['cyber-belt'].overlay = 'assets/characters/wearable/cyber-belt/missing.png'; state.relics.push('stormglassBelt'); equipGear('belt', 'stormglassBelt'); /* (Round 566: a belt with no recipe; the Scarab Belt has one) */ });
  await page.waitForTimeout(1500); assert(/protagonist-walk9\.png/.test(await bg()), 'missing art: the plain hero, never a blank one');
  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close(); console.log('hero-wear (browser) ok');
})().catch(e => { console.error(e); process.exit(1); });
