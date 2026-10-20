#!/usr/bin/env python3
"""Round 204: finish the Sky City tile kit from the owner's paintings and trace walk masks.

The Sky Isles are now a dense floating city (the owner's second set, 2624x1632, strictly
top-down). There are no roads: you walk on a pale cyan glass deck that flows between the
buildings, and wherever it reaches an edge it covers about the middle of that edge.

The generator gave the seven straight shapes but no usable diagonal pieces, so those are made:

* src/diagonal/diag-<dir>.jpg: the corner tile (deck from the top and right edges) with a
  glass bridge laid from its middle to the <dir> corner of the image, and the cross tile's
  fountain plaza pasted over the joint. The bridge is a strip of the straight bridge the owner
  painted in src/parts/bridge.jpg, turned to point at the corner, so its glass, grid and rim
  match the rest of the city.

Walk masks (src/masks/<name>.png, 800x500, white = walkable) are traced by colour: the deck is
pale cyan (its grid lines a stronger cyan); buildings are magenta, purple and gold. An
opening drops small cyan details (domes, windows), and only the big connected deck is kept.

    python3 tools/prepare_sky_tiles.py && python3 tools/build_tile_world.py sky
"""
import glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = 'assets/environment/sky/src'
DIAGS = {'se': (1, 1), 'nw': (0, 0), 'sw': (0, 1)}  # corner of the image each diagonal runs to
# The painted bridge in parts/bridge.jpg: a point on its centre line, its direction, and the
# half-width to copy (glass ~130px plus its rim).
BRIDGE_AT, BRIDGE_DIR, BRIDGE_HALF = (2144.2, 1220.2), (0.7528, 0.6583), 146
BRIDGE_FROM, BRIDGE_TO = -520, 560  # the clean stretch along the centre line, either side of BRIDGE_AT
PLAZA_R = 268  # the cross tile's fountain plaza


def rgb(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float)


def deck(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    pale = (R >= 170) & (G >= 225) & (B >= 225) & (G >= R + 8) & (B >= R + 8) & (B - R <= 75)
    grid = (G >= R + 45) & (B >= R + 60) & (G >= 170) & (B >= 200)
    return pale | grid


def diagonals():
    corner, bridge, cross = rgb(SRC + '/corner-a.jpg'), rgb(SRC + '/parts/bridge.jpg'), rgb(SRC + '/cross-a.jpg')
    H, W = corner.shape[:2]; cx, cy = W / 2, H / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    (bx, by), (dx, dy) = BRIDGE_AT, BRIDGE_DIR; nx_, ny_ = -dy, dx
    span = BRIDGE_TO - BRIDGE_FROM
    os.makedirs(SRC + '/diagonal', exist_ok=True)
    for name, (ex, ey) in DIAGS.items():
        tx, ty = ex * W - cx, ey * H - cy; L = np.hypot(tx, ty); tx, ty = tx / L, ty / L
        u = (xx - cx) * tx + (yy - cy) * ty; v = (xx - cx) * -ty + (yy - cy) * tx
        a = np.clip(BRIDGE_HALF + .5 - np.abs(v), 0, 1) * (u > 0)
        # Walk the painted bridge from its far (corner) end back, mirrored past its clean stretch,
        # so the end of the new bridge at the image corner matches the painted one's.
        t = BRIDGE_TO - (L - u)
        t = BRIDGE_FROM + np.abs(((t - BRIDGE_FROM) + span) % (2 * span) - span)
        sx, sy = bx + t * dx + v * nx_, by + t * dy + v * ny_
        band = np.dstack([nd.map_coordinates(bridge[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)])
        out = corner * (1 - a[..., None]) + band * a[..., None]
        d = np.hypot(xx - cx, yy - cy); pa = np.clip(PLAZA_R + .5 - d, 0, 1)[..., None]
        out = out * (1 - pa) + cross * pa
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(f'{SRC}/diagonal/diag-{name}.jpg', quality=92)


def laid(name):
    # The plaza and bridge laid on a diagonal tile, as walkable ground at 800x500 (their rims
    # and the fountain's colours would otherwise split or hole the traced deck).
    ex, ey = DIAGS[name]; k = 800 / 2624
    yy, xx = np.mgrid[0:500, 0:800].astype(float)
    tx, ty = ex * 800 - 400, ey * 500 - 250; L = np.hypot(tx, ty); tx, ty = tx / L, ty / L
    u = (xx - 400) * tx + (yy - 250) * ty; v = (xx - 400) * -ty + (yy - 250) * tx
    return (np.hypot(xx - 400, yy - 250) <= (PLAZA_R - 24) * k) | ((u > 0) & (np.abs(v) <= (BRIDGE_HALF - 22) * k))


def trace(path):
    walk = deck(rgb(path))
    small = np.asarray(Image.fromarray((walk * 255).astype(np.uint8)).resize((800, 500), Image.BOX)) > 110
    P = 20; small = np.pad(small, P, mode='edge')  # so the opening doesn't eat the room's edges
    small = nd.binary_closing(small, iterations=3)
    small = nd.binary_opening(small, structure=np.ones((3, 3)), iterations=6)[P:-P, P:-P]  # drop domes and windows
    lab, n = nd.label(small)
    sizes = nd.sum(small, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= .25 * max(sizes)]
    m = np.isin(lab, keep)
    name = os.path.splitext(os.path.basename(path))[0]
    if name.startswith('diag-'): m |= laid(name[5:])
    return nd.binary_fill_holes(m)


def main():
    diagonals()
    os.makedirs(SRC + '/masks', exist_ok=True)
    for old in glob.glob(SRC + '/masks/*.png'): os.remove(old)
    for p in sorted(glob.glob(SRC + '/*.jpg') + glob.glob(SRC + '/diagonal/*.jpg')):
        n = os.path.splitext(os.path.basename(p))[0]
        Image.fromarray((trace(p) * 255).astype(np.uint8)).save(f'{SRC}/masks/{n}.png')
        print('mask', n)


if __name__ == '__main__':
    main()
