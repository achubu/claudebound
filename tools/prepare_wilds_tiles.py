#!/usr/bin/env python3
"""Round 225: Elaris (the forest, world 'wilds') from the owner's paintings.

The owner's tiles (src/owner/*.jpeg, 2624x1632, strictly top-down) share one base forest: the
ruins and trees sit in the same places in every tile, so a path arm (or a stretch of plain forest)
can be lifted from one tile into another with a soft seam. That makes the shapes the map needs
which were not painted:

* t-bottom-a: the cross with its north arm grown over (forest from dead-bottom's top).
* the diagonal tiles beside the three forest lakes ('cut' rooms in build_tile_world.py):
  diag-a/b are diag-nw/diag-sw as painted (paths north and east, boardwalk to the top-left);
  diag-c adds a south arm; diag-d swaps the north arm for a south one; diag-e is diag-se
  (path north, boardwalk to the bottom-right). The owner's t-bottom has its side path running on
  to the right edge, so it is a second t-right.

The cross gets a path painted round its fountain (the fountain itself is not walkable).

Walk masks (src/masks/<name>.png, 800x500, white = walkable) are traced by the path's golden
tan. Where a path runs on under a tree to the edge, the arm is bridged to the edge; the boardwalks
are outlined by hand (BOARDWALK); only pieces joined to an exit are kept.

    python3 tools/prepare_wilds_tiles.py && python3 tools/build_tile_world.py wilds
"""
import glob, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

SRC = 'assets/environment/wilds/src'
OWN = SRC + '/owner'
K = 2624 / 800  # owner pixels per room pixel
# Each tile: owner painting, exits it has (as built), and the diagonal it carries.
TILES = {
    'straight-a': ('straight', 'ns'), 'straight-b': ('straight2', 'ns'), 'corner-a': ('corner', 'ne'),
    'cross-a': ('cross', 'nesw'), 't-bottom-a': ('cross', 'esw'), 't-right-a': ('t-right', 'nes'),
    't-right-b': ('t-bottom', 'nes'), 'dead-bottom-a': ('dead-bottom', 's'), 'dead-right-a': ('dead-right', 'e'),
}
DIAG = {'diag-a': ('diag-nw', 'ne'), 'diag-b': ('diag-sw', 'ne'), 'diag-c': ('diag-nw', 'nes'),
        'diag-d': ('diag-sw', 'es'), 'diag-e': ('diag-se', 'n')}
# Boardwalks, inside the rails, at 800x500; each reaches the image edge at its corner.
BOARDWALK = {'diag-nw': [(52, 0), (108, 0), (348, 190), (302, 252), (0, 66), (0, 14)],
             'diag-sw': [(52, 0), (108, 0), (348, 190), (302, 252), (0, 66), (0, 14)],
             'diag-se': [(418, 252), (474, 224), (800, 430), (800, 500), (732, 500), (414, 292)]}
FOUNTAIN, FOUNT_R, RING_R = (400, 247), 46, 80  # the cross's fountain and the path round it
ARM_X, ARM_Y = (376, 425), (222, 272)  # where the painted arms meet the edges


def rgb(name): return np.asarray(Image.open(f'{OWN}/{name}.jpeg').convert('RGB')).astype(float)


def blend(base, donor, box, feather=24):
    """Lay donor over base inside box (x0, y0, x1, y1 in room pixels), with a soft edge
    (except along the image's own edges)."""
    H, W = base.shape[:2]; x0, y0, x1, y1 = [v * K for v in box]
    yy, xx = np.mgrid[0:H, 0:W]
    f = feather * K
    def ramp(d, at_edge): return np.ones_like(d, float) if at_edge else np.clip(d / f, 0, 1)
    a = np.minimum.reduce([ramp(xx - x0, x0 <= 0), ramp(x1 - xx, x1 >= W), ramp(yy - y0, y0 <= 0), ramp(y1 - yy, y1 >= H)])
    a = a * ((xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1))
    return base * (1 - a[..., None]) + donor * a[..., None]


