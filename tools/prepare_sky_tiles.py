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


def rgb(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float)


def deck(im):
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    pale = (R >= 170) & (G >= 225) & (B >= 225) & (G >= R + 8) & (B >= R + 8) & (B - R <= 75)
    grid = (G >= R + 45) & (B >= R + 60) & (G >= 170) & (B >= 200)
    glare = (R >= 215) & (G >= 232) & (B >= 232)  # Round 235: the third set's deck has near-white highlights
    return pale | grid | glare


# Round 219: the owner's own diagonal paintings (src/diagonal-owner/diag-<dir>.jpg) replace the
# built ones; their walk masks are traced as painted.
OWNER_DIAG = SRC + '/diagonal-owner'
# The owner's bridge glass is a darker blue than the deck, so its outline is drawn by hand
# (800x500, inside the rails).
OWNER_BRIDGE = {'diag-sw-b': [(395, 190), (470, 245), (250, 500), (105, 500)],  # Round 235 set
                'diag-se': [(352, 245), (392, 207), (712, 500), (612, 500)],
                'diag-nw': [(110, 0), (195, 0), (448, 240), (410, 285)]}


def owner_diagonals():
    import shutil
    os.makedirs(SRC + '/diagonal', exist_ok=True)
    for p in sorted(glob.glob(OWNER_DIAG + '/diag-*.jpg')):
        shutil.copyfile(p, SRC + '/diagonal/' + os.path.basename(p))


# Round 235: the owner's third set (src/owner/*.jpeg) adds grey glass terraces beside the deck, where
# items stand (tools/plazas.py). Two corners, a T (painted with its branch up, so turned top to
# bottom: the paintings are strictly top-down) and three bridge tiles. Two of the bridge tiles were
# painted with the deck from the top only; the rooms beside the cut corners need it from the right
# too, so corner-a's east arm is laid in (the paintings share one base city), clear of the bridge.
OWN = SRC + '/owner'
EAST_ARM = (470, 185, 300, 18)
# The grey glass terraces beside (and in places across) the deck are walkable ground: items stand
# there (tools/plazas.py). x0, y0, x1, y1 at 800x500, in the tile as saved (t-bottom-a turned). A terrace
# across a deck arm runs to the image edge, so the glass beyond it stays joined to the deck.
TERRACES = {'corner-a': [(362, 0, 437, 130), (228, 210, 315, 285), (485, 292, 560, 385), (562, 292, 640, 385)],
            'corner-b': [(228, 210, 315, 285), (485, 292, 560, 385), (562, 292, 640, 385)],
            't-bottom-a': [(365, 350, 435, 500), (485, 115, 560, 208), (562, 115, 640, 208)],
            'diag-sw-b': [(228, 210, 315, 285), (480, 215, 555, 285)],
            'diag-se': [(228, 210, 315, 285)],
            'diag-nw': [(228, 210, 315, 285), (300, 195, 475, 300)]}  # its junction lies under the bridge's glare  # from x, between y0 and y1 (800x500), soft edge


def poly_mask(pts, shape):
    from PIL import ImageDraw
    H, W = shape; k = W / 800
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([(x * k, y * k) for x, y in pts], fill=255)
    return np.asarray(im) > 127


def owner_tiles():
    os.makedirs(OWNER_DIAG, exist_ok=True)
    save = lambda im, path: Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(path, quality=92)
    save(rgb(OWN + '/corner-a.jpeg'), SRC + '/corner-a.jpg')
    save(rgb(OWN + '/corner-b.jpeg'), SRC + '/corner-b.jpg')
    save(rgb(OWN + '/t-top.jpeg')[::-1], SRC + '/t-bottom-a.jpg')
    save(rgb(OWN + '/diag-sw-b.jpeg'), OWNER_DIAG + '/diag-sw-b.jpg')
    arm = rgb(OWN + '/corner-a.jpeg')
    for name in ('diag-se', 'diag-nw'):
        im = rgb(OWN + '/' + name + '-n.jpeg'); H, W = im.shape[:2]; k = W / 800
        x0, y0, y1, f = (v * k for v in EAST_ARM)
        yy, xx = np.mgrid[0:H, 0:W].astype(float)
        a = np.clip((xx - x0) / f, 0, 1) * np.clip(np.minimum(yy - y0, y1 - yy) / f, 0, 1)
        a *= ~nd.binary_dilation(poly_mask(OWNER_BRIDGE[name], (H, W)), iterations=int(10 * k))
        save(im * (1 - a[..., None]) + arm * a[..., None], OWNER_DIAG + '/' + name + '.jpg')


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
    for x0, y0, x1, y1 in TERRACES.get(name, []):  # walkable, and joined to the deck by a short path if apart from it
        if not m[y0:y1, x0:x1].any():
            _, (iy, ix) = nd.distance_transform_edt(~m, return_indices=True)
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; tx, ty = ix[cy, cx], iy[cy, cx]
            yy, xx = np.mgrid[0:500, 0:800]; d = np.array([tx - cx, ty - cy], float); L = max(np.hypot(*d), 1); d /= L
            t = np.clip((xx - cx) * d[0] + (yy - cy) * d[1], 0, L + 4)
            m |= (xx - cx - t * d[0]) ** 2 + (yy - cy - t * d[1]) ** 2 <= 14 ** 2
        m[y0:y1, x0:x1] = True
    if name in OWNER_BRIDGE and os.path.exists(OWNER_DIAG + '/' + name + '.jpg'):
        from PIL import ImageDraw
        poly = Image.new('L', (800, 500), 0); ImageDraw.Draw(poly).polygon(OWNER_BRIDGE[name], fill=255)
        m |= np.asarray(poly) > 127
    return nd.binary_fill_holes(m)


def main():
    owner_tiles(); owner_diagonals()
    os.makedirs(SRC + '/masks', exist_ok=True)
    for old in glob.glob(SRC + '/masks/*.png'): os.remove(old)
    for p in sorted(glob.glob(SRC + '/*.jpg') + glob.glob(SRC + '/diagonal/*.jpg')):
        n = os.path.splitext(os.path.basename(p))[0]
        Image.fromarray((trace(p) * 255).astype(np.uint8)).save(f'{SRC}/masks/{n}.png')
        print('mask', n)


if __name__ == '__main__':
    main()
