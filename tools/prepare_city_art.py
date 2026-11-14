#!/usr/bin/env python3
"""Round 402: add one piece of art to the top-down city's art slots (CITY_TD_ART in assets/chrono-gen.js).

    python3 tools/prepare_city_art.py <image> <slot> <name>

Slots and what the tool does with the image:
  roof, sidewalk       seamless roof / sidewalk surface, 512x512 (blended at the edges so it tiles both ways)
  wall, shop           one floor of wall / shopfront
  park-edge, curb, waterfront-edge   a border strip (outer side up) of wall / shopfront: scaled to 128px tall and blended left-right so it tiles sideways
  prop-ac, prop-vent, prop-tank, prop-stairs, prop-solar, prop-skylight,
  sign-h, sign-v, car, tree
                       a thing on a flat green background (magenta for green things such as trees): the green is keyed out, the picture trimmed and scaled so
                       its longer side is 256px (cars should face east, to the right)

Uneven sheets: python3 tools/prepare_city_art.py --objects <image> <slot:name or -> ... (row by row, left to right).
Sheets: python3 tools/prepare_city_art.py --sheet <image> <cols> <rows> <slot:name or -> ... (one per cell).

The result goes to assets/environment/city-gen/surfaces/<slot>/<name>.webp (surfaces) or props/<slot>/<name>.webp and <name> is added to the slot in CITY_TD_ART.
"""
import os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CITY = os.path.join(ROOT, 'assets', 'environment', 'city-gen')
# Round 420: art is sorted by what it is: the surfaces of the city (CITY_SURFACES in assets/chrono-gen.js) in
# surfaces/<slot>/, things standing on them in props/<slot>/.
SURFACE_SLOTS = {'roof', 'wall', 'shop', 'sidewalk', 'curb', 'park-edge', 'waterfront-edge', 'park', 'ruin-wall', 'home-wall', 'home-roof', 'tech-wall', 'tech-roof', 'tech-shop', 'garden-wall', 'garden-roof', 'garden-shop', 'market-roof', 'market-shop'}  # Round 424: park grass, ruins; Round 436: homes
def out_dir(slot): return os.path.join(CITY, 'surfaces' if slot in SURFACE_SLOTS else 'props', slot)
def out_path(slot, name): d = out_dir(slot); os.makedirs(d, exist_ok=True); return os.path.join(d, name + '.webp')
JS = os.path.join(ROOT, 'assets', 'chrono-gen.js')
TEXTURE = {'roof', 'wall', 'shop', 'sidewalk', 'park-edge', 'curb', 'waterfront-edge', 'park', 'ruin-wall', 'home-wall', 'home-roof', 'tech-wall', 'tech-roof', 'tech-shop', 'garden-wall', 'garden-roof', 'garden-shop', 'market-roof', 'market-shop'}
SPRITE = {'prop-ac', 'prop-vent', 'prop-tank', 'prop-stairs', 'prop-solar', 'prop-skylight', 'sign-h', 'sign-v', 'car', 'tree', 'rubble', 'lamp', 'traffic-light', 'sign-traffic', 'cargo', 'prop-heater', 'roof-hole'}


def blend_x(a, band):
    w = a.shape[1]; t = np.linspace(0, 1, band)[None, :, None]
    out = a[:, :w - band].copy(); out[:, :band] = a[:, :band] * t + a[:, w - band:] * (1 - t); return out


