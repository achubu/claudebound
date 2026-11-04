'use strict';
// Round 351: creatures are scaled on the map toward one painted size (tools/enemy_sizes.py writes assets/enemy-sizes.css).
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), css = fs.readFileSync(path.join(root, 'assets/enemy-sizes.css'), 'utf8');
const fit = {}; for (const m of css.matchAll(/\[style\*="\/([^"]+)"\]\{--enemy-fit:([\d.]+)\}/g)) fit[m[1]] = +m[2];
assert(Object.keys(fit).length > 30, 'a size for most sheets');
for (const v of Object.values(fit)) assert(v >= 0.85 && v <= 1.45, 'within the clamp');
assert(fit['sky/gale-harpy.png'] > 1.3 && fit['city/data-wisp.png'] < 1, 'small creatures grow, big ones shrink');
for (const k of Object.keys(fit)) assert(fs.existsSync(path.join(root, 'assets/monsters', k)), 'sheet exists: ' + k);
assert(/#world \.enemy-node > \.monster-sprite\.wildlife-sprite\{scale:calc\(\.88 \* var\(--enemy-fit,1\)\)/.test(css), 'map sprites only');
assert(!/battle/.test(css), 'battle portraits untouched');
assert(/enemy-sizes\.css\?v=/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), 'loaded by the game');
console.log('enemy-sizes ok');
