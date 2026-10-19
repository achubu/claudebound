#!/usr/bin/env python3
"""Round 197: finish the Sky Isles tile kit from the owner's paintings and trace walk masks.

The owner's tiles (assets/environment/sky/src/*.jpg) are strictly top-down, with the walkway
leaving every edge at its exact middle (a 170px marble band plus a stone rim on 2624x1632).
Two kinds of tile were not painted, so this makes them from the others:

* dead-bottom-*: a dead-right painting (src/rotate/dead-right-*.jpg) turned a quarter turn
  clockwise, cropped back to 16:10 around the lookout and scaled up.
* src/diagonal/diag-<dir>.jpg: the corner tile (walkway from the top and right edges) with a
  third walkway laid from its bend to the <dir> corner of the image, and the cross tile's round
  plaza pasted over the joint. The diagonal is a strip of the straight tile's walkway, turned to
  point at the corner, so its stones and rim match.

Walk masks (src/masks/<name>.png, 800x500, white = walkable) are traced by colour: the marble
and its rim are warm grey (red a little above blue), clouds are white-blue, islands green.
An opening removes thin island cliffs and props, then only walkway reaching the room's middle
is kept. Some walkways start at an island's edge rather than the image's (the left arm of the
T and cross tiles), so each exit also gets a walkway-wide strip from the middle of its edge in to
the walkway: you walk across the island grass to the next room.

    python3 tools/prepare_sky_tiles.py && python3 tools/build_tile_world.py sky
"""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(__file__))
from build_solaris import SHAPES  # noqa: E402

SRC = 'assets/environment/sky/src'
EXITS = {**SHAPES, 'diag-': 'ne'}  # straight exits by name prefix
HALF = 114         # half the walkway's width with its rim, in source pixels
PLAZA_R = 318      # the cross tile's plaza, rim included
DIAGS = {'se': (1, 1), 'nw': (0, 0), 'sw': (0, 1)}  # corner of the image each diagonal runs to


def rgb(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float)


def dead_bottoms():
    for i, p in enumerate(sorted(glob.glob(SRC + '/rotate/dead-right-*.jpg'))):
        im = Image.open(p).convert('RGB').rotate(-90, expand=True)  # right edge -> bottom edge
        w, h = im.size; ch = round(w * 5 / 8)
        y0 = h // 2 - 390  # the lookout (radius ~330) sits a little above the middle
        im = im.crop((0, y0, w, y0 + ch)).resize((h, round(h * 5 / 8)), Image.LANCZOS)
        im.save(f'{SRC}/dead-bottom-{"abc"[i]}.jpg', quality=92)


def diagonals():
    corner, straight, cross = rgb(SRC + '/corner-a.jpg'), rgb(SRC + '/straight-a.jpg'), rgb(SRC + '/cross-a.jpg')
    H, W = corner.shape[:2]; cx, cy = W / 2, H / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    os.makedirs(SRC + '/diagonal', exist_ok=True)
    for name, (ex, ey) in DIAGS.items():
        out = corner.copy()
        tx, ty = ex * W - cx, ey * H - cy; L = np.hypot(tx, ty); tx, ty = tx / L, ty / L
        u = (xx - cx) * tx + (yy - cy) * ty; v = (xx - cx) * -ty + (yy - cy) * tx
        a = np.clip(HALF + .5 - np.abs(v), 0, 1) * (u > 0)
        sx, sy = W / 2 + v, np.clip(u + 40, 0, H - 1)
        band = np.dstack([nd.map_coordinates(straight[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)])
        out = out * (1 - a[..., None]) + band * a[..., None]
        d = np.hypot(xx - cx, yy - cy); pa = np.clip(PLAZA_R + .5 - d, 0, 1)[..., None]
        out = out * (1 - pa) + cross * pa
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(f'{SRC}/diagonal/diag-{name}.jpg', quality=92)


def trace(path, exits):
    im = rgb(path); R, G, B = im[..., 0], im[..., 1], im[..., 2]
    walk = (R - B >= 5) & (R - B <= 50) & (G <= R + 4) & (im.max(2) - im.min(2) <= 60) & (R >= 80)
    small = np.asarray(Image.fromarray((walk * 255).astype(np.uint8)).resize((800, 500), Image.BOX)) > 110
    P = 24; small = np.pad(small, P, mode='edge')  # so the opening doesn't eat the room's edges
    small = nd.binary_closing(small, iterations=3)
    small = nd.binary_opening(small, structure=np.ones((3, 3)), iterations=10)[P:-P, P:-P]  # drop cliffs and props
    lab, n = nd.label(small)
    keep = {lab[y, x] for y in range(230, 271) for x in range(380, 421) if lab[y, x]}
    if not keep:  # a dead end's lookout may sit off the middle: keep the biggest piece
        sizes = nd.sum(small, lab, range(1, n + 1)); keep = {int(np.argmax(sizes)) + 1}
    m = nd.binary_fill_holes(np.isin(lab, list(keep)))
    hw = 26  # half the marble's width at 800x500
    for d in exits:
        if d == 'w': x = np.argmax(m[250 - hw:250 + hw].any(0)); m[250 - hw:250 + hw, :x + 4] = True
        if d == 'e': x = 799 - np.argmax(m[250 - hw:250 + hw, ::-1].any(0)); m[250 - hw:250 + hw, x - 4:] = True
        if d == 'n': y = np.argmax(m[:, 400 - hw:400 + hw].any(1)); m[:y + 4, 400 - hw:400 + hw] = True
        if d == 's': y = 499 - np.argmax(m[::-1, 400 - hw:400 + hw].any(1)); m[y - 4:, 400 - hw:400 + hw] = True
    return m


def main():
    dead_bottoms(); diagonals()
    os.makedirs(SRC + '/masks', exist_ok=True)
    for old in glob.glob(SRC + '/masks/*.png'): os.remove(old)
    for p in sorted(glob.glob(SRC + '/*.jpg') + glob.glob(SRC + '/diagonal/*.jpg')):
        n = os.path.splitext(os.path.basename(p))[0]
        exits = EXITS[next(k for k in sorted(EXITS, key=len, reverse=True) if n.startswith(k))]
        Image.fromarray((trace(p, exits) * 255).astype(np.uint8)).save(f'{SRC}/masks/{n}.png')
        print('mask', n)


if __name__ == '__main__':
    main()
