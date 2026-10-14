# Round 100: Neon Aftermath rooms with their own painting (assets/environment/rooms/room-X-Y.webp,
# one image per room, any 16:10 size) replace that room's slice of the old district paintings.
# This traces each room image's streets and writes them into the world walk mask in
# assets/neon-world.js (8px cells over the 7200x3000 world), and lists the rooms in NEON_ROOM_ART.
# Rooms without their own image keep their existing mask. Run from the repo root:
#   python3 tools/build_room_masks.py
import glob, json, os, re
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
JS = 'assets/neon-world.js'


def trace(path):
    """Pale teal-grey paving (plus crosswalk and lane paint) of one room image, at 800x500."""
    a = np.asarray(Image.open(path).convert('RGB').resize((800, 500), Image.LANCZOS)).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(2), a.min(2)
    road = (G >= R + 8) & (np.abs(B - G) < 26) & (mn > 80) & (mx < 235)
    paint = (mn > 165) & (mx - mn < 45)
    # Pad by repeating the border so the clean-up below doesn't eat streets at the image edges.
    P = 12
    w = np.pad(road | paint, P, mode='edge')
    w = nd.binary_closing(nd.binary_opening(w, iterations=1), iterations=3)[P:-P, P:-P]
    # Fill small holes (lamp glow, props on the road) but never a whole city block.
    holes = nd.binary_fill_holes(w) & ~w
    l, n = nd.label(holes)
    if n:
        s = nd.sum(holes, l, range(1, n + 1))
        w |= np.isin(l, [i + 1 for i, v in enumerate(s) if v < 1500])
    l, n = nd.label(w)
    if n:
        s = nd.sum(w, l, range(1, n + 1))
        w = np.isin(l, [i + 1 for i, v in enumerate(s) if v >= 1200])
    return w


def axis_bridges(w, maxgap=90, thick=44):
    """Join street pieces split by a short straight gap (an arch, a tower or crosswalk paint
    hiding the road): repeatedly join the largest piece to the nearest piece along a row/column."""
    w = w.copy()
    while True:
        l, n = nd.label(w)
        if n < 2:
            return w
        main = int(np.argmax(nd.sum(w, l, range(1, n + 1)))) + 1
        best = None
        for axis in (0, 1):
            L = l if axis == 0 else l.T
            for c in range(0, L.shape[1], 2):
                ys = np.where(L[:, c] > 0)[0]
                lab = L[ys, c]
                for a, b, la, lb in zip(ys[:-1], ys[1:], lab[:-1], lab[1:]):
                    if la != lb and main in (la, lb) and 1 < b - a <= maxgap and (best is None or b - a < best[0]):
                        best = (b - a, axis, c, a, b)
        if best is None:
            return w
        _, axis, c, a, b = best
        im = Image.fromarray((w * 255).astype(np.uint8))
        ImageDraw.Draw(im).line((c, a, c, b) if axis == 0 else (a, c, b, c), fill=255, width=thick)
        w = np.asarray(im) > 0


def keep_exits(w, exits):
    """Only street that reaches one of the room's exits (no unreachable scraps)."""
    l, _ = nd.label(w)
    edge = {'n': l[:14], 's': l[-14:], 'w': l[:, :14], 'e': l[:, -14:]}
    keep = set()
    for d in exits:
        keep |= set(np.unique(edge[d])) - {0}
    return np.isin(l, list(keep))


# Round 101: hand-checked open-ground spots beside the street in each painted room (800x500
# room px), for chests, relics and points of interest. Each gets a short footpath from the
# nearest street, baked into the walk mask and drawn as a faint trail in the game.
# Found by tracing outline-free ground next to the road, then checked by eye; a spot must be
# on open ground, never on a roof, prop, water or another object.
NOOKS = {
    '0,4': [(652, 63)],
    '0,5': [(658, 383), (675, 138)],
    '1,4': [(509, 430), (295, 443)],
    '1,5': [(173, 353), (197, 151), (478, 132)],
    '2,4': [(274, 439), (648, 341)],
    '2,5': [(250, 233)],
    '3,4': [(510, 427), (133, 165), (682, 161)],
    '4,4': [(498, 274), (132, 165), (399, 407)],
    '5,4': [(476, 214), (320, 220), (510, 427)],
    '5,5': [(118, 128)],
    '6,4': [(300, 430), (510, 430)],
    '7,4': [(295, 435), (505, 445)],
    '8,4': [(290, 440), (560, 445)],
}
NOOK_STOP = 16   # the path ends this far short of the object's base (you stand beside it, not on it)
NOOK_WIDTH = 22
FOOT = 22        # the game tests walkability at the feet, 22px below a position