def ring_path(im):
    """Paint a path round the fountain, under the standing stones."""
    H, W = im.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx - FOUNTAIN[0] * K, yy - FOUNTAIN[1] * K) / K
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    # The path's colour (bare earth, not its stepping stones) with the fine grain of the west arm
    # laid over it, so neither its colour nor a repeat shows.
    earth = (r >= 160) & (r - g >= 15) & (g - b >= 60)
    colour = np.percentile(im[earth], 70, axis=0)  # the sunlit earth (the median is in shade)
    patch = im[int(236 * K):int(258 * K), int(10 * K):int(60 * K)]
    grain = patch - nd.gaussian_filter(patch, (6, 6, 0))
    grain = np.concatenate([grain, grain[::-1]], 0); grain = np.concatenate([grain, grain[:, ::-1]], 1)  # mirrored: no seams
    tex = colour + 0.8 * np.tile(grain, (H // grain.shape[0] + 1, W // grain.shape[1] + 1, 1))[:H, :W]
    tex = tex * (1 - 0.06 * np.clip(1 - np.abs(d - 60) / 25, 0, 1))[..., None]  # a little wear down its middle
    stone = (np.abs(r - b) < 45) & (np.abs(r - g) < 30) & (d > RING_R - 14)  # grey standing stones stay on top
    stone = nd.binary_dilation(stone, iterations=3)
    a = np.clip((d - FOUNT_R) * K / 4, 0, 1) * np.clip((RING_R - d) * K / 10, 0, 1) * ~stone
    edge = np.clip(1 - np.abs(d - (RING_R - 2)) / 3, 0, 1) * 0.3  # a little shade at the grass edge
    out = im * (1 - a[..., None]) + tex * a[..., None]
    return out * (1 - edge[..., None] * a[..., None])


def composite(name, exits):
    src = TILES.get(name, DIAG.get(name))[0]; im = rgb(src)
    if src == 'cross': im = ring_path(im)
    if name == 't-bottom-a' or (name in DIAG and 'n' not in exits):
        im = blend(im, rgb('dead-bottom'), (330, 0, 470, 125))  # grow over the north arm
    if name in DIAG and 's' in exits:
        im = blend(im, rgb('t-right'), (335, 285, 465, 500))  # a south arm
    return im


def trace(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    path = (R >= 160) & (R - G >= 10) & (G - B >= 35) & (R - B >= 70)
    small = np.asarray(Image.fromarray((path * 255).astype(np.uint8)).resize((800, 500), Image.BOX)) > 100
    P = 20; small = np.pad(small, P, mode='edge')
    small = nd.binary_closing(small, iterations=4)
    return nd.binary_opening(small, structure=np.ones((3, 3)), iterations=4)[P:-P, P:-P]


def arms(m, exits):
    """Bridge each exit's arm to the edge (paths that run on under a tree) and in to the room's
    middle (some junctions are painted as moss), and return the bands at the edges."""
    bands = np.zeros_like(m)
    for d in exits:
        if d in 'ns':
            x0, x1 = ARM_X; rows = np.where(m[:, x0:x1].any(1))[0]
            half = rows[rows < 250] if d == 'n' else rows[rows >= 250]
            if not len(half): continue
            if d == 'n': m[:max(half.max() + 1, 250), x0:x1] = True; bands[:20, x0:x1] = True
            else: m[min(half.min(), 250):, x0:x1] = True; bands[-20:, x0:x1] = True
        else:
            # The arm's rows: the longest run of rows that are path across a stretch beside it.
            cover = (m[:, 560:600] if d == 'e' else m[:, 200:240]).mean(1) > .5
            cover[:180] = cover[320:] = False
            lab, n = nd.label(cover)
            runs = [np.where(lab == i)[0] for i in range(1, n + 1)]
            run = max(runs, key=len) if runs else []
            y0, y1 = (run.min(), run.max() + 1) if len(run) > 20 else ARM_Y
            cols = np.where(m[y0:y1].any(0))[0]
            half = cols[cols >= 400] if d == 'e' else cols[cols < 400]
            if not len(half): continue
            if d == 'e': m[y0:y1, min(half.min(), 400):] = True; bands[y0:y1, -20:] = True
            else: m[y0:y1, :max(half.max() + 1, 400)] = True; bands[y0:y1, :20] = True
    return m, bands


def mask(name, im, exits):
    m = trace(im)
    src = TILES.get(name, DIAG.get(name))[0]
    if name in DIAG:
        poly = Image.new('L', (800, 500), 0); ImageDraw.Draw(poly).polygon(BOARDWALK[src], fill=255)
        walk = np.asarray(poly) > 127; m |= walk
    if name == 't-bottom-a' or (name in DIAG and 'n' not in exits): m[:150, 300:500] = False  # the arm grown over
    m, bands = arms(m, exits)
    if name in DIAG: bands |= walk
    lab, _ = nd.label(m)
    m = np.isin(lab, np.unique(lab[bands & m])) & (lab > 0)
    m = nd.binary_fill_holes(m)
    if src == 'cross':
        yy, xx = np.mgrid[0:500, 0:800]; d = np.hypot(xx - FOUNTAIN[0], yy - FOUNTAIN[1])
        m |= (d >= FOUNT_R) & (d <= RING_R - 2)
        m &= d >= FOUNT_R + 2  # the fountain itself
    return m


def main():
    os.makedirs(SRC + '/diagonal', exist_ok=True); os.makedirs(SRC + '/masks', exist_ok=True)
    for old in glob.glob(SRC + '/*.jpg') + glob.glob(SRC + '/diagonal/*.jpg') + glob.glob(SRC + '/masks/*.png'): os.remove(old)
    for name, (_, exits) in {**TILES, **DIAG}.items():
        im = composite(name, exits)
        out = f'{SRC}/diagonal/{name}.jpg' if name in DIAG else f'{SRC}/{name}.jpg'
        Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(out, quality=92)
        Image.fromarray((mask(name, im, exits) * 255).astype(np.uint8)).save(f'{SRC}/masks/{name}.png')
        print('tile', name)


if __name__ == '__main__':
    main()
