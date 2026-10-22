# Round 149: Solaris (world 2) is built from a small kit of room tiles that are flipped to fit
# each room, like Neon Aftermath's map but from far fewer paintings.
#   python3 tools/build_solaris.py
# 1. Source tiles (owner paintings) live in assets/environment/solaris/src/ (any size, 16:10).
#    Each is named by its road shape in its own orientation (see SHAPES). Missing shapes get a
#    placeholder cut from the real tiles until the painting arrives.
# 2. The 54-room layout is Neon Aftermath's, mirrored left-right. Every room is given a tile and
#    the flip that turns the tile's exits into the room's exits.
# 3. Streets are traced from each tile once and flipped per room into the world walk mask.
# Writes assets/environment/solaris/*.webp and assets/solaris-data.js.
import glob, json, os, re, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage as nd
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plazas import carve, room_spots  # noqa: E402

SRC = 'assets/environment/solaris/src'
OUT = 'assets/environment/solaris'
# Tile name prefix -> the exits of the tile as painted.
SHAPES = {'corner': 'ne', 't-bottom': 'esw', 't-right': 'nes', 'cross': 'nesw', 'dead-bottom': 's', 'dead-right': 'e', 'dead-left': 'w', 'dead-top': 'n', 'straight': 'ns'}
FLIP_EXITS = {(0, 0): {}, (1, 0): {'e': 'w', 'w': 'e'}, (0, 1): {'n': 's', 's': 'n'}, (1, 1): {'e': 'w', 'w': 'e', 'n': 's', 's': 'n'}}
# Round 192: three corner rooms are cut so the map is less rectangular; the two rooms beside each
# cut are joined by a diagonal road across the gap. Their paintings live in src/diagonal/, named by
# shape: (straight exits as painted, diagonal as painted). Only side-to-side flips are used.
CUT = ['0,3', '8,3', '5,0']
DIAG_SRC = SRC + '/diagonal'
DSHAPES = {'diag-corner': ('es', 'ne'), 'diag-t-a': ('nes', 'sw'), 'diag-t-b': ('esw', 'nw'), 'diag-t-c': ('nes', 'nw')}
FLIP_DIAG = {(0, 0): {}, (1, 0): {'ne': 'nw', 'nw': 'ne', 'se': 'sw', 'sw': 'se'}}
# Round 228: the new look's tiles ('-s1', tools/prepare_solaris_tiles.py) are strictly top-down, so
# their diagonals may flip top-to-bottom too. They bring their own walk masks (src/masks/).
FLIP_DIAG_ALL = {**FLIP_DIAG, (0, 1): {'ne': 'se', 'se': 'ne', 'nw': 'sw', 'sw': 'nw'}, (1, 1): {'ne': 'sw', 'sw': 'ne', 'nw': 'se', 'se': 'nw'}}
def top_down(n): return bool(re.search(r'-s\d+$', n))  # '-s1', '-s2'...
MASK_SRC = SRC + '/masks'
# Round 228: the landmark rooms' paintings are in the old style; the new look uses its tiles there
# (the paintings are kept in unused assets/environment/solaris/).
USE_LANDMARKS = False
ROAD = np.array([247, 227, 175])


def load(path):
    im = Image.open(path).convert('RGB'); w = min(im.width, 2000)  # Round 228: the room is 800 wide; 2000 keeps detail without the weight
    return im.resize((w, round(w * 5 / 8)), Image.LANCZOS)


