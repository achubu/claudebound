# Round 377: art for the generated Chronospire (assets/chrono-gen.js).
#   python3 tools/prepare_chrono_gen.py <folder with the owner's drafts>
# Textures (floor, ground, pipes, chasm, yard; Round 386 dropped the sand): the right and bottom edges are cross-faded into the left and top so each one
# repeats without a seam, then scaled to 800px (drawn 400 room px wide). Prop sheets (2x2 objects on green): keyed like
# tools/strip_to_sheet.py --grid 2, each object trimmed and scaled (buildings 420px, small props 220px on the long
# side). Green glows inside an object are kept and turned amber. Writes assets/environment/chronospire/gen/*.webp.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets/environment/chronospire/gen')
TEXTURES = {'floor': '9if3dz', 'ground': '5vt56p', 'pipes': 'ixfrek', 'chasm': '40bq5k', 'yard': 'hkktj4'}  # Round 385: yard paving  # Round 378: pipes, chasm
SHEETS = {  # draft id -> names (left to right, top to bottom), long side px
    '1ffxk9': (['gears', 'pendulum', 'crystals', 'bell'], 220),
    'n8xy1q': (['clock-tower', 'observatory', 'bell-tower', 'spire'], 420),
    '9zmye9': (['workshop', 'townhouse', 'foundry', 'ruin'], 420),
    'rj3mbs': (['hourglass', 'arch', 'engine', 'pavilion'], 420),
    # Round 378: large set pieces, flat floor inlays, and the lock objects (breaker off/on, gate sealed/open)
    'e8zup5': (['aqueduct', 'cogwheel', 'boilers', 'fallen-tower'], 460),
    'ajn1a6': (['inlay-clock', 'inlay-sun', 'inlay-gears', 'inlay-hourglass'], 320),
    'y5dvms': (['breaker-off', 'breaker-on', 'gate-sealed', 'gate-open'], 256),
    # Round 385: street furniture, back-lot clutter, and three districts' buildings
    '8ty9hh': (['lamp', 'bollard', 'railing', 'bench'], 200),
    'xt7th9': (['crates', 'scrap', 'pipe-stack', 'barrels'], 200),
    'g4gvy6': (['smelter', 'pump-house', 'chimney', 'gear-mill'], 420),
    'hk3ns9': (['row-house', 'cottage', 'turret-house', 'terrace'], 420),
    'ark15i': (['watchmaker', 'inn', 'bakery', 'bookshop'], 420),
    'exoyse': (['ruined-hall', 'columns', 'broken-dome', 'broken-stair'], 420),
}

# Round 387: Neon Aftermath's set, for the same generator (python3 tools/prepare_chrono_gen.py <folder> city).
WORLDS = {'city': {
    'out': 'assets/environment/city-gen',
    'textures': {'floor': '1pi1qk', 'overgrowth': '549k97', 'yard': 'ijwi57', 'ground': 'pch07g', 'water': 'vkvpou'},
    'sheets': {
        '4m9l9k': (['lamp', 'vending', 'barrier', 'bench'], 200),
        'op0e6t': (['car', 'dumpsters', 'crates', 'traffic-light'], 220),
        '9qvkln': (['server-block', 'substation', 'parking-garage', 'relay-hut'], 420),
        'cy2zb8': (['pagoda', 'shrine-gate', 'tea-house', 'lantern-court'], 420),
        'hc4y4t': (['neon-tower', 'corner-store', 'apartment', 'scrap-shop'], 420),
        'mpp0pm': (['tenement', 'garden-block', 'container-home', 'clinic-block'], 420),
        'u7bx2o': (['noodle-bar', 'arcade', 'pawn-shop', 'capsule-hotel'], 420),
    }}}

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
        if not any(tag in f for f in os.listdir(folder)): continue
        a = np.asarray(Image.open(find(folder, tag)).convert('RGB')).astype(np.float32)
        o = Image.fromarray(seamless(a, 200).clip(0, 255).astype(np.uint8)).resize((800, 800), Image.LANCZOS)
        o.save(os.path.join(OUT, name + '.webp'), quality=84, method=6); print(name, o.size)

def props(folder):
    for tag, (names, size) in SHEETS.items():
        if not any(tag in f for f in os.listdir(folder)): continue  # each upload holds only some of the drafts
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
    if len(sys.argv) > 2:
        w = WORLDS[sys.argv[2]]; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', w['out']); TEXTURES = w['textures']; SHEETS = w['sheets']
    os.makedirs(OUT, exist_ok=True); textures(sys.argv[1]); props(sys.argv[1])
