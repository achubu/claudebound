#!/usr/bin/env python3
"""Round 224: build a 4-frame sheet from a keyed image that holds more poses than that.

Gemini often draws 6-8 poses in two rows instead of 4 in one. Key the image first with
tools/cut_sprite_sheet.py, then pick four poses by box (x0,y0,x1,y1 in the keyed image). A pose
takes every connected piece that lies mostly inside its box (so a neighbour's wing tip reaching
in is left out), clipped to the box. All four are drawn at one scale, centred on their feet
(the middle of the bottom third of the pose) and standing on one baseline, in 3:4 frames.

--ground-line clears a thin painted ground line under the feet: in the pose's bottom rows, a
pixel goes unless there is art just above it.

    python3 tools/compose_sprite_sheet.py keyed.png out.png x0,y0,x1,y1 (x4) [--ground-line]
    python3 tools/pad_sprite_frames.py out.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

FW, FH, GAP = 516, 688, 16

args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, out, boxes = args[0], args[1], [tuple(int(v) for v in b.split(',')) for b in args[2:6]]
LINE = '--ground-line' in sys.argv
im = np.array(Image.open(src).convert('RGBA'))
if LINE:  # a ground line drawn across the whole sheet joins every pose; clear it first
    frac = (im[..., 3] > 8).mean(1); near = lambda r: frac[min(max(r, 0), len(frac) - 1)]
    for r in np.where(frac > 0.4)[0]:
        if max(near(r - 6), near(r + 6)) < frac[r] / 2: im[max(0, r - 2):r + 3] = 0  # thin: not wings
solid = im[..., 3] > 8
lab, n = nd.label(solid, structure=np.ones((3, 3)))
total = nd.sum(solid, lab, range(1, n + 1))

poses = []
for x0, y0, x1, y1 in boxes:
    inside = np.zeros_like(solid); inside[y0:y1, x0:x1] = True
    part = nd.sum(solid & inside, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i in range(n) if part[i] >= 0.5 * total[i]]) & inside
    a = im.copy(); a[~keep] = 0
    if LINE:
        rows = np.where(keep.any(1))[0]; bot = rows.max()
        above = np.zeros_like(keep); above[12:] = keep[:-12]  # art 12px higher up
        zone = np.zeros_like(keep); zone[bot - 9:bot + 1] = True
        a[zone & ~above] = 0; keep = a[..., 3] > 8
    rows, cols = np.where(keep.any(1))[0], np.where(keep.any(0))[0]
    py0, py1, px0, px1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    low = keep[py1 - (py1 - py0) // 3:py1]
    cx = np.median(np.where(low)[1]) if low.any() else (px0 + px1) / 2
    poses.append((Image.fromarray(a).crop((px0, py0, px1, py1)), cx - px0))

fits = [min((FW - 2 * GAP) / p.width, (FH - 2 * GAP) / p.height) for p, c in poses]
# One scale for all, except that the single widest pose (wings spread) may shrink on its own
# rather than shrinking the creature in every frame.
s = sorted(fits)[1]
sheet = Image.new('RGBA', (FW * 4, FH), (0, 0, 0, 0))
for f, (p, c) in enumerate(poses):
    sf = min(s, fits[f]); w, h = max(1, round(p.width * sf)), max(1, round(p.height * sf))
    small = p.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    x = min(max(round(FW / 2 - c * sf), GAP), FW - GAP - w)  # over the feet, slid in as far as the frame needs
    sheet.alpha_composite(small, (f * FW + x, FH - GAP - h))
sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
print(f'{out}: scale {s:.3f}' + (f', widest pose {min(fits):.3f}' if min(fits) < s else ''))
