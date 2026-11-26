#!/usr/bin/env python3
"""Round 583: cut the owner's two Round 582 sheets for the Sky Isles (src/deck-dressing-sheet.jpeg, src/sky-sheet-2.jpeg).

  deck dressing: a 4x4 grid. Rows 1-2 are flat pieces (walked over) drawn on squares of deck: the green is keyed, then the deck
  square round each piece (its frame and the planks, flood-filled from the square's edge up to the piece's dark outline) is
  cleared -> props/deck-flat/<name>.webp. Rows 3-4 are standing pieces on green -> props/deck-stand/<name>.webp.
  second sky: two cloud tiles between green gutters -> surfaces/water/cloud-sea-2.webp, cloud-sea-3.webp, made to wrap
  (most of the tile, broad light evened out, edges cross-faded: tools/gear_texture_cut.py's free mode).
Pieces are cut in the colours drawn; run tools/recolor_sky.py after (it keeps these as the originals and turns them blue).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); ART = os.path.join(ROOT, 'assets', 'environment', 'sky-gen')
FLAT = ['mosaic', 'landing-pad', 'glass-inlay', 'flower-bed', 'reflect-pool', 'light-hex', 'moss-strip', 'compass']
STAND = ['bench', 'blossom-planter', 'holo-lantern', 'fountain', 'bollards', 'cafe-table', 'telescope', 'hanging-planter']

def green(a): r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int); return (g > 150) & (g - np.maximum(r, b) > 70)

def trim(rgba, pad=4):
    ys, xs = np.nonzero(rgba[..., 3] > 20); y0, y1, x0, x1 = max(0, ys.min() - pad), ys.max() + pad + 1, max(0, xs.min() - pad), xs.max() + pad + 1
    return rgba[y0:y1, x0:x1]

def keyed(cell):
    a = np.dstack([cell, np.full(cell.shape[:2], 255, np.uint8)]); gm = green(cell)
    gm = ndimage.binary_dilation(gm, iterations=1) & (ndimage.binary_dilation(gm, iterations=1) & ~ndimage.binary_erosion(~gm, iterations=1) | gm)
    a[..., 3][gm] = 0
    sp = (a[..., 3] > 0) & (cell[..., 1].astype(int) > np.maximum(cell[..., 0], cell[..., 2]).astype(int) + 20); a[..., 1][sp] = np.maximum(cell[..., 0], cell[..., 2])[sp]
    return a

def unsquare(a):
    # the deck square round a flat piece: its colour is the median just inside the square's frame; everything of that colour
    # (within a tolerance that takes in the plank lines) joined to the square's edge, and the frame itself, is cleared
    al = a[..., 3] > 0; ys, xs = np.nonzero(al); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    ring = np.zeros(al.shape, bool); ring[y0 + 10:y1 - 9, x0 + 10:x1 - 9] = True; inner = np.zeros(al.shape, bool); inner[y0 + 16:y1 - 15, x0 + 16:x1 - 15] = True; ring &= ~inner
    deck = np.median(a[..., :3][ring], 0); dist = np.abs(a[..., :3].astype(int) - deck).sum(-1)
    near = (dist < 70) & al; lab, _ = ndimage.label(near); edge_lab = set(np.unique(lab[ring & near])) - {0}
    clear = np.isin(lab, list(edge_lab)); band = np.zeros(al.shape, bool); band[y0:y1 + 1, x0:x1 + 1] = True; band[y0 + 10:y1 - 9, x0 + 10:x1 - 9] = False
    clear |= band; clear = ndimage.binary_opening(clear, iterations=1) | band
    a = a.copy(); a[..., 3][clear] = 0
    body = ndimage.binary_opening(a[..., 3] > 0, iterations=4)              # thin strands (plank lines) left on the outline go
    a[..., 3][~ndimage.binary_dilation(body, iterations=4)] = 0
    keep = a[..., 3] > 0; lab2, n = ndimage.label(keep)                       # only the piece itself (the biggest part)
    if n > 1: sizes = ndimage.sum(keep, lab2, range(1, n + 1)); a[..., 3][lab2 != (np.argmax(sizes) + 1)] = 0
    return a

def main():
    im = np.asarray(Image.open(os.path.join(ART, 'src', 'deck-dressing-sheet.jpeg')).convert('RGB')); H, W = im.shape[:2]; cw, ch = W // 4, H // 4
    for k in range(16):
        r, c = divmod(k, 4); cell = im[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]; a = keyed(cell)
        if r < 2: a = unsquare(a) if not (r == 1 and c == 2) else a
        kind, name = ('deck-flat', FLAT[k]) if r < 2 else ('deck-stand', STAND[k - 8])
        out = os.path.join(ART, 'props', kind, name + '.webp'); os.makedirs(os.path.dirname(out), exist_ok=True)
        Image.fromarray(trim(a)).save(out, lossless=True); print('wrote', os.path.relpath(out, ROOT))
    from gear_texture_cut import tile_free
    sk = np.asarray(Image.open(os.path.join(ART, 'src', 'sky-sheet-2.jpeg')).convert('RGB')); gm = green(sk)
    cols = np.nonzero(gm.mean(0) < .5)[0]; rows = np.nonzero(gm.mean(1) < .5)[0]; runs = []; s0 = cols[0]
    for p, q in zip(cols, cols[1:]):
        if q != p + 1: runs.append((s0, p)); s0 = q
    runs.append((s0, cols[-1])); runs = [x for x in runs if x[1] - x[0] > 200]
    for (x0, x1), name in zip(runs, ['cloud-sea-2', 'cloud-sea-3']):
        tile = sk[rows[0] + 8:rows[-1] - 8, x0 + 8:x1 - 8].mean(-1) * 0  # (placeholder, replaced below per channel)
        chans = [tile_free(sk[rows[0] + 8:rows[-1] - 8, x0 + 8:x1 - 8, i].astype(float))[0] for i in range(3)]
        out = os.path.join(ART, 'surfaces', 'water', name + '.webp'); Image.fromarray(np.dstack(chans)).save(out, lossless=True); print('wrote', os.path.relpath(out, ROOT), chans[0].shape)

if __name__ == '__main__': main()