def texture(img, slot):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    if slot in ('roof', 'sidewalk', 'park', 'home-roof', 'tech-roof', 'garden-roof', 'market-roof'):
        a = blend_x(a, max(8, a.shape[1] // 8)); a = blend_x(a.transpose(1, 0, 2), max(8, a.shape[0] // 8)).transpose(1, 0, 2)
        return Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    if slot in ('park-edge', 'curb', 'waterfront-edge'):  # Round 410: border strips keep see-through gaps where the green shows between stones
        rgb = np.asarray(img.convert('RGB')).astype(np.float32); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        al = np.clip((50 - (g - np.maximum(r, b))) / 30, 0, 1); rgba = np.dstack([r, np.minimum(g, np.maximum(r, b) + 10), b, al * 255])
        rgba = blend_x(rgba, max(8, rgba.shape[1] // 10)); o = Image.fromarray(rgba.clip(0, 255).astype(np.uint8), 'RGBA')
        return o.resize((max(16, round(o.width * 128 / o.height)), 128), Image.LANCZOS)
    a = blend_x(a, max(8, a.shape[1] // 10)); o = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    return o.resize((max(16, round(o.width * 128 / o.height)), 128), Image.LANCZOS)


POSTS = {'lamp', 'traffic-light', 'sign-traffic'}


def sprite(img, slot=None):
    a = np.asarray(img.convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # the background is read from the corners: flat green (most art) or flat magenta (green things, like trees)
    h, w = r.shape; c = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)]); bg = np.median(c, axis=0)
    if bg[1] > max(bg[0], bg[2]) + 40 and not os.environ.get('KEY_DIST'): gx = g - np.maximum(r, b); alpha = np.clip((60 - gx) / 40, 0, 1)  # Round 438: KEY_DIST=1 keys a muted green by colour distance instead
    else:  # Round 435: KEY_MIN raises the cut (lamp glow cones over magenta drop out instead of turning pink)
        d = np.linalg.norm(a - bg, axis=2); lo = float(os.environ.get('KEY_MIN', 60)); alpha = np.clip((d - lo) / 50, 0, 1)
        if os.environ.get('FILL_ENCLOSED'):  # Round 435: only background joined to the frame's edge is cut; red sign faces inside a rim stay
            lab, n = ndimage.label(alpha < 0.5); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
            alpha = np.where((lab > 0) & ~np.isin(lab, list(edge)), 1.0, alpha)
    lab, n = ndimage.label(alpha > 0.5)
    if n:
        sz = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1)); keep = [i + 1 for i, v in enumerate(sz) if v >= max(60, sz.max() * 0.02)]
        alpha = alpha * ndimage.binary_dilation(np.isin(lab, keep), iterations=2)
    g2 = np.minimum(g, np.maximum(r, b) + 12) if bg[1] > max(bg[0], bg[2]) + 40 else g  # no green fringe
    rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.1)
    if not len(ys): sys.exit('nothing left after keying out the green: is the background flat green?')
    o = Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
    if slot in POSTS:  # Round 435: a post stands on its foot, drawn at the picture's bottom centre: pad so the foot is there
        al = np.asarray(o)[..., 3].astype(np.float32); h = al.shape[0]; base = al[int(h * 0.96):].sum(axis=0)
        fx = (base * np.arange(base.size)).sum() / max(1, base.sum()); w = o.width; pad = int(round(abs(2 * fx - w)))
        if pad: n = Image.new('RGBA', (w + pad, o.height)); n.paste(o, (pad if fx < w / 2 else 0, 0)); o = n
    k = 256 / max(o.size)
    return o.resize((max(1, round(o.width * k)), max(1, round(o.height * k))), Image.LANCZOS)


def gaps(path):
    """Round 415 (owner: "never cut a building floor sprite halfway through a window at the edge"): the columns of a wall or
    shopfront strip where there is plain wall between windows: low contrast down the column (smoothed), local minima, at
    least 6px apart. A building's wall is fitted to start and end on these."""
    a = np.asarray(Image.open(path).convert('L')).astype(np.float32); h, w = a.shape
    band = a[int(h * 0.12):int(h * 0.88)]; v = band.std(axis=0)
    k = np.ones(5) / 5; v = np.convolve(np.concatenate([v[-2:], v, v[:2]]), k, mode='valid')
    cut = np.percentile(v, 40); out = []
    for x in range(w):
        if max(v[(x + d) % w] for d in range(-4, 5)) <= cut and v[x] <= v[(x - 1) % w] and v[x] <= v[(x + 1) % w] and all(abs(x - g) >= 6 for g in out): out.append(x)  # plain wall 4px either side
    return out


def register_gaps(name, g):
    s = open(JS).read(); m = re.search(r"const CITY_TD_GAPS = \{(.*?)\};", s)
    body = re.sub(r"'%s': \[[^\]]*\],? ?" % re.escape(name), '', m.group(1)).strip().rstrip(',')
    entry = "'%s': [%s]" % (name, ', '.join(map(str, g)))
    body = (body + ', ' if body else ' ') + entry + ' '
    open(JS, 'w').write(s[:m.start(1)] + body + s[m.end(1):])


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
    # Round 435: measured after the list is written (it used to be written over by the stale copy above)
    if slot in ('wall', 'shop', 'ruin-wall', 'home-wall', 'tech-wall', 'tech-shop', 'garden-wall', 'garden-shop', 'market-shop'): register_gaps(name, gaps(out_path(slot, name)))


def sheet(args):
    """--sheet <image> <cols> <rows> <slot:name or -> ...: cut a sprite sheet into an even grid, one entry per cell
    (left to right, top to bottom); textures are cut a little inside their cell, so frame borders are left behind."""
    src, cols, rows, entries = args[0], int(args[1]), int(args[2]), args[3:]
    if len(entries) != cols * rows: sys.exit('need %d entries (slot:name or -), got %d' % (cols * rows, len(entries)))
    img = Image.open(src).convert('RGB'); W, H = img.size
    for i, e in enumerate(entries):
        if e == '-': continue
        slot, name = e.split(':')
        if slot not in TEXTURE | SPRITE: sys.exit('unknown slot ' + slot)
        x0, y0, x1, y1 = (i % cols) * W // cols, (i // cols) * H // rows, (i % cols + 1) * W // cols, (i // cols + 1) * H // rows
        if slot in TEXTURE: m = (x1 - x0) // 20; x0, y0, x1, y1 = x0 + m, y0 + m, x1 - m, y1 - m
        if slot not in TEXTURE and os.environ.get('CELL_INSET'): m = int((x1 - x0) * float(os.environ['CELL_INSET'])); x0, y0, x1, y1 = x0 + m, y0 + m, x1 - m, y1 - m  # Round 438: trim glow that leaks in from a neighbour cell
        o = texture(img.crop((x0, y0, x1, y1)), slot) if slot in TEXTURE else sprite(img.crop((x0, y0, x1, y1)), slot)
        path = out_path(slot, name); o.save(path, quality=88, method=6); register(slot, name)
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
    boxes.sort(key=lambda b: (int((b[0].start + b[0].stop) / 2 // rowH), b[1].start))
    for b, e in zip(boxes, entries):
        if e == '-': continue
        slot, name = e.split(':'); y0, y1, x0, x1 = max(0, b[0].start - 4), min(img.height, b[0].stop + 4), max(0, b[1].start - 4), min(img.width, b[1].stop + 4)
        o = sprite(img.crop((x0, y0, x1, y1)), slot); path = out_path(slot, name); o.save(path, quality=88, method=6); register(slot, name)
        print('%s -> %s %s' % (slot, os.path.relpath(path, ROOT), o.size))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--gaps':  # (re)measure every wall and shopfront already in CITY_TD_ART
        s = open(JS).read(); m = re.search(r"const CITY_TD_ART = \{(.*?)\};", s)
        for slot in ('wall', 'shop', 'ruin-wall', 'home-wall', 'tech-wall', 'tech-shop', 'garden-wall', 'garden-shop', 'market-shop'):
            for n in re.findall(r"'([a-z0-9-]+)'", re.search(r"(?<![a-z-])'?" + re.escape(slot) + r"'?: \[(.*?)\]", m.group(1)).group(1)): g = gaps(out_path(slot, n)); register_gaps(n, g); print(n, len(g), 'gaps')
        return
    if len(sys.argv) > 1 and sys.argv[1] == '--sheet': return sheet(sys.argv[2:])
    if len(sys.argv) > 1 and sys.argv[1] == '--objects': return objects(sys.argv[2:])
    if len(sys.argv) != 4: sys.exit(__doc__)
    src, slot, name = sys.argv[1:]
    if slot not in TEXTURE | SPRITE: sys.exit('unknown slot %s; slots: %s' % (slot, ', '.join(sorted(TEXTURE | SPRITE))))
    if not re.fullmatch(r'[a-z0-9-]+', name): sys.exit('name: lower-case letters, digits and dashes only')
    img = Image.open(src)
    o = texture(img, slot) if slot in TEXTURE else sprite(img, slot)
    path = out_path(slot, name); o.save(path, quality=88, method=6); register(slot, name)
    print('%s -> %s %s; added to CITY_TD_ART.%s (bump the chrono-gen.js?v= tag in index.html)' % (src, os.path.relpath(path, ROOT), o.size, slot))


if __name__ == '__main__':
    main()
