# Round 377: art for the generated Chronospire (assets/chrono-gen.js).
#   python3 tools/prepare_chrono_gen.py <folder with the owner's drafts>
# Textures (floor, ground, sand): the right and bottom edges are cross-faded into the left and top so each one
# repeats without a seam, then scaled to 800px (drawn 400 room px wide). Prop sheets (2x2 objects on green): keyed like
# tools/strip_to_sheet.py --grid 2, each object trimmed and scaled (buildings 420px, small props 220px on the long
# side). Green glows inside an object are kept and turned amber. Writes assets/environment/chronospire/gen/*.webp.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets/environment/chronospire/gen')
TEXTURES = {'floor': '9if3dz', 'ground': '5vt56p', 'sand': 'dn7r7g'}
SHEETS = {  # draft id -> names (left to right, top to bottom), long side px
    '1ffxk9': (['gears', 'pendulum', 'crystals', 'bell'], 220),
    'n8xy1q': (['clock-tower', 'observatory', 'bell-tower', 'spire'], 420),
    '9zmye9': (['workshop', 'townhouse', 'foundry', 'ruin'], 420),
    'rj3mbs': (['hourglass', 'arch', 'engine', 'pavilion'], 420),
}

def find(folder, tag):
    for f in sorted(os.listdir(folder)):
        if tag in f and not f.startswith('.'): return os.path.join(folder, f)
    raise SystemExit('no draft with ' + tag)

def seamless(a, band):
    h, w = a.shape[:2]; t = np.linspace(0, 1, band)[None, :, None]
    a = a[:, :w - band].copy() if False else a
    out = a[:, :w - band].copy(); out[:, :band] = a[:, :band] * t + a[:, w - band:] * (1 - t)
    t = t.transpose(1, 0, 2); o2 = out[:h - band].copy(); o2[:band] = out[:band] * t + out[h - band:] * (1 - t)
    return o2

def textures(folder):
    for name, tag in TEXTURES.items():
        a = np.asarray(Image.open(find(folder, tag)).convert('RGB')).astype(np.float32)
        o = Image.fromarray(seamless(a, 200).clip(0, 255).astype(np.uint8)).resize((800, 800), Image.LANCZOS)
        o.save(os.path.join(OUT, name + '.webp'), quality=84, method=6); print(name, o.size)

def props(folder):
    for tag, (names, size) in SHEETS.items():
        a = np.asarray(Image.open(find(folder, tag)).convert('RGB')).astype(np.float32)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]; gx = g - np.maximum(r, b)
        alpha = np.clip((120 - gx) / 80, 0, 1)
        # Green the background does not reach (a lamp's glow inside the art) stays, when its colour differs from the background.
        lab, n = ndimage.label(alpha < 0.5)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.median(a[np.isin(lab, list(edge))], axis=0)
        keep = [i for i in range(1, n + 1) if i not in edge and (lab == i).sum() >= 200 and np.linalg.norm(np.median(a[lab == i], 0) - bg) > 60]
        glow = ndimage.binary_dilation(np.isin(lab, keep), iterations=3) & (alpha < 1)
        alpha = np.where(glow, 1, alpha)
        g2 = np.minimum(g, np.maximum(r, b))
        # Any green left (kept glows, green-tinted smoke and light) turns amber at the same brightness.
        k = np.clip((gx - 8) / 40, 0, 1) * (alpha > 0.5)
        r2 = r * (1 - k) + np.clip(g * 1.05, 0, 255) * k; g3 = np.where(glow, g * 0.78, g2) * k + g2 * (1 - k); b2 = b * (1 - k) + b * 0.45 * k
        rgba = np.dstack([r2, g3, b2, alpha * 255]).clip(0, 255).astype(np.uint8)
        A = rgba[..., 3].copy(); A[A < 40] = 0
        lab, n = ndimage.label(A > 0, structure=np.ones((3, 3)))
        cm = ndimage.center_of_mass(np.ones_like(A), lab, range(1, n + 1)); sz = ndimage.sum(np.ones_like(A), lab, range(1, n + 1))
        H, W = A.shape
        for i, name in enumerate(names):
            ids = [j for j in range(1, n + 1) if sz[j - 1] >= 60 and int(cm[j - 1][0] // (H / 2)) * 2 + int(cm[j - 1][1] // (W / 2)) == i]
            m = np.isin(lab, ids); ys, xs = np.nonzero(m)
            part = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); part[..., 3] = np.where(m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], part[..., 3], 0)
            o = Image.fromarray(part, 'RGBA'); s = size / max(o.size); o = o.resize((round(o.width * s), round(o.height * s)), Image.LANCZOS)
            o.save(os.path.join(OUT, name + '.webp'), quality=90, method=6); print(name, o.size)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); textures(sys.argv[1]); props(sys.argv[1])
