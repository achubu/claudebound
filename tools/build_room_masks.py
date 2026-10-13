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
    exits, art = room_exits(), []
    for path in sorted(glob.glob('assets/environment/rooms/room-*.webp')):
        cx, cy = map(int, re.match(r'room-(\d+)-(\d+)\.webp', os.path.basename(path)).groups())
        key = f'{cx},{cy}'
        if key not in exits:
            print('skip (no such room)', key)
            continue
        w = keep_exits(axis_bridges(trace(path)), exits[key])
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
    open(JS, 'w').write(src)
    print(len(art), 'rooms with their own painting')


if __name__ == '__main__':
    main()
