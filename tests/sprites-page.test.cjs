'use strict';
// Round 421: the Textures page (sprites/index.html, aethercede.com/sprites) reads sprites/manifest.json; it must match
// CITY_SURFACES / CITY_TD_ART and the files on disk (rebuild with: node tools/build-sprites-manifest.cjs).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { build } = require('../tools/build-sprites-manifest.cjs');
const ROOT = path.join(__dirname, '..');
const fresh = build(), saved = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprites', 'manifest.json'), 'utf8'));
assert.deepStrictEqual(saved, fresh, 'sprites/manifest.json is up to date (run node tools/build-sprites-manifest.cjs)');
let n = 0;
for (const g of fresh.groups) for (const it of g.items) for (const f of it.files) { n++; assert(fs.existsSync(path.join(ROOT, f.src)), f.src + ' exists'); }
assert(fs.readFileSync(path.join(ROOT, 'sprites', 'index.html'), 'utf8').includes('<title>Textures'), 'the page is called Textures');
console.log('PASS: Textures page lists ' + n + ' pictures in ' + fresh.groups.length + ' categories, all on disk.');
