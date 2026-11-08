# Round 356: turn one generated image holding a row of eight walk frames on bright green (the owner's Gemini drafts,
# usually 2048px square with the frames on a 256px grid) into a four-frame creature sheet.
#   python3 tools/strip_to_sheet.py draft.jpeg assets/monsters/<world>/<name>.png [--lo 40 --hi 120] [--grid 2] [--align 1|2|3]
# Round 357: --grid 2 takes four frames in a 2x2 grid instead (read left to right, top to bottom) and uses all four.
# Steps: key the green off (greenness fades from opaque at --lo to clear at --hi, with despill; ground shadows drawn in
# dark green go too), cut the row into eight equal cells (keeping the draft's own positions, so the walk does not
# jitter; each piece of art goes to the cell holding its centre, so a tail spilling into the next cell is kept), drop specks, save the eight-frame strip to <folder>/src/<name>-walk8.png, then compose frames 1, 3, 5 and 7
# into a 4 x (516x688) sheet bottom-aligned on one shared crop (as for the other eight-frame drafts) and pad it with
# tools/pad_sprite_frames.py. Afterwards run tools/enemy_sizes.py and tools/sprite_audit.py.
import os, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {sys.argv[i][2:]: float(sys.argv[i + 1]) for i in range(1, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
src, out = args[0], args[1]
LO, HI, CELLS = opt.get('lo', 40), opt.get('hi', 120), int(opt.get('cells', 8))

a = np.array(Image.open(src).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
gx = g - np.maximum(r, b)
alpha = np.clip((HI - gx) / (HI - LO), 0, 1)
g2 = np.minimum(g, np.maximum(r, b))
rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)

GRID = int(opt.get('grid', 0))
if GRID:
    # Round 357: four frames in a 2x2 grid (the owner's optimized Gemini prompt). Each piece of art goes to the quarter
    # holding its centre; each frame is cut from a window a quarter wider than its cell, keeping the cell's origin.
    A = rgba[..., 3].copy(); A[A < 16] = 0
    lab, n = ndimage.label(A > 0, structure=np.ones((3, 3)))
    cm = ndimage.center_of_mass(np.ones_like(A), lab, range(1, n + 1)) if n else []
    sz = ndimage.sum(np.ones_like(A), lab, range(1, n + 1)) if n else []
    ch, cw = a.shape[0] // GRID, a.shape[1] // GRID; M = cw // 8
    owner = np.full(n + 1, -1)
    for j, c in enumerate(cm, 1): owner[j] = min(GRID - 1, int(c[0] // ch)) * GRID + min(GRID - 1, int(c[1] // cw))
    frames = []
    for i in range(GRID * GRID):
        r_, c_ = divmod(i, GRID)
        keep = np.isin(lab, [j for j in range(1, n + 1) if owner[j] == i and sz[j - 1] >= 40])
        ya, yb, xa, xb = r_ * ch - M, (r_ + 1) * ch + M, c_ * cw - M, (c_ + 1) * cw + M
        fr = np.zeros((yb - ya, xb - xa, 4), np.uint8)
        sy0, sy1, sx0, sx1 = max(0, ya), min(a.shape[0], yb), max(0, xa), min(a.shape[1], xb)
        part = rgba[sy0:sy1, sx0:sx1].copy(); part[..., 3] = np.where(keep[sy0:sy1, sx0:sx1], part[..., 3], 0)
        fr[sy0 - ya:sy1 - ya, sx0 - xa:sx1 - xa] = part
        frames.append(Image.fromarray(fr, 'RGBA'))
    CELLS = len(frames)
else:
    solid = alpha > 0.5
    rows = np.nonzero(solid.sum(1) > 3)[0]
    # The frame row: the longest run of rows holding art.
    runs, st = [], rows[0]
    for p, q in zip(rows, rows[1:]):
        if q - p > 8: runs.append((st, p)); st = q
    runs.append((st, rows[-1]))
    y0, y1 = max(runs, key=lambda t: t[1] - t[0])
    y0, y1 = max(0, y0 - 16), min(a.shape[0], y1 + 17)
    cw = a.shape[1] // CELLS
    # Figures can spill past their cell (a tail, a sword), so each connected piece of art goes to the cell its centre falls
    # in, and each frame is cut from a window wider than its cell (keeping the cell's own origin, so positions hold).
    band = rgba[y0:y1].copy(); A = band[..., 3]; A[A < 16] = 0
    lab, n = ndimage.label(A > 0, structure=np.ones((3, 3)))
    cx = ndimage.center_of_mass(np.ones_like(A), lab, range(1, n + 1)) if n else []
    owner = np.zeros(n + 1, int)
    for j, c in enumerate(cx, 1): owner[j] = min(CELLS - 1, int(c[1] // cw))
    sz = ndimage.sum(np.ones_like(A), lab, range(1, n + 1)) if n else []
    M = cw // 4
    frames = []
    for i in range(CELLS):
        keep = np.isin(lab, [j for j in range(1, n + 1) if owner[j] == i and sz[j - 1] >= 40])
        fr = np.zeros((band.shape[0], cw + 2 * M, 4), np.uint8)
        xa, xb = i * cw - M, (i + 1) * cw + M
        sa, sb = max(0, xa), min(band.shape[1], xb)
        part = band[:, sa:sb].copy(); part[..., 3] = np.where(keep[:, sa:sb], part[..., 3], 0)
        fr[:, sa - xa:sa - xa + (sb - sa)] = part
        edge = np.concatenate([fr[:, 0, 3], fr[:, -1, 3]])
        if (edge > 40).sum() > 3: print('warning: frame %d still reaches its window edge' % (i + 1))
        frames.append(Image.fromarray(fr, 'RGBA'))

fw, fh = frames[0].size
os.makedirs(os.path.join(os.path.dirname(out), 'src'), exist_ok=True)
strip = Image.new('RGBA', (fw * CELLS, fh))
for i, f in enumerate(frames): strip.paste(f, (i * fw, 0))
strip_path = os.path.join(os.path.dirname(out), 'src', os.path.basename(out)[:-4] + '-walk%d.png' % CELLS)
strip.save(strip_path)

pick = frames if len(frames) == 4 else [frames[i] for i in (0, 2, 4, 6)]
# --align front (Round 357): Gemini places the creature at a slightly different spot in each grid square. Line the frames
# up so the front-most point (a snout or drill tip) and the feet sit at the same place in every frame; only the legs move.
PADA = 300  # room for a shifted frame, so nothing is cut off at its canvas edge
if opt.get('align', 0) == 3:
    # --align 3 (a glowing core, like the Data Wisp's orb): line the frames up on the centre of the brightest cyan pixels
    # (or amber ones when there are none, like the Rust Wisp's clock face).
    cs = []
    for f in pick:
        a_ = np.asarray(f).astype(int); m = (a_[..., 3] > 200) & (a_[..., 2] > 190) & (a_[..., 1] > 190) & (a_[..., 0] < 140)
        if not m.any():  # an amber/orange core (the Rust Wisp's clock face) instead of cyan
            m = (a_[..., 3] > 200) & (a_[..., 0] > 220) & (a_[..., 1] > 140) & (a_[..., 2] < 120)
        ys, xs = np.nonzero(m); cs.append((int(xs.mean()), int(ys.mean())))
    tx, ty = max(c[0] for c in cs), max(c[1] for c in cs); moved = []
    for f, (cx_, cy_) in zip(pick, cs):
        g = Image.new('RGBA', (f.width + 2 * PADA, f.height + 2 * PADA), (0, 0, 0, 0)); g.paste(f, (PADA + tx - cx_, PADA + ty - cy_)); moved.append(g)
    pick = moved
elif opt.get('align', 0) == 2:
    # --align 2 (floating creatures): line the frames up on the top of the head horizontally only, so the body stays put
    # and the drawn up-and-down bob is kept.
    moved, heads = [], []
    for f in pick:
        A = np.asarray(f.getchannel('A')) > 60; ys, xs = np.nonzero(A); top = ys.min()
        heads.append(int(np.median(xs[ys <= top + 12])))
    hx = max(heads)
    for f, h in zip(pick, heads):
        g = Image.new('RGBA', (f.width + 2 * PADA, f.height + 2 * PADA), (0, 0, 0, 0)); g.paste(f, (PADA + hx - h, PADA)); moved.append(g)
    pick = moved
elif opt.get('align', 0):
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox() for f in pick]
    fx, fy = max(b[2] for b in boxes), max(b[3] for b in boxes)
    moved = []
    for f, b in zip(pick, boxes):
        g = Image.new('RGBA', (f.width + 2 * PADA, f.height + 2 * PADA), (0, 0, 0, 0)); g.paste(f, (PADA + fx - b[2], PADA + fy - b[3])); moved.append(g)
    pick = moved

bb = None
for f in pick:
    q = f.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
    bb = q if bb is None else (min(bb[0], q[0]), min(bb[1], q[1]), max(bb[2], q[2]), max(bb[3], q[3]))
s = min(484 / (bb[2] - bb[0]), 640 / (bb[3] - bb[1])); w, h = 516 / s, 688 / s
x0 = (bb[0] + bb[2]) / 2 - w / 2; yb = bb[3] - 672 / s
sheet = Image.new('RGBA', (516 * 4, 688), (0, 0, 0, 0))
pad = int(max(w, h)) + 10
for i, f in enumerate(pick):
    big = Image.new("RGBA", (f.width + 2 * pad, f.height + 2 * pad), (0, 0, 0, 0)); big.paste(f, (pad, pad))
    crop = big.crop((round(x0) + pad, round(yb) + pad, round(x0 + w) + pad, round(yb + h) + pad))
    sheet.paste(crop.resize((516, 688), Image.LANCZOS), (i * 516, 0))
sheet.save(out, optimize=True)
print('frames %dx%d, scale %.2f, strip %s' % (fw, fh, s, strip_path))
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pad_sprite_frames.py'), out], check=True)
prev = out[:-4] + '-preview.png'
if os.path.exists(prev): os.remove(prev)
