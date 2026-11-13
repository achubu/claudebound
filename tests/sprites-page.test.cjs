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
for (const w of fresh.worlds) for (const c of w.categories) for (const t of c.types) { const names = t.files.map(f => f.name); assert.deepStrictEqual(names, [...names].sort((a, b) => a.localeCompare(b)), t.label + ': sorted by name'); for (const f of t.files) { n++; assert(fs.existsSync(path.join(ROOT, f.src)), f.src + ' exists'); } }
assert.strictEqual(fresh.worlds[0].name, 'Neon Aftermath', 'world 1 first');
assert(fs.readFileSync(path.join(ROOT, 'sprites', 'index.html'), 'utf8').includes('<title>Textures'), 'the page is called Textures');
console.log('PASS: Textures page lists ' + n + ' pictures (world, category, type, name), all on disk.');
