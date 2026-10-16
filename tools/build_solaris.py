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

SRC = 'assets/environment/solaris/src'
OUT = 'assets/environment/solaris'
# Tile name prefix -> the exits of the tile as painted.
SHAPES = {'corner': 'ne', 't-bottom': 'esw', 't-right': 'nes', 'cross': 'nesw', 'dead-bottom': 's', 'dead-right': 'e', 'straight': 'ns'}
FLIP_EXITS = {(0, 0): {}, (1, 0): {'e': 'w', 'w': 'e'}, (0, 1): {'n': 's', 's': 'n'}, (1, 1): {'e': 'w', 'w': 'e', 'n': 's', 's': 'n'}}
ROAD = np.array([247, 227, 175])


def load(path):
    im = Image.open(path).convert('RGB'); w = im.width
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
    if has('t-bottom') and not has('dead-bottom'):
        st = np.asarray(out.get('straight-ph') or first('straight')); top = np.asarray(first('t-bottom').resize((st.shape[1], st.shape[0])))
        a = st.copy(); cut = int(st.shape[0] * .44); a[:cut] = top[:cut]; out['dead-bottom-ph'] = Image.fromarray(a)
    if has('t-right') and has('t-bottom') and not has('dead-right'):
        tb = np.asarray(first('t-bottom')); tr = np.asarray(first('t-right').resize((tb.shape[1], tb.shape[0])))
        a = tb.copy(); cut = int(tb.shape[1] * .44); a[:, :cut] = tr[:, :cut]
        a[int(tb.shape[0] * .56):, cut:int(tb.shape[1] * .56)] = tb[int(tb.shape[0] * .56):, int(tb.shape[1] * .56):int(tb.shape[1] * .56) + int(tb.shape[1] * .56) - cut]
        out['dead-right-ph'] = Image.fromarray(a)
    return out


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
SPECIAL = {'0,0': 'Dawnfire Gate', '8,5': 'The Solar Crown', '5,2': 'Temple of the Noon Bell', '8,0': 'Mirror Fortress'}


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
    tiles.update(placeholders(tiles))
    shape_of = {n: next(s for s in sorted(SHAPES, key=len, reverse=True) if n.startswith(s)) for n in tiles}
    for n, im in tiles.items(): im.save(f'{OUT}/{n}.webp', quality=88, method=6)
    masks = {n: trace(im, SHAPES[shape_of[n]]) for n, im in tiles.items()}
    rooms = neon_layout()
    # Pick a tile and flip for every room; spread variants so neighbours differ.
    plan = {}
    for key in sorted(rooms, key=lambda k: (int(k.split(',')[1]), int(k.split(',')[0]))):
        want = set(rooms[key]['exits'])
        opts = []
        for n in sorted(tiles):
            base = set(SHAPES[shape_of[n]])
            for f, m in FLIP_EXITS.items():
                if {m.get(d, d) for d in base} == want: opts.append((n, f))
        if not opts: raise SystemExit('no tile for ' + key + ' ' + ''.join(sorted(want)))
        cx, cy = map(int, key.split(','))
        near = {plan[k][0] for k in (f'{cx-1},{cy}', f'{cx},{cy-1}') if k in plan}
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        fresh = [o for o in opts if o[0] not in near] or opts
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
    ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    flat = np.concatenate([bits.ravel().astype(int), np.zeros((-bits.size) % 6, int)])
    enc = ''.join(ABC[int(''.join(map(str, flat[i:i + 6])), 2)] for i in range(0, len(flat), 6))
    placeholder = sorted(n for n in tiles if n.endswith('-ph'))
    js = ('// Built by tools/build_solaris.py (Round 149). Do not edit by hand.\n'
          'const SOLARIS_WORLD = ' + json.dumps({'maskW': W, 'maskH': H, 'cell': 8, 'mask': enc}) + ';\n'
          'const SOLARIS_PLAN = ' + json.dumps({k: [n, f[0], f[1]] for k, (n, f) in plan.items()}, separators=(',', ':')) + ';\n'
          'const SOLARIS_LAYOUT = ' + json.dumps(rooms, separators=(',', ':')) + ';\n'
          'const SOLARIS_PLACEHOLDERS = ' + json.dumps(placeholder) + ';\n')
    open('assets/solaris-data.js', 'w').write(js)
    used = {}
    for n, _ in plan.values(): used[n] = used.get(n, 0) + 1
    print(len(plan), 'rooms;', 'tiles used:', used, 'placeholders:', placeholder)


if __name__ == '__main__':
    main()
