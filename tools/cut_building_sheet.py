# Round 496: cut a sheet of whole buildings (4x4 on green; KEY=magenta for magenta sheets, Round 549) into props/building-<quarter>/<name>.webp; prints each one's size on the sheet.
# python3 tools/cut_building_sheet.py sheet.jpeg assets/environment/city-gen/props '[[["market","noodle-bar"],...],...]'
# (a null in the names skips that cell, e.g. a building already cut from another sheet)
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
src, outroot, names = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32); r, g, b = a[...,0], a[...,1], a[...,2]
gx = g - np.maximum(r, b); alpha = np.clip((70 - gx) / 40, 0, 1)
if os.environ.get('KEY') == 'magenta':  # Round 549: sheets on flat magenta (Elaris: green art); the same keying with magenta's own measure
    mx = np.minimum(r, b) - g; alpha = np.clip((70 - mx) / 40, 0, 1)
solid = ndimage.binary_closing(alpha > 0.5, iterations=3)
lab, n = ndimage.label(solid); sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.15]
# Round 499: every piece goes with the building whose grid cell holds its middle (rugs, pots and baskets that stand apart on
# the green stay with their building); the 4 x 4 grid comes from the sheet's size
H, W = alpha.shape; small = [i + 1 for i, s in enumerate(sizes) if s >= 150]
out = {}
for ri in range(4):
    for ci in range(4):
        if not names[ri][ci]: continue
        q, nm = names[ri][ci]
        ks = [k for k in small if (lambda c: int(c[0] * 4 // H) == ri and int(c[1] * 4 // W) == ci)(ndimage.center_of_mass(lab == k))]
        if not ks: print('nothing in cell', ri, ci); continue
        m = ndimage.binary_fill_holes(np.isin(lab, ks)); ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        m = m                                                     # green shut inside a building (glass) stays
        al = np.where(m, np.maximum(alpha, ndimage.binary_erosion(m, iterations=3).astype(np.float32)), 0) * 1.0
        al = al * ndimage.binary_dilation(m, iterations=1)
        g2 = np.minimum(g, np.maximum(r, b) + 12) * (al < 0.99) + g * (al >= 0.99)
        rr_, gg_, bb_ = r, g2, b
        if os.environ.get('ENCLOSED') == 'clear':  # Round 516: green shut inside an object (a wheel's spokes, a rack, a tent's frame) is see-through
            al = np.where(m, alpha, 0) * ndimage.binary_dilation(m, iterations=1); g2 = np.minimum(g, np.maximum(r, b) + 12) * (al < 0.99) + g * (al >= 0.99); rr_, gg_, bb_ = r, g2, b
        if os.environ.get('ENCLOSED') == 'dark':  # Round 502: green shut inside a ruin (a hole, a broken window) is its dark inside, not green
            hole = m & (alpha < 0.5); dk = np.array([26, 28, 34], np.float32); rr_ = np.where(hole, dk[0], r); gg_ = np.where(hole, dk[1], g2); bb_ = np.where(hole, dk[2], b)
            edge = m & (alpha >= 0.5) & (alpha < 0.95); gg_ = np.where(edge, np.minimum(gg_, np.maximum(rr_, bb_)), gg_)
        if os.environ.get('KEY') == 'magenta':  # Round 549: magenta sheets: a magenta gap shut inside is see-through too, and no magenta fringe (red and blue held near green where the edge is see-through)
            al = np.where(m, alpha, 0) * ndimage.binary_dilation(m, iterations=1)
            cap = np.maximum(g, np.minimum(r, b) - 30) + 40; rr_ = np.where(al < 0.99, np.minimum(r, cap), r); bb_ = np.where(al < 0.99, np.minimum(b, cap), b); gg_ = g
        rgba = np.dstack([rr_, gg_, bb_, al * 255]).clip(0, 255).astype(np.uint8)[y0:y1 + 1, x0:x1 + 1]
        o_im = Image.fromarray(rgba, 'RGBA'); k2 = min(1, 480 / max(o_im.size)); o_im = o_im.resize((round(o_im.width * k2), round(o_im.height * k2)), Image.LANCZOS)
        d = os.path.join(outroot, os.environ.get('SLOT_PREFIX', 'building-') + q); os.makedirs(d, exist_ok=True); o_im.save(os.path.join(d, nm + '.webp'), quality=90)
        out[nm] = [q, int(x1 - x0 + 1), int(y1 - y0 + 1)]
print(json.dumps(out))
