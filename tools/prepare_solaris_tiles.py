#!/usr/bin/env python3
"""Round 228: Solaris's new look, from the owner's top-down paintings (src/owner/*.jpeg).

A golden desert city seen from directly above: pale cream sandstone streets between terracotta
roofs, sand, palms and turquoise canals. The streets are traced by colour into walk masks
(src/masks/<name>.png, 800x500, white = walkable), which tools/build_solaris.py uses as they are.
Arms the trace stops short of (a canal bridge, a wooden bridge at the edge) are bridged to the edge
and in to the room's middle (prepare_wilds_tiles.arms). Only small gaps in the paving are filled,
so the cross's sundial obelisk and the fountains stay solid.

The new tiles are named '-s1' so they never collide with the old tiles' hand-drawn masks, and the
builder may flip them both ways (they are strictly top-down).

    python3 tools/prepare_solaris_tiles.py && python3 tools/build_solaris.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(__file__))
from prepare_wilds_tiles import arms  # noqa: E402

SRC = 'assets/environment/solaris/src'
OWN = SRC + '/owner'
# Built name: (owner painting, its exits as painted).
TILES = {'corner-s1': ('corner', 'ne'), 'cross-s1': ('cross', 'nesw'), 'dead-top-s1': ('dead-top', 'n'),
         'straight-s1': ('straight', 'ns'), 't-bottom-s1': ('t-bottom', 'esw'), 't-right-s1': ('t-right', 'nes'),
         # Round 230: painted with streets west and south; turned half way round it is a second corner.
         'corner-s2': ('corner-b', 'ne')}
TURN = {'corner-s2'}  # paintings turned 180 degrees (top-down, so nothing ends up upside down)
DIAG = {'diag-t-c-s1': ('diag-top-left', 'nes'),  # streets north, east and south; causeway to the top-left
        'diag-corner-s1': ('diag-top-right', 'es')}  # Round 230: streets east and south; causeway to the top-right
CORNER = {'diag-t-c-s1': 'nw', 'diag-corner-s1': 'ne'}  # where each causeway leaves the image
SMALL_GAP = 600  # holes in the traced paving smaller than this (in room pixels) are filled


def trace(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    path = (R >= 225) & (G >= 200) & (B >= 150) & (R - B <= 100)
    m = np.asarray(Image.fromarray((path * 255).astype(np.uint8)).resize((800, 500), Image.BOX)) > 110
    P = 20; m = np.pad(m, P, mode='edge')
    m = nd.binary_closing(m, iterations=3)
    return nd.binary_opening(m, structure=np.ones((3, 3)), iterations=3)[P:-P, P:-P]


def mask(im, exits, corner=None):
    m, bands = arms(trace(im), exits)
    if corner:  # the causeway runs off this corner of the image
        near_x = slice(None, 120) if corner[1] == 'w' else slice(-120, None)  # along the edges, near the corner
        near_y = slice(None, 120) if corner[0] == 'n' else slice(-120, None)
        edge_x = slice(None, 20) if corner[1] == 'w' else slice(-20, None)   # the side edge itself
        edge_y = slice(None, 20) if corner[0] == 'n' else slice(-20, None)   # the top or bottom edge itself
        bands[edge_y, near_x] = True; bands[near_y, edge_x] = True
    lab, _ = nd.label(m)
    m = np.isin(lab, np.unique(lab[bands & m])) & (lab > 0)
    holes, n = nd.label(nd.binary_fill_holes(m) & ~m)
    sizes = nd.sum(holes > 0, holes, range(1, n + 1))
    return m | np.isin(holes, [i + 1 for i, s in enumerate(sizes) if s < SMALL_GAP])


def main():
    os.makedirs(SRC + '/diagonal', exist_ok=True); os.makedirs(SRC + '/masks', exist_ok=True)
    for name, (src, exits) in {**TILES, **DIAG}.items():
        rgb = Image.open(f'{OWN}/{src}.jpeg').convert('RGB')
        if name in TURN: rgb = rgb.rotate(180)
        out = f'{SRC}/diagonal/{name}.jpg' if name in DIAG else f'{SRC}/{name}.jpg'
        rgb.save(out, quality=92)
        m = mask(np.asarray(rgb).astype(int), exits, CORNER.get(name))
        Image.fromarray((m * 255).astype(np.uint8)).save(f'{SRC}/masks/{name}.png')
        print('tile', name)


if __name__ == '__main__':
    main()
