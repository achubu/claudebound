# Round 174: worlds 3 and 4 (the Sky Isles and Elaris) are built like Solaris: a small kit of
# road-shaped room tiles, flipped to fit each of 54 rooms on Neon Aftermath's layout.
#   python3 tools/build_tile_world.py sky
#   python3 tools/build_tile_world.py wilds
# 1. Tiles live in assets/environment/<world>/src/, named by road shape (SHAPES in
#    tools/build_solaris.py), e.g. cross-a.jpg, corner-b.png. Until the owner paints them,
#    tools/paint_placeholder_tiles.py makes stand-ins named <shape>-ph.
# 2. A tile with src/masks/<name>.png uses that walk area (white = walkable, 800x500);
#    others are traced by colour like Solaris (WORLDS[...]['road']).
# 3. Each world uses Neon Aftermath's rooms turned a different way, so the three tile worlds
#    don't share a map: Solaris is flipped top-to-bottom, the Sky Isles left-to-right, and
#    Elaris is turned half way round.
# Writes assets/environment/<world>/*.webp and assets/<world>-data.js.
import glob, hashlib, json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(__file__))
from build_solaris import SHAPES as SOLARIS_SHAPES, FLIP_EXITS, load, trace, manual_mask  # noqa: E402

# Round 179: a turned layout (Chronospire) needs a straight east-west road too.
SHAPES = {**SOLARIS_SHAPES, 'straight-h': 'ew'}

WORLDS = {
    'sky': {
        'name': 'Sky Isles', 'key': lambda cx, cy: (8 - cx, cy - 4), 'levels': (19, 27), 'road': None,
        'a': ['Cloud', 'Gale', 'Zephyr', 'Aurora', 'Halcyon', 'Skyward', 'Feather', 'Starlit', 'Thunder', 'Azure',
              'Drift', 'Windswept', 'Lofty', 'Nimbus', 'Cirrus', 'Sunbeam', 'Moonrise', 'Silver'],
        'b': ['Bridge', 'Spire', 'Isle', 'Terrace', 'Landing', 'Steps', 'Garden', 'Walk', 'Arch', 'Court',
              'Perch', 'Causeway', 'Overlook', 'Ring', 'Crossing', 'Ledge', 'Gate', 'Dock'],
        'special': {'start': 'Windgate Landing', 'boss': 'The Eye of the Sky', 'mini1': 'Stormbell Tower', 'mini2': 'Featherfall Roost'},
    },
    'wilds': {
        'name': 'Elaris', 'key': lambda cx, cy: (8 - cx, 9 - cy), 'levels': (28, 36), 'road': None,
        'a': ['Mossy', 'Elder', 'Fern', 'Briar', 'Willow', 'Thorn', 'Amber', 'Dappled', 'Hollow', 'Bramble',
              'Emerald', 'Misty', 'Root', 'Sunpetal', 'Wild', 'Cedar', 'Bluebell', 'Old'],
        'b': ['Glade', 'Trail', 'Hollow', 'Grove', 'Thicket', 'Brook', 'Clearing', 'Path', 'Ford', 'Dell',
              'Meadow', 'Copse', 'Bend', 'Wood', 'Crossing', 'Knoll', 'Run', 'Ring'],
        'special': {'start': 'Elaris Gateway', 'boss': 'Elderbloom Sanctuary', 'mini1': 'Drowned Weir', 'mini2': 'Stormwing Canopy'},
    },
    # Round 179: Vespera and Chronospire are rebuilt the same way. Vespera keeps Neon
    # Aftermath's layout as it is; Chronospire turns it on its side into a tall 6x9 spire.
    'vespera': {
        'name': 'Vespera', 'key': lambda cx, cy: (cx, cy - 4), 'levels': (37, 45), 'road': None,
        'a': ['Stormglass', 'Ion', 'Tempest', 'Rimeglass', 'Squall', 'Prism', 'Brine', 'Thunder', 'Static', 'Gale',
              'Arc', 'Shatter', 'Cobalt', 'Riptide', 'Lightning', 'Mist', 'Surge', 'Crystal'],
        'b': ['Shoals', 'Reach', 'Causeway', 'Strand', 'Cove', 'Spit', 'Marsh', 'Point', 'Bluffs', 'Pier',
              'Hollow', 'Flats', 'Breakwater', 'Inlet', 'Ridge', 'Landing', 'Sound', 'Shelf'],
        'special': {'start': 'Glasswind Reach', 'boss': 'Eye of the Tempest', 'mini1': 'Arc Bastion', 'mini2': 'Resonant Grotto'},
    },
    'chronospire': {
        'name': 'Chronospire', 'key': lambda cx, cy: (cy - 4, cx), 'levels': (46, 54), 'road': None,
        'a': ['Brass', 'Hourglass', 'Pendulum', 'Gear', 'Cog', 'Tick', 'Escapement', 'Sundial', 'Clockwork', 'Mainspring',
              'Chime', 'Copper', 'Second', 'Minute', 'Ratchet', 'Balance', 'Bronze', 'Orrery'],
        'b': ['Stair', 'Gallery', 'Landing', 'Walk', 'Hall', 'Works', 'Loft', 'Bridge', 'Vault', 'Ring',
              'Shaft', 'Spiral', 'Arcade', 'Court', 'Lift', 'Ledge', 'Chamber', 'Steps'],
        'special': {'start': 'Chronospire Gate', 'boss': 'The Last Second', 'mini1': 'Clockwarden\'s Loft', 'mini2': 'Paradox Stair'},
    },
}
# Neon Aftermath rooms whose roles carry over: start, final boss and the two mini-boss rooms.
CITY_ROLES = {'0,5': 'start', '8,4': 'boss', '5,7': 'mini1', '8,9': 'mini2'}


