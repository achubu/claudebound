#!/usr/bin/env python3
"""Add (or update) a wearable look: gear the hero shows on the map when it is worn. Round 555.

  python3 tools/wearable_add.py --look cyber-belt --slot belt --items scarabBelt,stormglassBelt,hourglassBelt \\
      --overlay path/to/overlay.png [--clean path/to/hero-with-old-clothes-painted-out.png] [--proof out/dir]
  python3 tools/wearable_add.py --rebuild      # only regenerate assets/hero-wear-looks.js from the look folders
  python3 tools/wearable_add.py --check        # validate every look; exit 1 on a problem (the test runs this)

What it does (see tools/art-refresh/wearable-gear.md):
  1. checks the art against the hero's sheet (assets/characters/protagonist-walk9.png): 2304 x 1024 RGBA, the overlay has
     pixels in all 36 frames and stays inside the hero's outline (only the soft edge may differ), a cleaned hero keeps the
     outline exactly;
  2. turns a cleaned hero into a *clear patch*: only the pixels it changed, fully opaque, everything else transparent. The game
     draws it with source-atop over the hero, which gives the cleaned hero back exactly, and lets looks for different slots
     (belt and boots) stack without a cleaned hero for every combination;
  3. writes assets/characters/wearable/<look>/overlay.png, clear.png (if any) and look.json;
  4. regenerates assets/hero-wear-looks.js (the registry the game reads) from every look folder;
  5. writes proof strips (original | with the look, every frame, at 256px and at the game's 84px) to --proof.
"""
import argparse, json, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERO = os.path.join(ROOT, 'assets/characters/protagonist-walk9.png')  # the hero as he is with nothing worn
# Round 559: the base every look is fitted on: the hero without his brown tool belt and pouch (same outline). The brown belt is
# the belt slot's default look (wearable/default-belt/patch.png), drawn whenever no belt with a look is worn, so base + it is
# the hero exactly
BASE = os.path.join(ROOT, 'assets/characters/protagonist-walk9-base.png')
WEAR = os.path.join(ROOT, 'assets/characters/wearable')
REGISTRY = os.path.join(ROOT, 'assets/hero-wear-looks.js')
SLOTS = ['pants', 'boots', 'shirt', 'belt', 'gloves']  # the order looks are drawn in (later over earlier)
W, H, CELL = 2304, 1024, 256
OUTLINE_SLACK = 2000  # overlay pixels allowed past the hero's outline (the soft edge where it meets the body)


def rgba(path):
    im = Image.open(path)
    if im.size != (W, H):
        raise SystemExit(f'{path}: {im.size[0]} x {im.size[1]}, must be {W} x {H} (the hero sheet)')
    return np.asarray(im.convert('RGBA')).astype(np.int16)


def gear_items():
    """item id -> slot, read from assets/gear.js"""
    src = open(os.path.join(ROOT, 'assets/gear.js')).read()
    return {m.group(1): m.group(2) for m in re.finditer(r"^\s*(\w+):\s*\{[^}]*slot:\s*'(\w+)'", src, re.M)}


def near_outline(hero, r=2):
    """the hero's silhouette grown by r px: art may reach this far past it (its soft edge), never further"""
    m = hero[..., 3] > 0
    g = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            g |= np.roll(np.roll(m, dy, 0), dx, 1)
    return g


