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
    overlays: [(slot, rgba)]; defaults_by_slot: {slot: rgba}"""
    a = base.astype(np.float64).copy()
    def atop(c):
        m = c[..., 3:4] / 255.0
        a[..., :3] = c[..., :3] * m + a[..., :3] * (1 - m)
    for c in clears:
        atop(c)
    out = None
    worn = {sl for sl, _ in overlays}
    for sl in SLOTS:
        if sl not in worn and defaults_by_slot and sl in defaults_by_slot:
            if out is not None:
                a = np.asarray(out).astype(np.float64); out = None
            atop(defaults_by_slot[sl])
        for s2, o in overlays:
            if s2 == sl:
                if out is None:
                    out = Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8), 'RGBA')
                out.alpha_composite(Image.fromarray(o.astype(np.uint8), 'RGBA'))
    return out if out is not None else Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8), 'RGBA')


def default_patches():
    return {sl: rgba(os.path.join(WEAR, n, 'patch.png')) for sl, n in defaults().items()}


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


def registry_text():
    L = looks()
    data = {n: {'slot': v['slot'], 'items': v['items'], 'overlay': f'assets/characters/wearable/{n}/overlay.png',
                'clear': f'assets/characters/wearable/{n}/clear.png' if v.get('clear') else None, 'v': v.get('v', 1)} for n, v in L.items()}
    js = ('// Generated by tools/wearable_add.py from assets/characters/wearable/<look>/look.json: do not edit by hand.\n'
          '// Round 555: the looks the hero can wear (tools/art-refresh/wearable-gear.md).\n'
          f'const HERO_WEAR_SLOTS = {json.dumps(SLOTS)};\n'
          "const HERO_WEAR_BASE = 'assets/characters/protagonist-walk9-base.png';\n"
          'const HERO_WEAR_DEFAULTS = ' + json.dumps({sl: f'assets/characters/wearable/{n}/patch.png' for sl, n in defaults().items()}) + ';\n'
          'const HERO_WEAR_DATA = ' + json.dumps(data, indent=1) + ';\n')
    return js, len(data)


def rebuild():
    js, n = registry_text()
    open(REGISTRY, 'w').write(js)
    print(f'wrote {os.path.relpath(REGISTRY, ROOT)}: {n} look(s)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--look'); ap.add_argument('--slot'); ap.add_argument('--items'); ap.add_argument('--overlay'); ap.add_argument('--clean')
    ap.add_argument('--proof'); ap.add_argument('--rebuild', action='store_true'); ap.add_argument('--check', action='store_true')
    ap.add_argument('--dry-run', action='store_true', help='every check and the proofs, nothing written under assets/ (for Codex before a hand-off)')
    a = ap.parse_args()
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
        print(f'dry run: {a.look} passes every check; nothing written'); return
    d = os.path.join(WEAR, a.look); os.makedirs(d, exist_ok=True)
    old = json.load(open(os.path.join(d, 'look.json'))) if os.path.isfile(os.path.join(d, 'look.json')) else {}
    Image.fromarray(ov.astype(np.uint8), 'RGBA').save(os.path.join(d, 'overlay.png'), optimize=True)
    if cl is not None:
        Image.fromarray(cl.astype(np.uint8), 'RGBA').save(os.path.join(d, 'clear.png'), optimize=True)
    elif os.path.isfile(os.path.join(d, 'clear.png')):
        os.remove(os.path.join(d, 'clear.png'))
    json.dump({'slot': a.slot, 'items': items, 'clear': cl is not None, 'v': old.get('v', 0) + 1}, open(os.path.join(d, 'look.json'), 'w'), indent=1)
    print(f'added {a.look}: slot {a.slot}, items {", ".join(items)}; {past} overlay px on the outline\'s edge'
          + (f'; clear patch {int((cl[..., 3] == 255).sum())} px' if cl is not None else '; no clear patch (the overlay must cover the old clothes)'))
    rebuild()
    if a.proof:
        proofs(hero, composite(base, [cl] if cl is not None else [], [(a.slot, ov)], default_patches()), a.proof, a.look)
        print(f'proofs in {a.proof}')


if __name__ == '__main__':
    main()
