#!/usr/bin/env python3
"""Round 583 (owner: "sky isles is too pink, i want it to be more blue and cool steel and vibrant but not pink or purple").

Recolours the Sky Isles' generator art (assets/environment/sky-gen/**/*.webp) in place: pinks, magentas and purples (hue 228-15
degrees) turn to blues (purple to deep blue, pink to azure), pale lavenders and pinks to cool steel, the rest a little more
saturated. Cyan, greens, golds and the rest keep their hue. Shapes are untouched.

The originals are kept, once, in `unused assets/environment/sky-gen-pink/` (same paths); the tool always reads from there, so
running it again starts from the original art. To undo: copy that folder back over assets/environment/sky-gen/.
    python3 tools/recolor_sky.py            recolour everything
    python3 tools/recolor_sky.py --preview a.webp out.png   one file, written elsewhere
"""
import os, sys, shutil
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'assets', 'environment', 'sky-gen')
KEEP = os.path.join(ROOT, 'unused assets', 'environment', 'sky-gen-pink')

def recolor(im):
    im = im.convert('RGBA'); a = np.asarray(im).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3:]
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx); nz = d > 1e-6
    hr = nz & (mx == r); hg = nz & (mx == g) & ~hr; hb = nz & ~hr & ~hg
    h[hr] = ((g - b)[hr] / d[hr]) % 6; h[hg] = (b - r)[hg] / d[hg] + 2; h[hb] = (r - g)[hb] / d[hb] + 4; h *= 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0); v = mx
    hh = np.where(h < 15, h + 360, h)                       # pinks just past red count with the pinks
    pink = (hh >= 228) & (hh <= 375)                         # periwinkle, violet, purple, magenta, pink
    t = (hh - 228) / 147.0                                   # 0 = periwinkle ... 1 = red-pink
    h2 = np.where(pink, 214 - t * 18, h)                     # periwinkle/violet -> clear blue (214), pink -> azure (196)
    pale = pink & (s < 0.28)                                 # pale lavender / blush -> cool steel
    warm = (h >= 0) & (h < 50) & (s < 0.3) & (v > 0.55) & nz # pale peach / cream highlights -> steel too
    s2 = np.where(pale | warm, s * 0.6, np.where(pink, np.minimum(1, s * 1.25), np.minimum(1, s * 1.08)))
    h2 = np.where(pale | warm, 208, h2)
    # back to RGB
    c = v * s2; x = c * (1 - np.abs((h2 / 60) % 2 - 1)); m = v - c; k = (h2 // 60).astype(int) % 6
    out = np.zeros_like(rgb)
    for i, (rr, gg, bb) in enumerate([(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)]):
        sel = k == i
        for ch, val in enumerate((rr, gg, bb)): out[..., ch][sel] = (val[sel] if not np.isscalar(val) else val) + m[sel]
    out = np.where(nz[..., None], out, rgb)
    return Image.fromarray((np.concatenate([out, al], -1).clip(0, 1) * 255).round().astype(np.uint8), 'RGBA')

# Round 583 (owner: "some of the art didnt have the green background cut out properly"): the keying green left inside props
# (between a gate's posts, in a doorway, on a building's side) is cleared, and a green tinge on edges is taken out. Real greens
# (plants, the hydro-house's grow-lights) are darker or less pure than the key and stay.
KEEP_GREEN = {'props/building-garden/hydro-house.webp'}
def unkey(im, rel):
    if rel in KEEP_GREEN: return im
    from scipy import ndimage
    a = np.asarray(im.convert('RGBA')).astype(np.int32); r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    key = (al > 0) & (g >= 170) & (g - np.maximum(r, b) >= 90)
    a[..., 3][key] = 0
    solid = a[..., 3] > 40; edge = solid & ~ndimage.binary_erosion(solid, iterations=2)
    spill = edge & (g > np.maximum(r, b) + 20); a[..., 1][spill] = np.maximum(r, b)[spill]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

def main():
    if len(sys.argv) == 4 and sys.argv[1] == '--preview':
        recolor(Image.open(sys.argv[2])).save(sys.argv[3]); return
    n = 0
    for dp, _, fs in os.walk(ART):
        for f in fs:
            if not f.endswith('.webp'): continue
            src = os.path.join(dp, f); rel = os.path.relpath(src, ART); keep = os.path.join(KEEP, rel)
            if not os.path.exists(keep): os.makedirs(os.path.dirname(keep), exist_ok=True); shutil.copy2(src, keep)
            im = Image.open(keep); im = unkey(im, rel) if rel.startswith('props/') else im
            recolor(im).save(src, lossless=True); n += 1
    print('recoloured', n, 'pictures; originals in', os.path.relpath(KEEP, ROOT))

if __name__ == '__main__': main()
