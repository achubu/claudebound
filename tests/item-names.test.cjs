'use strict';
// Round 325 (owner): no name labels under interactable objects, a softer glow, and the name pops up on interaction.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const src = fs.readFileSync('assets/item-names.js', 'utf8');
assert(/#world \.poi-node::after[^{]*\{content:none/.test(src), 'points of interest lose their label');
assert(/\.relic::after/.test(src), 'relics lose their label');
const peaks = [...src.matchAll(/drop-shadow\(0 0 (\d+(?:\.\d+)?)px color-mix/g)].map(m => +m[1]);
assert(peaks.length && Math.max(...peaks) <= 8, 'the glow reaches at most 8px (it was 22px): ' + peaks);
assert(!/enemy-node/.test(src), 'enemy labels (level, bounty) are left alone');
const html = fs.readFileSync('index.html', 'utf8');
assert(html.indexOf('item-names.js') > html.indexOf('ui-clarity.js') && html.indexOf('item-names.js') < html.indexOf('god-mode.js'), 'loaded after ui-clarity');
const r = JSON.parse(run(`(() => { newGame(); return JSON.stringify({ fn: typeof showItemName, open: String(openPOI).includes('showItemName'), relic: String(collectRelic).includes('showItemName'),
  name: itemNameAt({ dataset: { name: 'Moonlit Spring · used' } }), title: itemNameAt({ dataset: {}, title: 'Hidden loot chest' }), safe: showItemName() }); })()`));
assert.strictEqual(r.fn, 'function');
assert(r.open && r.relic, 'opening a point of interest or taking a relic shows the name');
assert.strictEqual(r.name, 'Moonlit Spring', 'the pop-up drops the "used" suffix');
assert.strictEqual(r.title, 'Hidden loot chest', 'falls back to the title (chests)');
assert.strictEqual(r.safe, null, 'does nothing without a real page');
console.log('item-names ok');
