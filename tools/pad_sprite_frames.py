#!/usr/bin/env python3
"""Round 200: keep a clear gutter between the frames of a 4-frame sprite sheet.

The game scales sheets down and steps through their frames. With smoothing, the browser mixes
in a pixel or two from the next frame, so art that touches (or nearly touches) a frame's side
shows up as a thin line at the edge of its neighbour while the creature animates.

Each frame is shrunk around its bottom-centre just enough to leave GUTTER transparent pixels at
both sides (and the top and bottom), so all four frames keep the same scale and baseline. The
sheet's size is unchanged. Sheets that already have the gutter are left alone.

    python3 tools/pad_sprite_frames.py assets/monsters/elaris/*.png assets/monsters/sky/*.png
"""
import sys
import numpy as np
from PIL import Image

GUTTER = 14


def margins(a, fw):
    out = []
    for f in range(4):
        c = a[:, f * fw:(f + 1) * fw] > 8
        cols, rows = np.where(c.any(0))[0], np.where(c.any(1))[0]
        if len(cols): out.append((cols.min(), fw - 1 - cols.max(), rows.min(), a.shape[0] - 1 - rows.max()))
    return out


def drop_strays(rgba, fw):
    # Round 223: a neighbour's wing tip that crossed into this frame is a small piece touching the
    # frame's left or right edge; clear it (the creature itself is the big piece).
    from scipy import ndimage as nd
    a = np.array(rgba)
    for f in range(4):
        cell = a[:, f * fw:(f + 1) * fw]; solid = cell[..., 3] > 8
        lab, n = nd.label(solid); sizes = nd.sum(solid, lab, range(1, n + 1))
        if not n: continue
        big = sizes.max()
        for i in range(1, n + 1):
            touches = lab[:, :2].__eq__(i).any() or lab[:, -2:].__eq__(i).any()
            if touches and sizes[i - 1] < 0.04 * big: cell[lab == i] = 0
    return Image.fromarray(a)


def pad(path):
    im = Image.open(path); mode = im.mode
    rgba = im.convert('RGBA'); W, H = rgba.size; fw = W // 4
    rgba = drop_strays(rgba, fw)
    m = margins(np.asarray(rgba)[..., 3], fw)
    side = min(min(x[0], x[1]) for x in m); top = min(x[2] for x in m); bottom = min(x[3] for x in m)
    if side >= GUTTER and top >= GUTTER and bottom >= 0: return print('ok    ', path)
    # One scale for every frame, about the bottom-centre: room at the sides, and at the top.
    s = min(1.0, (fw / 2 - GUTTER) / (fw / 2 - side), (H - GUTTER) / (H - top))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for f in range(4):
        cell = rgba.crop((f * fw, 0, (f + 1) * fw, H)).convert('RGBa')  # premultiplied, so edges stay clean
        w, h = round(fw * s), round(H * s)
        small = cell.resize((w, h), Image.LANCZOS).convert('RGBA')
        out.paste(small, (f * fw + (fw - w) // 2, H - h))
    if mode == 'P': out.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)
    else: out.save(path, optimize=True)
    print(f'padded {path}: scale {s:.3f} (side margin was {side}px)')


if __name__ == '__main__':
    for p in sys.argv[1:]: pad(p)