def check_look(name, slot, items, overlay, clear, hero, bad_px=None):
    """problems with a look, and how many overlay pixels lie on the outline's soft edge. Round 559 (Codex's review): also any
    pixel at all (even alpha 1) more than 2px past the silhouette, frames with less than 40 solid pixels, empty or repeated
    item ids, and pure key-colour (green/magenta) pixels left from the background. bad_px, if given, collects the rejected
    pixels as a mask (for a diagnostic picture)."""
    problems = []
    if slot not in SLOTS:
        problems.append(f'slot {slot!r} is not one of {SLOTS}')
    if not items:
        problems.append('no item ids')
    if len(set(items)) != len(items):
        problems.append(f'item ids repeated: {items}')
    known = gear_items()
    for it in items:
        if it not in known:
            problems.append(f'item {it!r} is not in assets/gear.js')
        elif known[it] != slot:
            problems.append(f'item {it!r} is a {known[it]}, not a {slot}')
    oa = overlay[..., 3]
    thin = [f'{r},{c}' for r in range(4) for c in range(9) if (oa[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] >= 128).sum() < 40]
    if thin:
        problems.append(f'frames (row,col) with under 40 solid item pixels: {" ".join(thin)}')
    past = int(((oa > 60) & (hero[..., 3] < 128)).sum())
    if past > OUTLINE_SLACK:
        problems.append(f'overlay reaches past the hero\'s outline in {past} px (allowed {OUTLINE_SLACK})')
    far = (oa > 0) & ~near_outline(hero)
    if far.any():
        cells = sorted({f'{y // CELL},{x // CELL}' for y, x in zip(*np.nonzero(far))})
        problems.append(f'{int(far.sum())} overlay px (any alpha) more than 2px outside the hero, in frames {" ".join(cells[:12])}{" ..." if len(cells) > 12 else ""}')
    r, g, b = overlay[..., 0], overlay[..., 1], overlay[..., 2]
    key = (oa > 0) & (((g > 200) & (r < 80) & (b < 80)) | ((r > 200) & (b > 200) & (g < 80)))
    if key.sum() > 20:
        problems.append(f'{int(key.sum())} pure green or magenta pixels (background left in the art)')
    pp = os.path.join(TEMPLATES, 'protected.png')
    if os.path.isfile(pp):  # (Round 563: the Aetherlink is never covered)
        prot = np.asarray(Image.open(pp).convert('L')) > 127
        cov = int(((oa > 60) & prot).sum())
        if cov > 30:
            problems.append(f'{cov} px over the Aetherlink on the left forearm (gear/templates/protected.png): it is never covered')
        if bad_px is not None:
            bad_px |= (oa > 60) & prot
    if bad_px is not None:
        bad_px |= far | key
    if clear is not None:
        ca = clear[..., 3]
        if not np.isin(ca, [0, 255]).all():
            problems.append('clear patch alpha must be 0 or 255')
        if ((ca == 255) & (hero[..., 3] == 0)).any():
            problems.append('clear patch paints outside the hero')
    return problems, past


def diagnostic(path, hero, bad):
    """the hero dimmed, with the rejected pixels in red"""
    im = hero.astype(np.float64).copy(); im[..., :3] *= 0.35; im[..., 3] = 255
    im[bad] = [255, 0, 0, 255]
    Image.fromarray(im.astype(np.uint8), 'RGBA').save(path)


def clear_from_cleaned(hero, cleaned):
    if not (hero[..., 3] == cleaned[..., 3]).all():
        n = int((hero[..., 3] != cleaned[..., 3]).sum())
        raise SystemExit(f'the cleaned hero changes the outline in {n} px: it must keep the hero\'s alpha exactly')
    changed = (hero[..., :3] != cleaned[..., :3]).any(2) & (hero[..., 3] > 0)
    out = np.zeros_like(cleaned)
    out[..., :3] = np.where(changed[..., None], cleaned[..., :3], 0)
    out[..., 3] = np.where(changed, 255, 0)
    return out


def composite(base, clears, overlays, defaults_by_slot=None):
    """what the game draws: the base (the beltless hero), each clear patch source-atop (its colour, the hero's alpha), then
    slot by slot (SLOTS order) the worn look's overlay, or the slot's default patch source-atop where nothing is worn there.
    overlays: [(slot, rgba)]; defaults_by_slot: {slot: (under, over)}: Round 565: a default look's cloth part is drawn first,
    under every look, its own part (the brown belt and pouch) in its slot"""
    a = base.astype(np.float64).copy()
    def atop(c):
        m = c[..., 3:4] / 255.0
        a[..., :3] = c[..., :3] * m + a[..., :3] * (1 - m)
    for c in clears:
        atop(c)
    out = None
    worn = {sl for sl, _ in overlays}
    for sl in SLOTS:  # (Round 565: a default's cloth part first, under every look)
        if sl not in worn and defaults_by_slot and sl in defaults_by_slot:
            atop(defaults_by_slot[sl][0])
    for sl in SLOTS:
        if sl not in worn and defaults_by_slot and sl in defaults_by_slot:
            if out is not None:
                a = np.asarray(out).astype(np.float64); out = None
            atop(defaults_by_slot[sl][1])
        for s2, o in overlays:
            if s2 == sl:
                if out is None:
                    out = Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8), 'RGBA')
                out.alpha_composite(Image.fromarray(o.astype(np.uint8), 'RGBA'))
    return out if out is not None else Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8), 'RGBA')


