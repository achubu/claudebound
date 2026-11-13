#!/usr/bin/env python3
"""Round 402: add one piece of art to the top-down city's art slots (CITY_TD_ART in assets/chrono-gen.js).

    python3 tools/prepare_city_art.py <image> <slot> <name>

Slots and what the tool does with the image:
  roof, sidewalk       seamless roof / sidewalk surface, 512x512 (blended at the edges so it tiles both ways)
  wall, shop, edge     one floor (edge: a border strip, outer side up) of wall / shopfront: scaled to 128px tall and blended left-right so it tiles sideways
  prop-ac, prop-vent, prop-tank, prop-stairs, prop-solar, prop-skylight,
  sign-h, sign-v, car, tree
                       a thing on a flat green background (magenta for green things such as trees): the green is keyed out, the picture trimmed and scaled so
                       its longer side is 256px (cars should face east, to the right)

Uneven sheets: python3 tools/prepare_city_art.py --objects <image> <slot:name or -> ... (row by row, left to right).
Sheets: python3 tools/prepare_city_art.py --sheet <image> <cols> <rows> <slot:name or -> ... (one per cell).

The result goes to assets/environment/city-gen/td/<name>.webp and <name> is added to the slot in CITY_TD_ART.
"""
import os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'environment', 'city-gen', 'td')
JS = os.path.join(ROOT, 'assets', 'chrono-gen.js')
TEXTURE = {'roof', 'wall', 'shop', 'sidewalk', 'edge', 'trim', 'shore'}
SPRITE = {'prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight', 'sign-h', 'sign-v', 'car', 'tree'}


def blend_x(a, band):
    w = a.shape[1]; t = np.linspace(0, 1, band)[None, :, None]
    out = a[:, :w - band].copy(); out[:, :band] = a[:, :band] * t + a[:, w - band:] * (1 - t); return out