def placeholders(tiles):
    """Cut stand-in tiles for shapes not painted yet from the real ones."""
    out = {}
    def has(s): return any(n.startswith(s + '-') or n == s for n in tiles)
    def first(s): return next(tiles[n] for n in sorted(tiles) if n.startswith(s))
    if has('t-bottom') and not has('cross'):
        a = np.asarray(first('t-bottom')).copy(); H = a.shape[0]; h = H // 2
        a[:h] = a[H - h:][::-1]; out['cross-ph'] = Image.fromarray(a)
    if has('t-right') and not has('straight'):
        a = np.asarray(first('t-right')).copy(); W = a.shape[1]; w = W // 2
        a[:, W - w:] = a[:, :w][:, ::-1]; out['straight-ph'] = Image.fromarray(a)
    if has('t-bottom') and not has('dead-bottom') and not has('dead-top'):
        st = np.asarray(out.get('straight-ph') or first('straight')); top = np.asarray(first('t-bottom').resize((st.shape[1], st.shape[0])))
        a = st.copy(); cut = int(st.shape[0] * .44); a[:cut] = top[:cut]; out['dead-bottom-ph'] = Image.fromarray(a)
    if has('t-right') and has('t-bottom') and not has('dead-right') and not has('dead-left'):
        tb = np.asarray(first('t-bottom')); tr = np.asarray(first('t-right').resize((tb.shape[1], tb.shape[0])))
        a = tb.copy(); cut = int(tb.shape[1] * .44); a[:, :cut] = tr[:, :cut]
        a[int(tb.shape[0] * .56):, cut:int(tb.shape[1] * .56)] = tb[int(tb.shape[0] * .56):, int(tb.shape[1] * .56):int(tb.shape[1] * .56) + int(tb.shape[1] * .56) - cut]
        out['dead-right-ph'] = Image.fromarray(a)
    return out


# Round 164: landmark rooms. Each painting in src/landmarks/ is used for one room only. Their
# textured paving and sand plazas are beyond the colour tracer, so walk areas are drawn by hand:
# rectangles and polygons in 800x500 coordinates on the painting as delivered. The same goes for
# the straight tiles. LANDMARKS gives each landmark its room, exits as painted, and flip.
MANUAL = {
    'sol-relic-ember': {'shapes': [
        [(0, 224), (348, 224), (444, 318), (444, 424), (420, 424), (420, 500), (352, 500), (352, 332), (328, 296), (0, 296)],
        (444, 368, 640, 424), (592, 318, 640, 424), (484, 154, 748, 322), (600, 120, 650, 160)]},
    'sol-relic-crystal': {'shapes': [
        (300, 0, 376, 250), [(0, 218), (330, 218), (376, 190), (376, 288), (0, 288)],
        (376, 150, 540, 322), (300, 318, 352, 350), (250, 345, 400, 478)]},
    'sol-relic-lens': {'shapes': [
        (352, 296, 448, 500), (348, 196, 452, 300), (240, 152, 556, 202),
        (176, 12, 312, 160), (488, 12, 628, 160), (312, 112, 488, 160), (124, 276, 300, 448), (300, 300, 352, 440)]},
    'sol-boss': {'shapes': [
        (376, 0, 424, 90), [(280, 82), (496, 82), (580, 164), (580, 320), (536, 372), (260, 372), (200, 264), (200, 160)],
        (0, 208, 210, 268), (580, 90, 656, 260), (120, 72, 200, 208)]},
    'sol-relic-boots': {'shapes': [
        (376, 0, 432, 276), (376, 216, 800, 276), (168, 240, 560, 320), (168, 320, 236, 470), (460, 112, 680, 216)]},
    'dead-top': {'shapes': [  # road from the top into a turnaround circle; the sand alley below
        (376, 0, 436, 262), ('ellipse', (354, 248, 474, 368)), (282, 262, 356, 350),  # stops short
        (330, 360, 452, 440), (436, 212, 560, 300)]},                                   # of the edge
    'corner-c': {'shapes': [(374, 0, 426, 268), (374, 226, 800, 268)]},  # Round 191: brick paving the tracer cannot read
    'straight-a': {'shapes': [(366, 0, 434, 500), (82, 228, 712, 266)]},
    'straight-b': {'shapes': [(366, 0, 434, 500), (82, 228, 712, 266)]},
}
# Traced tiles whose round plazas the tracer misses: these shapes are added to the traced roads.
EXTRA = {
    'cross-a': [('ellipse', (328, 176, 472, 320))],  # sun-dial roundabout at the crossing
    'dead-left': [('ellipse', (448, 168, 604, 312))],  # round plaza at the end of the road
    'dead-top-b': [('ellipse', (362, 224, 438, 294))],  # Round 191: ring plaza at the end of the road
    't-bottom-c': [('ellipse', (374, 220, 426, 274))],  # Round 191: ring at the junction
}
MANUAL['sol-miniboss'] = MANUAL['sol-boss']  # same stronghold yard, painted twice
# room: (painting, exits as painted, flip x, flip y). Rooms are picked so most paintings need no
# top-to-bottom flip (that would turn their buildings upside down).
LANDMARKS = {
    '8,5': ('sol-boss', 'nw', 0, 0),
    '5,2': ('sol-miniboss', 'nw', 0, 0),
    '8,0': ('sol-relic-ember', 'sw', 0, 0),
    '0,2': ('sol-relic-boots', 'ne', 0, 0),
    '6,2': ('sol-relic-crystal', 'nw', 1, 0),
    '5,5': ('sol-relic-lens', 's', 0, 1),
}


