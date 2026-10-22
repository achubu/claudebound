"""Round 232: open squares beside the road, where chests, gear, points of interest, the merchant,
the Cardsmith and Nexus Waypoints stand in the tile worlds (assets/plazas.js reads them).

Each tile lists hand-checked spots (x, y at 800x500, in the painting as it sits in src/, after any
TURN) on open ground off the road: a paved square, a sand yard, a ruin's flagstones, a forest
clearing, a flat of storm rock. They were picked by eye over a grid, never on roofs, props, trees or
water. The builders open each spot up to the walk mask (a disc round it and a footpath straight to
the nearest road), so the hero can walk up to whatever stands there, and write each room's spots,
flipped with the room, into the world's data.

Tiles with no such ground (most of the Sky Isles' lanes, Chronospire's stand-ins) list nothing;
their items keep the old placement beside the road until new paintings come.
"""
import numpy as np
from scipy import ndimage as nd

PLAZAS = {
    'elaris': {  # Solaris
        'corner-s1': [(450, 145), (455, 55)],
        'corner-s2': [(612, 155), (615, 315), (318, 165)],
        'cross-s1': [(318, 165), (482, 335)],
        'dead-top-s1': [(292, 128), (528, 128)],
        'diag-corner-s1': [(300, 155), (278, 262)],
        'diag-t-b-s1': [(185, 322), (468, 322)],
        'diag-t-c-s1': [(528, 335), (300, 320), (452, 165)],
        'straight-s1': [(312, 165), (490, 335)],
        't-bottom-s1': [(312, 162), (487, 162), (470, 322)],
        't-right-s1': [(322, 170), (478, 165), (320, 425), (205, 250)],
    },
    'sky': {  # terraces and the round plaza; the plain lanes have none
        'corner-a': [(372, 288)],
        'cross-a': [(300, 140), (500, 140), (300, 320), (500, 320)],
        'dead-bottom-a': [(290, 110), (510, 110), (285, 262), (515, 262)],
        'dead-right-a': [(300, 145), (345, 318), (165, 320)],
        'straight-a': [(280, 70), (520, 70)],
    },
    'wilds': {  # Elaris: the old ruins' flagstones and the clearings beside the trail
        'corner-a': [(590, 125), (585, 360), (475, 135)],
        'cross-a': [(590, 125), (590, 360), (475, 130), (230, 395)],
        'dead-bottom-a': [(470, 355), (325, 390)],
        'dead-right-a': [(590, 125), (585, 360), (470, 140)],
        'diag-a': [(590, 125), (585, 360), (470, 135)],
        'diag-c': [(590, 125), (585, 360), (470, 135)],
        'diag-d': [(590, 125), (585, 360), (470, 140)],
        'diag-e': [(480, 135), (195, 140), (235, 395)],
        't-bottom-a': [(590, 125), (590, 360), (225, 395), (195, 135)],
        't-right-a': [(590, 125), (585, 360), (475, 135)],
        't-right-b': [(590, 125), (585, 360), (475, 135), (260, 245)],
    },
    'vespera': {  # flats of storm rock and sand beside the path, the old stone circle
        'corner-a': [(320, 160), (480, 300)],
        'corner-b': [(335, 170), (460, 300)],
        'cross-a': [(318, 150), (485, 150), (320, 330), (490, 320)],
        'cross-b': [(305, 150), (480, 150), (310, 325), (480, 330)],
        'dead-bottom-a': [(300, 300), (495, 300)],
        'dead-right-a': [(220, 250), (470, 150)],
        'diag-a': [(540, 245), (280, 180)],
        'diag-c': [(500, 140), (470, 350)],
        'diag-d': [(500, 140), (470, 350)],
        'diag-f': [(265, 255), (480, 350)],
        't-bottom-a': [(290, 345), (500, 350), (290, 175)],
        't-right-a': [(475, 135), (475, 340)],
        't-right-b': [(470, 130), (320, 335), (470, 340)],
    },
}
DISC = 30   # the open ground round a spot the hero may walk on (px)
PATH = 13   # half the footpath's width


def carve(world, name, m):
    """The walk mask m (800x500 bool) with each of the tile's spots opened up to the road."""
    spots = PLAZAS.get(world, {}).get(name)
    if not spots: return m
    out = m.copy(); yy, xx = np.mgrid[0:500, 0:800]
    _, (iy, ix) = nd.distance_transform_edt(~m, return_indices=True)
    for x, y in spots:
        out |= (xx - x) ** 2 + (yy - y) ** 2 <= DISC ** 2
        ty, tx = iy[y, x], ix[y, x]  # the nearest road
        d = np.array([tx - x, ty - y], float); L = max(np.hypot(*d), 1); d /= L
        t = np.clip((xx - x) * d[0] + (yy - y) * d[1], 0, L)
        out |= (xx - x - t * d[0]) ** 2 + (yy - y - t * d[1]) ** 2 <= PATH ** 2
    return out


def room_spots(world, name, fx, fy):
    """The tile's spots as they sit in a room that flips it."""
    return [[800 - x if fx else x, 500 - y if fy else y] for x, y in PLAZAS.get(world, {}).get(name, [])]