def layout(cfg, seed):
    s = open('index.html').read()
    city = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r'^ "(\d+,\d+)":(\{.*\}),?$', s, re.M)}
    def key_of(k):
        x, y = cfg['key'](*map(int, k.split(','))); return f'{x},{y}'
    # Turning the map turns compass directions the same way: see where a step east or south lands.
    o, ex_, sy_ = cfg['key'](1, 5), cfg['key'](2, 5), cfg['key'](1, 6)
    def dir_of(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        return 'e' if dx > 0 else 'w' if dx < 0 else 's' if dy > 0 else 'n'
    east, south = dir_of(o, ex_), dir_of(o, sy_)
    opp = {'n': 's', 's': 'n', 'e': 'w', 'w': 'e'}
    turn = {'e': east, 'w': opp[east], 's': south, 'n': opp[south]}
    rooms, used, roles = {}, set(), {}
    for k, r in city.items():
        key = key_of(k)
        if k in CITY_ROLES: roles[CITY_ROLES[k]] = key
        ex = {turn.get(d, d): key_of(v if isinstance(v, str) else v['to']) for d, v in r['exits'].items()}
        h = int(hashlib.md5((seed + key).encode()).hexdigest(), 16)
        name = cfg['special'].get(CITY_ROLES.get(k)); i = 0
        while not name or name in used:
            name = cfg['a'][(h + i * 7) % len(cfg['a'])] + ' ' + cfg['b'][(h // 31 + i * 11) % len(cfg['b'])]; i += 1
        used.add(name)
        x, y = map(int, key.split(','))
        rooms[key] = {'name': name, 'exits': ex, 'world': [x, y]}
    # Levels climb with walking distance from the start; the final boss room is one higher.
    lo, top = cfg['levels']; start, boss = roles['start'], roles['boss']
    dist, q = {start: 0}, [start]
    while q:
        k = q.pop(0)
        for t in rooms[k]['exits'].values():
            if t not in dist: dist[t] = dist[k] + 1; q.append(t)
    far = max(dist.values())
    for k, r in rooms.items():
        if k == start: continue
        lv = top if k == boss else lo + min(top - lo - 1, round((top - lo - 1) * (dist[k] - 1) / max(1, far - 2)))
        r['level'] = lv; r['zone'] = min(8, lv - lo + 1)
    return rooms, roles


def main(world):
    cfg = WORLDS[world]; src = f'assets/environment/{world}/src'; out = f'assets/environment/{world}'
    tiles = {os.path.splitext(os.path.basename(p))[0]: load(p) for p in sorted(glob.glob(src + '/*.*'))}
    if not tiles: raise SystemExit('no tiles in ' + src + ' (run tools/paint_placeholder_tiles.py ' + world + ')')
    shape_of = {n: next(s for s in sorted(SHAPES, key=len, reverse=True) if n.startswith(s)) for n in tiles}
    for n, im in tiles.items(): im.save(f'{out}/{n}.webp', quality=86, method=6)
    def mask_for(n):
        p = f'{src}/masks/{n}.png'
        if os.path.exists(p): return np.asarray(Image.open(p).convert('L').resize((800, 500), Image.NEAREST)) > 127
        if cfg['road'] is None: raise SystemExit(n + ' has no mask and ' + world + ' has no road colour to trace')
        return trace(im, SHAPES[shape_of[n]])
    masks = {n: mask_for(n) for n in tiles}
    rooms, roles = layout(cfg, world)
    plan = {}
    for key in sorted(rooms, key=lambda k: (int(k.split(',')[1]), int(k.split(',')[0]))):
        want = set(rooms[key]['exits']); opts = []
        for n in sorted(tiles):
            base = set(SHAPES[shape_of[n]])
            for f, m in FLIP_EXITS.items():
                if {m.get(d, d) for d in base} == want: opts.append((n, f))
        if not opts: raise SystemExit('no tile for ' + key + ' ' + ''.join(sorted(want)))
        cx, cy = map(int, key.split(','))
        near = {plan[k][0] for k in (f'{cx-1},{cy}', f'{cx},{cy-1}') if k in plan}
        h = int(hashlib.md5((world + key).encode()).hexdigest(), 16)
        upright = [o for o in opts if not o[1][1]] or opts
        fresh = [o for o in upright if o[0] not in near] or upright
        plan[key] = fresh[h % len(fresh)]
    cols = 1 + max(r['world'][0] for r in rooms.values()); rows = 1 + max(r['world'][1] for r in rooms.values())
    W, H = cols * 100, -(-rows * 500 // 8); bits = np.zeros((H, W), bool)
    for key, (n, (fx, fy)) in plan.items():
        m = masks[n]
        if fx: m = m[:, ::-1]
        if fy: m = m[::-1]
        cx, cy = map(int, key.split(','))
        cells = m.reshape(500, 100, 8).mean(2)  # 8px columns
        for r in range(H):
            yc = r * 8 + 4 - cy * 500
            if 0 <= yc < 500: bits[r, cx * 100:cx * 100 + 100] = cells[max(0, yc - 4):yc + 4].mean(0) >= .5
    ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    flat = np.concatenate([bits.ravel().astype(int), np.zeros((-bits.size) % 6, int)])
    enc = ''.join(ABC[int(''.join(map(str, flat[i:i + 6])), 2)] for i in range(0, len(flat), 6))
    data = {'name': cfg['name'], 'world': {'maskW': W, 'maskH': H, 'cell': 8, 'mask': enc},
            'plan': {k: [n, f[0], f[1]] for k, (n, f) in plan.items()}, 'layout': rooms, 'roles': roles,
            'placeholders': sorted(n for n in tiles if n.endswith('-ph'))}
    js = (f'// Built by tools/build_tile_world.py {world} (Round 174). Do not edit by hand.\n'
          "var TILE_WORLD_DATA = typeof TILE_WORLD_DATA !== 'undefined' ? TILE_WORLD_DATA : {};\n"
          f'TILE_WORLD_DATA.{world} = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    open(f'assets/{world}-data.js', 'w').write(js)
    used = {}
    for n, _ in plan.values(): used[n] = used.get(n, 0) + 1
    print(world, len(plan), 'rooms; roles', roles, '; tiles used:', used)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in WORLDS: raise SystemExit('usage: build_tile_world.py ' + '|'.join(WORLDS))
    main(sys.argv[1])
