#!/usr/bin/env python3
"""Round 574: cut gear fill textures (assets/items/gear-textures/) into seamless tiles.

  python3 tools/gear_texture_cut.py sheet.png name1,name2,...   a sheet of textures in a grid on magenta gutters
  python3 tools/gear_texture_cut.py single.jpg name             one texture filling the picture

For each texture it looks for the crop whose right edge continues its left edge and whose bottom continues its top (the pattern's
own repeat, searched separately across and down), then cross-fades the last rows and columns into the pixels just past the crop's
start, so the wrap has no seam. Nothing is stretched: the tile keeps the crop's proportions, scaled by SCALE both ways (the game keeps its proportions). Saves grey
lossless WebP and a 3x3 preview (<name>-3x3.png beside the sheet) to judge repeats by eye.
"""
import sys, os
import numpy as np
from PIL import Image

SCALE = .25  # one factor both ways: a generated texture's detail is ~4x the hero's pixels (Round 574)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'items', 'gear-textures')

def cells(path, count):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(int)
    mag = (rgb[..., 0] > 180) & (rgb[..., 1] < 90) & (rgb[..., 2] > 180)
    grey = np.asarray(Image.open(path).convert('L')).astype(float)
    if count == 1 or not mag.any(): return [grey]
    def runs(frac):  # spans of rows/cols that are not gutter
        keep = frac < .5; out = []; i = 0
        while i < len(keep):
            if keep[i]:
                j = i
                while j < len(keep) and keep[j]: j += 1
                if j - i > 40: out.append((i, j))
                i = j
            else: i += 1
        return out
    rows, cols = runs(mag.mean(1)), runs(mag.mean(0))
    got = [grey[a + 6:b - 6, c + 6:d - 6] for a, b in rows for c, d in cols]
    if len(got) != count: sys.exit(f'found {len(got)} cells ({len(rows)} rows x {len(cols)} columns), expected {count}')
    return got

def tile(im):
    H, W = im.shape; lo = max(48, min(H, W) // 6); hi = int(min(H, W) * .62)
    m0 = min(H, W) // 6
    def ex(w): return np.mean([np.abs(im[m0:H - m0, x] - im[m0:H - m0, x + w]).mean() for x in (m0, m0 + 17, m0 + 41)])
    def ey(h): return np.mean([np.abs(im[y, m0:W - m0] - im[y + h, m0:W - m0]).mean() for y in (m0, m0 + 17, m0 + 41)])
    w = min(range(lo, hi), key=ex); h = min(range(lo, hi), key=ey)
    x0 = y0 = m0; f = max(6, min(w, h) // 12); t = im[y0:y0 + h, x0:x0 + w].copy()
    for k in range(f):  # the last rows and columns fade into what lies just before the crop, so the wrap continues
        a = (k + 1) / (f + 1)
        t[h - f + k] = (1 - a) * t[h - f + k] + a * im[y0 - f + k, x0:x0 + w]
    for k in range(f):
        a = (k + 1) / (f + 1)
        t[:, w - f + k] = (1 - a) * t[:, w - f + k] + a * im[y0:y0 + h, x0 - f + k]
    return t.clip(0, 255).astype('uint8'), ex(w), ey(h)

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    names = sys.argv[2].split(','); os.makedirs(OUT, exist_ok=True)
    for name, im in zip(names, cells(sys.argv[1], len(names))):
        t, a, b = tile(im); T = Image.fromarray(t); T = T.resize((max(8, round(T.width * SCALE)), max(8, round(T.height * SCALE))), Image.LANCZOS); t = np.asarray(T); T.save(os.path.join(OUT, name + '.webp'), lossless=True)
        h, w = t.shape; p = Image.new('L', (w * 3, h * 3))
        for x in range(3):
            for y in range(3): p.paste(T, (x * w, y * h))
        p.save(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), name + '-3x3.png'))
        print(f'{name}: {w}x{h} tile, repeat error across {a:.1f}, down {b:.1f} (under ~10 tiles cleanly)')

if __name__ == '__main__': main()