def nook_paths(key, road):
    """For each nook: [x, y, ax, ay, ex, ey]. (x, y) is where the object is drawn, (ax, ay) the
    nearest street point, and (ex, ey) where the footpath ends, short of the object's base."""
    _, idx = nd.distance_transform_edt(~road, return_indices=True)
    out = []
    for x, y in NOOKS.get(key, []):
        bx, by = x, min(499, y + FOOT)
        ax, ay = int(idx[1][by, bx]), int(idx[0][by, bx])
        L = max(1.0, float(np.hypot(bx - ax, by - ay)))
        out.append([x, y, ax, ay, round(bx - (bx - ax) / L * NOOK_STOP), round(by - (by - ay) / L * NOOK_STOP)])
    return out


def bake_paths(w, nooks):
    """Walkable footpath from each nook's street point to its end, short of the object."""
    im = Image.fromarray((w * 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    r = NOOK_WIDTH // 2
    for x, y, ax, ay, ex, ey in nooks:
        # Start a little inside the street so the path joins it across whole mask cells.
        L = max(1.0, float(np.hypot(ex - ax, ey - ay)))
        sx, sy = ax - (ex - ax) / L * 12, ay - (ey - ay) / L * 12
        d.line((sx, sy, ex, ey), fill=255, width=NOOK_WIDTH)
        d.ellipse((ex - r, ey - r, ex + r, ey + r), fill=255)
    return np.asarray(im) > 0


def room_exits():
    """Exit directions per room key from the rooms literal in index.html."""
    out = {}
    for m in re.finditer(r'^ "(\d+,\d+)":(\{.*\}),?$', open('index.html').read(), re.M):
        out[m.group(1)] = sorted(json.loads(m.group(2))['exits'])
    return out


def main():
    src = open(JS).read()
    W, H = int(re.search(r'maskW: (\d+)', src).group(1)), int(re.search(r'maskH: (\d+)', src).group(1))
    mask = re.search(r"mask: '([^']+)'", src).group(1)
    bits = np.array([int(b) for ch in mask for b in format(ABC.index(ch), '06b')])[:W * H].reshape(H, W).astype(bool)
    exits, art, nooks = room_exits(), [], {}
    for path in sorted(glob.glob('assets/environment/rooms/room-*.webp')):
        cx, cy = map(int, re.match(r'room-(\d+)-(\d+)\.webp', os.path.basename(path)).groups())
        key = f'{cx},{cy}'
        if key not in exits:
            print('skip (no such room)', key)
            continue
        road = keep_exits(axis_bridges(trace(path)), exits[key])
        nooks[key] = nook_paths(key, road)
        w = bake_paths(road, nooks[key])
        wy = cy - 4  # world row of this room
        # Each 8px cell belongs to the room that holds its centre; sample the room mask there.
        for r in range(H):
            yc = r * 8 + 4 - wy * 500
            if 0 <= yc < 500:
                for c in range(cx * 100, cx * 100 + 100):
                    x0 = (c - cx * 100) * 8
                    bits[r, c] = w[max(0, yc - 4):yc + 4, x0:x0 + 8].mean() >= .5
        art.append(key)
        print(key, 'street cells', int(w.sum() // 64))
    flat = np.concatenate([bits.ravel().astype(int), np.zeros((-bits.size) % 6, int)])
    enc = ''.join(ABC[int(''.join(map(str, flat[i:i + 6])), 2)] for i in range(0, len(flat), 6))
    src = re.sub(r"mask: '[^']+'", "mask: '" + enc + "'", src, count=1)
    src = re.sub(r'const NEON_ROOM_ART = \[[^\]]*\];', 'const NEON_ROOM_ART = ' + json.dumps(art) + ';', src, count=1)
    src = re.sub(r'const NEON_NOOKS = \{[^;]*\};', 'const NEON_NOOKS = ' + json.dumps(nooks, separators=(',', ':')) + ';', src, count=1)
    open(JS, 'w').write(src)
    print(len(art), 'rooms with their own painting')


if __name__ == '__main__':
    main()
