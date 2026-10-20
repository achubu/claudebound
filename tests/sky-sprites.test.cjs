'use strict';
// Round 224: the Sky Isles creatures are the owner's cybernetic robot sheets, put together from
// multi-pose images by tools/compose_sprite_sheet.py: four 3:4 frames in one row, with a clear
// gutter at each frame's sides so no frame bleeds into the next.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
function png(file) { // decode an 8-bit RGBA or palette PNG (no interlace) to alpha rows
  const b = fs.readFileSync(file); let i = 8, w, h, type, pal = null, trns = null; const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i), kind = b.toString('ascii', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + len);
    if (kind === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; assert(d[8] === 8 && d[12] === 0, path.basename(file) + ' is 8-bit, not interlaced'); }
    if (kind === 'PLTE') pal = d; if (kind === 'tRNS') trns = d; if (kind === 'IDAT') idat.push(d);
    i += 12 + len;
  }
  const bpp = type === 6 ? 4 : 1, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, alpha = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      row[x] = (row[x] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]) & 255;
    }
    alpha.push(Uint8Array.from({ length: w }, (_, x) => type === 6 ? row[x * 4 + 3] : (trns && row[x] < trns.length ? trns[row[x]] : 255)));
    prev = row;
  }
  return { w, h, alpha };
}
const sheets = ['sunfeather-drake', 'rain-drone', 'gale-harpy', 'thunderhorn-ram', 'stormbell-warden', 'featherfall-matriarch', 'zenith-roc'];
for (const s of sheets) {
  const { w, h, alpha } = png(path.join(__dirname, '../assets/monsters/sky', s + '.png')), fw = w / 4;
  assert(w === 2064 && h === 688, s + ' is four 516x688 (3:4) frames in one row');
  let edge = 0, filled = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y][x] <= 8) continue; filled++;
    const fx = x % fw; if (fx < 8 || fx >= fw - 8) edge++;
  }
  assert(edge === 0, s + ' keeps every frame clear of its sides');
  assert(filled > 0.05 * w * h, s + ' has a creature in it');
}
const tw = fs.readFileSync(path.join(__dirname, '../assets/elaris-wildlife.js'), 'utf8');
assert(/SPRITE_VERSION='224'/.test(tw), 'SPRITE_VERSION is bumped so browsers fetch the new sheets');
