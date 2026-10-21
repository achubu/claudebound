#!/usr/bin/env python3
"""Round 227: Vespera (the storm coast of glass) from the owner's paintings.

The owner's tiles (src/owner/*.jpeg, 2624x1632, strictly top-down) walk on a pale golden sand
path over dark rock, so the path is traced by colour. Their piers are planks, outlined by hand
(PIER, at 800x500, inside the rails; each reaches the image edge at its corner). Two of the
owner's tiles carry a pier that ends in the water (corner-b, t-right2): those are plain shapes.

Three rooms become storm-sea inlets ('cut' in build_tile_world.py). Their neighbours need the
piers as painted, plus one more shape the owner didn't paint: paths north, east and south with a
pier to the top-left. diag-c is pier-es-nw with t-right's north arm laid over it (the dark rock
round both is plain enough to take a soft seam).

Arms that the trace stops short of an edge (stepping stones, a stream ford) are bridged to the
edge and in to the room's middle, as for Elaris (prepare_wilds_tiles.arms).

    python3 tools/prepare_vespera_tiles.py && python3 tools/build_tile_world.py vespera
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(__file__))
from prepare_wilds_tiles import arms  # noqa: E402

SRC = 'assets/environment/vespera/src'
OWN = SRC + '/owner'
K = 2624 / 800
# Built name: (owner painting, its exits).
TILES = {'straight-a': ('straight', 'ns'), 'corner-a': ('corner-a', 'ne'), 'corner-b': ('corner-b', 'ne'),
         'cross-a': ('cross', 'nesw'), 'cross-b': ('cross2', 'nesw'), 't-bottom-a': ('t-bottom', 'esw'),
         't-right-a': ('t-right', 'nes'), 't-right-b': ('t-right2', 'nes'),
         'dead-bottom-a': ('dead-bottom', 's'), 'dead-right-a': ('dead-right', 'e')}
DIAG = {'diag-a': ('pier-n-sw', 'n'), 'diag-b': ('pier-n-se', 'n'), 'diag-c': ('pier-es-nw', 'nes'),
        'diag-d': ('pier-es-nw', 'es'), 'diag-e': ('pier-s-ne', 's'), 'diag-f': ('pier-s-ne-b', 's')}
PIER = {'pier-n-sw': [(325, 262), (370, 292), (60, 500), (0, 500), (0, 430)],
        'pier-n-se': [(475, 262), (430, 292), (740, 500), (800, 500), (800, 430)],
        'pier-es-nw': [(0, 0), (70, 0), (335, 185), (300, 245), (0, 55)],
        'pier-s-ne': [(430, 185), (470, 245), (800, 60), (800, 0), (745, 0)],
        'pier-s-ne-b': [(460, 190), (495, 250), (800, 40), (800, 0), (720, 0)]}


def rgb(name): return np.asarray(Image.open(f'{OWN}/{name}.jpeg').convert('RGB')).astype(float)


def composite(name):
    src, exits = TILES.get(name) or DIAG[name]
    im = rgb(src)
    if name == 'diag-c':  # lay t-right's north arm over the pier tile, with soft sides
        H, W = im.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; f = 30 * K
        a = np.clip(np.minimum(xx - 330 * K, 470 * K - xx) / f, 0, 1) * np.clip((235 * K - yy) / f, 0, 1)
        im = im * (1 - a[..., None]) + rgb('t-right') * a[..., None]
    return im


def trace(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    path = (R >= 150) & (R - B >= 40) & (G >= 110)
    small = np.asarray(Image.fromarray((path * 255).astype(np.uint8)).resize((800, 500), Image.BOX)) > 100
    P = 20; small = np.pad(small, P, mode='edge')
    small = nd.binary_closing(small, iterations=4)
    return nd.binary_opening(small, structure=np.ones((3, 3)), iterations=4)[P:-P, P:-P]


def mask(name, im):
    src, exits = TILES.get(name) or DIAG[name]
    m = trace(im)
    walk = np.zeros_like(m)
    if name in DIAG:
        poly = Image.new('L', (800, 500), 0); ImageDraw.Draw(poly).polygon(PIER[src], fill=255)
        walk = np.asarray(poly) > 127; m |= walk
    if name == 'diag-d': m[:150, 300:500] = False  # pier-es-nw has no north path (a bit of sand there)
    m, bands = arms(m, exits)
    bands |= walk
    lab, _ = nd.label(m)
    m = np.isin(lab, np.unique(lab[bands & m])) & (lab > 0)
    return nd.binary_fill_holes(m)


def main():
    os.makedirs(SRC + '/diagonal', exist_ok=True); os.makedirs(SRC + '/masks', exist_ok=True)
    for old in glob.glob(SRC + '/*.jpg') + glob.glob(SRC + '/diagonal/*.jpg') + glob.glob(SRC + '/masks/*.png'): os.remove(old)
    for name in {**TILES, **DIAG}:
        im = composite(name)
        out = f'{SRC}/diagonal/{name}.jpg' if name in DIAG else f'{SRC}/{name}.jpg'
        Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(out, quality=92)
        Image.fromarray((mask(name, im) * 255).astype(np.uint8)).save(f'{SRC}/masks/{name}.png')
        print('tile', name)


if __name__ == '__main__':
    main()
