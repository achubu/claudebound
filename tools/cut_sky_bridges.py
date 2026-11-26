#!/usr/bin/env python3
"""Round 587: cut the Sky Isles' bridges from the owner's sheet (prompt 12: src/bridge-sheet-blue.jpeg).

Top band: the whole east-west bridge (row 1, a reference) and its three pieces (row 2): west end, middle, east end. Bottom band:
the whole north-south bridge (column 1, a reference), its north end and middle (column 2) and its south end (column 3).
The green is keyed; glass the green showed through (the balustrades) is turned cyan, not cut away. Each piece is cut on its own
green margin; the east-west pieces share one top and bottom so their decks line up. Prints the measurements for GEN_THEMES.sky:
bridgeDeck (the east-west deck's top and bottom rows, balustrades included) and bridgeV (each north-south piece's deck left edge
and width, where the deck starts and ends, and the middle's cuts). Pieces go to `unused assets/environment/sky-gen-pink/props/
bridge/` (the originals tools/recolor_sky.py starts from) and assets/environment/sky-gen/props/bridge/; then run recolor_sky.py.
Check by eye that every pylon, post and lamp stands upright before cutting (owner, Round 585).
"""
import os, json
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'environment', 'sky-gen', 'src', 'bridge-sheet-blue.jpeg')
OUTS = [os.path.join(ROOT, 'unused assets', 'environment', 'sky-gen-pink', 'props', 'bridge'), os.path.join(ROOT, 'assets', 'environment', 'sky-gen', 'props', 'bridge')]

def keyed(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    key = (g > 150) & (g - np.maximum(r, b) > 80)
    key = ndimage.binary_opening(key, iterations=1) | ((g > 200) & (r < 60) & (b < 60))
    out = np.dstack([a, np.where(key, 0, 255).astype(np.uint8)])
    tint = ~key & (g > b + 12) & (g > r + 25)                        # glass the green shows through: cyan, at its own brightness
    nb = np.maximum(b, g); out[..., 2][tint] = nb[tint]; out[..., 1][tint] = (g[tint] * 0.92).astype(np.uint8)
    edge = ~key & ndimage.binary_dilation(key, iterations=2); sp = edge & (g > np.maximum(r, b))
    out[..., 1][sp] = np.maximum(r, b)[sp]
    return out

def pieces(rgba):
    m = rgba[..., 3] > 0; lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=6))
    boxes = ndimage.find_objects(lab); out = []
    for i, sl in enumerate(boxes):
        if (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start) < 20000: continue
        out.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop))
    return out

def band(alpha, axis, frac):  # the longest run of rows (axis 1) / columns (axis 0) at least frac opaque
    prof = (alpha > 0).mean(axis=axis); on = prof >= frac; best = (0, 0); st = None
    for i, v in enumerate(list(on) + [False]):
        if v and st is None: st = i
        if not v and st is not None:
            if i - st > best[1] - best[0]: best = (st, i)
            st = None
    return best

def main():
    a = np.asarray(Image.open(SRC).convert('RGB')); k = keyed(a); H, W = a.shape[:2]
    ps = pieces(k); print('pieces found', len(ps))
    top = [p for p in ps if p[0] < H * 0.45]; bot = [p for p in ps if p[0] >= H * 0.45]
    row2 = sorted([p for p in top if p[0] > min(q[0] for q in top) + 50], key=lambda p: p[2])   # (row 1 is the whole bridge)
    y0, y1 = min(p[0] for p in row2), max(p[1] for p in row2)
    ew = {}
    for name, p in zip(['west', 'mid', 'east'], row2): ew[name] = k[y0:y1, p[2]:p[3]]
    ew['mid'] = ew['mid'][:, 3:-3]; ew['west'] = ew['west'][:, :-3]; ew['east'] = ew['east'][:, 3:]  # (every cut edge loses 3px: the keying touched them, which showed as a line at each join)
    mid = ew['mid']; d0, d1 = band(mid[..., 3], 1, 0.9)                                         # deck rows (balustrades included)
    cols = sorted(bot, key=lambda p: p[2]); col2 = sorted([p for p in cols if abs(p[2] - cols[1][2]) < 80 and p != cols[0]], key=lambda p: p[0])
    north_p, vmid_p = col2[0], col2[-1]; south_p = max(cols, key=lambda p: p[2])
    ns = {n: k[p[0]:p[1], p[2]:p[3]] for n, p in [('north', north_p), ('vmid', vmid_p), ('south', south_p)]}
    # the south end as long as the north end: its extra plain deck is cut off its top (a straight cut through the glass)
    sh = ns['south'].shape[0]; nh = ns['north'].shape[0]; ns['south'] = ns['south'][max(0, sh - nh - 40):]
    ns['vmid'] = ns['vmid'][3:-3]; ns['north'] = ns['north'][:-3]; ns['south'] = ns['south'][3:]  # (the same for the north-south cuts)
    V = {}
    for n, img in ns.items():
        al = img[..., 3]; c0, c1 = band(al, 0, 0.9) if n == 'vmid' else (None, None)
        if n == 'vmid': V[n] = {'deckL': int(c0), 'w': int(c1 - c0), 'top': 0, 'bottom': int(img.shape[0])}
    c0, c1 = V['vmid']['deckL'], V['vmid']['deckL'] + V['vmid']['w']
    for n in ['north', 'south']:
        img = ns[n]; al = img[..., 3]; mw = V['vmid']['w']
        # this piece's deck: the columns whose run of opaque rows is longest (the deck), as wide as the middle's
        cprof = (al > 0).mean(0); best = max(range(0, al.shape[1] - mw), key=lambda x: cprof[x:x + mw].sum())
        rows = band(al[:, best:best + mw], 1, 0.9)
        V[n] = {'deckL': int(best), 'w': int(mw)}
        if n == 'north': V[n].update({'start': int(rows[0]), 'cut': int(al.shape[0])})
        else: V[n].update({'top': 0, 'end': int(rows[1])})
    for d in OUTS:
        os.makedirs(d, exist_ok=True)
        for n, img in list(ew.items()) + list(ns.items()): Image.fromarray(img).save(os.path.join(d, n + '.webp'), lossless=True)
    print(json.dumps({'bridgeDeck': [int(d0), int(d1)], 'bridgeV': V, 'sizes': {n: list(i.shape[1::-1]) for n, i in list(ew.items()) + list(ns.items())}}))

if __name__ == '__main__': main()
