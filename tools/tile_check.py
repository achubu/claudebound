"""Round 437 (owner: "eliminate any texture that doesn't tile well"): scores how well every tiling texture of the top-down
city repeats. The seam score is the jump across the wrap-around edge divided by the texture's ordinary pixel-to-pixel
change: about 1 is seamless, above 2.3 a seam shows. Run after adding art:  python3 tools/tile_check.py
It also writes tiled previews (3x3, strips 3x1) to /tmp/tile_check/ so a repeated blotch can be judged by eye, which
the score can't measure. Textures that failed the owner's review sit in unused assets/ (Round 437)."""
import os, re, sys, numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); C = os.path.join(ROOT, 'assets', 'environment', 'city-gen', 'surfaces')
SQUARE = ['sidewalk', 'roof', 'park', 'ruin', 'home-roof']; STRIP = ['wall', 'shop', 'ruin-wall', 'home-wall', 'curb', 'park-edge', 'waterfront-edge']
LIMIT = 2.3
def seam(a, axis):
    a = a.astype(np.float32); e = np.abs(np.take(a, -1, axis) - np.take(a, 0, axis)).mean(); return e / (np.abs(np.diff(a, axis=axis)).mean() + 1e-6)
art = re.search(r"const CITY_TD_ART = \{(.*?)\};", open(os.path.join(ROOT, 'assets', 'chrono-gen.js')).read()).group(1)
slots = {m.group(1): re.findall(r"'([a-z0-9-]+)'", m.group(2)) for m in re.finditer(r"'?([a-z-]+)'?: \[([^\]]*)\]", art)}
os.makedirs('/tmp/tile_check', exist_ok=True); bad = []
for slot in SQUARE + STRIP:
    for n in slots.get(slot, []):
        im = Image.open(os.path.join(C, slot, n + '.webp')).convert('RGB'); a = np.asarray(im)
        sx = seam(a, 1); sy = seam(a, 0) if slot in SQUARE else 0; worst = max(sx, sy)
        print('%-16s %-20s %.2f%s' % (slot, n, worst, '  <-- seam' if worst > LIMIT else ''))
        if worst > LIMIT: bad.append(slot + '/' + n)
        if slot in SQUARE: t = im.resize((160, 160)); c = Image.new('RGB', (480, 480)); [c.paste(t, (x * 160, y * 160)) for x in range(3) for y in range(3)]
        else: w = round(im.width * 64 / im.height); t = im.resize((w, 64)); c = Image.new('RGB', (w * 3, 64)); [c.paste(t, (x * w, 0)) for x in range(3)]
        c.save('/tmp/tile_check/%s__%s.png' % (slot, n))
sys.exit(1 if bad else 0)
