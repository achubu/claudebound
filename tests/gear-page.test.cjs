'use strict';
// Round 562: the Gear Studio (gear/index.html, aethercede.com/gear). Static: it reads the generated registry, the base sheet
// and assets/gear.js, and keeps tools/wearable_add.py's thresholds. In the browser (with a server on :8123; REQUIRE_BROWSER=1
// makes a missing server a failure): it loads with no errors, finds every gear item, draws an outfit, passes a real look and
// refuses a picture of the wrong size.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..'), html = fs.readFileSync(path.join(ROOT, 'gear/index.html'), 'utf8'), tool = fs.readFileSync(path.join(ROOT, 'tools/wearable_add.py'), 'utf8');
assert(html.includes('../assets/hero-wear-looks.js') && html.includes('HERO_WEAR_BASE') && html.includes("fetch('../assets/gear.js')"), 'reads the registry, the base and the gear table');
assert(/OUTLINE_SLACK = 2000/.test(tool) && /past > 2000/.test(html), 'the same outline allowance as the tool');
assert(/< 40\)/.test(html) && /< 40/.test(tool), 'the same 40 solid pixels per frame');
assert(/'pants': \(\(152, 119, 81\), \(118, 236\)\)/.test(tool) && /pants: \[\[152, 119, 81\], 118, 236\]/.test(html), 'the same old-clothing colours as the tool');
// (Round 564) every saved recipe (gear/recipes/<itemId>.json) is valid and names a real item of its slot
{ const vm = require('node:vm'), ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/gear-recipe.js'), 'utf8') + ';this.P = gearRecipeProblems;', ctx);
  const gsrc = fs.readFileSync(path.join(ROOT, 'assets/gear.js'), 'utf8'), items = Object.fromEntries([...gsrc.matchAll(/^\s*(\w+):\s*\{\s*name:\s*'[^']+',\s*slot:\s*'(\w+)'/gm)].map(m => [m[1], m[2]]));
  const dir = path.join(ROOT, 'gear/recipes');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []) { const id = f.replace(/\.json$/, ''), r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert(items[id], f + ': ' + id + ' is a gear item'); assert.equal(r.slot, items[id], f + ': its slot is the item\'s');
    assert.equal(JSON.stringify(ctx.P(r, ['pants', 'boots', 'shirt', 'belt', 'gloves'])), '[]', f + ' is a valid recipe'); } } // (compared as text: the array comes from another vm context)
(async () => {
  const ok = await new Promise(res => require('http').get('http://localhost:8123/gear/', x => { x.resume(); res(x.statusCode === 200); }).on('error', () => res(false)));
  if (!ok) { if (process.env.REQUIRE_BROWSER) { console.error('gear-page: no server on :8123'); process.exit(1); } console.log('gear-page: static ok; no server on :8123, browser check skipped'); return; }
  const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const browser = await chromium.launch(), page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8123/gear/'); await page.waitForFunction(() => window.gearStudioReady || window.gearStudioError, null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.gearStudioError || null), null, 'the studio loads');
  const ids = await page.evaluate(() => Object.keys(gear).sort()), src = fs.readFileSync(path.join(ROOT, 'assets/gear.js'), 'utf8');
  const want = [...src.matchAll(/^\s*(\w+):\s*\{\s*name:\s*'[^']+',\s*slot:\s*'\w+'/gm)].map(m => m[1]).sort();
  assert.deepEqual(ids, want, 'every gear item is offered');
  await page.selectOption('#slot-boots', 'cyber-boots'); await page.waitForTimeout(1500);
  const drawn = await page.evaluate(() => { const c = document.querySelector('#walks canvas'); const d = c.getContext('2d').getImageData(0, 0, 84, 84).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  assert(drawn > 500, 'the outfit walks (' + drawn + ' px drawn)');
  const checks = async () => page.evaluate(() => [...document.querySelectorAll('#checks li')].map(l => l.className + ': ' + l.textContent));
  // a real look (the gloves, as an update of their own look) passes every check
  await page.fill('#lookName', 'cyber-gloves'); await page.selectOption('#lookSlot', 'gloves'); await page.setInputFiles('#overlayFile', path.join(ROOT, 'assets/characters/wearable/cyber-gloves/overlay.png'));
  await page.waitForTimeout(3000); await page.click('#items input[value=ember]'); await page.waitForTimeout(4000);
  let c = await checks(); assert(!c.some(x => x.startsWith('bad')), 'a real look passes: ' + c.join(' | ')); assert(c.some(x => /Passes every check/.test(x)), 'and says so');
  assert.equal(await page.evaluate(() => document.getElementById('dlManifest').disabled), false, 'its manifest can be downloaded');
  // a picture of the wrong size is refused
  await page.setInputFiles('#overlayFile', path.join(ROOT, 'assets/characters/protagonist.jpeg').replace('.jpeg', '.jpeg')); await page.waitForTimeout(2000);
  c = await checks(); assert(c.some(x => x.startsWith('bad') && /must be 2304/.test(x)) || c.some(x => /could not be read/.test(x)), 'a wrong picture is refused: ' + c.join(' | '));
  // (Round 563) the fit templates: a guide per slot, with the slot's area and the Aetherlink
  for (const f of ['shirt-mask', 'pants-mask', 'boots-mask', 'belt-mask', 'gloves-mask', 'protected']) assert(fs.existsSync(path.join(ROOT, 'gear/templates', f + '.png')), f + '.png exists');
  await page.selectOption('#tmplSlot', 'boots'); await page.waitForTimeout(2000);
  const tv = await page.evaluate(() => { const c = document.getElementById('tmplView'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let cyan = 0, red = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 2] > 180 && d[i + 1] > 150 && d[i] < 120) cyan++; if (d[i] > 230 && d[i + 1] < 80) red++; } return { cyan, red }; });
  assert(tv.cyan > 1000 && tv.red > 50, 'the boots guide shows its area and the Aetherlink ' + JSON.stringify(tv));
  // (Round 564) the designer: a recipe drawn on the template, and a link that saves it as gear/recipes/<item>.json
  await page.selectOption('#dSlot', 'boots'); await page.waitForTimeout(1500); await page.click('#dItems input[value=cloudstepBoots]'); await page.waitForTimeout(2500);
  const dz = await page.evaluate(() => { const c = window.gearDesigned && window.gearDesigned.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return { n, slot: gearDesigned.slot, link: [...document.querySelectorAll('#dSave a')].map(a => a.href).join(' ') }; });
  assert(dz.n > 5000 && dz.slot === 'boots', 'the designer draws the boots ' + dz.n);
  assert(/github\.com\/achubu\/claudebound\/new\/main\/gear\/recipes\?filename=cloudstepBoots\.json&value=/.test(dz.link), 'and links to saving it as gear/recipes/cloudstepBoots.json');
  // (Round 569) built armor: plates over an undersuit
  await page.selectOption('#dSlot', 'shirt'); await page.check('#dArmor'); await page.waitForTimeout(3000);
  const ar = await page.evaluate(() => ({ armor: !!(window.gearDesigned && gearDesigned.recipe.armor), n: (() => { const c = gearDesigned.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })() }));
  assert(ar.armor && ar.n > 40000, 'built armor is drawn ' + JSON.stringify(ar));
  assert.deepEqual(errors, [], 'no page errors');
  await browser.close(); console.log('gear-page ok');
})().catch(e => { console.error(e); process.exit(1); });
