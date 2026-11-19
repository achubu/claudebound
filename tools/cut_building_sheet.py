# Round 496: cut a sheet of whole buildings (4x4 on green) into props/building-<quarter>/<name>.webp; prints each one's size on the sheet.
# python3 tools/cut_building_sheet.py sheet.jpeg assets/environment/city-gen/props '[[["market","noodle-bar"],...],...]'
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
src, outroot, names = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32); r, g, b = a[...,0], a[...,1], a[...,2]
gx = g - np.maximum(r, b); alpha = np.clip((70 - gx) / 40, 0, 1)
solid = ndimage.binary_closing(alpha > 0.5, iterations=3)
lab, n = ndimage.label(solid); sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.15]
objs = []
for k in keep:
    ys, xs = np.nonzero(lab == k); objs.append((ys.mean(), xs.mean(), k, ys.min(), ys.max(), xs.min(), xs.max()))
print('pieces', len(objs))
objs.sort(key=lambda o: o[0]); rows = [objs[i:i + 4] for i in range(0, len(objs), 4)]
out = {}
for ri, row in enumerate(rows):
    for ci, o in enumerate(sorted(row, key=lambda o: o[1])):
        q, nm = names[ri][ci]
        _, _, k, y0, y1, x0, x1 = o
        m = ndimage.binary_fill_holes(lab == k)                 # green shut inside a building (glass) stays
        al = np.where(m, np.maximum(alpha, ndimage.binary_erosion(m, iterations=3).astype(np.float32)), 0)
        al = al * ndimage.binary_dilation(m, iterations=1)
        g2 = np.minimum(g, np.maximum(r, b) + 12) * (al < 0.99) + g * (al >= 0.99)
        rgba = np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8)[y0:y1 + 1, x0:x1 + 1]
        o_im = Image.fromarray(rgba, 'RGBA'); k2 = min(1, 480 / max(o_im.size)); o_im = o_im.resize((round(o_im.width * k2), round(o_im.height * k2)), Image.LANCZOS)
        d = os.path.join(outroot, 'building-' + q); os.makedirs(d, exist_ok=True); o_im.save(os.path.join(d, nm + '.webp'), quality=90)
        out[nm] = [q, int(x1 - x0 + 1), int(y1 - y0 + 1)]
print(json.dumps(out))