def manual_mask(spec):
    from PIL import ImageDraw
    im = Image.new('L', (800, 500), 0); dr = ImageDraw.Draw(im)
    for sh in spec['shapes']:
        if isinstance(sh, tuple) and sh[0] == 'ellipse': dr.ellipse(sh[1], fill=1)
        elif isinstance(sh, tuple): dr.rectangle(sh, fill=1)
        else: dr.polygon(sh, fill=1)
    return np.asarray(im).astype(bool)


def trace(im, exits):
    a = np.asarray(im.resize((800, 500), Image.LANCZOS)).astype(int)
    d = np.abs(a - ROAD).max(2)
    g = a.mean(2); tex = np.sqrt(np.maximum(nd.uniform_filter(g * g, 7) - nd.uniform_filter(g, 7) ** 2, 0))
    road = (d < 26) & (tex < 9)
    road = nd.binary_closing(nd.binary_opening(np.pad(road, 10, mode='edge'), iterations=2), iterations=4)[10:-10, 10:-10]
    road = nd.binary_fill_holes(road) & nd.binary_dilation(road, iterations=6) | road
    l, n = nd.label(road)
    keep = set()
    for e in exits:
        y, x = {'n': (2, 400), 's': (497, 400), 'w': (250, 2), 'e': (250, 797)}[e]
        win = l[max(0, y - 40):y + 40, max(0, x - 60):x + 60] if e in 'ns' else l[max(0, y - 60):y + 60, max(0, x - 40):x + 40]
        keep |= set(np.unique(win)) - {0}
    return np.isin(l, list(keep))


NAMES_A = ['Sunspire', 'Amber', 'Dune', 'Gilded', 'Mirage', 'Ember', 'Saffron', 'Halo', 'Glass', 'Copper', 'Solstice', 'Zenith', 'Cinder', 'Oasis', 'Brass', 'Radiant', 'Sandglass', 'Noon']
NAMES_B = ['Bazaar', 'Terrace', 'Court', 'Steps', 'Arcade', 'Gardens', 'Row', 'Plaza', 'Quarter', 'Wells', 'Yards', 'Causeway', 'Promenade', 'Market', 'Walk', 'Crossing', 'Arches', 'Lanes']
SPECIAL = {'0,0': 'Dawnfire Gate', '8,5': 'The Solar Crown', '5,2': 'Scrapwall Stronghold', '8,0': 'Temple of the Noon Bell',
           '0,2': 'Statue Garden', '6,2': 'Shattered Array', '5,5': 'Brass Observatory'}


