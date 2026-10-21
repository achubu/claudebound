'use strict';
// Round 225: Elaris (world 'wilds') is built from the owner's forest paintings
// (tools/prepare_wilds_tiles.py): three rooms are lakes crossed by boardwalks, every tile's paths
// are one connected piece, and the cross's fountain has a walkable path round it.
const fs = require('fs'), path = require('path'), vm = require('vm');
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/wilds-data.js'), 'utf8'), ctx);
const d = ctx.TILE_WORLD_DATA.wilds;
assert(d.placeholders.length === 0, 'no stand-in tiles are left');
assert(JSON.stringify(d.cut) === JSON.stringify(['2,0', '2,3', '6,3']) && d.cut.every(k => !d.layout[k]), 'rooms 2,0, 2,3 and 6,3 are lakes');
assert(Object.keys(d.layout).length === 51, '51 rooms');
const diag = Object.entries(d.diag);
assert(diag.length === 6, 'six rooms have a boardwalk door');
for (const [k, doors] of diag) for (const [dir, door] of Object.entries(doors)) {
  assert(d.layout[door.to].exits[{ ne: 'sw', nw: 'se', se: 'nw', sw: 'ne' }[dir]] === k, k + ' ' + dir + ' boardwalk leads to ' + door.to + ' and back');
  assert(d.plan[k][0].startsWith('diag-'), k + ' uses a boardwalk tile');
}
for (const [k, r] of Object.entries(d.layout)) assert(!Object.values(r.exits).some(t => d.cut.includes(t)), k + ' has no door into a lake');

// The walk masks (800x500 PNGs). Read them with the tile builder's own Python stack.
const { execFileSync } = require('child_process');
const report = JSON.parse(execFileSync('python3', ['-c', `
import json, glob, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
out = {}
for f in sorted(glob.glob('assets/environment/wilds/src/masks/*.png')):
    m = np.asarray(Image.open(f)) > 127
    out[os.path.basename(f)[:-4]] = {'pieces': int(nd.label(m)[1]), 'fountain': bool(m[247, 400]), 'ring': [bool(m[247 + int(62 * np.sin(a)), 400 + int(62 * np.cos(a))]) for a in np.linspace(0, 6.28, 16, endpoint=False)]}
print(json.dumps(out))`], { cwd: path.join(__dirname, '..') }).toString());
for (const [n, r] of Object.entries(report)) assert(r.pieces === 1, n + ': its paths are one connected piece');
for (const n of ['cross-a', 't-bottom-a']) {
  assert(!report[n].fountain, n + ': the fountain is not walkable');
  assert(report[n].ring.every(Boolean), n + ': the path goes all the way round it');
}
const used = new Set(Object.values(d.plan).map(p => p[0]));
for (const n of used) assert(fs.existsSync(path.join(__dirname, '../assets/environment/wilds', n + '.webp')), n + '.webp ships');
