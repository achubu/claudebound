#!/usr/bin/env python3
"""Round 251: the hero's walk sheet from the owner's four 3x3 sheets (assets/characters/src/).

Each source sheet is one direction (down, left, right, up) on a transparent background: the first pose
stands, the other eight are a walk cycle, read left to right, top to bottom. The output is a 9x4 sheet
(columns: stand, then walk frames 1-8; rows: down, left, right, up), every frame drawn at one scale,
the feet on one baseline and the head and torso centred, so the body doesn't jitter as the legs swing.

    python3 tools/build_hero_sheet.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = 'assets/characters/src/protagonist-walk-{}.webp'
OUT = 'assets/characters/protagonist-walk9.png'
ROWS = ['down', 'left', 'right', 'up']
CELL = 256          # output frame (square, like the old sheet)
FIGURE_H = 0.92     # the tallest figure fills this share of the frame
BASE = 0.97         # feet stand at this height in the frame


def poses(path):
    """The nine poses, by the 3x3 grid: each takes the shapes whose centre falls in its cell."""
    a = np.asarray(Image.open(path).convert('RGBA')); H, W = a.shape[:2]
    alpha = a[..., 3] > 20
    lab, n = nd.label(nd.binary_closing(alpha, iterations=2))
    idx = range(1, n + 1); sizes = nd.sum(alpha, lab, idx); cents = nd.center_of_mass(alpha, lab, idx)
    out = []
    for r in range(3):
        for c in range(3):
            mine = [i + 1 for i, (cy, cx) in enumerate(cents) if int(cy // (H / 3)) == r and int(cx // (W / 3)) == c and sizes[i] > 30]
            m = np.isin(lab, mine)
            ys, xs = np.nonzero(m)
            crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
            crop[..., 3] = np.where(m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[..., 3], 0)
            out.append(crop)
    return out


def main():
    rows = [poses(SRC.format(r)) for r in ROWS]
    tallest = max(p.shape[0] for row in rows for p in row)
    k = CELL * FIGURE_H / tallest
    sheet = Image.new('RGBA', (CELL * 9, CELL * 4), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, p in enumerate(row):
            im = Image.fromarray(p); w, h = max(1, round(p.shape[1] * k)), max(1, round(p.shape[0] * k))
            im = im.resize((w, h), Image.LANCZOS); al = np.asarray(im)[..., 3] > 20
            top = al[: max(1, int(h * 0.45))]  # head and torso: their centre is the figure's centre
            xs = np.nonzero(top.any(0))[0]; cx = (xs.min() + xs.max()) / 2 if len(xs) else w / 2
            x = round(c * CELL + CELL / 2 - cx); y = round(r * CELL + CELL * BASE - h)
            sheet.alpha_composite(im, (x, y))
    sheet.save(OUT, optimize=True)
    print(OUT, sheet.size)


if __name__ == '__main__':
    main()