def split_default(patch, hero):
    """Round 565 (owner: a designed shirt "doesnt go down all the way to the belt"): a default look's patch holds the hero's
    original pixels wherever the base was repainted, which for the brown belt includes a band of shirt and trousers round it.
    Drawn in the belt slot, that band painted the old shirt back over a new one. Split by the original pixel's colour: his navy
    shirt or khaki trousers (r >= g >= b, red 25-95 above blue, not dark) is cloth, drawn first under every look; the rest (belt,
    buckle, pouch) is drawn in its slot. Together they are the patch, so with nothing worn the hero is unchanged."""
    h = hero.astype(np.int32); r, g, b = h[..., 0], h[..., 1], h[..., 2]; on = patch[..., 3] > 0
    navy = np.sqrt(((h[..., :3] - np.array((51, 57, 84))) ** 2).sum(-1)) < 40
    khaki = (r >= g) & (g >= b) & (r - b >= 25) & (r - b <= 95) & (r + g + b >= 230) & (g - b >= 15)
    cloth = on & (navy | khaki)
    under, over = patch.copy(), patch.copy(); under[~cloth] = 0; over[cloth] = 0
    return under, over


def default_patches():
    hero = rgba(HERO)
    return {sl: split_default(rgba(os.path.join(WEAR, n, 'patch.png')), hero) for sl, n in defaults().items()}


def write_default_parts():
    for sl, n in defaults().items():
        u, o = split_default(rgba(os.path.join(WEAR, n, 'patch.png')), rgba(HERO))
        for name, im in (('under', u), ('over', o)):
            Image.fromarray(im.astype(np.uint8), 'RGBA').save(os.path.join(WEAR, n, name + '.png'), optimize=True)


def proofs(hero, comp, out_dir, name):
    os.makedirs(out_dir, exist_ok=True)
    h = Image.fromarray(hero.astype(np.uint8), 'RGBA')
    for r, d in enumerate(['down', 'left', 'right', 'up']):
        for size in (256, 84):
            strip = Image.new('RGBA', (9 * size * 2 + 8 * 6, size), (70, 90, 70, 255))
            for c in range(9):
                box = (c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)
                for k, src in enumerate((h, comp)):
                    strip.alpha_composite(src.crop(box).resize((size, size), Image.LANCZOS), (c * (2 * size + 6) + k * size, 0))
            strip.convert('RGB').save(os.path.join(out_dir, f'{name}-{d}-{size}.png'))


def looks():
    out = {}
    if not os.path.isdir(WEAR):
        return out
    for name in sorted(os.listdir(WEAR)):
        f = os.path.join(WEAR, name, 'look.json')
        if os.path.isfile(f):
            v = json.load(open(f))
            if not v.get('default'):
                out[name] = v
    return out


def defaults():
    """slot -> folder name of its default look (a patch drawn source-atop when the slot has no look worn)"""
    out = {}
    for name in sorted(os.listdir(WEAR)) if os.path.isdir(WEAR) else []:
        f = os.path.join(WEAR, name, 'look.json')
        if os.path.isfile(f):
            v = json.load(open(f))
            if v.get('default'):
                out[v['slot']] = name
    return out


# Round 563 (owner: "the gear tool should provide the perfect size outline for each piece of gear"): a fit template per slot,
# where that slot's gear goes in each of the 36 frames, from the hero himself (his navy shirt, khaki trousers and shoes, in the rows
# of the cell they're in) and the looks already fitted for the slot (the belt's and gloves' templates are their fitted looks).
# White on black, the hero's grid: gear/templates/<slot>-mask.png (for an image generator's masked edit, and the Gear Studio's
# guide). gear/templates/protected.png: the Aetherlink on the left forearm, never to be covered. Rebuilt with the registry.
TEMPLATES = os.path.join(ROOT, 'gear/templates')
TEMPLATE_CLASSES = {'shirt': ((51, 57, 84), 45, 40, 150, 0), 'pants': ((152, 119, 81), 34, 110, 240, 15), 'boots': ((80, 40, 25), 40, 200, 256, 0)}