def neon_layout():
    """Neon Aftermath's 54 rooms mirrored top-to-bottom: Solaris key (x, 9 - y). The start room
    lands on 0,0 (top-left) and the final boss on 8,5 (bottom-right), like the old Elaris."""
    s = open('index.html').read()
    city = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r'^ "(\d+,\d+)":(\{.*\}),?$', s, re.M)}
    flip = {'n': 's', 's': 'n'}
    key_of = lambda k: (lambda cx, cy: f'{cx},{9 - cy}')(*map(int, k.split(',')))
    rooms, used = {}, set()
    for k, r in city.items():
        key = key_of(k)
        ex = {flip.get(d, d): key_of(v if isinstance(v, str) else v['to']) for d, v in r['exits'].items()}
        h = int(hashlib.md5(('sol' + key).encode()).hexdigest(), 16)
        name = SPECIAL.get(key)
        i = 0
        while not name or name in used:
            name = NAMES_A[(h + i * 7) % len(NAMES_A)] + ' ' + NAMES_B[(h // 31 + i * 11) % len(NAMES_B)]; i += 1
        used.add(name)
        x, y = map(int, key.split(','))
        rooms[key] = {'name': name, 'exits': ex, 'world': [x, y], **({'zone': r['zone']} if r.get('zone') else {}), **({'level': r['level'] + 9} if r.get('level') else {})}
    for c in CUT:
        a, b = rooms[c]['exits'].values()
        for k in (a, b): rooms[k]['exits'] = {d: t for d, t in rooms[k]['exits'].items() if t != c}
        (ax, ay), (bx, by) = map(int, a.split(',')), map(int, b.split(','))
        rooms[a]['exits'][('n' if by < ay else 's') + ('e' if bx > ax else 'w')] = b
        rooms[b]['exits'][('n' if ay < by else 's') + ('e' if ax > bx else 'w')] = a
        del rooms[c]
    # Levels climb with walking distance from the start (10 near the gate, 17 at the far edge,
    # 18 for the Solar Crown), so world 2's difficulty curve keeps its shape on the new map.
    dist, q = {'0,0': 0}, ['0,0']
    while q:
        k = q.pop(0)
        for t in rooms[k]['exits'].values():
            if t not in dist: dist[t] = dist[k] + 1; q.append(t)
    far = max(dist.values())
    for k, r in rooms.items():
        r.pop('zone', None); r.pop('level', None)
        if k == '0,0': continue
        lv = 18 if k == '8,5' else 10 + min(7, round(7 * (dist[k] - 1) / max(1, far - 2)))
        r['level'] = lv; r['zone'] = min(8, lv - 9)
    return rooms


def main():
    tiles = {os.path.splitext(os.path.basename(p))[0]: load(p) for p in sorted(glob.glob(SRC + '/*.*'))}
    if not any(top_down(n) for n in tiles): tiles.update(placeholders(tiles))  # Round 230: the new look uses real paintings only
    marks = {os.path.splitext(os.path.basename(p))[0]: load(p) for p in sorted(glob.glob(SRC + '/landmarks/*.*'))} if USE_LANDMARKS else {}
    shape_of = {n: next(s for s in sorted(SHAPES, key=len, reverse=True) if n.startswith(s)) for n in tiles}
    for n, im in {**tiles, **marks}.items(): im.save(f'{OUT}/{n}.webp', quality=88, method=6)
    def own_mask(n):
        p = f'{MASK_SRC}/{n}.png'
        return np.asarray(Image.open(p).convert('L').resize((800, 500), Image.NEAREST)) > 127 if os.path.exists(p) else None
    masks = {n: own_mask(n) if own_mask(n) is not None else manual_mask(MANUAL[n]) if n in MANUAL else trace(im, SHAPES[shape_of[n]]) for n, im in tiles.items()}
    for n, shapes in EXTRA.items():
        if n in masks: masks[n] = masks[n] | manual_mask({'shapes': shapes})
    masks.update({n: manual_mask(MANUAL[n]) for n in marks})
    dtiles = {os.path.splitext(os.path.basename(p))[0]: load(p) for p in sorted(glob.glob(DIAG_SRC + '/*.*'))}
    dshape_of = {n: next(sh for sh in sorted(DSHAPES, key=len, reverse=True) if n.startswith(sh)) for n in dtiles}
    for n, im in dtiles.items():
        im.save(f'{OUT}/{n}.webp', quality=88, method=6)
        masks[n] = own_mask(n) if own_mask(n) is not None else trace(im, DSHAPES[dshape_of[n]][0])
    masks = {n: carve('elaris', n, m) for n, m in masks.items()}  # Round 232: open squares beside the road
    rooms = neon_layout()
    # Pick a tile and flip for every room; spread variants so neighbours differ.
    plan = {}
    for key in sorted(rooms, key=lambda k: (int(k.split(',')[1]), int(k.split(',')[0]))):
        want = {d for d in rooms[key]['exits'] if len(d) == 1}
        want_d = {d for d in rooms[key]['exits'] if len(d) == 2}
        if want_d:
            cx, cy = map(int, key.split(','))
            step = {'n': (0, -1), 's': (0, 1), 'e': (1, 0), 'w': (-1, 0)}
            off_map = lambda d: f'{cx + step[d][0]},{cy + step[d][1]}' not in rooms
            opts = []
            for n in sorted(dtiles):
                base, bd = DSHAPES[dshape_of[n]]
                flips = FLIP_DIAG_ALL if top_down(n) else FLIP_DIAG
                for f in flips:
                    ex = {FLIP_EXITS[f].get(d, d) for d in base}
                    # An extra painted road may only run off the map (a painted dead end).
                    if {flips[f].get(bd, bd)} == want_d and want <= ex and all(off_map(d) for d in ex - want): opts.append((n, f))
            if not opts: raise SystemExit('no diagonal tile for ' + key + ' ' + ''.join(sorted(want)) + '+' + ','.join(want_d))
            opts = [o for o in opts if top_down(o[0])] or opts  # Round 230: the new look's tiles first
            h = int(hashlib.md5(key.encode()).hexdigest(), 16)
            plan[key] = opts[h % len(opts)]; continue
        if key in LANDMARKS and USE_LANDMARKS:
            n, ex, fx, fy = LANDMARKS[key]
            if n not in marks: raise SystemExit('missing landmark painting ' + n)
            if {FLIP_EXITS[(fx, fy)].get(d, d) for d in ex} != want: raise SystemExit('landmark ' + n + ' does not fit ' + key)
            plan[key] = (n, (fx, fy)); continue
        opts = []
        for n in sorted(tiles):
            base = set(SHAPES[shape_of[n]])
            for f, m in FLIP_EXITS.items():
                if {m.get(d, d) for d in base} == want: opts.append((n, f))
        cx, cy = map(int, key.split(','))
        if not opts:  # Round 230: as for diagonals, an extra painted street may run off the map (a painted dead end)
            step = {'n': (0, -1), 's': (0, 1), 'e': (1, 0), 'w': (-1, 0)}
            off_map = lambda d: f'{cx + step[d][0]},{cy + step[d][1]}' not in rooms
            for n in sorted(tiles):
                base = set(SHAPES[shape_of[n]])
                for f, m in FLIP_EXITS.items():
                    ex = {m.get(d, d) for d in base}
                    if want <= ex and all(off_map(d) for d in ex - want): opts.append((n, f))
        if not opts: raise SystemExit('no tile for ' + key + ' ' + ''.join(sorted(want)))
        opts = [o for o in opts if top_down(o[0])] or opts  # Round 230: the new look's tiles first
        near = {plan[k][0] for k in (f'{cx-1},{cy}', f'{cx},{cy-1}') if k in plan}
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        # Round 165: a top-to-bottom flip turns buildings upside down, so use one only when no
        # unflipped or mirrored option fits the room.
        upright = [o for o in opts if not o[1][1]] or opts
        fresh = [o for o in upright if o[0] not in near] or upright
        plan[key] = fresh[h % len(fresh)]
    # World walk mask, same format as Neon's (8px cells over 7200x3000).
    W, H = 900, 375; bits = np.zeros((H, W), bool)
    for key, (n, (fx, fy)) in plan.items():
        m = masks[n]
        if fx: m = m[:, ::-1]
        if fy: m = m[::-1]
        cx, cy = map(int, key.split(','))
        # relax: widen 2 cells (16px) inside the room, not in the 16px edge band
        wide = nd.binary_dilation(m, iterations=14); band = np.zeros_like(m); band[16:-16, 16:-16] = True
        m = m | (wide & band)
        for r in range(H):
            yc = r * 8 + 4 - cy * 500
            if 0 <= yc < 500:
                for c in range(cx * 100, cx * 100 + 100):
                    x0 = (c - cx * 100) * 8
                    bits[r, c] = m[max(0, yc - 4):yc + 4, x0:x0 + 8].mean() >= .5
    # Diagonal doors: where each diagonal road leaves its room (outside the straight exits' middles).
    diag = {}
    for key, (n, (fx, fy)) in plan.items():
        want_d = [d for d in rooms[key]['exits'] if len(d) == 2]
        if not want_d: continue
        m = masks[n][:, ::-1] if fx else masks[n]
        if fy: m = m[::-1]  # Round 228: top-down diagonals may be flipped top-to-bottom
        ys, xs = np.nonzero(m)
        edge = (xs <= 3) | (xs >= 796) | (ys <= 3) | (ys >= 496)
        mid = ((ys <= 3) | (ys >= 496)) & (abs(xs - 400) < 70) | ((xs <= 3) | (xs >= 796)) & (abs(ys - 250) < 60)
        d = want_d[0]; corner = (800 if 'e' in d else 0, 0 if 'n' in d else 500)
        pts = [(x, y) for x, y in zip(xs[edge & ~mid], ys[edge & ~mid]) if (x < 400) == (corner[0] == 0) and (y < 250) == (corner[1] == 0)]
        if not pts: raise SystemExit('no diagonal road reaches the edge in ' + key)
        x, y = np.mean(pts, axis=0)
        diag[key] = {d: {'to': rooms[key]['exits'][d], 'x': int(round(x)), 'y': int(round(y))}}
    ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    flat = np.concatenate([bits.ravel().astype(int), np.zeros((-bits.size) % 6, int)])
    enc = ''.join(ABC[int(''.join(map(str, flat[i:i + 6])), 2)] for i in range(0, len(flat), 6))
    placeholder = sorted(n for n in tiles if n.endswith('-ph'))
    js = ('// Built by tools/build_solaris.py (Round 149). Do not edit by hand.\n'
          'const SOLARIS_WORLD = ' + json.dumps({'maskW': W, 'maskH': H, 'cell': 8, 'mask': enc}) + ';\n'
          'const SOLARIS_PLAN = ' + json.dumps({k: [n, f[0], f[1]] for k, (n, f) in plan.items()}, separators=(',', ':')) + ';\n'
          'const SOLARIS_LAYOUT = ' + json.dumps(rooms, separators=(',', ':')) + ';\n'
          'const SOLARIS_PLACEHOLDERS = ' + json.dumps(placeholder) + ';\n'
          '// Round 192: diagonal doors, {room: {dir: {to, x, y}}} in room pixels (foot point on the edge).\n'
          'const SOLARIS_DIAG = ' + json.dumps(diag, separators=(',', ':')) + ';\n'
          'const SOLARIS_CUT = ' + json.dumps(CUT) + ';\n'
          '// Round 232: open squares beside the road where items stand (tools/plazas.py), per room.\n'
          'const SOLARIS_PLAZAS = ' + json.dumps({k: room_spots('elaris', n, *f) for k, (n, f) in plan.items() if room_spots('elaris', n, *f)}, separators=(',', ':')) + ';\n')
    open('assets/solaris-data.js', 'w').write(js)
    used = {}
    for n, _ in plan.values(): used[n] = used.get(n, 0) + 1
    print(len(plan), 'rooms;', 'tiles used:', used, 'placeholders:', placeholder)


if __name__ == '__main__':
    main()