def texture(img, slot):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    if slot in ('roof', 'sidewalk'):
        a = blend_x(a, max(8, a.shape[1] // 8)); a = blend_x(a.transpose(1, 0, 2), max(8, a.shape[0] // 8)).transpose(1, 0, 2)
        return Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    if slot in ('edge', 'trim', 'shore'):  # Round 410: border strips keep see-through gaps where the green shows between stones
        rgb = np.asarray(img.convert('RGB')).astype(np.float32); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        al = np.clip((50 - (g - np.maximum(r, b))) / 30, 0, 1); rgba = np.dstack([r, np.minimum(g, np.maximum(r, b) + 10), b, al * 255])
        rgba = blend_x(rgba, max(8, rgba.shape[1] // 10)); o = Image.fromarray(rgba.clip(0, 255).astype(np.uint8), 'RGBA')
        return o.resize((max(16, round(o.width * 128 / o.height)), 128), Image.LANCZOS)
    a = blend_x(a, max(8, a.shape[1] // 10)); o = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    return o.resize((max(16, round(o.width * 128 / o.height)), 128), Image.LANCZOS)


def sprite(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # the background is read from the corners: flat green (most art) or flat magenta (green things, like trees)
    h, w = r.shape; c = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)]); bg = np.median(c, axis=0)
    if bg[1] > max(bg[0], bg[2]) + 40: gx = g - np.maximum(r, b); alpha = np.clip((60 - gx) / 40, 0, 1)
    else: d = np.linalg.norm(a - bg, axis=2); alpha = np.clip((d - 60) / 50, 0, 1)
    lab, n = ndimage.label(alpha > 0.5)
    if n:
        sz = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1)); keep = [i + 1 for i, v in enumerate(sz) if v >= max(60, sz.max() * 0.02)]
        alpha = alpha * ndimage.binary_dilation(np.isin(lab, keep), iterations=2)
    g2 = np.minimum(g, np.maximum(r, b)) if bg[1] > max(bg[0], bg[2]) + 40 else g  # no green fringe
    rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.1)
    if not len(ys): sys.exit('nothing left after keying out the green: is the background flat green?')
    o = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA'); k = 256 / max(o.size)
    return o.resize((max(1, round(o.width * k)), max(1, round(o.height * k))), Image.LANCZOS)


def register(slot, name):
    s = open(JS).read(); m = re.search(r"const CITY_TD_ART = \{(.*?)\};", s)
    if not m: sys.exit('CITY_TD_ART not found in assets/chrono-gen.js')
    body = m.group(1); key = "'%s'" % slot if '-' in slot else slot
    sm = re.search(re.escape(key) + r": \[(.*?)\]", body)
    items = [x.strip().strip("'") for x in sm.group(1).split(',') if x.strip()]
    if name in items: return
    items.append(name); new = key + ': [' + ', '.join("'%s'" % x for x in items) + ']'
    body = body[:sm.start()] + new + body[sm.end():]
    open(JS, 'w').write(s[:m.start(1)] + body + s[m.end(1):])


def sheet(args):
    """--sheet <image> <cols> <rows> <slot:name or -> ...: cut a sprite sheet into an even grid, one entry per cell
    (left to right, top to bottom); textures are cut a little inside their cell, so frame borders are left behind."""
    src, cols, rows, entries = args[0], int(args[1]), int(args[2]), args[3:]
    if len(entries) != cols * rows: sys.exit('need %d entries (slot:name or -), got %d' % (cols * rows, len(entries)))
    img = Image.open(src).convert('RGB'); W, H = img.size; os.makedirs(OUT, exist_ok=True)
    for i, e in enumerate(entries):
        if e == '-': continue
        slot, name = e.split(':')
        if slot not in TEXTURE | SPRITE: sys.exit('unknown slot ' + slot)
        x0, y0, x1, y1 = (i % cols) * W // cols, (i // cols) * H // rows, (i % cols + 1) * W // cols, (i // cols + 1) * H // rows
        if slot in TEXTURE: m = (x1 - x0) // 20; x0, y0, x1, y1 = x0 + m, y0 + m, x1 - m, y1 - m
        o = texture(img.crop((x0, y0, x1, y1)), slot) if slot in TEXTURE else sprite(img.crop((x0, y0, x1, y1)))
        path = os.path.join(OUT, name + '.webp'); o.save(path, quality=88, method=6); register(slot, name)
        print('%s -> %s %s' % (slot, os.path.relpath(path, ROOT), o.size))


def objects(args):
    """--objects <image> <slot:name or -> ...: a sheet whose objects are not on an even grid: each object is found by its
    outline on the flat background (pieces within 20px count as one), taken row by row, left to right."""
    src, entries = args[0], args[1:]
    img = Image.open(src).convert('RGB'); a = np.asarray(img).astype(np.float32)
    c = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)]); bg = np.median(c, axis=0)
    fg = np.linalg.norm(a - bg, axis=2) > 70
    lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=int(os.environ.get('GAP', 20))))
    boxes = [s for s in ndimage.find_objects(lab) if s and (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > fg.size * 0.004]
    if len(boxes) != len(entries): sys.exit('found %d objects, %d entries given' % (len(boxes), len(entries)))
    rowH = img.height / max(1, round(img.height / max(b[0].stop - b[0].start for b in boxes)))
    boxes.sort(key=lambda b: (int((b[0].start + b[0].stop) / 2 // rowH), b[1].start)); os.makedirs(OUT, exist_ok=True)
    for b, e in zip(boxes, entries):
        if e == '-': continue
        slot, name = e.split(':'); y0, y1, x0, x1 = max(0, b[0].start - 4), min(img.height, b[0].stop + 4), max(0, b[1].start - 4), min(img.width, b[1].stop + 4)
        o = sprite(img.crop((x0, y0, x1, y1))); path = os.path.join(OUT, name + '.webp'); o.save(path, quality=88, method=6); register(slot, name)
        print('%s -> %s %s' % (slot, os.path.relpath(path, ROOT), o.size))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--sheet': return sheet(sys.argv[2:])
    if len(sys.argv) > 1 and sys.argv[1] == '--objects': return objects(sys.argv[2:])
    if len(sys.argv) != 4: sys.exit(__doc__)
    src, slot, name = sys.argv[1:]
    if slot not in TEXTURE | SPRITE: sys.exit('unknown slot %s; slots: %s' % (slot, ', '.join(sorted(TEXTURE | SPRITE))))
    if not re.fullmatch(r'[a-z0-9-]+', name): sys.exit('name: lower-case letters, digits and dashes only')
    os.makedirs(OUT, exist_ok=True); img = Image.open(src)
    o = texture(img, slot) if slot in TEXTURE else sprite(img)
    path = os.path.join(OUT, name + '.webp'); o.save(path, quality=88, method=6); register(slot, name)
    print('%s -> %s %s; added to CITY_TD_ART.%s (bump the chrono-gen.js?v= tag in index.html)' % (src, os.path.relpath(path, ROOT), o.size, slot))


if __name__ == '__main__':
    main()