def _grow(m, r):
    g = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                g |= np.roll(np.roll(m, dy, 0), dx, 1)
    return g


def _shrink(m, r):
    return ~_grow(~m, r)


def _main_parts(m):
    """in each 256px frame, only the parts at least a fifth the size of the largest (wristbands the colour of the shirt, a stray
    patch of khaki-coloured skin, are dropped)"""
    try:
        from scipy import ndimage
    except ImportError:
        return m
    out = np.zeros_like(m)
    for r in range(m.shape[0] // CELL):
        for c in range(m.shape[1] // CELL):
            cell = m[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
            lab, n = ndimage.label(cell)
            if not n:
                continue
            sizes = ndimage.sum(cell, lab, range(1, n + 1)); keep = [i + 1 for i, v in enumerate(sizes) if v >= 0.2 * sizes.max()]
            out[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = np.isin(lab, keep)
    return out


def slot_templates(base):
    b = base.astype(np.int32); body = b[..., 3] > 128; cy = np.arange(b.shape[0])[:, None] % CELL
    dist = lambda col: np.sqrt(((b[..., :3] - np.array(col)) ** 2).sum(-1))
    out = {}
    for sl in SLOTS:
        m = np.zeros(body.shape, bool)
        if sl in TEMPLATE_CLASSES:
            col, t, y0, y1, margin = TEMPLATE_CLASSES[sl]
            m |= body & (dist(col) < t) & (dist(col) < dist(SKIN) - margin) & (cy >= y0) & (cy < y1)
        for n, v in looks().items():
            if v['slot'] == sl:
                m |= rgba(os.path.join(WEAR, n, 'overlay.png'))[..., 3] > (128 if sl == 'belt' else 40)
        m = _shrink(_grow(m, 2), 2) & body  # (closing: small gaps between a piece's parts filled)
        m = _grow(_shrink(m, 1), 1) & body  # (opening: single stray pixels dropped)
        m = _main_parts(m)
        if sl == 'shirt':  # (Round 565, owner: "you could make it a little longer"): tucked under the belt, up to 8px down, only where
            # a belt is (the brown belt's own part or a fitted belt), so no gap shows between shirt and belt and nothing pokes out
            belt = np.zeros(body.shape, bool)
            for n2, v2 in looks().items():
                if v2['slot'] == 'belt':
                    belt |= rgba(os.path.join(WEAR, n2, 'overlay.png'))[..., 3] > 60
            for sl2, n2 in defaults().items():
                if sl2 == 'belt':
                    belt |= split_default(rgba(os.path.join(WEAR, n2, 'patch.png')), rgba(HERO))[1][..., 3] > 0
            down = m.copy()
            for k in range(1, 9):
                down |= np.roll(m, k, 0)
            m = m | (down & belt & body)
        out[sl] = m
    r, g, bb = b[..., 0], b[..., 1], b[..., 2]
    out['protected'] = _grow(body & (bb > 150) & (g > 150) & (r < 140) & (bb - r > 60), 2) & body  # (the Aetherlink's bright cyan, with a 2px margin)
    return out


def write_templates(base):
    os.makedirs(TEMPLATES, exist_ok=True)
    for k, m in slot_templates(base).items():
        Image.fromarray((m * 255).astype(np.uint8), 'L').save(os.path.join(TEMPLATES, ('protected' if k == 'protected' else k + '-mask') + '.png'), optimize=True)
    print(f'wrote the fit templates: {os.path.relpath(TEMPLATES, ROOT)}/<slot>-mask.png, protected.png')


def registry_text():
    L = looks()
    data = {n: {'slot': v['slot'], 'items': v['items'], 'overlay': f'assets/characters/wearable/{n}/overlay.png',
                'clear': f'assets/characters/wearable/{n}/clear.png' if v.get('clear') else None, 'v': v.get('v', 1)} for n, v in L.items()}
    js = ('// Generated by tools/wearable_add.py from assets/characters/wearable/<look>/look.json: do not edit by hand.\n'
          '// Round 555: the looks the hero can wear (tools/art-refresh/wearable-gear.md).\n'
          f'const HERO_WEAR_SLOTS = {json.dumps(SLOTS)};\n'
          "const HERO_WEAR_BASE = 'assets/characters/protagonist-walk9-base.png';\n"
          'const HERO_WEAR_DEFAULTS = ' + json.dumps({sl: {'under': f'assets/characters/wearable/{n}/under.png', 'over': f'assets/characters/wearable/{n}/over.png'} for sl, n in defaults().items()}) + ';\n'
          'const HERO_WEAR_DATA = ' + json.dumps(data, indent=1) + ';\n')
    return js, len(data)


def rebuild():
    write_default_parts()
    js, n = registry_text()
    open(REGISTRY, 'w').write(js)
    print(f'wrote {os.path.relpath(REGISTRY, ROOT)}: {n} look(s)')
    write_templates(rgba(BASE))


# Round 562: the review sheet. Every frame of every direction in three rows: the hero as he is (base + defaults), with this look
# alone, and with the whole current outfit (every registered look of the other slots), where old clothing the outfit should hide
# (the brown shoes when boots are worn, the khaki trousers when pants are) is tinted red. Then walk animations of the outfit at
# game size. Every fit problem found so far (the boot box, the tan hip, the vest's shoulders) shows plainly on it.
OLD_CLOTHES = {'pants': ((152, 119, 81), (118, 236)), 'boots': ((80, 40, 25), (212, 256))}  # (the base sheet's trouser and shoe colours, and the rows of a 256px cell they're in)
SKIN = (178, 124, 70)


def review(hero, base, look, slot, ov, cl, out_dir):
    from PIL import ImageDraw
    os.makedirs(out_dir, exist_ok=True)
    D = default_patches()
    others = [(v['slot'], rgba(os.path.join(WEAR, n, 'overlay.png'))) for n, v in looks().items() if n != look and v['slot'] != slot]
    oclears = [rgba(os.path.join(WEAR, n, 'clear.png')) for n, v in looks().items() if n != look and v['slot'] != slot and v.get('clear')]
    mine = [cl] if cl is not None else []
    rows = {'as he is': composite(base, [], [], D), look: composite(base, mine, [(slot, ov)], D),
            'whole outfit': composite(base, oclears + mine, others + [(slot, ov)], D)}
    outfit = np.asarray(rows['whole outfit']).astype(np.int16)
    worn = {sl for sl, _ in others} | {slot}
    tint = np.zeros(outfit.shape[:2], bool)
    cy = np.arange(outfit.shape[0])[:, None] % CELL
    for sl, (col, (y0, y1)) in OLD_CLOTHES.items():
        if sl in worn:
            dc = np.sqrt(((outfit[..., :3] - np.array(col)) ** 2).sum(-1)); ds = np.sqrt(((outfit[..., :3] - np.array(SKIN)) ** 2).sum(-1))
            tint |= (outfit[..., 3] > 200) & (dc < 28) & (dc < ds - 15) & (cy >= y0) & (cy < y1)
    t = outfit.copy(); t[tint, 0] = 255; t[tint, 1] //= 3; t[tint, 2] //= 3
    rows['outfit, old clothing in red'] = Image.fromarray(t.astype(np.uint8), 'RGBA'); del rows['whole outfit']
    Z, lab = 150, 150
    sheet = Image.new('RGB', (lab + 9 * Z, 4 * (len(rows) * Z + 24)), (40, 44, 52)); d = ImageDraw.Draw(sheet)
    y = 0
    for r, dname in enumerate(['facing down', 'facing left', 'facing right', 'facing up']):
        d.text((6, y + 6), f'{dname}: frames 0 (standing) to 8', fill=(230, 230, 230)); y += 24
        for name, im in rows.items():
            d.text((6, y + Z // 2), name[:22], fill=(200, 200, 200))
            for c in range(9):
                cell = im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize((Z, Z), Image.LANCZOS)
                bg = Image.new('RGBA', (Z, Z), (90, 110, 90, 255)); bg.alpha_composite(cell); sheet.paste(bg.convert('RGB'), (lab + c * Z, y))
            y += Z
    sp = os.path.join(out_dir, f'{look}-review.png'); sheet.save(sp)
    outfit_im = Image.fromarray(np.asarray(rows[look]).astype(np.uint8), 'RGBA') if False else Image.fromarray(outfit.astype(np.uint8), 'RGBA')
    gifs = []
    for r, dname in enumerate(['down', 'left', 'right', 'up']):
        fr = []
        for c in range(1, 9):
            cell = outfit_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize((84, 84), Image.LANCZOS).resize((168, 168), Image.NEAREST)
            bg = Image.new('RGBA', (168, 168), (60, 70, 80, 255)); bg.alpha_composite(cell); fr.append(bg.convert('RGB'))
        g = os.path.join(out_dir, f'{look}-walk-{dname}.gif'); fr[0].save(g, save_all=True, append_images=fr[1:], duration=110, loop=0); gifs.append(g)
    print(f'review sheet: {sp}; walk animations (whole outfit, game size x2): {", ".join(os.path.basename(g) for g in gifs)}; red tint marks {int(tint.sum())} px of old clothing showing')


def from_folder(a):
    """--from: read the hand-off folder's manifest.json (look, slot, items, cleaned) and its overlay.png / cleaned.png"""
    m = os.path.join(a.from_dir, 'manifest.json')
    if not os.path.isfile(m):
        raise SystemExit(f'{m} not found: a hand-off folder needs manifest.json ({{"look": ..., "slot": ..., "items": [...], "cleaned": false}})')
    j = json.load(open(m))
    for k in ('look', 'slot', 'items'):
        if k not in j:
            raise SystemExit(f'{m}: no {k!r}')
    if not isinstance(j['items'], list):
        raise SystemExit(f'{m}: "items" must be a list of gear ids')
    a.look, a.slot, a.items = j['look'], j['slot'], ','.join(j['items'])
    a.overlay = os.path.join(a.from_dir, 'overlay.png')
    cp = os.path.join(a.from_dir, 'cleaned.png')
    if j.get('cleaned') and not os.path.isfile(cp):
        raise SystemExit(f'{m} says cleaned.png is included, but it is not there')
    if os.path.isfile(cp) and not j.get('cleaned'):
        raise SystemExit(f'{cp} is there but {m} does not say "cleaned": true')
    a.clean = cp if j.get('cleaned') else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--look'); ap.add_argument('--slot'); ap.add_argument('--items'); ap.add_argument('--overlay'); ap.add_argument('--clean')
    ap.add_argument('--proof'); ap.add_argument('--rebuild', action='store_true'); ap.add_argument('--check', action='store_true')
    ap.add_argument('--dry-run', action='store_true', help='every check and the proofs, nothing written under assets/ (for Codex before a hand-off)')
    ap.add_argument('--from', dest='from_dir', help='a hand-off folder with manifest.json and overlay.png (Round 562)')
    ap.add_argument('--review', help='write the review sheet and walk animations here (Round 562)')
    a = ap.parse_args()
    if a.from_dir:
        from_folder(a)
    hero, base = rgba(HERO), rgba(BASE)
    if not (hero[..., 3] == base[..., 3]).all():
        raise SystemExit('the base sheet must keep the hero\'s outline exactly')
    if a.check:
        bad = 0
        claimed = {}
        for n, v in looks().items():
            d = os.path.join(WEAR, n)
            ov = rgba(os.path.join(d, 'overlay.png'))
            cl = rgba(os.path.join(d, 'clear.png')) if v.get('clear') else None
            p, past = check_look(n, v['slot'], v['items'], ov, cl, base)
            for it in v['items']:
                if it in claimed:
                    p.append(f'item {it!r} is also in look {claimed[it]!r}')
                claimed[it] = n
            print(f'{n}: {"ok" if not p else "; ".join(p)} ({past} px on the outline\'s edge)')
            bad += bool(p)
        nothing = np.asarray(composite(base, [], [], default_patches())).astype(np.int16)
        d = int(np.abs(nothing - hero).max())
        print(f'nothing worn: the base and the default looks give the hero back (max difference {d})')
        if d > 1:
            bad += 1
        for k, m in slot_templates(base).items():  # (Round 563: the fit templates match the looks)
            f = os.path.join(TEMPLATES, ('protected' if k == 'protected' else k + '-mask') + '.png')
            if not os.path.isfile(f) or not ((np.asarray(Image.open(f).convert('L')) > 127) == m).all():
                print(f'{os.path.relpath(f, ROOT)} is out of date: run tools/wearable_add.py --rebuild'); bad += 1
        cur = open(REGISTRY).read() if os.path.isfile(REGISTRY) else ''
        if cur != registry_text()[0]:  # (Round 559: read-only; --rebuild writes it)
            print('assets/hero-wear-looks.js is out of date: run tools/wearable_add.py --rebuild'); bad += 1
        sys.exit(1 if bad else 0)
    if a.rebuild:
        return rebuild()
    if not (a.look and a.slot and a.items and a.overlay):
        ap.error('--look, --slot, --items and --overlay are needed (or --rebuild / --check)')
    if not re.fullmatch(r'[a-z0-9-]+', a.look):
        ap.error('--look: lower-case letters, digits and hyphens')
    items = [s.strip() for s in a.items.split(',') if s.strip()]
    ov = rgba(a.overlay)
    cl = clear_from_cleaned(base, rgba(a.clean)) if a.clean else None  # (Round 559: a cleaned sheet is the base with this slot's clothing painted out)
    bad_px = np.zeros(hero.shape[:2], bool)
    p, past = check_look(a.look, a.slot, items, ov, cl, base, bad_px)
    for n, v in looks().items():
        if n != a.look:
            p += [f'item {it!r} is already in look {n!r}' for it in items if it in v['items']]
    if p:
        print('NOT ADDED:\n  ' + '\n  '.join(p))
        if bad_px.any():
            dp = os.path.join(a.proof or '/tmp', f'{a.look}-rejected.png'); os.makedirs(os.path.dirname(dp), exist_ok=True); diagnostic(dp, hero, bad_px)
            print(f'rejected pixels shown in red: {dp}')
        sys.exit(1)
    if a.dry_run:
        if a.proof:
            proofs(hero, composite(base, [cl] if cl is not None else [], [(a.slot, ov)], default_patches()), a.proof, a.look); print(f'proofs in {a.proof}')
        if a.review:
            review(hero, base, a.look, a.slot, ov, cl, a.review)
        print(f'dry run: {a.look} passes every check; nothing written'); return
    d = os.path.join(WEAR, a.look); os.makedirs(d, exist_ok=True)
    old = json.load(open(os.path.join(d, 'look.json'))) if os.path.isfile(os.path.join(d, 'look.json')) else {}
    # (Round 562: every file written beside its place first, then all moved in, so a failure leaves no half-written look)
    tmp = {}
    def stage(name, write):
        t = os.path.join(d, '.' + name + '.new'); write(t); tmp[name] = t
    stage('overlay.png', lambda t: Image.fromarray(ov.astype(np.uint8), 'RGBA').save(t, 'PNG', optimize=True))
    if cl is not None:
        stage('clear.png', lambda t: Image.fromarray(cl.astype(np.uint8), 'RGBA').save(t, 'PNG', optimize=True))
    stage('look.json', lambda t: json.dump({'slot': a.slot, 'items': items, 'clear': cl is not None, 'v': old.get('v', 0) + 1}, open(t, 'w'), indent=1))
    for name, t in tmp.items():
        os.replace(t, os.path.join(d, name))
    if cl is None and os.path.isfile(os.path.join(d, 'clear.png')):
        os.remove(os.path.join(d, 'clear.png'))
    print(f'added {a.look}: slot {a.slot}, items {", ".join(items)}; {past} overlay px on the outline\'s edge'
          + (f'; clear patch {int((cl[..., 3] == 255).sum())} px' if cl is not None else '; no clear patch (the overlay must cover the old clothes)'))
    rebuild()
    if a.proof:
        proofs(hero, composite(base, [cl] if cl is not None else [], [(a.slot, ov)], default_patches()), a.proof, a.look)
        print(f'proofs in {a.proof}')
    if a.review:
        review(hero, base, a.look, a.slot, ov, cl, a.review)


if __name__ == '__main__':
    main()
